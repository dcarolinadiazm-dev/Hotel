import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { IHabitacionDTO, INuevaHabitacionDTO } from '../models/habitacion.model';
import { IConsumoDTO } from '../models/consumo.model';
import { PedidoService } from './pedido.service';
import { ArticuloService } from './articulo.service';
import { AbonoService } from './abono.service';
import { sanitizeText, truncateToBytes } from '../utils/text.utils';

export class HabitacionService {

    // Validación automática diaria:
    // - Si una reserva está activa hoy: Ocupada
    // - Si no hay reserva hoy pero tiene reservas futuras: Reservada
    // - Si no tiene reservas activas: Disponible
    static async syncHabitacionesEstadoAutomatico(): Promise<void> {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const habitaciones = await db(tables.HABITACION).select('ID_HABITACION', 'ESTADO');

            for (const hab of habitaciones) {
                const habId = String(hab.ID_HABITACION).trim();
                const currentEstado = String(hab.ESTADO || '').trim();
                if (currentEstado === 'Inhabilitada') continue;

                const activeMovs = await db(tables.HABITACION_MOVIM)
                    .where('ID_HABITACION', habId)
                    .andWhere(function () {
                        this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                    })
                    .select('FECHA_RESERVA', 'FECHA_SALIDA');

                if (activeMovs.length === 0) {
                    if (currentEstado !== 'Disponible') {
                        await db(tables.HABITACION)
                            .where('ID_HABITACION', habId)
                            .update({ ESTADO: 'Disponible' });
                    }
                    continue;
                }

                const isOccupiedToday = activeMovs.some(m => {
                    if (!m.FECHA_RESERVA) return false;
                    const fRes = String(m.FECHA_RESERVA).split('T')[0];
                    const fSal = m.FECHA_SALIDA ? String(m.FECHA_SALIDA).split('T')[0] : '';
                    return fRes <= todayStr && (!fSal || fSal >= todayStr);
                });

                if (isOccupiedToday) {
                    if (currentEstado !== 'Ocupada') {
                        await db(tables.HABITACION)
                            .where('ID_HABITACION', habId)
                            .update({ ESTADO: 'Ocupada' });
                    }
                } else {
                    if (currentEstado !== 'Disponible') {
                        await db(tables.HABITACION)
                            .where('ID_HABITACION', habId)
                            .update({ ESTADO: 'Disponible' });
                    }
                }
            }
        } catch (e: any) {
            console.warn('Aviso en syncHabitacionesEstadoAutomatico:', e.message);
        }
    }

    // Listar todas las habitaciones con precio desde PRECIOS_ARTICULO (LISTA_PRECIOS LIPR_PREDET)
    static async getAllHabitaciones(): Promise<IHabitacionDTO[]> {
        await this.syncHabitacionesEstadoAutomatico();
        const defaultLipr = await ArticuloService.getDefaultLiprCod();

        const habitaciones = await db(tables.HABITACION)
            .leftJoin(tables.PRECIOS_ARTICULO, function () {
                this.on(`${tables.HABITACION}.ARTI_COD`, '=', `${tables.PRECIOS_ARTICULO}.ARTI_COD`)
                    .andOnVal(`${tables.PRECIOS_ARTICULO}.LIPR_COD`, '=', defaultLipr);
            })
            .leftJoin(tables.ARTICULO, `${tables.HABITACION}.ARTI_COD`, '=', `${tables.ARTICULO}.ARTI_COD`)
            .select(
                `${tables.HABITACION}.*`,
                db.raw(`COALESCE(${tables.PRECIOS_ARTICULO}.PRAR_FIJO, ${tables.ARTICULO}.ARTI_PRECIO, 0) as "PRECIO_CALCULADO"`)
            )
            .orderBy(`${tables.HABITACION}.NUMERO`, 'asc');

        const result: IHabitacionDTO[] = [];

        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

        for (const r of habitaciones) {
            const habId = String(r.ID_HABITACION || r.id || '').trim();
            const num = String(r.NUMERO || '').trim();
            const ref = `HAB-${num}`;

            // Consultar todos los movimientos activos de esta habitación
            const allMovs = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', habId)
                .andWhere(function () {
                    this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                })
                .orderBy('FECHA_RESERVA', 'asc');

            const totalReservasFuturas = allMovs.filter(m => {
                const fRes = String(m.FECHA_RESERVA).split('T')[0];
                return fRes > todayStr;
            }).length;

            // Movimiento activo de hoy (si existe)
            const todayMov = allMovs.find(m => {
                if (!m.FECHA_RESERVA) return false;
                const fRes = String(m.FECHA_RESERVA).split('T')[0];
                const fSal = m.FECHA_SALIDA ? String(m.FECHA_SALIDA).split('T')[0] : '';
                return fRes <= todayStr && (!fSal || fSal >= todayStr);
            });

            // Consultar datos de TODOS los movimientos de la habitación para permitir búsqueda por cualquier huésped/reserva
            const allHuespedesList: string[] = [];
            const allDocumentosList: string[] = [];

            for (const m of allMovs) {
                const mDinwId = (m.DINW_ID || m.PEWE_ID || m.ID_DOC || m.PEDI_ID) ? parseInt(String(m.DINW_ID || m.PEWE_ID || m.ID_DOC || m.PEDI_ID), 10) : undefined;
                if (mDinwId) {
                    const dinwRow = await db(tables.DOC_INVENTARIO_WEB)
                        .leftJoin(tables.TERCEROS, `${tables.DOC_INVENTARIO_WEB}.DINW_NIT`, '=', `${tables.TERCEROS}.TERC_NIT`)
                        .where(`${tables.DOC_INVENTARIO_WEB}.DINW_ID`, mDinwId)
                        .andWhere(function () {
                            this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`).orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
                        })
                        .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
                        .select(
                            `${tables.DOC_INVENTARIO_WEB}.*`,
                            `${tables.TERCEROS}.TERC_NOM`
                        )
                        .first();

                    if (dinwRow) {
                        let mHuesped = dinwRow.TERC_NOM ? String(dinwRow.TERC_NOM).trim() : '';
                        const mDoc = dinwRow.DINW_NIT ? String(dinwRow.DINW_NIT).trim() : '';
                        if (!mHuesped && dinwRow.DINW_OBS) {
                            const obsMatch = String(dinwRow.DINW_OBS).split('-');
                            if (obsMatch.length > 1) mHuesped = obsMatch[1].trim();
                        }
                        if (mHuesped && !allHuespedesList.includes(mHuesped)) allHuespedesList.push(mHuesped);
                        if (mDoc && !allDocumentosList.includes(mDoc)) allDocumentosList.push(mDoc);
                    }
                }
            }

            // Seleccionar movimiento activo (priorizando el de hoy, o la primera reserva activa)
            const activeMov = todayMov || allMovs[0] || null;

            let activeDinwId = (activeMov?.DINW_ID || activeMov?.PEWE_ID || activeMov?.ID_DOC || activeMov?.PEDI_ID) ? parseInt(String(activeMov.DINW_ID || activeMov.PEWE_ID || activeMov.ID_DOC || activeMov.PEDI_ID), 10) : undefined;
            let huesped = '';
            let documento = '';
            let fechaReserva = activeMov?.FECHA_RESERVA ? String(activeMov.FECHA_RESERVA).trim() : '';
            let fechaSalida = activeMov?.FECHA_SALIDA ? String(activeMov.FECHA_SALIDA).trim() : '';

            // Consultar datos del cliente desde DOC_INVENTARIO_WEB para el movimiento activo
            if (activeDinwId) {
                const dinwRow = await db(tables.DOC_INVENTARIO_WEB)
                    .leftJoin(tables.TERCEROS, `${tables.DOC_INVENTARIO_WEB}.DINW_NIT`, '=', `${tables.TERCEROS}.TERC_NIT`)
                    .where(`${tables.DOC_INVENTARIO_WEB}.DINW_ID`, activeDinwId)
                    .andWhere(function () {
                        this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`).orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
                    })
                    .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
                    .select(
                        `${tables.DOC_INVENTARIO_WEB}.*`,
                        `${tables.TERCEROS}.TERC_NOM`
                    )
                    .first();

                if (dinwRow) {
                    huesped = dinwRow.TERC_NOM ? String(dinwRow.TERC_NOM).trim() : '';
                    documento = dinwRow.DINW_NIT ? String(dinwRow.DINW_NIT).trim() : '';
                    if (!huesped && dinwRow.DINW_OBS) {
                        const obsMatch = String(dinwRow.DINW_OBS).split('-');
                        if (obsMatch.length > 1) huesped = obsMatch[1].trim();
                    }
                } else if (!todayMov) {
                    // Si no es de hoy pero hay dinwId en la reserva
                    activeDinwId = undefined;
                }
            }

            if (!huesped && allHuespedesList.length > 0) huesped = allHuespedesList[0];
            if (!documento && allDocumentosList.length > 0) documento = allDocumentosList[0];

            // Consultar ítems del borrador web solo si hay documento activo
            let pendingDetails: any[] = [];
            if (activeDinwId) {
                pendingDetails = await db(tables.DOC_INVENTARIO_DET_WEB)
                    .where({ DINW_ID: activeDinwId, DIWD_ANULADO: 'N' })
                    .select('DINW_ID', 'DIWD_CANT', 'DIWD_TOTAL');
            }

            const productos = pendingDetails.reduce((sum: number, it: any) => sum + parseInt(it.DIWD_CANT || '1', 10), 0);
            const total = pendingDetails.reduce((sum: number, it: any) => sum + parseFloat(it.DIWD_TOTAL || '0'), 0);
            const precioNoche = parseFloat(r.PRECIO_CALCULADO || '0');

            result.push({
                id: habId,
                artiCod: r.ARTI_COD ? String(r.ARTI_COD).trim() : undefined,
                numero: num,
                estado: String(r.ESTADO || r.estado || 'Disponible').trim(),
                tipo: (r.TIPO || r.tipo) ? String(r.TIPO || r.tipo).trim() : undefined,
                piso: r.PISO ? parseInt(String(r.PISO), 10) : 1,
                huesped,
                documento,
                fechaReserva,
                fechaSalida,
                precioNoche,
                caracteristicas: (r.CARACTERISTICAS || r.caracteristicas) ? String(r.CARACTERISTICAS || r.caracteristicas).trim() : '',
                observaciones: (r.NOTAS || r.observaciones) ? String(r.NOTAS || r.observaciones).trim() : '',
                peweId: activeDinwId,
                productos,
                total,
                totalReservasFuturas,
                todosHuespedes: allHuespedesList.join(' | '),
                todosDocumentos: allDocumentosList.join(' | ')
            });
        }

        return result;
    }

    // Obtener detalle de una habitación con sus consumos activos desde DOC_INVENTARIO_DET_WEB
    static async getHabitacionById(id: string) {
        await this.syncHabitacionesEstadoAutomatico();
        const defaultLipr = await ArticuloService.getDefaultLiprCod();

        const hab = await db(tables.HABITACION)
            .leftJoin(tables.PRECIOS_ARTICULO, function () {
                this.on(`${tables.HABITACION}.ARTI_COD`, '=', `${tables.PRECIOS_ARTICULO}.ARTI_COD`)
                    .andOnVal(`${tables.PRECIOS_ARTICULO}.LIPR_COD`, '=', defaultLipr);
            })
            .leftJoin(tables.ARTICULO, `${tables.HABITACION}.ARTI_COD`, '=', `${tables.ARTICULO}.ARTI_COD`)
            .where(`${tables.HABITACION}.ID_HABITACION`, id)
            .select(
                `${tables.HABITACION}.*`,
                db.raw(`COALESCE(${tables.PRECIOS_ARTICULO}.PRAR_FIJO, ${tables.ARTICULO}.ARTI_PRECIO, 0) as "PRECIO_CALCULADO"`)
            )
            .first();

        if (!hab) return null;

        const habId = String(hab.ID_HABITACION || hab.id).trim();
        const num = String(hab.NUMERO || '').trim();
        const ref = `HAB-${num}`;

        // Consultar TODOS los movimientos activos de HABITACION_MOVIM
        const activeMovs = await db(tables.HABITACION_MOVIM)
            .where('ID_HABITACION', habId)
            .andWhere(function () {
                this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
            })
            .orderBy('FECHA_RESERVA', 'asc');

        const movimientosList: any[] = [];

        for (const mov of activeMovs) {
            const mId = mov.ID_MOVIM;
            let mDinwId = (mov.DINW_ID || mov.PEWE_ID || mov.ID_DOC || mov.PEDI_ID) ? parseInt(String(mov.DINW_ID || mov.PEWE_ID || mov.ID_DOC || mov.PEDI_ID), 10) : undefined;
            let mHuesped = '';
            let mDocumento = '';
            let mFechaReserva = mov.FECHA_RESERVA ? String(mov.FECHA_RESERVA).trim() : '';
            let mFechaSalida = mov.FECHA_SALIDA ? String(mov.FECHA_SALIDA).trim() : '';

            if (mDinwId) {
                const dinwRow = await db(tables.DOC_INVENTARIO_WEB)
                    .leftJoin(tables.TERCEROS, `${tables.DOC_INVENTARIO_WEB}.DINW_NIT`, '=', `${tables.TERCEROS}.TERC_NIT`)
                    .where(`${tables.DOC_INVENTARIO_WEB}.DINW_ID`, mDinwId)
                    .andWhere(function () {
                        this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`).orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
                    })
                    .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
                    .select(
                        `${tables.DOC_INVENTARIO_WEB}.*`,
                        `${tables.TERCEROS}.TERC_NOM`
                    )
                    .first();

                if (dinwRow) {
                    mHuesped = dinwRow.TERC_NOM ? String(dinwRow.TERC_NOM).trim() : '';
                    mDocumento = dinwRow.DINW_NIT ? String(dinwRow.DINW_NIT).trim() : '';
                    if (!mHuesped && dinwRow.DINW_OBS) {
                        const obsMatch = String(dinwRow.DINW_OBS).split('-');
                        if (obsMatch.length > 1) mHuesped = obsMatch[1].trim();
                    }
                }
            }

            let mDetails: any[] = [];
            if (mDinwId) {
                mDetails = await db(tables.DOC_INVENTARIO_DET_WEB)
                    .where({ DINW_ID: mDinwId, DIWD_ANULADO: 'N' })
                    .orderBy('DIWD_ITEM', 'asc');
            }

            const mItems: IConsumoDTO[] = mDetails.map((c: any) => ({
                id: c.DIWD_ITEM,
                idHabitacion: id,
                articulo: String(c.DIWD_DESCART || c.DIWD_ARTICULO || '').trim(),
                unidad: String(c.DIWD_UNIDAD || 'UND').trim(),
                cantidad: parseInt(c.DIWD_CANT || '1', 10),
                precio: parseFloat(c.DIWD_COSTO || c.DIWD_PRUNIT || '0'),
                subtotal: parseFloat(c.DIWD_TOTAL || '0')
            }));

            const mTotal = mItems.reduce((sum, item) => sum + item.subtotal, 0);
            const mRoomDetail = mDetails.find((d: any) => d.DIWD_ITEM === 1 || String(d.DIWD_REF || '').trim() === ref) || mDetails[0];
            const mLiprCod = mRoomDetail?.DIWD_LISTA ? parseInt(String(mRoomDetail.DIWD_LISTA), 10) : defaultLipr;
            const mPrecioNoche = (mRoomDetail?.DIWD_COSTO !== undefined && mRoomDetail?.DIWD_COSTO !== null)
                ? parseFloat(String(mRoomDetail.DIWD_COSTO))
                : (mRoomDetail?.DIWD_PRUNIT ? parseFloat(String(mRoomDetail.DIWD_PRUNIT)) : parseFloat(hab.PRECIO_CALCULADO || '0'));
            const mDescuento = (mRoomDetail?.DIWD_DTOMONTO !== undefined && mRoomDetail?.DIWD_DTOMONTO !== null)
                ? parseFloat(String(mRoomDetail.DIWD_DTOMONTO))
                : 0;
            const mDtoPorc = (mRoomDetail?.DIWD_DTOPORC !== undefined && mRoomDetail?.DIWD_DTOPORC !== null)
                ? parseFloat(String(mRoomDetail.DIWD_DTOPORC))
                : 0;

            let mAbonos = 0;
            if (mDinwId) {
                try {
                    mAbonos = await AbonoService.getTotalAbonos(mDinwId);
                } catch (abErr) {}
            }

            movimientosList.push({
                idMovim: mId,
                dinwId: mDinwId,
                huesped: mHuesped,
                documento: mDocumento,
                fechaReserva: mFechaReserva,
                fechaSalida: mFechaSalida,
                precioNoche: mPrecioNoche,
                descuento: mDescuento,
                dtoPorc: mDtoPorc,
                liprCod: mLiprCod,
                items: mItems,
                totalPagar: mTotal,
                totalAbonos: mAbonos
            });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Seleccionar movimiento activo hoy o el primero
        const todayMov = movimientosList.find(m => {
            const fRes = String(m.fechaReserva).split('T')[0];
            const fSal = m.fechaSalida ? String(m.fechaSalida).split('T')[0] : '';
            return fRes <= todayStr && (!fSal || fSal >= todayStr);
        });

        const activeMovData = todayMov || movimientosList[0] || null;

        const estadoHab = String(hab.ESTADO || hab.estado || 'Disponible').trim();

        return {
            id: habId,
            artiCod: hab.ARTI_COD ? String(hab.ARTI_COD).trim() : undefined,
            numero: num,
            estado: estadoHab,
            tipo: hab.TIPO ? String(hab.TIPO).trim() : 'SENCILLA',
            piso: hab.PISO ? parseInt(String(hab.PISO), 10) : 1,
            huesped: activeMovData?.huesped || '',
            documento: activeMovData?.documento || '',
            fechaReserva: activeMovData?.fechaReserva || '',
            fechaSalida: activeMovData?.fechaSalida || '',
            precioNoche: activeMovData?.precioNoche || parseFloat(hab.PRECIO_CALCULADO || '0'),
            descuento: activeMovData?.descuento || 0,
            dtoPorc: activeMovData?.dtoPorc || 0,
            liprCod: activeMovData?.liprCod || defaultLipr,
            caracteristicas: (hab.CARACTERISTICAS || hab.caracteristicas) ? String(hab.CARACTERISTICAS || hab.caracteristicas).trim() : '',
            observaciones: (hab.NOTAS || hab.observaciones) ? String(hab.NOTAS || hab.observaciones).trim() : '',
            peweId: activeMovData?.dinwId,
            items: activeMovData?.items || [],
            totalPagar: activeMovData?.totalPagar || 0,
            totalAbonos: activeMovData?.totalAbonos || 0,
            movimientos: movimientosList
        };
    }

    // Crear una nueva habitación con ID autoincremental y ARTI_COD vinculado
    static async createHabitacion(data: INuevaHabitacionDTO) {
        const numClean = sanitizeText(data.numero?.trim() || '');
        const artiClean = sanitizeText(data.artiCod?.trim() || '');

        if (!numClean) {
            throw new Error('El número de habitación es obligatorio');
        }
        if (!artiClean) {
            throw new Error('Debe vincular un código de artículo (ARTI_COD) a la habitación');
        }

        // Verificar si ya existe el número de habitación
        const existing = await db(tables.HABITACION)
            .whereRaw('TRIM(NUMERO) = ?', [numClean])
            .first();

        if (existing) {
            throw new Error(`Ya existe una habitación con el número ${numClean}`);
        }

        // Obtener el siguiente ID autoincremental de forma segura
        let nextId = 1;
        try {
            const maxIdResult = await db.raw('SELECT MAX(CAST(ID_HABITACION AS INTEGER)) AS MAXID FROM HABITACION');
            const rows = maxIdResult.rows ? maxIdResult.rows : (Array.isArray(maxIdResult) ? maxIdResult : [maxIdResult]);
            const firstRow = rows[0] || {};
            const maxIdVal = firstRow.MAXID ?? firstRow.maxid ?? firstRow.MAX ?? firstRow.max ?? 0;
            nextId = (parseInt(String(maxIdVal || '0'), 10) || 0) + 1;
        } catch (e) {
            const countRow = await db(tables.HABITACION).count('* as CNT').first();
            nextId = (parseInt(String(countRow?.CNT || '0'), 10) || 0) + 1;
        }

        const nuevaHabitacion: any = {
            ID_HABITACION: String(nextId),
            NUMERO: numClean,
            ESTADO: 'Disponible',
            TIPO: data.tipo ? sanitizeText(data.tipo.trim()).toUpperCase() : 'SENCILLA',
            PISO: data.piso || 1,
            NOTAS: data.observaciones ? truncateToBytes(data.observaciones, 200) : '',
            ARTI_COD: artiClean,
            CARACTERISTICAS: data.caracteristicas ? truncateToBytes(data.caracteristicas, 200) : ''
        };

        await db(tables.HABITACION).insert(nuevaHabitacion);

        return {
            id: String(nextId),
            numero: numClean,
            artiCod: artiClean,
            estado: 'Disponible',
            tipo: nuevaHabitacion.TIPO,
            piso: data.piso || 1,
            caracteristicas: nuevaHabitacion.CARACTERISTICAS,
            observaciones: nuevaHabitacion.NOTAS
        };
    }

    // Actualizar habitación completa desde el modal & registrar en HABITACION_MOVIM y DOC_INVENTARIO_DET_WEB
    static async updateHabitacion(id: string, data: any) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', id).first();
        if (!hab) {
            throw new Error('Habitación no encontrada');
        }

        const habNumero = hab.NUMERO ? String(hab.NUMERO).trim() : id;
        const estadoEntrante = data.estado || hab.ESTADO || 'Disponible';
        const huesped = data.huesped ? String(data.huesped).trim() : '';
        const documento = data.documento ? String(data.documento).trim() : '';
        const fechaReserva = data.fechaReserva || null;
        const fechaSalida = data.fechaSalida || null;
        const artiCod = data.artiCod ? String(data.artiCod).trim() : (hab.ARTI_COD ? String(hab.ARTI_COD).trim() : '001');

        // 1. Obtener fecha de hoy en formato YYYY-MM-DD
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // 2. Determinar si es una reserva formal
        const isReservaFormal = (estadoEntrante === 'Reservada' || estadoEntrante === 'Ocupada' || estadoEntrante === 'Disponible') && Boolean(huesped || documento) && Boolean(fechaReserva);

        const targetMovId = (data.idMovim && data.idMovim !== 'NUEVA') ? parseInt(String(data.idMovim), 10) : undefined;
        const esNueva = Boolean(data.esNuevaReserva) || !targetMovId;

        // 3. Consultar movimiento activo objetivo para esta habitación
        let existingActiveMov: any = null;
        if (targetMovId) {
            existingActiveMov = await db(tables.HABITACION_MOVIM).where('ID_MOVIM', targetMovId).first();
        } else if (!esNueva) {
            existingActiveMov = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', id)
                .andWhere(function () {
                    this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                })
                .orderBy('ID_MOVIM', 'desc')
                .first();
        }

        // 4. Validación: Si hay reserva en fecha futura/actual, validar traslape de fechas
        if (fechaReserva && fechaSalida && isReservaFormal) {
            const newStart = new Date(fechaReserva).getTime();
            const newEnd = new Date(fechaSalida).getTime();

            if (newEnd <= newStart) {
                throw new Error('La fecha y hora de salida debe ser posterior a la fecha y hora de reserva.');
            }

            const otherActiveMovs = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', id)
                .andWhere(function () {
                    this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                })
                .select('*');

            for (const mov of otherActiveMovs) {
                // Excluir el movimiento actual que se está actualizando
                if (existingActiveMov && mov.ID_MOVIM === existingActiveMov.ID_MOVIM) {
                    continue;
                }

                if (mov.FECHA_RESERVA && mov.FECHA_SALIDA) {
                    const existStart = new Date(mov.FECHA_RESERVA).getTime();
                    const existEnd = new Date(mov.FECHA_SALIDA).getTime();

                    if (newStart < existEnd && newEnd > existStart) {
                        const fIniStr = String(mov.FECHA_RESERVA).replace('T', ' ');
                        const fFinStr = String(mov.FECHA_SALIDA).replace('T', ' ');
                        throw new Error(`La habitación #${habNumero} ya tiene una reserva activa entre el ${fIniStr} y el ${fFinStr}. No es posible registrar otra reserva que se solape en ese rango de fechas.`);
                    }
                }
            }
        }

        // Obtener el precio desde PRECIOS_ARTICULO para la lista seleccionada o predeterminada
        const defaultLipr = data.liprCod ? parseInt(String(data.liprCod), 10) : await ArticuloService.getDefaultLiprCod();
        const precioArticulo = await ArticuloService.getPrecioArticulo(artiCod, defaultLipr);
        const precioFinal = data.precioNoche !== undefined && data.precioNoche !== null && Number(data.precioNoche) > 0
            ? parseFloat(String(data.precioNoche))
            : precioArticulo;

        let dinwId: number | undefined = undefined;

        if (isReservaFormal) {
            if (esNueva || !existingActiveMov) {
                // Crear un nuevo DOC_INVENTARIO_WEB exclusivo para esta nueva reserva
                dinwId = await PedidoService.createNewDinw(id, habNumero, documento, huesped);

                const maxMovResult = await db.raw('SELECT MAX(ID_MOVIM) AS MAXID FROM HABITACION_MOVIM');
                const movRows = maxMovResult.rows ? maxMovResult.rows : (Array.isArray(maxMovResult) ? maxMovResult : [maxMovResult]);
                const firstMovRow = movRows[0] || {};
                const maxMovVal = firstMovRow.MAXID ?? firstMovRow.maxid ?? firstMovRow.MAX ?? firstMovRow.max ?? 0;
                const nextMovId = (parseInt(String(maxMovVal || '0'), 10) || 0) + 1;

                await db(tables.HABITACION_MOVIM).insert({
                    ID_MOVIM: nextMovId,
                    ID_HABITACION: id,
                    ID_DOC: null,
                    FECHA_RESERVA: fechaReserva ? String(fechaReserva) : null,
                    FECHA_SALIDA: fechaSalida ? String(fechaSalida) : null,
                    DINW_ID: dinwId,
                    ESTADO: 'Activo',
                    TIPO: null
                });
            } else {
                dinwId = existingActiveMov.DINW_ID;
                if (!dinwId) {
                    dinwId = await PedidoService.createNewDinw(id, habNumero, documento, huesped);
                }

                await db(tables.HABITACION_MOVIM)
                    .where('ID_MOVIM', existingActiveMov.ID_MOVIM)
                    .update({
                        DINW_ID: dinwId,
                        FECHA_RESERVA: fechaReserva ? String(fechaReserva) : existingActiveMov.FECHA_RESERVA,
                        FECHA_SALIDA: fechaSalida ? String(fechaSalida) : existingActiveMov.FECHA_SALIDA,
                        ESTADO: 'Activo'
                    });
            }

            // Actualizar datos del huésped y observaciones en DOC_INVENTARIO_WEB
            if (dinwId) {
                const customObs = (data.observaciones && String(data.observaciones).trim()) || '';
                const obsString = customObs
                    ? sanitizeText(customObs)
                    : sanitizeText(`Hospedaje Habitacion ${habNumero} - ${huesped || 'Huesped General'}`);
                const updateDinw: any = {
                    DINW_OBS: obsString,
                    DINW_CONCEPTO: truncateToBytes(obsString, 55)
                };
                if (documento) updateDinw.DINW_NIT = documento;
                await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).update(updateDinw);
            }

            // 3. Calcular cantidad de días/noches de estadía
            let cantidadDias = 1;
            if (data.dias && Number(data.dias) > 0) {
                cantidadDias = Number(data.dias);
            } else if (data.cantidad && Number(data.cantidad) > 0) {
                cantidadDias = Number(data.cantidad);
            } else if (fechaReserva && fechaSalida) {
                const d1 = new Date(fechaReserva);
                const d2 = new Date(fechaSalida);
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                    const d1Cal = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
                    const d2Cal = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
                    const diffDays = Math.round((d2Cal.getTime() - d1Cal.getTime()) / (1000 * 60 * 60 * 24));
                    cantidadDias = diffDays > 0 ? diffDays : 1;
                }
            }

            // 4. Asegurar que el ARTI_COD de la habitación quede registrado o actualizado en DOC_INVENTARIO_DET_WEB
            const existingRoomItem = await db(tables.DOC_INVENTARIO_DET_WEB)
                .where({ DINW_ID: dinwId, DIWD_ANULADO: 'N' })
                .andWhere(function () {
                    this.where('DIWD_ITEM', 1).orWhere('DIWD_REF', `HAB-${habNumero}`);
                })
                .first();

            const countDetails = await db(tables.DOC_INVENTARIO_DET_WEB)
                .where({ DINW_ID: dinwId, DIWD_ANULADO: 'N' })
                .count('* as TOTAL')
                .first();

            const totalItems = parseInt(String(countDetails?.TOTAL || countDetails?.total || '0'), 10);

            // Consultar tarifa de IVA del artículo vinculado
            const { taivCod, ivaPorc } = await ArticuloService.getTarifaIvaArticulo(artiCod);
            
            // Cálculo de Descuento por noche y porcentaje DIWD_DTOPORC
            const dtoMonto = parseFloat(String(data.descuento || data.dtoMonto || data.descuentoMonto || 0)) || 0;
            const dtoPorc = precioFinal > 0 && dtoMonto > 0 ? Math.round(((dtoMonto / precioFinal) * 100) * 10000) / 10000 : 0;
            const precioConDescuento = Math.max(0, precioFinal - dtoMonto);
            const nuevoItemTotal = precioConDescuento * cantidadDias;
            const ivaItemMonto = ivaPorc > 0 ? Math.round(((nuevoItemTotal / (100 + ivaPorc)) * ivaPorc) * 100) / 100 : 0;

            if (existingRoomItem) {
                // Actualizar ítem existente de la habitación con los nuevos días, precio, descuento e IVA
                await db(tables.DOC_INVENTARIO_DET_WEB)
                    .where('DINW_ID', dinwId)
                    .andWhere('DIWD_ITEM', existingRoomItem.DIWD_ITEM)
                    .update({
                        DIWD_CANT: cantidadDias,
                        DIWD_COSTO: precioFinal,
                        DIWD_PRUNIT: precioFinal,
                        DIWD_DTOPORC: dtoPorc,
                        DIWD_DTOMONTO: dtoMonto,
                        DIWD_IVAPORC: ivaPorc,
                        DIWD_IVAMONTO: ivaItemMonto,
                        DIWD_TOTAL: nuevoItemTotal,
                        DIWD_LISTA: defaultLipr
                    });
            } else if (totalItems === 0) {
                let artDesc = `Hospedaje Habitación ${habNumero} (${data.tipo || hab.TIPO || 'SENCILLA'})`;
                let artUnidad = 'UND';
                if (artiCod) {
                    const artRow = await db(tables.ARTICULO).where('ARTI_COD', artiCod).first();
                    if (artRow) {
                        artDesc = String(artRow.ARTI_DES || artDesc).trim();
                        artUnidad = String(artRow.ARTI_UNIDAD || 'UND').trim();
                    }
                }

                await db(tables.DOC_INVENTARIO_DET_WEB).insert({
                    DINW_ID: dinwId,
                    DIWD_ITEM: 1,
                    DIWD_ARTICULO: artiCod,
                    DIWD_CODBAR: '',
                    DIWD_CANT: cantidadDias,
                    DIWD_UNIDAD: artUnidad,
                    DIWD_COSTO: precioFinal,
                    DIWD_LOTE: '',
                    DIWD_VENCELOTE: null,
                    DIWD_REF: `HAB-${habNumero}`,
                    DIWD_ANULADO: 'N',
                    DIWD_OBS: '',
                    DIWD_DTOPORC: dtoPorc,
                    DIWD_DTOMONTO: dtoMonto,
                    DIWD_BODEGA: '01',
                    DIWD_TIVA: taivCod,
                    DIWD_CONSUMO: 0,
                    DIWD_IVAPORC: ivaPorc,
                    DIWD_FACTOR: 1,
                    DIWD_DESCART: artDesc,
                    DIWD_LISTA: defaultLipr,
                    DIWD_MANDANTE: null,
                    DIWD_IVAMONTO: ivaItemMonto,
                    DIWD_CANTANT: 0,
                    DIWD_PRUNIT: precioFinal,
                    DIWD_TOTAL: nuevoItemTotal,
                    DIWD_STAND: '',
                    DIWD_IMPBA: 0,
                    DIWD_IMPUP: 0,
                    DIWD_IMPUPP: 0,
                    DIWD_CANTINSPECT: 0,
                    DIWD_NIVEL: null
                });
            }

            // Recalcular DINW_MONTO, DINW_BASE e DINW_IVAMONTO con la suma de todos los detalles activos
            const sumResult: any = await db(tables.DOC_INVENTARIO_DET_WEB)
                .where({ DINW_ID: dinwId, DIWD_ANULADO: 'N' })
                .select(
                    db.raw('COALESCE(SUM(DIWD_TOTAL), 0) as SUM_TOTAL'),
                    db.raw('COALESCE(SUM(DIWD_IVAMONTO), 0) as SUM_IVA')
                )
                .first();
            const nuevoDinwTotal = parseFloat(String(sumResult?.SUM_TOTAL || sumResult?.sum_total || nuevoItemTotal));
            const nuevoDinwIva = parseFloat(String(sumResult?.SUM_IVA || sumResult?.sum_iva || ivaItemMonto));
            const nuevoDinwBase = nuevoDinwTotal - nuevoDinwIva;

            await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).update({
                DINW_BASE: nuevoDinwBase,
                DINW_IVAMONTO: nuevoDinwIva,
                DINW_MONTO: nuevoDinwTotal
            });
        }

        // Recalcular estado de la habitación para hoy considerando todas las reservas activas
        const allActiveMovs = await db(tables.HABITACION_MOVIM)
            .where('ID_HABITACION', id)
            .andWhere(function () {
                this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
            })
            .select('FECHA_RESERVA', 'FECHA_SALIDA');

        let isOccupiedToday = false;
        for (const m of allActiveMovs) {
            if (m.FECHA_RESERVA) {
                const fRes = String(m.FECHA_RESERVA).split('T')[0];
                const fSal = m.FECHA_SALIDA ? String(m.FECHA_SALIDA).split('T')[0] : '';
                if (fRes <= todayStr && (!fSal || fSal >= todayStr)) {
                    isOccupiedToday = true;
                    break;
                }
            }
        }

        const estadoFinal = (estadoEntrante === 'Inhabilitada')
            ? 'Inhabilitada'
            : (isOccupiedToday ? 'Ocupada' : 'Disponible');

        // Actualizar datos de la habitación en la tabla HABITACION
        const updatePayload: any = {
            ESTADO: estadoFinal,
            CARACTERISTICAS: data.caracteristicas !== undefined ? data.caracteristicas : hab.CARACTERISTICAS,
            NOTAS: data.observaciones !== undefined ? data.observaciones : hab.NOTAS
        };

        if (data.artiCod) updatePayload.ARTI_COD = data.artiCod.trim();
        if (data.numero) updatePayload.NUMERO = data.numero.trim();
        if (data.tipo) updatePayload.TIPO = data.tipo.trim();
        if (data.piso !== undefined) updatePayload.PISO = parseInt(String(data.piso), 10);

        return db(tables.HABITACION)
            .where('ID_HABITACION', id)
            .update(updatePayload);
    }

    // Inhabilitar habitación
    static async deleteHabitacion(id: string) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', id).first();
        if (!hab) {
            throw new Error('Habitación no encontrada');
        }

        const estadoActual = String(hab.ESTADO || '').trim();
        if (estadoActual === 'Reservada' || estadoActual === 'Ocupada') {
            throw new Error(`No se puede inhabilitar la habitación ${hab.NUMERO} porque se encuentra actualmente ${estadoActual}.`);
        }

        return db(tables.HABITACION)
            .where('ID_HABITACION', id)
            .update({
                ESTADO: 'Inhabilitada'
            });
    }

    // Cancelar / Anular reserva activa de una habitación y dejarla Disponible
    static async cancelarReserva(id: string, idMovimParam?: number | string) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', id).first();
        if (!hab) {
            throw new Error('Habitación no encontrada');
        }

        let targetMovQuery = db(tables.HABITACION_MOVIM)
            .where('ID_HABITACION', id)
            .andWhere(function () {
                this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
            });

        if (idMovimParam) {
            targetMovQuery = targetMovQuery.where('ID_MOVIM', parseInt(String(idMovimParam), 10));
        } else {
            targetMovQuery = targetMovQuery.orderBy('ID_MOVIM', 'desc');
        }

        const activeMov = await targetMovQuery.first();

        if (activeMov) {
            let dinwId = activeMov.DINW_ID || activeMov.PEWE_ID;

            if (dinwId) {
                await db(tables.DOC_INVENTARIO_WEB)
                    .where('DINW_ID', dinwId)
                    .update({ DINW_ANULADO: 'S' });

                await db(tables.DOC_INVENTARIO_DET_WEB)
                    .where('DINW_ID', dinwId)
                    .update({ DIWD_ANULADO: 'S' });
            }

            if (activeMov.ID_MOVIM) {
                try {
                    const anticiposMov = await db(tables.HABITACION_MOVIM_ANTICIPOS)
                        .where('ID_MOVIM', activeMov.ID_MOVIM)
                        .select('ANCL_ID');

                    for (const ant of anticiposMov) {
                        const anclId = ant.ANCL_ID ?? ant.ancl_id;
                        if (anclId) {
                            await AbonoService.anularAbono(anclId);
                        }
                    }
                } catch (e) {
                    console.warn('Aviso al anular anticipos de la reserva:', e);
                }
            }

            await db(tables.HABITACION_MOVIM)
                .where('ID_MOVIM', activeMov.ID_MOVIM)
                .update({ ESTADO: 'Cancelado' });
        }

        await this.syncHabitacionesEstadoAutomatico();

        return { success: true, message: 'Reserva cancelada correctamente, anticipos anulados y habitación sincronizada.' };
    }

    // Listar consumos activos de la habitación
    static async getConsumos(idHabitacion: string) {
        const hab = await this.getHabitacionById(idHabitacion);
        if (!hab) {
            return { habitacionId: idHabitacion, items: [], totalItems: 0, totalPagar: 0 };
        }

        const totalItems = hab.items.reduce((sum, item) => sum + item.cantidad, 0);

        return {
            habitacionId: idHabitacion,
            items: hab.items,
            totalItems,
            totalPagar: hab.totalPagar
        };
    }

    // Actualizar cantidad de un ítem en el documento web activo
    static async updateConsumoCantidad(idHabitacion: string, itemNum: number, cantidad: number) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', idHabitacion).first();
        const ref = `HAB-${hab?.NUMERO || idHabitacion}`;

        // Obtener el DINW_ID activo
        const detailRow = await db(tables.DOC_INVENTARIO_DET_WEB)
            .join(tables.DOC_INVENTARIO_WEB, `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`, '=', `${tables.DOC_INVENTARIO_WEB}.DINW_ID`)
            .where(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_REF`, ref)
            .andWhere(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_ITEM`, itemNum)
            .andWhere(function () {
                this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`)
                    .orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
            })
            .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
            .select(
                `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`,
                `${tables.DOC_INVENTARIO_DET_WEB}.DIWD_COSTO`,
                `${tables.DOC_INVENTARIO_DET_WEB}.DIWD_IVAPORC`
            )
            .first();

        if (!detailRow) return;

        const dinwId = detailRow.DINW_ID;
        const precioUnit = parseFloat(detailRow.DIWD_COSTO || '0');
        const ivaPorc = parseFloat(detailRow.DIWD_IVAPORC || '0');

        if (cantidad <= 0) {
            await db(tables.DOC_INVENTARIO_DET_WEB)
                .where({ DINW_ID: dinwId, DIWD_ITEM: itemNum })
                .delete();
        } else {
            const subtotal = cantidad * precioUnit;
            const ivaMonto = ivaPorc > 0 ? Math.round(((subtotal / (100 + ivaPorc)) * ivaPorc) * 100) / 100 : 0;

            await db(tables.DOC_INVENTARIO_DET_WEB)
                .where({ DINW_ID: dinwId, DIWD_ITEM: itemNum })
                .update({
                    DIWD_CANT: cantidad,
                    DIWD_IVAMONTO: ivaMonto,
                    DIWD_TOTAL: subtotal
                });
        }

        // Recalcular total en DOC_INVENTARIO_WEB
        const sumResult: any = await db(tables.DOC_INVENTARIO_DET_WEB)
            .where({ DINW_ID: dinwId, DIWD_ANULADO: 'N' })
            .select(
                db.raw('COALESCE(SUM(DIWD_TOTAL), 0) as TOTAL'),
                db.raw('COALESCE(SUM(DIWD_IVAMONTO), 0) as IVAMONTO')
            )
            .first();
        const totalPagar = parseFloat(sumResult?.TOTAL || '0');
        const ivaTotal = parseFloat(sumResult?.IVAMONTO || '0');
        const baseTotal = totalPagar - ivaTotal;

        await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).update({
            DINW_BASE: baseTotal,
            DINW_IVAMONTO: ivaTotal,
            DINW_MONTO: totalPagar
        });
    }

    // Eliminar ítem del documento web activo
    static async deleteConsumo(idHabitacion: string, itemNum: number) {
        return this.updateConsumoCantidad(idHabitacion, itemNum, 0);
    }

    // Vaciar carrito activo de la habitación
    static async emptyCart(idHabitacion: string) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', idHabitacion).first();
        const ref = `HAB-${hab?.NUMERO || idHabitacion}`;

        const activeDetails = await db(tables.DOC_INVENTARIO_DET_WEB)
            .join(tables.DOC_INVENTARIO_WEB, `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`, '=', `${tables.DOC_INVENTARIO_WEB}.DINW_ID`)
            .where(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_REF`, ref)
            .andWhere(function () {
                this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`)
                    .orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
            })
            .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
            .select(`${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`)
            .distinct();

        for (const row of activeDetails) {
            await db(tables.DOC_INVENTARIO_DET_WEB).where('DINW_ID', row.DINW_ID).delete();
            await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', row.DINW_ID).update({
                DINW_BASE: 0,
                DINW_IVAMONTO: 0,
                DINW_MONTO: 0
            });
        }
    }
}
