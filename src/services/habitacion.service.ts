import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { IHabitacionDTO, INuevaHabitacionDTO } from '../models/habitacion.model';
import { IConsumoDTO } from '../models/consumo.model';
import { PedidoService } from './pedido.service';
import { ArticuloService } from './articulo.service';
import { AbonoService } from './abono.service';
import { sanitizeText, truncateToBytes } from '../utils/text.utils';

export class HabitacionService {

    // Listar todas las habitaciones con precio desde PRECIOS_ARTICULO (LISTA_PRECIOS LIPR_PREDET)
    static async getAllHabitaciones(): Promise<IHabitacionDTO[]> {
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
            .orderBy(db.raw(`CAST(${tables.HABITACION}.ID_HABITACION AS INTEGER)`), 'asc');

        const result: IHabitacionDTO[] = [];

        for (const r of habitaciones) {
            const habId = String(r.ID_HABITACION || r.id || '').trim();
            const num = String(r.NUMERO || '').trim();
            const ref = `HAB-${num}`;

            // Consultar movimiento activo de HABITACION_MOVIM
            const activeMov = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', habId)
                .andWhere(function () {
                    this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                })
                .orderBy('ID_MOVIM', 'desc')
                .first();

            let activeDinwId = (activeMov?.DINW_ID || activeMov?.PEWE_ID || activeMov?.ID_DOC || activeMov?.PEDI_ID) ? parseInt(String(activeMov.DINW_ID || activeMov.PEWE_ID || activeMov.ID_DOC || activeMov.PEDI_ID), 10) : undefined;
            let huesped = '';
            let documento = '';
            let fechaReserva = activeMov?.FECHA_RESERVA ? String(activeMov.FECHA_RESERVA).trim() : '';
            let fechaSalida = activeMov?.FECHA_SALIDA ? String(activeMov.FECHA_SALIDA).trim() : '';

            // Consultar datos del cliente desde DOC_INVENTARIO_WEB si hay documento activo
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
                } else {
                    activeDinwId = undefined;
                }
            }

            // Consultar ítems del borrador web de esta habitación desde DOC_INVENTARIO_DET_WEB
            let pendingDetails: any[] = [];
            if (activeDinwId) {
                pendingDetails = await db(tables.DOC_INVENTARIO_DET_WEB)
                    .where({ DINW_ID: activeDinwId, DIWD_ANULADO: 'N' })
                    .select('DINW_ID', 'DIWD_CANT', 'DIWD_TOTAL');
            } else {
                pendingDetails = await db(tables.DOC_INVENTARIO_DET_WEB)
                    .join(tables.DOC_INVENTARIO_WEB, `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`, '=', `${tables.DOC_INVENTARIO_WEB}.DINW_ID`)
                    .where(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_REF`, ref)
                    .andWhere(function () {
                        this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`)
                            .orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
                    })
                    .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
                    .andWhere(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_ANULADO`, 'N')
                    .select(
                        `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`,
                        `${tables.DOC_INVENTARIO_DET_WEB}.DIWD_CANT`,
                        `${tables.DOC_INVENTARIO_DET_WEB}.DIWD_TOTAL`
                    );

                if (pendingDetails.length > 0) {
                    activeDinwId = parseInt(String(pendingDetails[0].DINW_ID), 10);
                }
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
            });
        }

        return result;
    }

    // Obtener detalle de una habitación con sus consumos activos desde DOC_INVENTARIO_DET_WEB
    static async getHabitacionById(id: string) {
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

        // Consultar movimiento activo de HABITACION_MOVIM
        const activeMov = await db(tables.HABITACION_MOVIM)
            .where('ID_HABITACION', habId)
            .andWhere(function () {
                this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
            })
            .orderBy('ID_MOVIM', 'desc')
            .first();

        let activeDinwId = (activeMov?.DINW_ID || activeMov?.PEWE_ID || activeMov?.ID_DOC || activeMov?.PEDI_ID) ? parseInt(String(activeMov.DINW_ID || activeMov.PEWE_ID || activeMov.ID_DOC || activeMov.PEDI_ID), 10) : undefined;
        let huesped = '';
        let documento = '';
        let fechaReserva = activeMov?.FECHA_RESERVA ? String(activeMov.FECHA_RESERVA).trim() : '';
        let fechaSalida = activeMov?.FECHA_SALIDA ? String(activeMov.FECHA_SALIDA).trim() : '';

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
            } else {
                activeDinwId = undefined;
            }
        }

        let details: any[] = [];
        if (activeDinwId) {
            details = await db(tables.DOC_INVENTARIO_DET_WEB)
                .where({ DINW_ID: activeDinwId, DIWD_ANULADO: 'N' })
                .orderBy('DIWD_ITEM', 'asc');
        } else {
            details = await db(tables.DOC_INVENTARIO_DET_WEB)
                .join(tables.DOC_INVENTARIO_WEB, `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`, '=', `${tables.DOC_INVENTARIO_WEB}.DINW_ID`)
                .where(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_REF`, ref)
                .andWhere(function () {
                    this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`)
                        .orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
                })
                .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
                .andWhere(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_ANULADO`, 'N')
                .select(
                    `${tables.DOC_INVENTARIO_DET_WEB}.*`
                )
                .orderBy(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_ITEM`, 'asc');

            if (!activeDinwId && details.length > 0) {
                activeDinwId = parseInt(String(details[0].DINW_ID), 10);
            }
        }

        const items: IConsumoDTO[] = details.map((c: any) => ({
            id: c.DIWD_ITEM,
            idHabitacion: id,
            articulo: String(c.DIWD_DESCART || c.DIWD_ARTICULO || '').trim(),
            unidad: String(c.DIWD_UNIDAD || 'UND').trim(),
            cantidad: parseInt(c.DIWD_CANT || '1', 10),
            precio: parseFloat(c.DIWD_COSTO || c.DIWD_PRUNIT || '0'),
            subtotal: parseFloat(c.DIWD_TOTAL || '0')
        }));

        const totalPagar = items.reduce((sum, item) => sum + item.subtotal, 0);
        const roomDetail = details.find((d: any) => d.DIWD_ITEM === 1 || String(d.DIWD_REF || '').trim() === ref) || details[0];
        const liprCod = roomDetail?.DIWD_LISTA ? parseInt(String(roomDetail.DIWD_LISTA), 10) : defaultLipr;
        const precioNoche = (roomDetail?.DIWD_COSTO !== undefined && roomDetail?.DIWD_COSTO !== null)
            ? parseFloat(String(roomDetail.DIWD_COSTO))
            : (roomDetail?.DIWD_PRUNIT ? parseFloat(String(roomDetail.DIWD_PRUNIT)) : parseFloat(hab.PRECIO_CALCULADO || '0'));

        return {
            id: habId,
            artiCod: hab.ARTI_COD ? String(hab.ARTI_COD).trim() : undefined,
            numero: num,
            estado: String(hab.ESTADO || hab.estado || 'Disponible').trim(),
            tipo: hab.TIPO ? String(hab.TIPO).trim() : 'SENCILLA',
            piso: hab.PISO ? parseInt(String(hab.PISO), 10) : 1,
            huesped,
            documento,
            fechaReserva,
            fechaSalida,
            precioNoche,
            liprCod,
            caracteristicas: (hab.CARACTERISTICAS || hab.caracteristicas) ? String(hab.CARACTERISTICAS || hab.caracteristicas).trim() : '',
            observaciones: (hab.NOTAS || hab.observaciones) ? String(hab.NOTAS || hab.observaciones).trim() : '',
            peweId: activeDinwId,
            items,
            totalPagar
        };
    }

    // Crear una nueva habitación con ID autoincremental y ARTI_COD vinculado
    static async createHabitacion(data: INuevaHabitacionDTO) {
        if (!data.numero || !data.numero.trim()) {
            throw new Error('El número de habitación es obligatorio');
        }
        if (!data.artiCod || !data.artiCod.trim()) {
            throw new Error('Debe vincular un código de artículo (ARTI_COD) a la habitación');
        }

        // Obtener el siguiente ID autoincremental
        const maxIdResult = await db.raw('SELECT MAX(CAST(ID_HABITACION AS INTEGER)) AS MAXID FROM HABITACION');
        const rows = maxIdResult.rows ? maxIdResult.rows : (Array.isArray(maxIdResult) ? maxIdResult : [maxIdResult]);
        const firstRow = rows[0] || {};
        const maxIdVal = firstRow.MAXID ?? firstRow.maxid ?? firstRow.MAX ?? firstRow.max ?? 0;
        const nextId = (parseInt(String(maxIdVal || '0'), 10) || 0) + 1;

        const nuevaHabitacion: any = {
            ID_HABITACION: String(nextId),
            NUMERO: data.numero.trim(),
            ESTADO: 'Disponible',
            TIPO: (data.tipo || 'SENCILLA').trim().toUpperCase(),
            PISO: data.piso || 1,
            NOTAS: (data.observaciones || '').trim(),
            ARTI_COD: data.artiCod.trim(),
            CARACTERISTICAS: (data.caracteristicas || '').trim()
        };

        await db(tables.HABITACION).insert(nuevaHabitacion);

        return {
            id: String(nextId),
            numero: String(data.numero).trim(),
            artiCod: String(data.artiCod).trim(),
            estado: 'Disponible',
            tipo: (data.tipo || 'SENCILLA').trim().toUpperCase(),
            piso: data.piso || 1,
            caracteristicas: (data.caracteristicas || '').trim(),
            observaciones: (data.observaciones || '').trim()
        };
    }

    // Actualizar habitación completa desde el modal & registrar en HABITACION_MOVIM y DOC_INVENTARIO_DET_WEB
    static async updateHabitacion(id: string, data: any) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', id).first();
        if (!hab) {
            throw new Error('Habitación no encontrada');
        }

        const habNumero = hab.NUMERO ? String(hab.NUMERO).trim() : id;
        const estadoActual = data.estado || hab.ESTADO || 'Disponible';
        const huesped = data.huesped ? String(data.huesped).trim() : '';
        const documento = data.documento ? String(data.documento).trim() : '';
        const fechaReserva = data.fechaReserva || null;
        const fechaSalida = data.fechaSalida || null;
        const artiCod = data.artiCod ? String(data.artiCod).trim() : (hab.ARTI_COD ? String(hab.ARTI_COD).trim() : '001');

        // Obtener el precio desde PRECIOS_ARTICULO para la lista seleccionada o predeterminada
        const defaultLipr = data.liprCod ? parseInt(String(data.liprCod), 10) : await ArticuloService.getDefaultLiprCod();
        const precioArticulo = await ArticuloService.getPrecioArticulo(artiCod, defaultLipr);
        const precioFinal = data.precioNoche !== undefined && data.precioNoche !== null && Number(data.precioNoche) > 0
            ? parseFloat(String(data.precioNoche))
            : precioArticulo;

        let dinwId: number | undefined = undefined;

        // Crear/sincronizar documento web y movimiento ÚNICAMENTE si es una reserva formal (Reservada + Huésped + Fecha)
        const isReservaFormal = estadoActual === 'Reservada' && Boolean(huesped || documento) && Boolean(fechaReserva);

        if (isReservaFormal) {
            // 1. Obtener o crear DOC_INVENTARIO_WEB
            dinwId = await PedidoService.getActiveDinw(id, habNumero, documento, huesped);

            // Actualizar datos del huésped en DOC_INVENTARIO_WEB
            if (dinwId && (documento || huesped)) {
                const obsString = sanitizeText(`Hospedaje Habitacion ${habNumero} - ${huesped || 'Huesped General'}`);
                const updateDinw: any = {
                    DINW_OBS: obsString,
                    DINW_CONCEPTO: truncateToBytes(obsString, 55)
                };
                if (documento) updateDinw.DINW_NIT = documento;
                await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).update(updateDinw);
            }

            // 2. Verificar si YA EXISTE un movimiento activo para esta reserva
            const existingActiveMov = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', id)
                .andWhere(function () {
                    this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                })
                .orderBy('ID_MOVIM', 'desc')
                .first();

            if (existingActiveMov) {
                // Actualizar el movimiento de la reserva existente (sin duplicar ID_MOVIM)
                await db(tables.HABITACION_MOVIM)
                    .where('ID_MOVIM', existingActiveMov.ID_MOVIM)
                    .update({
                        DINW_ID: dinwId,
                        FECHA_RESERVA: fechaReserva ? String(fechaReserva) : existingActiveMov.FECHA_RESERVA,
                        FECHA_SALIDA: fechaSalida ? String(fechaSalida) : existingActiveMov.FECHA_SALIDA,
                        ESTADO: 'Activo'
                    });
            } else {
                // Solo si es una NUEVA reserva, crear un nuevo registro con ID_MOVIM autoincremental
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
            // El precio de la habitación es el valor total pactado (con IVA incluido)
            const nuevoItemTotal = precioFinal * cantidadDias;
            const ivaItemMonto = ivaPorc > 0 ? Math.round(((nuevoItemTotal / (100 + ivaPorc)) * ivaPorc) * 100) / 100 : 0;

            if (existingRoomItem) {
                // Actualizar ítem existente de la habitación con los nuevos días, precio e IVA
                await db(tables.DOC_INVENTARIO_DET_WEB)
                    .where('DINW_ID', dinwId)
                    .andWhere('DIWD_ITEM', existingRoomItem.DIWD_ITEM)
                    .update({
                        DIWD_CANT: cantidadDias,
                        DIWD_COSTO: precioFinal,
                        DIWD_PRUNIT: precioFinal,
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
                    DIWD_DTOPORC: 0,
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

        // Actualizar datos de la habitación en la tabla HABITACION
        const updatePayload: any = {
            ESTADO: estadoActual,
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
    static async cancelarReserva(id: string) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', id).first();
        if (!hab) {
            throw new Error('Habitación no encontrada');
        }

        // 1. Buscar movimiento activo en HABITACION_MOVIM
        const activeMov = await db(tables.HABITACION_MOVIM)
            .where('ID_HABITACION', id)
            .where('ESTADO', 'Activo')
            .orderBy('ID_MOVIM', 'desc')
            .first();

        let dinwId = activeMov?.DINW_ID || activeMov?.PEWE_ID;

        // Si no está en el movimiento, buscar si hay documento activo por referencia
        if (!dinwId) {
            const habNumero = hab.NUMERO ? String(hab.NUMERO).trim() : id;
            const det = await db(tables.DOC_INVENTARIO_DET_WEB)
                .join(tables.DOC_INVENTARIO_WEB, `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`, '=', `${tables.DOC_INVENTARIO_WEB}.DINW_ID`)
                .where(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_REF`, `HAB-${habNumero}`)
                .where(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
                .where(function () {
                    this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`).orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
                })
                .first();
            if (det) dinwId = det.DINW_ID;
        }

        // 2. Anular documento web y sus detalles si existen
        if (dinwId) {
            await db(tables.DOC_INVENTARIO_WEB)
                .where('DINW_ID', dinwId)
                .update({ DINW_ANULADO: 'S' });

            await db(tables.DOC_INVENTARIO_DET_WEB)
                .where('DINW_ID', dinwId)
                .update({ DIWD_ANULADO: 'S' });
        }

        // 3. Actualizar movimiento de la habitación a 'Cancelado' y anular anticipos vinculados
        if (activeMov) {
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

        // 4. Dejar la habitación en estado 'Disponible'
        await db(tables.HABITACION)
            .where('ID_HABITACION', id)
            .update({
                ESTADO: 'Disponible'
            });

        return { message: 'Reserva cancelada correctamente, anticipos anulados y habitación liberada.' };
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
