import React, { useState, useEffect } from 'react';

export interface ItemImpresion {
  item: number;
  articulo: string;
  descripcion: string;
  referencia: string;
  cantidad: number;
  precioUnitario: number;
  ivaPorc: number;
  ivaMonto: number;
  total: number;
}

export interface DocumentoImpresion {
  titulo: string;
  tipoDoc: 'FACTURA' | 'REMISION';
  tipoNombre: string;
  prefijo: string;
  numero: string;
  numeroDoc: string;
  autorizacion?: string;
  fecha: string;
  hora: string;
  huesped: string;
  documento: string;
  direccion?: string;
  ciudad?: string;
  celular?: string;
  habitacionNumero?: string;
  formaPago: string;
  formasPago?: Array<{ nombre: string; monto: number }>;
  observaciones?: string;
  items: ItemImpresion[];
  subtotal: number;
  ivaTotal: number;
  totalPagar: number;
}

interface ModalImpresionPOSProps {
  tipoDoc: 'FACTURA' | 'REMISION' | number;
  idDoc: number;
  habitacionNumero?: string;
  onClose: () => void;
}

export const ModalImpresionPOS: React.FC<ModalImpresionPOSProps> = ({
  tipoDoc,
  idDoc,
  habitacionNumero,
  onClose,
}) => {
  const [doc, setDoc] = useState<DocumentoImpresion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('hotel_token');
      try {
        const res = await fetch(`/api/pedidos/imprimir/${tipoDoc}/${idDoc}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          if (!data.habitacionNumero && habitacionNumero) {
            data.habitacionNumero = habitacionNumero;
          }
          setDoc(data);
        } else {
          throw new Error(data.error || 'Error al obtener datos del comprobante');
        }
      } catch (err: any) {
        setError(err.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [tipoDoc, idDoc, habitacionNumero]);

  const handlePrint = () => {
    const printableElement = document.getElementById('pos-ticket-printable');
    if (!printableElement) {
      window.print();
      return;
    }

    // Usar un iframe aislado exclusivo para imprimir sin interferencias de la página principal
    let printIframe = document.getElementById('pos-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'pos-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document.title || 'Tirilla POS'}</title>
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
              max-width: 275px !important;
              margin: 0 auto !important;
              padding: 2px 4px !important;
              font-size: 12px !important;
              line-height: 1.3 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .pos-ticket-header { text-align: center; }
            .pos-logo-wrapper { display: flex; justify-content: center; align-items: center; margin: 0 auto 4px auto; }
            .pos-logo-img { max-height: 60px; max-width: 200px; object-fit: contain; }
            .pos-doc-main-title { font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 4px 0; }
            .pos-divider-dashed { border-bottom: 1px dashed #000; margin: 6px 0; }
            .pos-divider-solid { border-bottom: 1px solid #000; margin: 6px 0; }
            .pos-divider-double { border-bottom: 3px double #000; margin: 6px 0; }
            .pos-info-block { text-align: left; margin: 5px 0; }
            .pos-info-row { display: flex; justify-content: space-between; margin-bottom: 2.5px; font-size: 11.5px; }
            .pos-hab-row { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; border: 1px solid #cbd5e1; }
            .pos-label { font-weight: bold; flex-shrink: 0; }
            .pos-value { text-align: right; word-break: break-word; }
            .pos-value.bold, .bold { font-weight: bold; }
            .text-large { font-size: 13px; }
            .pos-table-container { margin: 6px 0; }
            .pos-items-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
            .pos-items-table th { border-bottom: 1px solid #000; padding-bottom: 3px; text-align: left; font-size: 11.5px; font-weight: bold; }
            .pos-items-table td { padding: 3px 0; vertical-align: top; }
            .pos-col-desc { width: 55%; text-align: left; }
            .pos-col-cant { width: 13%; text-align: center; }
            .pos-col-total { width: 32%; text-align: right; }
            .pos-item-desc { font-weight: 700; font-size: 11.5px; }
            .pos-item-unit-calc { display: block; font-size: 10px; color: #333; }
            .pos-totals-block { margin: 6px 0; font-size: 12px; }
            .pos-total-row { display: flex; justify-content: space-between; margin-bottom: 2.5px; }
            .pos-grand-total { font-size: 14.5px; font-weight: 900; }
            .pos-payment-method { font-size: 12px; margin-top: 4px; }
            .pos-payment-badge { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; border: 1px solid #94a3b8; font-weight: bold; }
            .pos-signature-block { text-align: center; margin: 20px 0 10px 0; }
            .pos-sign-notice { font-size: 11px; margin-bottom: 50px; color: #222; }
            .pos-signature-line { border-bottom: 1px solid #000; width: 90%; margin: 0 auto 5px auto; }
            .pos-sign-label { font-size: 12px; font-weight: bold; margin: 0; }
            .pos-sign-sublabel { font-size: 11px; margin: 2px 0 0 0; }
            .pos-ticket-footer { text-align: center; font-size: 11px; margin-top: 6px; }
            .pos-footer-msg { margin: 2px 0; }
            .pos-footer-thanks { font-size: 12px; font-weight: bold; margin: 4px 0; }
            .pos-footer-system { font-size: 9.5px; color: #444; margin: 3px 0 0 0; }
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

  const formatMoney = (val?: number) => {
    return '$' + Number(val || 0).toLocaleString('es-CO');
  };

  return (
    <div className="impresion-pos-backdrop" onClick={onClose}>
      <div className="impresion-pos-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Barra superior de acciones de la ventana */}
        <div className="impresion-pos-header no-print">
          <div className="impresion-header-title">
            <span className="icon">🖨️</span>
            <h3>Vista Previa - Tirilla POS</h3>
          </div>
          <div className="impresion-header-actions">
            <button type="button" className="btn-pos-print" onClick={handlePrint} title="Imprimir en tirilla POS">
              🖨️ Imprimir Tirilla
            </button>
            <button type="button" className="btn-pos-close" onClick={onClose} title="Cerrar ventana">
              ✕
            </button>
          </div>
        </div>

        {/* Contenedor del comprobante térmico */}
        <div className="impresion-pos-body">
          {loading && (
            <div className="pos-loading-box">
              <div className="spinner"></div>
              <p>Cargando datos del comprobante...</p>
            </div>
          )}

          {error && (
            <div className="pos-error-box">
              <p>❌ {error}</p>
              <button type="button" className="btn-confirm-cancel" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}

          {doc && !loading && !error && (
            <div className="pos-ticket-paper" id="pos-ticket-printable">
              {/* Encabezado del Ticket con Logo */}
              <div className="pos-ticket-header">
                <div className="pos-logo-wrapper">
                  <img src="/LogoHotel.png" alt="Logo Hotel" className="pos-logo-img" />
                </div>
                <div className="pos-divider-dashed"></div>

                <h2 className="pos-doc-main-title">{doc.titulo}</h2>
                <div className="pos-divider-double"></div>

                <div className="pos-info-block">
                  <div className="pos-info-row">
                    <span className="pos-label">{doc.tipoNombre.toUpperCase()}:</span>
                    <span className="pos-value bold">{doc.numeroDoc}</span>
                  </div>
                  {doc.autorizacion && (
                    <div className="pos-info-row">
                      <span className="pos-label">AUTORIZACIÓN DIAN:</span>
                      <span className="pos-value">{doc.autorizacion}</span>
                    </div>
                  )}
                  <div className="pos-info-row">
                    <span className="pos-label">FECHA:</span>
                    <span className="pos-value">{doc.fecha}</span>
                  </div>
                  <div className="pos-info-row">
                    <span className="pos-label">HORA:</span>
                    <span className="pos-value">{doc.hora}</span>
                  </div>
                  {doc.habitacionNumero && (
                    <div className="pos-info-row pos-hab-row">
                      <span className="pos-label">HABITACIÓN:</span>
                      <span className="pos-value bold text-large">Habitación {doc.habitacionNumero}</span>
                    </div>
                  )}
                  <div className="pos-info-row">
                    <span className="pos-label">HUÉSPED:</span>
                    <span className="pos-value bold">{doc.huesped}</span>
                  </div>
                  {doc.documento && (
                    <div className="pos-info-row">
                      <span className="pos-label">NIT / C.C.:</span>
                      <span className="pos-value">{doc.documento}</span>
                    </div>
                  )}
                  {doc.celular && (
                    <div className="pos-info-row">
                      <span className="pos-label">TELÉFONO:</span>
                      <span className="pos-value">{doc.celular}</span>
                    </div>
                  )}
                  {doc.ciudad && (
                    <div className="pos-info-row">
                      <span className="pos-label">CIUDAD:</span>
                      <span className="pos-value">{doc.ciudad}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pos-divider-solid"></div>

              {/* Tabla de Items */}
              <div className="pos-table-container">
                <table className="pos-items-table">
                  <thead>
                    <tr>
                      <th className="pos-col-desc">DESC</th>
                      <th className="pos-col-cant">CANT</th>
                      <th className="pos-col-total">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pos-col-desc">
                          <div className="pos-item-desc">{item.descripcion}</div>
                          {item.cantidad > 1 && (
                            <small className="pos-item-unit-calc">
                              {item.cantidad} x {formatMoney(item.precioUnitario)}
                            </small>
                          )}
                        </td>
                        <td className="pos-col-cant">{item.cantidad}</td>
                        <td className="pos-col-total bold">{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pos-divider-solid"></div>

              {/* Totales y Forma de Pago */}
              <div className="pos-totals-block">
                <div className="pos-total-row">
                  <span>SUBTOTAL:</span>
                  <span>{formatMoney(doc.subtotal)}</span>
                </div>
                {doc.ivaTotal > 0 && (
                  <div className="pos-total-row">
                    <span>IVA INCLUIDO:</span>
                    <span>{formatMoney(doc.ivaTotal)}</span>
                  </div>
                )}
                <div className="pos-divider-dashed"></div>
                <div className="pos-total-row pos-grand-total">
                  <span>TOTAL:</span>
                  <span>{formatMoney(doc.totalPagar)}</span>
                </div>
                <div className="pos-divider-dashed"></div>

                {doc.formasPago && doc.formasPago.length > 0 ? (
                  <div className="pos-payment-breakdown" style={{ marginTop: '4px' }}>
                    <div className="pos-total-row">
                      <span className="bold">FORMAS DE PAGO:</span>
                    </div>
                    {doc.formasPago.map((fp, i) => (
                      <div key={i} className="pos-total-row" style={{ paddingLeft: '6px', fontSize: '9pt' }}>
                        <span>• {fp.nombre}:</span>
                        <span className="bold">{formatMoney(fp.monto)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pos-total-row pos-payment-method">
                    <span className="bold">FORMA DE PAGO:</span>
                    <span className="bold pos-payment-badge">{doc.formaPago.toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="pos-divider-double"></div>

              {/* Sección de Firma del Huésped */}
              <div className="pos-signature-block">
                <p className="pos-sign-notice">Acepto los consumos y servicios prestados:</p>
                <div className="pos-signature-line"></div>
                <p className="pos-sign-label bold">FIRMA DEL HUÉSPED</p>
                <p className="pos-sign-sublabel">C.C. / Doc: {doc.documento || '____________________'}</p>
              </div>

              <div className="pos-divider-dashed"></div>

              {/* Pie de página */}
              <div className="pos-ticket-footer">
                <p className="pos-footer-msg">Favor revisar su comprobante antes de retirarse.</p>
                <p className="pos-footer-thanks bold">¡Gracias por su estadía!</p>
                <p className="pos-footer-system">Software  SYSplus Cel. 320 7376878</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
