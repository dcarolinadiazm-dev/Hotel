import { db } from '../src/config/knex.config';
import { tables } from '../src/utils/tables';
import { TurnoService } from '../src/services/turno.service';

async function main() {
  console.log('🔍 Buscando aplicaciones de anticipo pendientes de cruce con factura...');

  // 1. Obtener aplicaciones recientes (últimas 24 horas o hoy)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const apcls = await db(tables.APLICACION_CLIENTE)
    .where('APCL_FECHA', '>=', today)
    .orderBy('APCL_ID', 'desc');

  let reparados = 0;

  for (const ap of apcls) {
    const apclId = parseInt(String(ap.APCL_ID), 10);
    const detalles = await db(tables.APLICACION_CLIENTE_DETALLE).where('APCL_ID', apclId);

    const hasAnticipo = detalles.some(d => Number(d.ACDE_TIPODOC) === 45);
    const hasFactura = detalles.some(d => Number(d.ACDE_TIPODOC) === 31);

    if (hasAnticipo && !hasFactura) {
      console.log(`⚠️ Aplicación ID ${apclId} (${ap.APCL_CONCEPTO}) tiene anticipo pero le falta la factura.`);

      // Buscar el monto del anticipo aplicado
      const antDet = detalles.find(d => Number(d.ACDE_TIPODOC) === 45);
      const montoAbono = Math.abs(parseFloat(String(antDet?.ACDE_APLICADO || 0)));

      // Intentar extraer prefijo y número de factura del concepto: "Cruce Abonos Factura PREF-NUM"
      const concepto = String(ap.APCL_CONCEPTO || '');
      const match = concepto.match(/Factura\s+([A-Za-z0-9]+)-([A-Za-z0-9]+)/i);

      let factRow: any = null;
      if (match) {
        const pref = match[1].trim();
        const num = match[2].trim();
        factRow = await db('FACTURAS')
          .where('PREF_PRE', pref)
          .andWhere(function () {
            this.where('FACT_NUMERO', num)
              .orWhere('FACT_NUMERO', num.slice(-8).padStart(8, '0'))
              .orWhere(db.raw('CAST(FACT_NUMERO AS INTEGER) = ?', [parseInt(num, 10)]));
          })
          .first();
      }

      if (!factRow && ap.TERC_NIT) {
        // Buscar factura más reciente del cliente
        factRow = await db('FACTURAS')
          .where('TERC_NIT', ap.TERC_NIT)
          .where('FACT_FECHA', '>=', today)
          .orderBy('FACT_ID', 'desc')
          .first();
      }

      if (factRow) {
        const factId = parseInt(String(factRow.FACT_ID), 10);
        const totalFactura = parseFloat(String(factRow.FACT_TOTAL || 0));
        const saldoPagado = Math.max(0, totalFactura - montoAbono);
        const pref = String(factRow.PREF_PRE || '0000').trim();
        const num = String(factRow.FACT_NUMERO || '').trim();

        console.log(`🔧 Reparando Factura ID ${factId} (${pref}-${num}) Total: $${totalFactura}, Abono: $${montoAbono}, Saldo Pagado: $${saldoPagado}...`);

        // Ajustar cartera previa
        await db('SALDOS_DOC_CARTERA')
          .where({ SDCA_TIPOREF: 31, SDCA_IDREF: factId })
          .update({ SDCA_ABONO: saldoPagado })
          .catch(() => { });

        // Insertar item 2 (Factura) en APLICACION_CLIENTE_DETALLE
        const nextItem = detalles.length + 1;
        await db(tables.APLICACION_CLIENTE_DETALLE).insert({
          APCL_ID: apclId,
          ACDE_ITEM: nextItem,
          ACDE_TIPODOC: 31,
          ACDE_IDDOC: factId,
          ACDE_PREFIJO: pref,
          ACDE_NUMERO: num.slice(-8).padStart(8, '0'),
          ACDE_APLICADO: montoAbono,
          ACDE_RTFTE: 0,
          ACDE_RTIVA: 0,
          ACDE_RTICA: 0,
          ACDE_ANULADO: 'N',
          ACDE_TRANSMIT: 'N',
          ACDE_DIFCAMBIO: 0,
          ACDE_RCREE: 0,
          ACDE_SUCURSAL: '01'
        });

        console.log(`✅ Aplicación ID ${apclId} reparada exitosamente vinculando la Factura ${pref}-${num}.`);
        reparados++;
      } else {
        console.warn(`No se pudo encontrar la factura asociada para la aplicación ID ${apclId}.`);
      }
    }
  }

  if (reparados === 0) {
    console.log('✅ No se encontraron cruces pendientes o inconsistentes. Todo está al día.');
  }

  // Mostrar estado actual del Cierre Z activo
  try {
    const turnoActivo = await TurnoService.getTurnoActivo();
    if (turnoActivo) {
      const resumen = await TurnoService.getResumenCierre(turnoActivo.ID_TURNO);
      console.log('\n=========================================');
      console.log(`📊 ESTADO ACTUAL DEL TURNO ACTIVO #${turnoActivo.ID_TURNO}:`);
      console.log(`   Base Inicial:        $${resumen.turno.base.toLocaleString('es-CO')}`);
      console.log(`   Efectivo Esperado:   $${resumen.totalEfectivoEsperado.toLocaleString('es-CO')}`);
      console.log(`   Total Recaudos:      $${resumen.totalRecaudadoPagos.toLocaleString('es-CO')}`);
      console.log(`   Total Facturado:     $${resumen.totalVentasFacturadas.toLocaleString('es-CO')}`);
      console.log(`   Abonos del Turno:    $${resumen.totalAbonosTurno.toLocaleString('es-CO')}`);
      console.log(`   Abonos Antiguos:     $${resumen.totalAbonosAntiguos.toLocaleString('es-CO')}`);
      console.log('=========================================\n');
    }
  } catch (e: any) {
    console.warn('Aviso consultando resumen de turno:', e.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
