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
    window.print();
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
                <p className="pos-footer-system">SYSplus Cloud POS v1.0</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
