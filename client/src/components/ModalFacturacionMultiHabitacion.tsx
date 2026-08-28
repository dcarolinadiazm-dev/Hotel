import React, { useState, useEffect } from 'react';
import type { Habitacion } from './Habitaciones';
import { ModalImpresionPOS } from './ModalImpresionPOS';

interface ModalFacturacionMultiHabitacionProps {
  isOpen: boolean;
  habitaciones: Habitacion[];
  onClose: () => void;
  onFacturaCompletada: () => void;
}

interface ItemConsolidado {
  id: number;
  habId: string;
  habNumero: string;
  articulo: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento: number;
  ivaPorc: number;
  subtotal: number;
}

interface FormaPagoItem {
  id: number;
  nombre: string;
}

interface LineaPago {
  id: number;
  formaPagoId: number;
  monto: number;
}

interface PrefijoFactura {
  prefijo: string;
  actual: string;
  activo: boolean;
  ivaInc: boolean;
}

export const ModalFacturacionMultiHabitacion: React.FC<ModalFacturacionMultiHabitacionProps> = ({
  isOpen,
  habitaciones,
  onClose,
  onFacturaCompletada,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Datos consolidados
  const [itemsConsolidados, setItemsConsolidados] = useState<ItemConsolidado[]>([]);
  const [prefijosFactura, setPrefijosFactura] = useState<PrefijoFactura[]>([]);
  const [selectedPrefijo, setSelectedPrefijo] = useState<string>('SETT');
  const [formasPago, setFormasPago] = useState<FormaPagoItem[]>([]);
  const [lineasPago, setLineasPago] = useState<LineaPago[]>([]);
  const [observaciones, setObservaciones] = useState<string>('');

  // Impresión
  const [impresionData, setImpresionData] = useState<{ tipo: 'FACTURA' | 'REMISION'; idDoc: number } | null>(null);

  const formatMoney = (amount: number) => {
    return `$${Math.round(amount || 0).toLocaleString('es-CO')}`;
  };

  useEffect(() => {
    if (!isOpen || habitaciones.length === 0) return;

    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('hotel_token');

      try {
        // 1. Cargar prefijos y formas de pago
        const [resPref, resFormas] = await Promise.all([
          fetch('/api/pedidos/prefijos-factura', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/pagos/formas-pago', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (resPref.ok) {
          const prefData = await resPref.json();
          setPrefijosFactura(prefData);
          const defaultPref = prefData.find((p: any) => p.activo)?.prefijo || prefData[0]?.prefijo || 'SETT';
          setSelectedPrefijo(defaultPref);
        }

        if (resFormas.ok) {
          const fData = await resFormas.json();
          setFormasPago(fData);
        }

        // 2. Cargar detalles de cada habitación seleccionada
        const todosLosItems: ItemConsolidado[] = [];
        let autoObsHab = `Factura Consolidada Habitaciones: ${habitaciones.map((h) => h.numero).join(', ')}`;

        for (const hab of habitaciones) {
          try {
            const resHab = await fetch(`/api/habitaciones/${hab.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resHab.ok) {
              const dataHab = await resHab.json();
              const hNum = String(hab.numero || hab.id);

              // Si tiene items en pendingDetails o cart
              if (dataHab.pendingDetails && Array.isArray(dataHab.pendingDetails)) {
                dataHab.pendingDetails.forEach((it: any) => {
                  const cant = Number(it.DIWD_CANT || 1);
                  const prunit = Number(it.DIWD_COSTO || it.DIWD_PRUNIT || 0);
                  const dto = Number(it.DIWD_DTOMONTO || 0);
                  const total = it.DIWD_TOTAL ? Number(it.DIWD_TOTAL) : cant * prunit - dto;

                  todosLosItems.push({
                    id: it.DIWD_ITEM || Date.now() + Math.random(),
                    habId: hab.id,
                    habNumero: hNum,
                    articulo: it.DIWD_ARTICULO || '001',
                    descripcion: String(it.DIWD_DESCART || it.DIWD_ARTICULO || 'Consumo').trim(),
                    cantidad: cant,
                    precio: prunit,
                    descuento: dto,
                    ivaPorc: Number(it.DIWD_IVAPORC || 0),
                    subtotal: total,
                  });
                });
              }
            }
          } catch (e) {
            console.error(`Error cargando detalles de hab ${hab.numero}:`, e);
          }
        }

        setItemsConsolidados(todosLosItems);
        setObservaciones(autoObsHab);

        // Inicializar línea de pago con el total calculado
        const totalCalculado = todosLosItems.reduce((acc, it) => acc + it.subtotal, 0);
        setLineasPago([
          {
            id: 1,
            formaPagoId: 1, // Efectivo
            monto: totalCalculado,
          },
        ]);
      } catch (err: any) {
        setError(err.message || 'Error al preparar la facturación consolidada');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [isOpen, habitaciones]);

  // Cálculos financieros
  const totalSubtotal = itemsConsolidados.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  const totalDescuentos = itemsConsolidados.reduce((acc, it) => acc + it.descuento, 0);
  const totalFactura = itemsConsolidados.reduce((acc, it) => acc + it.subtotal, 0);
  const totalPagadoEnFormas = lineasPago.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const saldoDiferencia = totalFactura - totalPagadoEnFormas;

  // Manejo de formas de pago múltiples
  const handleAddLineaPago = () => {
    const restante = Math.max(0, saldoDiferencia);
    setLineasPago((prev) => [
      ...prev,
      {
        id: Date.now(),
        formaPagoId: formasPago[0]?.id || 1,
        monto: restante,
      },
    ]);
  };

  const handleUpdateLineaPago = (id: number, field: 'formaPagoId' | 'monto', value: any) => {
    setLineasPago((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            [field]: field === 'formaPagoId' ? parseInt(value, 10) || 1 : parseFloat(value) || 0,
          };
        }
        return p;
      })
    );
  };

  const handleRemoveLineaPago = (id: number) => {
    if (lineasPago.length <= 1) return;
    setLineasPago((prev) => prev.filter((p) => p.id !== id));
  };

  // Enviar Factura Consolidada
  const handleGenerarFacturaConsolidada = async () => {
    if (Math.abs(saldoDiferencia) > 1) {
      alert(`⚠️ El total de las formas de pago (${formatMoney(totalPagadoEnFormas)}) no coincide con el total de la factura (${formatMoney(totalFactura)}).`);
      return;
    }

    if (!window.confirm(`¿Confirmas generar una única FACTURA DE VENTA para las habitaciones ${habitaciones.map((h) => h.numero).join(', ')} por un total de ${formatMoney(totalFactura)}?`)) {
      return;
    }

    setProcessing(true);
    setError(null);
    const token = localStorage.getItem('hotel_token');

    try {
      const res = await fetch('/api/pedidos/enviar-facturar-multiples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionesIds: habitaciones.map((h) => h.id),
          prefijo: selectedPrefijo,
          formaPagoId: lineasPago[0]?.formaPagoId || 1,
          pagos: lineasPago,
          observaciones,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la factura consolidada');
      }

      // Abrir modal de impresión POS
      if (data.idDoc) {
        setImpresionData({
          tipo: 'FACTURA',
          idDoc: data.idDoc,
        });
      }

      onFacturaCompletada();
    } catch (err: any) {
      setError(err.message || 'Error inesperado al generar la factura consolidada');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const primerHuesped = habitaciones[0]?.huesped || 'Huésped Consolidado';
  const primerDoc = habitaciones[0]?.documento || 'Sin documento';

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-container modal-multi-hab-container">
        <div className="modal-header-multi">
          <div className="modal-header-info">
            <h2 className="modal-title-multi">
              🧾 Facturación Consolidada de Múltiples Habitaciones
            </h2>
            <span className="modal-subtitle-multi">
              Habitaciones seleccionadas: <strong>{habitaciones.map((h) => `#${h.numero}`).join(' · ')}</strong>
            </span>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} disabled={processing}>
            ✕
          </button>
        </div>

        {error && (
          <div className="modal-error-banner" style={{ margin: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="rooms-loading-state" style={{ padding: '40px' }}>
            <div className="spinner"></div>
            <p>Consolidando consumos de las habitaciones seleccionadas...</p>
          </div>
        ) : (
          <div className="modal-multi-content-body">
            {/* Banner del Huésped / Empresa */}
            <div className="multi-guest-header-card">
              <div className="guest-col">
                <span className="guest-label">👤 Huésped / Cliente:</span>
                <span className="guest-val">{primerHuesped}</span>
              </div>
              <div className="guest-col">
                <span className="guest-label">🪪 NIT / C.C:</span>
                <span className="guest-val">{primerDoc}</span>
              </div>
              <div className="guest-col">
                <span className="guest-label">🏨 Total Habitaciones:</span>
                <span className="guest-val">{habitaciones.length} Habitaciones</span>
              </div>
            </div>

            {/* Tabla Detalle Consolidado de Todas las Habitaciones */}
            <div className="multi-items-section">
              <h3 className="modal-section-subtitle">
                📦 Detalle de Consumos y Noches por Habitación ({itemsConsolidados.length} ítems)
              </h3>

              {itemsConsolidados.length === 0 ? (
                <div className="modal-cart-empty">
                  No hay consumos pendientes registrados en las habitaciones seleccionadas.
                </div>
              ) : (
                <div className="multi-items-table-wrapper">
                  <table className="multi-items-table">
                    <thead>
                      <tr>
                        <th>Habitación</th>
                        <th>Concepto / Artículo</th>
                        <th style={{ textAlign: 'center' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsConsolidados.map((it, idx) => (
                        <tr key={`${it.habId}-${it.id}-${idx}`}>
                          <td>
                            <span className="badge-hab-tag">Hab. {it.habNumero}</span>
                          </td>
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>
                            {it.descripcion}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {it.cantidad}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {formatMoney(it.precio)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {formatMoney(it.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Opciones de Facturación y Formas de Pago */}
            <div className="multi-billing-options-grid">
              {/* Columna Izquierda: Prefijo y Observaciones */}
              <div className="billing-config-card">
                <h3 className="modal-section-subtitle">⚙️ Configuración de Factura</h3>

                <div className="modal-form-group">
                  <label className="modal-form-label">Prefijo de Facturación (TIDO 31):</label>
                  <select
                    className="modal-form-select"
                    value={selectedPrefijo}
                    onChange={(e) => setSelectedPrefijo(e.target.value)}
                  >
                    {prefijosFactura.map((p) => (
                      <option key={p.prefijo} value={p.prefijo}>
                        {p.prefijo} (Consecutivo actual: {p.actual}) {p.activo ? '· [ACTIVO]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-form-group" style={{ marginTop: '10px' }}>
                  <label className="modal-form-label">Observaciones en Factura:</label>
                  <textarea
                    className="modal-form-input"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas u observaciones de la factura consolidada..."
                  />
                </div>
              </div>

              {/* Columna Derecha: Formas de Pago y Resumen de Totales */}
              <div className="billing-payments-card">
                <div className="multi-totals-summary-box">
                  <div className="totals-row">
                    <span>Subtotal Consumos:</span>
                    <strong>{formatMoney(totalSubtotal)}</strong>
                  </div>
                  {totalDescuentos > 0 && (
                    <div className="totals-row discount-row">
                      <span>Descuentos:</span>
                      <strong>-{formatMoney(totalDescuentos)}</strong>
                    </div>
                  )}
                  <div className="totals-row grand-total-row">
                    <span>Total Factura:</span>
                    <span className="grand-total-amount">{formatMoney(totalFactura)}</span>
                  </div>
                </div>

                <h3 className="modal-section-subtitle" style={{ marginTop: '12px' }}>
                  💳 Formas de Pago
                </h3>

                <div className="payment-lines-list">
                  {lineasPago.map((p) => (
                    <div key={p.id} className="payment-line-row">
                      <select
                        className="modal-form-select payment-select"
                        value={p.formaPagoId}
                        onChange={(e) => handleUpdateLineaPago(p.id, 'formaPagoId', e.target.value)}
                      >
                        {formasPago.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nombre}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        className="modal-form-input payment-amount-input"
                        value={p.monto || ''}
                        onChange={(e) => handleUpdateLineaPago(p.id, 'monto', e.target.value)}
                        placeholder="Monto"
                        min="0"
                      />

                      {lineasPago.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-payment-line"
                          onClick={() => handleRemoveLineaPago(p.id)}
                          title="Eliminar forma de pago"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="payment-actions-bar">
                  <button
                    type="button"
                    className="btn-add-payment-line"
                    onClick={handleAddLineaPago}
                    disabled={saldoDiferencia <= 0}
                  >
                    + Agregar otra forma de pago
                  </button>

                  <div className="payment-balance-badge" style={{ color: Math.abs(saldoDiferencia) < 1 ? '#059669' : '#dc2626' }}>
                    {Math.abs(saldoDiferencia) < 1
                      ? '✅ Pagos cuadrados al 100%'
                      : saldoDiferencia > 0
                      ? `Faltan: ${formatMoney(saldoDiferencia)}`
                      : `Excedente: ${formatMoney(Math.abs(saldoDiferencia))}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="modal-footer-multi">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={onClose}
                disabled={processing}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-modal-confirm-multi"
                onClick={handleGenerarFacturaConsolidada}
                disabled={processing || itemsConsolidados.length === 0 || Math.abs(saldoDiferencia) > 1}
              >
                {processing
                  ? 'Generando Factura en Firebird...'
                  : `🧾 Generar Factura Consolidada (${formatMoney(totalFactura)})`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Impresión POS */}
      {impresionData && (
        <ModalImpresionPOS
          tipoDoc={impresionData.tipo}
          idDoc={impresionData.idDoc}
          habitacionNumero={habitaciones.map((h) => h.numero).join(', ')}
          onClose={() => {
            setImpresionData(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};
