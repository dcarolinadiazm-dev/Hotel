import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import {
    ITurno,
    ITurnoResumenCierre,
    ITurnoAperturaPayload,
    ITurnoCierrePayload
} from '../models/turno.model';
import { HabitacionService } from './habitacion.service';

export class TurnoService {
    // 1. Consultar si existe un turno actualmente abierto
    static async getTurnoActivo(): Promise<ITurno | null> {
        try {
            const turno = await db(tables.TURNO)
                .where('ESTADO', 'Abierto')
                .orderBy('ID_TURNO', 'desc')
                .first();

            if (!turno) return null;

            return {
                ID_TURNO: parseInt(String(turno.ID_TURNO), 10),
                USUARIO: String(turno.USUARIO || '').trim(),
                FECHA_APERTURA: turno.FECHA_APERTURA,
                BASE: parseFloat(String(turno.BASE || '0')),
                FECHA_CIERRE: turno.FECHA_CIERRE,
                ESTADO: String(turno.ESTADO || '').trim(),
                TOTAL_VENTAS: parseFloat(String(turno.TOTAL_VENTAS || '0')),
                TOTAL_PAGOS: parseFloat(String(turno.TOTAL_PAGOS || '0')),
                OBSERVACIONES: turno.OBSERVACIONES ? String(turno.OBSERVACIONES).trim() : ''
            };
        } catch (e: any) {
            console.error('Error en TurnoService.getTurnoActivo:', e.message);
            return null;
        }
    }

    // 2. Realizar la Apertura de un nuevo turno
    static async aperturaTurno(payload: ITurnoAperturaPayload): Promise<ITurno> {
        const { usuario, base, observaciones } = payload;

        if (!usuario || !usuario.trim()) {
            throw new Error('El usuario es obligatorio para abrir un turno.');
        }

        const baseNum = Number(base);
        if (isNaN(baseNum) || baseNum < 0) {
            throw new Error('La base inicial de caja debe ser un valor numérico mayor o igual a 0.');
        }

        // Validar que no haya un turno abierto
        const turnoActivo = await this.getTurnoActivo();
        if (turnoActivo) {
            throw new Error(`Ya existe un turno abierto (#${turnoActivo.ID_TURNO}) por el usuario ${turnoActivo.USUARIO}. Debe cerrarse antes de abrir uno nuevo.`);
        }

        // Obtener siguiente ID_TURNO
        let nextId = 1;
        try {
            const genRes = await db.raw('SELECT GEN_ID(GEN_ID_TURNO, 1) AS NEXTID FROM RDB$DATABASE');
            const genRow = genRes?.rows ? genRes.rows[0] : (Array.isArray(genRes) ? genRes[0] : genRes);
            if (genRow?.NEXTID) {
                nextId = parseInt(String(genRow.NEXTID), 10);
            } else {
                const maxRow = await db(tables.TURNO).max('ID_TURNO as MAXID').first();
                nextId = (parseInt(String(maxRow?.MAXID || '0'), 10) || 0) + 1;
            }
        } catch (e) {
            const maxRow = await db(tables.TURNO).max('ID_TURNO as MAXID').first();
            nextId = (parseInt(String(maxRow?.MAXID || '0'), 10) || 0) + 1;
        }

        const fechaApertura = new Date();

        await db(tables.TURNO).insert({
            ID_TURNO: nextId,
            USUARIO: usuario.trim(),
            FECHA_APERTURA: fechaApertura,
            BASE: baseNum,
            FECHA_CIERRE: null,
            ESTADO: 'Abierto',
            TOTAL_VENTAS: 0,
            TOTAL_PAGOS: 0,
            OBSERVACIONES: observaciones ? observaciones.trim() : ''
        });

        return {
            ID_TURNO: nextId,
            USUARIO: usuario.trim(),
            FECHA_APERTURA: fechaApertura,
            BASE: baseNum,
            FECHA_CIERRE: null,
            ESTADO: 'Abierto',
            TOTAL_VENTAS: 0,
            TOTAL_PAGOS: 0,
            OBSERVACIONES: observaciones ? observaciones.trim() : ''
        };
    }

    // 3. Obtener el Resumen previo al Cierre Z
    static async getResumenCierre(idTurno?: number): Promise<ITurnoResumenCierre> {
        let turno: ITurno | null = null;
        if (idTurno) {
            const row = await db(tables.TURNO).where('ID_TURNO', idTurno).first();
            if (row) {
                turno = {
                    ID_TURNO: parseInt(String(row.ID_TURNO), 10),
                    USUARIO: String(row.USUARIO || '').trim(),
                    FECHA_APERTURA: row.FECHA_APERTURA,
                    BASE: parseFloat(String(row.BASE || '0')),
                    FECHA_CIERRE: row.FECHA_CIERRE,
                    ESTADO: String(row.ESTADO || '').trim(),
                    TOTAL_VENTAS: parseFloat(String(row.TOTAL_VENTAS || '0')),
                    TOTAL_PAGOS: parseFloat(String(row.TOTAL_PAGOS || '0')),
                    OBSERVACIONES: row.OBSERVACIONES ? String(row.OBSERVACIONES).trim() : ''
                };
            }
        } else {
            turno = await this.getTurnoActivo();
        }

        if (!turno) {
            throw new Error('No se encontró un turno activo para generar el resumen de Cierre Z.');
        }

        // Determinar límites del turno anterior para filtrar estrictamente este turno
        // Consultar el MAX(FACTFIN) por prefijo a lo largo de TODOS los turnos cerrados anteriores
        const maxPrevPerPref = await db(tables.TURNO_DET_FACTURAS)
            .where('ID_TURNO', '<', turno.ID_TURNO)
            .groupBy('PREF')
            .select('PREF', db.raw('MAX(FACTFIN) as "MAX_FIN"'));

        const prevLimits: { [pref: string]: number } = {};
        for (const r of maxPrevPerPref) {
            prevLimits[String(r.PREF).trim()] = parseInt(String(r.MAX_FIN), 10);
        }

        // Consultar prefijos activos en PREFIJOS (TIDO_COD = 31) para asegurar que todos los prefijos tengan límite
        const allPrefs = await db(tables.PREFIJOS).where('TIDO_COD', 31).select('PREF_PRE').catch(() => []);
        for (const p of allPrefs) {
            const pr = String(p.PREF_PRE || '').trim();
            if (pr && prevLimits[pr] === undefined) {
                const maxF = await db('FACTURAS')
                    .where('PREF_PRE', pr)
                    .andWhere('FACT_FECHA', '<', turno.FECHA_APERTURA)
                    .max(db.raw('CAST(FACT_NUMERO AS INTEGER) as "MAXN"'))
                    .first()
                    .catch(() => null);
                prevLimits[pr] = parseInt(String(maxF?.MAXN || '0'), 10);
            }
        }

        // 1. Obtener todas las formas de pago configuradas
        const formasPagoRows = await db(tables.FORMAS_PAGO)
            .where(function () {
                this.where('FOPA_ACTIVO', 'S').orWhereNull('FOPA_ACTIVO');
            })
            .select('FOPA_ID', 'FOPA_NOM', 'FOPA_CONSIGNA', 'FOPA_CARTERA')
            .orderBy('FOPA_ID', 'asc');

        const formasMap = new Map<number, string>();
        for (const fp of formasPagoRows) {
            formasMap.set(parseInt(String(fp.FOPA_ID), 10), String(fp.FOPA_NOM || '').trim());
        }

        const fechaAperturaDate = new Date(turno.FECHA_APERTURA);
        const fechaInicioDia = !isNaN(fechaAperturaDate.getTime())
            ? new Date(fechaAperturaDate.getFullYear(), fechaAperturaDate.getMonth(), fechaAperturaDate.getDate(), 0, 0, 0, 0)
            : new Date();

        // 2. Facturas emitidas estrictamente en este turno
        const facturasEmitidasList = await db('FACTURAS')
            .where(function () {
                let hasCondition = false;
                for (const [pref, maxNum] of Object.entries(prevLimits)) {
                    if (pref !== 'ANT' && pref !== 'RC') {
                        hasCondition = true;
                        this.orWhere(function () {
                            this.where('PREF_PRE', pref).andWhere(db.raw('CAST(FACT_NUMERO AS INTEGER) > ?', [maxNum]));
                        });
                    }
                }
                if (!hasCondition) {
                    this.where('FACT_FECHA', '>=', fechaInicioDia);
                }
            })
            .andWhere('FACT_FECHA', '>=', fechaInicioDia)
            .andWhere(function () {
                this.where('FACT_ANULADO', '!=', 'S').orWhereNull('FACT_ANULADO');
            })
            .orderBy('FACT_ID', 'asc');

        const factIds = facturasEmitidasList.map(f => f.FACT_ID);

        // Agrupar facturas por prefijo
        const factByPref: { [pref: string]: { ini: number; fin: number; cant: number; total: number } } = {};
        for (const f of facturasEmitidasList) {
            const pref = String(f.PREF_PRE || 'SETT').trim();
            const num = parseInt(String(f.FACT_NUMERO || '0'), 10);
            const tot = parseFloat(String(f.FACT_TOTAL || '0'));
            if (!factByPref[pref]) {
                factByPref[pref] = { ini: num, fin: num, cant: 0, total: 0 };
            }
            factByPref[pref].ini = Math.min(factByPref[pref].ini, num);
            factByPref[pref].fin = Math.max(factByPref[pref].fin, num);
            factByPref[pref].cant++;
            factByPref[pref].total += tot;
        }

        const facturasGeneradas = Object.entries(factByPref).map(([pref, data]) => ({
            prefijo: pref,
            facturaInicial: data.ini,
            facturaFinal: data.fin,
            cantidad: data.cant,
            total: Math.round(data.total * 100) / 100
        }));

        const totalVentasFacturadas = facturasGeneradas.reduce((acc, f) => acc + f.total, 0);

        // Determinar si hay un corte consecutivo válido para anticipos
        let maxPrevAnclId = prevLimits['ANT'] || 0;
        let cortePorFecha = false;

        if (!maxPrevAnclId) {
            // 1. Verificar si hubo un turno anterior cerrado
            const prevTurnoRows = await db(tables.TURNO)
                .where('ID_TURNO', '<', turno.ID_TURNO)
                .where('ESTADO', 'Cerrado')
                .orderBy('ID_TURNO', 'desc')
                .first();

            const fechaCierrePrev = prevTurnoRows?.FECHA_CIERRE ? new Date(prevTurnoRows.FECHA_CIERRE) : null;
            if (fechaCierrePrev) {
                // Consultar en AUDITORIA hasta la fecha de cierre de ese turno
                const maxPrevAncl = await db('AUDITORIA')
                    .where('TIDO_COD', 45)
                    .where('AUDI_OPER', 'I')
                    .where('AUDI_HORA', '<=', fechaCierrePrev)
                    .max('AUDI_IDDOC as MAXA')
                    .first()
                    .catch(() => null);
                maxPrevAnclId = parseInt(String(maxPrevAncl?.MAXA || 0), 10);
            }

            // 2. Si aún no hay límite, consultar en AUDITORIA el último anticipo creado antes de la apertura de este turno
            if (!maxPrevAnclId) {
                const maxPrevAnclRow = await db('AUDITORIA')
                    .where('TIDO_COD', 45)
                    .where('AUDI_OPER', 'I')
                    .where('AUDI_HORA', '<', fechaAperturaDate)
                    .max('AUDI_IDDOC as MAXA')
                    .first()
                    .catch(() => null);

                const audiMaxA = parseInt(String(maxPrevAnclRow?.MAXA || 0), 10);
                if (audiMaxA > 0) {
                    maxPrevAnclId = audiMaxA;
                } else {
                    cortePorFecha = true;
                }
            }
        }

        // 3. Consultar pagos de las facturas de este turno
        // a) Pagos registrados en FACTURAS_CONTADO_PAGO
        const pagosFacturasContado = factIds.length > 0
            ? await db('FACTURAS_CONTADO_PAGO')
                .whereIn('FCNT_ID', factIds)
                .andWhere(function () {
                    this.where('FCNP_ANULADO', '!=', 'S').orWhereNull('FCNP_ANULADO');
                })
            : [];

        // b) Pagos registrados en RECIBOS_CAJA_DETALLE + RECIBOS_CAJA_PAGO para las facturas (fallback de Firebird)
        const rcFacturas = factIds.length > 0
            ? await db('RECIBOS_CAJA_DETALLE')
                .where('RCDE_TIPODOC', 31)
                .whereIn('RCDE_IDDOC', factIds)
                .andWhere(function () {
                    this.where('RCDE_ANULADO', '!=', 'S').orWhereNull('RCDE_ANULADO');
                })
                .select('RECA_ID', 'RCDE_IDDOC')
            : [];

        const rcIdsFacturas = rcFacturas.map(r => r.RECA_ID);
        const rcPagosFacturas = rcIdsFacturas.length > 0
            ? await db('RECIBOS_CAJA_PAGO')
                .whereIn('RECA_ID', rcIdsFacturas)
                .andWhere(function () {
                    this.where('RCPA_ANULADO', '!=', 'S').orWhereNull('RCPA_ANULADO');
                })
                .select('RECA_ID', 'FOPA_ID', 'RCPA_MONTO')
            : [];

        const recaToFactId = new Map<number, number>();
        for (const rf of rcFacturas) {
            recaToFactId.set(parseInt(String(rf.RECA_ID), 10), parseInt(String(rf.RCDE_IDDOC), 10));
        }

        // c) Anticipos / abonos aplicados (cruce) a las facturas
        const crucesAbonosRows = factIds.length > 0
            ? await db('APLICACION_CLIENTE_DETALLE')
                .where('ACDE_TIPODOC', 31)
                .whereIn('ACDE_IDDOC', factIds)
                .andWhere(function () {
                    this.where('ACDE_ANULADO', '!=', 'S').orWhereNull('ACDE_ANULADO');
                })
                .select('ACDE_IDDOC', 'ACDE_APLICADO')
            : [];

        // Agrupar formas de pago de facturas
        const pagosFacturasConsolidados: Array<{ fopaId: number; monto: number; factId: number; factNumero: string; cliente: string }> = [];

        const fcpByFact = new Map<number, Array<{ fopaId: number; monto: number }>>();
        for (const r of pagosFacturasContado) {
            const fid = parseInt(String(r.FCNT_ID), 10);
            if (!fcpByFact.has(fid)) fcpByFact.set(fid, []);
            fcpByFact.get(fid)!.push({
                fopaId: parseInt(String(r.FOPA_ID), 10),
                monto: parseFloat(String(r.FCNP_MONTO || 0))
            });
        }

        const rcByFact = new Map<number, Array<{ fopaId: number; monto: number }>>();
        for (const r of rcPagosFacturas) {
            const rid = parseInt(String(r.RECA_ID), 10);
            const fid = recaToFactId.get(rid);
            if (fid) {
                if (!rcByFact.has(fid)) rcByFact.set(fid, []);
                rcByFact.get(fid)!.push({
                    fopaId: parseInt(String(r.FOPA_ID), 10),
                    monto: parseFloat(String(r.RCPA_MONTO || 0))
                });
            }
        }

        const crucesByFact = new Map<number, number>();
        for (const r of crucesAbonosRows) {
            const fid = parseInt(String(r.ACDE_IDDOC), 10);
            crucesByFact.set(fid, (crucesByFact.get(fid) || 0) + Math.abs(parseFloat(String(r.ACDE_APLICADO || 0))));
        }

        for (const f of facturasEmitidasList) {
            const fid = parseInt(String(f.FACT_ID), 10);
            const totalFactura = parseFloat(String(f.FACT_TOTAL || 0));
            const primaryFopa = parseInt(String(f.FACT_FORMAP || 1), 10) || 1;
            const factNumero = `${String(f.PREF_PRE || '0000').trim()}-${String(f.FACT_NUMERO || '').trim()}`;
            const cliente = String(f.FACT_NOMTERC || f.FACT_NOMCLIENTE || f.TERC_NIT || 'CLIENTE').trim();

            const abonoCruzado = crucesByFact.get(fid) || 0;
            const saldoMaximoTurno = Math.max(0, Math.round((totalFactura - abonoCruzado) * 100) / 100);
            let remTurno = saldoMaximoTurno;

            if (rcByFact.has(fid) && rcByFact.get(fid)!.length > 0) {
                for (const p of rcByFact.get(fid)!) {
                    const montoReal = abonoCruzado > 0 ? Math.min(p.monto, remTurno) : p.monto;
                    if (montoReal > 0) {
                        pagosFacturasConsolidados.push({
                            ...p,
                            monto: montoReal,
                            factId: fid,
                            factNumero,
                            cliente
                        });
                        remTurno = Math.max(0, remTurno - montoReal);
                    }
                }
            } else if (fcpByFact.has(fid) && fcpByFact.get(fid)!.length > 0) {
                for (const p of fcpByFact.get(fid)!) {
                    const montoReal = abonoCruzado > 0 ? Math.min(p.monto, remTurno) : p.monto;
                    if (montoReal > 0) {
                        pagosFacturasConsolidados.push({
                            ...p,
                            monto: montoReal,
                            factId: fid,
                            factNumero,
                            cliente
                        });
                        remTurno = Math.max(0, remTurno - montoReal);
                    }
                }
            } else {
                if (saldoMaximoTurno > 0) {
                    pagosFacturasConsolidados.push({
                        fopaId: primaryFopa,
                        monto: saldoMaximoTurno,
                        factId: fid,
                        factNumero,
                        cliente
                    });
                }
            }
        }

        // Mapeo de habitaciones para enriquecer detalles de abonos
        const habRows = await db(tables.HABITACION).select('ID_HABITACION', 'NUMERO').catch(() => []);
        const habMap = new Map<string, string>();
        for (const h of habRows) {
            const id = String(h.ID_HABITACION || '').trim();
            const num = String(h.NUMERO || '').trim();
            habMap.set(id, num);
            habMap.set(num, num);
        }

        const hmaRows = await db(tables.HABITACION_MOVIM_ANTICIPOS)
            .join(tables.HABITACION_MOVIM, `${tables.HABITACION_MOVIM_ANTICIPOS}.ID_MOVIM`, `${tables.HABITACION_MOVIM}.ID_MOVIM`)
            .select(
                `${tables.HABITACION_MOVIM_ANTICIPOS}.ANCL_ID`,
                `${tables.HABITACION_MOVIM}.ID_HABITACION`
            )
            .catch(() => []);

        const anclToHabMap = new Map<number, string>();
        for (const r of hmaRows) {
            const anclId = parseInt(String(r.ANCL_ID), 10);
            const idHab = String(r.ID_HABITACION || '').trim();
            const numHab = habMap.get(idHab) || idHab;
            if (numHab) anclToHabMap.set(anclId, numHab);
        }

        const extractHabFromConc = (conc?: string) => {
            if (!conc) return '-';
            const m = conc.match(/HABITACI[OÓ]N\s*([A-Za-z0-9]+)/i);
            return m ? m[1].trim() : '-';
        };

        // 4. Consultar abonos registrados dentro de este turno
        const abonosRegistradosTurno = await db(tables.ANTICIPOS_CLIENTE)
            .join(tables.RECIBOS_CAJA, `${tables.ANTICIPOS_CLIENTE}.RECA_ID`, `${tables.RECIBOS_CAJA}.RECA_ID`)
            .where(function () {
                this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`, '!=', 'S').orWhereNull(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`);
            })
            .andWhere(function () {
                this.where(`${tables.RECIBOS_CAJA}.RECA_ANULADO`, '!=', 'S').orWhereNull(`${tables.RECIBOS_CAJA}.RECA_ANULADO`);
            })
            .andWhere(function () {
                this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_FECHA`, '>=', fechaInicioDia);
                if (maxPrevAnclId > 0) {
                    this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_ID`, '>', maxPrevAnclId);
                }
            })
            .select(
                `${tables.RECIBOS_CAJA}.RECA_ID`,
                `${tables.RECIBOS_CAJA}.RECA_NUMERO`,
                `${tables.RECIBOS_CAJA}.RECA_MONTO`,
                `${tables.RECIBOS_CAJA}.RECA_FECHA`,
                `${tables.RECIBOS_CAJA}.RECA_NOMTERC`,
                `${tables.ANTICIPOS_CLIENTE}.ANCL_ID`,
                `${tables.ANTICIPOS_CLIENTE}.ANCL_NUMERO`,
                `${tables.ANTICIPOS_CLIENTE}.ANCL_CONC`,
                `${tables.ANTICIPOS_CLIENTE}.TERC_NIT`
            );

        const totalAbonosTurno = Math.round(abonosRegistradosTurno.reduce((sum, a) => sum + parseFloat(String(a.RECA_MONTO || 0)), 0) * 100) / 100;

        // Consultar formas de pago de los abonos registrados en este turno (RECIBOS_CAJA_PAGO)
        const abonosRecaIds = abonosRegistradosTurno
            .map(a => parseInt(String(a.RECA_ID || 0), 10))
            .filter(id => id > 0);

        const pagosAbonosTurno = abonosRecaIds.length > 0
            ? await db(tables.RECIBOS_CAJA_PAGO)
                .whereIn('RECA_ID', abonosRecaIds)
                .andWhere(function () {
                    this.where('RCPA_ANULADO', '!=', 'S').orWhereNull('RCPA_ANULADO');
                })
            : [];

        const recaToFopaMap = new Map<number, { fopaId: number; nombre: string }>();
        for (const pa of pagosAbonosTurno) {
            const rid = parseInt(String(pa.RECA_ID), 10);
            const fid = parseInt(String(pa.FOPA_ID), 10);
            const nom = formasMap.get(fid) || 'Efectivo';
            recaToFopaMap.set(rid, { fopaId: fid, nombre: nom });
        }

        // 5. Consultar abonos antiguos de otros turnos que NO se han facturado aún
        const appliedAnclIdsQuery = db('APLICACION_CLIENTE_DETALLE')
            .where('ACDE_TIPODOC', 45)
            .andWhere(function () {
                this.where('ACDE_ANULADO', '!=', 'S').orWhereNull('ACDE_ANULADO');
            })
            .select('ACDE_IDDOC');

        const habsConAbono = await db(tables.HABITACION_MOVIM_ANTICIPOS)
            .join(tables.ANTICIPOS_CLIENTE, `${tables.HABITACION_MOVIM_ANTICIPOS}.ANCL_ID`, `${tables.ANTICIPOS_CLIENTE}.ANCL_ID`)
            .join(tables.RECIBOS_CAJA, `${tables.ANTICIPOS_CLIENTE}.RECA_ID`, `${tables.RECIBOS_CAJA}.RECA_ID`)
            .where(function () {
                this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`, '!=', 'S').orWhereNull(`${tables.ANTICIPOS_CLIENTE}.ANCL_ANULADO`);
            })
            .andWhere(function () {
                this.where(`${tables.RECIBOS_CAJA}.RECA_ANULADO`, '!=', 'S').orWhereNull(`${tables.RECIBOS_CAJA}.RECA_ANULADO`);
            })
            .andWhere(function () {
                this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_FECHA`, '<', fechaInicioDia);
                if (maxPrevAnclId > 0) {
                    this.orWhere(function () {
                        this.where(`${tables.ANTICIPOS_CLIENTE}.ANCL_FECHA`, '>=', fechaInicioDia)
                            .andWhere(`${tables.ANTICIPOS_CLIENTE}.ANCL_ID`, '<=', maxPrevAnclId);
                    });
                }
            })
            .whereNotIn(`${tables.ANTICIPOS_CLIENTE}.ANCL_ID`, appliedAnclIdsQuery)
            .select(
                `${tables.RECIBOS_CAJA}.RECA_ID`,
                `${tables.RECIBOS_CAJA}.RECA_NUMERO`,
                `${tables.RECIBOS_CAJA}.RECA_MONTO`,
                `${tables.RECIBOS_CAJA}.RECA_FECHA`,
                `${tables.RECIBOS_CAJA}.RECA_NOMTERC`,
                `${tables.ANTICIPOS_CLIENTE}.ANCL_ID`,
                `${tables.ANTICIPOS_CLIENTE}.ANCL_NUMERO`,
                `${tables.ANTICIPOS_CLIENTE}.ANCL_CONC`,
                `${tables.ANTICIPOS_CLIENTE}.TERC_NIT`
            );

        // Consultar timestamps de creación en AUDITORIA para los recibos de abono
        const allAbonoRecaIds = [
            ...abonosRegistradosTurno.map(a => parseInt(String(a.RECA_ID || 0), 10)),
            ...habsConAbono.map(a => parseInt(String(a.RECA_ID || 0), 10))
        ].filter(id => id > 0);

        const audiRecaRows = allAbonoRecaIds.length > 0
            ? await db('AUDITORIA')
                .where('TIDO_COD', 61)
                .whereIn('AUDI_IDDOC', allAbonoRecaIds)
                .where('AUDI_OPER', 'I')
                .select('AUDI_IDDOC', 'AUDI_HORA')
                .catch(() => [])
            : [];

        const recaHoraMap = new Map<number, string>();
        for (const row of audiRecaRows) {
            if (row.AUDI_HORA) {
                const d = new Date(row.AUDI_HORA);
                if (!isNaN(d.getTime())) {
                    let hours = d.getHours();
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    const strHours = String(hours).padStart(2, '0');
                    recaHoraMap.set(parseInt(String(row.AUDI_IDDOC), 10), `${strHours}:${minutes} ${ampm}`);
                }
            }
        }

        const formatFechaAbono = (dVal: any, rid: number): string => {
            let strFecha = '';
            if (dVal) {
                const d = new Date(dVal);
                if (!isNaN(d.getTime())) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    strFecha = `${day}/${month}/${year}`;
                } else {
                    strFecha = String(dVal);
                }
            }
            const hora = recaHoraMap.get(rid);
            if (strFecha && hora) {
                return `${strFecha} ${hora}`;
            }
            return strFecha || hora || '';
        };

        const detalleAbonosTurno = abonosRegistradosTurno.map(a => {
            const rid = parseInt(String(a.RECA_ID || 0), 10);
            const aid = parseInt(String(a.ANCL_ID || 0), 10);
            const fopaInfo = recaToFopaMap.get(rid) || { fopaId: 1, nombre: 'Efectivo' };
            const habNum = anclToHabMap.get(aid) || extractHabFromConc(String(a.ANCL_CONC || ''));
            const monto = parseFloat(String(a.RECA_MONTO || 0));

            return {
                reciboId: rid,
                reciboNumero: String(a.RECA_NUMERO || '').trim(),
                anticipoId: aid,
                anticipoNumero: String(a.ANCL_NUMERO || '').trim(),
                habitacionNumero: habNum,
                clienteNombre: String(a.RECA_NOMTERC || a.TERC_NIT || '').trim(),
                tercNit: String(a.TERC_NIT || '').trim(),
                formaPagoId: fopaInfo.fopaId,
                formaPagoNombre: fopaInfo.nombre,
                monto: Math.round(monto * 100) / 100,
                fecha: formatFechaAbono(a.RECA_FECHA, rid)
            };
        });

        const totalAbonosAntiguos = Math.round(habsConAbono.reduce((sum, a) => sum + (parseFloat(String(a.RECA_MONTO || 0))), 0) * 100) / 100;

        const detalleAbonosAntiguos = habsConAbono.map(a => {
            const rid = parseInt(String(a.RECA_ID || 0), 10);
            const aid = parseInt(String(a.ANCL_ID || 0), 10);
            const habNum = anclToHabMap.get(aid) || extractHabFromConc(String(a.ANCL_CONC || ''));
            const monto = parseFloat(String(a.RECA_MONTO || 0));

            return {
                reciboId: rid,
                reciboNumero: String(a.RECA_NUMERO || '').trim(),
                anticipoId: aid,
                anticipoNumero: String(a.ANCL_NUMERO || '').trim(),
                habitacionNumero: habNum,
                clienteNombre: String(a.RECA_NOMTERC || a.TERC_NIT || '').trim(),
                tercNit: String(a.TERC_NIT || '').trim(),
                monto: Math.round(monto * 100) / 100,
                fecha: formatFechaAbono(a.RECA_FECHA, rid)
            };
        });

        // Consolidar pagos por cada forma (facturas emitidas en el turno + abonos registrados en el turno)
        const pagosAcumulados = new Map<number, { total: number; cantidad: number }>();

        for (const pf of pagosFacturasConsolidados) {
            const fopaId = pf.fopaId;
            const monto = pf.monto;
            const actual = pagosAcumulados.get(fopaId) || { total: 0, cantidad: 0 };
            pagosAcumulados.set(fopaId, {
                total: actual.total + monto,
                cantidad: actual.cantidad + 1
            });
        }

        for (const pa of pagosAbonosTurno) {
            const fopaId = parseInt(String(pa.FOPA_ID), 10);
            const monto = parseFloat(String(pa.RCPA_MONTO || '0'));
            const actual = pagosAcumulados.get(fopaId) || { total: 0, cantidad: 0 };
            pagosAcumulados.set(fopaId, {
                total: actual.total + monto,
                cantidad: actual.cantidad + 1
            });
        }

        const pagosPorForma: Array<{ formaPagoId: number; nombreForma: string; total: number; cantidadTransacciones: number }> = [];
        let totalRecaudadoPagos = 0;
        let totalEfectivoRecaudado = 0;

        for (const fp of formasPagoRows) {
            const fopaId = parseInt(String(fp.FOPA_ID), 10);
            const nom = String(fp.FOPA_NOM || '').trim();
            const data = pagosAcumulados.get(fopaId) || { total: 0, cantidad: 0 };

            pagosPorForma.push({
                formaPagoId: fopaId,
                nombreForma: nom,
                total: Math.round(data.total * 100) / 100,
                cantidadTransacciones: data.cantidad
            });

            totalRecaudadoPagos += data.total;
            if (fopaId === 1 || nom.toUpperCase().includes('EFECTIVO')) {
                totalEfectivoRecaudado += data.total;
            }
        }

        totalRecaudadoPagos = Math.round(totalRecaudadoPagos * 100) / 100;
        totalEfectivoRecaudado = Math.round(totalEfectivoRecaudado * 100) / 100;

        // Efectivo Esperado: efectivo real recaudado durante el turno (sin sumar la base inicial para evitar confusión)
        const totalEfectivoEsperado = totalEfectivoRecaudado;

        // Totales por categoría de forma de pago
        let totalConsignaciones = 0;
        let totalCartera = 0;

        for (const fp of formasPagoRows) {
            const fopaId = parseInt(String(fp.FOPA_ID), 10);
            const nom = String(fp.FOPA_NOM || '').trim().toUpperCase();
            const esConsigna = String(fp.FOPA_CONSIGNA || '').trim().toUpperCase() === 'S' || nom.includes('BANCO') || nom.includes('TRANSFERENCIA') || nom.includes('BANCOL');
            const esCartera = String(fp.FOPA_CARTERA || '').trim().toUpperCase() === 'S' || nom.includes('CREDITO');
            const data = pagosAcumulados.get(fopaId) || { total: 0, cantidad: 0 };
            if (esConsigna) totalConsignaciones += data.total;
            else if (esCartera) totalCartera += data.total;
        }
        totalConsignaciones = Math.round(totalConsignaciones * 100) / 100;
        totalCartera = Math.round(totalCartera * 100) / 100;

        // 6. Consultar estado actual de las habitaciones
        const habitaciones = await HabitacionService.getAllHabitaciones();

        let disponibles = 0;
        let ocupadas = 0;
        let reservadas = 0;
        let inhabilitadas = 0;

        const habitacionesEstado = habitaciones.map(h => {
            const e = h.estado.toLowerCase().trim();
            if (e === 'disponible') disponibles++;
            else if (e === 'ocupada') ocupadas++;
            else if (e === 'reservada') reservadas++;
            else inhabilitadas++;

            return {
                id: h.id,
                numero: h.numero,
                estado: h.estado,
                huesped: h.huesped || undefined,
                totalPendiente: h.total || 0
            };
        });

        const totalReservasFuturas = habitaciones.reduce((sum, h) => sum + (h.totalReservasFuturas || 0), 0);
        reservadas += totalReservasFuturas;

        const isEfectivoFopa = (fopaId: number) => {
            const nom = (formasMap.get(fopaId) || '').toUpperCase();
            return fopaId === 1 || nom.includes('EFECTIVO');
        };

        const isConsignaFopa = (fopaId: number) => {
            const fp = formasPagoRows.find(r => parseInt(String(r.FOPA_ID), 10) === fopaId);
            const esConsignaFlag = String(fp?.FOPA_CONSIGNA || '').trim().toUpperCase() === 'S';
            const nom = (formasMap.get(fopaId) || '').toUpperCase();
            return esConsignaFlag || nom.includes('BANCO') || nom.includes('TRANSFERENCIA') || nom.includes('BANCOL');
        };

        const facturasEfectivo = pagosFacturasConsolidados
            .filter(p => isEfectivoFopa(p.fopaId))
            .map(p => ({
                facturaId: p.factId,
                facturaNumero: p.factNumero,
                monto: Math.round(p.monto * 100) / 100,
                clienteNombre: p.cliente
            }));
        const totalFacturasEfectivo = Math.round(facturasEfectivo.reduce((sum, f) => sum + f.monto, 0) * 100) / 100;

        const abonosEfectivo = detalleAbonosTurno
            .filter(a => isEfectivoFopa(a.formaPagoId))
            .map(a => ({
                reciboNumero: a.reciboNumero,
                anticipoNumero: a.anticipoNumero,
                habitacionNumero: a.habitacionNumero,
                clienteNombre: a.clienteNombre,
                monto: a.monto
            }));
        const totalAbonosEfectivo = Math.round(abonosEfectivo.reduce((sum, a) => sum + a.monto, 0) * 100) / 100;

        const detalleEfectivo = {
            facturas: facturasEfectivo,
            totalFacturas: totalFacturasEfectivo,
            abonos: abonosEfectivo,
            totalAbonos: totalAbonosEfectivo,
            totalEfectivo: Math.round((totalFacturasEfectivo + totalAbonosEfectivo) * 100) / 100
        };

        const facturasConsigna = pagosFacturasConsolidados
            .filter(p => isConsignaFopa(p.fopaId))
            .map(p => ({
                facturaId: p.factId,
                facturaNumero: p.factNumero,
                formaPagoNombre: formasMap.get(p.fopaId) || 'Consignación',
                monto: Math.round(p.monto * 100) / 100,
                clienteNombre: p.cliente
            }));
        const totalFacturasConsigna = Math.round(facturasConsigna.reduce((sum, f) => sum + f.monto, 0) * 100) / 100;

        const abonosConsigna = detalleAbonosTurno
            .filter(a => isConsignaFopa(a.formaPagoId))
            .map(a => ({
                reciboNumero: a.reciboNumero,
                anticipoNumero: a.anticipoNumero,
                habitacionNumero: a.habitacionNumero,
                clienteNombre: a.clienteNombre,
                formaPagoNombre: a.formaPagoNombre,
                monto: a.monto
            }));
        const totalAbonosConsigna = Math.round(abonosConsigna.reduce((sum, a) => sum + a.monto, 0) * 100) / 100;

        const detalleConsignaciones = {
            facturas: facturasConsigna,
            totalFacturas: totalFacturasConsigna,
            abonos: abonosConsigna,
            totalAbonos: totalAbonosConsigna,
            totalConsignaciones: Math.round((totalFacturasConsigna + totalAbonosConsigna) * 100) / 100
        };

        return {
            turno: {
                idTurno: turno.ID_TURNO,
                usuario: turno.USUARIO,
                fechaApertura: String(turno.FECHA_APERTURA),
                base: turno.BASE,
                estado: turno.ESTADO,
                observacionesApertura: turno.OBSERVACIONES
            },
            fechaCierreEstimada: new Date().toISOString(),
            pagosPorForma,
            totalVentasFacturadas,
            totalRecaudadoPagos,
            totalAbonosTurno,
            totalAbonosAntiguos,
            totalEfectivoRecaudado,
            totalEfectivoEsperado,
            totalConsignaciones,
            totalCartera,
            facturasGeneradas,
            habitacionesEstado,
            totalesHabitaciones: {
                disponibles,
                ocupadas,
                reservadas,
                inhabilitadas
            },
            detalleAbonosTurno,
            detalleAbonosAntiguos,
            detalleEfectivo,
            detalleConsignaciones
        };
    }

    // 4. Realizar Cierre Z y grabar en Firebird
    static async cierreTurno(payload: ITurnoCierrePayload) {
        const { idTurno, observaciones } = payload;

        const resumen = await this.getResumenCierre(idTurno);
        const now = new Date();

        // 1. Grabar detalles de pagos en TURNO_DET_PAGOS
        await db(tables.TURNO_DET_PAGOS).where('ID_TURNO', idTurno).del();

        let itemPago = 1;
        for (const p of resumen.pagosPorForma) {
            if (p.total > 0 || p.cantidadTransacciones > 0) {
                await db(tables.TURNO_DET_PAGOS).insert({
                    ID_TURNO: idTurno,
                    ID_ITEM: itemPago++,
                    FORMAP: p.formaPagoId,
                    NOMBRE_FORMA: p.nombreForma,
                    MONTO: p.total
                });
            }
        }

        // 2. Grabar detalles de facturas en TURNO_DET_FACTURAS
        await db(tables.TURNO_DET_FACTURAS).where('ID_TURNO', idTurno).del();

        // Consultar maximos históricos para no perder el consecutivo de prefijos que no tuvieron facturas en este turno
        const maxPrevPerPref = await db(tables.TURNO_DET_FACTURAS)
            .where('ID_TURNO', '<', idTurno)
            .groupBy('PREF')
            .select('PREF', db.raw('MAX(FACTFIN) as "MAX_FIN"'));

        const prevLimits: { [pref: string]: number } = {};
        for (const r of maxPrevPerPref) {
            prevLimits[String(r.PREF).trim()] = parseInt(String(r.MAX_FIN), 10);
        }

        let itemFact = 1;
        for (const f of resumen.facturasGeneradas) {
            await db(tables.TURNO_DET_FACTURAS).insert({
                ID_TURNO: idTurno,
                ID_ITEM: itemFact++,
                PREF: f.prefijo,
                FACTINI: f.facturaInicial,
                FACTFIN: f.facturaFinal,
                CANTIDAD: f.cantidad,
                TOTAL: f.total
            });
        }

        // Si algún prefijo de facturas no emitió en este turno, asegurar que conserve el FACTFIN histórico
        for (const [pref, maxNum] of Object.entries(prevLimits)) {
            if (pref !== 'ANT' && pref !== 'RC') {
                const yaGrabado = resumen.facturasGeneradas.some(fg => fg.prefijo === pref);
                if (!yaGrabado && maxNum > 0) {
                    await db(tables.TURNO_DET_FACTURAS).insert({
                        ID_TURNO: idTurno,
                        ID_ITEM: itemFact++,
                        PREF: pref,
                        FACTINI: maxNum,
                        FACTFIN: maxNum,
                        CANTIDAD: 0,
                        TOTAL: 0
                    }).catch(() => {});
                }
            }
        }

        // Grabar tracking de recibos y anticipos para los siguientes turnos
        const maxRecaRow = await db(tables.RECIBOS_CAJA).max('RECA_ID as MAXR').first().catch(() => null);
        const maxCurrentRecaId = parseInt(String(maxRecaRow?.MAXR || '0'), 10);
        if (maxCurrentRecaId > 0) {
            await db(tables.TURNO_DET_FACTURAS).insert({
                ID_TURNO: idTurno,
                ID_ITEM: itemFact++,
                PREF: 'RC',
                FACTINI: maxCurrentRecaId,
                FACTFIN: maxCurrentRecaId,
                CANTIDAD: 0,
                TOTAL: resumen.totalRecaudadoPagos
            }).catch(() => {});
        }

        const maxAnclRow = await db(tables.ANTICIPOS_CLIENTE).max('ANCL_ID as MAXA').first().catch(() => null);
        const maxCurrentAnclId = parseInt(String(maxAnclRow?.MAXA || '0'), 10);
        if (maxCurrentAnclId > 0) {
            await db(tables.TURNO_DET_FACTURAS).insert({
                ID_TURNO: idTurno,
                ID_ITEM: itemFact++,
                PREF: 'ANT',
                FACTINI: maxCurrentAnclId,
                FACTFIN: maxCurrentAnclId,
                CANTIDAD: 0,
                TOTAL: resumen.totalAbonosTurno
            }).catch(() => {});
        }

        // 3. Grabar estado de habitaciones en TURNO_DET_HABITACIONES
        await db(tables.TURNO_DET_HABITACIONES).where('ID_TURNO', idTurno).del();

        let itemHab = 1;
        for (const h of resumen.habitacionesEstado) {
            await db(tables.TURNO_DET_HABITACIONES).insert({
                ID_TURNO: idTurno,
                ID_ITEM: itemHab++,
                ID_HABITACION: h.id,
                NUMERO: h.numero,
                ESTADO: h.estado,
                HUESPED: h.huesped ? h.huesped.substring(0, 100) : null,
                TOTAL_PENDIENTE: h.totalPendiente
            });
        }

        // 4. Actualizar cabecera de TURNO
        const obsFinal = observaciones ? observaciones.trim() : (resumen.turno.observacionesApertura || '');

        await db(tables.TURNO)
            .where('ID_TURNO', idTurno)
            .update({
                FECHA_CIERRE: now,
                ESTADO: 'Cerrado',
                TOTAL_VENTAS: resumen.totalVentasFacturadas,
                TOTAL_PAGOS: resumen.totalRecaudadoPagos,
                OBSERVACIONES: obsFinal.substring(0, 250)
            });

        return {
            idTurno,
            fechaCierre: now.toISOString(),
            estado: 'Cerrado',
            totalVentas: resumen.totalVentasFacturadas,
            totalPagos: resumen.totalRecaudadoPagos,
            totalEfectivoEsperado: resumen.totalEfectivoEsperado,
            resumen
        };
    }

    // 5. Consultar Historial de Turnos / Cierres Z
    static async getHistorialTurnos(filters?: { fechaDesde?: string; fechaHasta?: string; usuario?: string; estado?: string }) {
        let query = db(tables.TURNO).select('*').orderBy('ID_TURNO', 'desc');

        if (filters?.fechaDesde) {
            query = query.where('FECHA_APERTURA', '>=', `${filters.fechaDesde} 00:00:00`);
        }
        if (filters?.fechaHasta) {
            query = query.where('FECHA_APERTURA', '<=', `${filters.fechaHasta} 23:59:59`);
        }
        if (filters?.usuario && filters.usuario.trim()) {
            query = query.where('USUARIO', 'like', `%${filters.usuario.trim()}%`);
        }
        if (filters?.estado && filters.estado !== 'TODOS') {
            query = query.where('ESTADO', filters.estado);
        }

        const rows = await query;
        return rows.map((t: any) => ({
            idTurno: parseInt(String(t.ID_TURNO), 10),
            usuario: String(t.USUARIO || '').trim(),
            fechaApertura: t.FECHA_APERTURA,
            fechaCierre: t.FECHA_CIERRE,
            base: parseFloat(String(t.BASE || '0')),
            estado: String(t.ESTADO || '').trim(),
            totalVentas: parseFloat(String(t.TOTAL_VENTAS || '0')),
            totalPagos: parseFloat(String(t.TOTAL_PAGOS || '0')),
            observaciones: t.OBSERVACIONES ? String(t.OBSERVACIONES).trim() : ''
        }));
    }

    // 6. Consultar Detalle Completo de un Turno para Reimpresión
    static async getDetalleTurnoCerrado(idTurno: number): Promise<ITurnoResumenCierre> {
        const turnoRow = await db(tables.TURNO).where('ID_TURNO', idTurno).first();
        if (!turnoRow) {
            throw new Error(`Turno #${idTurno} no encontrado.`);
        }

        // Si el turno está abierto, calcular en tiempo real
        if (String(turnoRow.ESTADO || '').trim() === 'Abierto') {
            return await this.getResumenCierre(idTurno);
        }

        // Si está cerrado, consultar sus tablas de detalle grabadas
        const pagosRows = await db(tables.TURNO_DET_PAGOS).where('ID_TURNO', idTurno).orderBy('ID_ITEM', 'asc');
        const facturasRows = await db(tables.TURNO_DET_FACTURAS).where('ID_TURNO', idTurno).orderBy('ID_ITEM', 'asc');
        const habsRows = await db(tables.TURNO_DET_HABITACIONES).where('ID_TURNO', idTurno).orderBy('ID_ITEM', 'asc');

        const pagosPorForma = pagosRows.map((p: any) => ({
            formaPagoId: parseInt(String(p.FORMAP), 10),
            nombreForma: String(p.NOMBRE_FORMA || '').trim(),
            total: parseFloat(String(p.MONTO || '0')),
            cantidadTransacciones: 0
        }));

        const facturasGeneradas = facturasRows.map((f: any) => ({
            prefijo: String(f.PREF || '').trim(),
            facturaInicial: parseInt(String(f.FACTINI || '0'), 10),
            facturaFinal: parseInt(String(f.FACTFIN || '0'), 10),
            cantidad: parseInt(String(f.CANTIDAD || '0'), 10),
            total: parseFloat(String(f.TOTAL || '0'))
        }));

        let disponibles = 0;
        let ocupadas = 0;
        let reservadas = 0;
        let inhabilitadas = 0;

        const habitacionesEstado = habsRows.map((h: any) => {
            const e = String(h.ESTADO || '').toLowerCase().trim();
            if (e === 'disponible') disponibles++;
            else if (e === 'ocupada') ocupadas++;
            else if (e === 'reservada') reservadas++;
            else inhabilitadas++;

            return {
                id: String(h.ID_HABITACION || '').trim(),
                numero: String(h.NUMERO || '').trim(),
                estado: String(h.ESTADO || '').trim(),
                huesped: h.HUESPED ? String(h.HUESPED).trim() : undefined,
                totalPendiente: parseFloat(String(h.TOTAL_PENDIENTE || '0'))
            };
        });

        const totalVentasFacturadas = parseFloat(String(turnoRow.TOTAL_VENTAS || '0'));
        const totalRecaudadoPagos = parseFloat(String(turnoRow.TOTAL_PAGOS || '0'));
        const base = parseFloat(String(turnoRow.BASE || '0'));

        const efectivoPago = pagosPorForma.find(p => p.formaPagoId === 1 || p.nombreForma.toUpperCase().includes('EFECTIVO'))?.total || 0;
        const totalEfectivoEsperado = efectivoPago;

        let totalConsignaciones = 0;
        let totalCartera = 0;
        for (const p of pagosPorForma) {
            const nom = p.nombreForma.toUpperCase();
            if (nom.includes('BANCO') || nom.includes('TRANSFERENCIA') || nom.includes('BANCOL') || nom.includes('CONSIGNA')) {
                totalConsignaciones += p.total;
            } else if (nom.includes('CREDITO') || nom.includes('CARTERA')) {
                totalCartera += p.total;
            }
        }

        return {
            turno: {
                idTurno: parseInt(String(turnoRow.ID_TURNO), 10),
                usuario: String(turnoRow.USUARIO || '').trim(),
                fechaApertura: String(turnoRow.FECHA_APERTURA),
                base,
                estado: String(turnoRow.ESTADO || '').trim(),
                observacionesApertura: turnoRow.OBSERVACIONES ? String(turnoRow.OBSERVACIONES).trim() : ''
            },
            fechaCierreEstimada: String(turnoRow.FECHA_CIERRE || new Date().toISOString()),
            pagosPorForma,
            totalVentasFacturadas,
            totalRecaudadoPagos,
            totalAbonosTurno: 0,
            totalAbonosAntiguos: 0,
            totalEfectivoRecaudado: efectivoPago,
            totalEfectivoEsperado,
            totalConsignaciones: Math.round(totalConsignaciones * 100) / 100,
            totalCartera: Math.round(totalCartera * 100) / 100,
            facturasGeneradas,
            habitacionesEstado,
            totalesHabitaciones: {
                disponibles,
                ocupadas,
                reservadas,
                inhabilitadas
            }
        };
    }
}
