import { useState, useEffect } from 'react';

interface DashboardProps {
  user: { username: string };
  onLogout: () => void;
}

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    // Consultar estado de la conexión
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setDbStatus(data))
      .catch((err) => console.error('Error al obtener estado:', err));
  }, []);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch('/api/habitaciones', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHabitaciones(data);
      }
    } catch (error) {
      console.error('Error al cargar habitaciones:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header superior de navegación */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="brand-logo-small">
            <svg viewBox="0 0 100 100" fill="none" className="logo-svg-small">
              <path
                d="M38 34H62V74H38V34Z"
                stroke="#1e3a8a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 46H38V74H22V46Z"
                stroke="#1e3a8a"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M62 46H78V74H62V46Z"
                stroke="#1e3a8a"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M48 24L52 24V34H48V24Z" stroke="#1e3a8a" strokeWidth="3" />
            </svg>
          </div>
          <div>
            <h2 className="dashboard-hotel-name">HOTEL PARAÍSO</h2>
            <span className="dashboard-hotel-sub">Sistema de Facturación & Recepción</span>
          </div>
        </div>

        <div className="user-profile-badge">
          <div className="user-avatar-circle">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info-text">
            <span className="user-name">{user.username}</span>
            <span className="user-role">Sesión Firebird Activa</span>
          </div>
          <button
            id="btn-logout"
            onClick={onLogout}
            className="btn-logout"
            title="Cerrar sesión"
          >
            <svg
              className="logout-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="dashboard-main">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>¡Bienvenido, {user.username}!</h2>
            <p>Has iniciado sesión correctamente a través de la base de datos Firebird.</p>
          </div>
          <div className="connection-badge">
            <span className="status-dot"></span>
            <span>Firebird Conectado</span>
          </div>
        </div>

        {/* Grid de Estado y Accesos */}
        <div className="dashboard-cards-grid">
          <div className="info-card">
            <div className="info-card-header">
              <span className="card-icon-box">🗄️</span>
              <div>
                <h3>Información de Base de Datos</h3>
                <p className="card-subtext">Servidor local Firebird</p>
              </div>
            </div>
            <div className="info-card-body">
              <div className="info-row">
                <span className="info-label">Host:</span>
                <span className="info-value">{dbStatus?.database?.host || '127.0.0.1'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Puerto:</span>
                <span className="info-value">{dbStatus?.database?.port || '3050'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ruta Base de Datos:</span>
                <span className="info-value path-value" title={dbStatus?.database?.path}>
                  {dbStatus?.database?.path || 'C:\\Sysplus-Repo\\BD\\SYSPLUS.FDB'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Usuario Autenticado:</span>
                <span className="info-value user-highlight">{user.username}</span>
              </div>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card-header">
              <span className="card-icon-box">🛎️</span>
              <div>
                <h3>Módulos del Sistema</h3>
                <p className="card-subtext">Acceso rápido a operaciones</p>
              </div>
            </div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={fetchRooms}>
                <span className="action-icon">🛏️</span>
                <span className="action-title">Habitaciones</span>
                <span className="action-desc">Ver disponibilidad</span>
              </button>
              <button className="quick-action-btn" onClick={() => alert('Módulo de Facturación')}>
                <span className="action-icon">🧾</span>
                <span className="action-title">Facturación</span>
                <span className="action-desc">Crear nueva factura</span>
              </button>
              <button className="quick-action-btn" onClick={() => alert('Módulo de Huéspedes')}>
                <span className="action-icon">👥</span>
                <span className="action-title">Huéspedes</span>
                <span className="action-desc">Check-in / Check-out</span>
              </button>
            </div>

            {loadingRooms && <p className="loading-text">Cargando habitaciones...</p>}
            {habitaciones.length > 0 && (
              <div className="rooms-preview">
                <h4>Habitaciones cargadas desde la API:</h4>
                <div className="rooms-list">
                  {habitaciones.map((room) => (
                    <div key={room.id} className="room-chip">
                      Hab. #{room.id} - <span className="room-state">{room.estado}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
