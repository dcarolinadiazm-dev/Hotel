import React, { useState } from 'react';

interface Turno {
  ID_TURNO: number;
  USUARIO: string;
  FECHA_APERTURA: string | Date;
  BASE: number;
  ESTADO: string;
  OBSERVACIONES?: string;
}

interface ModalAperturaTurnoProps {
  user: { username: string };
  onClose: () => void;
  onTurnoAbierto: (turno: Turno) => void;
}

export const ModalAperturaTurno: React.FC<ModalAperturaTurnoProps> = ({
  user,
  onClose,
  onTurnoAbierto,
}) => {
  const [base, setBase] = useState<string>('0');
  const [observaciones, setObservaciones] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const baseNum = parseFloat(base.replace(/\./g, '').replace(/,/g, '.'));
    if (isNaN(baseNum) || baseNum < 0) {
      setError('Por favor ingrese un valor de base inicial válido (mayor o igual a 0).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/turnos/apertura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: user.username,
          base: baseNum,
          observaciones: observaciones.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al realizar la apertura de turno');
      }

      onTurnoAbierto(data.turno);
    } catch (err: any) {
      setError(err.message || 'Error de conexión al abrir el turno');
    } finally {
      setLoading(false);
    }
  };

  const handleBaseChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setBase(clean ? Number(clean).toLocaleString('es-CO') : '0');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card-dialog"
        style={{ maxWidth: '480px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-custom" style={{ background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)', color: '#fff', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🔑</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Apertura de Turno</h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>Iniciar sesión de caja y recepción</p>
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

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              👤 Usuario / Cajero
            </label>
            <input
              type="text"
              value={user.username}
              disabled
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f3f4f6', color: '#4b5563', fontWeight: 600 }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              💵 Base Inicial de Caja (Efectivo) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: '#047857' }}>$</span>
              <input
                type="text"
                value={base}
                onChange={(e) => handleBaseChange(e.target.value)}
                autoFocus
                placeholder="0"
                style={{ width: '100%', padding: '10px 12px 10px 28px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', fontWeight: 700, color: '#047857', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
              Dinero en efectivo disponible en caja para cambio/vuelto.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              📝 Observaciones de Apertura (Opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas sobre novedades recibidas de turno anterior..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.2)' }}
            >
              {loading ? 'Abriendo Turno...' : '✅ Confirmar Apertura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
