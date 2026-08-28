import { useState, useEffect } from 'react';
import { ModalCrearHabitacion } from './ModalCrearHabitacion';
import { ModalFacturacionDirecta } from './ModalFacturacionDirecta';

export interface Habitacion {
  id: string;
  artiCod?: string;
  numero: string;
  estado: 'Disponible' | 'Reservada' | 'Ocupada' | 'Inhabilitada' | string;
  tipo?: string;
  piso?: number;
  huesped?: string;
  documento?: string;
  fechaReserva?: string;
  fechaSalida?: string;
  precioNoche?: number;
  caracteristicas?: string;
  observaciones?: string;
  peweId?: number;
  productos: number;
  total: number;
}

type FiltroEstado = 'TODOS' | 'DISPONIBLE' | 'RESERVADA' | 'OCUPADA' | 'INHABILITADA';

interface HabitacionesProps {
  user: { username: string };
  refreshKey?: number;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenModal: (habitacion: Habitacion) => void;
  onGoToReports: () => void;
  onGoToCartera?: () => void;
  onLogout: () => void;
}

export const Habitaciones = ({
  user,
  refreshKey,
  sidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onOpenModal,
  onGoToReports,
  onGoToCartera,
  onLogout,
}: HabitacionesProps) => {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('DISPONIBLE');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFacturarDirectoModal, setShowFacturarDirectoModal] = useState(false);
  const [habitacionAEditar, setHabitacionAEditar] = useState<Habitacion | null>(null);
  const [localSidebarOpen, setLocalSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const sidebarOpen = controlledSidebarOpen !== undefined ? controlledSidebarOpen : localSidebarOpen;
  const toggleSidebar = onToggleSidebar || (() => setLocalSidebarOpen((prev) => !prev));

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('📲 Para instalar como App en tu equipo o celular:\n\n1. En Google Chrome / Edge: Haz clic en el ícono de instalación (computador con flecha) que aparece en la barra de direcciones o en el menú ⋮ -> "Instalar aplicación".\n2. En celular Android / iPhone: Abre el menú de opciones del navegador y presiona "Agregar a la pantalla principal" o "Instalar aplicación".');
    }
  };




  const fetchHabitaciones = async () => {
    const token = localStorage.getItem('hotel_token');
    try {
      setLoading(true);
      const res = await fetch('/api/habitaciones', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('No se pudo cargar la lista de habitaciones');
      }

      const data = await res.json();
      setHabitaciones(data);
    } catch (err: any) {
      setError(err.message || 'Error al consultar habitaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabitaciones();
  }, [refreshKey]);

  const counts = {
    todos: habitaciones.length,
    disponible: habitaciones.filter((h) => h.estado.toLowerCase().trim() === 'disponible').length,
    reservada: habitaciones.filter((h) => h.estado.toLowerCase().trim() === 'reservada').length,
    ocupada: habitaciones.filter((h) => h.estado.toLowerCase().trim() === 'ocupada').length,
    inhabilitada: habitaciones.filter((h) => {
      const e = h.estado.toLowerCase().trim();
      return e === 'inhabilitada' || e === 'inhabilitado' || e === 'mantenimiento';
    }).length,
  };

  const habitacionesFiltradas = habitaciones.filter((h) => {
    if (filtroEstado === 'TODOS') return true;
    const e = h.estado.toLowerCase().trim();
    if (filtroEstado === 'DISPONIBLE') return e === 'disponible';
    if (filtroEstado === 'RESERVADA') return e === 'reservada';
    if (filtroEstado === 'OCUPADA') return e === 'ocupada';
    if (filtroEstado === 'INHABILITADA') return e === 'inhabilitada' || e === 'inhabilitado' || e === 'mantenimiento';
    return true;
  });

  const getStatusClass = (estado: string) => {
    const norm = estado.toLowerCase().trim();
    if (norm === 'disponible') return 'status-disponible';
    if (norm === 'reservada') return 'status-reservada';
    if (norm === 'ocupada') return 'status-ocupada';
    if (norm === 'inhabilitada' || norm === 'inhabilitado' || norm === 'mantenimiento') return 'status-inhabilitada';
    return 'status-disponible';
  };

  const handleOpenCreateModal = () => {
    setHabitacionAEditar(null);
    setShowCreateModal(true);
  };

  const handleEditHabitacion = (e: React.MouseEvent, hab: Habitacion) => {
    e.stopPropagation();
    if (hab.estado === 'Reservada') {
      alert(`La habitación ${hab.numero} se encuentra actualmente Reservada. No se puede modificar su configuración hasta que finalice la reserva.`);
      return;
    }
    setHabitacionAEditar(hab);
    setShowCreateModal(true);
  };

  const handleDeleteHabitacion = async (e: React.MouseEvent, id: string, numero: string, estado: string) => {
    e.stopPropagation();
    if (estado === 'Reservada' || estado === 'Ocupada') {
      alert(`No se puede inhabilitar la habitación ${numero} porque se encuentra actualmente ${estado}.`);
      return;
    }

    if (!window.confirm(`¿Estás seguro de inhabilitar la habitación ${numero}? Pasará a estado Inhabilitada.`)) {
      return;
    }

    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch(`/api/habitaciones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchHabitaciones();
      } else {
        const d = await res.json();
        alert(d.error || 'Error al inhabilitar habitación');
      }
    } catch (err) {
      console.error('Error al inhabilitar habitación:', err);
    }
  };

  return (
    <div className="hotel-dashboard-layout">
      {/* Sidebar Izquierdo Azul Moderno */}
      <aside className={`hotel-sidebar-navy ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-top-section">
          {/* Logo en Sidebar */}
          <div className="sidebar-brand-box">
            <img src="/LogoHotel.png" alt="Hotel" className="sidebar-logo-img" />
          </div>

          {/* Menú de Navegación (Solo Habitaciones y Reportes) */}
          <nav className="sidebar-nav-menu">
            <button
              type="button"
              className="sidebar-nav-item active"
              onClick={() => {}}
              title="Gestión de Habitaciones"
            >
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span className="nav-item-label">Habitaciones</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-item"
              onClick={onGoToReports}
              title="Reporte de Pedidos"
            >
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span className="nav-item-label">Reporte Pedidos</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-item"
              onClick={onGoToCartera}
              title="Reporte de Cartera"
            >
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <span className="nav-item-label">Cartera</span>
            </button>
          </nav>
        </div>

        {/* Perfil Usuario al pie del Sidebar */}
        <div className="sidebar-bottom-user-card">
          <div className="sidebar-user-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">Recepción</span>
            <span className="sidebar-user-login">({user.username})</span>
            <div className="sidebar-status-online">
              <span className="online-green-dot"></span>
              <span>En línea</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenedor Principal (Topbar + Contenido) */}
      <div className="hotel-main-wrapper">
        {/* Barra de Navegación Superior */}
        <header className="hotel-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="btn-menu-hamburger"
              onClick={toggleSidebar}
              title={sidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
            >

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Solo se muestra el logo en la topbar cuando el sidebar está oculto */}
            {!sidebarOpen && (
              <div className="topbar-brand-box">
                <img src="/LogoHotel.png" alt="Hotel" className="topbar-brand-logo" />
              </div>
            )}
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="btn-install-pwa"
              onClick={handleInstallApp}
              title="Descargar e instalar como App en tu equipo o móvil"
            >
              <span className="install-icon">📲</span>
              <span className="install-label">Instalar App</span>
            </button>

            {!sidebarOpen && (
              <button className="btn-nav-tab" onClick={onGoToReports} title="Ver Reporte de Pedidos">
                📊 Reportes
              </button>
            )}

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

        {/* Contenido Principal de Habitaciones */}
        <main className="rooms-main-content">

        {/* Encabezado de Sección */}
        <div className="rooms-section-header">
          <div>
            <div className="title-with-badge">
              <h1 className="rooms-main-title">Habitaciones</h1>
              <button
                className="btn-add-room-inline"
                onClick={handleOpenCreateModal}
                title="Crear Nueva Habitación"
              >
                + Crear Habitación
              </button>
              <button
                className="btn-facturar-inline"
                onClick={() => setShowFacturarDirectoModal(true)}
                title="Facturar productos sin habitación (Venta directa / POS)"
              >
                🧾 Facturar
              </button>
            </div>
            <p className="rooms-subtitle">Gestión en tiempo real de habitaciones</p>
          </div>

          <div className="rooms-header-actions">
            {/* Filtros Interactivos por Estado */}
            <div className="status-filters-group">
              <button
                className={`filter-chip ${filtroEstado === 'TODOS' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('TODOS')}
              >
                Todas ({counts.todos})
              </button>

              <button
                className={`filter-chip ${filtroEstado === 'DISPONIBLE' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('DISPONIBLE')}
              >
                <span className="dot dot-disponible"></span> Disponibles ({counts.disponible})
              </button>

              <button
                className={`filter-chip ${filtroEstado === 'RESERVADA' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('RESERVADA')}
              >
                <span className="dot dot-reservada"></span> Reservadas ({counts.reservada})
              </button>

              <button
                className={`filter-chip ${filtroEstado === 'OCUPADA' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('OCUPADA')}
              >
                <span className="dot dot-ocupada"></span> Ocupadas ({counts.ocupada})
              </button>

              <button
                className={`filter-chip ${filtroEstado === 'INHABILITADA' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('INHABILITADA')}
              >
                <span className="dot dot-inhabilitada"></span> Inhabilitadas ({counts.inhabilitada})
              </button>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}

        {loading && (
          <div className="rooms-loading-state">
            <div className="spinner"></div>
            <p>Cargando habitaciones...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rooms-error-state">
            <p>⚠️ {error}</p>
            <button onClick={fetchHabitaciones} className="btn-retry">
              Reintentar
            </button>
          </div>
        )}

        {/* Grid de Tarjetas de Habitaciones */}
        {!loading && !error && habitacionesFiltradas.length > 0 && (
          <div className="rooms-cards-grid">
            {habitacionesFiltradas.map((hab) => {
              const statusClass = getStatusClass(hab.estado);
              const isReservada = hab.estado === 'Reservada';
              const isLocked = isReservada || hab.estado === 'Ocupada';

              return (
                <div
                  key={hab.id}
                  className={`room-card ${statusClass}-card`}
                  onClick={() => onOpenModal(hab)}
                >
                  <div className="room-card-top-bar">
                    <span className="room-badge-type">{hab.tipo || 'SENCILLA'} · P{hab.piso || 1}</span>
                    <div className="room-card-quick-actions">
                      <button
                        className={`btn-room-edit-quick ${isReservada ? 'btn-action-disabled' : ''}`}
                        onClick={(e) => handleEditHabitacion(e, hab)}
                        title={isReservada ? 'No se puede editar mientras esté reservada' : `Editar configuración de habitación ${hab.numero}`}
                        disabled={isReservada}
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn-room-delete-quick ${isLocked ? 'btn-action-disabled' : ''}`}
                        onClick={(e) => handleDeleteHabitacion(e, hab.id, hab.numero, hab.estado)}
                        title={
                          isLocked
                            ? `No se puede inhabilitar mientras esté ${hab.estado}`
                            : `Inhabilitar habitación ${hab.numero}`
                        }
                        disabled={isLocked}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <h3 className="room-card-number">{hab.numero}</h3>

                  {/* Icono de Cama con color de estado */}
                  <div className={`room-bed-icon-box ${statusClass}`}>
                    <svg viewBox="0 0 64 64" fill="currentColor" className="bed-svg">
                      <path d="M6 22H12V46H6V22Z" />
                      <path d="M52 32H58V46H52V32Z" />
                      <path d="M12 36H52V42H12V36Z" />
                      <rect x="15" y="27" width="10" height="7" rx="2" />
                      <path d="M28 31H52V36H28V31Z" />
                      <rect x="8" y="46" width="4" height="6" />
                      <rect x="52" y="46" width="4" height="6" />
                    </svg>
                  </div>

                  {/* Texto de Estado */}
                  <span className={`room-status-label ${statusClass}`}>
                    {hab.estado}
                  </span>

                  {/* Detalle Huésped o Código de Artículo y Precio de Lista */}
                  <div className="room-extra-info">
                    {hab.huesped ? (
                      <span className="room-guest-name" title={hab.huesped}>
                        👤 {hab.huesped}
                      </span>
                    ) : (
                      <span className="room-art-tag">
                        🏷️ Art: {hab.artiCod || '001'} · ${Number(hab.precioNoche || 0).toLocaleString('es-CO')}
                      </span>
                    )}
                  </div>

                  {/* Indicador de Productos & Pedido Web */}
                  <div className="room-product-indicator">
                    {hab.productos > 0 ? (
                      <span className="badge-con-productos">
                        Con productos <span className="product-count-circle">{hab.productos}</span>
                      </span>
                    ) : (
                      <span className="badge-sin-productos">Sin consumos</span>
                    )}

                    {hab.peweId && (
                      <span className="badge-pewe-id" title={`Pedido Web activo #${hab.peweId}`}>
                        WEB #{hab.peweId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nota Informativa del Pie */}
        <div className="rooms-footer-hint">
          <svg className="hint-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Haz clic en una habitación para gestionar su reserva</span>
        </div>
      </main>

        {/* Modal de Creación / Edición de Habitación */}
        {showCreateModal && (
          <ModalCrearHabitacion
            habitacionToEdit={habitacionAEditar}
            onClose={() => {
              setShowCreateModal(false);
              setHabitacionAEditar(null);
            }}
            onSaved={() => fetchHabitaciones()}
          />
        )}

        {/* Modal de Facturación Directa de Productos (POS) */}
        {showFacturarDirectoModal && (
          <ModalFacturacionDirecta
            isOpen={showFacturarDirectoModal}
            onClose={() => setShowFacturarDirectoModal(false)}
            onFacturaGenerada={() => fetchHabitaciones()}
          />
        )}
      </div>
    </div>
  );
};

