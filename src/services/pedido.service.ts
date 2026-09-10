import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { TerceroService } from './tercero.service';
import { ArticuloService } from './articulo.service';
import { sanitizeText, truncateToBytes } from '../utils/text.utils';
import { ContabilidadService } from './contabilidad.service';
import { AbonoService } from './abono.service';

// Helper function to read BLOB/Buffer/String from Firebird
export async function parseFirebirdBlob(val: any): Promise<string> {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (Buffer.isBuffer(val)) return val.toString('utf8').trim();
    if (typeof val === 'function') {
        return new Promise((resolve) => {
            val((err: any, name: any, eStream: any) => {
                if (err || !eStream) return resolve('');
                let chunks: Buffer[] = [];
                eStream.on('data', (chunk: Buffer) => chunks.push(chunk));
                eStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').trim()));
                eStream.on('error', () => resolve(''));
            });
        });
    }
    if (typeof val === 'object' && val.toString) {
        const s = val.toString('utf8');
        return s === '[object Object]' ? '' : s.trim();
    }
    return String(val).trim();
}

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

    // Sincronizar consecutivos de Facturas (31) y Recibos (61) con el máximo real
    static async syncConsecutivos(prefijo: string = '0000') {
        try {
            const maxFact = await db('FACTURAS').where('PREF_PRE', prefijo).max('FACT_NUMERO as MAXF').first();
            const maxFactVal = parseInt(String(maxFact?.MAXF || '0'), 10) || 0;
            const prefFact = await db(tables.PREFIJOS).where({ TIDO_COD: 31, PREF_PRE: prefijo }).first();
            const curFactVal = parseInt(String(prefFact?.PREF_ACTUAL || '0'), 10) || 0;
            if (curFactVal <= maxFactVal) {
                await db(tables.PREFIJOS).where({ TIDO_COD: 31, PREF_PRE: prefijo }).update({
                    PREF_ACTUAL: String(maxFactVal + 1).padStart(6, '0')
                });
            }
        } catch (e) {
            console.warn('Aviso sincronizando prefijo facturas:', e);
        }

        try {
            const maxReca = await db('RECIBOS_CAJA').max('RECA_NUMERO as MAXR').first();
            const maxRecaVal = parseInt(String(maxReca?.MAXR || '0'), 10) || 0;
            const prefReca = await db(tables.PREFIJOS).where('TIDO_COD', 61).first();
            const curRecaVal = parseInt(String(prefReca?.PREF_ACTUAL || '0'), 10) || 0;
            if (curRecaVal <= maxRecaVal) {
                await db(tables.PREFIJOS).where('TIDO_COD', 61).update({
                    PREF_ACTUAL: String(maxRecaVal + 1).padStart(6, '0')
                });
            }
        } catch (e) {
            console.warn('Aviso sincronizando prefijo recibos:', e);
        }
    }

    // Obtener prefijos de Factura de Venta (TIDO_COD = 31)
    static async getPrefijosFactura() {
        const rows = await db(tables.PREFIJOS)
            .where('TIDO_COD', 31)
            .orderBy('PREF_ACTIVO', 'desc')
            .orderBy('PREF_PRE', 'asc');

        for (const r of rows) {
            const prefStr = String(r.PREF_PRE || '').trim();
            if (prefStr) {
                await PedidoService.syncConsecutivos(prefStr);
            }
        }

        const freshRows = await db(tables.PREFIJOS)
            .where('TIDO_COD', 31)
            .orderBy('PREF_ACTIVO', 'desc')
            .orderBy('PREF_PRE', 'asc');

        return freshRows.map((r: any) => ({
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
        } catch (e) { }

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
                    DIWD_BODEGA: '1',
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
            } catch (e) { }
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

        // Garantizar que los consecutivos de Facturas y Recibos de Caja estén sincronizados
        await PedidoService.syncConsecutivos(prefijo);

        // Preparar caja y formas de pago en DOC_INVENTARIO_PAGO_WEB antes de llamar al SP
        try {
            await db('DOC_INVENTARIO_PAGO_WEB').where('DINW_ID', dinwId).del().catch(() => { });
            if (listaPagos && listaPagos.length > 0) {
                let cajaId = 1;
                let codbco = '';
                try {
                    const ptvt = await db('PUNTO_VENTA').first();
                    if (ptvt?.CAJA_ID) cajaId = parseInt(String(ptvt.CAJA_ID), 10);
                    const cajaRow = await db('CAJAS').where('CAJA_ID', cajaId).first();
                    if (cajaRow?.CAJA_FPBCO) codbco = String(cajaRow.CAJA_FPBCO).trim();
                } catch (e) { }

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

                    await db('DOC_INVENTARIO_PAGO_WEB').insert({
                        DINW_ID: dinwId,
                        DIWP_ITEM: i + 1,
                        FOPA_ID: p.formaPagoId,
                        DIWP_MONTO: p.monto,
                        DIWP_BANCO: isEfectivo ? '' : codbco,
                        DIWP_CUENTA: isEfectivo ? '' : '9999',
                        DIWP_NUMERO: isEfectivo ? '' : numBco
                    }).catch((pagoErr) => {
                        console.warn('Aviso insertando en DOC_INVENTARIO_PAGO_WEB:', pagoErr.message);
                    });
                }
            }
        } catch (prepPagoErr: any) {
            console.warn('Aviso preparando DOC_INVENTARIO_PAGO_WEB:', prepPagoErr.message);
        }

        // Ejecutar procedimiento almacenado GRABE_DOCUMENTO_INV_WEB(31, ID)
        const spResult = await db.raw('SELECT * FROM GRABE_DOCUMENTO_INV_WEB(?, ?)', [31, dinwId]);
        const resultRow = spResult.rows ? spResult.rows[0] : (Array.isArray(spResult) ? spResult[0] : spResult);

        let idGenerado = resultRow?.IDDOC || resultRow?.iddoc || resultRow?.Iddoc || (Array.isArray(resultRow) ? resultRow[0] : null);
        if (!idGenerado) {
            const dinwCheck = await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).select('DINW_IDDOC').first().catch(() => null);
            idGenerado = dinwCheck?.DINW_IDDOC || dinwCheck?.dinw_iddoc;
        }

        const numDocGenerado = String(resultRow?.NUMDOC || resultRow?.numdoc || `${prefijo}-${dinwId}`).trim();
        const nError = resultRow?.NERROR ?? resultRow?.nerror ?? 0;

        if (nError !== 0 && nError !== null && !idGenerado) {
            throw new Error(`Error en GRABE_DOCUMENTO_INV_WEB de Firebird (Código de error: ${nError})`);
        }

        // Registrar múltiples formas de pago en FACTURAS_CONTADO_PAGO y sincronizar FACTURAS
        if (idGenerado) {
            try {
                try {
                    const curFact = await db('FACTURAS').where('FACT_ID', idGenerado).first();
                    if (curFact && (Math.abs(Number(curFact.FACT_TOTAL) - totalDoc) > 0.01 || curFact.FACT_FORMAP !== primaryFopaId)) {
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
                    }
                } catch (factHeaderErr: any) {
                    console.warn('Aviso actualizando encabezado de FACTURAS (ya grabado por SP):', factHeaderErr.message);
                }

                // Sincronizar FADE_DTOPORC, FADE_DTOMONTO, FADE_TOTAL, FADE_IVAMONTO, FADE_IVAPORC, FADE_TIVA, FADE_BASE y FADE_OBS en FACTURAS_DETALLE
                try {
                    const sourceDets = await db(tables.DOC_INVENTARIO_DET_WEB)
                        .where({ DINW_ID: dinwId, DIWD_ANULADO: 'N' })
                        .select('DIWD_ITEM', 'DIWD_OBS', 'DIWD_DTOPORC', 'DIWD_DTOMONTO', 'DIWD_TOTAL', 'DIWD_IVAMONTO', 'DIWD_IVAPORC', 'DIWD_TIVA');
                    for (const sd of sourceDets) {
                        const dtoporc = Number(sd.DIWD_DTOPORC || 0);
                        const dtomonto = Number(sd.DIWD_DTOMONTO || 0);
                        const totalItem = Number(sd.DIWD_TOTAL || 0);
                        const ivaMonto = Number(sd.DIWD_IVAMONTO || 0);
                        const ivaPorc = Number(sd.DIWD_IVAPORC || 0);
                        const tiva = Number(sd.DIWD_TIVA || 0);
                        const baseItem = Math.round((totalItem - ivaMonto) * 100) / 100;

                        const updateObj: any = {
                            FADE_DTOPORC: dtoporc,
                            FADE_DTOMONTO: dtomonto,
                            FADE_IVAPORC: ivaPorc,
                            FADE_TIVA: tiva,
                            FADE_TOTAL: totalItem,
                            FADE_IVAMONTO: ivaMonto,
                            FADE_BASE: baseItem
                        };
                        if (sd.DIWD_OBS && String(sd.DIWD_OBS).trim()) {
                            updateObj.FADE_OBS = Buffer.from(sanitizeText(String(sd.DIWD_OBS).trim()), 'utf8');
                        }

                        await db('FACTURAS_DETALLE')
                            .where({ FACT_ID: idGenerado, FADE_ITEM: sd.DIWD_ITEM })
                            .update(updateObj);
                    }
                } catch (dtoErr: any) {
                    console.warn('Aviso sincronizando FADE_DTOPORC/FADE_DTOMONTO/FADE_TOTAL/FADE_OBS:', dtoErr.message);
                }

                // 1. Obtener abonos para sincronizar
                const abonosResult = await AbonoService.getAbonos(habitacionId, clienteNit);
                const abonosList = abonosResult?.abonos || [];

                // 2. Sincronizar el Recibo de Caja y Aplicación de Anticipos si hay abonos disponibles
                if (abonosList && abonosList.length > 0) {
                    console.log(`[FACTURACION-PASO-14] Sincronizando Recibo de Caja y Aplicación de Anticipos...`);
                    await PedidoService.syncReciboCajaFactura(idGenerado, totalDoc, abonosList, listaPagos, prefijo);
                } else {
                    console.log(`[FACTURACION-PASO-14] Contabilizando Recibo de Caja generado con la factura...`);
                    await PedidoService.contabilizarReciboDeFactura(idGenerado, prefijo);
                }

                // 3. Garantizar sincronización exacta de formas de pago en FACTURAS_CONTADO_PAGO y RECIBOS_CAJA_PAGO
                await PedidoService.syncFacturaPagos(idGenerado, listaPagos);

                // 4. Contabilizar la Factura de Venta generada
                try {
                    console.log(`[FACTURACION-PASO-13] Contabilizando Factura de Venta ID ${idGenerado} (${prefijo})...`);
                    await ContabilidadService.contabilizarFactura(idGenerado, prefijo);
                } catch (contErr: any) {
                    console.warn('Aviso contabilizando factura:', contErr.message);
                }
            } catch (syncErr: any) {
                console.error('Error procesando factura generada:', syncErr.message);
            }
        }

        const mensajeExito = `Factura de Venta generada exitosamente con número ${numDocGenerado}`;

        // Dejar la habitación en estado 'Disponible' y limpiar notas/observaciones.
        await db(tables.HABITACION)
            .where('ID_HABITACION', habitacionId)
            .update({
                ESTADO: 'Disponible',
                NOTAS: ''
            });

        // Marcar el movimiento en HABITACION_MOVIM como Facturado y asignar ID_DOC y TIPO = 31.
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

        // Validar existencias de los artículos que controlan inventario (Punto 3)
        for (const it of items) {
            try {
                const artRow = await db('ARTICULO')
                    .where('ARTI_COD', it.articulo)
                    .select('ARTI_EXIST', 'ARTI_ENSAMBLE', 'ARTI_DES')
                    .first();

                if (artRow && artRow.ARTI_EXIST !== 'N' && artRow.ARTI_ENSAMBLE !== 'S') {
                    const resEx = await db.raw('SELECT * FROM EXISTENCIA_BODEGA(?, ?, ?)', [it.articulo, new Date(), '1']);
                    const exRows = resEx.rows || (Array.isArray(resEx) ? resEx : [resEx]);
                    const existen = parseFloat(String(exRows[0]?.EXISTENCIA ?? exRows[0]?.existencia ?? exRows[0]?.EXISTEN ?? 0));
                    const reserva = parseFloat(String(exRows[0]?.RESERVADO ?? exRows[0]?.reservado ?? exRows[0]?.RESERVA ?? 0));
                    const disponible = existen - reserva;

                    if (disponible < it.cantidad) {
                        const artNom = String(artRow.ARTI_DES || it.descripcion || it.articulo).trim();
                        throw new Error(`Existencias insuficientes para el producto "${artNom}" (Código: ${it.articulo}). Cantidad solicitada: ${it.cantidad}, disponible en bodega: ${disponible}`);
                    }
                }
            } catch (exErr: any) {
                if (exErr.message && exErr.message.includes('Existencias insuficientes')) {
                    throw exErr;
                }
            }
        }

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
                DIWD_BODEGA: '1',
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

        // Garantizar que los consecutivos de Facturas y Recibos de Caja estén sincronizados
        await PedidoService.syncConsecutivos(prefijo);

        // Preparar caja y formas de pago en DOC_INVENTARIO_PAGO_WEB antes de llamar al SP
        try {
            await db('DOC_INVENTARIO_PAGO_WEB').where('DINW_ID', dinwId).del().catch(() => { });
            if (listaPagos && listaPagos.length > 0) {
                let cajaId2 = 1;
                let codbco2 = '';
                try {
                    const ptvt = await db('PUNTO_VENTA').first();
                    if (ptvt?.CAJA_ID) cajaId2 = parseInt(String(ptvt.CAJA_ID), 10);
                    const cajaRow = await db('CAJAS').where('CAJA_ID', cajaId2).first();
                    if (cajaRow?.CAJA_FPBCO) codbco2 = String(cajaRow.CAJA_FPBCO).trim();
                } catch (e) { }

                for (let i = 0; i < listaPagos.length; i++) {
                    const p = listaPagos[i];
                    const isEfectivo = p.formaPagoId === 1;
                    let numBco = '';

                    if (!isEfectivo && codbco2) {
                        try {
                            const maxRcpa = await db('RECIBOS_CAJA_PAGO')
                                .where({ RCPA_BANCO: codbco2, RCPA_CUENTA: '9999' })
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

                    await db('DOC_INVENTARIO_PAGO_WEB').insert({
                        DINW_ID: dinwId,
                        DIWP_ITEM: i + 1,
                        FOPA_ID: p.formaPagoId,
                        DIWP_MONTO: p.monto,
                        DIWP_BANCO: isEfectivo ? '' : codbco2,
                        DIWP_CUENTA: isEfectivo ? '' : '9999',
                        DIWP_NUMERO: isEfectivo ? '' : numBco
                    }).catch((pagoErr) => {
                        console.warn('Aviso insertando en DOC_INVENTARIO_PAGO_WEB (directo):', pagoErr.message);
                    });
                }
            }
        } catch (prepPagoErr: any) {
            console.warn('Aviso preparando DOC_INVENTARIO_PAGO_WEB (directo):', prepPagoErr.message);
        }

        // 3. Ejecutar procedimiento almacenado GRABE_DOCUMENTO_INV_WEB(31, ID)
        let spResult: any;
        try {
            spResult = await db.raw('SELECT * FROM GRABE_DOCUMENTO_INV_WEB(?, ?)', [31, dinwId]);
        } catch (fbErr: any) {
            console.error('Error ejecutando GRABE_DOCUMENTO_INV_WEB en facturarDirecto:', fbErr.message);
            await db(tables.DOC_INVENTARIO_DET_WEB).where('DINW_ID', dinwId).del().catch(() => { });
            await db('DOC_INVENTARIO_PAGO_WEB').where('DINW_ID', dinwId).del().catch(() => { });
            await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).del().catch(() => { });
            throw new Error(`Error en base de datos al facturar: ${fbErr.message}`);
        }

        const resultRow = spResult.rows ? spResult.rows[0] : (Array.isArray(spResult) ? spResult[0] : spResult);

        let idGenerado = resultRow?.IDDOC || resultRow?.iddoc || resultRow?.Iddoc || (Array.isArray(resultRow) ? resultRow[0] : null);
        if (!idGenerado) {
            const dinwCheck = await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', dinwId).select('DINW_IDDOC').first().catch(() => null);
            idGenerado = dinwCheck?.DINW_IDDOC || dinwCheck?.dinw_iddoc;
        }

        const numDocGenerado = String(resultRow?.NUMDOC || resultRow?.numdoc || `${prefijo}-${dinwId}`).trim();
        const nError = resultRow?.NERROR ?? resultRow?.nerror ?? 0;

        if (nError !== 0 && nError !== null && !idGenerado) {
            throw new Error(`Error en GRABE_DOCUMENTO_INV_WEB de Firebird (Código de error: ${nError})`);
        }

        if (!idGenerado) {
            throw new Error(`No fue posible generar la factura de venta en Firebird.`);
        }

        // 4. Sincronizar FACTURAS, FACTURAS_DETALLE y FACTURAS_CONTADO_PAGO
        if (idGenerado) {
            try {
                try {
                    const curFact = await db('FACTURAS').where('FACT_ID', idGenerado).first();
                    if (curFact && (Math.abs(Number(curFact.FACT_TOTAL) - totalDoc) > 0.01 || curFact.FACT_FORMAP !== primaryFopaId)) {
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
                    }
                } catch (factHeaderErr: any) {
                    console.warn('Aviso actualizando encabezado de FACTURAS (directo):', factHeaderErr.message);
                }

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

                // 1. Contabilizar la Factura de Venta POS generada
                console.log(`[FACTURA-POS-PASO-7] Contabilizando Factura de Venta POS ID ${idGenerado} (${prefijo})...`);
                await ContabilidadService.contabilizarFactura(idGenerado, prefijo);

                // 2. Garantizar sincronización exacta de formas de pago en FACTURAS_CONTADO_PAGO
                await PedidoService.syncFacturaPagos(idGenerado, listaPagos);

                // 3. Sincronizar y Contabilizar el Recibo de Caja de la Factura POS
                console.log(`[FACTURA-POS-PASO-8] Contabilizando Recibo de Caja de la Factura POS...`);
                await PedidoService.contabilizarReciboDeFactura(idGenerado, prefijo);
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
    static async getReportePedidos(fechaDesde?: string, fechaHasta?: string, subHuesped?: string): Promise<{ pedidos: any[]; totales: { totalArticulos: number; totalVentas: number; totalesPorFormaPago?: { [key: string]: number } } }> {
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

        let pedidos: any[] = [];

        for (const r of rows) {
            const obsStr = String(r.FACT_OBS || r.DINW_OBS || r.DINW_CONCEPTO || '');
            const huespedStr = r.FACT_NOMCLIENTE ? String(r.FACT_NOMCLIENTE).trim() : (r.TERCERO_NOMBRE ? String(r.TERCERO_NOMBRE).trim() : 'Huésped General');
            const nitStr = r.TERC_NIT ? String(r.TERC_NIT).trim() : '';

            // Consultar detalles de la factura
            let totalCant = 0;
            const habsSet = new Set<string>();
            const subHuespedMap = new Map<string, string>(); // habNum -> subHuesped
            let fallbackSubHuesped = '';

            try {
                const fadeDets = await db('FACTURAS_DETALLE')
                    .where({ FACT_ID: r.FACT_ID, FADE_ANULADO: 'N' })
                    .select('FADE_ITEM', 'ARTI_COD', 'FADE_DESC', 'FADE_REFERENCIA', 'FADE_OBS', 'FADE_CANT')
                    .orderBy('FADE_ITEM', 'asc');

                for (const fd of fadeDets) {
                    const cant = parseFloat(String(fd.FADE_CANT || '1')) || 1;
                    totalCant += cant;

                    const refStr = String(fd.FADE_REFERENCIA || '').trim();
                    const descStr = String(fd.FADE_DESC || '').trim();
                    const artCode = String(fd.ARTI_COD || '').trim();

                    // Detectar habitación
                    const matchItemHab = refStr.match(/HAB-(\w+)/i) ||
                        descStr.match(/Hab(?:itaci[oó]n|\.)?\s*(\w+)/i) ||
                        artCode.match(/^H-(\w+)/i);
                    const itemHab = matchItemHab ? matchItemHab[1] : '';
                    if (itemHab) {
                        habsSet.add(itemHab);
                    }

                    // Detectar sub-huésped en FADE_OBS
                    if (fd.FADE_OBS) {
                        const blobTxt = await parseFirebirdBlob(fd.FADE_OBS);
                        if (blobTxt && blobTxt.trim()) {
                            const cleanTxt = blobTxt.trim();
                            if (itemHab) {
                                subHuespedMap.set(itemHab, cleanTxt);
                            } else if (!fallbackSubHuesped) {
                                fallbackSubHuesped = cleanTxt;
                            }
                        }
                    }
                }
            } catch (e) { }

            if (totalCant === 0) totalCant = 1;

            // Extraer habitaciones también de observaciones de encabezado
            const matchConsolHabs = obsStr.match(/Habitaciones:\s*([0-9,\s]+)/i);
            if (matchConsolHabs) {
                const parts = matchConsolHabs[1].split(',').map(s => s.trim()).filter(Boolean);
                for (const p of parts) habsSet.add(p);
            }
            const matchSingleHab = obsStr.match(/Habitaci[oó]n\s+(\w+)/i);
            if (matchSingleHab) {
                habsSet.add(matchSingleHab[1]);
            }

            const habsList = Array.from(habsSet);

            // Determinar habitacionStr
            let habitacionStr = '-';
            if (habsList.length === 1) {
                habitacionStr = `Habitación ${habsList[0]}`;
            } else if (habsList.length > 1) {
                habitacionStr = `Habitaciones ${habsList.join(', ')}`;
            }

            // Para facturas consolidadas o sin subHuesped en FADE_OBS, buscar sub-huéspedes faltantes
            for (const hNum of habsList) {
                if (!subHuespedMap.has(hNum)) {
                    // Buscar en DOC_INVENTARIO_DET_WEB previo
                    try {
                        const sourceDet = await db('DOC_INVENTARIO_DET_WEB as D')
                            .where(function () {
                                this.where('D.DIWD_REF', `HAB-${hNum}`)
                                    .orWhere('D.DIWD_DESCART', 'like', `%Hab. ${hNum}%`)
                                    .orWhere('D.DIWD_DESCART', 'like', `%Habitación ${hNum}%`);
                            })
                            .whereNotNull('D.DIWD_OBS')
                            .where('D.DIWD_OBS', '!=', '')
                            .orderBy('D.DINW_ID', 'desc')
                            .select('D.DIWD_OBS')
                            .first();

                        if (sourceDet?.DIWD_OBS) {
                            const parsedObs = await parseFirebirdBlob(sourceDet.DIWD_OBS);
                            if (parsedObs && parsedObs.trim()) {
                                subHuespedMap.set(hNum, parsedObs.trim());
                            }
                        }
                    } catch (e) { }

                    // Si aún no está, buscar en HABITACION.NOTAS
                    if (!subHuespedMap.has(hNum)) {
                        try {
                            const habRow = await db('HABITACION').where('NUMERO', hNum).first();
                            if (habRow?.NOTAS && String(habRow.NOTAS).trim()) {
                                subHuespedMap.set(hNum, String(habRow.NOTAS).trim());
                            }
                        } catch (e) { }
                    }
                }
            }

            // Si es factura individual y no tiene sub-huésped en mapa, verificar fallback
            const cleanObsStr = obsStr.replace(/^(?:Hospedaje Habitaci[oó]n \w+ - |Factura Consolidada Habitaciones: [0-9,\s]+|Venta Directa - )/i, '').trim();

            let subHuespedStr = '';
            if (habsList.length > 1) {
                // Documento consolidado
                const itemsList: string[] = [];
                for (const hNum of habsList) {
                    const subName = subHuespedMap.get(hNum);
                    if (subName && !subName.toLowerCase().startsWith('factura consolidada')) {
                        itemsList.push(`${hNum}: ${subName}`);
                    }
                }
                if (itemsList.length > 0) {
                    subHuespedStr = itemsList.join(', ');
                }
            } else if (habsList.length === 1) {
                // Factura de 1 habitación
                const hNum = habsList[0];
                subHuespedStr = subHuespedMap.get(hNum) || fallbackSubHuesped || '';
                if (!subHuespedStr && cleanObsStr && !cleanObsStr.toLowerCase().startsWith('factura consolidada') && !cleanObsStr.toLowerCase().startsWith('venta directa') && cleanObsStr.toLowerCase() !== huespedStr.toLowerCase()) {
                    subHuespedStr = cleanObsStr;
                }
            } else {
                // Sin habitación (ej. venta directa)
                subHuespedStr = fallbackSubHuesped || '';
            }

            // Evitar que subHuespedStr contenga títulos genéricos de factura
            if (
                subHuespedStr.toLowerCase().startsWith('factura consolidada') ||
                subHuespedStr.toLowerCase().startsWith('venta directa') ||
                subHuespedStr.toLowerCase().startsWith('hospedaje habitaci')
            ) {
                subHuespedStr = '';
            }

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
                habitacionNumero: habsList[0] || '1',
                huesped: huespedStr,
                subHuesped: subHuespedStr,
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

        if (subHuesped && subHuesped.trim()) {
            const term = subHuesped.trim().toLowerCase();
            pedidos = pedidos.filter((p) =>
                (p.subHuesped && p.subHuesped.toLowerCase().includes(term)) ||
                (p.huesped && p.huesped.toLowerCase().includes(term)) ||
                (p.documento && p.documento.toLowerCase().includes(term)) ||
                (p.habitacion && p.habitacion.toLowerCase().includes(term))
            );
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

        // Fallback a tablas de encabezado si el SP no trajo campos completos o vino vacío
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
                if (!fallbackHeader) {
                    fallbackHeader = await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', idDoc).first();
                }
            } catch (e: any) {
                console.error('Error cargando fallback FACTURAS:', e.message);
            }
        }

        if ((!rawRows || rawRows.length === 0 || !rawRows[0]) && !fallbackHeader) {
            throw new Error(`No se encontraron datos para imprimir el documento #${idDoc}`);
        }

        const first = (rawRows && rawRows.length > 0 && rawRows[0]) ? rawRows[0] : {};

        const pref = String(first.PREF || fallbackHeader?.PREF_PRE || fallbackHeader?.DINW_PREF || (isFactura ? 'FAC' : 'REM')).trim();
        const num = String(first.NUMERO || fallbackHeader?.REVT_NUMERO || fallbackHeader?.FACT_NUMERO || fallbackHeader?.DINW_NUMERO || idDoc).trim();
        const numeroDoc = `${pref}-${num}`;

        // Fechas y horas
        const rawFecha = first.FECHA || fallbackHeader?.REVT_FECHA || fallbackHeader?.FACT_FECHA || fallbackHeader?.DINW_FECHA;
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

        const rawObs = first.OBS || fallbackHeader?.REVT_OBS || fallbackHeader?.FACT_OBS || fallbackHeader?.DINW_OBS || fallbackHeader?.REVT_CONC;
        const obsBuffer = rawObs ? (Buffer.isBuffer(rawObs) ? rawObs.toString('utf8') : String(rawObs)) : '';
        const matchConsol = obsBuffer.match(/Habitaciones:\s*([0-9,\s]+)/i);
        const matchHab = obsBuffer.match(/Habitaci[oó]n\s+(\w+)/i) || (first.REFITEM ? String(first.REFITEM).match(/HAB-(\w+)/i) : null);
        const habitacionNumero = matchConsol ? matchConsol[1].trim() : (matchHab ? matchHab[1] : '');

        const formaPagoStr = String(first.FORMAP || first.FORMAPAGO1 || 'EFECTIVO').trim();
        const huespedNombre = first.NOMCLIENTE || first.NOMTERCERO || fallbackHeader?.REVT_NOMTER || fallbackHeader?.FACT_NOMCLIENTE || 'Huésped General';
        const docNit = first.NIT || fallbackHeader?.TERC_NIT || fallbackHeader?.DINW_NIT || '';

        // Mapear los ítems
        let items: any[] = [];
        if (isFactura) {
            try {
                const facDets = await db('FACTURAS_DETALLE')
                    .where({ FACT_ID: idDoc, FADE_ANULADO: 'N' })
                    .orderBy('FADE_ITEM', 'asc');
                if (facDets && facDets.length > 0) {
                    for (const d of facDets) {
                        let obsItem = '';
                        if (d.FADE_OBS) {
                            obsItem = await parseFirebirdBlob(d.FADE_OBS);
                        }

                        const refStr = String(d.FADE_REFERENCIA || '').trim();
                        const descRaw = String(d.FADE_DESC || d.ARTI_COD || 'Producto / Hospedaje').trim();
                        const artCode = String(d.ARTI_COD || '').trim();

                        const isLodging = /^H-[A-Z0-9]+/i.test(artCode) ||
                            /^SERVICIO HOSPEDAJE/i.test(descRaw) ||
                            /^HOSPEDAJE/i.test(descRaw);

                        if (isLodging && !obsItem) {
                            const matchItemHab = refStr.match(/HAB-(\w+)/i) || descRaw.match(/Hab(?:itaci[oó]n|\.)?\s*(\w+)/i);
                            const habItemNum = matchItemHab ? matchItemHab[1] : habitacionNumero;

                            if (habItemNum) {
                                try {
                                    const sourceDet = await db('DOC_INVENTARIO_DET_WEB as D')
                                        .join('DOC_INVENTARIO_WEB as W', 'D.DINW_ID', 'W.DINW_ID')
                                        .where(function () {
                                            this.where('D.DIWD_REF', `HAB-${habItemNum}`)
                                                .orWhere('D.DIWD_DESCART', 'like', `%Hab. ${habItemNum}%`)
                                                .orWhere('D.DIWD_DESCART', 'like', `%Habitación ${habItemNum}%`);
                                        })
                                        .whereNotNull('D.DIWD_OBS')
                                        .where('D.DIWD_OBS', '!=', '')
                                        .orderBy('D.DINW_ID', 'desc')
                                        .select('D.DIWD_OBS')
                                        .first();

                                    if (sourceDet?.DIWD_OBS) {
                                        obsItem = await parseFirebirdBlob(sourceDet.DIWD_OBS);
                                    }
                                } catch (e) { }

                                if (!obsItem) {
                                    try {
                                        const habRow = await db('HABITACION').where('NUMERO', habItemNum).first();
                                        if (habRow?.NOTAS && String(habRow.NOTAS).trim()) {
                                            obsItem = String(habRow.NOTAS).trim();
                                        }
                                    } catch (e) { }
                                }
                            }

                            if (!obsItem && obsBuffer) {
                                const isConsolidatedObs = /consolidada/i.test(obsBuffer);
                                const isGenericObs = /^Hospedaje Habitaci[oó]n/i.test(obsBuffer);
                                if (!isConsolidatedObs && !isGenericObs) {
                                    obsItem = obsBuffer;
                                }
                            }
                        }

                        let formattedDesc = descRaw;
                        if (obsItem && isLodging && !descRaw.toLowerCase().includes(obsItem.toLowerCase())) {
                            formattedDesc = `${descRaw} (Sub-Huésped: ${obsItem})`;
                        }

                        items.push({
                            item: parseInt(String(d.FADE_ITEM || '1'), 10),
                            articulo: artCode,
                            descripcion: formattedDesc,
                            obsItem: obsItem,
                            referencia: refStr,
                            cantidad: parseFloat(String(d.FADE_CANT || '1')),
                            precioUnitario: parseFloat(String(d.FADE_PRUNIT || '0')),
                            ivaPorc: parseFloat(String(d.FADE_IVAPORC || '0')),
                            ivaMonto: parseFloat(String(d.FADE_IVAMONTO || '0')),
                            total: parseFloat(String(d.FADE_TOTAL || '0'))
                        });
                    }
                }
            } catch (facDetErr: any) {
                console.warn('Aviso consultando FACTURAS_DETALLE para impresion:', facDetErr.message);
            }

            if (items.length === 0) {
                try {
                    const dinwDets = await db(tables.DOC_INVENTARIO_DET_WEB)
                        .where({ DINW_ID: idDoc, DIWD_ANULADO: 'N' })
                        .orderBy('DIWD_ITEM', 'asc');
                    if (dinwDets && dinwDets.length > 0) {
                        for (const d of dinwDets) {
                            let obsItem = '';
                            if (d.DIWD_OBS) {
                                obsItem = await parseFirebirdBlob(d.DIWD_OBS);
                            }
                            const refStr = String(d.DIWD_REF || '').trim();
                            const descRaw = String(d.DIWD_DESCART || d.DIWD_ARTICULO || 'Producto / Hospedaje').trim();
                            const artCode = String(d.DIWD_ARTICULO || '').trim();
                            const isLodging = /^H-[A-Z0-9]+/i.test(artCode) ||
                                /^SERVICIO HOSPEDAJE/i.test(descRaw) ||
                                /^HOSPEDAJE/i.test(descRaw);

                            if (isLodging && !obsItem && obsBuffer) {
                                const isConsolidatedObs = /consolidada/i.test(obsBuffer);
                                const isGenericObs = /^Hospedaje Habitaci[oó]n/i.test(obsBuffer);
                                if (!isConsolidatedObs && !isGenericObs) {
                                    obsItem = obsBuffer;
                                }
                            }

                            let formattedDesc = descRaw;
                            if (obsItem && isLodging && !descRaw.toLowerCase().includes(obsItem.toLowerCase())) {
                                formattedDesc = `${descRaw} (Sub-Huésped: ${obsItem})`;
                            }

                            items.push({
                                item: parseInt(String(d.DIWD_ITEM || '1'), 10),
                                articulo: artCode,
                                descripcion: formattedDesc,
                                obsItem: obsItem,
                                referencia: refStr,
                                cantidad: parseFloat(String(d.DIWD_CANT || '1')),
                                precioUnitario: parseFloat(String(d.DIWD_COSTO || d.DIWD_PRUNIT || '0')),
                                ivaPorc: parseFloat(String(d.DIWD_IVAPORC || '0')),
                                ivaMonto: parseFloat(String(d.DIWD_IVAMONTO || '0')),
                                total: parseFloat(String(d.DIWD_TOTAL || '0'))
                            });
                        }
                    }
                } catch (dinwDetErr: any) {
                    console.warn('Aviso consultando DOC_INVENTARIO_DET_WEB para impresion:', dinwDetErr.message);
                }
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

        // 1. Obtener formas de pago de la factura / recibo de caja
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
                        nombre: String(p.nombre || p.NOMBRE || p.FOPA_NOM || 'EFECTIVO').trim(),
                        monto: parseFloat(String(p.monto ?? p.MONTO ?? p.FCNP_MONTO ?? '0'))
                    }));
                }
            } catch (e: any) {
                console.warn('Aviso cargando formas de pago de FACTURAS_CONTADO_PAGO:', e.message);
            }

            // Fallback: si no hay registros en FACTURAS_CONTADO_PAGO, consultar RECIBOS_CAJA_PAGO
            if (pagosList.length === 0) {
                try {
                    const rcRow = await db('RECIBOS_CAJA_DETALLE')
                        .where({ RCDE_TIPODOC: 31, RCDE_IDDOC: idDoc, RCDE_ANULADO: 'N' })
                        .select('RECA_ID')
                        .first();
                    if (rcRow?.RECA_ID) {
                        const rcPagos = await db('RECIBOS_CAJA_PAGO as P')
                            .join('FORMAS_PAGO as F', 'P.FOPA_ID', 'F.FOPA_ID')
                            .where('P.RECA_ID', rcRow.RECA_ID)
                            .andWhere(function () {
                                this.where('P.RCPA_ANULADO', '!=', 'S').orWhereNull('P.RCPA_ANULADO');
                            })
                            .orderBy('P.RCPA_ITEM', 'asc')
                            .select('F.FOPA_NOM as nombre', 'P.RCPA_MONTO as monto');
                        if (rcPagos && rcPagos.length > 0) {
                            pagosList = rcPagos.map((p: any) => ({
                                nombre: String(p.nombre || p.NOMBRE || 'EFECTIVO').trim(),
                                monto: parseFloat(String(p.monto || 0))
                            }));
                        }
                    }
                } catch (rcErr: any) {
                    console.warn('Aviso consultando RECIBOS_CAJA_PAGO para impresion:', rcErr.message);
                }
            }
        }

        // 2. Obtener abonos / anticipos aplicados a esta factura
        let abonosList: Array<{ descripcion: string; monto: number }> = [];
        try {
            // A. A través de APLICACION_CLIENTE_DETALLE (Tipo 31 y Tipo 45 en el mismo APCL_ID)
            const apclRows = await db(tables.APLICACION_CLIENTE_DETALLE)
                .where({ ACDE_TIPODOC: 31, ACDE_IDDOC: idDoc })
                .andWhere(function () {
                    this.where('ACDE_ANULADO', '!=', 'S').orWhereNull('ACDE_ANULADO');
                })
                .select('APCL_ID');

            if (apclRows && apclRows.length > 0) {
                const apclIds = Array.from(new Set(apclRows.map((r: any) => r.APCL_ID)));
                const abonoDets = await db(`${tables.APLICACION_CLIENTE_DETALLE} as AD`)
                    .leftJoin(`${tables.ANTICIPOS_CLIENTE} as AC`, 'AD.ACDE_IDDOC', 'AC.ANCL_ID')
                    .whereIn('AD.APCL_ID', apclIds)
                    .andWhere('AD.ACDE_TIPODOC', 45)
                    .andWhere(function () {
                        this.where('AD.ACDE_ANULADO', '!=', 'S').orWhereNull('AD.ACDE_ANULADO');
                    })
                    .select('AD.ACDE_PREFIJO', 'AD.ACDE_NUMERO', 'AD.ACDE_APLICADO', 'AC.ANCL_CONC');

                for (const ad of abonoDets) {
                    const montoAbono = Math.abs(parseFloat(String(ad.ACDE_APLICADO || 0)));
                    if (montoAbono > 0) {
                        const prefA = String(ad.ACDE_PREFIJO || '0000').trim();
                        const numA = String(ad.ACDE_NUMERO || '').trim();
                        const concA = ad.ANCL_CONC ? String(ad.ANCL_CONC).trim() : '';
                        abonosList.push({
                            descripcion: concA ? `Abono (${prefA}-${numA}: ${concA})` : `Abono / Anticipo (${prefA}-${numA})`,
                            monto: montoAbono
                        });
                    }
                }
            }

            // B. Si no encontró en APLICACION_CLIENTE_DETALLE, buscar en HABITACION_MOVIM vinculados a esta factura
            if (abonosList.length === 0) {
                const movs = await db(tables.HABITACION_MOVIM)
                    .where({ ID_DOC: idDoc, TIPO: 31 })
                    .select('ID_MOVIM');

                for (const m of movs) {
                    const movAnts = await db(tables.HABITACION_MOVIM_ANTICIPOS)
                        .join(tables.ANTICIPOS_CLIENTE, `${tables.HABITACION_MOVIM_ANTICIPOS}.ANCL_ID`, `${tables.ANTICIPOS_CLIENTE}.ANCL_ID`)
                        .where(`${tables.HABITACION_MOVIM_ANTICIPOS}.ID_MOVIM`, m.ID_MOVIM)
                        .andWhere(function () {
                            this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`, '!=', 'S')
                                .orWhereNull(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`);
                        })
                        .select(
                            `${tables.ANTICIPOS_CLIENTE}.PREF_PRE as ANCL_PREF`,
                            `${tables.ANTICIPOS_CLIENTE}.ANCL_NUMERO`,
                            `${tables.ANTICIPOS_CLIENTE}.ANCL_BASE`,
                            `${tables.ANTICIPOS_CLIENTE}.ANCL_CONC`
                        );

                    for (const ma of movAnts) {
                        const mAbono = parseFloat(String(ma.ANCL_BASE || 0));
                        if (mAbono > 0) {
                            const pA = String(ma.ANCL_PREF || '0000').trim();
                            const nA = String(ma.ANCL_NUMERO || '').trim();
                            const cA = ma.ANCL_CONC ? String(ma.ANCL_CONC).trim() : '';
                            abonosList.push({
                                descripcion: cA ? `Abono (${pA}-${nA}: ${cA})` : `Abono / Anticipo (${pA}-${nA})`,
                                monto: mAbono
                            });
                        }
                    }
                }
            }
        } catch (abErr: any) {
            console.warn('Aviso cargando abonos para impresion:', abErr.message);
        }

        const totalAbonos = abonosList.reduce((acc, a) => acc + (a.monto || 0), 0);

        if (pagosList.length === 1 && abonosList.length === 0 && pagosList[0].monto < totalPagar) {
            pagosList[0].monto = totalPagar;
        } else if (pagosList.length === 0 && abonosList.length === 0) {
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
            abonos: abonosList,
            totalAbonos,
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
        observacionesParam?: string,
        clienteNitParam?: string,
        clienteNomParam?: string
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
        let nit = clienteNitParam || '800003122';
        let nombreCliente = clienteNomParam || 'Huésped General';

        if (!clienteNitParam) {
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
            } catch (e) { }
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
        } catch (e) { }

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
            } catch (e) { }
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

                    const itemObs = String(d.DIWD_OBS || h.NOTAS || h.HUESPED || '').trim();

                    consolidatedItems.push({
                        ...d,
                        DIWD_DESCART: descConHab,
                        DIWD_OBS: itemObs,
                        _habNumero: hNum,
                        _habId: hId,
                        _subHuesped: itemObs
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
                DIWD_OBS: truncateToBytes(String(it.DIWD_OBS || it._subHuesped || '').trim(), 100),
                DIWD_ANULADO: 'N',
                DIWD_TRANSMIT: 'N'
            });
        }

        // Garantizar que los consecutivos de Facturas y Recibos de Caja estén sincronizados
        await PedidoService.syncConsecutivos(prefijo);

        // Preparar caja y formas de pago en DOC_INVENTARIO_PAGO_WEB antes de llamar al SP
        try {
            await db('DOC_INVENTARIO_PAGO_WEB').where('DINW_ID', masterDinwId).del().catch(() => { });
            if (listaPagos && listaPagos.length > 0) {
                let cajaId3 = 1;
                let codbco3 = '';
                try {
                    const ptvt = await db('PUNTO_VENTA').first();
                    if (ptvt?.CAJA_ID) cajaId3 = parseInt(String(ptvt.CAJA_ID), 10);
                    const cajaRow = await db('CAJAS').where('CAJA_ID', cajaId3).first();
                    if (cajaRow?.CAJA_FPBCO) codbco3 = String(cajaRow.CAJA_FPBCO).trim();
                } catch (e) { }

                for (let i = 0; i < listaPagos.length; i++) {
                    const p = listaPagos[i];
                    const isEfectivo = p.formaPagoId === 1;
                    let numBco = '';

                    if (!isEfectivo && codbco3) {
                        try {
                            const maxRcpa = await db('RECIBOS_CAJA_PAGO')
                                .where({ RCPA_BANCO: codbco3, RCPA_CUENTA: '9999' })
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

                    await db('DOC_INVENTARIO_PAGO_WEB').insert({
                        DINW_ID: masterDinwId,
                        DIWP_ITEM: i + 1,
                        FOPA_ID: p.formaPagoId,
                        DIWP_MONTO: p.monto,
                        DIWP_BANCO: isEfectivo ? '' : codbco3,
                        DIWP_CUENTA: isEfectivo ? '' : '9999',
                        DIWP_NUMERO: isEfectivo ? '' : numBco
                    }).catch((pagoErr) => {
                        console.warn('Aviso insertando en DOC_INVENTARIO_PAGO_WEB (multiples):', pagoErr.message);
                    });
                }
            }
        } catch (prepPagoErr: any) {
            console.warn('Aviso preparando DOC_INVENTARIO_PAGO_WEB (multiples):', prepPagoErr.message);
        }

        // Ejecutar procedimiento almacenado GRABE_DOCUMENTO_INV_WEB(31, masterDinwId)
        const spResult = await db.raw('SELECT * FROM GRABE_DOCUMENTO_INV_WEB(?, ?)', [31, masterDinwId]);
        const resultRow = spResult.rows ? spResult.rows[0] : (Array.isArray(spResult) ? spResult[0] : spResult);

        let idGenerado = resultRow?.IDDOC || resultRow?.iddoc || resultRow?.Iddoc || (Array.isArray(resultRow) ? resultRow[0] : null);
        if (!idGenerado) {
            const dinwCheck = await db(tables.DOC_INVENTARIO_WEB).where('DINW_ID', masterDinwId).select('DINW_IDDOC').first().catch(() => null);
            idGenerado = dinwCheck?.DINW_IDDOC || dinwCheck?.dinw_iddoc;
        }

        const numDocGenerado = String(resultRow?.NUMDOC || resultRow?.numdoc || `${prefijo}-${masterDinwId}`).trim();
        const nError = resultRow?.NERROR ?? resultRow?.nerror ?? 0;

        if (nError !== 0 && nError !== null && !idGenerado) {
            throw new Error(`Error en GRABE_DOCUMENTO_INV_WEB de Firebird (Código de error: ${nError})`);
        }

        // Registrar formas de pago y sincronizar FACTURAS
        if (idGenerado) {
            try {
                try {
                    const curFact = await db('FACTURAS').where('FACT_ID', idGenerado).first();
                    if (curFact && (Math.abs(Number(curFact.FACT_TOTAL) - totalDoc) > 0.01 || curFact.FACT_FORMAP !== primaryFopaId)) {
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
                    }
                } catch (factHeaderErr: any) {
                    console.warn('Aviso actualizando encabezado de FACTURAS (multiples):', factHeaderErr.message);
                }

                // Sincronizar FADE_DTOPORC, FADE_DTOMONTO, FADE_TOTAL, FADE_OBS en FACTURAS_DETALLE
                try {
                    const sourceDets = await db(tables.DOC_INVENTARIO_DET_WEB)
                        .where({ DINW_ID: masterDinwId, DIWD_ANULADO: 'N' })
                        .select('DIWD_ITEM', 'DIWD_OBS', 'DIWD_DTOPORC', 'DIWD_DTOMONTO', 'DIWD_TOTAL', 'DIWD_IVAMONTO', 'DIWD_IVAPORC', 'DIWD_TIVA', 'DIWD_DESCART');
                    for (const sd of sourceDets) {
                        const dtoporc = Number(sd.DIWD_DTOPORC || 0);
                        const dtomonto = Number(sd.DIWD_DTOMONTO || 0);
                        const totalItem = Number(sd.DIWD_TOTAL || 0);
                        const ivaMonto = Number(sd.DIWD_IVAMONTO || 0);
                        const ivaPorc = Number(sd.DIWD_IVAPORC || 0);
                        const tiva = Number(sd.DIWD_TIVA || 0);
                        const baseItem = Math.round((totalItem - ivaMonto) * 100) / 100;

                        const updateObj: any = {
                            FADE_DESC: sd.DIWD_DESCART ? String(sd.DIWD_DESCART).trim() : undefined,
                            FADE_DTOPORC: dtoporc,
                            FADE_DTOMONTO: dtomonto,
                            FADE_IVAPORC: ivaPorc,
                            FADE_TIVA: tiva,
                            FADE_TOTAL: totalItem,
                            FADE_IVAMONTO: ivaMonto,
                            FADE_BASE: baseItem
                        };
                        if (sd.DIWD_OBS && String(sd.DIWD_OBS).trim()) {
                            updateObj.FADE_OBS = Buffer.from(sanitizeText(String(sd.DIWD_OBS).trim()), 'utf8');
                        }

                        await db('FACTURAS_DETALLE')
                            .where({ FACT_ID: idGenerado, FADE_ITEM: sd.DIWD_ITEM })
                            .update(updateObj);
                    }
                } catch (dtoErr: any) { }

                // 1. Obtener abonos para sincronizar de todas las habitaciones consolidadas
                let abonosList: any[] = [];
                for (const hab of habitacionesIds) {
                    const abResult = await AbonoService.getAbonos(String(hab), nit);
                    if (abResult?.abonos?.length > 0) {
                        abonosList = abonosList.concat(abResult.abonos);
                    }
                }
                const seenAnclIds = new Set<number>();
                abonosList = abonosList.filter(a => {
                    if (!a.anclId || seenAnclIds.has(a.anclId)) return false;
                    seenAnclIds.add(a.anclId);
                    return true;
                });

                // 2. Sincronizar el Recibo de Caja y Aplicación de Anticipos si hay abonos disponibles
                if (abonosList && abonosList.length > 0) {
                    console.log(`[FACTURACION-MULTI] Sincronizando Recibo de Caja y Aplicación de Anticipos (${abonosList.length} abonos)...`);
                    await PedidoService.syncReciboCajaFactura(idGenerado, totalDoc, abonosList, listaPagos, prefijo);
                } else {
                    console.log(`[FACTURACION-MULTI] Contabilizando Recibo de Caja generado...`);
                    await PedidoService.contabilizarReciboDeFactura(idGenerado, prefijo);
                }

                // 3. Garantizar sincronización exacta de formas de pago en FACTURAS_CONTADO_PAGO y RECIBOS_CAJA_PAGO
                await PedidoService.syncFacturaPagos(idGenerado, listaPagos);

                // 4. Contabilizar la Factura de Venta consolidada
                try {
                    console.log(`[FACTURACION-MULTI] Contabilizando Factura de Venta ID ${idGenerado} (${prefijo})...`);
                    await ContabilidadService.contabilizarFactura(idGenerado, prefijo);
                } catch (contErr: any) {
                    console.warn('Aviso contabilizando factura multi:', contErr.message);
                }
            } catch (syncErr: any) {
                console.error('Error procesando factura múltiple:', syncErr.message);
            }
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
            } catch (e: any) { }
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
            } catch (e) { }
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

    static async contabilizarReciboDeFactura(factId: number, factPref: string) {
        try {
            const row = await db('RECIBOS_CAJA_DETALLE')
                .where({ RCDE_TIPODOC: 31, RCDE_IDDOC: factId, RCDE_ANULADO: 'N' })
                .select('RECA_ID')
                .first();
            if (row && row.RECA_ID) {
                await ContabilidadService.contabilizarReciboCartera(row.RECA_ID, factPref);
            }
        } catch (e: any) {
            console.error('[RECIBO_CAJA] Error en contabilizarReciboDeFactura:', e.message);
        }
    }

    // Sincronizar fielmente las formas de pago en FACTURAS_CONTADO_PAGO y RECIBOS_CAJA_PAGO
    static async syncFacturaPagos(idDoc: number, listaPagos: Array<{ formaPagoId: number; monto: number }>) {
        if (!idDoc || !listaPagos || listaPagos.length === 0) return;

        try {
            const existing = await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', idDoc).orderBy('FCNP_ITEM', 'asc');
            const matches = existing.length === listaPagos.length && existing.every((row: any, idx: number) => {
                return parseInt(String(row.FOPA_ID), 10) === listaPagos[idx].formaPagoId &&
                    Math.abs(parseFloat(String(row.FCNP_MONTO)) - listaPagos[idx].monto) < 1;
            });

            const totalPagos = listaPagos.reduce((acc, p) => acc + (parseFloat(String(p.monto)) || 0), 0);

            if (!matches) {
                console.log(`[PAGOS] Ajustando formas de pago en FACTURAS_CONTADO_PAGO para Factura ID ${idDoc}. Formas enviadas: ${listaPagos.length}, en BD: ${existing.length}`);

                // Obtener datos de caja y banco
                let cajaId = 1;
                let codbco = '';
                try {
                    const ptvt = await db('PUNTO_VENTA').first();
                    if (ptvt?.CAJA_ID) cajaId = parseInt(String(ptvt.CAJA_ID), 10);
                    const cajaRow = await db('CAJAS').where('CAJA_ID', cajaId).first();
                    if (cajaRow?.CAJA_FPBCO) codbco = String(cajaRow.CAJA_FPBCO).trim();
                } catch (e) { }

                const nowFecha = new Date();

                // Eliminar registros incompletos o desactualizados
                await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', idDoc).del();

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
                            numBco = String((parseInt(String(maxRcpa?.MAXN || '0'), 10) || 0) + 1 + i).padStart(6, '0');
                        } catch (e) {
                            numBco = '000001';
                        }
                    }

                    await db('FACTURAS_CONTADO_PAGO').insert({
                        FCNT_ID: idDoc,
                        FCNP_ITEM: i + 1,
                        FOPA_ID: p.formaPagoId,
                        FCNP_BANCO: isEfectivo ? '' : codbco,
                        FCNP_CUENTA: isEfectivo ? '' : '9999',
                        FCNP_NUMERO: isEfectivo ? '' : numBco,
                        FCNP_FECHA: nowFecha,
                        FCNP_MONTO: p.monto,
                        FCNP_ANULADO: 'N',
                        FCNP_CERRADO: 'N'
                    });
                }
            }

            // Sincronizar el recibo de caja de contado con el total exacto de las formas de pago
            const rcdRow = await db('RECIBOS_CAJA_DETALLE')
                .where({ RCDE_TIPODOC: 31, RCDE_IDDOC: idDoc, RCDE_ANULADO: 'N' })
                .first();
            if (rcdRow && rcdRow.RECA_ID && totalPagos > 0) {
                await db('RECIBOS_CAJA').where('RECA_ID', rcdRow.RECA_ID).update({ RECA_MONTO: totalPagos }).catch(() => { });
                await db('RECIBOS_CAJA_DETALLE').where({ RECA_ID: rcdRow.RECA_ID, RCDE_TIPODOC: 31, RCDE_IDDOC: idDoc }).update({ RCDE_ABONO: totalPagos }).catch(() => { });
                await db('SALDOS_DOC_CARTERA').where({ SDCA_TIPOREF: 31, SDCA_IDREF: idDoc }).update({ SDCA_ABONO: totalPagos }).catch(() => { });
            }
        } catch (err: any) {
            console.warn('[PAGOS] Aviso en syncFacturaPagos:', err.message);
        }
    }

    static async syncReciboCajaFactura(idDoc: number, totalDoc: number, abonosList: Array<any>, listaPagos: Array<any>, factPref: string = '0000') {
        if (!idDoc || !abonosList || abonosList.length === 0) return;

        try {
            const factRow = await db('FACTURAS').where('FACT_ID', idDoc).first();
            if (!factRow) return;

            const factNum = String(factRow.FACT_NUMERO || '').trim();
            const clienteNit = String(factRow.TERC_NIT || '').trim();
            const cobrCod = parseInt(String(factRow.COBR_COD || '1'), 10);
            const nowFecha = new Date();
            const totalAbonos = abonosList.reduce((acc, a) => acc + (parseFloat(String(a.monto)) || 0), 0);
            const montoAplicarTotal = Math.min(totalDoc, totalAbonos);

            let saldoPagado = totalDoc - montoAplicarTotal;
            if (saldoPagado < 0) saldoPagado = 0;

            const recaIdRow = await db('RECIBOS_CAJA_DETALLE')
                .where({ RCDE_TIPODOC: 31, RCDE_IDDOC: idDoc, RCDE_ANULADO: 'N' })
                .select('RECA_ID')
                .first();
            const recaId = parseInt(String(recaIdRow?.RECA_ID || '0'), 10);

            // PASO A: Ajustar el Recibo de Caja de Contado y Cartera ANTES de aplicar los anticipos
            // para que SALDOS_DOC_CARTERA refleje el saldo pendiente exacto y no genere DOCUMENTO_ABONO_MAYOR
            if (recaId) {
                if (saldoPagado <= 0) {
                    await db('RECIBOS_CAJA_DETALLE').where('RECA_ID', recaId).del().catch(() => { });
                    await db('RECIBOS_CAJA_PAGO').where('RECA_ID', recaId).del().catch(() => { });
                    await db('RECIBOS_CAJA').where('RECA_ID', recaId).update({ RECA_MONTO: 0, RECA_ANULADO: 'S' }).catch(() => { });
                } else {
                    await db('RECIBOS_CAJA').where('RECA_ID', recaId).update({ RECA_MONTO: saldoPagado }).catch(() => { });
                    await db('RECIBOS_CAJA_DETALLE').where({ RECA_ID: recaId, RCDE_TIPODOC: 31, RCDE_IDDOC: idDoc }).update({ RCDE_ABONO: saldoPagado }).catch(() => { });
                }
            }

            // CRÍTICO: Siempre sincronizar SALDOS_DOC_CARTERA con saldoPagado (tanto si hay RC como si no)
            // para que SDCA_SALDO sea igual a montoAplicarTotal y el trigger APLICACION_CLIENTE_DETALLE_AI
            // no lance DOCUMENTO_ABONO_MAYOR al aplicar los anticipos
            await db('SALDOS_DOC_CARTERA')
                .where({ SDCA_TIPOREF: 31, SDCA_IDREF: idDoc })
                .update({ SDCA_ABONO: saldoPagado })
                .catch(() => { });

            // PASO B: REGISTRO DE APLICACION DE CLIENTE (TIDO_COD = 43)
            if (montoAplicarTotal > 0) {
                // Obtener ID para APLICACION_CLIENTE usando generador ID_APLICACLIE
                const genApclRes = await db.raw('SELECT GEN_ID(id_aplicaclie, 1) AS VAL FROM RDB$DATABASE').catch(async () => {
                    const maxApcl = await db(tables.APLICACION_CLIENTE).max('APCL_ID as MAXID').first();
                    return { rows: [{ VAL: (parseInt(String(maxApcl?.MAXID || '0'), 10) || 0) + 1 }] };
                });
                const apclRows = genApclRes.rows ? genApclRes.rows : (Array.isArray(genApclRes) ? genApclRes : [genApclRes]);
                const apclId = parseInt(String(apclRows[0]?.VAL ?? apclRows[0]?.val ?? 0), 10);

                // Obtener prefijo y consecutivo para TIDO_COD = 43 usando el prefijo de la factura (FE -> FE, 0000 -> 0000)
                const prefApcl = (await db(tables.PREFIJOS).where({ TIDO_COD: 43, PREF_PRE: factPref }).first().catch(() => null))
                    || (await db(tables.PREFIJOS).where('TIDO_COD', 43).first().catch(() => null));
                const prefPreApcl = String(prefApcl?.PREF_PRE || factPref || '0000').trim();
                const maxApclNumRow = await db(tables.APLICACION_CLIENTE).where('PREF_PRE', prefPreApcl).max('APCL_NUMERO as MAXN').first();
                const maxApclNumVal = parseInt(String(maxApclNumRow?.MAXN || '0'), 10) || 0;
                const curApclNum = parseInt(String(prefApcl?.PREF_ACTUAL || '1'), 10) || 1;
                const finalApclNum = Math.max(maxApclNumVal + 1, curApclNum);
                const apclNumero = String(finalApclNum).padStart(6, '0');
                const nextApclActual = String(finalApclNum + 1).padStart(6, '0');

                await db(tables.PREFIJOS)
                    .where({ TIDO_COD: 43, PREF_PRE: prefPreApcl })
                    .update({ PREF_ACTUAL: nextApclActual });

                // Insertar Encabezado de APLICACION_CLIENTE
                await db(tables.APLICACION_CLIENTE).insert({
                    APCL_ID: apclId,
                    TERC_NIT: clienteNit,
                    TIDO_COD: 43,
                    PREF_PRE: prefPreApcl,
                    APCL_NUMERO: apclNumero,
                    APCL_FECHA: nowFecha,
                    APCL_CONCEPTO: Buffer.from(truncateToBytes(`Cruce Abonos Factura ${factPref}-${factNum}`, 55), 'utf8'),
                    APCL_OBS: null,
                    APCL_ANULADO: 'N',
                    APCL_TRANSMIT: 'N',
                    COBR_COD: cobrCod,
                    APCL_USUARIO: 'SYSDBA',
                    APCL_SUCURSAL: '01',
                    NUMOK: 'S',
                    APCL_TRM: 1,
                    APCL_MONEDA: null
                });

                // Insertar Detalles en APLICACION_CLIENTE_DETALLE:
                // 1. Cada Abono aplicado (ACDE_TIPODOC = 45, ACDE_APLICADO = -monto)
                let itemApcl = 1;
                let restantePorAplicar = montoAplicarTotal;

                for (const ab of abonosList) {
                    const abonoMonto = parseFloat(String(ab.monto || 0));
                    const aplicadoEsteAbono = Math.min(abonoMonto, restantePorAplicar);
                    if (aplicadoEsteAbono <= 0) continue;
                    restantePorAplicar -= aplicadoEsteAbono;

                    const anclPref = String(ab.anclPrefRaw || (ab.anclNumero && ab.anclNumero.includes('-') ? ab.anclNumero.split('-')[0] : '0000')).trim();
                    const anclNum = String(ab.anclNumRaw || (ab.anclNumero && ab.anclNumero.includes('-') ? ab.anclNumero.split('-')[1] : ab.anclNumero)).trim();
                    const anclIdVal = parseInt(String(ab.anclId), 10) || 0;

                    // Asegurar que el NIT del anticipo coincida con el NIT de la factura para cumplir integridad en Firebird
                    if (anclIdVal > 0 && clienteNit) {
                        await db(tables.ANTICIPOS_CLIENTE)
                            .where('ANCL_ID', anclIdVal)
                            .update({ TERC_NIT: clienteNit })
                            .catch(() => { });
                    }

                    await db(tables.APLICACION_CLIENTE_DETALLE).insert({
                        APCL_ID: apclId,
                        ACDE_ITEM: itemApcl++,
                        ACDE_TIPODOC: 45, // ANTICIPOS_CLIENTE
                        ACDE_IDDOC: anclIdVal,
                        ACDE_PREFIJO: anclPref || '0000',
                        ACDE_NUMERO: anclNum.trim().slice(-8).padStart(8, '0'),
                        ACDE_APLICADO: -Math.abs(aplicadoEsteAbono), // NEGATIVO
                        ACDE_RTFTE: 0,
                        ACDE_RTIVA: 0,
                        ACDE_RTICA: 0,
                        ACDE_ANULADO: 'N',
                        ACDE_TRANSMIT: 'N',
                        ACDE_DIFCAMBIO: 0,
                        ACDE_RCREE: 0,
                        ACDE_SUCURSAL: '01'
                    }).catch((e: any) => console.warn('Aviso insertando abono en APLICACION_CLIENTE_DETALLE:', e.message));
                }

                // 2. Factura de Venta aplicada (ACDE_TIPODOC = 31, ACDE_APLICADO = +montoAplicarTotal)
                await db(tables.APLICACION_CLIENTE_DETALLE).insert({
                    APCL_ID: apclId,
                    ACDE_ITEM: itemApcl++,
                    ACDE_TIPODOC: 31, // FACTURAS
                    ACDE_IDDOC: idDoc,
                    ACDE_PREFIJO: factPref || '0000',
                    ACDE_NUMERO: factNum.trim().slice(-8).padStart(8, '0'),
                    ACDE_APLICADO: Math.abs(montoAplicarTotal), // POSITIVO
                    ACDE_RTFTE: 0,
                    ACDE_RTIVA: 0,
                    ACDE_RTICA: 0,
                    ACDE_ANULADO: 'N',
                    ACDE_TRANSMIT: 'N',
                    ACDE_DIFCAMBIO: 0,
                    ACDE_RCREE: 0,
                    ACDE_SUCURSAL: '01'
                }).catch((e: any) => console.warn('Aviso insertando factura en APLICACION_CLIENTE_DETALLE:', e.message));

                // Actualizar encabezados de los recibos de caja de los abonos cruzados
                for (const ab of abonosList) {
                    const abonoConc = Buffer.from(truncateToBytes(`Cruce Ab. ${ab.anclPrefRaw || '0000'}-${ab.anclNumRaw || '0'} con Fact ${factPref}-${factNum}`, 80), 'utf8');
                    if (ab.recaIdAbono) {
                        await db('RECIBOS_CAJA').where('RECA_ID', ab.recaIdAbono).update({
                            RECA_CONC: abonoConc,
                            RECA_NOMTERC: Buffer.from(sanitizeText(String(factRow?.FACT_NOMCLIENTE || factRow?.FACT_NOMTERC || 'CLIENTE').trim()), 'utf8')
                        }).catch(() => { });
                    }
                }

                // Contabilizar la Aplicación de Cliente recién creada usando el prefijo de la factura (FE -> ID 5, 0000 -> ID 4)
                await ContabilidadService.contabilizarAplicacionCliente(apclId, factPref);
            }

            // PASO C: Si hay recibo de caja de contado y quedó con saldo pagado, contabilizarlo
            if (recaId && saldoPagado > 0) {
                await PedidoService.contabilizarReciboDeFactura(idDoc, factPref);
            }

            console.log(`[RECIBO_CAJA] Recibo de caja y aplicación sincronizados para Factura ${factPref}-${factNum}: Abonos aplicados $${montoAplicarTotal}, Saldo pagado en RC $${saldoPagado}`);
        } catch (err: any) {
            console.warn('[RECIBO_CAJA] Error en syncReciboCajaFactura:', err.message);
        }
    }
}

