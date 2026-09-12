require('../scripts/setup_bindings.js');
import { db } from '../src/config/knex.config';

async function run() {
  console.log('====================================================');
  console.log('🏨 AJUSTE DE FACTURA 819 Y CRUCE CON ANTICIPO 227');
  console.log('====================================================\n');

  try {
    // 1. Buscar la Factura 819
    const factRow = await db('FACTURAS')
      .where('FACT_NUMERO', 'like', '%819%')
      .first();

    if (!factRow) {
      console.error('❌ No se encontró la Factura 819 en la base de datos.');
      process.exit(1);
    }

    const factId = factRow.FACT_ID;
    const factNum = String(factRow.FACT_NUMERO).trim();
    const factPref = String(factRow.PREF_PRE || '0000').trim();
    const clienteNit = String(factRow.TERC_NIT).trim();
    const totalDoc = parseFloat(String(factRow.FACT_TOTAL || 75000));
    console.log(`✅ Factura encontrada: ID ${factId} | ${factPref}-${factNum} | NIT: ${clienteNit} | Total: $${totalDoc}`);

    // 2. Buscar el Anticipo del cliente
    let antRow = await db('ANTICIPOS_CLIENTE')
      .where('ANCL_NUMERO', 'like', '%227%')
      .first();

    if (!antRow) {
      antRow = await db('ANTICIPOS_CLIENTE')
        .where('TERC_NIT', clienteNit)
        .orderBy('ANCL_ID', 'desc')
        .first();
    }

    if (!antRow) {
      console.error('❌ No se encontró el anticipo del cliente.');
      process.exit(1);
    }

    const anclId = antRow.ANCL_ID;
    const anclNum = String(antRow.ANCL_NUMERO).trim();
    const anclPref = String(antRow.PREF_PRE || '0000').trim();
    const anclBase = parseFloat(String(antRow.ANCL_BASE || 75000));
    console.log(`✅ Anticipo encontrado: ID ${anclId} | ${anclPref}-${anclNum} | Base: $${anclBase}`);

    const montoAplicar = Math.min(totalDoc, anclBase);

    // 3. Eliminar el pago en efectivo fantasma de FACTURAS_CONTADO_PAGO
    const deletedPagos = await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', factId).del();
    console.log(`✅ Se eliminaron ${deletedPagos} registro(s) de pago en efectivo de FACTURAS_CONTADO_PAGO`);

    // 4. Anular el Recibo de Caja generado en la facturación de contado (si existe)
    const rcDets = await db('RECIBOS_CAJA_DETALLE')
      .where({ RCDE_TIPODOC: 31, RCDE_IDDOC: factId });

    for (const rcd of rcDets) {
      const recaId = rcd.RECA_ID;
      await db('RECIBOS_CAJA_DETALLE').where({ RECA_ID: recaId, RCDE_TIPODOC: 31, RCDE_IDDOC: factId }).del();
      await db('RECIBOS_CAJA_PAGO').where('RECA_ID', recaId).del();
      await db('RECIBOS_CAJA').where('RECA_ID', recaId).update({ RECA_MONTO: 0, RECA_ANULADO: 'S' });
      console.log(`✅ Recibo de caja #${recaId} anulado para no duplicar efectivo en caja`);
    }

    // 5. Verificar o Crear Encabezado de APLICACION_CLIENTE (Tipo 43)
    let apclRow = await db('APLICACION_CLIENTE')
      .where('APCL_CONCEPTO', 'like', `%${factNum}%`)
      .first();

    let apclId = apclRow?.APCL_ID;

    if (!apclId) {
      const genApclRes = await db.raw('SELECT GEN_ID(id_aplicaclie, 1) AS VAL FROM RDB$DATABASE').catch(async () => {
        const maxApcl = await db('APLICACION_CLIENTE').max('APCL_ID as MAXID').first();
        return { rows: [{ VAL: (parseInt(String(maxApcl?.MAXID || '0'), 10) || 0) + 1 }] };
      });
      const apclRows = genApclRes.rows ? genApclRes.rows : (Array.isArray(genApclRes) ? genApclRes : [genApclRes]);
      apclId = parseInt(String(apclRows[0]?.VAL ?? apclRows[0]?.val ?? 0), 10);

      const prefPreApcl = '0000';
      const maxApclNumRow = await db('APLICACION_CLIENTE').where('PREF_PRE', prefPreApcl).max('APCL_NUMERO as MAXN').first();
      const maxApclNumVal = parseInt(String(maxApclNumRow?.MAXN || '0'), 10) || 0;
      const apclNumero = String(maxApclNumVal + 1).padStart(6, '0');

      await db('APLICACION_CLIENTE').insert({
        APCL_ID: apclId,
        TERC_NIT: clienteNit,
        TIDO_COD: 43,
        PREF_PRE: prefPreApcl,
        APCL_NUMERO: apclNumero,
        APCL_FECHA: factRow.FACT_FECHA || new Date(),
        APCL_CONCEPTO: `Cruce Abonos Factura ${factPref}-${factNum}`,
        APCL_OBS: null,
        APCL_ANULADO: 'N',
        APCL_TRANSMIT: 'N',
        COBR_COD: 1,
        APCL_USUARIO: 'SYSDBA',
        APCL_SUCURSAL: '01',
        NUMOK: 'S',
        APCL_TRM: 1,
        APCL_MONEDA: null
      });
      console.log(`✅ Creado encabezado APLICACION_CLIENTE ID ${apclId} (#${apclNumero})`);
    } else {
      console.log(`ℹ️ Encabezado APLICACION_CLIENTE ya existía: ID ${apclId}`);
    }

    // 6. Sincronizar SALDOS_DOC_CARTERA antes de insertar detalles para no disparar excepción de saldo
    await db('SALDOS_DOC_CARTERA')
      .where({ SDCA_TIPOREF: 31, SDCA_IDREF: factId })
      .update({ SDCA_ABONO: 0 });

    // 7. Insertar o actualizar los detalles en APLICACION_CLIENTE_DETALLE
    const existingDets = await db('APLICACION_CLIENTE_DETALLE').where('APCL_ID', apclId);

    if (existingDets.length === 0) {
      // Detalle 1: Anticipo (Tipo 45, Negativo)
      await db('APLICACION_CLIENTE_DETALLE').insert({
        APCL_ID: apclId,
        ACDE_ITEM: 1,
        ACDE_TIPODOC: 45,
        ACDE_IDDOC: anclId,
        ACDE_PREFIJO: anclPref,
        ACDE_NUMERO: anclNum.trim().slice(-8).padStart(8, '0'),
        ACDE_APLICADO: -Math.abs(montoAplicar),
        ACDE_RTFTE: 0,
        ACDE_RTIVA: 0,
        ACDE_RTICA: 0,
        ACDE_ANULADO: 'N',
        ACDE_TRANSMIT: 'N',
        ACDE_DIFCAMBIO: 0,
        ACDE_RCREE: 0,
        ACDE_SUCURSAL: '01'
      });
      console.log(`✅ Insertado detalle 1 (Anticipo -${montoAplicar}) en APLICACION_CLIENTE_DETALLE`);

      // Detalle 2: Factura (Tipo 31, Positivo)
      await db('APLICACION_CLIENTE_DETALLE').insert({
        APCL_ID: apclId,
        ACDE_ITEM: 2,
        ACDE_TIPODOC: 31,
        ACDE_IDDOC: factId,
        ACDE_PREFIJO: factPref,
        ACDE_NUMERO: factNum.trim().slice(-8).padStart(8, '0'),
        ACDE_APLICADO: Math.abs(montoAplicar),
        ACDE_RTFTE: 0,
        ACDE_RTIVA: 0,
        ACDE_RTICA: 0,
        ACDE_ANULADO: 'N',
        ACDE_TRANSMIT: 'N',
        ACDE_DIFCAMBIO: 0,
        ACDE_RCREE: 0,
        ACDE_SUCURSAL: '01'
      });
      console.log(`✅ Insertado detalle 2 (Factura +${montoAplicar}) en APLICACION_CLIENTE_DETALLE`);
    } else {
      console.log(`ℹ️ APLICACION_CLIENTE_DETALLE ya tenía ${existingDets.length} detalle(s) registrado(s).`);
    }

    // 8. Asegurar saldos finales en SALDOS_DOC_CARTERA
    await db('SALDOS_DOC_CARTERA')
      .where({ SDCA_TIPOREF: 31, SDCA_IDREF: factId })
      .update({ SDCA_ABONO: montoAplicar, SDCA_MONTO: totalDoc });

    console.log('\n====================================================');
    console.log('🎉 FACTURA 819 AJUSTADA EXITOSAMENTE EN PRODUCCIÓN');
    console.log(`- Factura: ${factPref}-${factNum} (Total $${totalDoc})`);
    console.log(`- Anticipo Aplicado: ${anclPref}-${anclNum} ($${montoAplicar})`);
    console.log(`- Pago en Efectivo Fantasma: ELIMINADO`);
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('❌ Error ejecutando ajuste:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
