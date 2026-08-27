import { useState } from 'react';
import type { Habitacion } from './Habitaciones';

interface CerrarPedidoProps {
  habitacion: Habitacion;
  totalItems: number;
  totalPagar: number;
  user: { username: string };
  onCancel: () => void;
  onSuccess: (numeroPedido: string) => void;
  onLogout: () => void;
}

export const CerrarPedido = ({
  habitacion,
  totalItems,
  totalPagar,
  user,
  onCancel,
  onSuccess,
  onLogout,
}: CerrarPedidoProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatMoney = (val: number) => {
    return '$' + Number(val || 0).toLocaleString('es-CO');
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setError(null);
    const token = localStorage.getItem('hotel_token');

    try {
      const res = await fetch('/api/pedidos/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionId: habitacion.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar el pedido');
      }

      onSuccess(data.numeroPedido || 'PV-000123');
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
      setIsSubmitting(false);
    }
  };

  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

  return (
    <div className="hotel-app-container">
      {/* Barra Superior */}
      <header className="hotel-topbar">
        <div className="topbar-left">
          <button className="btn-menu-hamburger" onClick={onCancel} title="Volver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="topbar-brand-title" onClick={onCancel} style={{ cursor: 'pointer' }}>
            HOTEL PARAÍSO
          </span>
        </div>

        <div className="topbar-right">
          <div className="topbar-user">
            <svg className="user-icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="user-label">Recepción ({user.username})</span>
          </div>
          <button onClick={onLogout} className="btn-topbar-logout" title="Cerrar sesión">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Contenido Principal de Confirmación */}
      <main className="close-order-container">
        <h1 className="close-order-title">Cerrar carrito - Generar pedido</h1>

        {/* Banner Informativo Verde */}
        <div className="order-green-banner">
          <div className="banner-check-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="banner-text">
            El carrito se cerrará y se generará el pedido de venta en el sistema local.
          </p>
        </div>

        {error && (
          <div className="rooms-error-banner" style={{ marginBottom: 16 }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Tarjeta de Resumen del Pedido */}
        <div className="order-summary-card">
          <div className="order-summary-row">
            <span className="order-summary-label">Habitación:</span>
            <span className="order-summary-value">{habitacion.numero}</span>
          </div>

          <div className="order-summary-row">
            <span className="order-summary-label">Fecha y hora:</span>
            <span className="order-summary-value">{formattedDate}</span>
          </div>

          <div className="order-summary-row">
            <span className="order-summary-label">Total items:</span>
            <span className="order-summary-value">{totalItems}</span>
          </div>

          <div className="order-summary-row">
            <span className="order-summary-label">Total a pagar:</span>
            <span className="order-summary-value-amount">{formatMoney(totalPagar)}</span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="order-action-buttons">
          <button
            className="btn-order-cancel"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            className="btn-order-confirm"
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Generando pedido...' : 'Confirmar y enviar pedido'}
          </button>
        </div>
      </main>
    </div>
  );
};
