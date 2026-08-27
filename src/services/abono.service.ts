import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { sanitizeText, truncateToBytes } from '../utils/text.utils';

export interface RegistrarAbonoPayload {
    idHabitacion: string;
    tercNit: string;
    nombreCliente?: string;
    monto: number;
    fopaId: number;
    concepto?: string;
    usuario?: string;
    banco?: string;
    cuenta?: string;
    comprobanteNumero?: string;
}

export class AbonoService {
    // 1. Obtener Formas de Pago activas de Firebird
    static async getFormasPago() {
        const formas = await db(tables.FORMAS_PAGO)
            .where(function () {
                this.where('FOPA_ACTIVO', 'S').orWhereNull('FOPA_ACTIVO');
            })
            .select('*')
            .orderBy('FOPA_ID', 'asc');

        return formas.map(f => {
            const id = f.FOPA_ID ?? f.fopa_id ?? f.id;
            const nombre = f.FOPA_NOM ?? f.fopa_nom ?? f.nombre ?? '';
            const consigna = f.FOPA_CONSIGNA ?? f.fopa_consigna ?? f.consigna ?? 'N';
            const ctaBanco = f.FOPA_CTABCO ?? f.fopa_ctabco;
            const prefBanco = f.FOPA_PREFBCO ?? f.fopa_prefbco;
            const codDian = f.FOPA_CODDIAN ?? f.fopa_coddian;

            return {
                id: parseInt(String(id), 10),
                nombre: String(nombre).trim(),
                consigna: String(consigna).trim().toUpperCase() === 'S',
                ctaBanco,
                prefBanco: prefBanco ? String(prefBanco).trim() : '',
                codDian: codDian ? String(codDian).trim() : ''
            };
        });
    }

    // 2. Obtener lista de Abonos de la reserva activa (HABITACION_MOVIM_ANTICIPOS) excluyendo anulados
    static async getAbonos(idHabitacion: string, tercNit?: string) {
        // 1. Buscar si hay movimiento activo en HABITACION_MOVIM
        const activeMov = await db(tables.HABITACION_MOVIM)
            .where('ID_HABITACION', idHabitacion)
            .where('ESTADO', 'Activo')
            .orderBy('ID_MOVIM', 'desc')
            .first();

        let rows: any[] = [];

        if (activeMov && activeMov.ID_MOVIM) {
            // Filtrar exclusivamente los anticipos vinculados a esta reserva específica en HABITACION_MOVIM_ANTICIPOS
            rows = await db(tables.HABITACION_MOVIM_ANTICIPOS)
                .join(tables.ANTICIPOS_CLIENTE, `${tables.HABITACION_MOVIM_ANTICIPOS}.ANCL_ID`, `${tables.ANTICIPOS_CLIENTE}.ANCL_ID`)
                .leftJoin(tables.RECIBOS_CAJA, `${tables.ANTICIPOS_CLIENTE}.RECA_ID`, `${tables.RECIBOS_CAJA}.RECA_ID`)
                .leftJoin(tables.RECIBOS_CAJA_PAGO, `${tables.RECIBOS_CAJA}.RECA_ID`, `${tables.RECIBOS_CAJA_PAGO}.RECA_ID`)
                .leftJoin(tables.FORMAS_PAGO, `${tables.RECIBOS_CAJA_PAGO}.FOPA_ID`, `${tables.FORMAS_PAGO}.FOPA_ID`)
                .where(`${tables.HABITACION_MOVIM_ANTICIPOS}.ID_MOVIM`, activeMov.ID_MOVIM)
                .andWhere(function () {
                    this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`, '!=', 'S')
                        .orWhereNull(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`);
                })
                .andWhere(function () {
                    this.where(`${tables.RECIBOS_CAJA}.RECA_ANULADO`, '!=', 'S')
                        .orWhereNull(`${tables.RECIBOS_CAJA}.RECA_ANULADO`);
                })
                .select(
                    `${tables.HABITACION_MOVIM_ANTICIPOS}.ID_MOVIM_ANT`,
                    `${tables.HABITACION_MOVIM_ANTICIPOS}.ID_MOVIM`,
                    `${tables.HABITACION_MOVIM_ANTICIPOS}.ITEM_ID`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_ID`,
                    `${tables.ANTICIPOS_CLIENTE}.PREF_PRE as ANCL_PREF`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_NUMERO`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_FECHA`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_BASE`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_CONC`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`,
                    `${tables.RECIBOS_CAJA}.RECA_ID`,
                    `${tables.RECIBOS_CAJA}.PREF_PRE as RECA_PREF`,
                    `${tables.RECIBOS_CAJA}.RECA_NUMERO`,
                    `${tables.RECIBOS_CAJA}.TERC_NIT`,
                    `${tables.RECIBOS_CAJA}.RECA_NOMTERC`,
                    `${tables.RECIBOS_CAJA_PAGO}.FOPA_ID`,
                    `${tables.FORMAS_PAGO}.FOPA_NOM`,
                    `${tables.RECIBOS_CAJA_PAGO}.RCPA_BANCO`,
                    `${tables.RECIBOS_CAJA_PAGO}.RCPA_CUENTA`,
                    `${tables.RECIBOS_CAJA_PAGO}.RCPA_NUMERO`
                )
                .orderBy(`${tables.HABITACION_MOVIM_ANTICIPOS}.ITEM_ID`, 'asc');
        } else if (tercNit && String(tercNit).trim().length > 0) {
            // Fallback por documento del cliente si no hay ID_MOVIM activo
            rows = await db(tables.ANTICIPOS_CLIENTE)
                .leftJoin(tables.RECIBOS_CAJA, `${tables.ANTICIPOS_CLIENTE}.RECA_ID`, `${tables.RECIBOS_CAJA}.RECA_ID`)
                .leftJoin(tables.RECIBOS_CAJA_PAGO, `${tables.RECIBOS_CAJA}.RECA_ID`, `${tables.RECIBOS_CAJA_PAGO}.RECA_ID`)
                .leftJoin(tables.FORMAS_PAGO, `${tables.RECIBOS_CAJA_PAGO}.FOPA_ID`, `${tables.FORMAS_PAGO}.FOPA_ID`)
                .where(`${tables.ANTICIPOS_CLIENTE}.TERC_NIT`, String(tercNit).trim())
                .andWhere(function () {
                    this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`, '!=', 'S')
                        .orWhereNull(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`);
                })
                .andWhere(function () {
                    this.where(`${tables.RECIBOS_CAJA}.RECA_ANULADO`, '!=', 'S')
                        .orWhereNull(`${tables.RECIBOS_CAJA}.RECA_ANULADO`);
                })
                .select(
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_ID`,
                    `${tables.ANTICIPOS_CLIENTE}.PREF_PRE as ANCL_PREF`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_NUMERO`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_FECHA`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_BASE`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_CONC`,
                    `${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`,
                    `${tables.RECIBOS_CAJA}.RECA_ID`,
                    `${tables.RECIBOS_CAJA}.PREF_PRE as RECA_PREF`,
                    `${tables.RECIBOS_CAJA}.RECA_NUMERO`,
                    `${tables.RECIBOS_CAJA}.TERC_NIT`,
                    `${tables.RECIBOS_CAJA}.RECA_NOMTERC`,
                    `${tables.RECIBOS_CAJA_PAGO}.FOPA_ID`,
                    `${tables.FORMAS_PAGO}.FOPA_NOM`,
                    `${tables.RECIBOS_CAJA_PAGO}.RCPA_BANCO`,
                    `${tables.RECIBOS_CAJA_PAGO}.RCPA_CUENTA`,
                    `${tables.RECIBOS_CAJA_PAGO}.RCPA_NUMERO`
                )
                .orderBy(`${tables.ANTICIPOS_CLIENTE}.ANCL_ID`, 'desc');
        }

        const abonos = rows.map((r: any, idx: number) => {
            const anclId = r.ANCL_ID ?? r.ancl_id;
            const anclPref = r.ANCL_PREF ?? r.ancl_pref ?? '0000';
            const anclNumero = r.ANCL_NUMERO ?? r.ancl_numero ?? '';
            const recaId = r.RECA_ID ?? r.reca_id;
            const recaPref = r.RECA_PREF ?? r.reca_pref ?? '0000';
            const recaNumero = r.RECA_NUMERO ?? r.reca_numero ?? '';
            const fecha = r.ANCL_FECHA ?? r.ancl_fecha;
            const monto = parseFloat(String(r.ANCL_BASE ?? r.ancl_base ?? '0'));
            const concepto = r.ANCL_CONC ?? r.ancl_conc ?? '';
            const anulado = String(r.ANCL_ANULADO ?? r.ancl_anulado ?? 'N').trim().toUpperCase() === 'S';
            const nit = r.TERC_NIT ?? r.terc_nit ?? '';
            const cliente = r.RECA_NOMTERC ?? r.reca_nomterc ?? '';
            const fopaId = r.FOPA_ID ?? r.fopa_id;
            const formaPago = r.FOPA_NOM ?? r.fopa_nom ?? 'EFECTIVO';
            const banco = r.RCPA_BANCO ?? r.rcpa_banco ?? '';
            const cuenta = r.RCPA_CUENTA ?? r.rcpa_cuenta ?? '';
            const comprobante = r.RCPA_NUMERO ?? r.rcpa_numero ?? '';
            const itemId = r.ITEM_ID ?? r.item_id ?? (idx + 1);

            return {
                itemId,
                anclId,
                anclNumero: `${String(anclPref).trim()}-${String(anclNumero).trim()}`,
                recaId,
                recaNumero: recaNumero ? `${String(recaPref).trim()}-${String(recaNumero).trim()}` : '',
                fecha,
                monto,
                concepto: String(concepto).trim(),
                anulado,
                nit: String(nit).trim(),
                cliente: String(cliente).trim(),
                fopaId,
                formaPago: String(formaPago).trim(),
                banco: String(banco).trim(),
                cuenta: String(cuenta).trim(),
                comprobante: String(comprobante).trim()
            };
        });

        const totalAbonado = abonos
            .filter(a => !a.anulado)
            .reduce((sum, a) => sum + a.monto, 0);

        return {
            idHabitacion,
            idMovim: activeMov?.ID_MOVIM || null,
            tercNit: tercNit || '',
            totalAbonado,
            totalRegistros: abonos.length,
            abonos
        };
    }

    // 3. Registrar Abono en las 4 Tablas de Firebird + HABITACION_MOVIM_ANTICIPOS
    static async registrarAbono(payload: RegistrarAbonoPayload) {
        const { idHabitacion, tercNit, monto, fopaId, concepto, nombreCliente, usuario } = payload;

        if (!tercNit || !tercNit.trim()) {
            throw new Error('El documento/NIT del cliente es obligatorio para registrar el abono.');
        }

        const montoNum = parseFloat(String(monto));
        if (isNaN(montoNum) || montoNum <= 0) {
            throw new Error('El monto del abono debe ser mayor a cero.');
        }

        if (!fopaId) {
            throw new Error('Debe seleccionar una forma de pago válida.');
        }

        // Consultar Forma de Pago
        const fp = await db(tables.FORMAS_PAGO).where('FOPA_ID', fopaId).first();
        if (!fp) {
            throw new Error('Forma de pago no encontrada en Firebird.');
        }

        const esConsigna = String(fp.FOPA_CONSIGNA || 'N').trim() === 'S';
        let rcpaBanco = '';
        let rcpaCuenta = '';
        let rcpaNumero = '';

        if (esConsigna) {
            const lastP = await db(tables.RECIBOS_CAJA_PAGO)
                .where('FOPA_ID', fopaId)
                .orderBy('RECA_ID', 'desc')
                .first();

            rcpaBanco = payload.banco || lastP?.RCPA_BANCO || String(fp.FOPA_CTABCO || '98');
            rcpaCuenta = payload.cuenta || lastP?.RCPA_CUENTA || '9999';
            if (payload.comprobanteNumero && payload.comprobanteNumero.trim()) {
                rcpaNumero = payload.comprobanteNumero.trim();
            } else if (lastP?.RCPA_NUMERO) {
                const nextPNum = (parseInt(String(lastP.RCPA_NUMERO), 10) || 0) + 1;
                rcpaNumero = String(nextPNum).padStart(6, '0');
            } else {
                rcpaNumero = '000001';
            }
        }

        // Obtener generadores Firebird
        const genRecaRes = await db.raw('SELECT GEN_ID(id_recicaja, 1) AS VAL FROM RDB$DATABASE');
        const recaRows = genRecaRes.rows ? genRecaRes.rows : (Array.isArray(genRecaRes) ? genRecaRes : [genRecaRes]);
        const recaId = parseInt(String(recaRows[0]?.VAL ?? recaRows[0]?.val ?? 0), 10);

        const genAnclRes = await db.raw('SELECT GEN_ID(id_anticlie, 1) AS VAL FROM RDB$DATABASE');
        const anclRows = genAnclRes.rows ? genAnclRes.rows : (Array.isArray(genAnclRes) ? genAnclRes : [genAnclRes]);
        const anclId = parseInt(String(anclRows[0]?.VAL ?? anclRows[0]?.val ?? 0), 10);

        // Consecutivo para RECIBOS_CAJA (TIDO_COD = 61)
        const prefReca = await db(tables.PREFIJOS).where('TIDO_COD', 61).first();
        const prefPreReca = String(prefReca?.PREF_PRE || '0000').trim();
        const maxRecaRow = await db(tables.RECIBOS_CAJA).where('PREF_PRE', prefPreReca).max('RECA_NUMERO as MAXR').first();
        const maxRecaVal = parseInt(String(maxRecaRow?.MAXR || '0'), 10) || 0;
        const curRecaNum = parseInt(String(prefReca?.PREF_ACTUAL || '1'), 10) || 1;
        const finalRecaNum = Math.max(maxRecaVal + 1, curRecaNum);
        const recaNumero = String(finalRecaNum).padStart(6, '0');
        const nextRecaActual = String(finalRecaNum + 1).padStart(6, '0');

        // Consecutivo para ANTICIPOS_CLIENTE (TIDO_COD = 45)
        const prefAncl = await db(tables.PREFIJOS).where('TIDO_COD', 45).first();
        const prefPreAncl = String(prefAncl?.PREF_PRE || '0000').trim();
        const maxAnclRow = await db(tables.ANTICIPOS_CLIENTE).where('PREF_PRE', prefPreAncl).max('ANCL_NUMERO as MAXA').first();
        const maxAnclVal = parseInt(String(maxAnclRow?.MAXA || '0'), 10) || 0;
        const curAnclNum = parseInt(String(prefAncl?.PREF_ACTUAL || '1'), 10) || 1;
        const finalAnclNum = Math.max(maxAnclVal + 1, curAnclNum);
        const anclNumero = String(finalAnclNum).padStart(6, '0');
        const nextAnclActual = String(finalAnclNum + 1).padStart(6, '0');

        // Actualizar PREFIJOS antes de insertar para garantizar consistencia
        await db(tables.PREFIJOS)
            .where({ TIDO_COD: 61, PREF_PRE: prefPreReca })
            .update({ PREF_ACTUAL: nextRecaActual });

        await db(tables.PREFIJOS)
            .where({ TIDO_COD: 45, PREF_PRE: prefPreAncl })
            .update({ PREF_ACTUAL: nextAnclActual });

        const conceptoResumen = sanitizeText(`Ab. ANTICLIE ${anclNumero},`);
        const conceptoAnticipo = sanitizeText(concepto?.trim() || `ABONO RESERVA HABITACION ${idHabitacion}`);
        const fechaActual = new Date();

        // 1. Insertar en RECIBOS_CAJA (RECA_OBS es BLOB)
        await db(tables.RECIBOS_CAJA).insert({
            RECA_ID: recaId,
            CAJA_ID: 1,
            TIDO_COD: 61,
            PREF_PRE: prefPreReca,
            RECA_NUMERO: recaNumero,
            RECA_FECHA: fechaActual,
            RECA_CONC: truncateToBytes(conceptoResumen, 55),
            RECA_MONTO: montoNum,
            RECA_RTFTEMONTO: 0,
            RECA_RTIVAMONTO: 0,
            RECA_RTICAMONTO: 0,
            RECA_DTOF: 0,
            RECA_OBS: Buffer.from(conceptoAnticipo, 'utf8'),
            TERC_NIT: tercNit.trim(),
            RECA_NOMTERC: sanitizeText(nombreCliente || ''),
            RECA_ANULADO: 'N',
            RECA_TRANSMIT: 'N',
            COBR_COD: 1,
            RECA_USUARIO: usuario || 'SYSDBA',
            NUMOK: 'S',
            RECA_TRM: 1,
            RECA_EXEDENTE: 0,
            RECA_PAGANOM: 'N',
            RECA_RTCREEM: 0
        });

        // 2. Insertar en RECIBOS_CAJA_PAGO
        await db(tables.RECIBOS_CAJA_PAGO).insert({
            RECA_ID: recaId,
            RCPA_ITEM: 1,
            FOPA_ID: fopaId,
            RCPA_BANCO: rcpaBanco,
            RCPA_CUENTA: rcpaCuenta,
            RCPA_NUMERO: rcpaNumero,
            RCPA_FECHA: fechaActual,
            RCPA_MONTO: montoNum,
            RCPA_ANULADO: 'N',
            RCPA_TRANSMIT: 'N',
            RCPA_IVAMONTO: 0
        });

        // 3. Insertar en ANTICIPOS_CLIENTE
        await db(tables.ANTICIPOS_CLIENTE).insert({
            ANCL_ID: anclId,
            TIDO_COD: 45,
            PREF_PRE: prefPreAncl,
            TERC_NIT: tercNit.trim(),
            ANCL_FECHA: fechaActual,
            ANCL_NUMERO: anclNumero,
            ANCL_CONC: truncateToBytes(conceptoAnticipo, 55),
            ANCL_BASE: montoNum,
            ANCL_IVAPORC: 0,
            ANCL_IVAMONTO: 0,
            ANCL_RTFTEPORC: 0,
            ANCL_RTFTEMONTO: 0,
            ANCL_RTIVAPORC: 0,
            ANCL_RTIVAMONTO: 0,
            ANCL_RTICAPORC: 0,
            ANCL_RTICAMONTO: 0,
            ANCL_DTOFECHA: fechaActual,
            ANCL_DTOFPORC: 0,
            ANCL_DTOFMONTO: 0,
            ANCL_ANULADO: 'N',
            ANCL_TRANSMIT: 'N',
            COBR_COD: 1,
            RECA_ID: recaId,
            ANCL_USUARIO: usuario || 'SYSDBA',
            ANCL_SUCURSAL: '01',
            NUMOK: 'S',
            VEND_COD: 1,
            ANCL_TRM: 1,
            ANCL_RTCREE: 0,
            ANCL_RTCREEM: 0
        });

        // 4. Insertar en RECIBOS_CAJA_DETALLE
        await db(tables.RECIBOS_CAJA_DETALLE).insert({
            RECA_ID: recaId,
            RCDE_ITEM: 1,
            RCDE_TIPODOC: 45,
            RCDE_IDDOC: anclId,
            RCDE_PREFIJO: prefPreAncl,
            RCDE_NUMERO: anclNumero,
            RCDE_ABONO: montoNum,
            RCDE_RTFTE: 0,
            RCDE_RTIVA: 0,
            RCDE_RTICA: 0,
            RCDE_DTOF: 0,
            RCDE_ANULADO: 'N',
            RCDE_TRANSMIT: 'N',
            RCDE_COMIP: 'M',
            RCDE_SUCURSAL: '01',
            RCDE_DIFCAMBIO: 0,
            RCDE_COBR: 1,
            RCDE_RCREE: 0
        });

        // 5. Registrar en HABITACION_MOVIM_ANTICIPOS vinculando la reserva activa
        let itemIdRegistrado = 1;
        try {
            const activeMov = await db(tables.HABITACION_MOVIM)
                .where('ID_HABITACION', idHabitacion)
                .where('ESTADO', 'Activo')
                .orderBy('ID_MOVIM', 'desc')
                .first();

            if (activeMov && activeMov.ID_MOVIM) {
                // Calcular consecutivo ITEM_ID para este ID_MOVIM
                const maxItemResult = await db.raw(
                    `SELECT COALESCE(MAX(ITEM_ID), 0) AS MAX_ITEM FROM HABITACION_MOVIM_ANTICIPOS WHERE ID_MOVIM = ?`,
                    [activeMov.ID_MOVIM]
                );
                const itemRows = maxItemResult.rows ? maxItemResult.rows : (Array.isArray(maxItemResult) ? maxItemResult : [maxItemResult]);
                const curItem = parseInt(String(itemRows[0]?.MAX_ITEM ?? itemRows[0]?.max_item ?? 0), 10);
                itemIdRegistrado = curItem + 1;

                // Calcular ID_MOVIM_ANT
                const maxAntResult = await db.raw(
                    `SELECT COALESCE(MAX(ID_MOVIM_ANT), 0) AS MAX_ANT FROM HABITACION_MOVIM_ANTICIPOS`
                );
                const antRows = maxAntResult.rows ? maxAntResult.rows : (Array.isArray(maxAntResult) ? maxAntResult : [maxAntResult]);
                const curAntId = parseInt(String(antRows[0]?.MAX_ANT ?? antRows[0]?.max_ant ?? 0), 10);
                const nextMovAntId = curAntId + 1;

                await db(tables.HABITACION_MOVIM_ANTICIPOS).insert({
                    ID_MOVIM_ANT: nextMovAntId,
                    ID_MOVIM: activeMov.ID_MOVIM,
                    ANCL_ID: anclId,
                    ITEM_ID: itemIdRegistrado
                });
            }
        } catch (e) {
            console.warn('Aviso al insertar en HABITACION_MOVIM_ANTICIPOS:', e);
        }

        return {
            success: true,
            message: 'Abono registrado exitosamente en Recibos y Anticipos de Firebird',
            data: {
                itemId: itemIdRegistrado,
                recaId,
                recaNumero: `${prefPreReca}-${recaNumero}`,
                anclId,
                anclNumero: `${prefPreAncl}-${anclNumero}`,
                monto: montoNum,
                formaPago: String(fp.FOPA_NOM || '').trim(),
                fecha: fechaActual
            }
        };
    }

    // 4. Anular / Eliminar Abono
    static async anularAbono(anclId: number) {
        const anticipo = await db(tables.ANTICIPOS_CLIENTE).where('ANCL_ID', anclId).first();
        if (!anticipo) {
            throw new Error('Anticipo / Abono no encontrado en la base de datos.');
        }

        const recaId = anticipo.RECA_ID;

        // 1. Limpiar saldo en SALDOS_DOC_CARTERA para permitir la anulación limpia en triggers
        try {
            await db('SALDOS_DOC_CARTERA')
                .where({ SDCA_TIPOREF: 45, SDCA_IDREF: anclId })
                .update({ SDCA_ABONO: 0 });
        } catch (e) {
            console.warn('Aviso en SALDOS_DOC_CARTERA:', e);
        }

        // 2. Anular RECIBOS_CAJA si existe
        if (recaId) {
            await db(tables.RECIBOS_CAJA)
                .where('RECA_ID', recaId)
                .update({ RECA_ANULADO: 'S' });

            await db(tables.RECIBOS_CAJA_PAGO)
                .where('RECA_ID', recaId)
                .update({ RCPA_ANULADO: 'S' });

            await db(tables.RECIBOS_CAJA_DETALLE)
                .where('RECA_ID', recaId)
                .update({ RCDE_ANULADO: 'S' });
        }

        // 3. Asegurar ANCL_ANULADO = 'S' en ANTICIPOS_CLIENTE
        await db(tables.ANTICIPOS_CLIENTE)
            .where('ANCL_ID', anclId)
            .update({ ANCL_ANULADO: 'S' });

        return {
            success: true,
            message: `Abono #${anclId} y Recibo #${recaId || ''} anulados exitosamente en Firebird.`
        };
    }
}
