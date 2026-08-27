import { useState, useEffect } from 'react';
import type { Habitacion } from './Habitaciones';

interface Articulo {
  codigo: string;
  descripcion: string;
  precio: number;
  unidad: string;
}

interface ModalCrearHabitacionProps {
  habitacionToEdit?: Habitacion | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ModalCrearHabitacion = ({ habitacionToEdit, onClose, onSaved }: ModalCrearHabitacionProps) => {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(habitacionToEdit);

  // Campos del formulario
  const [numero, setNumero] = useState(habitacionToEdit?.numero || '');
  const [selectedArticuloCod, setSelectedArticuloCod] = useState(habitacionToEdit?.artiCod || '');
  const [tipo, setTipo] = useState(habitacionToEdit?.tipo || 'SENCILLA');
  const [piso, setPiso] = useState<number>(habitacionToEdit?.piso || 1);
  const [estado, setEstado] = useState(habitacionToEdit?.estado || 'Disponible');
  const [caracteristicas, setCaracteristicas] = useState(habitacionToEdit?.caracteristicas || 'TV, Aire Acondicionado, Wi-Fi');
  const [observaciones, setObservaciones] = useState(habitacionToEdit?.observaciones || '');

  useEffect(() => {
    const fetchArticulos = async () => {
      const token = localStorage.getItem('hotel_token');
      try {
        setLoadingArticulos(true);
        const res = await fetch('/api/articulos?grupo=SER', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setArticulos(data);
            if (!selectedArticuloCod && data.length > 0) {
              setSelectedArticuloCod(data[0].codigo);
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar artículos:', err);
      } finally {
        setLoadingArticulos(false);
      }
    };

    fetchArticulos();
  }, []);

  const selectedArticulo = articulos.find((a) => a.codigo === selectedArticuloCod);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) {
      setError('El número de habitación es obligatorio');
      return;
    }
    if (!selectedArticuloCod) {
      setError('Debes seleccionar un código de artículo (ARTI_COD) para vincular a la habitación');
      return;
    }

    setSaving(true);
    setError(null);
    const token = localStorage.getItem('hotel_token');

    try {
      const url = isEditing ? `/api/habitaciones/${habitacionToEdit!.id}` : '/api/habitaciones';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          numero: numero.trim(),
          artiCod: selectedArticuloCod,
          tipo,
          piso: Number(piso) || 1,
          caracteristicas: caracteristicas.trim(),
          observaciones: observaciones.trim(),
          ...(isEditing ? { estado } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error al ${isEditing ? 'actualizar' : 'crear'} la habitación`);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card-dialog modal-card-wide-room" onClick={(e) => e.stopPropagation()}>
        {/* Header del Modal */}
        <div className="modal-dialog-header">
          <div className="header-title-box">
            <h2 className="modal-dialog-title">
              {isEditing ? `✏️ Editar Habitación ${habitacionToEdit?.numero}` : '✨ Crear Nueva Habitación'}
            </h2>
            <span className="badge-pewe-modal">
              {isEditing ? `ID: #${habitacionToEdit?.id}` : 'Autonumérico Firebird'}
            </span>
          </div>
          <button className="btn-modal-close-x" onClick={onClose} title="Cerrar ventana">
            ✕
          </button>

        </div>

        {/* Formulario Horizontal Amplio */}
        <form onSubmit={handleSubmit} className="modal-scrollable-body modal-room-form-wide">
          {error && (
            <div className="modal-action-feedback error">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Fila 1: Número, Piso, Tipo y Estado al editar */}
          <div className="modal-form-row">
            <div className="modal-form-group flex-1">
              <label className="modal-form-label">Número de Habitación *:</label>
              <input
                type="text"
                className="modal-form-input"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej: 101, 201, 401"
                required
                autoFocus
              />
              <span className="form-hint-text">
                {isEditing ? 'Identificador físico' : 'ID autoincremental'}
              </span>
            </div>

            <div className="modal-form-group flex-1">
              <label className="modal-form-label">Piso *:</label>
              <input
                type="number"
                className="modal-form-input"
                value={piso}
                onChange={(e) => setPiso(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min="1"
                max="99"
                required
              />
            </div>

            <div className="modal-form-group flex-1">
              <label className="modal-form-label">Tipo de Habitación:</label>
              <select
                className="modal-form-select"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="SENCILLA">SENCILLA</option>
                <option value="Semidoble V (Ventilador)">Semidoble V (Ventilador)</option>
                <option value="SEMIDOBLE">SEMIDOBLE</option>
                <option value="DOBLE">DOBLE</option>
                <option value="MULTIPLE">MULTIPLE</option>
              </select>
            </div>

            {isEditing && (
              <div className="modal-form-group flex-1">
                <label className="modal-form-label">Estado de la Habitación:</label>
                <select
                  className="modal-form-select"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option value="Disponible">🟩 Disponible</option>
                  <option value="Reservada">🟧 Reservada</option>
                  <option value="Ocupada">🟥 Ocupada</option>
                  <option value="Inhabilitada">⬛ Inhabilitada</option>
                </select>
              </div>
            )}
          </div>



          {/* Fila 2: Catálogo de Artículo de Hospedaje */}
          <div className="modal-form-group">
            <label className="modal-form-label">Artículo de Hospedaje Relacionado (ARTI_COD) *:</label>
            {loadingArticulos ? (
              <p className="loading-subtext">Cargando catálogo y lista de precios predeterminada de Firebird...</p>
            ) : (
              <select
                className="modal-form-select"
                value={selectedArticuloCod}
                onChange={(e) => setSelectedArticuloCod(e.target.value)}
                required
              >
                <option value="">-- Selecciona el artículo de hospedaje --</option>
                {articulos.map((art) => (
                  <option key={art.codigo} value={art.codigo}>
                    [{art.codigo}] {art.descripcion} — Tarifa Oficial: ${Number(art.precio || 0).toLocaleString('es-CO')} ({art.unidad || 'UND'})
                  </option>
                ))}
              </select>
            )}
            <div className="selected-art-price-info">
              {selectedArticulo && (
                <span>
                  🏷️ <strong>Tarifa activa:</strong> ${Number(selectedArticulo.precio || 0).toLocaleString('es-CO')} / noche (consultada automáticamente desde <em>PRECIOS_ARTICULO</em> para la lista predeterminada).
                </span>
              )}
            </div>
          </div>

          {/* Fila 3: Características */}
          <div className="modal-form-group">
            <label className="modal-form-label">Características / Comodidades:</label>
            <input
              type="text"
              className="modal-form-input"
              value={caracteristicas}
              onChange={(e) => setCaracteristicas(e.target.value)}
              placeholder="Ej: TV Smart, Cama King, Jacuzzi, Balcón, Nevera, Aire Acondicionado"
            />
          </div>

          {/* Fila 4: Observaciones */}
          <div className="modal-form-group">
            <label className="modal-form-label">Observaciones / Notas Internas:</label>
            <textarea
              className="modal-form-textarea"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales o instrucciones internas de la habitación..."
            />
          </div>

          {/* Footer de Acciones */}
          <div className="modal-dialog-footer">
            <button type="button" className="btn-modal-close-action" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-save-action" disabled={saving}>
              {saving
                ? (isEditing ? 'Guardando...' : 'Creando...')
                : (isEditing ? '💾 Guardar Cambios' : '💾 Crear Habitación')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
