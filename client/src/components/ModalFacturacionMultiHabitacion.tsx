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
  subHuesped?: string;
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
  const [totalAbonosConsolidados, setTotalAbonosConsolidados] = useState<number>(0);
  const [cantidadAbonos, setCantidadAbonos] = useState<number>(0);
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [clienteNit, setClienteNit] = useState<string>('');

  // Impresión
  const [impresionData, setImpresionData] = useState<{ tipo: 'FACTURA' | 'REMISION'; idDoc: number } | null>(null);

  const formatMoney = (amount?: number | string) => {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
    if (isNaN(num)) return '$ 0';
    return `$ ${Math.round(num).toLocaleString('es-CO')}`;
  };

  // Control de carga para evitar recargas automáticas por re-render del padre (temporizador de 30s)
  const habitacionIdsKey = habitaciones.map((h) => h.id).sort().join(',');
  const loadedKeyRef = React.useRef<string>('');

  useEffect(() => {
    if (!isOpen || habitaciones.length === 0) {
      loadedKeyRef.current = '';
      return;
    }

    // Si ya se cargaron los datos para esta sesión de facturación con estas habitaciones, no re-cargar
    if (loadedKeyRef.current === habitacionIdsKey) {
      return;
    }

    loadedKeyRef.current = habitacionIdsKey;

    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('hotel_token');

      try {
        // 1. Cargar prefijos y formas de pago
        const [resPref, resFormas] = await Promise.all([
          fetch('/api/pedidos/prefijos-factura', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/abonos/formas-pago', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (resPref.ok) {
          const prefData = await resPref.json();
          setPrefijosFactura(prefData);
          const defaultPref = prefData.find((p: any) => p.activo)?.prefijo || prefData[0]?.prefijo || 'SETT';
          setSelectedPrefijo(defaultPref);
        }

        let loadedFormas: FormaPagoItem[] = [];
        if (resFormas.ok) {
          const fData = await resFormas.json();
          loadedFormas = Array.isArray(fData) ? fData : (fData?.formasPago || []);
          if (Array.isArray(loadedFormas) && loadedFormas.length > 0) {
            setFormasPago(loadedFormas);
          }
        }

        // 2. Cargar detalles y abonos de cada habitación seleccionada
        const todosLosItems: ItemConsolidado[] = [];
        let autoObsHab = `Factura Consolidada Habitaciones: ${habitaciones.map((h) => h.numero).join(', ')}`;
        let abonosAcumulados = 0;
        let conteoAbonos = 0;

        let detectedDoc = '';
        let detectedNom = '';

        for (const hab of habitaciones) {
          if (hab.documento && hab.documento !== 'Sin documento' && hab.documento !== '800003122') {
            detectedDoc = hab.documento;
            detectedNom = hab.huesped || detectedNom;
          }

          try {
            // Consultar datos de la habitación
            const resHab = await fetch(`/api/habitaciones/${hab.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            let roomSubHuesped = hab.observaciones || hab.huesped || '';

            if (resHab.ok) {
              const dataHab = await resHab.json();
              const hNum = String(hab.numero || hab.id);
              roomSubHuesped = dataHab.notas || dataHab.subHuesped || dataHab.observaciones || dataHab.huesped || roomSubHuesped;

              if (dataHab.documento && dataHab.documento !== 'Sin documento' && dataHab.documento !== '800003122') {
                detectedDoc = dataHab.documento;
                detectedNom = dataHab.huesped || detectedNom;
              }

              const roomItems = dataHab.items || (dataHab.movimientos && dataHab.movimientos[0]?.items) || [];
              if (roomItems.length > 0) {
                roomItems.forEach((it: any) => {
                  const cant = Number(it.cantidad || it.DIWD_CANT || 1);
                  const prunit = Number(it.precio || it.DIWD_COSTO || it.DIWD_PRUNIT || 0);
                  const dto = Number(it.descuento || it.DIWD_DTOMONTO || 0);
                  const total = it.subtotal ? Number(it.subtotal) : (it.DIWD_TOTAL ? Number(it.DIWD_TOTAL) : (cant * prunit - dto));
                  const itemObs = it.DIWD_OBS || it.obs || roomSubHuesped;

                  todosLosItems.push({
                    id: it.id || it.DIWD_ITEM || Date.now() + Math.random(),
                    habId: hab.id,
                    habNumero: hNum,
                    subHuesped: itemObs,
                    articulo: it.articulo || it.DIWD_ARTICULO || '001',
                    descripcion: String(it.articulo || it.DIWD_DESCART || it.DIWD_ARTICULO || 'Consumo').trim(),
                    cantidad: cant,
                    precio: prunit,
                    descuento: dto,
                    ivaPorc: Number(it.ivaPorc || it.DIWD_IVAPORC || 0),
                    subtotal: total,
                  });
                });
              } else if (dataHab.precioNoche && Number(dataHab.precioNoche) > 0) {
                const pNoche = Number(dataHab.precioNoche);
                todosLosItems.push({
                  id: 1,
                  habId: hab.id,
                  habNumero: hNum,
                  subHuesped: roomSubHuesped,
                  articulo: dataHab.artiCod || '001',
                  descripcion: `Hospedaje Habitación ${hNum}`,
                  cantidad: 1,
                  precio: pNoche,
                  descuento: 0,
                  ivaPorc: 0,
                  subtotal: pNoche,
                });
              }
            }

            // Consultar abonos asociados a esta habitación
            const resAbono = await fetch(`/api/abonos/habitacion/${hab.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resAbono.ok) {
              const abonoData = await resAbono.json();
              const validAbonos = (abonoData.abonos || []).filter((a: any) => !a.anulado);
              conteoAbonos += validAbonos.length;
              abonosAcumulados += (abonoData.totalAbonado || 0);

              if (validAbonos.length > 0 && !detectedDoc) {
                for (const vab of validAbonos) {
                  if (vab.nit && vab.nit !== '800003122') {
                    detectedDoc = vab.nit;
                    detectedNom = vab.cliente || detectedNom;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Error cargando detalles o abonos de hab ${hab.numero}:`, e);
          }
        }

        setClienteNit(detectedDoc || (habitaciones[0]?.documento && habitaciones[0]?.documento !== 'Sin documento' ? habitaciones[0]?.documento : ''));
        setClienteNombre(detectedNom || (habitaciones[0]?.huesped && habitaciones[0]?.huesped !== 'Huésped Consolidado' ? habitaciones[0]?.huesped : ''));

        setItemsConsolidados(todosLosItems);
        setObservaciones(autoObsHab);
        setTotalAbonosConsolidados(abonosAcumulados);
        setCantidadAbonos(conteoAbonos);

        // Inicializar línea de pago con el saldo neto a pagar tras restar abonos
        const totalCalculado = todosLosItems.reduce((acc, it) => acc + it.subtotal, 0);
        const saldoNeto = Math.max(0, totalCalculado - abonosAcumulados);

        if (saldoNeto > 0) {
          setLineasPago([
            {
              id: 1,
              formaPagoId: loadedFormas[0]?.id || 1, // Efectivo o primera forma
              monto: saldoNeto,
            },
          ]);
        } else {
          setLineasPago([]);
        }
      } catch (err: any) {
        setError(err.message || 'Error al preparar la facturación consolidada');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [isOpen, habitacionIdsKey]);

  // Cálculos financieros
  const totalSubtotal = itemsConsolidados.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  const totalDescuentos = itemsConsolidados.reduce((acc, it) => acc + it.descuento, 0);
  const totalFactura = itemsConsolidados.reduce((acc, it) => acc + it.subtotal, 0);
  const saldoNetoAPagar = Math.max(0, totalFactura - totalAbonosConsolidados);
  const totalPagadoEnFormas = lineasPago.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const saldoDiferencia = saldoNetoAPagar - totalPagadoEnFormas;

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
    if (saldoNetoAPagar > 0 && Math.abs(saldoDiferencia) > 1) {
      alert(`⚠️ El total de las formas de pago (${formatMoney(totalPagadoEnFormas)}) no coincide con el saldo neto a pagar (${formatMoney(saldoNetoAPagar)}).`);
      return;
    }

    const mensajeConfirm = totalAbonosConsolidados > 0
      ? `¿Confirmas generar una única FACTURA DE VENTA para las habitaciones ${habitaciones.map((h) => h.numero).join(', ')} por un total de ${formatMoney(totalFactura)} (Abonos aplicados: ${formatMoney(totalAbonosConsolidados)} · Saldo a cobrar: ${formatMoney(saldoNetoAPagar)})?`
      : `¿Confirmas generar una única FACTURA DE VENTA para las habitaciones ${habitaciones.map((h) => h.numero).join(', ')} por un total de ${formatMoney(totalFactura)}?`;

    if (!window.confirm(mensajeConfirm)) {
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
          nit: clienteNit || undefined,
          nombreCliente: clienteNombre || undefined,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        data = { error: text || `Error en el servidor (${res.status} ${res.statusText})` };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la factura consolidada');
      }

      // Abrir modal de impresión POS si se generó documento
      if (data.idDoc) {
        setImpresionData({
          tipo: 'FACTURA',
          idDoc: data.idDoc,
        });
      } else {
        onFacturaCompletada();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al generar la factura consolidada');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const displayHuesped = clienteNombre || habitaciones[0]?.huesped || 'Huésped Consolidado';
  const displayDoc = clienteNit || habitaciones[0]?.documento || 'Sin documento';

  return (
    <div className="modal-backdrop" style={{ zIndex: 1050 }}>
      <div
        className="modal-card-dialog modal-card-large"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
      >
        {/* Overlay de Carga durante Facturación Consolidada */}
        {processing && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            color: '#ffffff',
            backdropFilter: 'blur(3px)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(255,255,255,0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '16px'
            }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>Generando Factura Consolidada...</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>Por favor espere mientras se graban las habitaciones y se sincroniza la contabilidad en Firebird.</p>
          </div>
        )}

        <div className="modal-dialog-header">
          <div className="header-title-box">
            <h2 className="modal-dialog-title">
              🧾 Facturación Consolidada de Múltiples Habitaciones
            </h2>
            <span className="badge-pewe-modal" style={{ background: '#2563eb' }}>
              Habitaciones: {habitaciones.map((h) => `#${h.numero}`).join(' · ')}
            </span>
          </div>
          <button
            type="button"
            className="btn-modal-close-x"
            onClick={onClose}
            disabled={processing}
            title="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="modal-action-feedback error" style={{ margin: '14px 28px 0 28px' }}>
            <span>⚠️ {error}</span>
            <button className="btn-close-feedback" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="modal-loading" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p>Consolidando consumos y abonos de las habitaciones seleccionadas...</p>
          </div>
        ) : (
          <div
            className="modal-dialog-body"
            style={{
              overflowY: 'auto',
              maxHeight: 'calc(92vh - 80px)',
              padding: '16px 28px 20px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Banner del Huésped / Empresa */}
            <div className="multi-guest-header-card">
              <div className="guest-col">
                <span className="guest-label">👤 Huésped / Cliente Principal:</span>
                <span className="guest-val">{displayHuesped}</span>
              </div>
              <div className="guest-col">
                <span className="guest-label">🪪 NIT / C.C:</span>
                <span className="guest-val">{displayDoc}</span>
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
                        <th>Habitación / Subhuésped</th>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="badge-hab-tag" style={{ width: 'fit-content' }}>Hab. {it.habNumero}</span>
                              {it.subHuesped && (
                                <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>
                                  👤 {it.subHuesped}
                                </span>
                              )}
                            </div>
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
                  <div className="totals-row">
                    <span>Total Factura:</span>
                    <strong>{formatMoney(totalFactura)}</strong>
                  </div>
                  {totalAbonosConsolidados > 0 && (
                    <div className="totals-row" style={{ color: '#059669', fontWeight: 600 }}>
                      <span>(-) Abonos Registrados ({cantidadAbonos}):</span>
                      <strong>-{formatMoney(totalAbonosConsolidados)}</strong>
                    </div>
                  )}
                  <div className="totals-row grand-total-row">
                    <span>Saldo Neto a Pagar:</span>
                    <span className="grand-total-amount">{formatMoney(saldoNetoAPagar)}</span>
                  </div>
                </div>

                <h3 className="modal-section-subtitle" style={{ marginTop: '12px' }}>
                  💳 Formas de Pago {totalAbonosConsolidados > 0 && <span style={{ fontSize: '11px', color: '#059669', fontWeight: 'normal' }}>(por el saldo neto)</span>}
                </h3>

                {saldoNetoAPagar === 0 ? (
                  <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '8px', color: '#065f46', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
                    ✅ El total de la factura está 100% cubierto con los abonos registrados. No se requieren formas de pago adicionales.
                  </div>
                ) : (
                  <>
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
                            type="text"
                            inputMode="numeric"
                            className="modal-form-input payment-amount-input"
                            value={p.monto ? Number(p.monto).toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              handleUpdateLineaPago(p.id, 'monto', raw ? parseFloat(raw) : 0);
                            }}
                            placeholder="Monto"
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
                  </>
                )}
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
                disabled={processing || itemsConsolidados.length === 0 || (saldoNetoAPagar > 0 && Math.abs(saldoDiferencia) > 1)}
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
            onFacturaCompletada();
            onClose();
          }}
        />
      )}
    </div>
  );
};
