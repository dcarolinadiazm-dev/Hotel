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
  const [modalDetalle, setModalDetalle] = useState<'abonosTurno' | 'efectivo' | 'consignaciones' | 'abonosAntiguos' | null>(null);

  useEffect(() => {
    const fetchResumen = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('hotel_token');
        const res = await fetch(`/api/turnos/resumen-cierre/${idTurno}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(`El servidor no devolvió una respuesta válida (${res.status} ${res.statusText}): ${text.slice(0, 80) || 'Sin datos'}`);
        }
        if (!res.ok) {
          throw new Error(data.error || `Error al obtener resumen de Cierre Z (${res.status})`);
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
      const token = localStorage.getItem('hotel_token');
      const res = await fetch('/api/turnos/cierre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          idTurno,
          observaciones: observaciones.trim() || undefined,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`El servidor no devolvió una respuesta válida (${res.status} ${res.statusText}): ${text.slice(0, 80) || 'Sin datos'}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Error al procesar Cierre Z (${res.status})`);
      }

      if (resumen) {
        const dataFinal: ResumenCierreZData = {
          ...resumen,
          fechaCierre: data.resultado?.fechaCierre || new Date().toISOString(),
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {/* FILA 1 */}
                {/* 1. Base Inicial */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#1e40af' }}>💵 Base Inicial</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e3a8a', marginTop: '4px' }}>
                    ${resumen.turno.base.toLocaleString('es-CO')}
                  </div>
                </div>

                {/* 2. Efectivo Esperado */}
                <div
                  style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onDoubleClick={() => setModalDetalle('efectivo')}
                  title="Haga doble clic para ver el detalle"
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e' }}>💰 Efectivo Esperado</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                    ${resumen.totalEfectivoEsperado.toLocaleString('es-CO')}
                  </div>
                </div>

                {/* 3. Consignaciones */}
                <div
                  style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onDoubleClick={() => setModalDetalle('consignaciones')}
                  title="Haga doble clic para ver el detalle"
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1' }}>🏦 Consignaciones</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0c4a6e', marginTop: '4px' }}>
                    ${(resumen.totalConsignaciones || 0).toLocaleString('es-CO')}
                  </div>
                </div>

                {/* 4. Cartera */}
                <div style={{ background: '#fdf4ff', border: '1px solid #e879f9', borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#86198f' }}>📋 Cartera</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#701a75', marginTop: '4px' }}>
                    ${(resumen.totalCartera || 0).toLocaleString('es-CO')}
                  </div>
                </div>

                {/* 5. Abonos del Turno */}
                <div
                  style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onDoubleClick={() => setModalDetalle('abonosTurno')}
                  title="Haga doble clic para ver el detalle"
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>📥 Abonos del Turno</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#115e59', marginTop: '4px' }}>
                    ${(resumen.totalAbonosTurno || 0).toLocaleString('es-CO')}
                  </div>
                </div>

                {/* FILA 2 */}
                {/* 6. Total Recaudos */}
                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b21a8' }}>💳 Total Recaudos</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#581c87', marginTop: '4px' }}>
                    ${resumen.totalRecaudadoPagos.toLocaleString('es-CO')}
                  </div>
                </div>

                {/* 7. Total Facturado */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>🧾 Total Facturado</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#14532d', marginTop: '4px' }}>
                    ${resumen.totalVentasFacturadas.toLocaleString('es-CO')}
                  </div>
                </div>

                {/* 8. Abonos Antiguos */}
                <div
                  style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onDoubleClick={() => setModalDetalle('abonosAntiguos')}
                  title="Haga doble clic para ver el detalle"
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c' }}>⏳ Abonos Antiguos</span>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#9a3412', marginTop: '4px' }}>
                    ${(resumen.totalAbonosAntiguos || 0).toLocaleString('es-CO')}
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
                    <tfoot>
                      {(() => {
                        const totalTransacciones = (resumen.pagosPorForma || []).reduce((acc, p) => acc + (Number(p.cantidadTransacciones) || 0), 0);
                        const totalVentas = (resumen.pagosPorForma || []).reduce((acc, p) => acc + (Number(p.total) || 0), 0);
                        return (
                          <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                            <td style={{ padding: '9px 12px', color: '#0f172a', fontWeight: 800 }}>
                              Total Recaudado
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', color: '#334155', fontWeight: 700 }}>
                              {totalTransacciones}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#047857', fontSize: '14px' }}>
                              ${totalVentas.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        );
                      })()}
                    </tfoot>
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

      {/* Modal Emergente de Detalle al dar Doble Clic */}
      {modalDetalle && resumen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
          onClick={() => setModalDetalle(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Detalle */}
            <div
              style={{
                padding: '16px 20px',
                background:
                  modalDetalle === 'abonosTurno'
                    ? 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)'
                    : modalDetalle === 'efectivo'
                    ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                    : modalDetalle === 'consignaciones'
                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                    : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                  {modalDetalle === 'abonosTurno' && '📥 Detalle de Abonos del Turno'}
                  {modalDetalle === 'efectivo' && '💰 Detalle de Efectivo Esperado'}
                  {modalDetalle === 'consignaciones' && '🏦 Detalle de Consignaciones y Transferencias'}
                  {modalDetalle === 'abonosAntiguos' && '⏳ Detalle de Abonos Antiguos (Pendientes de Facturación)'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                  {modalDetalle === 'abonosTurno' && 'Relación de anticipos registrados durante este turno'}
                  {modalDetalle === 'efectivo' && 'Facturas y abonos recibidos en efectivo en este turno'}
                  {modalDetalle === 'consignaciones' && 'Facturas y abonos recibidos por banco, transferencia o consignación'}
                  {modalDetalle === 'abonosAntiguos' && 'Anticipos de fechas o turnos previos que siguen en habitaciones activas'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalle(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body Detalle con Scroll */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* CASO 1: ABONOS DEL TURNO */}
              {modalDetalle === 'abonosTurno' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>
                      📋 Recibos de Abono del Turno ({resumen.detalleAbonosTurno?.length || 0})
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#115e59' }}>
                      Total: ${(resumen.totalAbonosTurno || 0).toLocaleString('es-CO')}
                    </span>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#f0fdfa', borderBottom: '2px solid #99f6e4', color: '#115e59', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Fecha / Hora</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Recibo</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Anticipo</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Habitación</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Huésped / Cliente</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Forma de Pago</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!resumen.detalleAbonosTurno || resumen.detalleAbonosTurno.length === 0) ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                              No hay abonos registrados en este turno.
                            </td>
                          </tr>
                        ) : (
                          resumen.detalleAbonosTurno.map((a, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                              <td style={{ padding: '8px 10px', fontSize: '11.5px', color: '#475569', whiteSpace: 'nowrap' }}>
                                📅 {a.fecha || '—'}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>RC #{a.reciboNumero}</td>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>ANT #{a.anticipoNumero}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                  Hab {a.habitacionNumero}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                                <div style={{ fontWeight: 600 }}>{a.clienteNombre}</div>
                                {a.tercNit && <div style={{ fontSize: '11px', color: '#64748b' }}>NIT: {a.tercNit}</div>}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                  {a.formaPagoNombre}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f766e' }}>
                                ${a.monto.toLocaleString('es-CO')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#ccfbf1', borderTop: '2px solid #99f6e4', fontWeight: 800, color: '#115e59' }}>
                          <td colSpan={6} style={{ padding: '10px', textAlign: 'right' }}>TOTAL ABONOS DEL TURNO:</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                            ${(resumen.totalAbonosTurno || 0).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* CASO 2: EFECTIVO ESPERADO */}
              {modalDetalle === 'efectivo' && (
                <div>
                  {/* Resumen Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>FACTURAS EN EFECTIVO</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#b45309' }}>
                        ${(resumen.detalleEfectivo?.totalFacturas || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>ABONOS EN EFECTIVO</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#b45309' }}>
                        ${(resumen.detalleEfectivo?.totalAbonos || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 700 }}>TOTAL EFECTIVO RECAUDADO</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#78350f' }}>
                        ${resumen.totalEfectivoEsperado.toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>

                  {/* Facturas en Efectivo */}
                  <div style={{ marginBottom: '18px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                      🧾 Facturas Pagadas en Efectivo ({resumen.detalleEfectivo?.facturas.length || 0})
                    </h4>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', color: '#92400e', textAlign: 'left' }}>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Factura</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Cliente / Huésped</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700, textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!resumen.detalleEfectivo?.facturas || resumen.detalleEfectivo.facturas.length === 0) ? (
                            <tr>
                              <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                No se emitieron facturas en efectivo.
                              </td>
                            </tr>
                          ) : (
                            resumen.detalleEfectivo.facturas.map((f, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 600 }}>{f.facturaNumero}</td>
                                <td style={{ padding: '7px 10px', color: '#334155' }}>{f.clienteNombre || 'CLIENTE MOSTRADOR'}</td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#92400e' }}>
                                  ${f.monto.toLocaleString('es-CO')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Abonos en Efectivo */}
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                      📥 Abonos Recibidos en Efectivo ({resumen.detalleEfectivo?.abonos.length || 0})
                    </h4>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', color: '#92400e', textAlign: 'left' }}>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Recibo</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Anticipo</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Habitación</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Cliente / Huésped</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700, textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!resumen.detalleEfectivo?.abonos || resumen.detalleEfectivo.abonos.length === 0) ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                No se recibieron abonos en efectivo en este turno.
                              </td>
                            </tr>
                          ) : (
                            resumen.detalleEfectivo.abonos.map((a, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 600 }}>RC #{a.reciboNumero}</td>
                                <td style={{ padding: '7px 10px', color: '#64748b' }}>ANT #{a.anticipoNumero}</td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                    Hab {a.habitacionNumero}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', color: '#334155' }}>{a.clienteNombre}</td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#92400e' }}>
                                  ${a.monto.toLocaleString('es-CO')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 3: CONSIGNACIONES Y TRANSFERENCIAS */}
              {modalDetalle === 'consignaciones' && (
                <div>
                  {/* Resumen Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>FACTURAS POR BANCO / TRANSF.</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284c7' }}>
                        ${(resumen.detalleConsignaciones?.totalFacturas || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>ABONOS POR BANCO / TRANSF.</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284c7' }}>
                        ${(resumen.detalleConsignaciones?.totalAbonos || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700 }}>TOTAL CONSIGNACIONES</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0c4a6e' }}>
                        ${(resumen.totalConsignaciones || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>

                  {/* Facturas en Banco/Transferencia */}
                  <div style={{ marginBottom: '18px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>
                      🧾 Facturas Pagadas con Banco / Consignación ({resumen.detalleConsignaciones?.facturas.length || 0})
                    </h4>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#e0f2fe', borderBottom: '1px solid #bae6fd', color: '#0369a1', textAlign: 'left' }}>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Factura</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Forma de Pago</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Cliente / Huésped</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700, textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!resumen.detalleConsignaciones?.facturas || resumen.detalleConsignaciones.facturas.length === 0) ? (
                            <tr>
                              <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                No se emitieron facturas por banco/consignación.
                              </td>
                            </tr>
                          ) : (
                            resumen.detalleConsignaciones.facturas.map((f, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 600 }}>{f.facturaNumero}</td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                    {f.formaPagoNombre}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', color: '#334155' }}>{f.clienteNombre || 'CLIENTE'}</td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                                  ${f.monto.toLocaleString('es-CO')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Abonos por Banco/Transferencia */}
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>
                      📥 Abonos Recibidos por Banco / Consignación ({resumen.detalleConsignaciones?.abonos.length || 0})
                    </h4>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#e0f2fe', borderBottom: '1px solid #bae6fd', color: '#0369a1', textAlign: 'left' }}>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Recibo</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Anticipo</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Habitación</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Cliente / Huésped</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700 }}>Forma de Pago</th>
                            <th style={{ padding: '7px 10px', fontWeight: 700, textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!resumen.detalleConsignaciones?.abonos || resumen.detalleConsignaciones.abonos.length === 0) ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                No se recibieron abonos por banco o transferencia.
                              </td>
                            </tr>
                          ) : (
                            resumen.detalleConsignaciones.abonos.map((a, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 600 }}>RC #{a.reciboNumero}</td>
                                <td style={{ padding: '7px 10px', color: '#64748b' }}>ANT #{a.anticipoNumero}</td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                    Hab {a.habitacionNumero}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', color: '#334155' }}>{a.clienteNombre}</td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                    {a.formaPagoNombre}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                                  ${a.monto.toLocaleString('es-CO')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 4: ABONOS ANTIGUOS */}
              {modalDetalle === 'abonosAntiguos' && (
                <div>
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12.5px', color: '#9a3412' }}>
                    ℹ️ Estos abonos fueron registrados en turnos o fechas anteriores para huéspedes que continúan alojados en el hotel y cuyo saldo aún no ha sido facturado.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#c2410c' }}>
                      ⏳ Abonos Pendientes de Turnos Anteriores ({resumen.detalleAbonosAntiguos?.length || 0})
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#9a3412' }}>
                      Total: ${(resumen.totalAbonosAntiguos || 0).toLocaleString('es-CO')}
                    </span>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#fff7ed', borderBottom: '2px solid #fed7aa', color: '#9a3412', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Fecha / Hora</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Recibo</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Anticipo</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Habitación</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700 }}>Huésped / Cliente</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!resumen.detalleAbonosAntiguos || resumen.detalleAbonosAntiguos.length === 0) ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                              No hay abonos antiguos pendientes de facturar.
                            </td>
                          </tr>
                        ) : (
                          resumen.detalleAbonosAntiguos.map((a, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                              <td style={{ padding: '8px 10px', fontSize: '11.5px', color: '#7c2d12', whiteSpace: 'nowrap' }}>
                                📅 {a.fecha || '—'}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>RC #{a.reciboNumero}</td>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>ANT #{a.anticipoNumero}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                  Hab {a.habitacionNumero}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                                <div style={{ fontWeight: 600 }}>{a.clienteNombre}</div>
                                {a.tercNit && <div style={{ fontSize: '11px', color: '#64748b' }}>NIT: {a.tercNit}</div>}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#c2410c' }}>
                                ${a.monto.toLocaleString('es-CO')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#ffedd5', borderTop: '2px solid #fed7aa', fontWeight: 800, color: '#9a3412' }}>
                          <td colSpan={5} style={{ padding: '10px', textAlign: 'right' }}>TOTAL ABONOS ANTIGUOS:</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                            ${(resumen.totalAbonosAntiguos || 0).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Detalle */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalDetalle(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

