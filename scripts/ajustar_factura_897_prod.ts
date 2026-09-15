require('../scripts/setup_bindings.js');
import { db } from '../src/config/knex.config';

async function ajustarFactura897() {
  console.log(`\n====================================================`);
  console.log(`🏨 AJUSTE PRODUCCIÓN: FACTURA 0000-00000897 Y CRUCE DE ABONOS`);
  console.log(`====================================================`);

  // 1. Buscar la Factura
  const factRow = await db('FACTURAS')
    .where('FACT_NUMERO', 'like', '%897%')
    .andWhere(function () {
      this.where('PREF_PRE', '0000').orWhereNull('PREF_PRE').orWhere('PREF_PRE', '');
    })
    .first();

  if (!factRow) {
    console.error(`❌ No se encontró la Factura 0000-00000897 en la base de datos.`);
    process.exit(1);
  }

  const factId = factRow.FACT_ID;
  const factNum = String(factRow.FACT_NUMERO).trim();
  const factPref = String(factRow.PREF_PRE || '0000').trim();
  const factTotal = parseFloat(String(factRow.FACT_TOTAL || 497000));
  const nitCliente = String(factRow.TERC_NIT || '222222222222').trim();

  console.log(`✅ Factura encontrada: ID ${factId} | ${factPref}-${factNum} | Total: $${factTotal} | NIT: ${nitCliente}`);

  // 2. Buscar el movimiento y los anticipos asociados
  // Primero intentamos por HABITACION_MOVIM vinculado a esta factura
  const movRows = await db('HABITACION_MOVIM')
    .where({ FACT_ID: factId })
    .orWhere({ ID_MOVIM: 7 });

  const movIds = movRows.map(m => m.ID_MOVIM);
  console.log(`ℹ️ Movimientos encontrados: ${movIds.join(', ')}`);

  let anticipos = await db('HABITACION_MOVIM_ANTICIPOS as HMA')
    .join('ANTICIPOS_CLIENTE as AC', 'HMA.ANCL_ID', 'AC.ANCL_ID')
    .whereIn('HMA.ID_MOVIM', movIds.length > 0 ? movIds : [7])
    .select(
      'AC.ANCL_ID',
      'AC.PREF_PRE',
      'AC.ANCL_NUMERO',
      'AC.ANCL_BASE',
      'AC.RECA_ID',
      'HMA.MONTO_ANTICIPO'
    );

  // Si no los encuentra por movimiento, buscar los 4 anticipos de esa fecha/recibos
  if (anticipos.length === 0) {
    anticipos = await db('ANTICIPOS_CLIENTE')
      .whereIn('ANCL_ID', [197, 224, 261, 271])
      .select(
        'ANCL_ID',
        'PREF_PRE',
        'ANCL_NUMERO',
        'ANCL_BASE',
        'RECA_ID'
      );
  }

  console.log(`✅ Anticipos a cruzar (${anticipos.length}):`);
  let totalAnticipos = 0;
  anticipos.forEach(a => {
    const m = parseFloat(String(a.MONTO_ANTICIPO || a.ANCL_BASE || 0));
    totalAnticipos += m;
    console.log(`   - ID ${a.ANCL_ID} | RC: ${a.RECA_ID || 'N/A'} | Num: ${a.PREF_PRE}-${a.ANCL_NUMERO} | Monto: $${m}`);
  });
  console.log(`   Total Abonos: $${totalAnticipos}`);

  const trx = await db.transaction();

  try {
    // 3. Eliminar el pago en efectivo fantasma de FACTURAS_CONTADO_PAGO
    const deletedPagos = await trx('FACTURAS_CONTADO_PAGO').where('FCNT_ID', factId).del();
    console.log(`✅ Eliminado pago fantasma de FACTURAS_CONTADO_PAGO (Registros: ${deletedPagos})`);

    // 4. Buscar o crear APLICACION_CLIENTE
    let apclRow = await trx('APLICACION_CLIENTE')
      .where('APCL_CONCEPTO', 'like', `%${factNum}%`)
      .first();

    let apclId = apclRow?.APCL_ID;

    if (!apclId) {
      const genApclRes = await trx.raw('SELECT GEN_ID(id_aplicaclie, 1) AS VAL FROM RDB$DATABASE').catch(async () => {
        const maxApcl = await trx('APLICACION_CLIENTE').max('APCL_ID as MAXID').first();
        return { rows: [{ VAL: (parseInt(String(maxApcl?.MAXID || '0'), 10) || 0) + 1 }] };
      });
      const apclRows = genApclRes.rows ? genApclRes.rows : (Array.isArray(genApclRes) ? genApclRes : [genApclRes]);
      apclId = parseInt(String(apclRows[0]?.VAL ?? apclRows[0]?.val ?? 0), 10);

      const prefPreApcl = '0000';
      const maxApclNumRow = await trx('APLICACION_CLIENTE').where('PREF_PRE', prefPreApcl).max('APCL_NUMERO as MAXN').first();
      const maxApclNumVal = parseInt(String(maxApclNumRow?.MAXN || '0'), 10) || 0;
      const apclNumero = String(maxApclNumVal + 1).padStart(6, '0');

      await trx('APLICACION_CLIENTE').insert({
        APCL_ID: apclId,
        TERC_NIT: nitCliente,
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
      console.log(`ℹ️ Encabezado APLICACION_CLIENTE encontrado: ID ${apclId}`);
    }

    // 5. Limpiar detalles previos en APLICACION_CLIENTE_DETALLE para este APCL_ID
    await trx('APLICACION_CLIENTE_DETALLE').where('APCL_ID', apclId).del();

    // 6. Preparar SALDOS_DOC_CARTERA de la Factura y Anticipos
    await trx('SALDOS_DOC_CARTERA')
      .where({ SDCA_TIPOREF: 31, SDCA_IDREF: factId })
      .update({
        SDCA_MONTO: factTotal,
        SDCA_SALDO: factTotal,
        SDCA_ABONO: 0
      });

    for (const a of anticipos) {
      const monto = parseFloat(String(a.MONTO_ANTICIPO || a.ANCL_BASE || 0));
      await trx('SALDOS_DOC_CARTERA')
        .where({ SDCA_TIPOREF: 45, SDCA_IDREF: a.ANCL_ID })
        .update({
          SDCA_SALDO: -Math.abs(monto),
          SDCA_ABONO: 0
        });

      // Asegurar NIT del anticipo igual al de la factura
      await trx('ANTICIPOS_CLIENTE')
        .where('ANCL_ID', a.ANCL_ID)
        .update({ TERC_NIT: nitCliente });
    }
    console.log(`✅ SALDOS_DOC_CARTERA sincronizados`);

    // 7. Insertar los ítems de los anticipos en APLICACION_CLIENTE_DETALLE
    let itemIdx = 1;
    for (const a of anticipos) {
      const monto = parseFloat(String(a.MONTO_ANTICIPO || a.ANCL_BASE || 0));
      const aPref = String(a.PREF_PRE || '0000').trim();
      const aNum = String(a.ANCL_NUMERO || a.ANCL_ID).trim().slice(-8).padStart(8, '0');

      await trx('APLICACION_CLIENTE_DETALLE').insert({
        APCL_ID: apclId,
        ACDE_ITEM: itemIdx++,
        ACDE_TIPODOC: 45, // Anticipo
        ACDE_IDDOC: a.ANCL_ID,
        ACDE_PREFIJO: aPref,
        ACDE_NUMERO: aNum,
        ACDE_APLICADO: -Math.abs(monto),
        ACDE_RTFTE: 0,
        ACDE_RTIVA: 0,
        ACDE_RTICA: 0,
        ACDE_ANULADO: 'N',
        ACDE_TRANSMIT: 'N',
        ACDE_DIFCAMBIO: 0,
        ACDE_RCREE: 0,
        ACDE_SUCURSAL: '01'
      });
      console.log(`   + Detalle ${itemIdx - 1}: Anticipo ID ${a.ANCL_ID} por -$${monto}`);
    }

    // 8. Insertar el ítem de la factura en APLICACION_CLIENTE_DETALLE
    await trx('APLICACION_CLIENTE_DETALLE').insert({
      APCL_ID: apclId,
      ACDE_ITEM: itemIdx++,
      ACDE_TIPODOC: 31, // Factura
      ACDE_IDDOC: factId,
      ACDE_PREFIJO: factPref,
      ACDE_NUMERO: factNum.slice(-8).padStart(8, '0'),
      ACDE_APLICADO: Math.abs(totalAnticipos),
      ACDE_RTFTE: 0,
      ACDE_RTIVA: 0,
      ACDE_RTICA: 0,
      ACDE_ANULADO: 'N',
      ACDE_TRANSMIT: 'N',
      ACDE_DIFCAMBIO: 0,
      ACDE_RCREE: 0,
      ACDE_SUCURSAL: '01'
    });
    console.log(`   + Detalle ${itemIdx - 1}: Factura ID ${factId} por +$${totalAnticipos}`);

    await trx.commit();
    console.log(`\n🎉 PROCESO COMPLETADO CON ÉXITO EN LA BASE DE DATOS!`);
  } catch (err: any) {
    await trx.rollback();
    console.error(`\n❌ ERROR EJECUTANDO EL AJUSTE:`, err.message);
    process.exit(1);
  }

  process.exit(0);
}

ajustarFactura897();
