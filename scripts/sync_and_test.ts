import { db } from '../src/config/knex.config';
import { tables } from '../src/utils/tables';

async function syncAndTest() {
  try {
    const maxFact = await db('FACTURAS').where('PREF_PRE', '0000').max('FACT_NUMERO as MAXN').first();
    const maxVal = parseInt(String(maxFact?.MAXN || '0'), 10) || 0;
    console.log('MAX FACT_NUMERO:', maxVal);
    await db(tables.PREFIJOS).where({ TIDO_COD: 31, PREF_PRE: '0000' }).update({
      PREF_ACTUAL: String(maxVal + 1).padStart(6, '0')
    });
    console.log('UPDATED PREFIJOS 0000 to:', maxVal + 1);

    // Now run test
    const maxDinw = await db(tables.DOC_INVENTARIO_WEB).max('DINW_ID as MAXID').first();
    const dinwId = (parseInt(String(maxDinw?.MAXID || '0'), 10) || 0) + 1;

    await db(tables.DOC_INVENTARIO_WEB).insert({
      DINW_ID: dinwId,
      DINW_TIPO: 31,
      DINW_PREF: '0000',
      DINW_NIT: '222222222222',
      DINW_SUCURSAL: '01',
      DINW_FECHA: new Date(),
      DINW_VENCE: new Date(),
      DINW_CONCEPTO: 'TEST MULTI-PAGO NATIVO SP',
      DINW_OBS: 'TEST MULTI-PAGO NATIVO SP',
      DINW_BASE: 50000,
      DINW_IVAMONTO: 9500,
      DINW_MONTO: 59500,
      DINW_FORMAP: 1,
      DINW_IMPINC: 'S',
      DINW_IVAINC: 'S',
      DINW_TRANSMIT: 'N'
    });

    await db(tables.DOC_INVENTARIO_DET_WEB).insert({
      DINW_ID: dinwId,
      DIWD_ITEM: 1,
      DIWD_ARTICULO: '6948031100808',
      DIWD_CANT: 1,
      DIWD_PRUNIT: 50000,
      DIWD_TOTAL: 59500,
      DIWD_IVAMONTO: 9500,
      DIWD_IVAPORC: 19,
      DIWD_BODEGA: '1',
      DIWD_ANULADO: 'N'
    });

    await db('DOC_INVENTARIO_PAGO_WEB').insert({ DINW_ID: dinwId, DIWP_ITEM: 1, FOPA_ID: 1, DIWP_MONTO: 29500, DIWP_BANCO: '', DIWP_CUENTA: '', DIWP_NUMERO: '' });
    await db('DOC_INVENTARIO_PAGO_WEB').insert({ DINW_ID: dinwId, DIWP_ITEM: 2, FOPA_ID: 2, DIWP_MONTO: 30000, DIWP_BANCO: '99', DIWP_CUENTA: '9999', DIWP_NUMERO: '000240' });

    console.log('Executing GRABE_DOCUMENTO_INV_WEB(31, dinwId)...');
    const spResult = await db.raw('SELECT * FROM GRABE_DOCUMENTO_INV_WEB(?, ?)', [31, dinwId]);
    const resultRow = spResult.rows ? spResult.rows[0] : (Array.isArray(spResult) ? spResult[0] : spResult);
    console.log('SP RESULT:', resultRow);

    const idGenerado = resultRow?.IDDOC || resultRow?.iddoc;
    const pagos = await db('FACTURAS_CONTADO_PAGO').where('FCNT_ID', idGenerado);
    console.log('PAGOS IN FACTURAS_CONTADO_PAGO:', pagos);

    const recaDet = await db('RECIBOS_CAJA_DETALLE').where({ RCDE_TIPODOC: 31, RCDE_IDDOC: idGenerado });
    if (recaDet.length > 0) {
      const recaPagos = await db('RECIBOS_CAJA_PAGO').where('RECA_ID', recaDet[0].RECA_ID);
      console.log('RECIBOS_CAJA_PAGO (SP GENERATED):', recaPagos);
    }
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

syncAndTest();
