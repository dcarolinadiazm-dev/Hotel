export interface ITurno {
    ID_TURNO: number;
    USUARIO: string;
    FECHA_APERTURA: string | Date;
    BASE: number;
    FECHA_CIERRE?: string | Date | null;
    ESTADO: 'Abierto' | 'Cerrado' | string;
    TOTAL_VENTAS?: number;
    TOTAL_PAGOS?: number;
    OBSERVACIONES?: string;
}

export interface ITurnoDetPago {
    ID_TURNO: number;
    ID_ITEM: number;
    FORMAP: number;
    NOMBRE_FORMA?: string;
    MONTO: number;
}

export interface ITurnoDetHabitacion {
    ID_TURNO: number;
    ID_ITEM: number;
    ID_HABITACION: string;
    NUMERO?: string;
    ESTADO: string;
    HUESPED?: string;
    TOTAL_PENDIENTE?: number;
}

export interface ITurnoDetFactura {
    ID_TURNO: number;
    ID_ITEM: number;
    PREF?: string;
    FACTINI: number;
    FACTFIN: number;
    CANTIDAD: number;
    TOTAL: number;
}

export interface ITurnoResumenCierre {
    turno: {
        idTurno: number;
        usuario: string;
        fechaApertura: string;
        base: number;
        estado: string;
        observacionesApertura?: string;
    };
    fechaCierreEstimada: string;
    pagosPorForma: Array<{
        formaPagoId: number;
        nombreForma: string;
        total: number;
        cantidadTransacciones: number;
    }>;
    totalVentasFacturadas: number;
    totalRecaudadoPagos: number;
    totalAbonosTurno: number;
    totalAbonosAntiguos: number;
    totalAbonosCruzados?: number;
    totalAbonosHabitaciones?: number;
    totalEfectivoEsperado: number; // Base + Efectivo recaudado
    totalEfectivoRecaudado?: number;
    totalConsignaciones?: number;
    totalCartera?: number;
    facturasGeneradas: Array<{
        prefijo: string;
        facturaInicial: number;
        facturaFinal: number;
        cantidad: number;
        total: number;
    }>;
    habitacionesEstado: Array<{
        id: string;
        numero: string;
        estado: string;
        huesped?: string;
        totalPendiente: number;
    }>;
    totalesHabitaciones: {
        disponibles: number;
        ocupadas: number;
        reservadas: number;
        inhabilitadas: number;
    };
    detalleAbonosTurno?: Array<{
        reciboId: number;
        reciboNumero: string;
        anticipoId: number;
        anticipoNumero: string;
        habitacionNumero: string;
        clienteNombre: string;
        tercNit: string;
        formaPagoId: number;
        formaPagoNombre: string;
        monto: number;
        fecha?: string;
    }>;
    detalleAbonosAntiguos?: Array<{
        reciboId: number;
        reciboNumero: string;
        anticipoId: number;
        anticipoNumero: string;
        habitacionNumero: string;
        clienteNombre: string;
        tercNit: string;
        monto: number;
        fecha?: string;
    }>;
    detalleEfectivo?: {
        facturas: Array<{
            facturaId: number;
            facturaNumero: string;
            monto: number;
            clienteNombre?: string;
        }>;
        totalFacturas: number;
        abonos: Array<{
            reciboNumero: string;
            anticipoNumero: string;
            habitacionNumero: string;
            clienteNombre: string;
            monto: number;
        }>;
        totalAbonos: number;
        totalEfectivo: number;
    };
    detalleConsignaciones?: {
        facturas: Array<{
            facturaId: number;
            facturaNumero: string;
            formaPagoNombre: string;
            monto: number;
            clienteNombre?: string;
        }>;
        totalFacturas: number;
        abonos: Array<{
            reciboNumero: string;
            anticipoNumero: string;
            habitacionNumero: string;
            clienteNombre: string;
            formaPagoNombre: string;
            monto: number;
        }>;
        totalAbonos: number;
        totalConsignaciones: number;
    };
}

export interface ITurnoAperturaPayload {
    usuario: string;
    base: number;
    observaciones?: string;
}

export interface ITurnoCierrePayload {
    idTurno: number;
    observaciones?: string;
}
