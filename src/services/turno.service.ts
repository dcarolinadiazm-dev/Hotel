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

        const fechaApertura = new Date(turno.FECHA_APERTURA);
        const fechaAperturaStr = fechaApertura.toISOString();

        // 1. Obtener todas las formas de pago configuradas
        const formasPagoRows = await db(tables.FORMAS_PAGO)
            .where(function () {
                this.where('FOPA_ACTIVO', 'S').orWhereNull('FOPA_ACTIVO');
            })
            .select('FOPA_ID', 'FOPA_NOM')
            .orderBy('FOPA_ID', 'asc');

        const formasMap = new Map<number, string>();
        for (const fp of formasPagoRows) {
            formasMap.set(parseInt(String(fp.FOPA_ID), 10), String(fp.FOPA_NOM || '').trim());
        }

        // 2. Consultar recaudos de FACTURAS_CONTADO_PAGO generados durante este turno
        const pagosFacturas = await db('FACTURAS_CONTADO_PAGO')
            .join('FACTURAS', 'FACTURAS_CONTADO_PAGO.FCNT_ID', 'FACTURAS.FACT_ID')
            .where('FACTURAS.FACT_FECHA', '>=', fechaApertura)
            .andWhere(function () {
                this.where('FACTURAS.FACT_ANULADO', '!=', 'S').orWhereNull('FACTURAS.FACT_ANULADO');
            })
            .select(
                'FACTURAS_CONTADO_PAGO.FOPA_ID',
                db.raw('SUM(COALESCE(FACTURAS_CONTADO_PAGO.FCNT_MONTO, 0)) as "TOTAL_MONTO"'),
                db.raw('COUNT(*) as "CANT_TRANS"')
            )
            .groupBy('FACTURAS_CONTADO_PAGO.FOPA_ID');

        // 3. Consultar anticipos / recibos de caja (abonos) creados durante el turno
        let pagosRecibos: any[] = [];
        try {
            pagosRecibos = await db(tables.RECIBOS_CAJA_PAGO)
                .join(tables.RECIBOS_CAJA, `${tables.RECIBOS_CAJA_PAGO}.RECA_ID`, `${tables.RECIBOS_CAJA}.RECA_ID`)
                .where(`${tables.RECIBOS_CAJA}.RECA_FECHA`, '>=', fechaApertura)
                .andWhere(function () {
                    this.where(`${tables.RECIBOS_CAJA}.RECA_ANULADO`, '!=', 'S').orWhereNull(`${tables.RECIBOS_CAJA}.RECA_ANULADO`);
                })
                .select(
                    `${tables.RECIBOS_CAJA_PAGO}.FOPA_ID`,
                    db.raw(`SUM(COALESCE(${tables.RECIBOS_CAJA_PAGO}.RCPA_MONTO, 0)) as "TOTAL_MONTO"`),
                    db.raw('COUNT(*) as "CANT_TRANS"')
                )
                .groupBy(`${tables.RECIBOS_CAJA_PAGO}.FOPA_ID`);
        } catch (e) {}

        // Consolidar pagos por cada forma
        const pagosAcumulados = new Map<number, { total: number; cantidad: number }>();

        for (const pf of pagosFacturas) {
            const fopaId = parseInt(String(pf.FOPA_ID), 10);
            const monto = parseFloat(String(pf.TOTAL_MONTO || '0'));
            const cant = parseInt(String(pf.CANT_TRANS || '0'), 10);
            const actual = pagosAcumulados.get(fopaId) || { total: 0, cantidad: 0 };
            pagosAcumulados.set(fopaId, {
                total: actual.total + monto,
                cantidad: actual.cantidad + cant
            });
        }

        for (const pr of pagosRecibos) {
            const fopaId = parseInt(String(pr.FOPA_ID), 10);
            const monto = parseFloat(String(pr.TOTAL_MONTO || '0'));
            const cant = parseInt(String(pr.CANT_TRANS || '0'), 10);
            const actual = pagosAcumulados.get(fopaId) || { total: 0, cantidad: 0 };
            pagosAcumulados.set(fopaId, {
                total: actual.total + monto,
                cantidad: actual.cantidad + cant
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
                total: data.total,
                cantidadTransacciones: data.cantidad
            });

            totalRecaudadoPagos += data.total;
            if (fopaId === 1 || nom.toUpperCase().includes('EFECTIVO')) {
                totalEfectivoRecaudado += data.total;
            }
        }

        // 4. Consultar facturas generadas por prefijo
        const facturasEmitidas = await db('FACTURAS')
            .where('FACT_FECHA', '>=', fechaApertura)
            .andWhere(function () {
                this.where('FACT_ANULADO', '!=', 'S').orWhereNull('FACT_ANULADO');
            })
            .select(
                'PREF_PRE',
                db.raw('MIN(CAST(FACT_NUMERO AS INTEGER)) as "FACT_INI"'),
                db.raw('MAX(CAST(FACT_NUMERO AS INTEGER)) as "FACT_FIN"'),
                db.raw('COUNT(*) as "CANT_FACT"'),
                db.raw('SUM(COALESCE(FACT_TOTAL, 0)) as "TOTAL_FACT"')
            )
            .groupBy('PREF_PRE')
            .orderBy('PREF_PRE', 'asc');

        const facturasGeneradas = facturasEmitidas.map((f: any) => ({
            prefijo: String(f.PREF_PRE || 'SETT').trim(),
            facturaInicial: parseInt(String(f.FACT_INI || '0'), 10),
            facturaFinal: parseInt(String(f.FACT_FIN || '0'), 10),
            cantidad: parseInt(String(f.CANT_FACT || '0'), 10),
            total: parseFloat(String(f.TOTAL_FACT || '0'))
        }));

        const totalVentasFacturadas = facturasGeneradas.reduce((acc, f) => acc + f.total, 0);

        // 5. Consultar estado actual de las habitaciones
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

        const totalEfectivoEsperado = turno.BASE + totalEfectivoRecaudado;

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
            totalEfectivoEsperado,
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
}
