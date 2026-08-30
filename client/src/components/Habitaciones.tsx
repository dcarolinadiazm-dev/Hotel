import { useState, useEffect } from 'react';
import { ModalCrearHabitacion } from './ModalCrearHabitacion';
import { ModalFacturacionDirecta } from './ModalFacturacionDirecta';
import { ModalFacturacionMultiHabitacion } from './ModalFacturacionMultiHabitacion';
import { ModalAperturaTurno } from './ModalAperturaTurno';
import { ModalCierreZ } from './ModalCierreZ';
import { ModalImpresionCierreZ, type ResumenCierreZData } from './ModalImpresionCierreZ';

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
  totalReservasFuturas?: number;
  todosHuespedes?: string;
  todosDocumentos?: string;
}

interface Turno {
  ID_TURNO: number;
  USUARIO: string;
  FECHA_APERTURA: string | Date;
  BASE: number;
  ESTADO: string;
  OBSERVACIONES?: string;
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
  onGoToCierres?: () => void;
  onGoToReservasFuturas?: () => void;
  onLogout: () => void;
}

export const Habitaciones = ({
  user,
  refreshKey = 0,
  sidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onOpenModal,
  onGoToReports,
  onGoToCartera,
  onGoToCierres,
  onGoToReservasFuturas,
  onLogout,
}: HabitacionesProps) => {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('DISPONIBLE');
  const [busquedaHuesped, setBusquedaHuesped] = useState<string>('');
  const [selectedHabIds, setSelectedHabIds] = useState<string[]>([]);
  const [showMultiFacturarModal, setShowMultiFacturarModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFacturarDirectoModal, setShowFacturarDirectoModal] = useState(false);
  const [habitacionAEditar, setHabitacionAEditar] = useState<Habitacion | null>(null);
  const [localSidebarOpen, setLocalSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Estados de Turno y Cierre Z
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
  const [checkingTurno, setCheckingTurno] = useState<boolean>(true);
  const [showModalApertura, setShowModalApertura] = useState<boolean>(false);
  const [showModalCierreZ, setShowModalCierreZ] = useState<boolean>(false);
  const [cierreZTicketData, setCierreZTicketData] = useState<ResumenCierreZData | null>(null);

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




  const fetchTurnoActivo = async () => {
    try {
      setCheckingTurno(true);
      const res = await fetch('/api/turnos/activo');
      const data = await res.json();
      if (res.ok && data.turno) {
        setTurnoActivo(data.turno);
      } else {
        setTurnoActivo(null);
      }
    } catch (e) {
      console.error('Error consultando turno activo:', e);
      setTurnoActivo(null);
    } finally {
      setCheckingTurno(false);
    }
  };

  const fetchHabitaciones = async () => {
    const token = localStorage.getItem('hotel_token');
    try {
      setLoading(true);
      setError(null);
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
    fetchTurnoActivo();
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
    // 1. Filtro por estado (si no es TODOS)
    if (filtroEstado !== 'TODOS') {
      const e = h.estado.toLowerCase().trim();
      if (filtroEstado === 'DISPONIBLE' && e !== 'disponible') return false;
      if (filtroEstado === 'RESERVADA' && e !== 'reservada') return false;
      if (filtroEstado === 'OCUPADA' && e !== 'ocupada') return false;
      if (filtroEstado === 'INHABILITADA' && e !== 'inhabilitada' && e !== 'inhabilitado' && e !== 'mantenimiento') return false;
    }

    // 2. Filtro por texto de búsqueda (Huésped, Documento o Número de Habitación)
    if (busquedaHuesped.trim()) {
      const q = busquedaHuesped.trim().toLowerCase();
      const matchHuesped =
        (h.huesped ? h.huesped.toLowerCase().includes(q) : false) ||
        (h.todosHuespedes ? h.todosHuespedes.toLowerCase().includes(q) : false);
      const matchDoc =
        (h.documento ? h.documento.toLowerCase().includes(q) : false) ||
        (h.todosDocumentos ? h.todosDocumentos.toLowerCase().includes(q) : false);
      const matchNum = h.numero ? h.numero.toLowerCase().includes(q) : false;
      return matchHuesped || matchDoc || matchNum;
    }

    return true;
  });

  const occupiedFiltered = habitacionesFiltradas.filter(
    (h) => h.estado.toLowerCase().trim() === 'ocupada'
  );

  const getStatusClass = (estado: string) => {
    const norm = estado.toLowerCase().trim();
    if (norm === 'disponible') return 'status-disponible';
    if (norm === 'reservada') return 'status-reservada';
    if (norm === 'ocupada') return 'status-ocupada';
    if (norm === 'inhabilitada' || norm === 'inhabilitado' || norm === 'mantenimiento') return 'status-inhabilitada';
    return 'status-disponible';
  };

  const toggleSelectHab = (e: React.MouseEvent, targetHab: Habitacion) => {
    e.stopPropagation();
    const isCurrentlySelected = selectedHabIds.includes(targetHab.id);

    if (isCurrentlySelected) {
      setSelectedHabIds((prev) => prev.filter((x) => x !== targetHab.id));
      return;
    }

    // Validar que todas las habitaciones seleccionadas pertenezcan al mismo huésped/empresa
    if (selectedHabIds.length > 0) {
      const alreadySelected = habitaciones.filter((h) => selectedHabIds.includes(h.id));
      const firstDoc = (alreadySelected[0]?.documento || '').trim().toLowerCase();
      const firstHuesped = (alreadySelected[0]?.huesped || '').trim().toLowerCase();
      const targetDoc = (targetHab.documento || '').trim().toLowerCase();
      const targetHuesped = (targetHab.huesped || '').trim().toLowerCase();

      const sameDoc = firstDoc && targetDoc && firstDoc === targetDoc;
      const sameHuesped = firstHuesped && targetHuesped && firstHuesped === targetHuesped;

      if (!sameDoc && !sameHuesped && (firstDoc || targetDoc || firstHuesped || targetHuesped)) {
        alert(
          `⚠️ No se pueden consolidar habitaciones de diferentes clientes en una sola factura.\n\n` +
          `Cliente actual: ${alreadySelected[0]?.huesped || 'Sin nombre'} (${alreadySelected[0]?.documento || 'Sin doc'})\n` +
          `Habitación #${targetHab.numero}: ${targetHab.huesped || 'Sin nombre'} (${targetHab.documento || 'Sin doc'})`
        );
        return;
      }
    }

    setSelectedHabIds((prev) => [...prev, targetHab.id]);
  };

  const handleSelectAllFilteredOccupied = () => {
    const occupied = occupiedFiltered;
    if (occupied.length === 0) return;

    const firstDoc = (occupied[0]?.documento || '').trim().toLowerCase();
    const firstHuesped = (occupied[0]?.huesped || '').trim().toLowerCase();

    // Seleccionar solo aquellas que tengan coincidencia de cliente con la primera
    const sameClientHabs = occupied.filter((h) => {
      const doc = (h.documento || '').trim().toLowerCase();
      const nom = (h.huesped || '').trim().toLowerCase();
      if (firstDoc && doc) return doc === firstDoc;
      if (firstHuesped && nom) return nom === firstHuesped;
      return true;
    });

    const sameClientIds = sameClientHabs.map((h) => h.id);

    if (selectedHabIds.length === sameClientIds.length && sameClientIds.length > 0) {
      setSelectedHabIds([]);
    } else {
      setSelectedHabIds(sameClientIds);
    }
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
              onClick={() => { }}
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
              title="Reporte de Facturas"
            >
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span className="nav-item-label">Reporte Facturas</span>
            </button>

            {onGoToCartera && (
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
            )}

            {onGoToCierres && (
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={onGoToCierres}
                title="Historial de Cierres Z y Turnos"
              >
                <span className="nav-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <span className="nav-item-label">Cierres Z / Turnos</span>
              </button>
            )}

            {onGoToReservasFuturas && (
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={onGoToReservasFuturas}
                title="Reporte de Reservas Futuras y Agenda"
              >
                <span className="nav-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <span className="nav-item-label">Reservas Futuras</span>
              </button>
            )}
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
              <button className="btn-nav-tab" onClick={onGoToReports} title="Ver Reporte de Facturas">
                📊 Reportes
              </button>
            )}

            {/* Botón de Apertura de Turno o Cierre Z */}
            {turnoActivo ? (
              <button
                type="button"
                className="btn-cierre-z-topbar"
                onClick={() => setShowModalCierreZ(true)}
                title={`Realizar Cierre Z de Turno #${turnoActivo.ID_TURNO}`}
              >
                🔒 Cierre Z (Turno #{turnoActivo.ID_TURNO})
              </button>
            ) : (
              <button
                type="button"
                className="btn-apertura-topbar"
                onClick={() => setShowModalApertura(true)}
                title="Realizar Apertura de Turno"
              >
                🔑 Apertura de Turno
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
          {checkingTurno ? (
            <div className="rooms-loading-state" style={{ minHeight: '350px' }}>
              <div className="spinner"></div>
              <p>Verificando estado del turno...</p>
            </div>
          ) : !turnoActivo ? (
            /* Pantalla de Bloqueo de Habitaciones si no se ha realizado la Apertura de Turno */
            <div className="rooms-locked-shift-container">
              <div className="rooms-locked-shift-card">
                <div className="locked-shift-icon">🔑</div>
                <h2 className="locked-shift-title">Turno No Iniciado</h2>
                <p className="locked-shift-desc">
                  Para comenzar a registrar reservas, pedidos y gestionar las habitaciones en tiempo real, debe realizar la <b>Apertura de Turno</b> ingresando la base inicial de caja.
                </p>
                <button
                  type="button"
                  className="btn-open-shift-large"
                  onClick={() => setShowModalApertura(true)}
                >
                  🔑 Realizar Apertura de Turno
                </button>
              </div>
            </div>
          ) : (
            /* Vista Normal de Gestión de Habitaciones (Con Turno Abierto) */
            <>
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

                  {/* Buscador de habitaciones / huéspedes en todos los estados */}
                  <div className="rooms-guest-search-box">
                    <div className="guest-search-input-wrapper">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        className="guest-search-input"
                        placeholder="Buscar huésped, documento o habitación (en todos los estados)..."
                        value={busquedaHuesped}
                        onChange={(e) => setBusquedaHuesped(e.target.value)}
                      />
                      {busquedaHuesped && (
                        <button
                          type="button"
                          className="btn-clear-guest-search"
                          onClick={() => {
                            setBusquedaHuesped('');
                            setSelectedHabIds([]);
                          }}
                          title="Limpiar búsqueda"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {busquedaHuesped && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="guest-search-count-badge">
                          Filtrando {habitacionesFiltradas.length} {habitacionesFiltradas.length === 1 ? 'habitación' : 'habitaciones'}
                        </span>
                        {occupiedFiltered.length > 1 && (
                          <button
                            type="button"
                            className="btn-select-all-filtered"
                            onClick={handleSelectAllFilteredOccupied}
                            title="Seleccionar todas las habitaciones ocupadas filtradas para facturación consolidada"
                          >
                            {selectedHabIds.length === occupiedFiltered.length && occupiedFiltered.length > 0
                              ? 'Deseleccionar todas'
                              : `☑️ Seleccionar las ${occupiedFiltered.length} ocupadas`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                    const isOcupada = hab.estado === 'Ocupada';
                    const isLocked = isReservada || isOcupada;
                    const isSelected = selectedHabIds.includes(hab.id);
                    const hasFiltroActivo = busquedaHuesped.trim().length > 0;

                    return (
                      <div
                        key={hab.id}
                        className={`room-card ${statusClass}-card ${isSelected ? 'room-card-selected' : ''}`}
                        onClick={() => onOpenModal(hab)}
                      >
                        <div className="room-card-top-bar">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isOcupada && hasFiltroActivo && (
                              <div
                                className={`room-checkbox-selector ${isSelected ? 'checked' : ''}`}
                                onClick={(e) => toggleSelectHab(e, hab)}
                                title={isSelected ? 'Deseleccionar habitación' : 'Seleccionar habitación para facturación conjunta'}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => { }}
                                  className="room-card-checkbox-input"
                                />
                              </div>
                            )}
                            <span className="room-badge-type">{hab.tipo || 'SENCILLA'} · P{hab.piso || 1}</span>
                          </div>

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
                          {(hab.estado === 'Ocupada' || hab.estado === 'Reservada') && hab.huesped ? (
                            <span className="room-guest-name" title={hab.huesped}>
                              👤 {hab.huesped}
                            </span>
                          ) : (
                            <span className="room-art-tag">
                              🏷️ Art: {hab.artiCod || '001'} · ${Number(hab.precioNoche || 0).toLocaleString('es-CO')}
                            </span>
                          )}
                          {hab.estado === 'Disponible' && Boolean(hab.totalReservasFuturas && hab.totalReservasFuturas > 0) && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#b45309',
                                background: '#fef3c7',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                display: 'inline-block',
                                marginTop: '4px',
                              }}
                              title={`${hab.totalReservasFuturas} reserva(s) programada(s) para fechas futuras`}
                            >
                              📅 {hab.totalReservasFuturas} reserva(s) futura(s)
                            </span>
                          )}
                        </div>

                        {/* Indicadores de Consumos / Abonos */}
                        {hab.estado === 'Ocupada' && (
                          <div className="room-card-footer">
                            <span className="room-products-count">
                              Con productos {hab.productos}
                            </span>
                            {hab.peweId && (
                              <span className="room-pewe-badge" title={`Borrador de Factura WEB #${hab.peweId}`}>
                                WEB #{hab.peweId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Barra Flotante de Facturación Múltiple */}
              {selectedHabIds.length > 0 && !showMultiFacturarModal && (
                <div className="multi-room-floating-bar">
                  <div className="floating-bar-info">
                    <span className="floating-bar-badge">
                      ☑️ {selectedHabIds.length} {selectedHabIds.length === 1 ? 'habitación seleccionada' : 'habitaciones seleccionadas'}
                    </span>
                    <span className="floating-bar-habs">
                      (Habs: {habitaciones.filter((h) => selectedHabIds.includes(h.id)).map((h) => `#${h.numero}`).join(', ')})
                    </span>
                  </div>
                  <div className="floating-bar-actions">
                    <button
                      type="button"
                      className="btn-floating-clear"
                      onClick={() => setSelectedHabIds([])}
                    >
                      ✕ Desmarcar
                    </button>
                    <button
                      type="button"
                      className="btn-floating-facturar"
                      onClick={() => setShowMultiFacturarModal(true)}
                    >
                      🧾 Facturar {selectedHabIds.length} Habitaciones Juntas
                    </button>
                  </div>
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
            </>
          )}
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

        {/* Modal de Apertura de Turno */}
        {showModalApertura && (
          <ModalAperturaTurno
            user={user}
            onClose={() => setShowModalApertura(false)}
            onTurnoAbierto={(nuevoTurno) => {
              setTurnoActivo(nuevoTurno);
              setShowModalApertura(false);
              fetchHabitaciones();
            }}
          />
        )}

        {/* Modal de Cierre Z */}
        {showModalCierreZ && turnoActivo && (
          <ModalCierreZ
            idTurno={turnoActivo.ID_TURNO}
            user={user}
            onClose={() => setShowModalCierreZ(false)}
            onCierreCompletado={(ticketData) => {
              setShowModalCierreZ(false);
              setTurnoActivo(null);
              setCierreZTicketData(ticketData);
            }}
          />
        )}

        {/* Modal de Impresión POS de Cierre Z */}
        {cierreZTicketData && (
          <ModalImpresionCierreZ
            data={cierreZTicketData}
            onClose={() => {
              setCierreZTicketData(null);
              onLogout();
            }}
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

        {/* Modal de Facturación Consolidada de Múltiples Habitaciones */}
        {showMultiFacturarModal && (
          <ModalFacturacionMultiHabitacion
            isOpen={showMultiFacturarModal}
            habitaciones={habitaciones.filter((h) => selectedHabIds.includes(h.id))}
            onClose={() => setShowMultiFacturarModal(false)}
            onFacturaCompletada={() => {
              setShowMultiFacturarModal(false);
              setSelectedHabIds([]);
              fetchHabitaciones();
            }}
          />
        )}
      </div>
    </div>
  );
};
