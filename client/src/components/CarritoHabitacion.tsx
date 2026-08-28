import { useState, useEffect } from 'react';
import type { Habitacion } from './Habitaciones';

interface ConsumoItem {
  id: number;
  articulo: string;
  unidad: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface ArticuloCatalogo {
  codigo: string;
  descripcion: string;
  precio: number;
  unidad: string;
}

interface CarritoHabitacionProps {
  habitacion: Habitacion;
  user: { username: string };
  onBack: () => void;
  onProceedToCheckout?: (habitacion: Habitacion, totalItems: number, totalPagar: number) => void;
  onLogout: () => void;
}

export const CarritoHabitacion = ({
  habitacion,
  user,
  onBack,
  onLogout,
}: CarritoHabitacionProps) => {
  const [items, setItems] = useState<ConsumoItem[]>([]);
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulario para agregar nuevo producto
  const [selectedArticuloCod, setSelectedArticuloCod] = useState('');
  const [customDescripcion, setCustomDescripcion] = useState('');
  const [customPrecio, setCustomPrecio] = useState<number | string>(0);
  const [customCantidad, setCustomCantidad] = useState<number>(1);
  const [customUnidad, setCustomUnidad] = useState('UND');

  const fetchConsumos = async () => {
    const token = localStorage.getItem('hotel_token');
    try {
      setLoading(true);
      const res = await fetch(`/api/habitaciones/${habitacion.id}/consumos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error al cargar consumos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticulos = async () => {
    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch('/api/articulos?excluirGrupo=SER', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArticulos(data || []);
      }
    } catch (err) {
      console.error('Error al cargar catálogo de artículos:', err);
    }
  };

  useEffect(() => {
    fetchConsumos();
    fetchArticulos();
  }, [habitacion.id]);

  const handleArticuloSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    setSelectedArticuloCod(cod);
    const found = articulos.find((a) => a.codigo === cod);
    if (found) {
      setCustomDescripcion(found.descripcion);
      setCustomPrecio(found.precio);
      setCustomUnidad(found.unidad || 'UND');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDescripcion.trim()) {
      alert('Por favor ingrese o seleccione un producto');
      return;
    }

    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch('/api/pedidos/agregar-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionId: habitacion.id,
          item: {
            articuloCod: selectedArticuloCod || undefined,
            descripcion: customDescripcion.trim(),
            unidad: customUnidad,
            cantidad: customCantidad || 1,
            precio: Number(customPrecio) || 0,
          },
        }),
      });

      if (res.ok) {
        // Limpiar campos y refrescar
        setSelectedArticuloCod('');
        setCustomDescripcion('');
        setCustomPrecio(0);
        setCustomCantidad(1);
        await fetchConsumos();
      } else {
        alert('Error al agregar producto');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión al agregar producto');
    }
  };

  const handleUpdateCantidad = async (consumoId: number, nuevaCantidad: number) => {
    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch(`/api/habitaciones/${habitacion.id}/consumos/${consumoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cantidad: nuevaCantidad }),
      });
      if (res.ok) fetchConsumos();
    } catch (err) {
      console.error('Error al actualizar cantidad:', err);
    }
  };

  const handleDeleteItem = async (consumoId: number) => {
    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch(`/api/habitaciones/${habitacion.id}/consumos/${consumoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchConsumos();
    } catch (err) {
      console.error('Error al eliminar ítem:', err);
    }
  };

  const handleEmptyCart = async () => {
    if (!window.confirm(`¿Seguro que deseas vaciar el carrito de la Habitación ${habitacion.numero}?`)) return;
    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch(`/api/habitaciones/${habitacion.id}/consumos`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchConsumos();
    } catch (err) {
      console.error('Error al vaciar carrito:', err);
    }
  };

  // 1. Grabar en PEDIDO_WEB y PEDIDO_WEB_DETALLE
  const handleGrabarPedidoWeb = async () => {
    if (items.length === 0) {
      alert('El carrito no contiene productos');
      return;
    }

    setProcessingAction('GRABAR_WEB');
    setActionFeedback(null);
    const token = localStorage.getItem('hotel_token');

    try {
      const res = await fetch('/api/pedidos/grabar-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionId: habitacion.id,
          items: items.map((it) => ({
            descripcion: it.articulo,
            cantidad: it.cantidad,
            precio: it.precio,
            subtotal: it.subtotal,
            unidad: it.unidad,
          })),
          huesped: {
            huesped: habitacion.huesped,
            documento: habitacion.documento,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: `✅ Pedido WEB #${data.peweId} grabado exitosamente en las tablas PEDIDO_WEB y PEDIDO_WEB_DETALLE.`,
        });
      } else {
        throw new Error(data.error || 'Error al grabar pedido web');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `❌ ${err.message || 'Error al grabar en PEDIDO_WEB'}`,
      });
    } finally {
      setProcessingAction(null);
    }
  };

  // 2. Enviar a Facturar usando el procedimiento GRABE_PEDIDO_APP
  const handleEnviarAFacturar = async () => {
    if (items.length === 0) {
      alert('El carrito no contiene productos para facturar');
      return;
    }

    if (!window.confirm(`¿Confirmas enviar a facturar el pedido de la Habitación ${habitacion.numero} ejecutando el procedimiento GRABE_PEDIDO_APP?`)) {
      return;
    }

    setProcessingAction('FACTURAR');
    setActionFeedback(null);
    const token = localStorage.getItem('hotel_token');

    try {
      const res = await fetch('/api/pedidos/enviar-facturar', {
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
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: `🎉 ¡Pedido Facturado con Éxito! Número oficial: ${data.numPed}. Grabado en PEDIDOS y PEDIDOS_DETALLE mediante GRABE_PEDIDO_APP.`,
        });
        await fetchConsumos();
      } else {
        throw new Error(data.error || 'Error al ejecutar procedimiento GRABE_PEDIDO_APP');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `❌ Error al facturar: ${err.message}`,
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPagar = items.reduce((sum, item) => sum + item.subtotal, 0);

  const formatMoney = (val: number) => {
    return '$' + Number(val || 0).toLocaleString('es-CO');
  };

  return (
    <div className="hotel-app-container">
      {/* Topbar */}
      <header className="hotel-topbar">
        <div className="topbar-left">
          <button className="btn-menu-hamburger" onClick={onBack} title="Volver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="topbar-brand-title">HOTEL PARAÍSO</span>
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

      {/* Contenido Principal */}
      <main className="cart-main-content">
        {/* Banner de Feedback de Acciones */}
        {actionFeedback && (
          <div className={`cart-feedback-alert ${actionFeedback.type}`}>
            <span>{actionFeedback.message}</span>
            <button className="btn-close-alert" onClick={() => setActionFeedback(null)}>✕</button>
          </div>
        )}

        {/* Encabezado del Carrito */}
        <div className="cart-header-row">
          <div>
            <h1 className="cart-view-title">
              Carrito de compras - Habitación {habitacion.numero}
            </h1>
            <p className="cart-guest-subtitle">
              Huésped: <strong>{habitacion.huesped || 'Cliente General'}</strong> {habitacion.documento ? `(Doc: ${habitacion.documento})` : ''}
            </p>
          </div>

          <div className="cart-header-actions-group">
            <button className="btn-back-rooms" onClick={onBack}>
              ← Volver a Habitaciones
            </button>
            {items.length > 0 && (
              <button className="btn-vaciar-carrito" onClick={handleEmptyCart}>
                Vaciar carrito
              </button>
            )}
          </div>
        </div>

        {/* Sección: Agregar Producto al Carrito */}
        <div className="add-product-panel-card">
          <h3 className="add-product-title">➕ Agregar Producto / Consumo</h3>
          <form className="add-product-form-row" onSubmit={handleAddProduct}>
            <div className="add-product-field flex-2">
              <label className="field-label">Seleccionar del catálogo (ARTICULO):</label>
              <select
                className="add-product-select"
                value={selectedArticuloCod}
                onChange={handleArticuloSelect}
              >
                <option value="">-- Seleccione un artículo o ingrese manual --</option>
                {articulos.map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.descripcion} ({formatMoney(a.precio)}) - {a.unidad}
                  </option>
                ))}
              </select>
            </div>

            <div className="add-product-field flex-2">
              <label className="field-label">Descripción del producto *:</label>
              <input
                type="text"
                className="add-product-input"
                value={customDescripcion}
                onChange={(e) => setCustomDescripcion(e.target.value)}
                placeholder="Ej: Desayuno Americano, Coca-Cola 400ml..."
                required
              />
            </div>

            <div className="add-product-field flex-1">
              <label className="field-label">Precio Unitario ($):</label>
              <input
                type="number"
                className="add-product-input"
                value={customPrecio}
                onChange={(e) => setCustomPrecio(e.target.value)}
                placeholder="0"
                min="0"
                step="any"
              />
            </div>

            <div className="add-product-field flex-1">
              <label className="field-label">Cantidad:</label>
              <input
                type="number"
                className="add-product-input"
                value={customCantidad}
                onChange={(e) => setCustomCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min="1"
              />
            </div>

            <button type="submit" className="btn-add-item-submit">
              + Agregar
            </button>
          </form>
        </div>

        {/* Tabla de Productos */}
        {loading ? (
          <div className="cart-loading">
            <div className="spinner"></div>
            <p>Cargando consumos de la habitación...</p>
          </div>
        ) : (
          <div className="cart-table-card">
            {items.length === 0 ? (
              <div className="cart-empty-message">
                <p>🛒 El carrito de la Habitación {habitacion.numero} no tiene productos agregados.</p>
                <p className="cart-empty-hint">Utiliza el formulario de arriba para agregar bebidas, comidas o servicios.</p>
              </div>
            ) : (
              <>
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th className="col-articulo">Artículo</th>
                      <th className="col-precio">Precio</th>
                      <th className="col-unidad">Unidad</th>
                      <th className="col-cantidad">Cantidad</th>
                      <th className="col-subtotal">Subtotal</th>
                      <th className="col-acciones"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="col-articulo">
                          <div className="product-item-cell">
                            <div className="product-item-thumb">📦</div>
                            <span className="product-item-name">{item.articulo}</span>
                          </div>
                        </td>
                        <td className="col-precio">{formatMoney(item.precio)}</td>
                        <td className="col-unidad">{item.unidad}</td>
                        <td className="col-cantidad">
                          <div className="stepper-box">
                            <button
                              className="stepper-btn"
                              onClick={() => handleUpdateCantidad(item.id, item.cantidad - 1)}
                              title="Reducir"
                            >
                              -
                            </button>
                            <span className="stepper-value">{item.cantidad}</span>
                            <button
                              className="stepper-btn"
                              onClick={() => handleUpdateCantidad(item.id, item.cantidad + 1)}
                              title="Aumentar"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="col-subtotal">{formatMoney(item.subtotal)}</td>
                        <td className="col-acciones">
                          <button
                            className="btn-delete-item"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Eliminar producto"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Fila de Totales */}
                <div className="cart-summary-row">
                  <div className="cart-total-items">
                    Total artículos: <strong>{totalItems}</strong>
                  </div>
                  <div className="cart-total-pagar-box">
                    <span className="total-pagar-label">Total a pagar:</span>
                    <span className="total-pagar-amount">{formatMoney(totalPagar)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Botones de Acción: Grabar en PEDIDO_WEB vs Enviar a Facturar con GRABE_PEDIDO_APP */}
        {items.length > 0 && (
          <div className="cart-dual-action-buttons-row">
            <button
              className="btn-grabar-pedido-web"
              onClick={handleGrabarPedidoWeb}
              disabled={processingAction !== null}
            >
              {processingAction === 'GRABAR_WEB' ? 'Grabando en PEDIDO_WEB...' : '💾 Grabar Pedido (PEDIDO_WEB)'}
            </button>

            <button
              className={`btn-enviar-facturar ${habitacion.estado !== 'Ocupada' ? 'btn-disabled-locked' : ''}`}
              onClick={handleEnviarAFacturar}
              disabled={processingAction !== null || habitacion.estado !== 'Ocupada'}
              title={
                habitacion.estado !== 'Ocupada'
                  ? 'La habitación debe estar en estado OCUPADA para poder facturar'
                  : 'Enviar a facturar (GRABE_PEDIDO_APP)'
              }
            >
              {processingAction === 'FACTURAR' ? 'Facturando mediante GRABE_PEDIDO_APP...' : '⚡ Enviar a facturar (GRABE_PEDIDO_APP)'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
