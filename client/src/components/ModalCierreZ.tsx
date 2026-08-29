import React, { useState, useEffect } from 'react';
import type { ResumenCierreZData } from './ModalImpresionCierreZ';

interface ModalCierreZProps {
  idTurno: number;
  user?: { username: string };
  onClose: () => void;
  onCierreCompletado: (data: ResumenCierreZData) => void;
}

export const ModalCierreZ: React.FC<ModalCierreZProps> = ({
  idTurno,
  onClose,
  onCierreCompletado,
}) => {
  const [resumen, setResumen] = useState<ResumenCierreZData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);

  useEffect(() => {
    const fetchResumen = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/turnos/resumen-cierre/${idTurno}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al obtener resumen de Cierre Z');
        }
        setResumen(data);
      } catch (err: any) {
        setError(err.message || 'Error de conexión al obtener resumen');
      } finally {
        setLoading(false);
      }
    };

    fetchResumen();
  }, [idTurno]);

  const handleConfirmarCierre = async () => {
    if (!window.confirm('¿Está seguro de realizar el Cierre Z de este turno? Al confirmar se consolidarán los registros y se cerrará la sesión actual.')) {
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const res = await fetch('/api/turnos/cierre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idTurno,
          observaciones: observaciones.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar Cierre Z');
      }

      if (resumen) {
        const dataFinal: ResumenCierreZData = {
          ...resumen,
          fechaCierre: data.resultado.fechaCierre,
          observaciones: observaciones.trim() || undefined,
        };
        onCierreCompletado(dataFinal);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión al grabar el Cierre Z');
      setGuardando(false);
    }
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
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card-dialog modal-card-large"
        style={{ maxWidth: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header-custom" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', color: '#fff', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🔒</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Cierre Z de Turno #{idTurno}</h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>Consolidación de caja, formas de pago y facturación</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Body con scroll */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Calculando balance y recaudos del turno...</p>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && resumen && (
            <>
              {/* Metadatos del Turno */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>CAJERO / USUARIO</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>👤 {resumen.turno.usuario}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>FECHA APERTURA</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>⏱️ {formatFecha(resumen.turno.fechaApertura)}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>FECHA CIERRE (ESTIMADA)</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>🏁 {formatFecha(resumen.fechaCierre)}</span>
                </div>
              </div>

              {/* Tarjetas de Totales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>💵 Base Inicial</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e3a8a', marginTop: '4px' }}>
                    ${resumen.turno.base.toLocaleString('es-CO')}
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>🧾 Total Facturado</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#14532d', marginTop: '4px' }}>
                    ${resumen.totalVentasFacturadas.toLocaleString('es-CO')}
                  </div>
                </div>

                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b21a8' }}>💳 Total Recaudos</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#581c87', marginTop: '4px' }}>
                    ${resumen.totalRecaudadoPagos.toLocaleString('es-CO')}
                  </div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>💰 Efectivo Esperado</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                    ${resumen.totalEfectivoEsperado.toLocaleString('es-CO')}
                  </div>
                </div>
              </div>

              {/* Desglose de Formas de Pago */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💳 Recaudos por Forma de Pago
                </h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', fontWeight: 700 }}>
                        <th style={{ padding: '8px 12px' }}>Forma de Pago</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Transacciones</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.pagosPorForma.map((p) => (
                        <tr key={p.formaPagoId} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                            {p.nombreForma}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                            {p.cantidadTransacciones}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                            ${p.total.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rango de Facturación Emitida */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📑 Facturación Emitida en el Turno
                </h4>
                {resumen.facturasGeneradas && resumen.facturasGeneradas.length > 0 ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '8px 12px' }}>Prefijo</th>
                          <th style={{ padding: '8px 12px' }}>Rango de Consecutivos</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Cantidad</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Facturado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.facturasGeneradas.map((f, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>
                              {f.prefijo}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#334155' }}>
                              #{f.facturaInicial} hasta #{f.facturaFinal}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                              {f.cantidad}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                              ${f.total.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                    No se generaron facturas durante este turno.
                  </div>
                )}
              </div>

              {/* Estado de Habitaciones */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏨 Estado de Habitaciones al Cierre
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>🟢 DISPONIBLES</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#14532d' }}>{resumen.totalesHabitaciones.disponibles}</div>
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c' }}>🔴 OCUPADAS</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#7f1d1d' }}>{resumen.totalesHabitaciones.ocupadas}</div>
                  </div>
                  <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#a16207' }}>🟡 RESERVADAS</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#713f12' }}>{resumen.totalesHabitaciones.reservadas}</div>
                  </div>
                  <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>⚫ INHABILITADAS</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{resumen.totalesHabitaciones.inhabilitadas}</div>
                  </div>
                </div>
              </div>

              {/* Observaciones de Cierre */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  📝 Observaciones de Entrega de Turno (Opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Novedades para el siguiente recepcionista, arqueo de caja o dinero entregado..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmarCierre}
            disabled={loading || guardando || !resumen}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.25)' }}
          >
            {guardando ? 'Consolidando Cierre Z...' : '🔒 Confirmar y Grabar Cierre Z'}
          </button>
        </div>
      </div>
    </div>
  );
};
