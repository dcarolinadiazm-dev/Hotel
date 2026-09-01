import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { TerceroService } from './tercero.service';
import { ArticuloService } from './articulo.service';
import { sanitizeText, truncateToBytes } from '../utils/text.utils';

export class PedidoService {
    // Obtener Punto de Venta y Bodega activos
    static async getDefaultPuntoVentaAndBodega(): Promise<{ ptvtId: number; bodeCod: string }> {
        try {
            const pv = await db(tables.PUNTO_VENTA).where('PTVT_ACTIVO', 'S').first();
            if (pv && pv.BODE_COD) {
                return {
                    ptvtId: parseInt(String(pv.PTVT_ID || 1), 10),
                    bodeCod: String(pv.BODE_COD).trim()
                };
            }
            const firstPv = await db(tables.PUNTO_VENTA).first();
            if (firstPv && firstPv.BODE_COD) {
                return {
                    ptvtId: parseInt(String(firstPv.PTVT_ID || 1), 10),
                    bodeCod: String(firstPv.BODE_COD).trim()
                };
            }
        } catch (e: any) {
            console.warn('Aviso consultando PUNTO_VENTA:', e.message);
        }
        return { ptvtId: 1, bodeCod: '1' };
    }

    // Obtener prefijos de Factura de Venta (TIDO_COD = 31)
    static async getPrefijosFactura() {
        const rows = await db(tables.PREFIJOS)
            .where('TIDO_COD', 31)
            .orderBy('PREF_ACTIVO', 'desc')
            .orderBy('PREF_PRE', 'asc');

        return rows.map((r: any) => ({
            prefijo: String(r.PREF_PRE || '').trim(),
            actual: String(r.PREF_ACTUAL || '').trim(),
            ivaInc: r.PREF_IVAINC === 'S',
            activo: r.PREF_ACTIVO === 'S',
            auto: r.PREF_AUTO === 'S'
        }));
    }

    // Crear un nuevo DOC_INVENTARIO_WEB exclusivo para una nueva reserva
    static async createNewDinw(habitacionId: string, habNumero: string, nit?: string, huesped?: string): Promise<number> {
        const maxDinwRow = await db.raw('SELECT MAX(DINW_ID) AS MAXID FROM DOC_INVENTARIO_WEB');
        const maxDinwRows = maxDinwRow.rows ? maxDinwRow.rows : (Array.isArray(maxDinwRow) ? maxDinwRow : [maxDinwRow]);
        const maxDinwVal = maxDinwRows[0]?.MAXID ?? maxDinwRows[0]?.maxid ?? maxDinwRows[0]?.MAX ?? 0;
        const dinwId = (parseInt(String(maxDinwVal || '0'), 10) || 0) + 1;

        const clienteNit = nit || '800003122';
        const clienteNom = huesped || 'Huésped General';

        try {
            await TerceroService.ensureCliente(clienteNit);
        } catch (e: any) {
            console.warn('Aviso ensureCliente:', e.message);
        }

        let pref = 'SETT';
        try {
            const prefRow = await db(tables.PREFIJOS)
                .where('TIDO_COD', 31)
                .andWhere(function () {
                    this.where('PREF_ACTIVO', 'S').orWhereNull('PREF_ACTIVO');
                })
                .first();
            if (prefRow?.PREF_PRE) pref = String(prefRow.PREF_PRE).trim();
        } catch (e) {}

        const { ptvtId, bodeCod } = await this.getDefaultPuntoVentaAndBodega();
        const obsString = sanitizeText(`Hospedaje Habitacion ${habNumero} - ${clienteNom}`);

        await db(tables.DOC_INVENTARIO_WEB).insert({
            DINW_ID: dinwId,
            DINW_TIPO: 31,
            DINW_PREF: pref,
            DINW_BODEGA: bodeCod,
            DINW_FECHA: new Date(),
            DINW_CONCEPTO: truncateToBytes(obsString, 55),
            DINW_IDDOC: 0,
            DINW_ANULADO: 'N',
            DINW_OBS: obsString,
            DINW_TIPOREF: null,
            DINW_NUMREF: '',
            DINW_NIT: clienteNit,
            DINW_BODDES: bodeCod,
            DINW_NUMERO: '00000001',
            DINW_PTVTA: ptvtId,
            DINW_VEND: 1,
            DINW_VENCE: new Date(),
            DINW_DTOPORC: 0,
            DINW_DTOMONTO: 0,
            DINW_ADICIONAL: 0,
            DINW_RTFTEPORC: 0,
            DINW_RTICAPORC: 0,
            DINW_RTIVAPORC: 0,
            DINW_EXTRA: 0,
            DINW_DTOFPORC: 0,
            DINW_DTOFFEC: new Date(),
            DINW_TIPOENT: 1,
            DINW_MONEDA: 1,
            DINW_TRM: 1,
            DINW_FORMAP: 1,
            DINW_IMPINC: 'S',
            DINW_PASADA: 0,
            DINW_STAND: '',
            DINW_TRANSMIT: 'N',
            DINW_SUCURSAL: '01',
            DINW_IVAINC: 'S',
            DINW_VALIDEZ: 0,
            DINW_DIASCR: 0,
            DINW_COTIZACI: '',
            DINW_BASE: 0,
            DINW_IVAMONTO: 0,
            DINW_MONTO: 0,
            DINW_CANAL: 1,
            DINW_COBRADOR: 1
        });

        return dinwId;
    }

    // Obtener o inicializar el DOC_INVENTARIO_WEB activo (borrador/carrito) de una habitación
    static async getActiveDinw(habitacionId: string, habNumero: string, nit?: string, huesped?: string): Promise<number> {
        const ref = `HAB-${habNumero}`;

        // 1. Buscar en HABITACION_MOVIM el movimiento activo
        const activeMov = await db(tables.HABITACION_MOVIM)
            .where('ID_HABITACION', habitacionId)
            .andWhere(function () {
                this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
            })
            .orderBy('ID_MOVIM', 'desc')
            .first();

        const movDinwId = activeMov?.DINW_ID || activeMov?.PEWE_ID || activeMov?.ID_DOC || activeMov?.PEDI_ID;
        if (movDinwId) {
            const dinwHeader = await db(tables.DOC_INVENTARIO_WEB)
                .where('DINW_ID', movDinwId)
                .andWhere(function () {
                    this.whereNull('DINW_IDDOC').orWhere('DINW_IDDOC', 0);
                })
                .andWhere('DINW_ANULADO', 'N')
                .first();

            if (dinwHeader?.DINW_ID) {
                return dinwHeader.DINW_ID;
            }
        }

        // 2. Buscar por detalle no facturado en DOC_INVENTARIO_DET_WEB
        const existingDet = await db(tables.DOC_INVENTARIO_DET_WEB)
            .join(tables.DOC_INVENTARIO_WEB, `${tables.DOC_INVENTARIO_DET_WEB}.DINW_ID`, '=', `${tables.DOC_INVENTARIO_WEB}.DINW_ID`)
            .where(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_REF`, ref)
            .andWhere(function () {
                this.whereNull(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`)
                    .orWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_IDDOC`, 0);
            })
            .andWhere(`${tables.DOC_INVENTARIO_WEB}.DINW_ANULADO`, 'N')
            .andWhere(`${tables.DOC_INVENTARIO_DET_WEB}.DIWD_ANULADO`, 'N')
            .select(`${tables.DOC_INVENTARIO_WEB}.DINW_ID`)
            .first();

        if (existingDet?.DINW_ID) {
            return existingDet.DINW_ID;
        }

        // 3. Buscar por concepto u observación activa
        const existingHeader = await db(tables.DOC_INVENTARIO_WEB)
            .where(function () {
                this.whereNull('DINW_IDDOC').orWhere('DINW_IDDOC', 0);
            })
            .andWhere('DINW_ANULADO', 'N')
            .andWhere(function () {
                this.whereRaw(`CAST(DINW_CONCEPTO AS VARCHAR(250)) LIKE ?`, [`%Habitación ${habNumero}%`])
                    .orWhereRaw(`CAST(DINW_OBS AS VARCHAR(250)) LIKE ?`, [`%Habitación ${habNumero}%`]);
            })
            .first();

        if (existingHeader?.DINW_ID) {
            return existingHeader.DINW_ID;
        }

        // Crear un nuevo DOC_INVENTARIO_WEB (borrador de remisión activa)
        const maxDinwRow = await db.raw('SELECT MAX(DINW_ID) AS MAXID FROM DOC_INVENTARIO_WEB');
        const maxDinwRows = maxDinwRow.rows ? maxDinwRow.rows : (Array.isArray(maxDinwRow) ? maxDinwRow : [maxDinwRow]);
        const maxDinwVal = maxDinwRows[0]?.MAXID ?? maxDinwRows[0]?.maxid ?? maxDinwRows[0]?.MAX ?? 0;
        const dinwId = (parseInt(String(maxDinwVal || '0'), 10) || 0) + 1;

        const clienteNit = nit || '800003122';
        const clienteNom = huesped || 'Huésped General';

        // Asegurar que el tercero exista como cliente en SYSPLUS
        try {
            await TerceroService.ensureCliente(clienteNit);
        } catch (e: any) {
            console.warn('Aviso ensureCliente:', e.message);
        }

        // Obtener prefijo por defecto de remisión (TIDO_COD = 32)
        let pref = 'REM';
        try {
            const prefRow = await db(tables.PREFIJOS)
                .where('TIDO_COD', 32)
                .andWhere(function () {
                    this.where('PREF_ACTIVO', 'S').orWhereNull('PREF_ACTIVO');
                })
                .first();
            if (prefRow?.PREF_PRE) pref = String(prefRow.PREF_PRE).trim();
        } catch (e) {
            // Usar prefijo por defecto
        }

        const { ptvtId, bodeCod } = await this.getDefaultPuntoVentaAndBodega();
        const obsString = sanitizeText(`Hospedaje Habitacion ${habNumero} - ${clienteNom}`);

        await db(tables.DOC_INVENTARIO_WEB).insert({
            DINW_ID: dinwId,
            DINW_TIPO: 31,
            DINW_PREF: pref,
            DINW_BODEGA: bodeCod,
            DINW_FECHA: new Date(),
            DINW_CONCEPTO: truncateToBytes(obsString, 55),
            DINW_IDDOC: 0,
            DINW_ANULADO: 'N',
            DINW_OBS: obsString,
            DINW_TIPOREF: null,
            DINW_NUMREF: '',
            DINW_NIT: clienteNit,
            DINW_BODDES: bodeCod,
            DINW_NUMERO: '00000001',
            DINW_PTVTA: ptvtId,
            DINW_VEND: 1,
            DINW_VENCE: new Date(),
            DINW_DTOPORC: 0,
            DINW_DTOMONTO: 0,
            DINW_ADICIONAL: 0,
            DINW_RTFTEPORC: 0,
            DINW_RTICAPORC: 0,
            DINW_RTIVAPORC: 0,
            DINW_EXTRA: 0,
            DINW_DTOFPORC: 0,
            DINW_DTOFFEC: new Date(),
            DINW_TIPOENT: 1,
            DINW_MONEDA: 1,
            DINW_TRM: 1,
            DINW_FORMAP: 1,
            DINW_IMPINC: 'S',
            DINW_PASADA: 0,
            DINW_STAND: '',
            DINW_TRANSMIT: 'N',
            DINW_SUCURSAL: '01',
            DINW_IVAINC: 'S',
            DINW_VALIDEZ: 0,
            DINW_DIASCR: 0,
            DINW_COTIZACI: '',
            DINW_CANAL: 1,
            DINW_ORDENC: '',
            DINW_TRANSP: '',
            DINW_CONVCART: 0,
            DINW_RTCREE: 0,
            DINW_FACTURA: '',
            DINW_PEDIDO: '',
            DINW_IVAMONTO: 0,
            DINW_COBRADOR: 1,
            DINW_BASE: 0,
            DINW_RTCREEM: 0,
            DINW_RTFTEMONTO: 0,
            DINW_RTICAMONTO: 0,
            DINW_RTIVAMONTO: 0,
            DINW_IVAPORC: 0,
            DINW_NROPROV: '',
            DINW_MONTO: 0,
            DINW_TIPONE: 0,
            DINW_CONFIRMA: 'N'
        });

        return dinwId;
    }

    // Alias retrocompatible
    static async getActivePewe(habitacionId: string, habNumero: string, nit?: string, huesped?: string): Promise<number> {
        return this.getActiveDinw(habitacionId, habNumero, nit, huesped);
    }

    // 1. Agregar nuevo ítem al carrito directamente en DOC_INVENTARIO_DET_WEB
    static async agregarConsumo(habitacionId: string, item: { articuloCod?: string; artiCod?: string; codigo?: string; descripcion: string; unidad?: string; cantidad: number; precio: number; liprCod?: number }) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', habitacionId).first();
        const habNumero = hab?.NUMERO ? String(hab.NUMERO).trim() : habitacionId;
        const nit = hab?.DOCUMENTO ? String(hab.DOCUMENTO).trim() : '800003122';
        const nom = hab?.HUESPED ? String(hab.HUESPED).trim() : 'Huésped General';

        const dinwId = await this.getActiveDinw(habitacionId, habNumero, nit, nom);

        const artiCod = (item.articuloCod || item.artiCod || item.codigo || '').trim() || '001';

        // Obtener la unidad oficial del artículo y su tarifa de IVA
        let unidad = item.unidad || 'UND';
        const { taivCod, ivaPorc } = await ArticuloService.getTarifaIvaArticulo(artiCod);
        if (artiCod) {
            const artRow = await db(tables.ARTICULO).where('ARTI_COD', artiCod).first();
            if (artRow?.ARTI_UNIDAD) {
                unidad = String(artRow.ARTI_UNIDAD).trim();
            }
        }

        const defaultLipr = item.liprCod || await ArticuloService.getDefaultLiprCod();

        // Obtener el siguiente DIWD_ITEM para este DINW_ID
        const maxItemRow = await db(tables.DOC_INVENTARIO_DET_WEB).where('DINW_ID', dinwId).max('DIWD_ITEM as MAXITEM').first();
        const nextItem = (parseInt(String(maxItemRow?.MAXITEM || '0'), 10) || 0) + 1;

        // El precio ya incluye IVA (precio final al público)
        const totalItem = item.cantidad * item.precio;
        const ivaMonto = ivaPorc > 0 ? Math.round(((totalItem / (100 + ivaPorc)) * ivaPorc) * 100) / 100 : 0;

        const { bodeCod } = await this.getDefaultPuntoVentaAndBodega();

        await db(tables.DOC_INVENTARIO_DET_WEB).insert({
            DINW_ID: dinwId,
            DIWD_ITEM: nextItem,
            DIWD_ARTICULO: artiCod,
            DIWD_CODBAR: '',
            DIWD_CANT: item.cantidad,
            DIWD_UNIDAD: unidad,
            DIWD_COSTO: item.precio,
            DIWD_LOTE: '',
            DIWD_VENCELOTE: null,
            DIWD_REF: `HAB-${habNumero}`,
            DIWD_ANULADO: 'N',
            DIWD_OBS: '',
            DIWD_DTOPORC: 0,
            DIWD_BODEGA: bodeCod,
            DIWD_TIVA: taivCod,
            DIWD_CONSUMO: 0,
            DIWD_IVAPORC: ivaPorc,
            DIWD_FACTOR: 1,
            DIWD_DESCART: item.descripcion,
            DIWD_LISTA: defaultLipr,
            DIWD_MANDANTE: null,
            DIWD_IVAMONTO: ivaMonto,
            DIWD_CANTANT: 0,
            DIWD_PRUNIT: item.precio,
            DIWD_TOTAL: totalItem,
            DIWD_STAND: '',
            DIWD_IMPBA: 0,
            DIWD_IMPUP: 0,
            DIWD_IMPUPP: 0,
            DIWD_CANTINSPECT: 0,
            DIWD_NIVEL: null
        });

        // Recalcular total e IVA en DOC_INVENTARIO_WEB
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

        return {
            success: true,
            dinwId,
            peweId: dinwId,
            item: nextItem,
            subtotal: totalItem,
            ivaMonto,
            ivaPorc,
            totalPagar
        };
    }

    // 2. Grabar encabezado y detalle en DOC_INVENTARIO_WEB y DOC_INVENTARIO_DET_WEB
    static async grabarPedidoWeb(habitacionId: string, customItems?: any[], customHuesped?: any) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', habitacionId).first();
        const habNumero = hab?.NUMERO ? String(hab.NUMERO).trim() : habitacionId;
        const nit = customHuesped?.documento || (hab?.DOCUMENTO ? String(hab.DOCUMENTO).trim() : '800003122');
        const nombreCliente = customHuesped?.huesped || (hab?.HUESPED ? String(hab.HUESPED).trim() : 'Huésped General');

        const defaultLipr = await ArticuloService.getDefaultLiprCod();

        // Si se pasaron items explícitos, sincronizarlos
        if (customItems && customItems.length > 0) {
            const dinwId = await this.getActiveDinw(habitacionId, habNumero, nit, nombreCliente);

            // Eliminar detalles previos no facturados de este borrador
            await db(tables.DOC_INVENTARIO_DET_WEB).where('DINW_ID', dinwId).delete();

            let itemIndex = 1;
            let totalPagar = 0;
            let totalIva = 0;
            for (const item of customItems) {
                const artiCod = item.articuloCod || item.artiCod || item.ARTI_COD || item.codigo || '001';
                const descripcion = item.articulo || item.DESCRIPCION || item.descripcion || 'Producto';
                const cantidad = parseFloat(item.cantidad || item.CANTIDAD || '1');
                const precioUnit = parseFloat(item.precio || item.PRECIO_UNITARIO || '0');

                const { taivCod, ivaPorc } = await ArticuloService.getTarifaIvaArticulo(artiCod);
                const subtotal = cantidad * precioUnit;
                const ivaMonto = ivaPorc > 0 ? Math.round(((subtotal / (100 + ivaPorc)) * ivaPorc) * 100) / 100 : 0;

                let unidad = item.unidad || item.UNIDAD || 'UND';
                if (artiCod) {
                    const artRow = await db(tables.ARTICULO).where('ARTI_COD', artiCod).first();
                    if (artRow?.ARTI_UNIDAD) {
                        unidad = String(artRow.ARTI_UNIDAD).trim();
                    }
                }

                totalPagar += subtotal;
                totalIva += ivaMonto;

                await db(tables.DOC_INVENTARIO_DET_WEB).insert({
                    DINW_ID: dinwId,
                    DIWD_ITEM: itemIndex++,
                    DIWD_ARTICULO: artiCod,
                    DIWD_CODBAR: '',
                    DIWD_CANT: cantidad,
                    DIWD_UNIDAD: unidad,
                    DIWD_COSTO: precioUnit,
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
                    DIWD_DESCART: descripcion,
                    DIWD_LISTA: item.liprCod || defaultLipr,
                    DIWD_MANDANTE: null,
                    DIWD_IVAMONTO: ivaMonto,
                    DIWD_CANTANT: 0,
                    DIWD_PRUNIT: precioUnit,
                    DIWD_TOTAL: subtotal,
                    DIWD_STAND: '',
                    DIWD_IMPBA: 0,
                    DIWD_IMPUP: 0,
                    DIWD_IMPUPP: 0,
                    DIWD_CANTINSPECT: 0,
                    DIWD_NIVEL: null
                });
            }

            const obsString = sanitizeText(`Hospedaje Habitacion ${habNumero} - ${nombreCliente}`);
            const baseTotal = totalPagar - totalIva;

            await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).update({
                DINW_NIT: nit,
                DINW_CONCEPTO: truncateToBytes(obsString, 55),
                DINW_OBS: obsString,
                DINW_BASE: baseTotal,
                DINW_IVAMONTO: totalIva,
                DINW_MONTO: totalPagar
            });

            return {
                success: true,
                dinwId,
                peweId: dinwId,
                totalItems: customItems.length,
                totalPagar,
                totalIva,
                mensaje: `Documento de inventario WEB #${dinwId} grabado exitosamente`
            };
        }

        // Si no se pasaron items explícitos, verificar si ya tiene items en DOC_INVENTARIO_DET_WEB
        const activeDinwId = await this.getActiveDinw(habitacionId, habNumero, nit, nombreCliente);
        const details = await db(tables.DOC_INVENTARIO_DET_WEB)
            .where({ DINW_ID: activeDinwId, DIWD_ANULADO: 'N' });

        if (details.length === 0) {
            throw new Error('No hay productos en el carrito para grabar la reserva');
        }

        const totalPagar = details.reduce((sum: number, it: any) => sum + parseFloat(it.DIWD_TOTAL || '0'), 0);
        const totalIva = details.reduce((sum: number, it: any) => sum + parseFloat(it.DIWD_IVAMONTO || '0'), 0);
        const baseTotal = totalPagar - totalIva;

        await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', activeDinwId).update({
            DINW_BASE: baseTotal,
            DINW_IVAMONTO: totalIva,
            DINW_MONTO: totalPagar
        });

        return {
            success: true,
            dinwId: activeDinwId,
            peweId: activeDinwId,
            totalItems: details.length,
            totalPagar,
            totalIva,
            mensaje: `Documento de inventario WEB #${activeDinwId} grabado exitosamente`
        };
    }

    // 3. Facturación Directa ejecutando GRABE_DOCUMENTO_INV_WEB (31: Factura de Venta)
    static async enviarAFacturar(
        habitacionId: string,
        customDinwId?: number,
        tipoDoc: 'FACTURA' | 'REMISION' = 'FACTURA',
        formaPagoId?: number,
        prefijoParam?: string,
        pagosParam?: Array<{ formaPagoId: number; monto: number }>,
        observacionesParam?: string
    ) {
        const hab = await db(tables.HABITACION).where('ID_HABITACION', habitacionId).first();
        const habNumero = hab?.NUMERO ? String(hab.NUMERO).trim() : habitacionId;
        const estadoHab = String(hab?.ESTADO || '').trim();

        if (estadoHab !== 'Ocupada') {
            throw new Error(`La habitación #${habNumero} se encuentra en estado "${estadoHab || 'Disponible'}". Solo es posible facturar habitaciones en estado "Ocupada".`);
        }

        const nit = hab?.DOCUMENTO ? String(hab.DOCUMENTO).trim() : '800003122';
        const nombreCliente = hab?.HUESPED ? String(hab.HUESPED).trim() : 'Huésped General';

        let dinwId = customDinwId;
        if (!dinwId) {
            dinwId = await this.getActiveDinw(habitacionId, habNumero, nit, nombreCliente);
        }

        // Asegurar que el documento contenga detalles antes de procesar
        const details = await db(tables.DOC_INVENTARIO_DET_WEB)
            .where({ DINW_ID: dinwId, DIWD_ANULADO: 'N' })
            .orderBy('DIWD_ITEM', 'asc');

        if (details.length === 0) {
            throw new Error('El carrito no contiene productos para procesar');
        }

        const dinwHeader = await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).first();
        const clienteNit = dinwHeader?.DINW_NIT || nit;
        const clienteNom = nombreCliente;

        // Asegurar que el cliente exista en TERCEROS y CLIENTES para evitar exception CLIENTE_NO_EXISTE
        const existingTercero = await db(tables.TERCEROS).where('TERC_NIT', clienteNit).first();
        if (!existingTercero) {
            try {
                await db(tables.TERCEROS).insert({
                    TERC_NIT: clienteNit,
                    TERC_NOM: clienteNom || 'Huésped General',
                    TERC_CLIE: 'S',
                    TERC_ESTADO: 'A'
                });
            } catch (e) {}
        }
        await TerceroService.ensureCliente(clienteNit);

        // Tipo de documento exclusivo: 31 = Factura de Venta
        const tipoCodigo = 31;
        const docNombre = 'Factura de Venta';

        // Determinar pagos múltiples o forma de pago única
        let listaPagos: Array<{ formaPagoId: number; monto: number }> = [];
        if (pagosParam && Array.isArray(pagosParam) && pagosParam.length > 0) {
            listaPagos = pagosParam.map(p => ({
                formaPagoId: parseInt(String(p.formaPagoId), 10) || 1,
                monto: parseFloat(String(p.monto)) || 0
            }));
        } else if (formaPagoId) {
            listaPagos = [{
                formaPagoId: parseInt(String(formaPagoId), 10) || 1,
                monto: 0 // Se calculará con el total
            }];
        } else {
            listaPagos = [{ formaPagoId: 1, monto: 0 }];
        }

        const primaryFopaId = listaPagos[0]?.formaPagoId || 1;

        // Obtener prefijo seleccionado o prefijo activo por defecto para TIDO_COD = 31
        let prefijo = prefijoParam ? String(prefijoParam).trim() : '';
        if (!prefijo) {
            try {
                const prefRow = await db(tables.PREFIJOS)
                    .where('TIDO_COD', 31)
                    .andWhere(function () {
                        this.where('PREF_ACTIVO', 'S').orWhereNull('PREF_ACTIVO');
                    })
                    .first();
                if (prefRow?.PREF_PRE) prefijo = String(prefRow.PREF_PRE).trim();
            } catch (e) {
                // Usar prefijo por defecto
            }
        }
        if (!prefijo) prefijo = 'SETT';

        // Determinar observación para el encabezado y la factura
        let obsTexto = '';
        if (observacionesParam && observacionesParam.trim()) {
            obsTexto = observacionesParam.trim();
        } else if (hab?.NOTAS && String(hab.NOTAS).trim()) {
            obsTexto = String(hab.NOTAS).trim();
        } else if (dinwHeader?.DINW_OBS && String(dinwHeader.DINW_OBS).trim()) {
            obsTexto = String(dinwHeader.DINW_OBS).trim();
        }

        const obsString = obsTexto
            ? sanitizeText(obsTexto)
            : sanitizeText(`Hospedaje Habitacion ${habNumero} - ${clienteNom}`);

        // Calcular totales exactos
        let totalBase = 0;
        let totalIva = 0;
        let totalDoc = 0;

        for (const it of details) {
            const cant = parseFloat(String(it.DIWD_CANT || '1'));
            const prunit = parseFloat(String(it.DIWD_COSTO || it.DIWD_PRUNIT || '0'));
            const itemTotal = it.DIWD_TOTAL ? parseFloat(String(it.DIWD_TOTAL)) : (cant * prunit);
            const ivaMonto = parseFloat(String(it.DIWD_IVAMONTO || '0'));
            const subtotalBase = itemTotal - ivaMonto;

            totalBase += subtotalBase;
            totalIva += ivaMonto;
            totalDoc += itemTotal;
        }

        // Si la lista de pagos tenía monto 0 (forma única), asignar el total completo
        if (listaPagos.length === 1 && (!listaPagos[0].monto || listaPagos[0].monto === 0)) {
            listaPagos[0].monto = totalDoc;
        }

        const nowFecha = new Date();

        // Actualizar encabezado antes de invocar el procedimiento (fijando fecha de factura actual)
        const updateHeaderPayload: any = {
            DINW_TIPO: 31,
            DINW_PREF: prefijo,
            DINW_NIT: clienteNit,
            DINW_FECHA: nowFecha,
            DINW_VENCE: nowFecha,
            DINW_CONCEPTO: truncateToBytes(obsString, 55),
            DINW_OBS: obsString,
            DINW_BASE: totalBase,
            DINW_IVAMONTO: totalIva,
            DINW_MONTO: totalDoc,
            DINW_FORMAP: primaryFopaId,
            DINW_IMPINC: 'S',
            DINW_IVAINC: 'S'
        };

        await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).update(updateHeaderPayload);

        // Garantizar que el consecutivo de Recibos de Caja (TIDO_COD = 61) esté sincronizado para evitar colisiones de numeración
        try {
            const maxReca = await db('RECIBOS_CAJA').max('RECA_NUMERO as MAXR').first();
            const maxVal = parseInt(String(maxReca?.MAXR || '0'), 10) || 0;
            const prefReca = await db(tables.PREFIJOS).where('TIDO_COD', 61).first();
            const curVal = parseInt(String(prefReca?.PREF_ACTUAL || '0'), 10) || 0;
            if (curVal <= maxVal) {
                await db(tables.PREFIJOS).where('TIDO_COD', 61).update({
                    PREF_ACTUAL: String(maxVal + 1).padStart(6, '0')
                });
            }
        } catch (syncPrefErr) {
            console.warn('Aviso sincronizando prefijo de recibos de caja:', syncPrefErr);
        }

        // Ejecutar procedimiento almacenado GRABE_DOCUMENTO_INV_WEB(31, ID)
        const spResult = await db.raw('SELECT * FROM GRABE_DOCUMENTO_INV_WEB(?, ?)', [31, dinwId]);
        const resultRow = spResult.rows ? spResult.rows[0] : (Array.isArray(spResult) ? spResult[0] : spResult);

        const idGenerado = resultRow?.IDDOC || resultRow?.iddoc;
        const numDocGenerado = String(resultRow?.NUMDOC || resultRow?.numdoc || `${prefijo}-${dinwId}`).trim();
        const nError = resultRow?.NERROR ?? resultRow?.nerror ?? 0;

        if (nError !== 0 && nError !== null && !idGenerado) {
            throw new Error(`Error en GRABE_DOCUMENTO_INV_WEB de Firebird (Código de error: ${nError})`);
        }

        // Registrar múltiples formas de pago en FACTURAS_CONTADO_PAGO y sincronizar FACTURAS
        if (idGenerado) {
            try {
                const subtotalFactura = Math.round((totalDoc - totalIva) * 100) / 100;
                await db('FACTURAS')
                    .where('FACT_ID', idGenerado)
                    .update({
                        FACT_FECHA: nowFecha,
                        FACT_VENCE: nowFecha,
                        FACT_TOTAL: totalDoc,
                        FACT_IVAMONTO: totalIva,
                        FACT_SUBTOTAL: subtotalFactura,
                        FACT_FORMAP: primaryFopaId,
                        FACT_OBS: Buffer.from(obsString, 'utf-8')
                    });

                // Sincronizar FADE_DTOPORC, FADE_DTOMONTO, FADE_TOTAL, FADE_IVAMONTO, FADE_IVAPORC, FADE_TIVA y FADE_BASE en FACTURAS_DETALLE
                try {
                    const sourceDets = await db(tables.DOC_INVENTARIO_DET_WEB)
                        .where({ DINW_ID: dinwId, DIWD_ANULADO: 'N' })
                        .select('DIWD_ITEM', 'DIWD_DTOPORC', 'DIWD_DTOMONTO', 'DIWD_TOTAL', 'DIWD_IVAMONTO', 'DIWD_IVAPORC', 'DIWD_TIVA');
                    for (const sd of sourceDets) {
                        const dtoporc = Number(sd.DIWD_DTOPORC || 0);
                        const dtomonto = Number(sd.DIWD_DTOMONTO || 0);
                        const totalItem = Number(sd.DIWD_TOTAL || 0);
                        const ivaMonto = Number(sd.DIWD_IVAMONTO || 0);
                        const ivaPorc = Number(sd.DIWD_IVAPORC || 0);
                        const tiva = Number(sd.DIWD_TIVA || 0);
                        const baseItem = Math.round((totalItem - ivaMonto) * 100) / 100;

                        await db('FACTURAS_DETALLE')
                            .where({ FACT_ID: idGenerado, FADE_ITEM: sd.DIWD_ITEM })
                            .update({
                                FADE_DTOPORC: dtoporc,
                                FADE_DTOMONTO: dtomonto,
                                FADE_IVAPORC: ivaPorc,
                                FADE_TIVA: tiva,
                                FADE_TOTAL: totalItem,
                                FADE_IVAMONTO: ivaMonto,
                                FADE_BASE: baseItem
                            });
                    }
                } catch (dtoErr: any) {
                    console.warn('Aviso sincronizando FADE_DTOPORC/FADE_DTOMONTO/FADE_TOTAL:', dtoErr.message);
                }

                // Obtener caja del punto de venta
                let cajaId = 1;
                let codbco = '';
                try {
                    const ptvt = await db('PUNTO_VENTA').first();
                    if (ptvt?.CAJA_ID) cajaId = parseInt(String(ptvt.CAJA_ID), 10);
                    const cajaRow = await db('CAJAS').where('CAJA_ID', cajaId).first();
                    if (cajaRow?.CAJA_FPBCO) codbco = String(cajaRow.CAJA_FPBCO).trim();
                } catch (cajaErr) {
                    // Fallback caja 1
                }

                // Verificar que la factura ya esté grabada en FACTURAS antes de insertar pagos (FK)
                // En producción el SP puede necesitar un momento para confirmar la transacción
                let facturaExiste = false;
                for (let attempt = 0; attempt < 5; attempt++) {
                    const checkFact = await db('FACTURAS').where('FACT_ID', idGenerado).first().catch(() => null);
                    if (checkFact) { facturaExiste = true; break; }
                    await new Promise(r => setTimeout(r, 600));
                }

                if (!facturaExiste) {
                    console.warn(`Aviso: FACT_ID ${idGenerado} no encontrado en FACTURAS después de 5 intentos. Se omite registro de formas de pago en FACTURAS_CONTADO_PAGO.`);
                } else {
                    // Eliminar registros previos de pago generados por defecto por el SP
                    await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', idGenerado).del().catch(() => {});

                    // Insertar cada forma de pago seleccionada
                    for (let i = 0; i < listaPagos.length; i++) {
                        const p = listaPagos[i];
                        const isEfectivo = p.formaPagoId === 1;
                        let numBco = '';

                        if (!isEfectivo && codbco) {
                            try {
                                const maxRcpa = await db('RECIBOS_CAJA_PAGO')
                                    .where({ RCPA_BANCO: codbco, RCPA_CUENTA: '9999' })
                                    .max('RCPA_NUMERO as MAXN')
                                    .first();
                                const maxDpca = await db('DOCUMENTOS_PAGO_CAJA')
                                    .where({ FOPA_ID: p.formaPagoId })
                                    .max('DPCA_NUMERO as MAXD')
                                    .first();
                                const maxVal = Math.max(
                                    parseInt(String(maxRcpa?.MAXN || '0'), 10) || 0,
                                    parseInt(String(maxDpca?.MAXD || '0'), 10) || 0
                                );
                                numBco = String(maxVal + 1 + i).padStart(6, '0');
                            } catch (e) {
                                numBco = '000001';
                            }
                        }

                        try {
                            await db('FACTURAS_CONTADO_PAGO').insert({
                                FCNT_ID: idGenerado,
                                FCNP_ITEM: i + 1,
                                FOPA_ID: p.formaPagoId,
                                FCNP_BANCO: isEfectivo ? '' : codbco,
                                FCNP_CUENTA: isEfectivo ? '' : '9999',
                                FCNP_NUMERO: isEfectivo ? '' : numBco,
                                FCNP_FECHA: new Date(),
                                FCNP_MONTO: p.monto,
                                FCNP_ANULADO: 'N',
                                FCNP_CERRADO: 'N'
                            });
                        } catch (pagoInsertErr: any) {
                            console.warn(`Aviso insertando forma de pago ${i + 1} en FACTURAS_CONTADO_PAGO:`, pagoInsertErr.message);
                        }
                    }
                }
            } catch (syncErr: any) {
                console.error('Error sincronizando pagos y factura generada:', syncErr.message);
            }
        }

        const mensajeExito = `Factura de Venta generada exitosamente con número ${numDocGenerado}`;

        // Dejar la habitación en estado 'Disponible' y limpiar notas/observaciones
        await db(tables.HABITACION)
            .where('ID_HABITACION', habitacionId)
            .update({
                ESTADO: 'Disponible',
                NOTAS: ''
            });

        // Marcar el movimiento en HABITACION_MOVIM como Facturado y asignar ID_DOC y TIPO = 31
        try {
            const activeMov = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', String(habitacionId))
                .andWhere(function () {
                    this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                })
                .orderBy('ID_MOVIM', 'desc')
                .first();

            if (activeMov) {
                await db(tables.HABITACION_MOVIM)
                    .where('ID_MOVIM', activeMov.ID_MOVIM)
                    .update({
                        ID_DOC: idGenerado || dinwId,
                        DINW_ID: dinwId,
                        TIPO: 31,
                        ESTADO: 'Facturado'
                    });
            } else {
                await db(tables.HABITACION_MOVIM)
                    .where('DINW_ID', dinwId)
                    .update({
                        ID_DOC: idGenerado || dinwId,
                        TIPO: 31,
                        ESTADO: 'Facturado'
                    });
            }
        } catch (movErr: any) {
            console.warn('Aviso actualizando HABITACION_MOVIM:', movErr.message);
        }

        return {
            idDoc: idGenerado,
            idPed: idGenerado,
            numDoc: numDocGenerado,
            numPed: numDocGenerado,
            total: totalDoc,
            totalBase,
            totalIva,
            mensaje: `${mensajeExito} y habitación liberada a Disponible.`
        };
    }

    // 3.1 Facturación Directa de Productos (POS Directo sin Habitación)
    static async facturarDirecto(
        clienteNit: string,
        clienteNom: string,
        items: Array<{
            articulo: string;
            descripcion: string;
            cantidad: number;
            precio: number;
            descuento?: number;
            dtoPorc?: number;
            ivaPorc?: number;
            tiva?: number;
            lista?: number;
            unidad?: string;
        }>,
        formaPagoId?: number,
        prefijoParam?: string,
        pagosParam?: Array<{ formaPagoId: number; monto: number }>,
        observacionesParam?: string
    ) {
        if (!items || items.length === 0) {
            throw new Error('El carrito no contiene productos para facturar');
        }

        const nit = clienteNit ? String(clienteNit).trim() : '800003122';
        const nom = clienteNom ? String(clienteNom).trim() : 'Cliente General';

        // Asegurar que el tercero exista como cliente
        try {
            await TerceroService.ensureCliente(nit);
        } catch (e: any) {
            console.warn('Aviso asegurando cliente en facturarDirecto:', e.message);
        }

        // Obtener nuevo DINW_ID
        const maxDinwRow = await db.raw('SELECT MAX(DINW_ID) AS MAXID FROM DOC_INVENTARIO_WEB');
        const maxDinwRows = maxDinwRow.rows ? maxDinwRow.rows : (Array.isArray(maxDinwRow) ? maxDinwRow : [maxDinwRow]);
        const maxDinwVal = maxDinwRows[0]?.MAXID ?? maxDinwRows[0]?.maxid ?? maxDinwRows[0]?.MAX ?? 0;
        const dinwId = (parseInt(String(maxDinwVal || '0'), 10) || 0) + 1;

        // Determinar pagos múltiples o forma de pago única
        let listaPagos: Array<{ formaPagoId: number; monto: number }> = [];
        if (pagosParam && Array.isArray(pagosParam) && pagosParam.length > 0) {
            listaPagos = pagosParam.map(p => ({
                formaPagoId: parseInt(String(p.formaPagoId), 10) || 1,
                monto: parseFloat(String(p.monto)) || 0
            }));
        } else if (formaPagoId) {
            listaPagos = [{
                formaPagoId: parseInt(String(formaPagoId), 10) || 1,
                monto: 0
            }];
        } else {
            listaPagos = [{ formaPagoId: 1, monto: 0 }];
        }

        const primaryFopaId = listaPagos[0]?.formaPagoId || 1;

        // Obtener prefijo de facturación
        let prefijo = prefijoParam ? String(prefijoParam).trim() : '';
        if (!prefijo) {
            try {
                const prefRow = await db(tables.PREFIJOS)
                    .where('TIDO_COD', 31)
                    .andWhere(function () {
                        this.where('PREF_ACTIVO', 'S').orWhereNull('PREF_ACTIVO');
                    })
                    .first();
                if (prefRow?.PREF_PRE) prefijo = String(prefRow.PREF_PRE).trim();
            } catch (e) {
                // Usar prefijo por defecto
            }
        }
        if (!prefijo) prefijo = 'SETT';

        const obsTexto = observacionesParam && observacionesParam.trim() ? observacionesParam.trim() : `Venta Directa - ${nom}`;
        const obsString = sanitizeText(obsTexto);

        // Calcular totales
        let totalBase = 0;
        let totalIva = 0;
        let totalDoc = 0;

        const preparedDetails = [];

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const cant = parseFloat(String(it.cantidad || '1'));
            const prunit = parseFloat(String(it.precio || '0'));
            const dtoMonto = parseFloat(String(it.descuento || '0'));
            const dtoPorc = it.dtoPorc !== undefined ? parseFloat(String(it.dtoPorc)) : (prunit > 0 ? (dtoMonto / prunit) * 100 : 0);
            const precioNeto = Math.max(0, prunit - dtoMonto);
            const totalItem = precioNeto * cant;

            // Consultar tarifa oficial de IVA del artículo en Firebird
            const { taivCod, ivaPorc: dbIvaPorc } = await ArticuloService.getTarifaIvaArticulo(it.articulo);
            const ivaPorc = dbIvaPorc > 0 ? dbIvaPorc : (it.ivaPorc !== undefined && it.ivaPorc !== null ? parseFloat(String(it.ivaPorc)) : 0);
            const tiva = taivCod || it.tiva || 0;
            const ivaMonto = ivaPorc > 0 ? Math.round(((totalItem / (100 + ivaPorc)) * ivaPorc) * 100) / 100 : 0;
            const subtotalBase = totalItem - ivaMonto;

            totalBase += subtotalBase;
            totalIva += ivaMonto;
            totalDoc += totalItem;

            preparedDetails.push({
                DINW_ID: dinwId,
                DIWD_ITEM: i + 1,
                DIWD_ARTICULO: it.articulo,
                DIWD_DESCART: truncateToBytes(it.descripcion || it.articulo, 100),
                DIWD_CANT: cant,
                DIWD_UNIDAD: it.unidad || 'UNIDAD',
                DIWD_COSTO: prunit,
                DIWD_PRUNIT: prunit,
                DIWD_DTOPORC: Math.round(dtoPorc * 100) / 100,
                DIWD_DTOMONTO: dtoMonto,
                DIWD_IVAPORC: ivaPorc,
                DIWD_TIVA: tiva,
                DIWD_IVAMONTO: ivaMonto,
                DIWD_TOTAL: totalItem,
                DIWD_BODEGA: '01',
                DIWD_ANULADO: 'N',
                DIWD_FACTOR: 1,
                DIWD_LISTA: it.lista || 1,
                DIWD_REF: 'VENTA-DIRECTA'
            });
        }

        if (listaPagos.length === 1 && (!listaPagos[0].monto || listaPagos[0].monto === 0)) {
            listaPagos[0].monto = totalDoc;
        }

        // 1. Insertar encabezado DOC_INVENTARIO_WEB
        await db(tables.DOC_INVENTARIO_WEB).insert({
            DINW_ID: dinwId,
            DINW_TIPO: 31,
            DINW_PREF: prefijo,
            DINW_BODEGA: '1',
            DINW_FECHA: new Date(),
            DINW_CONCEPTO: truncateToBytes(obsString, 55),
            DINW_IDDOC: 0,
            DINW_ANULADO: 'N',
            DINW_OBS: obsString,
            DINW_TIPOREF: null,
            DINW_NUMREF: '',
            DINW_NIT: nit,
            DINW_BODDES: '1',
            DINW_NUMERO: '00000001',
            DINW_PTVTA: 1,
            DINW_VEND: 1,
            DINW_VENCE: new Date(),
            DINW_DTOPORC: 0,
            DINW_DTOMONTO: 0,
            DINW_ADICIONAL: 0,
            DINW_RTFTEPORC: 0,
            DINW_RTICAPORC: 0,
            DINW_RTIVAPORC: 0,
            DINW_EXTRA: 0,
            DINW_DTOFPORC: 0,
            DINW_DTOFFEC: new Date(),
            DINW_TIPOENT: 1,
            DINW_MONEDA: 1,
            DINW_TRM: 1,
            DINW_FORMAP: primaryFopaId,
            DINW_IMPINC: 'S',
            DINW_PASADA: 0,
            DINW_STAND: '',
            DINW_TRANSMIT: 'N',
            DINW_SUCURSAL: '01',
            DINW_IVAINC: 'S',
            DINW_VALIDEZ: 0,
            DINW_DIASCR: 0,
            DINW_COTIZACI: '',
            DINW_BASE: Math.round(totalBase * 100) / 100,
            DINW_IVAMONTO: Math.round(totalIva * 100) / 100,
            DINW_MONTO: totalDoc,
            DINW_CANAL: 1,
            DINW_COBRADOR: 1
        });

        // 2. Insertar detalles
        for (const det of preparedDetails) {
            await db(tables.DOC_INVENTARIO_DET_WEB).insert(det);
        }

        // Garantizar consecutivo
        try {
            const maxReca = await db('RECIBOS_CAJA').max('RECA_NUMERO as MAXR').first();
            const maxVal = parseInt(String(maxReca?.MAXR || '0'), 10) || 0;
            const prefReca = await db(tables.PREFIJOS).where('TIDO_COD', 61).first();
            const curVal = parseInt(String(prefReca?.PREF_ACTUAL || '0'), 10) || 0;
            if (curVal <= maxVal) {
                await db(tables.PREFIJOS).where('TIDO_COD', 61).update({
                    PREF_ACTUAL: String(maxVal + 1).padStart(6, '0')
                });
            }
        } catch (syncPrefErr) {
            console.warn('Aviso sincronizando prefijo de recibos de caja:', syncPrefErr);
        }

        // 3. Ejecutar procedimiento almacenado GRABE_DOCUMENTO_INV_WEB(31, ID)
        const spResult = await db.raw('SELECT * FROM GRABE_DOCUMENTO_INV_WEB(?, ?)', [31, dinwId]);
        const resultRow = spResult.rows ? spResult.rows[0] : (Array.isArray(spResult) ? spResult[0] : spResult);

        const idGenerado = resultRow?.IDDOC || resultRow?.iddoc;
        const numDocGenerado = String(resultRow?.NUMDOC || resultRow?.numdoc || `${prefijo}-${dinwId}`).trim();
        const nError = resultRow?.NERROR ?? resultRow?.nerror ?? 0;

        if (nError !== 0 && nError !== null && !idGenerado) {
            throw new Error(`Error en GRABE_DOCUMENTO_INV_WEB de Firebird (Código de error: ${nError})`);
        }

        // 4. Sincronizar FACTURAS, FACTURAS_DETALLE y FACTURAS_CONTADO_PAGO
        if (idGenerado) {
            try {
                const nowFecha = new Date();
                const subtotalFactura = Math.round((totalDoc - totalIva) * 100) / 100;
                await db('FACTURAS')
                    .where('FACT_ID', idGenerado)
                    .update({
                        FACT_FECHA: nowFecha,
                        FACT_VENCE: nowFecha,
                        FACT_TOTAL: totalDoc,
                        FACT_IVAMONTO: totalIva,
                        FACT_SUBTOTAL: subtotalFactura,
                        FACT_FORMAP: primaryFopaId,
                        FACT_OBS: Buffer.from(obsString, 'utf-8')
                    });

                for (const sd of preparedDetails) {
                    const baseItem = Math.round((sd.DIWD_TOTAL - sd.DIWD_IVAMONTO) * 100) / 100;
                    await db('FACTURAS_DETALLE')
                        .where({ FACT_ID: idGenerado, FADE_ITEM: sd.DIWD_ITEM })
                        .update({
                            FADE_DTOPORC: sd.DIWD_DTOPORC,
                            FADE_DTOMONTO: sd.DIWD_DTOMONTO,
                            FADE_IVAPORC: sd.DIWD_IVAPORC,
                            FADE_TIVA: sd.DIWD_TIVA,
                            FADE_TOTAL: sd.DIWD_TOTAL,
                            FADE_IVAMONTO: sd.DIWD_IVAMONTO,
                            FADE_BASE: baseItem
                        });
                }

                // Sincronizar formas de pago
                let codbco = '';
                try {
                    const ptvt = await db('PUNTO_VENTA').first();
                    const cajaId = ptvt?.CAJA_ID ? parseInt(String(ptvt.CAJA_ID), 10) : 1;
                    const cajaRow = await db('CAJAS').where('CAJA_ID', cajaId).first();
                    if (cajaRow?.CAJA_FPBCO) codbco = String(cajaRow.CAJA_FPBCO).trim();
                } catch (cajaErr) { }

                // Verificar que exista en FACTURAS antes de insertar pagos (FK)
                let factExiste2 = false;
                for (let attempt = 0; attempt < 5; attempt++) {
                    const chk = await db('FACTURAS').where('FACT_ID', idGenerado).first().catch(() => null);
                    if (chk) { factExiste2 = true; break; }
                    await new Promise(r => setTimeout(r, 600));
                }

                if (factExiste2) {
                    await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', idGenerado).del().catch(() => {});

                    for (let i = 0; i < listaPagos.length; i++) {
                        const p = listaPagos[i];
                        const isEfectivo = p.formaPagoId === 1;
                        let numBco = '';
                        if (!isEfectivo && codbco) {
                            try {
                                const maxRcpa = await db('RECIBOS_CAJA_PAGO')
                                    .where({ RCPA_BANCO: codbco, RCPA_CUENTA: '9999' })
                                    .max('RCPA_NUMERO as MAXN')
                                    .first();
                                const maxDpca = await db('DOCUMENTOS_PAGO_CAJA')
                                    .where({ FOPA_ID: p.formaPagoId })
                                    .max('DPCA_NUMERO as MAXD')
                                    .first();
                                const maxVal = Math.max(
                                    parseInt(String(maxRcpa?.MAXN || '0'), 10) || 0,
                                    parseInt(String(maxDpca?.MAXD || '0'), 10) || 0
                                );
                                numBco = String(maxVal + 1 + i).padStart(6, '0');
                            } catch (e) {
                                numBco = '000001';
                            }
                        }

                        try {
                            await db('FACTURAS_CONTADO_PAGO').insert({
                                FCNT_ID: idGenerado,
                                FCNP_ITEM: i + 1,
                                FOPA_ID: p.formaPagoId,
                                FCNP_BANCO: isEfectivo ? '' : codbco,
                                FCNP_CUENTA: isEfectivo ? '' : '9999',
                                FCNP_NUMERO: isEfectivo ? '' : numBco,
                                FCNP_FECHA: new Date(),
                                FCNP_MONTO: p.monto,
                                FCNP_ANULADO: 'N',
                                FCNP_CERRADO: 'N'
                            });
                        } catch (pagoErr: any) {
                            console.warn(`Aviso insertando pago ${i + 1}:`, pagoErr.message);
                        }
                    }
                } else {
                    console.warn(`Aviso: FACT_ID ${idGenerado} no encontrado en FACTURAS (multiples). Omitiendo FACTURAS_CONTADO_PAGO.`);
                }
            } catch (syncErr: any) {
                console.error('Error sincronizando facturarDirecto:', syncErr.message);
            }
        }

        return {
            idDoc: idGenerado,
            numDoc: numDocGenerado,
            total: totalDoc,
            totalBase,
            totalIva,
            mensaje: `Factura de Venta #${numDocGenerado} generada exitosamente.`
        };
    }

    // 4. Reporte de Facturas de Venta consultando directamente la tabla FACTURAS
    static async getReportePedidos(fechaDesde?: string, fechaHasta?: string): Promise<{ pedidos: any[]; totales: { totalArticulos: number; totalVentas: number; totalesPorFormaPago?: { [key: string]: number } } }> {
        let query = db('FACTURAS as F')
            .leftJoin('DOC_INVENTARIO_WEB as D', 'F.FACT_ID', 'D.DINW_IDDOC')
            .leftJoin(tables.TERCEROS, 'F.TERC_NIT', `${tables.TERCEROS}.TERC_NIT`)
            .select(
                'F.FACT_ID',
                'F.PREF_PRE',
                'F.FACT_NUMERO',
                'F.FACT_FECHA',
                'F.TERC_NIT',
                'F.FACT_NOMCLIENTE',
                'F.FACT_TOTAL',
                'F.FACT_OBS',
                'F.FACT_ANULADO',
                'D.DINW_FECHA',
                'D.DINW_OBS',
                'D.DINW_CONCEPTO',
                `${tables.TERCEROS}.TERC_NOM as TERCERO_NOMBRE`
            )
            .where('F.FACT_ANULADO', 'N');

        if (fechaDesde) {
            const dDesde = new Date(fechaDesde);
            if (!isNaN(dDesde.getTime())) {
                const parts = fechaDesde.split('T')[0].split('-');
                if (parts.length === 3) {
                    const y = parts[0];
                    const m = parts[1].padStart(2, '0');
                    const d = parts[2].padStart(2, '0');
                    query = query.whereRaw(`F.FACT_FECHA >= '${y}-${m}-${d}'`);
                }
            }
        }

        if (fechaHasta) {
            const dHasta = new Date(fechaHasta);
            if (!isNaN(dHasta.getTime())) {
                const parts = fechaHasta.split('T')[0].split('-');
                if (parts.length === 3) {
                    const y = parts[0];
                    const m = parts[1].padStart(2, '0');
                    const d = parts[2].padStart(2, '0');
                    query = query.whereRaw(`F.FACT_FECHA <= '${y}-${m}-${d}'`);
                }
            }
        }

        const rows = await query.orderBy('F.FACT_ID', 'desc').limit(200);

        const pedidos: any[] = [];

        for (const r of rows) {
            // Contar cantidad de artículos de la factura
            let totalCant = 1;
            try {
                const itemsCountRow = await db('FACTURAS_DETALLE')
                    .where({ FACT_ID: r.FACT_ID, FADE_ANULADO: 'N' })
                    .sum('FADE_CANT as TOTAL_CANT')
                    .first();
                if (itemsCountRow?.TOTAL_CANT) {
                    totalCant = parseInt(String(itemsCountRow.TOTAL_CANT), 10) || 1;
                }
            } catch (e) {
                totalCant = 1;
            }

            const obsStr = String(r.FACT_OBS || r.DINW_OBS || r.DINW_CONCEPTO || '');
            const matchHab = obsStr.match(/Habitaci[oó]n\s+(\w+)/i);
            const habitacionStr = matchHab ? `Habitación ${matchHab[1]}` : 'General';

            const huespedStr = r.FACT_NOMCLIENTE ? String(r.FACT_NOMCLIENTE).trim() : (r.TERCERO_NOMBRE ? String(r.TERCERO_NOMBRE).trim() : 'Huésped General');
            const nitStr = r.TERC_NIT ? String(r.TERC_NIT).trim() : '';

            // Formatear Fecha y Hora
            const rawFecha = r.DINW_FECHA || r.FACT_FECHA;
            let fechaTexto = '';
            if (rawFecha) {
                const d = new Date(rawFecha);
                if (!isNaN(d.getTime())) {
                    const hasTime = r.DINW_FECHA !== null && r.DINW_FECHA !== undefined;
                    fechaTexto = d.toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) + (hasTime ? `, ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '');
                } else {
                    fechaTexto = String(rawFecha);
                }
            } else {
                fechaTexto = new Date().toLocaleDateString('es-CO');
            }

            const pref = String(r.PREF_PRE || 'SETT').trim();
            const num = String(r.FACT_NUMERO || r.FACT_ID).trim();
            const numDoc = `${pref}-${num}`;
            const totalFactura = parseFloat(String(r.FACT_TOTAL || '0'));

            // Obtener formas de pago de la factura
            let pagosList: Array<{ nombre: string; monto: number }> = [];
            let formaPagoStr = 'EFECTIVO';
            try {
                const pagosRows = await db('FACTURAS_CONTADO_PAGO as P')
                    .join('FORMAS_PAGO as F', 'P.FOPA_ID', 'F.FOPA_ID')
                    .where('P.FCNT_ID', r.FACT_ID)
                    .orderBy('P.FCNP_ITEM', 'asc')
                    .select('F.FOPA_NOM as nombre', 'P.FCNP_MONTO as monto');

                if (pagosRows && pagosRows.length > 0) {
                    pagosList = pagosRows.map((p: any) => ({
                        nombre: String(p.nombre || p.NOMBRE || 'EFECTIVO').trim(),
                        monto: parseFloat(String(p.monto || p.MONTO || '0'))
                    }));
                    if (pagosList.length === 1) {
                        formaPagoStr = pagosList[0].nombre;
                    } else {
                        formaPagoStr = pagosList.map(p => `${p.nombre}: $${Math.round(p.monto).toLocaleString('es-CO')}`).join(' + ');
                    }
                } else if (r.FACT_FORMAP) {
                    const fpRow = await db('FORMAS_PAGO').where('FOPA_ID', r.FACT_FORMAP).first();
                    if (fpRow?.FOPA_NOM) {
                        formaPagoStr = String(fpRow.FOPA_NOM).trim();
                        pagosList = [{ nombre: formaPagoStr, monto: totalFactura }];
                    }
                }
            } catch (e) {
                pagosList = [{ nombre: 'EFECTIVO', monto: totalFactura }];
            }

            pedidos.push({
                id: r.FACT_ID,
                habitacion: habitacionStr,
                habitacionNumero: matchHab ? matchHab[1] : '1',
                huesped: huespedStr,
                documento: nitStr,
                total: totalFactura,
                fecha: fechaTexto,
                fechaTexto: fechaTexto,
                articulos: totalCant,
                formaPago: formaPagoStr,
                pagos: pagosList,
                estado: 'Facturado',
                numeroPedido: numDoc
            });
        }

        const totalArticulos = pedidos.reduce((acc, p) => acc + p.articulos, 0);
        const totalVentas = pedidos.reduce((acc, p) => acc + p.total, 0);

        const totalesPorFormaPago: { [key: string]: number } = {};
        for (const p of pedidos) {
            if (p.pagos && p.pagos.length > 0) {
                for (const pago of p.pagos) {
                    const key = pago.nombre.toUpperCase();
                    totalesPorFormaPago[key] = (totalesPorFormaPago[key] || 0) + pago.monto;
                }
            } else {
                const key = (p.formaPago || 'EFECTIVO').toUpperCase();
                totalesPorFormaPago[key] = (totalesPorFormaPago[key] || 0) + p.total;
            }
        }

        return {
            pedidos,
            totales: {
                totalArticulos,
                totalVentas,
                totalesPorFormaPago
            }
        };
    }

    // 5. Obtener datos formateados para impresión de tirilla POS (IMPR_FACTURA / IMPR_REMISION)
    static async getDatosImpresion(tipo: string | number, idDoc: number) {
        const isFactura = String(tipo).toUpperCase() === 'FACTURA' || Number(tipo) === 31;
        const tipoCodigo = isFactura ? 31 : 32;

        let rawRows: any[] = [];
        try {
            if (tipoCodigo === 31) {
                const res = await db.raw('SELECT * FROM IMPR_FACTURA(?, ?)', [idDoc, 'N']);
                rawRows = res.rows ? res.rows : (Array.isArray(res) ? res : [res]);
            } else {
                const res = await db.raw('SELECT * FROM IMPR_REMISION(?)', [idDoc]);
                rawRows = res.rows ? res.rows : (Array.isArray(res) ? res : [res]);
            }
        } catch (e: any) {
            console.error(`Error ejecutando IMPR_${isFactura ? 'FACTURA' : 'REMISION'}:`, e.message);
        }

        if (!rawRows || rawRows.length === 0 || !rawRows[0]) {
            throw new Error(`No se encontraron datos para imprimir el documento #${idDoc}`);
        }

        const first = rawRows[0] || {};

        // Fallback a tablas de encabezado si el SP no trajo campos completos
        let fallbackHeader: any = null;
        if (!isFactura) {
            try {
                fallbackHeader = await db('REMISIONES_VENTA').where('REVT_ID', idDoc).first();
            } catch (e: any) {
                console.error('Error cargando fallback REMISIONES_VENTA:', e.message);
            }
        } else {
            try {
                fallbackHeader = await db('FACTURAS').where('FACT_ID', idDoc).first();
            } catch (e: any) {
                console.error('Error cargando fallback FACTURAS:', e.message);
            }
        }

        const pref = String(first.PREF || fallbackHeader?.PREF_PRE || (isFactura ? 'FAC' : 'REM')).trim();
        const num = String(first.NUMERO || fallbackHeader?.REVT_NUMERO || fallbackHeader?.FACT_NUMERO || idDoc).trim();
        const numeroDoc = `${pref}-${num}`;

        // Fechas y horas
        const rawFecha = first.FECHA || fallbackHeader?.REVT_FECHA || fallbackHeader?.FACT_FECHA;
        let fechaTexto = '';
        if (rawFecha) {
            const d = new Date(rawFecha);
            fechaTexto = !isNaN(d.getTime())
                ? d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : String(rawFecha);
        } else {
            fechaTexto = new Date().toLocaleDateString('es-CO');
        }

        let horaTexto = '';
        if (first.HORA) {
            const d = new Date(first.HORA);
            horaTexto = !isNaN(d.getTime())
                ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : String(first.HORA);
        } else {
            horaTexto = new Date().toLocaleTimeString('es-CO');
        }

        const rawObs = first.OBS || fallbackHeader?.REVT_OBS || fallbackHeader?.FACT_OBS || fallbackHeader?.REVT_CONC;
        const obsBuffer = rawObs ? (Buffer.isBuffer(rawObs) ? rawObs.toString('utf8') : String(rawObs)) : '';
        const matchHab = obsBuffer.match(/Habitaci[oó]n\s+(\w+)/i) || (first.REFITEM ? String(first.REFITEM).match(/HAB-(\w+)/i) : null);
        const habitacionNumero = matchHab ? matchHab[1] : '';

        const formaPagoStr = String(first.FORMAP || first.FORMAPAGO1 || 'EFECTIVO').trim();
        const huespedNombre = first.NOMCLIENTE || first.NOMTERCERO || fallbackHeader?.REVT_NOMTERC || fallbackHeader?.FACT_NOMCLIENTE || 'Huésped General';
        const docNit = first.NIT || fallbackHeader?.TERC_NIT || '';

        // Mapear los ítems
        let items: any[] = [];
        if (isFactura) {
            try {
                const facDets = await db('FACTURAS_DETALLE')
                    .where({ FACT_ID: idDoc, FADE_ANULADO: 'N' })
                    .orderBy('FADE_ITEM', 'asc');
                if (facDets && facDets.length > 0) {
                    items = facDets.map((d: any) => ({
                        item: parseInt(String(d.FADE_ITEM || '1'), 10),
                        articulo: String(d.ARTI_COD || '').trim(),
                        descripcion: String(d.FADE_DESC || d.ARTI_COD || 'Producto / Hospedaje').trim(),
                        referencia: String(d.FADE_REFERENCIA || '').trim(),
                        cantidad: parseFloat(String(d.FADE_CANT || '1')),
                        precioUnitario: parseFloat(String(d.FADE_PRUNIT || '0')),
                        ivaPorc: parseFloat(String(d.FADE_IVAPORC || '0')),
                        ivaMonto: parseFloat(String(d.FADE_IVAMONTO || '0')),
                        total: parseFloat(String(d.FADE_TOTAL || '0'))
                    }));
                }
            } catch (facDetErr: any) {
                console.warn('Aviso consultando FACTURAS_DETALLE para impresion:', facDetErr.message);
            }
        }

        if (items.length === 0) {
            items = rawRows
                .filter((r: any) => r.ARTICULO || r.ARTIDES || r.TOTAL)
                .map((r: any) => {
                    const desc = String(r.ARTIDES || r.DESCORTA || r.ARTICULO || 'Producto / Hospedaje').trim();
                    const cant = parseFloat(String(r.CANT || '1'));
                    const prunit = parseFloat(String(r.PRUNIT || r.PRNETO || '0'));
                    const totalItem = parseFloat(String(r.TOTAL || (cant * prunit)));
                    const ivaPorc = parseFloat(String(r.IVAPORC || '0'));
                    const ivaMonto = parseFloat(String(r.IVAITMONTO || '0'));

                    return {
                        item: parseInt(String(r.ITEM || '1'), 10),
                        articulo: String(r.ARTICULO || '').trim(),
                        descripcion: desc,
                        referencia: String(r.REFITEM || '').trim(),
                        cantidad: cant,
                        precioUnitario: prunit,
                        ivaPorc,
                        ivaMonto,
                        total: totalItem
                    };
                });
        }

        // Totales con fallback a sumatoria de items o tabla principal
        const sumItemsTotal = items.reduce((acc, it) => acc + (it.total || 0), 0);
        const sumItemsIva = items.reduce((acc, it) => acc + (it.ivaMonto || 0), 0);

        let totalPagar = parseFloat(String(fallbackHeader?.FACT_TOTAL || fallbackHeader?.REVT_TOTAL || first.TOTALFAC || first.TOTALPAGAR || '0'));
        let ivaTotal = parseFloat(String(fallbackHeader?.FACT_IVAMONTO || fallbackHeader?.REVT_IVAMONTO || first.IVAMONTO || '0'));
        let subtotal = parseFloat(String(fallbackHeader?.FACT_SUBTOTAL || fallbackHeader?.FACT_BASE || first.SUBTOTAL || '0'));

        if (sumItemsTotal > 0) {
            totalPagar = sumItemsTotal;
            ivaTotal = sumItemsIva;
            subtotal = Math.round((totalPagar - ivaTotal) * 100) / 100;
        }

        let pagosList: Array<{ nombre: string; monto: number }> = [];
        if (isFactura) {
            try {
                const pagosRows = await db('FACTURAS_CONTADO_PAGO as P')
                    .join('FORMAS_PAGO as F', 'P.FOPA_ID', 'F.FOPA_ID')
                    .where('P.FCNT_ID', idDoc)
                    .orderBy('P.FCNP_ITEM', 'asc')
                    .select('F.FOPA_NOM as nombre', 'P.FCNP_MONTO as monto');

                if (pagosRows && pagosRows.length > 0) {
                    pagosList = pagosRows.map((p: any) => ({
                        nombre: String(p.nombre || p.NOMBRE || 'EFECTIVO').trim(),
                        monto: parseFloat(String(p.monto || p.MONTO || '0'))
                    }));
                }
            } catch (e: any) {
                console.warn('Aviso cargando formas de pago de FACTURAS_CONTADO_PAGO:', e.message);
            }
        }

        if (pagosList.length === 1 && pagosList[0].monto < totalPagar) {
            pagosList[0].monto = totalPagar;
        } else if (pagosList.length === 0) {
            pagosList = [{ nombre: formaPagoStr || 'EFECTIVO', monto: totalPagar }];
        }

        let formaPagoFinalStr = formaPagoStr;
        if (pagosList.length > 0) {
            formaPagoFinalStr = pagosList.map(p => `${p.nombre}: $${Math.round(p.monto).toLocaleString('es-CO')}`).join(' / ');
        }

        const cleanStr = (s?: any) => {
            if (!s) return '';
            return String(s).replace(/[\ufffd\x7f-\x9f]/g, '').trim();
        };

        return {
            titulo: 'DOCUMENTO DE RESERVA CANCELADO',
            tipoDoc: isFactura ? 'FACTURA' : 'REMISION',
            tipoNombre: isFactura ? 'Factura de Venta' : 'Remisión de Venta',
            prefijo: pref,
            numero: num,
            numeroDoc,
            autorizacion: first.AUTORIZACION ? cleanStr(first.AUTORIZACION) : undefined,
            fecha: fechaTexto,
            hora: horaTexto,
            huesped: cleanStr(huespedNombre),
            documento: cleanStr(docNit),
            direccion: cleanStr(first.DIRECCION),
            ciudad: cleanStr(first.CIUDAD),
            celular: cleanStr(first.CEL || first.TELEFONO),
            habitacionNumero,
            formaPago: cleanStr(formaPagoFinalStr),
            formasPago: pagosList,
            observaciones: cleanStr(obsBuffer),
            items,
            subtotal,
            ivaTotal,
            totalPagar
        };
    }

    static async enviarAFacturarMultiples(
        habitacionesIds: string[],
        formaPagoId?: number,
        prefijoParam?: string,
        pagosParam?: Array<{ formaPagoId: number; monto: number }>,
        observacionesParam?: string
    ) {
        if (!habitacionesIds || !Array.isArray(habitacionesIds) || habitacionesIds.length === 0) {
            throw new Error('Debe seleccionar al menos una habitación para facturar');
        }

        // Consultar datos de todas las habitaciones seleccionadas
        const habs = await db(tables.HABITACION)
            .whereIn('ID_HABITACION', habitacionesIds);

        if (habs.length !== habitacionesIds.length) {
            throw new Error('Una o más habitaciones seleccionadas no existen en el sistema');
        }

        // Validar que todas estén en estado 'Ocupada'
        for (const h of habs) {
            const num = h.NUMERO ? String(h.NUMERO).trim() : h.ID_HABITACION;
            const estado = String(h.ESTADO || '').trim();
            if (estado !== 'Ocupada') {
                throw new Error(`La habitación #${num} se encuentra en estado "${estado || 'Disponible'}". Solo es posible facturar habitaciones en estado "Ocupada".`);
            }
        }

        // Obtener cliente del primer registro o de sus movimientos activos
        let nit = '800003122';
        let nombreCliente = 'Huésped General';

        for (const h of habs) {
            if (h.DOCUMENTO && String(h.DOCUMENTO).trim()) {
                nit = String(h.DOCUMENTO).trim();
                nombreCliente = String(h.HUESPED || '').trim() || nombreCliente;
                break;
            }
        }

        if (nit === '800003122') {
            for (const h of habs) {
                const mov = await db(tables.HABITACION_MOVIM)
                    .where('ID_HABITACION', String(h.ID_HABITACION))
                    .andWhere(function () {
                        this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                    })
                    .orderBy('ID_MOVIM', 'desc')
                    .first();
                if (mov?.DOCUMENTO && String(mov.DOCUMENTO).trim()) {
                    nit = String(mov.DOCUMENTO).trim();
                    nombreCliente = String(mov.HUESPED || '').trim() || nombreCliente;
                    break;
                }
            }
        }

        // Asegurar que el cliente exista en TERCEROS y CLIENTES para evitar exception CLIENTE_NO_EXISTE en Firebird
        const existingTercero = await db(tables.TERCEROS).where('TERC_NIT', nit).first();
        if (!existingTercero) {
            try {
                await db(tables.TERCEROS).insert({
                    TERC_NIT: nit,
                    TERC_NOM: nombreCliente || 'Huésped General',
                    TERC_CLIE: 'S',
                    TERC_ESTADO: 'A'
                });
            } catch (e) {}
        }
        await TerceroService.ensureCliente(nit);

        const habsNumeros = habs.map(h => String(h.NUMERO || h.ID_HABITACION).trim()).join(', ');
        const conceptoConsolidado = truncateToBytes(`Factura Consolidada Habs ${habsNumeros} - ${nombreCliente}`, 55);
        const obsGeneral = observacionesParam?.trim() || `Factura Consolidada Habs: ${habsNumeros} - ${nombreCliente}`;

        // Obtener punto de venta, canal, vendedor, etc.
        const sucursal = '01'; // Sucursal estándar del cliente en SYSPLUS
        let canal = 1;
        let vend = 1;
        let cobrador = 1;
        let ptVta = 1;
        let bodega = '1';
        try {
            const ptvt = await db('PUNTO_VENTA').first();
            if (ptvt) {
                if (ptvt.CANAL_COD) canal = parseInt(String(ptvt.CANAL_COD), 10) || 1;
                if (ptvt.EMPL_COD) vend = parseInt(String(ptvt.EMPL_COD), 10) || 1;
                if (ptvt.PTVT_COBRADOR) cobrador = parseInt(String(ptvt.PTVT_COBRADOR), 10) || 1;
                if (ptvt.PTVT_NUM) ptVta = parseInt(String(ptvt.PTVT_NUM), 10) || 1;
                if (ptvt.BODE_COD) bodega = String(ptvt.BODE_COD).trim() || '1';
            }
        } catch (e) {}

        const maxDinw = await db(tables.DOC_INVENTARIO_WEB).max('DINW_ID as MAXID').first();
        const masterDinwId = (parseInt(String(maxDinw?.MAXID || '0'), 10) || 0) + 1;

        // Prefijo
        let prefijo = prefijoParam ? String(prefijoParam).trim() : '';
        if (!prefijo) {
            try {
                const prefRow = await db(tables.PREFIJOS)
                    .where('TIDO_COD', 31)
                    .andWhere(function () {
                        this.where('PREF_ACTIVO', 'S').orWhereNull('PREF_ACTIVO');
                    })
                    .first();
                if (prefRow?.PREF_PRE) prefijo = String(prefRow.PREF_PRE).trim();
            } catch (e) {}
        }
        if (!prefijo) prefijo = 'SETT';

        // Formas de pago
        let listaPagos: Array<{ formaPagoId: number; monto: number }> = [];
        if (pagosParam && Array.isArray(pagosParam) && pagosParam.length > 0) {
            listaPagos = pagosParam.map(p => ({
                formaPagoId: parseInt(String(p.formaPagoId), 10) || 1,
                monto: parseFloat(String(p.monto)) || 0
            }));
        } else if (formaPagoId) {
            listaPagos = [{
                formaPagoId: parseInt(String(formaPagoId), 10) || 1,
                monto: 0
            }];
        } else {
            listaPagos = [{ formaPagoId: 1, monto: 0 }];
        }
        const primaryFopaId = listaPagos[0]?.formaPagoId || 1;

        // Recolectar todos los ítems de las habitaciones seleccionadas
        const consolidatedItems: any[] = [];
        const individualDinwIds: number[] = [];

        for (const h of habs) {
            const hId = String(h.ID_HABITACION).trim();
            const hNum = String(h.NUMERO || hId).trim();

            const activeMov = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', hId)
                .andWhere(function () {
                    this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                })
                .orderBy('ID_MOVIM', 'desc')
                .first();

            let hDinwId = activeMov?.DINW_ID ? parseInt(String(activeMov.DINW_ID), 10) : undefined;
            if (!hDinwId) {
                hDinwId = await this.getActiveDinw(hId, hNum, nit, nombreCliente);
            }

            if (hDinwId) {
                individualDinwIds.push(hDinwId);
                const dets = await db(tables.DOC_INVENTARIO_DET_WEB)
                    .where({ DINW_ID: hDinwId, DIWD_ANULADO: 'N' })
                    .orderBy('DIWD_ITEM', 'asc');

                for (const d of dets) {
                    const descOriginal = String(d.DIWD_DESCART || d.DIWD_ARTICULO || '').trim();
                    const descConHab = descOriginal.toLowerCase().includes(`hab. ${hNum}`) || descOriginal.toLowerCase().includes(`hab ${hNum}`)
                        ? descOriginal
                        : `${descOriginal} (Hab. ${hNum})`;

                    consolidatedItems.push({
                        ...d,
                        DIWD_DESCART: descConHab,
                        _habNumero: hNum,
                        _habId: hId
                    });
                }
            }
        }

        if (consolidatedItems.length === 0) {
            throw new Error('Ninguna de las habitaciones seleccionadas tiene consumos o productos pendientes por facturar');
        }

        // Calcular totales acumulados
        let totalBase = 0;
        let totalIva = 0;
        let totalDoc = 0;

        for (const it of consolidatedItems) {
            const cant = parseFloat(String(it.DIWD_CANT || '1'));
            const prunit = parseFloat(String(it.DIWD_COSTO || it.DIWD_PRUNIT || '0'));
            const itemTotal = it.DIWD_TOTAL ? parseFloat(String(it.DIWD_TOTAL)) : (cant * prunit);
            const ivaMonto = parseFloat(String(it.DIWD_IVAMONTO || '0'));
            const subtotalBase = itemTotal - ivaMonto;

            totalBase += subtotalBase;
            totalIva += ivaMonto;
            totalDoc += itemTotal;
        }

        if (listaPagos.length === 1 && (!listaPagos[0].monto || listaPagos[0].monto === 0)) {
            listaPagos[0].monto = totalDoc;
        }

        // Insertar encabezado maestro consolidado en DOC_INVENTARIO_WEB
        const nowFecha = new Date();
        await db(tables.DOC_INVENTARIO_WEB).insert({
            DINW_ID: masterDinwId,
            DINW_TIPO: 31,
            DINW_NUMERO: '00000001',
            DINW_NIT: nit,
            DINW_PREF: prefijo,
            DINW_SUCURSAL: sucursal,
            DINW_CANAL: canal,
            DINW_VEND: vend,
            DINW_COBRADOR: cobrador,
            DINW_PTVTA: ptVta,
            DINW_FECHA: nowFecha,
            DINW_VENCE: nowFecha,
            DINW_CONCEPTO: conceptoConsolidado,
            DINW_OBS: obsGeneral,
            DINW_BASE: totalBase,
            DINW_IVAMONTO: totalIva,
            DINW_MONTO: totalDoc,
            DINW_FORMAP: primaryFopaId,
            DINW_ANULADO: 'N',
            DINW_IMPINC: 'S',
            DINW_IVAINC: 'S',
            DINW_BODEGA: bodega,
            DINW_BODDES: bodega,
            DINW_TRANSMIT: 'N'
        });

        // Insertar detalles en DOC_INVENTARIO_DET_WEB
        for (let idx = 0; idx < consolidatedItems.length; idx++) {
            const it = consolidatedItems[idx];
            const itemIdx = idx + 1;
            const cant = parseFloat(String(it.DIWD_CANT || '1'));
            const prunit = parseFloat(String(it.DIWD_COSTO || it.DIWD_PRUNIT || '0'));
            const itemTotal = it.DIWD_TOTAL ? parseFloat(String(it.DIWD_TOTAL)) : (cant * prunit);
            const ivaMonto = parseFloat(String(it.DIWD_IVAMONTO || '0'));
            const ivaPorc = parseFloat(String(it.DIWD_IVAPORC || '0'));
            const tiva = parseInt(String(it.DIWD_TIVA || '0'), 10) || 0;
            const dtoPorc = parseFloat(String(it.DIWD_DTOPORC || '0')) || 0;
            const dtoMonto = parseFloat(String(it.DIWD_DTOMONTO || '0')) || 0;

            await db(tables.DOC_INVENTARIO_DET_WEB).insert({
                DINW_ID: masterDinwId,
                DIWD_ITEM: itemIdx,
                DIWD_ARTICULO: String(it.DIWD_ARTICULO || '001').trim(),
                DIWD_DESCART: truncateToBytes(String(it.DIWD_DESCART || '').trim(), 60),
                DIWD_CODBAR: it.DIWD_CODBAR ? String(it.DIWD_CODBAR).trim() : null,
                DIWD_CANT: cant,
                DIWD_UNIDAD: String(it.DIWD_UNIDAD || 'UNIDAD').trim(),
                DIWD_COSTO: prunit,
                DIWD_PRUNIT: prunit,
                DIWD_TOTAL: itemTotal,
                DIWD_IVAPORC: ivaPorc,
                DIWD_IVAMONTO: ivaMonto,
                DIWD_TIVA: tiva,
                DIWD_DTOPORC: dtoPorc,
                DIWD_DTOMONTO: dtoMonto,
                DIWD_BODEGA: String(it.DIWD_BODEGA || bodega).trim(),
                DIWD_LISTA: parseInt(String(it.DIWD_LISTA || '1'), 10) || 1,
                DIWD_REF: it._habNumero ? `HAB-${it._habNumero}` : 'MULTI-HAB',
                DIWD_ANULADO: 'N',
                DIWD_TRANSMIT: 'N',
                DIWD_FACTOR: 1
            });
        }

        // Consecutivo Recibos de Caja
        try {
            const maxReca = await db('RECIBOS_CAJA').max('RECA_NUMERO as MAXR').first();
            const maxVal = parseInt(String(maxReca?.MAXR || '0'), 10) || 0;
            const prefReca = await db(tables.PREFIJOS).where('TIDO_COD', 61).first();
            const curVal = parseInt(String(prefReca?.PREF_ACTUAL || '0'), 10) || 0;
            if (curVal <= maxVal) {
                await db(tables.PREFIJOS).where('TIDO_COD', 61).update({
                    PREF_ACTUAL: String(maxVal + 1).padStart(6, '0')
                });
            }
        } catch (syncPrefErr) {}

        // Ejecutar procedimiento almacenado GRABE_DOCUMENTO_INV_WEB(31, masterDinwId)
        const spResult = await db.raw('SELECT * FROM GRABE_DOCUMENTO_INV_WEB(?, ?)', [31, masterDinwId]);
        const resultRow = spResult.rows ? spResult.rows[0] : (Array.isArray(spResult) ? spResult[0] : spResult);

        const idGenerado = resultRow?.IDDOC || resultRow?.iddoc;
        const numDocGenerado = String(resultRow?.NUMDOC || resultRow?.numdoc || `${prefijo}-${masterDinwId}`).trim();
        const nError = resultRow?.NERROR ?? resultRow?.nerror ?? 0;

        if (nError !== 0 && nError !== null && !idGenerado) {
            throw new Error(`Error en GRABE_DOCUMENTO_INV_WEB de Firebird (Código de error: ${nError})`);
        }

        // Registrar formas de pago y sincronizar FACTURAS
        if (idGenerado) {
            try {
                const nowFecha = new Date();
                const subtotalFactura = Math.round((totalDoc - totalIva) * 100) / 100;
                await db('FACTURAS')
                    .where('FACT_ID', idGenerado)
                    .update({
                        FACT_FECHA: nowFecha,
                        FACT_VENCE: nowFecha,
                        FACT_TOTAL: totalDoc,
                        FACT_IVAMONTO: totalIva,
                        FACT_SUBTOTAL: subtotalFactura,
                        FACT_FORMAP: primaryFopaId,
                        FACT_OBS: Buffer.from(obsGeneral, 'utf-8')
                    });

                // Sincronizar FADE_DTOPORC, FADE_DTOMONTO, FADE_TOTAL en FACTURAS_DETALLE
                try {
                    const sourceDets = await db(tables.DOC_INVENTARIO_DET_WEB)
                        .where({ DINW_ID: masterDinwId, DIWD_ANULADO: 'N' })
                        .select('DIWD_ITEM', 'DIWD_DTOPORC', 'DIWD_DTOMONTO', 'DIWD_TOTAL', 'DIWD_IVAMONTO', 'DIWD_IVAPORC', 'DIWD_TIVA', 'DIWD_DESCART');
                    for (const sd of sourceDets) {
                        const dtoporc = Number(sd.DIWD_DTOPORC || 0);
                        const dtomonto = Number(sd.DIWD_DTOMONTO || 0);
                        const totalItem = Number(sd.DIWD_TOTAL || 0);
                        const ivaMonto = Number(sd.DIWD_IVAMONTO || 0);
                        const ivaPorc = Number(sd.DIWD_IVAPORC || 0);
                        const tiva = Number(sd.DIWD_TIVA || 0);
                        const baseItem = Math.round((totalItem - ivaMonto) * 100) / 100;

                        await db('FACTURAS_DETALLE')
                            .where({ FACT_ID: idGenerado, FADE_ITEM: sd.DIWD_ITEM })
                            .update({
                                FADE_DESC: sd.DIWD_DESCART ? String(sd.DIWD_DESCART).trim() : undefined,
                                FADE_DTOPORC: dtoporc,
                                FADE_DTOMONTO: dtomonto,
                                FADE_IVAPORC: ivaPorc,
                                FADE_TIVA: tiva,
                                FADE_TOTAL: totalItem,
                                FADE_IVAMONTO: ivaMonto,
                                FADE_BASE: baseItem
                            });
                    }
                } catch (dtoErr: any) {}

                // Formas de pago múltiples
                let cajaId = 1;
                let codbco = '';
                try {
                    const ptvt = await db('PUNTO_VENTA').first();
                    if (ptvt?.CAJA_ID) cajaId = parseInt(String(ptvt.CAJA_ID), 10);
                    const cajaRow = await db('CAJAS').where('CAJA_ID', cajaId).first();
                    if (cajaRow?.CAJA_FPBCO) codbco = String(cajaRow.CAJA_FPBCO).trim();
                } catch (e) {}

                // Verificar que exista en FACTURAS antes de insertar pagos (FK)
                let factExiste3 = false;
                for (let attempt = 0; attempt < 5; attempt++) {
                    const chk = await db('FACTURAS').where('FACT_ID', idGenerado).first().catch(() => null);
                    if (chk) { factExiste3 = true; break; }
                    await new Promise(r => setTimeout(r, 600));
                }

                if (factExiste3) {
                    await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', idGenerado).del().catch(() => {});

                    for (let i = 0; i < listaPagos.length; i++) {
                        const p = listaPagos[i];
                        const isEfectivo = p.formaPagoId === 1;
                        let numBco = '';
                        if (!isEfectivo && codbco) {
                            try {
                                const maxRcpa = await db('RECIBOS_CAJA_PAGO')
                                    .where({ RCPA_BANCO: codbco, RCPA_CUENTA: '9999' })
                                    .max('RCPA_NUMERO as MAXN')
                                    .first();
                                const maxDpca = await db('DOCUMENTOS_PAGO_CAJA')
                                    .where({ FOPA_ID: p.formaPagoId })
                                    .max('DPCA_NUMERO as MAXD')
                                    .first();
                                const maxVal = Math.max(
                                    parseInt(String(maxRcpa?.MAXN || '0'), 10) || 0,
                                    parseInt(String(maxDpca?.MAXD || '0'), 10) || 0
                                );
                                numBco = String(maxVal + 1 + i).padStart(6, '0');
                            } catch (e) {
                                numBco = '000001';
                            }
                        }

                        try {
                            await db('FACTURAS_CONTADO_PAGO').insert({
                                FCNT_ID: idGenerado,
                                FCNP_ITEM: i + 1,
                                FOPA_ID: p.formaPagoId,
                                FCNP_BANCO: isEfectivo ? '' : codbco,
                                FCNP_CUENTA: isEfectivo ? '' : '9999',
                                FCNP_NUMERO: isEfectivo ? '' : numBco,
                                FCNP_FECHA: new Date(),
                                FCNP_MONTO: p.monto,
                                FCNP_ANULADO: 'N',
                                FCNP_CERRADO: 'N'
                            });
                        } catch (pagoErr: any) {
                            console.warn(`Aviso insertando pago directo ${i + 1}:`, pagoErr.message);
                        }
                    }
                } else {
                    console.warn(`Aviso: FACT_ID ${idGenerado} no encontrado en FACTURAS (directo). Omitiendo FACTURAS_CONTADO_PAGO.`);
                }
            } catch (e: any) {}
        }

        // Liberar todas las habitaciones seleccionadas y marcar sus movimientos como Facturados
        for (const hId of habitacionesIds) {
            await db(tables.HABITACION)
                .where('ID_HABITACION', hId)
                .update({
                    ESTADO: 'Disponible',
                    NOTAS: ''
                });

            try {
                const activeMov = await db(tables.HABITACION_MOVIM)
                    .where('ID_HABITACION', String(hId))
                    .andWhere(function () {
                        this.where('ESTADO', 'Activo').orWhereNull('ESTADO');
                    })
                    .orderBy('ID_MOVIM', 'desc')
                    .first();

                if (activeMov) {
                    await db(tables.HABITACION_MOVIM)
                        .where('ID_MOVIM', activeMov.ID_MOVIM)
                        .update({
                            ID_DOC: idGenerado || masterDinwId,
                            DINW_ID: masterDinwId,
                            TIPO: 31,
                            ESTADO: 'Facturado'
                        });
                }
            } catch (e: any) {}
        }

        // Anular los borradores individuales previos para evitar duplicidades
        for (const oldDinw of individualDinwIds) {
            try {
                await db(tables.DOC_INVENTARIO_WEB)
                    .where('DINW_ID', oldDinw)
                    .update({
                        DINW_ANULADO: 'S',
                        DINW_OBS: `Consolidado en Factura Master #${masterDinwId}`
                    });
            } catch (e) {}
        }

        return {
            idDoc: idGenerado || masterDinwId,
            prefijo,
            numero: numDocGenerado,
            total: totalDoc,
            mensaje: `Factura de Venta consolidada generada con éxito con número ${numDocGenerado}`,
            habitacionesProcesadas: habsNumeros
        };
    }
}
