import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ModalImpresionPOS } from './ModalImpresionPOS';

export interface PedidoReporte {
  id: number;
  numeroPedido: string;
  habitacion: string;
  huesped: string;
  documento: string;
  articulos: number;
  total: number;
  formaPago?: string;
  pagos?: Array<{ nombre: string; monto: number }>;
  estado: string;
  fechaTexto: string;
}

interface ReportePedidosProps {
  user: { username: string };
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onBackToRooms: () => void;
  onGoToCartera?: () => void;
  onGoToCierres?: () => void;
  onGoToReservasFuturas?: () => void;
  onLogout: () => void;
}

export const ReportePedidos = ({
  user,
  sidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onBackToRooms,
  onGoToCartera,
  onGoToCierres,
  onGoToReservasFuturas,
  onLogout,
}: ReportePedidosProps) => {
  const [pedidos, setPedidos] = useState<PedidoReporte[]>([]);
  const [totalesFormasPago, setTotalesFormasPago] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [localSidebarOpen, setLocalSidebarOpen] = useState(false);
  const [impresionData, setImpresionData] = useState<{ tipo: 'FACTURA' | 'REMISION'; idDoc: number; habitacionNumero?: string } | null>(null);

  const sidebarOpen = controlledSidebarOpen !== undefined ? controlledSidebarOpen : localSidebarOpen;
  const toggleSidebar = onToggleSidebar || (() => setLocalSidebarOpen((prev) => !prev));

  // Fechas por defecto: día actual en hora local
  const getLocalDateStr = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = getLocalDateStr();
  const [fechaDesde, setFechaDesde] = useState(`${todayStr}T00:00`);
  const [fechaHasta, setFechaHasta] = useState(`${todayStr}T23:59`);

  const fetchReporte = async () => {
    setLoading(true);
    const token = localStorage.getItem('hotel_token');
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);

      const res = await fetch(`/api/reportes/pedidos?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPedidos(data.pedidos || []);
        setTotalesFormasPago(data.totales?.totalesPorFormaPago || {});
      }
    } catch (err) {
      console.error('Error al cargar reporte:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, []);

  const formatMoney = (val: number) => {
    return '$' + Number(val || 0).toLocaleString('es-CO');
  };

  const handleExportExcel = () => {
    const data = pedidos.map((p) => ({
      'Fecha y hora': p.fechaTexto,
      'Habitación': p.habitacion,
      'Huésped': p.huesped,
      'Documento': p.documento,
      'Artículos': p.articulos,
      'Total': Math.round(p.total),
      'Factura': p.numeroPedido,
    }));

    // Fila de Totales
    data.push({
      'Fecha y hora': 'TOTALES',
      'Habitación': `${pedidos.length} facturas`,
      'Huésped': '',
      'Documento': '',
      'Artículos': totalArticulos,
      'Total': Math.round(totalVentas),
      'Factura': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 22 },
      { wch: 15 },
      { wch: 28 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');
    XLSX.writeFile(workbook, `Reporte_Facturacion_Hotel_${Date.now()}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const totalArticulos = pedidos.reduce((sum, p) => sum + p.articulos, 0);
  const totalVentas = pedidos.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="hotel-dashboard-layout">
      {/* Sidebar Izquierdo Azul Moderno */}
      <aside className={`hotel-sidebar-navy ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-top-section">
          {/* Logo en Sidebar */}
          <div className="sidebar-brand-box" onClick={onBackToRooms} style={{ cursor: 'pointer' }}>
            <img src="/LogoHotel.png" alt="Hotel" className="sidebar-logo-img" />
          </div>

          {/* Menú de Navegación (Solo Habitaciones y Reportes) */}
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
              className="sidebar-nav-item active"
              onClick={() => { }}
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
        {/* Barra Superior */}
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

        {/* Contenido Principal de Reportes */}
        <main className="report-main-content">

          <h1 className="report-main-title">Reporte de Facturas</h1>

          {/* Barra de Filtros */}
          <div className="report-filters-bar">
            <div className="filter-group">
              <label className="filter-label">Fecha y hora desde</label>
              <div className="filter-input-wrapper">
                <input
                  type="datetime-local"
                  className="filter-input"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Fecha y hora hasta</label>
              <div className="filter-input-wrapper">
                <input
                  type="datetime-local"
                  className="filter-input"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
            </div>

            <button className="btn-generate-report" onClick={fetchReporte}>
              Generar reporte
            </button>
          </div>


          {/* Tarjetas de Totales por Forma de Pago */}
          {!loading && Object.keys(totalesFormasPago).length > 0 && (
            <div className="report-payment-cards-grid">
              {Object.entries(totalesFormasPago).map(([forma, monto]) => (
                <div key={forma} className="report-payment-card">
                  <div className="payment-card-icon">
                    {forma.includes('EFECTIVO') ? '💵' : forma.includes('TARJETA') ? '💳' : forma.includes('TRANS') ? '🏦' : '💰'}
                  </div>
                  <div className="payment-card-info">
                    <span className="payment-card-label">{forma}</span>
                    <strong className="payment-card-value">{formatMoney(monto)}</strong>
                  </div>
                </div>
              ))}
              <div className="report-payment-card total-highlight">
                <div className="payment-card-icon">📊</div>
                <div className="payment-card-info">
                  <span className="payment-card-label">TOTAL FACTURADO</span>
                  <strong className="payment-card-value">{formatMoney(totalVentas)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Exportación */}
          <div className="report-export-buttons-row">
            <button className="btn-export-excel" onClick={handleExportExcel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="17" />
                <line x1="16" y1="13" x2="8" y2="17" />
              </svg>
              <span>Exportar Excel</span>
            </button>

            <button className="btn-export-pdf" onClick={handleExportPDF}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="10" y1="12" x2="14" y2="12" />
                <line x1="10" y1="16" x2="14" y2="16" />
              </svg>
              <span>Exportar PDF</span>
            </button>
          </div>

          {/* Tabla de Reporte */}
          <div className="report-table-card">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Fecha y hora <span className="sort-indicator">⇅</span></th>
                  <th>Habitación</th>
                  <th>Huésped</th>
                  <th>Documento</th>
                  <th style={{ textAlign: 'center' }}>Artículos</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Factura</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="table-loading-cell">
                      <div className="spinner"></div>
                      <p>Consultando base de datos Firebird...</p>
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      No se encontraron facturas en el rango de fechas seleccionado.
                    </td>
                  </tr>
                ) : (
                  pedidos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.fechaTexto}</td>
                      <td style={{ fontWeight: 600 }}>{p.habitacion}</td>
                      <td>{p.huesped}</td>
                      <td>{p.documento}</td>
                      <td style={{ textAlign: 'center' }}>{p.articulos}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatMoney(p.total)}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: '#1e3a8a' }}>
                        {p.numeroPedido}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-print-tirilla-report"
                          onClick={() =>
                            setImpresionData({
                              tipo: 'FACTURA',
                              idDoc: p.id,
                              habitacionNumero: p.habitacion.replace(/[^0-9]/g, '') || '',
                            })
                          }
                          title="Imprimir Tirilla POS"
                        >
                          🖨️ Imprimir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {pedidos.length > 0 && !loading && (
                <tfoot>
                  <tr className="report-table-footer-row">
                    <td colSpan={4} style={{ fontWeight: 700 }}>
                      Totales
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {totalArticulos}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#0b57d0', fontSize: '15.5px' }}>
                      {formatMoney(totalVentas)}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Nota del Pie */}
          <p className="report-footer-disclaimer">
            * Los reportes se generan con base en las facturas enviados al sistema local.
          </p>
        </main>
      </div>

      {impresionData && (
        <ModalImpresionPOS
          tipoDoc={impresionData.tipo}
          idDoc={impresionData.idDoc}
          habitacionNumero={impresionData.habitacionNumero}
          onClose={() => setImpresionData(null)}
        />
      )}
    </div>
  );
};

