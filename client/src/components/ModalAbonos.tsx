import React, { useState, useEffect } from 'react';

interface FormaPago {
  id: number;
  nombre: string;
  consigna: boolean;
  ctaBanco?: number;
  prefBanco?: string;
  codDian?: string;
}

interface AbonoItem {
  itemId?: number;
  anclId: number;
  anclNumero: string;
  recaId: number;
  recaNumero: string;
  fecha: string;
  monto: number;
  concepto: string;
  anulado: boolean;
  nit: string;
  cliente: string;
  fopaId: number;
  formaPago: string;
  banco: string;
  cuenta: string;
  comprobante: string;
}

interface ModalAbonosProps {
  habitacionId: string;
  habitacionNumero: string;
  huesped: string;
  documento: string;
  onClose: () => void;
  onAbonoRegistrado?: () => void;
}

export const ModalAbonos: React.FC<ModalAbonosProps> = ({
  habitacionId,
  habitacionNumero,
  huesped,
  documento,
  onClose,
  onAbonoRegistrado,
}) => {
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [abonos, setAbonos] = useState<AbonoItem[]>([]);
  const [totalAbonado, setTotalAbonado] = useState(0);

  // Form states
  const [selectedFopaId, setSelectedFopaId] = useState<number>(1);
  const [monto, setMonto] = useState<string>('');
  const [concepto, setConcepto] = useState<string>(`ABONO RESERVA HABITACION ${habitacionNumero}`);
  const [comprobanteNumero, setComprobanteNumero] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchFormasPago = async () => {
    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch('/api/abonos/formas-pago', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFormasPago(data);
        if (data.length > 0 && !selectedFopaId) {
          setSelectedFopaId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error al cargar formas de pago:', err);
    }
  };

  const fetchAbonos = async () => {
    const token = localStorage.getItem('hotel_token');
    try {
      const url = documento
        ? `/api/abonos/habitacion/${habitacionId}?nit=${encodeURIComponent(documento)}`
        : `/api/abonos/habitacion/${habitacionId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAbonos(data.abonos || []);
        setTotalAbonado(data.totalAbonado || 0);
      }
    } catch (err) {
      console.error('Error al cargar abonos:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchFormasPago(), fetchAbonos()]);
      setLoading(false);
    };
    loadAll();
  }, [habitacionId, documento]);

  const selectedForma = formasPago.find((f) => f.id === selectedFopaId);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMonto = parseFloat(monto.replace(/\./g, '').replace(/,/g, ''));
    if (!cleanMonto || isNaN(cleanMonto) || cleanMonto <= 0) {
      setFeedback({ type: 'error', message: 'Por favor ingrese un monto válido mayor a 0.' });
      return;
    }

    if (!documento || !documento.trim()) {
      setFeedback({
        type: 'error',
        message: 'La reserva no tiene un documento/NIT de cliente registrado.',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    const token = localStorage.getItem('hotel_token');

    try {
      const res = await fetch('/api/abonos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idHabitacion: habitacionId,
          tercNit: documento,
          nombreCliente: huesped,
          monto: cleanMonto,
          fopaId: selectedFopaId,
          concepto: concepto || `ABONO RESERVA HABITACION ${habitacionNumero}`,
          comprobanteNumero: comprobanteNumero || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `✅ Abono #${data.data?.itemId || ''} de ${formatMoney(cleanMonto)} registrado con éxito (Recibo #${data.data?.recaNumero} / Anticipo #${data.data?.anclNumero})`,
        });
        setMonto('');
        setComprobanteNumero('');
        await fetchAbonos();
        if (onAbonoRegistrado) onAbonoRegistrado();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Error al registrar abono en el sistema.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAnularAbono = async (abono: AbonoItem) => {
    const confirmMsg = `¿Estás seguro de anular el Abono ${abono.itemId ? `#${abono.itemId} ` : ''}por valor de ${formatMoney(abono.monto)} (Recibo #${abono.recaNumero})?\n\nEl recibo y el anticipo quedarán anulados en Firebird.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingId(abono.anclId);
    setFeedback(null);
    const token = localStorage.getItem('hotel_token');

    try {
      const res = await fetch(`/api/abonos/${abono.anclId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `✅ Abono anulado correctamente.`,
        });
        await fetchAbonos();
        if (onAbonoRegistrado) onAbonoRegistrado();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Error al anular el abono.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al anular abono.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card-dialog modal-abonos-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-dialog-header">
          <div className="header-title-box">
            <h2 className="modal-dialog-title">
              💳 Abonos y Anticipos - Habitación {habitacionNumero}
            </h2>
            <span className="badge-pewe-modal" title="Huésped vinculado">
              👤 {huesped || 'Cliente'} (NIT: {documento || 'Sin doc'})
            </span>
          </div>
          <button className="btn-modal-close-x" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`modal-action-feedback ${feedback.type}`} style={{ margin: '14px 24px 0 24px' }}>
            <span>{feedback.message}</span>
            <button className="btn-close-feedback" onClick={() => setFeedback(null)}>
              ✕
            </button>
          </div>
        )}

        <div className="modal-abonos-body">
          {/* Formulario de Registro de Abono */}
          <form className="modal-abono-form-card" onSubmit={handleSubmit}>
            <h3 className="modal-section-subtitle" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>➕</span> Registrar Nuevo Abono
            </h3>

            <div className="abono-inputs-row">
              <div className="modal-form-group flex-1">
                <label className="modal-form-label">Monto del Abono ($) *:</label>
                <input
                  type="number"
                  className="modal-form-input abono-monto-input"
                  placeholder="Ej: 50.000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  min="1"
                  required
                  autoFocus
                />
              </div>

              <div className="modal-form-group flex-1">
                <label className="modal-form-label">Forma de Pago *:</label>
                <select
                  className="modal-form-select"
                  value={selectedFopaId}
                  onChange={(e) => setSelectedFopaId(Number(e.target.value))}
                  required
                >
                  {formasPago.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} {f.consigna ? '🏦 (Consignación)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedForma?.consigna && (
                <div className="modal-form-group flex-1">
                  <label className="modal-form-label">N° Comprobante / Transacción:</label>
                  <input
                    type="text"
                    className="modal-form-input"
                    placeholder="Opcional (Ej: 000123)"
                    value={comprobanteNumero}
                    onChange={(e) => setComprobanteNumero(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Concepto / Observaciones:</label>
              <input
                type="text"
                className="modal-form-input"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Detalle o concepto del anticipo..."
              />
            </div>

            <div className="abono-btn-submit-row">
              <button
                type="submit"
                className="btn-modal-save-abono"
                disabled={saving || loading || !monto}
              >
                {saving ? 'Guardando en Firebird...' : '💾 Registrar Abono'}
              </button>
            </div>
          </form>

          {/* Historial de Abonos */}
          <div className="modal-abonos-history-card">
            <div className="history-header-row">
              <h3 className="modal-section-subtitle" style={{ margin: 0 }}>
                📋 Historial de Abonos ({abonos.length})
              </h3>
              <div className="total-abonado-badge">
                <span>Total Abonado:</span>
                <strong>{formatMoney(totalAbonado)}</strong>
              </div>
            </div>

            {loading ? (
              <p className="loading-subtext">Cargando abonos desde Firebird...</p>
            ) : abonos.length === 0 ? (
              <div className="empty-abonos-box">
                <span>💳</span>
                <p>No hay abonos registrados para esta reserva aún.</p>
              </div>
            ) : (
              <div className="table-responsive-abonos">
                <table className="abonos-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                      <th>Fecha</th>
                      <th>Recibo Caja</th>
                      <th>Anticipo</th>
                      <th>Forma de Pago</th>
                      <th>Concepto</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abonos.map((a, idx) => (
                      <tr key={a.anclId}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                          {a.itemId ?? idx + 1}
                        </td>
                        <td>{formatDate(a.fecha)}</td>
                        <td>
                          <span className="badge-reca">{a.recaNumero || `#${a.recaId}`}</span>
                        </td>
                        <td>
                          <span className="badge-ancl">{a.anclNumero || `#${a.anclId}`}</span>
                        </td>
                        <td>
                          <span className="badge-fopa">{a.formaPago}</span>
                          {a.comprobante && <small> ({a.comprobante})</small>}
                        </td>
                        <td className="cell-concepto" title={a.concepto}>
                          {a.concepto || 'Abono reserva'}
                        </td>
                        <td className="cell-monto" style={{ textAlign: 'right' }}>
                          <strong>{formatMoney(a.monto)}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-anular-abono-mini"
                            onClick={() => handleAnularAbono(a)}
                            disabled={deletingId === a.anclId}
                            title="Anular este abono en Firebird"
                          >
                            {deletingId === a.anclId ? '⏳' : '🗑️'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-abonos-footer">
          <button type="button" className="btn-modal-close-action" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
