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
    totalEfectivoEsperado: number; // Base + Efectivo recaudado
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
