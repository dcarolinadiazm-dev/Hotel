import { db } from '../config/knex.config';
import { tables } from '../utils/tables';

export class ContabilidadService {
    /**
     * Ejecuta el procedimiento almacenado CONTABILIZA_PENDIENTE(:IDC)
     */
    private static async ejecutarContabilizaPendiente(idc: any) {
        if (!idc) return;
        const cleanIdc = parseInt(String(idc), 10);
        if (!cleanIdc) return;
        try {
            await db.raw('EXECUTE PROCEDURE CONTABILIZA_PENDIENTE(?)', [cleanIdc]);
            console.log(`[CONTABILIDAD] CONTABILIZA_PENDIENTE ejecutado con éxito para IDC: ${cleanIdc}`);
        } catch (e: any) {
            console.warn(`[CONTABILIDAD] Aviso ejecutando CONTABILIZA_PENDIENTE(${cleanIdc}):`, e.message);
        }
    }

    /**
     * 1. Contabilizar Factura de Venta (Tipo 31)
     * Procedimiento: CONTABIL_FACTURA(IDDOC, IDINTER, IDCN) -> CONTABILIZA_PENDIENTE(IDC)
     */
    static async contabilizarFactura(idDoc: number, prefijo: string = '0000') {
        if (!idDoc) return;
        const cleanPref = String(prefijo || '0000').trim();

        try {
            const intRow = await db(tables.H_INTERFAZ_PREFIJOS)
                .where({ PREF_PRE: cleanPref })
                .andWhere(function () {
                    this.where('TIPO_DOC', 31).orWhere('TIDO_COD', 31);
                })
                .first()
                .catch(() => null);

            let idInterfaz = intRow?.ID_INTERFAZ ? parseInt(String(intRow.ID_INTERFAZ), 10) : 0;
            if (!idInterfaz) {
                idInterfaz = cleanPref === 'FE' ? 4 : 1;
            }

            const result = await db.raw('SELECT * FROM CONTABIL_FACTURA(?, ?, ?)', [idDoc, idInterfaz, 0]);
            const rows = result.rows || result;
            console.log(`[CONTABILIDAD] Factura ID ${idDoc} (${cleanPref}) contabilizada con éxito (Interfaz: ${idInterfaz}):`, rows);

            const row = Array.isArray(rows) ? rows[0] : (rows?.rows ? rows.rows[0] : rows);
            const idc = row?.IDC ?? row?.idc ?? row?.Idc;
            if (idc) {
                await ContabilidadService.ejecutarContabilizaPendiente(idc);
            }

            return rows;
        } catch (err: any) {
            console.warn(`[CONTABILIDAD] Aviso contabilizando Factura ID ${idDoc}:`, err.message);
        }
    }

    /**
     * 2. Contabilizar Recibo de Caja de Anticipo / Abono (Tipo 61 - RC_ANTICIPO)
     * Procedimiento: CONTABIL_RECICAJA(IDDOC, IDINTER, IDCN) -> CONTABILIZA_PENDIENTE(IDC)
     */
    static async contabilizarReciboAnticipo(recaId: number, prefijo: string = '0000') {
        if (!recaId) return;
        const cleanPref = String(prefijo || '0000').trim();

        try {
            const intRow = await db(tables.H_INTERFAZ_PREFIJOS)
                .where({ PREF_PRE: cleanPref })
                .andWhere(function () {
                    this.where('TIPO_DOC', 61).orWhere('TIDO_COD', 61);
                })
                .andWhere(function () {
                    this.where('TIPO_NOM', 'RC_ANTICIPO').orWhere('TIPO_NOM', 'like', '%ANTICIPO%');
                })
                .first()
                .catch(() => null);

            let idInterfaz = intRow?.ID_INTERFAZ ? parseInt(String(intRow.ID_INTERFAZ), 10) : 0;
            if (!idInterfaz) {
                idInterfaz = cleanPref === 'FE' ? 10 : 8;
            }

            const result = await db.raw('SELECT * FROM CONTABIL_RECICAJA(?, ?, ?)', [recaId, idInterfaz, 0]);
            const rows = result.rows || result;
            console.log(`[CONTABILIDAD] Recibo de Caja Anticipo ID ${recaId} (${cleanPref}) contabilizado con éxito (Interfaz: ${idInterfaz}):`, rows);

            const row = Array.isArray(rows) ? rows[0] : (rows?.rows ? rows.rows[0] : rows);
            const idc = row?.IDC ?? row?.idc ?? row?.Idc;
            if (idc) {
                await ContabilidadService.ejecutarContabilizaPendiente(idc);
            }

            return rows;
        } catch (err: any) {
            console.warn(`[CONTABILIDAD] Aviso contabilizando Recibo Anticipo ID ${recaId}:`, err.message);
        }
    }

    /**
     * 3. Contabilizar Recibo de Caja de Cartera / Factura (Tipo 61 - RC_CARTERA)
     * Procedimiento: CONTABIL_RECICAJA(IDDOC, IDINTER, IDCN) -> CONTABILIZA_PENDIENTE(IDC)
     */
    static async contabilizarReciboCartera(recaId: number, prefijo: string = '0000') {
        if (!recaId) return;
        const cleanPref = String(prefijo || '0000').trim();

        try {
            const intRow = await db(tables.H_INTERFAZ_PREFIJOS)
                .where({ PREF_PRE: cleanPref })
                .andWhere(function () {
                    this.where('TIPO_DOC', 61).orWhere('TIDO_COD', 61);
                })
                .andWhere(function () {
                    this.where('TIPO_NOM', 'RC_CARTERA').orWhere('TIPO_NOM', 'like', '%CARTERA%');
                })
                .first()
                .catch(() => null);

            let idInterfaz = intRow?.ID_INTERFAZ ? parseInt(String(intRow.ID_INTERFAZ), 10) : 0;
            if (!idInterfaz) {
                idInterfaz = cleanPref === 'FE' ? 9 : 1;
            }

            const result = await db.raw('SELECT * FROM CONTABIL_RECICAJA(?, ?, ?)', [recaId, idInterfaz, 0]);
            const rows = result.rows || result;
            console.log(`[CONTABILIDAD] Recibo de Caja Cartera ID ${recaId} (${cleanPref}) contabilizado con éxito (Interfaz: ${idInterfaz}):`, rows);

            const row = Array.isArray(rows) ? rows[0] : (rows?.rows ? rows.rows[0] : rows);
            const idc = row?.IDC ?? row?.idc ?? row?.Idc;
            if (idc) {
                await ContabilidadService.ejecutarContabilizaPendiente(idc);
            }

            return rows;
        } catch (err: any) {
            console.warn(`[CONTABILIDAD] Aviso contabilizando Recibo Cartera ID ${recaId}:`, err.message);
        }
    }

    /**
     * 4. Contabilizar Aplicación de Cartera / Cruce de Abonos (Tipo 43 - APL_REMISION / APL_FE)
     * Procedimiento: CONTABIL_APLICACL(IDDOC, IDINTER, IDCN) -> CONTABILIZA_PENDIENTE(IDC)
     */
    static async contabilizarAplicacionCliente(apclId: number, prefijoFactura: string = '0000') {
        if (!apclId) return;
        const cleanPref = String(prefijoFactura || '0000').trim();

        try {
            // Buscar interfaz por el prefijo de la factura que se cruzó (FE -> APL_FE / 0000 -> APL_REMISION)
            let intRow = await db(tables.H_INTERFAZ_PREFIJOS)
                .where({ PREF_PRE: cleanPref })
                .andWhere(function () {
                    this.where('TIPO_DOC', 43).orWhere('TIDO_COD', 43);
                })
                .first()
                .catch(() => null);

            if (!intRow && cleanPref !== '0000') {
                intRow = await db(tables.H_INTERFAZ_PREFIJOS)
                    .where({ PREF_PRE: '0000' })
                    .andWhere(function () {
                        this.where('TIPO_DOC', 43).orWhere('TIDO_COD', 43);
                    })
                    .first()
                    .catch(() => null);
            }

            let idInterfaz = intRow?.ID_INTERFAZ ? parseInt(String(intRow.ID_INTERFAZ), 10) : 0;
            if (!idInterfaz) {
                idInterfaz = cleanPref === 'FE' ? 5 : 4;
            }

            const result = await db.raw('SELECT * FROM CONTABIL_APLICACL(?, ?, ?)', [apclId, idInterfaz, 0]);
            const rows = result.rows || result;
            console.log(`[CONTABILIDAD] Aplicación de Cliente ID ${apclId} contabilizada con éxito (Interfaz: ${idInterfaz}):`, rows);

            const row = Array.isArray(rows) ? rows[0] : (rows?.rows ? rows.rows[0] : rows);
            const idc = row?.IDC ?? row?.idc ?? row?.Idc;
            if (idc) {
                await ContabilidadService.ejecutarContabilizaPendiente(idc);
            }

            return rows;
        } catch (err: any) {
            console.warn(`[CONTABILIDAD] Aviso contabilizando Aplicación de Cliente ID ${apclId}:`, err.message);
        }
    }
}
