import { db } from '../src/config/knex.config';

async function verify1395() {
  try {
    const fact = await db('FACTURAS').where('FACT_ID', 1395).first();
    console.log('FACTURA 1395:', fact.PREF_PRE, fact.FACT_NUMERO, fact.FACT_TOTAL);

    const pagos = await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', 1395);
    console.log('PAGOS EN FACTURAS_CONTADO_PAGO:', pagos);

    const recaDet = await db('RECIBOS_CAJA_DETALLE').where({ RCDE_TIPODOC: 31, RCDE_IDDOC: 1395 });
    console.log('RECIBO DETALLE:', recaDet);

    if (recaDet.length > 0) {
      const recaPagos = await db('RECIBOS_CAJA_PAGO').where('RECA_ID', recaDet[0].RECA_ID);
      console.log('RECIBO PAGOS:', recaPagos);
    }
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

verify1395();
