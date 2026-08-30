import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export interface ClienteCarteraItem {
  nit: string;
  nombre: string;
  telefono: string;
  celular: string;
  email: string;
  ciudad: string;
  zona: string;
  cobrador: string;
  cantDocumentos: number;
  saldo: number;
  rtfte: number;
  rtiva: number;
  rtica: number;
  cupo: number;
  disponible: number;
  radicada: number;
  sinRadicar: number;
  estado: string;
  diasCredito: number;
}

export interface TotalesCartera {
  totalClientes: number;
  totalClientesConSaldo: number;
  totalDocumentos: number;
  totalSaldo: number;
  totalCupo: number;
  totalDisponible: number;
}

interface ReporteCarteraProps {
  user: { username: string };
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onBackToRooms: () => void;
  onGoToPedidosReport: () => void;
  onGoToCierres?: () => void;
  onGoToReservasFuturas?: () => void;
  onLogout: () => void;
}

export const ReporteCartera: React.FC<ReporteCarteraProps> = ({
  user,
  sidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onBackToRooms,
  onGoToPedidosReport,
  onGoToCierres,
  onGoToReservasFuturas,
  onLogout,
}) => {
  const [clientes, setClientes] = useState<ClienteCarteraItem[]>([]);
  const [totales, setTotales] = useState<TotalesCartera>({
    totalClientes: 0,
    totalClientesConSaldo: 0,
    totalDocumentos: 0,
    totalSaldo: 0,
    totalCupo: 0,
    totalDisponible: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [localSidebarOpen, setLocalSidebarOpen] = useState(false);

  const sidebarOpen = controlledSidebarOpen !== undefined ? controlledSidebarOpen : localSidebarOpen;
  const toggleSidebar = onToggleSidebar || (() => setLocalSidebarOpen((prev) => !prev));

  // Filtros de búsqueda
  const getLocalDateStr = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = getLocalDateStr();
  const [fechaCorte, setFechaCorte] = useState<string>(todayStr);
  const [filtroNit, setFiltroNit] = useState<string>('');
  const [filtroNombre, setFiltroNombre] = useState<string>('');
  const [soloConSaldo, setSoloConSaldo] = useState<boolean>(true);

  const fetchCartera = async (targetFecha = fechaCorte) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('hotel_token');
    try {
      const queryParams = new URLSearchParams();
      if (targetFecha) queryParams.append('fecha', targetFecha);
      if (filtroNit.trim()) queryParams.append('nit', filtroNit.trim());
      if (filtroNombre.trim()) queryParams.append('nombre', filtroNombre.trim());

      const res = await fetch(`/api/reportes/cartera?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setClientes(data.clientes || []);
        if (data.totales) {
          setTotales(data.totales);
        }
      } else {
        throw new Error(data.error || 'Error al consultar cartera');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartera();
  }, [fechaCorte]);

  const formatMoney = (val?: number) => {
    const num = Math.round(Number(val || 0));
    return '$' + num.toLocaleString('es-CO');
  };

  // Clientes filtrados en frontend para búsqueda instantánea reactiva
  const clientesFiltrados = clientes.filter((c) => {
    const matchNit = !filtroNit.trim() || c.nit.toLowerCase().includes(filtroNit.trim().toLowerCase());
    const matchNombre = !filtroNombre.trim() || c.nombre.toLowerCase().includes(filtroNombre.trim().toLowerCase());
    const matchSaldo = !soloConSaldo || c.saldo > 0;
    return matchNit && matchNombre && matchSaldo;
  });

  const sumSaldoFiltrado = clientesFiltrados.reduce((acc, c) => acc + (c.saldo || 0), 0);
  const sumCupoFiltrado = clientesFiltrados.reduce((acc, c) => acc + (c.cupo || 0), 0);
  const sumDispFiltrado = clientesFiltrados.reduce((acc, c) => acc + (c.disponible || 0), 0);
  const sumDocsFiltrado = clientesFiltrados.reduce((acc, c) => acc + (c.cantDocumentos || 0), 0);
  const clientesConSaldoCount = clientesFiltrados.filter((c) => c.saldo > 0).length;

  const handleExportExcel = () => {
    // Exportación nativa a Excel .xlsx (Office Open XML)
    const data = clientesFiltrados.map((c) => ({
      'NIT / Documento': c.nit,
      'Cliente / Razón Social': c.nombre,
      'Email': c.email || '',
      'Teléfono': c.telefono || '',
      'Celular': c.celular || '',
      'Ciudad': c.ciudad || '',
      'Zona': c.zona || '',
      'Docs Pendientes': c.cantDocumentos,
      'Saldo Cartera': Math.round(c.saldo),
      'Cupo Crédito': Math.round(c.cupo),
      'Cupo Disponible': Math.round(c.disponible),
      'Estado': c.estado,
    }));

    // Fila de Totales
    data.push({
      'NIT / Documento': 'TOTALES',
      'Cliente / Razón Social': `TOTAL ${clientesFiltrados.length} CLIENTES`,
      'Email': '',
      'Teléfono': '',
      'Celular': '',
      'Ciudad': '',
      'Zona': '',
      'Docs Pendientes': sumDocsFiltrado,
      'Saldo Cartera': Math.round(sumSaldoFiltrado),
      'Cupo Crédito': Math.round(sumCupoFiltrado),
      'Cupo Disponible': Math.round(sumDispFiltrado),
      'Estado': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajuste de anchos de columnas
    worksheet['!cols'] = [
      { wch: 15 }, // NIT
      { wch: 32 }, // Cliente
      { wch: 28 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 15 }, // Celular
      { wch: 24 }, // Ciudad
      { wch: 14 }, // Zona
      { wch: 16 }, // Docs
      { wch: 18 }, // Saldo
      { wch: 18 }, // Cupo
      { wch: 18 }, // Disponible
      { wch: 12 }, // Estado
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cartera');
    XLSX.writeFile(workbook, `Reporte_Cartera_${fechaCorte}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="hotel-dashboard-layout">
      {/* Sidebar Izquierdo Azul Idéntico a Habitaciones y Reportes */}
      <aside className={`hotel-sidebar-navy ${sidebarOpen ? 'open' : 'closed'} no-print`}>
        <div className="sidebar-top-section">
          {/* Logo en Sidebar */}
          <div className="sidebar-brand-box" onClick={onBackToRooms} style={{ cursor: 'pointer' }}>
            <img src="/LogoHotel.png" alt="Hotel" className="sidebar-logo-img" />
          </div>

          {/* Menú de Navegación */}
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

            <button
              type="button"
              className="sidebar-nav-item"
              onClick={onGoToPedidosReport}
              title="Reporte de Facturas"
            >
              <span className="nav-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span className="nav-item-label">Reportes</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-item active"
              onClick={() => { }}
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
        {/* Barra Superior */}
        <header className="hotel-topbar no-print">
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
              <div className="topbar-brand-box" onClick={onBackToRooms} style={{ cursor: 'pointer' }}>
                <img src="/LogoHotel.png" alt="Hotel" className="topbar-brand-logo" />
              </div>
            )}
          </div>

          <div className="topbar-right">
            {!sidebarOpen && (
              <button className="btn-nav-tab" onClick={onBackToRooms}>
                🛏️ Habitaciones
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

        {/* Contenido Principal */}
        <main className="report-main-content">
          {/* Encabezado visible en pantalla e impresión */}
          <div className="report-header-box">
            <div className="print-only-logo" style={{ display: 'none' }}>
              <img src="/LogoHotel.png" alt="Logo" style={{ maxHeight: '60px', marginBottom: '10px' }} />
            </div>
            <h1 className="report-main-title">💼 Reporte de Cartera Consolidada</h1>
            <p className="report-main-subtitle">
              Saldos pendientes, límites de crédito y estado de cuenta de clientes a fecha de corte: <strong>{fechaCorte}</strong>
            </p>
          </div>

          {/* Tarjetas KPI de Resumen */}
          <div className="cartera-kpi-grid">
            <div className="cartera-kpi-card card-kpi-red">
              <div className="cartera-kpi-icon">💰</div>
              <div className="cartera-kpi-content">
                <span className="cartera-kpi-title">Saldo Total Cartera</span>
                <span className="cartera-kpi-amount text-danger">{formatMoney(sumSaldoFiltrado)}</span>
                <span className="cartera-kpi-meta">{clientesConSaldoCount} clientes con saldo pendiente</span>
              </div>
            </div>

            <div className="cartera-kpi-card card-kpi-blue">
              <div className="cartera-kpi-icon">👥</div>
              <div className="cartera-kpi-content">
                <span className="cartera-kpi-title">Clientes en Cartera</span>
                <span className="cartera-kpi-amount text-primary">{clientesFiltrados.length}</span>
                <span className="cartera-kpi-meta">De {totales.totalClientes} registrados</span>
              </div>
            </div>

            <div className="cartera-kpi-card card-kpi-purple">
              <div className="cartera-kpi-icon">📑</div>
              <div className="cartera-kpi-content">
                <span className="cartera-kpi-title">Facturas / Docs Pendientes</span>
                <span className="cartera-kpi-amount text-purple">{sumDocsFiltrado}</span>
                <span className="cartera-kpi-meta">Documentos por cobrar</span>
              </div>
            </div>

            <div className="cartera-kpi-card card-kpi-green">
              <div className="cartera-kpi-icon">💳</div>
              <div className="cartera-kpi-content">
                <span className="cartera-kpi-title">Cupo Disponible</span>
                <span className="cartera-kpi-amount text-success">{formatMoney(sumDispFiltrado)}</span>
                <span className="cartera-kpi-meta">Cupo Total: {formatMoney(sumCupoFiltrado)}</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="report-filters-bar no-print">
            <div className="filter-group">
              <label className="filter-label">📅 Fecha de corte</label>
              <div className="filter-input-wrapper filter-date-wrapper">
                <input
                  type="date"
                  className="filter-input"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-filter-quick-today"
                  onClick={() => setFechaCorte(todayStr)}
                  title="Establecer fecha de hoy"
                >
                  Hoy
                </button>
              </div>
            </div>

            <div className="filter-group filter-input-grow">
              <label className="filter-label">🔍 Filtrar por NIT / Cédula</label>
              <div className="filter-input-wrapper">
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Ej: 10001000100..."
                  value={filtroNit}
                  onChange={(e) => setFiltroNit(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-group filter-input-grow-2">
              <label className="filter-label">👤 Filtrar por Nombre / Razón Social</label>
              <div className="filter-input-wrapper">
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Ej: Daniel / Diana / Consumidor..."
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-group-toggle">
              <label className="checkbox-toggle-label">
                <input
                  type="checkbox"
                  checked={soloConSaldo}
                  onChange={(e) => setSoloConSaldo(e.target.checked)}
                />
                <span>Solo con saldo (&gt; $0)</span>
              </label>
            </div>

            <button
              type="button"
              className="btn-generate-report"
              onClick={() => fetchCartera()}
            >
              🔄 Consultar
            </button>
          </div>

          {/* Botones de Exportación */}
          <div className="report-export-buttons-row no-print">
            <button
              type="button"
              className="btn-export-excel"
              onClick={handleExportExcel}
              disabled={clientesFiltrados.length === 0}
              title="Descargar archivo Excel CSV compatible con fórmulas"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="17" />
                <line x1="16" y1="13" x2="8" y2="17" />
              </svg>
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              className="btn-export-pdf"
              onClick={handleExportPDF}
              disabled={clientesFiltrados.length === 0}
              title="Imprimir o Guardar en PDF"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="10" y1="12" x2="14" y2="12" />
                <line x1="10" y1="16" x2="14" y2="16" />
              </svg>
              <span>Imprimir / PDF</span>
            </button>
          </div>

          {/* Tabla de Resultados de Cartera */}
          <div className="report-table-card print-table-container">
            <table className="report-table cartera-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>NIT / Doc</th>
                  <th style={{ minWidth: '180px' }}>Cliente / Razón Social</th>
                  <th style={{ width: '120px' }}>Teléfono</th>
                  <th style={{ minWidth: '160px' }}>Ciudad / Zona</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Docs</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Saldo Cartera</th>
                  <th style={{ width: '125px', textAlign: 'right' }}>Cupo Crédito</th>
                  <th style={{ width: '125px', textAlign: 'right' }}>Disponible</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="table-loading-cell">
                      <div className="spinner"></div>
                      <p>Consultando cartera en base de datos Firebird...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#b91c1c' }}>
                      ❌ {error}
                    </td>
                  </tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      📭 No se encontraron clientes o cuentas por cobrar con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((c, idx) => {
                    return (
                      <tr key={idx} className={c.saldo > 0 ? 'cartera-row-highlight' : ''}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                          {c.nit}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.nombre}</div>
                          {c.email && <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>{c.email}</div>}
                        </td>
                        <td style={{ color: '#475569', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          {c.celular || c.telefono || '-'}
                        </td>
                        <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <div>{c.ciudad || '-'}</div>
                          {c.zona && <span style={{ fontSize: '11px', color: '#64748b' }}>Zona: {c.zona}</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge-cartera-docs ${c.cantDocumentos > 0 ? 'badge-docs-active' : ''}`}>
                            {c.cantDocumentos}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: c.saldo > 0 ? '#dc2626' : '#64748b', whiteSpace: 'nowrap' }}>
                          {formatMoney(c.saldo)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatMoney(c.cupo)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
                          {formatMoney(c.disponible)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge-cartera-status ${c.estado === 'Activo' ? 'status-active-green' : 'status-inactive-gray'}`}>
                            {c.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {clientesFiltrados.length > 0 && !loading && (
                <tfoot>
                  <tr className="report-table-footer-row">
                    <td colSpan={4} style={{ fontWeight: 700, color: '#0f172a' }}>
                      TOTALES CONSOLIDADOS ({clientesFiltrados.length} clientes):
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#1e3a8a' }}>
                      {sumDocsFiltrado}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 900, color: '#dc2626', fontSize: '15px', whiteSpace: 'nowrap' }}>
                      {formatMoney(sumSaldoFiltrado)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                      {formatMoney(sumCupoFiltrado)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: '15px', whiteSpace: 'nowrap' }}>
                      {formatMoney(sumDispFiltrado)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};
