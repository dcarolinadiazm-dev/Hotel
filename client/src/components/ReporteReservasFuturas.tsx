import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export interface ReservaFuturaItem {
  idMovim: number;
  habitacionId: string;
  habitacionNumero: string;
  habitacionTipo: string;
  habitacionPiso: number;
  huesped: string;
  documento: string;
  telefono: string;
  fechaReserva: string;
  fechaSalida: string;
  fechaReservaTexto: string;
  fechaSalidaTexto: string;
  noches: number;
  precioNoche: number;
  totalEstadia: number;
  abonos: number;
  saldoPendiente: number;
  estadoReserva: string;
  peweId?: number;
  observaciones?: string;
}

interface ReporteReservasFuturasProps {
  user: { username: string };
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onBackToRooms: () => void;
  onGoToPedidosReport?: () => void;
  onGoToCartera?: () => void;
  onGoToCierres?: () => void;
  onLogout: () => void;
}

export const ReporteReservasFuturas = ({
  user,
  sidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onBackToRooms,
  onGoToPedidosReport,
  onGoToCartera,
  onGoToCierres,
  onLogout,
}: ReporteReservasFuturasProps) => {
  const [reservas, setReservas] = useState<ReservaFuturaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSidebarOpen, setLocalSidebarOpen] = useState(false);

  const sidebarOpen = controlledSidebarOpen !== undefined ? controlledSidebarOpen : localSidebarOpen;
  const toggleSidebar = onToggleSidebar || (() => setLocalSidebarOpen((prev) => !prev));

  // Fechas y Filtros
  const getLocalDateStr = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getLocalDateStr();
  const [fechaDesde, setFechaDesde] = useState(todayStr);
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedHabNumero, setSelectedHabNumero] = useState<string>('TODAS');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  const fetchReservas = async () => {
    setLoading(true);
    const token = localStorage.getItem('hotel_token');
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      if (busquedaTexto) params.append('busqueda', busquedaTexto);

      const res = await fetch(`/api/reportes/reservas-futuras?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setReservas(data.reservas || []);
      }
    } catch (err) {
      console.error('Error cargando reservas futuras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
  }, [fechaDesde, fechaHasta]);

  // Lista única de números de habitación para el selector
  const habitacionesDisponibles = Array.from(
    new Set(reservas.map((r) => r.habitacionNumero).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Filtrado en memoria
  const reservasFiltradas = reservas.filter((r) => {
    if (selectedHabNumero !== 'TODAS' && r.habitacionNumero !== selectedHabNumero) {
      return false;
    }
    if (busquedaTexto.trim()) {
      const q = busquedaTexto.trim().toLowerCase();
      const matchHab = r.habitacionNumero.toLowerCase().includes(q);
      const matchHuesped = r.huesped.toLowerCase().includes(q);
      const matchDoc = r.documento.toLowerCase().includes(q);
      const matchObs = (r.observaciones || '').toLowerCase().includes(q);
      return matchHab || matchHuesped || matchDoc || matchObs;
    }
    return true;
  });

  const handleExportExcel = () => {
    if (reservasFiltradas.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const dataExcel = reservasFiltradas.map((r) => ({
      'Habitación': r.habitacionNumero,
      'Tipo': r.habitacionTipo,
      'Piso': r.habitacionPiso,
      'Huésped': r.huesped,
      'Documento/NIT': r.documento,
      'Teléfono/Cel': r.telefono,
      'Fecha Check-In': r.fechaReservaTexto,
      'Fecha Check-Out': r.fechaSalidaTexto,
      'Noches': r.noches,
      'Precio x Noche': r.precioNoche,
      'Total Estadía': r.totalEstadia,
      'Abonos/Anticipos': r.abonos,
      'Saldo Pendiente': r.saldoPendiente,
      'Borrador Web #': r.peweId || '',
      'Observaciones': r.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas_Futuras');
    XLSX.writeFile(wb, `Reporte_Reservas_Futuras_${todayStr}.xlsx`);
  };

  const formatFecha = (val?: string) => {
    if (!val) return '---';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('es-CO', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return val;
    }
  };

  // Métricas acumuladas
  const totalEstadiasProyectadas = reservasFiltradas.reduce((sum, r) => sum + (r.totalEstadia || 0), 0);
  const totalAbonosRegistrados = reservasFiltradas.reduce((sum, r) => sum + (r.abonos || 0), 0);
  const totalSaldoPendiente = reservasFiltradas.reduce((sum, r) => sum + (r.saldoPendiente || 0), 0);
  const totalHabitacionesReservadas = new Set(reservasFiltradas.map((r) => r.habitacionId)).size;

  return (
    <div className="hotel-dashboard-layout">
      {/* Sidebar Izquierdo Azul Moderno */}
      <aside className={`hotel-sidebar-navy ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-top-section">
          <div className="sidebar-brand-box" onClick={onBackToRooms} style={{ cursor: 'pointer' }}>
            <img src="/LogoHotel.png" alt="Hotel" className="sidebar-logo-img" />
          </div>

          <nav className="sidebar-nav-menu">
            <button
              type="button"
              className="sidebar-nav-item"
              onClick={onBackToRooms}
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

            {onGoToPedidosReport && (
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={onGoToPedidosReport}
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
            )}

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

            <button
              type="button"
              className="sidebar-nav-item active"
              onClick={() => { }}
              title="Reporte de Reservas Futuras"
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
          </nav>
        </div>

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

      {/* Contenedor Principal */}
      <div className="hotel-main-wrapper">
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

            {!sidebarOpen && (
              <div className="topbar-brand-box">
                <img src="/LogoHotel.png" alt="Hotel" className="topbar-brand-logo" />
              </div>
            )}
          </div>

          <div className="topbar-right">
            <button className="btn-back-rooms" onClick={onBackToRooms} title="Volver al panel de habitaciones">
              ← Habitaciones
            </button>

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

        {/* Contenido del Reporte */}
        <main className="rooms-main-content">
          <div className="report-header-box">
            <div>
              <h1 className="rooms-main-title">Agenda y Reporte de Reservas Futuras</h1>
              <p className="rooms-subtitle">Control y programación de huéspedes con reserva para fechas próximas</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-excel-export"
                onClick={handleExportExcel}
                disabled={reservasFiltradas.length === 0}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📥 Exportar Excel
              </button>
            </div>
          </div>

          {/* Tarjetas de Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '20px 0' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>📅 Reservas Agendadas</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
                {reservasFiltradas.length}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>🏨 Habs. con Reserva</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a8a', marginTop: '4px' }}>
                {totalHabitacionesReservadas}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>💰 Total Proyectado</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#14532d', marginTop: '4px' }}>
                ${totalEstadiasProyectadas.toLocaleString('es-CO')}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>💵 Anticipos Recibidos</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>
                ${totalAbonosRegistrados.toLocaleString('es-CO')}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>⏳ Saldo Pendiente</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
                ${totalSaldoPendiente.toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="report-filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Llegada Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Habitación:</label>
              <select
                value={selectedHabNumero}
                onChange={(e) => setSelectedHabNumero(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="TODAS">Todas las Habitaciones</option>
                {habitacionesDisponibles.map((hNum) => (
                  <option key={hNum} value={hNum}>
                    Habitación #{hNum}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Buscar por Huésped, NIT, Habitación u Observaciones..."
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            {(fechaDesde !== todayStr || fechaHasta || selectedHabNumero !== 'TODAS' || busquedaTexto) && (
              <button
                type="button"
                onClick={() => {
                  setFechaDesde(todayStr);
                  setFechaHasta('');
                  setSelectedHabNumero('TODAS');
                  setBusquedaTexto('');
                }}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          {/* Tabla de Reservas Futuras */}
          <div className="report-table-container" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
                <p style={{ color: '#64748b' }}>Cargando agenda de reservas futuras...</p>
              </div>
            ) : reservasFiltradas.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <span style={{ fontSize: '36px' }}>📅</span>
                <p style={{ margin: '10px 0 0 0', fontWeight: 600 }}>No hay reservas agendadas con los filtros seleccionados.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px' }}>Habitación</th>
                    <th style={{ padding: '12px 14px' }}>Huésped/Documento</th>
                    <th style={{ padding: '12px 14px' }}>Check-In</th>
                    <th style={{ padding: '12px 14px' }}>Check-Out</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Noches</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Abonos</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map((r) => {
                    return (
                      <tr key={r.idMovim} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                            #{r.habitacionNumero}
                          </span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {r.habitacionTipo} · P{r.habitacionPiso}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            👤 {r.huesped}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            NIT/CC: {r.documento || 'Sin doc.'} {r.telefono ? `· 📞 ${r.telefono}` : ''}
                          </div>
                          {r.observaciones && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                              📝 {r.observaciones}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 600 }}>
                          {formatFecha(r.fechaReservaTexto)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {formatFecha(r.fechaSalidaTexto)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            🌙 {r.noches}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#14532d' }}>
                          ${r.totalEstadia.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          ${r.abonos.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: r.saldoPendiente > 0 ? '#b45309' : '#64748b' }}>
                          ${r.saldoPendiente.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
