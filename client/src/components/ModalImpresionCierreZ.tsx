import React from 'react';

export interface ResumenCierreZData {
  turno: {
    idTurno: number;
    usuario: string;
    fechaApertura: string;
    base: number;
    estado: string;
    observacionesApertura?: string;
  };
  fechaCierre: string;
  pagosPorForma: Array<{
    formaPagoId: number;
    nombreForma: string;
    total: number;
    cantidadTransacciones: number;
  }>;
  totalVentasFacturadas: number;
  totalRecaudadoPagos: number;
  totalEfectivoEsperado: number;
  facturasGeneradas: Array<{
    prefijo: string;
    facturaInicial: number;
    facturaFinal: number;
    cantidad: number;
    total: number;
  }>;
  totalesHabitaciones: {
    disponibles: number;
    ocupadas: number;
    reservadas: number;
    inhabilitadas: number;
  };
  observaciones?: string;
}

interface ModalImpresionCierreZProps {
  data: ResumenCierreZData;
  onClose: () => void;
}

export const ModalImpresionCierreZ: React.FC<ModalImpresionCierreZProps> = ({
  data,
  onClose,
}) => {
  const handlePrint = () => {
    const printableElement = document.getElementById('pos-ticket-cierre-z');
    if (!printableElement) return;

    let printIframe = document.getElementById('pos-print-hidden-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'pos-print-hidden-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      printIframe.style.width = '0px';
      printIframe.style.height = '0px';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cierre Z - Turno #${data.turno.idTurno}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              width: 100% !important;
              height: auto !important;
              font-family: 'Consolas', 'Segoe UI Mono', 'Courier New', Courier, monospace;
              color: #000000;
            }
            .pos-ticket-paper {
              width: 100% !important;
              max-width: 260px !important;
              margin: 0 auto !important;
              padding: 4px 10px !important;
              font-size: 11.5px !important;
              line-height: 1.3 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .pos-ticket-header { text-align: center; }
            .pos-logo-wrapper { display: flex; justify-content: center; align-items: center; margin: 0 auto 4px auto; }
            .pos-logo-img { max-height: 55px; max-width: 180px; object-fit: contain; }
            .pos-doc-main-title { font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 3px 0; }
            .pos-divider-dashed { border-bottom: 1px dashed #000; margin: 5px 0; }
            .pos-divider-solid { border-bottom: 1px solid #000; margin: 5px 0; }
            .pos-divider-double { border-bottom: 3px double #000; margin: 5px 0; }
            .pos-info-block { text-align: left; margin: 4px 0; }
            .pos-info-row { display: flex; justify-content: space-between; margin-bottom: 2.5px; font-size: 11px; }
            .pos-label { font-weight: bold; flex-shrink: 0; }
            .pos-value { text-align: right; word-break: break-word; }
            .pos-value.bold, .bold { font-weight: bold; }
            .pos-items-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0; }
            .pos-items-table th { border-bottom: 1px solid #000; padding-bottom: 2px; text-align: left; font-size: 10.5px; font-weight: bold; }
            .pos-items-table td { padding: 2.5px 0; vertical-align: top; }
            .pos-totals-block { margin: 5px 0; font-size: 11.5px; }
            .pos-signature-block { text-align: center; margin: 24px 0 8px 0; }
            .pos-signature-line { border-bottom: 1px solid #000; width: 88%; margin: 0 auto 4px auto; }
            .pos-ticket-footer { text-align: center; font-size: 10.5px; margin-top: 8px; }
          </style>
        </head>
        <body>
          ${printableElement.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 200);
  };

  const formatFecha = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="impresion-pos-backdrop" onClick={onClose}>
      <div className="impresion-pos-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Barra superior de acciones de la ventana */}
        <div className="impresion-pos-header no-print">
          <div className="impresion-header-title">
            <span className="icon">🖨️</span>
            <h3>Vista Previa - Cierre Z (Turno #{data.turno.idTurno})</h3>
          </div>
          <div className="impresion-header-actions">
            <button type="button" className="btn-pos-print" onClick={handlePrint} title="Imprimir Tirilla POS">
              🖨️ Imprimir
            </button>
            <button type="button" className="btn-pos-close" onClick={onClose} title="Cerrar ventana y salir">
              ✕
            </button>
          </div>
        </div>

        {/* Contenedor del comprobante térmico */}
        <div className="impresion-pos-body">
          <div className="pos-ticket-paper" id="pos-ticket-cierre-z">
            {/* Encabezado Hotel con Logo */}
            <div className="pos-ticket-header">
              <div className="pos-logo-wrapper">
                <img src="/LogoHotel.png" alt="Logo Hotel" className="pos-logo-img" />
              </div>
              <div className="pos-divider-dashed" />
              <h2 className="pos-doc-main-title" style={{ fontSize: '14px', fontWeight: 900 }}>
                REPORTE DE CIERRE Z
              </h2>
              <div className="pos-divider-double" />
            </div>

            {/* Datos del Turno */}
            <div className="pos-info-block">
              <div className="pos-info-row">
                <span className="pos-label">TURNO:</span>
                <span className="pos-value bold">#{data.turno.idTurno}</span>
              </div>
              <div className="pos-info-row">
                <span className="pos-label">CAJERO/USUARIO:</span>
                <span className="pos-value bold">{data.turno.usuario}</span>
              </div>
              <div className="pos-info-row">
                <span className="pos-label">APERTURA:</span>
                <span className="pos-value">{formatFecha(data.turno.fechaApertura)}</span>
              </div>
              <div className="pos-info-row">
                <span className="pos-label">CIERRE:</span>
                <span className="pos-value">{formatFecha(data.fechaCierre)}</span>
              </div>
            </div>

            <div className="pos-divider-solid" />

            {/* Resumen de Valores de Caja */}
            <div className="pos-totals-block">
              <div className="pos-info-row">
                <span className="pos-label">BASE INICIAL:</span>
                <span className="pos-value bold">${data.turno.base.toLocaleString('es-CO')}</span>
              </div>
              <div className="pos-info-row">
                <span className="pos-label">TOTAL FACTURADO:</span>
                <span className="pos-value bold">${data.totalVentasFacturadas.toLocaleString('es-CO')}</span>
              </div>
              <div className="pos-info-row">
                <span className="pos-label">TOTAL RECAUDOS:</span>
                <span className="pos-value bold">${data.totalRecaudadoPagos.toLocaleString('es-CO')}</span>
              </div>
              <div className="pos-divider-dashed" />
              <div className="pos-info-row" style={{ fontSize: '12.5px', marginTop: '3px' }}>
                <span className="pos-label">EFECTIVO ESPERADO:</span>
                <span className="pos-value bold" style={{ color: '#047857' }}>
                  ${data.totalEfectivoEsperado.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="pos-divider-double" />

            {/* Desglose de Formas de Pago */}
            <div style={{ margin: '6px 0' }}>
              <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
                RECAUDOS POR FORMA DE PAGO
              </p>
              <table className="pos-items-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '55%' }}>Forma</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>Tx</th>
                    <th style={{ textAlign: 'right', width: '30%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pagosPorForma.map((p) => (
                    <tr key={p.formaPagoId}>
                      <td style={{ textAlign: 'left' }}>{p.nombreForma}</td>
                      <td style={{ textAlign: 'center' }}>{p.cantidadTransacciones}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ${p.total.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pos-divider-solid" />

            {/* Rango de Facturas Emitidas */}
            <div style={{ margin: '6px 0' }}>
              <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
                FACTURAS EMITIDAS
              </p>
              {data.facturasGeneradas && data.facturasGeneradas.length > 0 ? (
                <table className="pos-items-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '25%' }}>Pref</th>
                      <th style={{ textAlign: 'left', width: '40%' }}>Rango</th>
                      <th style={{ textAlign: 'center', width: '10%' }}>Cant</th>
                      <th style={{ textAlign: 'right', width: '25%' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.facturasGeneradas.map((f, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{f.prefijo}</td>
                        <td style={{ textAlign: 'left' }}>
                          #{f.facturaInicial}-#{f.facturaFinal}
                        </td>
                        <td style={{ textAlign: 'center' }}>{f.cantidad}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ${f.total.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: '10.5px', textAlign: 'center', fontStyle: 'italic', margin: '4px 0' }}>
                  Sin facturas emitidas en el turno.
                </p>
              )}
            </div>

            <div className="pos-divider-solid" />

            {/* Estado de Habitaciones al Cierre */}
            <div style={{ margin: '6px 0' }}>
              <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
                ESTADO DE HABITACIONES
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', fontSize: '10.5px' }}>
                <div>🟢 Disponibles: <b>{data.totalesHabitaciones.disponibles}</b></div>
                <div>🔴 Ocupadas: <b>{data.totalesHabitaciones.ocupadas}</b></div>
                <div>🟡 Reservadas: <b>{data.totalesHabitaciones.reservadas}</b></div>
                <div>⚫ Inhabilitadas: <b>{data.totalesHabitaciones.inhabilitadas}</b></div>
              </div>
            </div>

            {data.observaciones && (
              <>
                <div className="pos-divider-dashed" />
                <div style={{ margin: '4px 0', fontSize: '10.5px' }}>
                  <span className="pos-label">OBSERVACIONES:</span>
                  <p style={{ margin: '2px 0 0 0', fontStyle: 'italic' }}>{data.observaciones}</p>
                </div>
              </>
            )}

            <div className="pos-divider-double" />

            {/* Firmas de Auditoría */}
            <div className="pos-signature-block">
              <div style={{ marginBottom: '25px' }}>
                <div className="pos-signature-line" />
                <p style={{ fontSize: '10.5px', fontWeight: 'bold', margin: 0 }}>
                  FIRMA CAJERO / ENTREGA
                </p>
                <p style={{ fontSize: '9.5px', margin: 0, opacity: 0.8 }}>
                  {data.turno.usuario}
                </p>
              </div>
              <div>
                <div className="pos-signature-line" />
                <p style={{ fontSize: '10.5px', fontWeight: 'bold', margin: 0 }}>
                  FIRMA RECIBIDO / AUDITORÍA
                </p>
              </div>
            </div>

            <div className="pos-ticket-footer">
              <p style={{ fontSize: '9px', color: '#555', margin: '4px 0 0 0' }}>
                SYSplus ERP · Control de Turnos Hotel
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
