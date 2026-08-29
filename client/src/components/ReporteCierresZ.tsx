import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ModalImpresionCierreZ, type ResumenCierreZData } from './ModalImpresionCierreZ';

export interface TurnoReporteItem {
  idTurno: number;
  usuario: string;
  fechaApertura: string;
  fechaCierre?: string | null;
  base: number;
  estado: string;
  totalVentas: number;
  totalPagos: number;
  observaciones?: string;
}

interface ReporteCierresZProps {
  user: { username: string };
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onBackToRooms: () => void;
  onGoToPedidosReport?: () => void;
  onGoToCartera?: () => void;
  onLogout: () => void;
}

export const ReporteCierresZ = ({
  user,
  sidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onBackToRooms,
  onGoToPedidosReport,
  onGoToCartera,
  onLogout,
}: ReporteCierresZProps) => {
  const [turnos, setTurnos] = useState<TurnoReporteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSidebarOpen, setLocalSidebarOpen] = useState(false);
  const [selectedTicketData, setSelectedTicketData] = useState<ResumenCierreZData | null>(null);
  const [cargandoTicket, setCargandoTicket] = useState<boolean>(false);

  const sidebarOpen = controlledSidebarOpen !== undefined ? controlledSidebarOpen : localSidebarOpen;
  const toggleSidebar = onToggleSidebar || (() => setLocalSidebarOpen((prev) => !prev));

  // Filtros
  const getLocalDateStr = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getLocalDateStr();
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  const fetchTurnos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      if (filtroEstado !== 'TODOS') params.append('estado', filtroEstado);

      const res = await fetch(`/api/turnos/historial?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTurnos(data.turnos || []);
      }
    } catch (err) {
      console.error('Error cargando historial de turnos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
  }, [fechaDesde, fechaHasta, filtroEstado]);

  const handleReimprimirTurno = async (idTurno: number) => {
    setCargandoTicket(true);
    try {
      const res = await fetch(`/api/turnos/detalle/${idTurno}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener detalle del turno');
      }

      const ticketData: ResumenCierreZData = {
        ...data,
        fechaCierre: data.fechaCierreEstimada || data.fechaCierre || new Date().toISOString(),
        observaciones: data.turno?.observacionesApertura || data.observaciones,
      };

      setSelectedTicketData(ticketData);
    } catch (err: any) {
      alert(`⚠️ No se pudo cargar el reporte de Cierre Z: ${err.message}`);
    } finally {
      setCargandoTicket(false);
    }
  };

  const handleExportExcel = () => {
    if (turnosFiltrados.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const dataExcel = turnosFiltrados.map((t) => ({
      'Turno #': t.idTurno,
      'Usuario / Cajero': t.usuario,
      'Fecha Apertura': formatFecha(t.fechaApertura),
      'Fecha Cierre': formatFecha(t.fechaCierre),
      'Base Inicial': t.base,
      'Total Facturado': t.totalVentas,
      'Total Recaudado': t.totalPagos,
      'Estado': t.estado,
      'Observaciones': t.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Cierres_Z');
    XLSX.writeFile(wb, `Reporte_Cierres_Z_${todayStr}.xlsx`);
  };

  const formatFecha = (isoString?: string | null) => {
    if (!isoString) return '---';
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
      return String(isoString);
    }
  };

  // Filtrado en memoria por texto
  const turnosFiltrados = turnos.filter((t) => {
    if (!busquedaTexto.trim()) return true;
    const q = busquedaTexto.trim().toLowerCase();
    const matchId = String(t.idTurno).includes(q);
    const matchUser = t.usuario.toLowerCase().includes(q);
    const matchObs = (t.observaciones || '').toLowerCase().includes(q);
    return matchId || matchUser || matchObs;
  });

  // Métricas acumuladas
  const totalBaseAcumulada = turnosFiltrados.reduce((sum, t) => sum + (t.base || 0), 0);
  const totalVentasAcumuladas = turnosFiltrados.reduce((sum, t) => sum + (t.totalVentas || 0), 0);
  const totalPagosAcumulados = turnosFiltrados.reduce((sum, t) => sum + (t.totalPagos || 0), 0);

  return (
    <div className="hotel-app-layout">
      {/* Sidebar Izquierdo */}
      <aside className={`hotel-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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

            <button
              type="button"
              className="sidebar-nav-item active"
              onClick={() => {}}
              title="Historial de Cierres Z"
            >
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <span className="nav-item-label">Cierres Z / Turnos</span>
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
              <h1 className="rooms-main-title">Historial de Cierres Z y Turnos</h1>
              <p className="rooms-subtitle">Auditoría de turnos, arqueo de caja y reimpresión de comprobantes</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-excel-export"
                onClick={handleExportExcel}
                disabled={turnosFiltrados.length === 0}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📥 Exportar Excel
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen Acumulado */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '20px 0' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>🔢 Turnos Mostrados</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
                {turnosFiltrados.length}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>💵 Total Bases de Caja</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a8a', marginTop: '4px' }}>
                ${totalBaseAcumulada.toLocaleString('es-CO')}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>🧾 Total Facturado</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#14532d', marginTop: '4px' }}>
                ${totalVentasAcumuladas.toLocaleString('es-CO')}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>💳 Total Recaudos</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#5b21b6', marginTop: '4px' }}>
                ${totalPagosAcumulados.toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {/* Filtros Bar */}
          <div className="report-filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Desde:</label>
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
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Estado:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="Cerrado">Cerrados</option>
                <option value="Abierto">Abiertos</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Buscar por Turno #, cajero u observaciones..."
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            {(fechaDesde || fechaHasta || filtroEstado !== 'TODOS' || busquedaTexto) && (
              <button
                type="button"
                onClick={() => {
                  setFechaDesde('');
                  setFechaHasta('');
                  setFiltroEstado('TODOS');
                  setBusquedaTexto('');
                }}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          {/* Tabla de Cierres Z */}
          <div className="report-table-container" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
                <p style={{ color: '#64748b' }}>Cargando historial de Cierres Z...</p>
              </div>
            ) : turnosFiltrados.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <span style={{ fontSize: '36px' }}>🔒</span>
                <p style={{ margin: '10px 0 0 0', fontWeight: 600 }}>No se encontraron turnos con los filtros seleccionados.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px' }}>Turno #</th>
                    <th style={{ padding: '12px 14px' }}>Cajero / Usuario</th>
                    <th style={{ padding: '12px 14px' }}>Apertura</th>
                    <th style={{ padding: '12px 14px' }}>Cierre</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Base Inicial</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Facturado</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Recaudos</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosFiltrados.map((t) => {
                    const isCerrado = t.estado.toLowerCase().trim() === 'cerrado';

                    return (
                      <tr key={t.idTurno} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            #{t.idTurno}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                          👤 {t.usuario}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {formatFecha(t.fechaApertura)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {formatFecha(t.fechaCierre)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#1e40af' }}>
                          ${t.base.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                          ${t.totalVentas.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          ${t.totalPagos.toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isCerrado ? '#f0fdf4' : '#fefce8',
                              color: isCerrado ? '#166534' : '#854d0e',
                              border: `1px solid ${isCerrado ? '#bbf7d0' : '#fef08a'}`,
                            }}
                          >
                            {t.estado}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleReimprimirTurno(t.idTurno)}
                            disabled={cargandoTicket}
                            title="Reimprimir Tirilla de Cierre Z"
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)',
                            }}
                          >
                            🖨️ Reimprimir
                          </button>
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

      {/* Modal de Impresión POS de Cierre Z */}
      {selectedTicketData && (
        <ModalImpresionCierreZ
          data={selectedTicketData}
          onClose={() => setSelectedTicketData(null)}
        />
      )}
    </div>
  );
};
