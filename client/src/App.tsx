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
import { ReporteReservasFuturas } from './components/ReporteReservasFuturas';
import './App.css';

type ActiveView = 'HABITACIONES' | 'CARRITO' | 'CERRAR_PEDIDO' | 'REPORTES' | 'CARTERA' | 'CIERRES' | 'RESERVAS_FUTURAS';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(payloadBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Margen de 10 segundos antes de la expiración exacta
    return Date.now() >= (payload.exp * 1000 - 10000);
  } catch {
    return false;
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string; nombre?: string; cargo?: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

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

  // 1. Detección Global de Respuestas 401 (Token Expirado o Inválido)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        if (!url.includes('/api/auth/login')) {
          console.warn('⚠️ Sesión terminada por el servidor (401 Unauthorized)');
          handleLogout('Tu sesión ha expirado o no es válida. Por favor inicia sesión nuevamente.');
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // 2. Verificar Sesión al Cargar la Página
  useEffect(() => {
    const savedToken = localStorage.getItem('hotel_token');
    const savedUser = localStorage.getItem('hotel_user');

    if (savedToken && savedUser) {
      if (isTokenExpired(savedToken)) {
        console.warn('⚠️ Token guardado en localStorage ya ha expirado.');
        localStorage.removeItem('hotel_token');
        localStorage.removeItem('hotel_user');
        setCurrentUser(null);
        setSessionExpiredMsg('Tu sesión anterior ha expirado. Por favor ingresa tus datos.');
        setIsVerifying(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              const fullUser = data.user || parsedUser;
              setCurrentUser(fullUser);
              localStorage.setItem('hotel_user', JSON.stringify(fullUser));
            } else {
              localStorage.removeItem('hotel_token');
              localStorage.removeItem('hotel_user');
              setCurrentUser(null);
              setSessionExpiredMsg('Tu sesión ha vencido. Por favor inicia sesión de nuevo.');
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

  // 3. Temporizador y eventos al volver a la pestaña tras periodos de inactividad
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('hotel_token');
      if (!token) return;

      if (isTokenExpired(token)) {
        console.warn('⚠️ Sesión expirada por tiempo límite de 24 horas.');
        handleLogout('Tu sesión ha expirado por tiempo límite (24 horas). Por favor ingresa nuevamente para continuar.');
      }
    };

    // Chequeo periódico cada 30 segundos
    const interval = setInterval(checkTokenExpiration, 30000);

    // Chequeo inmediato cuando el recepcionista vuelve al navegador / enfoca la pestaña
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkTokenExpiration();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  const handleLoginSuccess = (user: { username: string; nombre?: string; cargo?: string }) => {
    setSessionExpiredMsg(null);
    setCurrentUser(user);
    setCurrentView('HABITACIONES');
    setSelectedHabitacion(null);
    setModalHabitacion(null);
  };

  const handleLogout = (reason?: string) => {
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
    setCurrentUser(null);
    setCurrentView('HABITACIONES');
    setSelectedHabitacion(null);
    setModalHabitacion(null);
    if (reason) {
      setSessionExpiredMsg(reason);
    }
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
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        sessionExpiredMessage={sessionExpiredMsg}
      />
    );
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
          onGoToReservasFuturas={() => setCurrentView('RESERVAS_FUTURAS')}
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
          onGoToReservasFuturas={() => setCurrentView('RESERVAS_FUTURAS')}
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
          onGoToReservasFuturas={() => setCurrentView('RESERVAS_FUTURAS')}
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
          onGoToReservasFuturas={() => setCurrentView('RESERVAS_FUTURAS')}
          onLogout={handleLogout}
        />
      )}

      {/* Vista 9: Reporte de Reservas Futuras y Agenda */}
      {currentView === 'RESERVAS_FUTURAS' && (
        <ReporteReservasFuturas
          user={currentUser}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onBackToRooms={() => setCurrentView('HABITACIONES')}
          onGoToPedidosReport={() => setCurrentView('REPORTES')}
          onGoToCartera={() => setCurrentView('CARTERA')}
          onGoToCierres={() => setCurrentView('CIERRES')}
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
