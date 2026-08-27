import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (user: { username: string; token: string; role?: string }, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Por favor ingrese su usuario');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas o error de conexión con Firebird');
      }

      // Guardar token y datos de usuario en localStorage
      localStorage.setItem('hotel_token', data.token);
      localStorage.setItem('hotel_user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Capa de fondo con imagen de lobby hotelero difuminado */}
      <div className="login-backdrop-overlay"></div>

      <div className="login-wrapper">
        {/* Tarjeta de Inicio de Sesión estilo Premium */}
        <div className="login-card-premium">
          {/* Logo Principal */}
          <div className="hotel-logo-box-login">
            <img src="/LogoHotel.png" alt="Hotel Avenida Principal" className="hotel-login-logo-img" />
          </div>

          {/* Divisor decorativo con subtítulo */}
          <div className="login-divider-container">
            <span className="login-divider-line"></span>
            <span className="login-divider-text">Sistema de Gestión Hotelera</span>
            <span className="login-divider-line"></span>
          </div>

          {/* Título de bienvenida */}
          <div className="login-welcome-box">
            <h1 className="login-welcome-title">Bienvenido</h1>
            <p className="login-welcome-subtitle">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {/* Alerta de Error */}
          {errorMessage && (
            <div className="error-alert" role="alert">
              <svg
                className="error-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-form-premium" noValidate>
            {/* Campo Usuario */}
            <div className="input-group-premium">
              <div className="input-icon-wrapper-premium">
                <svg
                  className="field-icon-premium"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <input
                id="username-input"
                type="text"
                className="form-input-premium"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                disabled={isLoading}
              />
            </div>

            {/* Campo Contraseña */}
            <div className="input-group-premium">
              <div className="input-icon-wrapper-premium">
                <svg
                  className="field-icon-premium"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input-premium"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password-btn-premium"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="eye-icon">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="eye-icon">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Botón Ingresar */}
            <button
              id="btn-login-submit"
              type="submit"
              className={`btn-submit-premium ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner-wrapper">
                  <span className="spinner"></span>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <>
                  <svg className="btn-login-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Ingresar</span>
                </>
              )}
            </button>
          </form>

          {/* Footer de la tarjeta con divisor circular y badge de seguridad */}
          <div className="login-card-footer-section">
            <div className="footer-circle-divider">
              <span className="footer-circle-line"></span>
              <span className="footer-circle-dot">o</span>
              <span className="footer-circle-line"></span>
            </div>

            <div className="login-security-info">
              <div className="security-title-row">
                <svg className="security-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                <span>Conexión segura</span>
              </div>
              <p className="security-subtitle-text">Tus datos están protegidos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
