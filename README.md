# 🏨 Sistema de Gestión Hotelera & Facturación (SYSplus ERP / Firebird)

Sistema web integral de administración hotelera desarrollado en **TypeScript, Node.js, Express, React (Vite) y Firebird**. Cuenta con integración directa y bidireccional a los procedimientos almacenados, tablas y esquemas de facturación electrónica del ERP **SYSplus**.

---

## 🚀 Características Principales

- **Gestión Visual de Habitaciones**: Mapa de habitaciones en tiempo real con estados dinámicos (Disponible, Ocupada, Reservada, Mantenimiento, Limpieza).
- **Control de Huéspedes y Reservas**: Registro de huéspedes, check-in, check-out y administración de anticipos vinculados a `ANTICIPOS_CLIENTE` y `RECIBOS_CAJA`.
- **Carrito de Consumos & Hospedaje**: Registro ágil de artículos de frigobar/restaurante y servicios de hospedaje (`GRIN_COD = 'SER'`).
- **Facturación Electrónica POS**: Facturación directa mediante el procedimiento `GRABE_DOCUMENTO_INV_WEB(31, ID)` con soporte para múltiples formas de pago (Efectivo, Transferencias, Tarjetas) e impresión en tirilla térmica POS de 80mm/58mm.
- **Reporte de Ventas & Reservas**: Filtro por rango de fechas, resumen en tiempo real de totales recaudados por forma de pago, exportación a Excel y reimpresión de comprobantes.
- **Reporte de Cartera**: Integración al procedimiento `REP_CARTERA_CONSOLIDADA` para auditoría de saldos pendientes por cliente y fecha de corte.

---

## 🛠️ Requisitos del Servidor de Producción

1. **Node.js**: Versión `18.x` o `20.x` LTS.
2. **Motor de Base de Datos**: **Firebird 2.5 / 3.0 / 4.0** con cliente nativo `fbclient.dll` o arquitectura de 64/32 bits compatible.
3. **Acceso a Base de Datos**: Archivo `.FDB` de SYSplus (ej. `sysplus.fdb`).

---

## 📦 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/dcarolinadiazm-dev/Hotel.git
cd Hotel
```

### 2. Configurar variables de entorno
Copiar el archivo de plantilla `.env.example` a `.env` y configurar las credenciales de Firebird:
```bash
cp .env.example .env
```
Editar `.env`:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3050
DB_PATH=C:\SYSplus2023ERP\Datos\PRU\sysplus.fdb
DB_USER=SYSDBA
DB_PASSWORD=masterkey
JWT_SECRET=supersecretkey12345
```

### 3. Instalar dependencias
```bash
# Dependencias del backend y frontend
npm install
npm run client:install
```

### 4. Compilar el Frontend (Producción)
```bash
npm run client:build
```

### 5. Iniciar la aplicación
```bash
# Iniciar servidor de producción
npm start
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 📂 Estructura del Proyecto

```
HOTEL/
├── client/                     # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── components/         # Modales, Vistas, Reportes y Componentes POS
│   │   ├── App.tsx             # Componente Principal
│   │   └── main.tsx            # Punto de Entrada
│   └── dist/                   # Bundle compilado de producción
├── src/                        # Backend Node.js + Express + Knex
│   ├── config/                 # Conexión Knex y Firebird
│   ├── controllers/            # Controladores de la API REST
│   ├── models/                 # Interfaces y DTOs de TypeScript
│   ├── routes/                 # Enrutadores Express
│   ├── services/               # Lógica de Negocio y comunicación con Firebird
│   └── utils/                  # Tablas, Sanitización y Utilidades
├── server.ts                   # Servidor Express y servicio de estáticos
└── README.md                   # Documentación del proyecto
```

---

## 📄 Licencia
Privado / Propietario. Desarrollado para uso exclusivo del Hotel.
