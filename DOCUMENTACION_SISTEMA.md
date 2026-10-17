# 🏨 Documentación Técnica y Arquitectura del Sistema HOTEL
### Sistema de Gestión Hotelera & Facturación POS/Electrónica Integrada con SYSplus ERP (Firebird)

---

## 1. 📌 Resumen Ejecutivo y Propósito

Este sistema es una solución integral para la operación hotelera (PMS - *Property Management System*) y facturación comercial en tiempo real. Está sincronizado de forma nativa y bidireccional con el ERP **SYSplus 2023** a través del motor de base de datos relacional **Firebird SQL**.

### Objetivos y Capacidades Principales:
- **Gestión Visual de Habitaciones**: Tablero interactivo con estados en vivo: *Disponible*, *Ocupada*, *Reservada*, *Limpieza* y *Mantenimiento*.
- **Control de Estadías y Huéspedes**: Registro de huéspedes, check-in, check-out, consumos de frigobar/restaurante y servicios de hospedaje (`GRIN_COD = 'SER'`).
- **Gestión de Anticipos / Abonos**: Registro de abonos por huésped vinculados directamente a la estadía activa (`ID_MOVIM`), generando el respectivo `ANTICIPOS_CLIENTE` y `RECIBOS_CAJA`.
- **Facturación POS / Electrónica**:
  - Facturación por Habitación (con cruce automático de anticipos).
  - Facturación Directa POS (mostrador / restaurante).
  - Facturación Múltiple Consolidada (agrupación de varias habitaciones en una sola factura).
  - Soporte de múltiples formas de pago (Efectivo, Transferencia / Banco, Tarjeta, Cartera / Crédito).
- **Control de Caja y Cierre Z**:
  - Apertura y cierre de turnos de cajeros.
  - Arqueo ciego, cálculo de efectivo esperado, discriminación por forma de pago, registro de egresos/retiros y generación de tirilla térmica de Cierre Z.
- **Gestión de Cartera de Clientes**:
  - Control de ventas a crédito, consulta en tiempo real mediante `CARTERA_CLIENTE` y reportes consolidados.
- **Auditoría e Impresión Térmica**: Generación de comandas y tirillas térmicas para impresoras de 80mm y 58mm.

---

## 2. 🏛️ Arquitectura Tecnológica

El proyecto está estructurado como un **Monorepo** con separación clara entre backend y frontend:

```
HOTEL/
├── src/                          # Backend Node.js + Express + TypeScript + Knex
├── client/                       # Frontend React + TypeScript + Vite + Tailwind/CSS
├── scripts/                      # Scripts de mantenimiento, auditoría y pruebas
├── server.ts                     # Punto de entrada del servidor Express y estáticos
├── ecosystem.config.js           # Orquestación con PM2 en Windows / Servidor
├── start_hotel.bat               # Script batch de inicio rápido para Windows
└── DOCUMENTACION_SISTEMA.md      # Este documento maestro de contexto
```

### Stack Técnico:
| Componente | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express, TypeScript, Knex.js | API REST modular tipada |
| **Driver BD** | `node-firebird-driver-native` / `node-firebird` | Conexión directa a socket Firebird 3050 |
| **Base de Datos** | Firebird SQL (2.5 / 3.0 / 4.0) | Base de datos `sysplus.fdb` de SYSplus ERP |
| **Frontend** | React 18, Vite, TypeScript | SPA reactiva con componentes modales |
| **Estilos e Iconos** | CSS Vanilla avanzado, Tailwind, Lucide React | Diseño moderno, tarjetas interactivas y modales |
| **Reportes y POS** | Impresión HTML para térmicas 80mm/58mm, Excel | Exportación directa y comandos de impresión |

---

## 3. 📂 Estructura Detallada del Código

### 3.1 Backend (`src/`)

```
src/
├── config/
│   └── knex.config.ts            # Conexión principal a Firebird con Knex y pool nativo
├── controllers/
│   ├── abono.controller.ts       # Endpoints para creación, listado y anulación de abonos
│   ├── articulo.controller.ts    # Búsqueda de productos, stock, precios e impuestos
│   ├── auth.controller.ts        # Autenticación de cajeros y recepcionistas
│   ├── cartera.controller.ts     # Consulta de saldos por cliente (CARTERA_CLIENTE)
│   ├── habitacion.controller.ts  # Estados, check-in, check-out, consumos, traslados
│   ├── pedido.controller.ts      # Facturación POS, directa, multi-habitación y recibos
│   ├── tercero.controller.ts     # Búsqueda y creación de clientes / empresas
│   └── turno.controller.ts       # Apertura, movimientos de caja y Cierre Z
├── models/                       # Interfaces TypeScript de DTOs y entidades
├── routes/
│   ├── abono.routes.ts           # /api/abonos
│   ├── articulo.routes.ts        # /api/articulos
│   ├── auth.routes.ts            # /api/auth
│   ├── habitacion.routes.ts      # /api/habitaciones
│   ├── pedido.routes.ts          # /api/pedidos
│   ├── reporte.routes.ts         # /api/reportes
│   ├── tercero.routes.ts         # /api/terceros
│   ├── turno.routes.ts           # /api/turnos
│   └── index.ts                  # Enrutador central Express
├── services/                     # ⚠️ NÚCLEO DE LA LÓGICA DE NEGOCIO
│   ├── abono.service.ts          # Gestión de anticipos en HABITACION_MOVIM_ANTICIPOS y ERP
│   ├── articulo.service.ts       # Consulta y validación estricta de existencias en bodega
│   ├── auth.service.ts           # Validación de usuarios y permisos
│   ├── cartera.service.ts        # Ejecución de procedimientos de cartera en Firebird
│   ├── contabilidad.service.ts   # Contabilización de facturas y recibos en SYSplus
│   ├── habitacion.service.ts     # Movimientos de habitación (ID_MOVIM), consumos y tarifas
│   ├── pedido.service.ts         # Orquestador maestro de facturación e inventario web
│   ├── tercero.service.ts        # Manejo de clientes en TERCEROS
│   └── turno.service.ts          # Auditoría de turnos de caja, Cierre Z y desglose de pagos
└── utils/
    ├── tables.ts                 # Constantes de nombres de tablas de Firebird
    └── sanitize.ts               # Truncado de bytes y limpieza de caracteres para Firebird
```

### 3.2 Frontend (`client/src/`)

```
client/src/
├── components/
│   ├── Dashboard.tsx             # Panel principal con accesos rápidos y métricas
│   ├── Habitaciones.tsx          # Matriz gráfica de habitaciones con filtros por estado
│   ├── ModalHabitacion.tsx       # Detalle de habitación: consumos, huéspedes, tarifas
│   ├── ModalAbonos.tsx           # Ventana para agregar o consultar anticipos
│   ├── ModalFacturacionDirecta.tsx # POS de mostrador para ventas rápidas
│   ├── ModalFacturacionMultiHabitacion.tsx # Facturación conjunta de múltiples cuartos
│   ├── ModalAperturaTurno.tsx    # Declaración de base inicial de caja
│   ├── ModalCierreZ.tsx          # Arqueo ciego, desglose de formas de pago y Cierre Z
│   ├── ModalImpresionPOS.tsx     # Vista previa e impresión de tirilla térmica de venta
│   ├── ModalImpresionCierreZ.tsx # Impresión de comprobante fiscal de Cierre Z
│   ├── ReporteCartera.tsx        # Consulta interactiva de cuentas por cobrar
│   ├── ReporteCierresZ.tsx       # Histórico de cierres anteriores
│   ├── ReportePedidos.tsx        # Histórico de ventas y exportación a Excel
│   ├── ReporteReservasFuturas.tsx # Calendario y listado de reservas
│   ├── CarritoHabitacion.tsx     # Selector y canasta de consumos
│   └── ClienteSearchSelect.tsx   # Autocomplete con búsqueda rápida de NIT / Razón Social
├── App.tsx                       # Enrutador principal, barra de navegación y control de turnos
└── main.tsx                      # Punto de montaje React
```

---

## 4. 🗄️ Modelo de Datos y Entidades en Firebird

El sistema interactúa tanto con tablas propietarias del módulo hotelero como con las tablas troncales del ERP SYSplus:

### 4.1 Tablas del Módulo Hotelero
- **`HABITACIONES`**: Catálogo de habitaciones (`HABI_ID`, `HABI_NUMERO`, `HABI_ESTADO`, `TIHA_ID`, `HABI_PRECIO`).
- **`HABITACION_MOVIM`**: Registro de la estadía activa o histórica (`ID_MOVIM`, `HABI_ID`, `ESTADO_MOV`, `FECHA_LLEGADA`, `FECHA_SALIDA`, `TERC_NIT`, `VALOR_TOTAL`).
  * `ESTADO_MOV = 1`: Estadía activa (Ocupada).
  * `ESTADO_MOV = 2`: Estadía finalizada (Facturada / Check-out).
- **`HABITACION_HUESPEDES`**: Huéspedes acompañantes vinculados al `ID_MOVIM`.
- **`HABITACION_MOVIM_DETALLE`**: Registro de consumos (minibar, servicios, cargos de habitación) cargados al movimiento antes de facturar.
- **`HABITACION_MOVIM_ANTICIPOS`**: Relación estricta entre el movimiento (`ID_MOVIM`) y los anticipos generados (`ANCL_ID`, `RECA_ID`, `MONTO`).
- **`PEDIDO_WEB` / `PEDIDO_DET_WEB`**: Tablas temporales de comanda hotelera antes de la emisión de la factura legal.
- **`TURNOS_CAJA` / `TURNOS_CAJA_CIERRE`**: Registro de turnos de cajeros, bases iniciales, retiros y cortes de arqueo.

### 4.2 Tablas Principales de SYSplus ERP
- **`FACTURAS`**: Encabezado de factura (`FACT_ID`, `PREF_PRE`, `FACT_NUMERO`, `FACT_FECHA`, `FACT_TOTAL`, `FACT_FORMAP`, `FACT_CONTADO`, `TERC_NIT`).
- **`FACTURAS_DETALLE`**: Líneas de artículos/servicios facturados (`FADE_ITEM`, `ARTI_ID`, `FADE_CANT`, `FADE_PRECIO`, `FADE_TOTAL`, `FADE_IVA`).
- **`FACTURAS_CONTADO_PAGO`**: Formas de pago **únicamente de contado** (`FCNT_ID`, `FCNP_ITEM`, `FOPA_ID`, `FCNP_MONTO`, `FCNP_BANCO`, `FCNP_NUMERO`).
- **`SALDOS_DOC_CARTERA`**: Tabla central de saldos de cartera:
  * `SDCA_TIPOREF = 31`: Factura de Venta (`SDCA_MONTO`, `SDCA_ABONO`, `SDCA_SALDO`).
  * `SDCA_TIPOREF = 45`: Anticipo de Cliente (saldo en negativo).
- **`ANTICIPOS_CLIENTE`**: Registro maestro de anticipos (`ANCL_ID`, `ANCL_NUMERO`, `ANCL_MONTO`, `ANCL_SALDO`, `TERC_NIT`).
- **`RECIBOS_CAJA` / `RECIBOS_CAJA_DETALLE` / `RECIBOS_CAJA_PAGO`**: Recibos de caja asociados al pago de contado o anticipos.
- **`APLICACION_CLIENTE` / `APLICACION_CLIENTE_DETALLE`**: Cruce legal de anticipos contra facturas (`ACDE_TIPODOC: 31` para factura, `45` para anticipo).
- **`DOC_INVENTARIO_WEB` / `DOC_INVENTARIO_DET_WEB` / `DOC_INVENTARIO_PAGO_WEB`**: Tablas intermedias leídas por el SP `GRABE_DOCUMENTO_INV_WEB(31, DINW_ID)` para generar la factura física.

---

## 5. 🔄 Flujos de Negocio Críticos y Procesos

### 5.1 Flujo de Registro de Abonos (Anticipos)
1. El usuario registra un abono desde el panel de la habitación (`ModalAbonos.tsx`).
2. `AbonoService.createAbono` crea el `ANTICIPOS_CLIENTE` y el `RECIBOS_CAJA` en SYSplus con `SDCA_TIPOREF = 45`.
3. Se vincula obligatoriamente el `ID_MOVIM` en `HABITACION_MOVIM_ANTICIPOS`. Esto garantiza que los abonos pertenezcan exclusivamente a esa estadía y no queden "huérfanos".
4. En el Cierre Z del turno actual, este abono suma a **"Abonos en Efectivo"** (o Banco según corresponda).

### 5.2 Flujo de Facturación de Check-out con Cruce de Anticipos
1. Se consultan los consumos y los abonos vinculados al `ID_MOVIM` de la habitación.
2. Se llena `DOC_INVENTARIO_WEB` y `DOC_INVENTARIO_DET_WEB`.
3. Se ejecuta el procedimiento almacenado `GRABE_DOCUMENTO_INV_WEB(31, dinwId)`.
4. **Cruce de Anticipos (`syncReciboCajaFactura`)**:
   * Si la habitación tiene anticipos, se crea un encabezado en `APLICACION_CLIENTE`.
   * **REGLA VITAL DE FIREBIRD**: Antes de insertar el detalle del cruce (`APLICACION_CLIENTE_DETALLE`), se debe actualizar `SALDOS_DOC_CARTERA` asegurando que `SDCA_SALDO = totalDoc` y `SDCA_ABONO = 0`. De lo contrario, el trigger `APLICACION_CLIENTE_DETALLE_AI` bloquea la inserción por falta de saldo disponible.
   * Se insertan los registros de los anticipos (`ACDE_TIPODOC: 45`, monto negativo) y de la factura (`ACDE_TIPODOC: 31`, monto positivo).
   * **Si los anticipos cubren el 100% de la factura**: Se **elimina** cualquier registro en `FACTURAS_CONTADO_PAGO`. Esto evita que en el Cierre Z la factura vuelva a sumar dinero en efectivo como si hubiese ingresado de nuevo hoy.
   * **Si queda saldo pendiente**: Solo el excedente pagado en el check-out se registra en `FACTURAS_CONTADO_PAGO` y en el recibo de caja de la factura.

### 5.3 Flujo de Facturación a Crédito (Cartera)
1. Si el cliente paga con forma de pago Crédito (`FOPA_CARTERA = 'S'` o ID de forma Crédito):
   * `DINW_CONTADO` en `DOC_INVENTARIO_WEB` se establece en `'N'`.
   * `DOC_INVENTARIO_PAGO_WEB` filtra y **no** envía líneas de crédito como si fueran dinero de caja.
   * `FACTURAS.FACT_CONTADO` se actualiza a `'N'`.
   * `SALDOS_DOC_CARTERA` conserva `SDCA_SALDO = totalFactura` y `SDCA_ABONO = 0`.
   * No se genera ni contabiliza recibo de caja de contado.
   * La factura aparece automáticamente en la consulta `CARTERA_CLIENTE` y en el reporte consolidado.
   * En el Cierre Z, computa como **Venta a Crédito** y no afecta el efectivo de la caja física.

### 5.4 Flujo de Arqueo y Cierre Z de Caja
El servicio `TurnoService.getResumenCierre()` consolida las cifras exactas del turno:
$$\text{Efectivo Esperado} = \text{Base Inicial} + \text{Abonos en Efectivo} + \text{Facturas Contado Efectivo} - \text{Egresos/Retiros}$$
- **Abonos recibidos en el turno**: Entran al arqueo como dinero real recibido hoy.
- **Facturas pagadas con abonos anteriores**: Tienen `$0` en `FACTURAS_CONTADO_PAGO`, por lo que **no inflan** el efectivo esperado.
- **Facturas mixtas (abono parcial + efectivo hoy)**: Solo el valor pagado en efectivo hoy figura en `FACTURAS_CONTADO_PAGO` y entra al efectivo esperado.

---

## 6. ⚠️ Reglas Inmutables y Consideraciones Técnicas ("Gotchas")

Cualquier cambio futuro en el código debe respetar estrictamente estas reglas para evitar errores fatales en Firebird:

1. **Triggers `FACTURAS_AU` y `FACTURAS_CONTADO_PAGO_AI`**:
   * *Problema*: Firebird arroja `DOCUMENTO_CON_ABONOS` o `DOCUMENTO_ABONO_MAYOR` si se intenta actualizar `FACTURAS.FACT_CONTADO` o insertar en `FACTURAS_CONTADO_PAGO` cuando `SDCA_ABONO > 0`.
   * *Solución implementada*: Siempre resetear temporalmente `SDCA_ABONO = 0` en `SALDOS_DOC_CARTERA`, realizar la sincronización de pagos, y luego fijar el abono y saldo final correcto.

2. **Trigger `APLICACION_CLIENTE_DETALLE_AI`**:
   * *Problema*: No permite aplicar un anticipo contra una factura si la factura tiene `SDCA_SALDO = 0`.
   * *Solución implementada*: En `syncReciboCajaFactura`, se actualiza `SDCA_SALDO = totalDoc` antes de insertar las líneas en `APLICACION_CLIENTE_DETALLE`.

3. **No insertar Crédito en `FACTURAS_CONTADO_PAGO`**:
   * La tabla `FACTURAS_CONTADO_PAGO` representa dinero que ingresó a la caja o bancos en el momento de la venta. Si se inserta una línea de crédito allí, el sistema contable y el Cierre Z creerán erróneamente que se recibió dinero en efectivo o bancos.

4. **Sanitización de Cadenas y Truncado de Bytes**:
   * Los campos en Firebird tienen límites estrictos de bytes (por ejemplo, conceptos a 55 caracteres, observaciones a 100 caracteres).
   * Siempre utilizar la función `truncateToBytes(texto, maxBytes)` de `src/utils/sanitize.ts` antes de enviar strings a campos VARCHAR/CHAR de Firebird.

5. **Sincronización de Consecutivos (`syncConsecutivos`)**:
   * Siempre invocar `PedidoService.syncConsecutivos(prefijo)` antes de llamar a `GRABE_DOCUMENTO_INV_WEB` para garantizar que no existan saltos ni colisiones de llaves primarias en `FACTURAS` y `RECIBOS_CAJA`.

---

## 7. 📜 Historial de Ajustes y Estabilidad (Changelog de Referencia)

Este historial documenta errores históricos resueltos para evitar reintroducirlos:

- **Ajuste Factura 893 (Eliminación de Recibo Huérfano en Cierre Z)**:
  * Se corrigió la consulta de facturas de contado en `TurnoService` para que verifique la existencia real del recibo de caja activo y las formas de pago en `FACTURAS_CONTADO_PAGO`.
- **Ajuste Factura 897 (Cruce Total de Anticipos y Eliminación de Efectivo Fantasma)**:
  * Se identificó que la habitación 201 tenía 4 anticipos por un total exacto de $497.000 (100% de la factura), pero el trigger de Firebird había fallado a mitad del cruce dejando una diferencia aparente de $22.000 en efectivo en `FACTURAS_CONTADO_PAGO`.
  * Se corrigió `syncReciboCajaFactura` garantizando que `SALDOS_DOC_CARTERA` tenga saldo previo al cruce y que, si el anticipo cubre el 100%, se limpie completamente `FACTURAS_CONTADO_PAGO`.
- **Soporte Integral para Ventas a Crédito**:
  * Se adaptaron `facturarHabitacion`, `facturarDirecto` y `facturarMultiplesHabitaciones` para detectar `FOPA_CARTERA = 'S'`, establecer `DINW_CONTADO = 'N'` / `FACT_CONTADO = 'N'` y dejar el saldo íntegro en `SALDOS_DOC_CARTERA`.
- **Validación Visual Moderna de Stock**:
  * Sustitución de alertas clásicas por modales estilizados con validación de existencia en bodega al agregar productos a pedidos.

---

## 8. 🚀 Guía de Comandos y Despliegue

### Variables de Entorno (`.env`)
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3050
DB_PATH=C:\SYSplus2023ERP\Datos\PRU\sysplus.fdb
DB_USER=SYSDBA
DB_PASSWORD=masterkey
JWT_SECRET=supersecretkey12345
```

### Comandos de Ejecución
```bash
# Desarrollo (Frontend Vite en :5173 + Backend en :3000)
npm run dev

# Compilar Frontend para producción
npm run client:build

# Iniciar servidor completo de producción (Express sirve la API y el bundle de Vite)
npm start

# Verificar compilación TypeScript del Backend
npx tsx -e "import './src/services/pedido.service'; console.log('OK');"
```

---

## 9. 🤖 Instrucciones para Futuros Asistentes de IA / Desarrolladores

Cuando solicites o implementes cambios en este proyecto:
1. **Revisa este archivo antes de tocar `src/services/pedido.service.ts` o `src/services/turno.service.ts`**.
2. **Nunca** elimines la verificación de `SDCA_ABONO` ni fuerces inserciones en `FACTURAS_CONTADO_PAGO` sin validar si son pagos a crédito o cubiertos por anticipos.
3. Al agregar nuevas formas de pago o tipos de documento, asegúrate de comprobar cómo interactúan con `TurnoService.getResumenCierre()` para no descuadrar el arqueo del Cierre Z.
4. Documenta cualquier nuevo procedimiento o regla de negocio al final de la sección 7 de este documento.
