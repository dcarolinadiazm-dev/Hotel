import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Habitaciones } from './components/Habitaciones';
import type { Habitacion } from './components/Habitaciones';
import { CarritoHabitacion } from './components/CarritoHabitacion';
import { ModalHabitacion } from './components/ModalHabitacion';
import { CerrarPedido } from './components/CerrarPedido';
import { ReportePedidos } from './components/ReportePedidos';
import { ReporteCartera } from './components/ReporteCartera';
import { ReporteCierresZ } from './components/ReporteCierresZ';
import './App.css';

type ActiveView = 'HABITACIONES' | 'CARRITO' | 'CERRAR_PEDIDO' | 'REPORTES' | 'CARTERA' | 'CIERRES';

function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Estados de Navegación
  const [currentView, setCurrentView] = useState<ActiveView>('HABITACIONES');
  const [selectedHabitacion, setSelectedHabitacion] = useState<Habitacion | null>(null);
  const [modalHabitacion, setModalHabitacion] = useState<Habitacion | null>(null);

  // Datos para Cerrar Pedido (Vista 4)
  const [checkoutData, setCheckoutData] = useState<{ totalItems: number; totalPagar: number }>({
    totalItems: 0,
    totalPagar: 0,
  });

  // Clave de Refresco para Forzar Recarga de Habitaciones
  const [roomsRefreshKey, setRoomsRefreshKey] = useState<number>(0);

  // Estado del Sidebar (Colapsado / Expandido)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('hotel_token');
    const savedUser = localStorage.getItem('hotel_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        })
          .then((res) => {
            if (res.ok) {
              setCurrentUser(parsedUser);
            } else {
              localStorage.removeItem('hotel_token');
              localStorage.removeItem('hotel_user');
              setCurrentUser(null);
            }
          })
          .catch(() => {
            setCurrentUser(parsedUser);
          })
          .finally(() => {
            setIsVerifying(false);
          });
        return;
      } catch {
        localStorage.removeItem('hotel_token');
        localStorage.removeItem('hotel_user');
      }
    }
    setIsVerifying(false);
  }, []);

  const handleLoginSuccess = (user: { username: string }) => {
    setCurrentUser(user);
    setCurrentView('HABITACIONES');
    setSelectedHabitacion(null);
    setModalHabitacion(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
    setCurrentUser(null);
    setCurrentView('HABITACIONES');
    setSelectedHabitacion(null);
    setModalHabitacion(null);
  };

  if (isVerifying) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="spinner"></div>
          <p style={{ marginTop: '16px', color: '#64748b' }}>Iniciando sistema...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-root">
      {/* Vista 2: Home - Habitaciones */}
      {currentView === 'HABITACIONES' && (
        <Habitaciones
          user={currentUser}
          refreshKey={roomsRefreshKey}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenModal={(hab) => setModalHabitacion(hab)}
          onGoToReports={() => setCurrentView('REPORTES')}
          onGoToCartera={() => setCurrentView('CARTERA')}
          onGoToCierres={() => setCurrentView('CIERRES')}
          onLogout={handleLogout}
        />
      )}

      {/* Vista 3: Carrito de Compras por Habitación */}
      {currentView === 'CARRITO' && selectedHabitacion && (
        <CarritoHabitacion
          habitacion={selectedHabitacion}
          user={currentUser}
          onBack={() => setCurrentView('HABITACIONES')}
          onProceedToCheckout={(hab, totalItems, totalPagar) => {
            setSelectedHabitacion(hab);
            setCheckoutData({ totalItems, totalPagar });
            setCurrentView('CERRAR_PEDIDO');
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Vista 4: Cerrar Carrito - Generar Pedido */}
      {currentView === 'CERRAR_PEDIDO' && selectedHabitacion && (
        <CerrarPedido
          habitacion={selectedHabitacion}
          totalItems={checkoutData.totalItems}
          totalPagar={checkoutData.totalPagar}
          user={currentUser}
          onCancel={() => setCurrentView('CARRITO')}
          onSuccess={(numPedido) => {
            alert(`✅ Pedido ${numPedido} generado exitosamente en el sistema local.`);
            setRoomsRefreshKey((k) => k + 1);
            setCurrentView('REPORTES');
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Vista 6: Reporte de Pedidos por Habitación */}
      {currentView === 'REPORTES' && (
        <ReportePedidos
          user={currentUser}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onBackToRooms={() => setCurrentView('HABITACIONES')}
          onGoToCartera={() => setCurrentView('CARTERA')}
          onGoToCierres={() => setCurrentView('CIERRES')}
          onLogout={handleLogout}
        />
      )}

      {/* Vista 7: Reporte de Cartera Consolidada */}
      {currentView === 'CARTERA' && (
        <ReporteCartera
          user={currentUser}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onBackToRooms={() => setCurrentView('HABITACIONES')}
          onGoToPedidosReport={() => setCurrentView('REPORTES')}
          onGoToCierres={() => setCurrentView('CIERRES')}
          onLogout={handleLogout}
        />
      )}

      {/* Vista 8: Reporte e Historial de Cierres Z / Turnos */}
      {currentView === 'CIERRES' && (
        <ReporteCierresZ
          user={currentUser}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onBackToRooms={() => setCurrentView('HABITACIONES')}
          onGoToPedidosReport={() => setCurrentView('REPORTES')}
          onGoToCartera={() => setCurrentView('CARTERA')}
          onLogout={handleLogout}
        />
      )}


      {/* Vista 5: Modal de Habitación (Overlay sobre la vista activa) */}
      {modalHabitacion && (
        <ModalHabitacion
          habitacion={modalHabitacion}
          onClose={() => setModalHabitacion(null)}
          onHabitacionUpdated={() => setRoomsRefreshKey((k) => k + 1)}
          onGoToCart={(hab) => {
            setModalHabitacion(null);
            setSelectedHabitacion(hab);
            setCurrentView('CARRITO');
          }}
        />
      )}
    </div>
  );
}

export default App;
