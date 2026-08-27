export interface IHabitacion {
    ID_HABITACION: string;
    ARTI_COD?: string;
    NUMERO: string;
    ESTADO: 'Disponible' | 'Reservada' | 'Ocupada' | 'Inhabilitada' | string;
    TIPO?: string;
    PISO?: number;
    PRECIO_NOCHE?: number;
    NOTAS?: string;
    HUESPED?: string;
    DOCUMENTO?: string;
    FECHA_RESERVA?: string;
    FECHA_SALIDA?: string;
    CARACTERISTICAS?: string;
    PEWE_ID?: number;
    FECHA_ACTUALIZACION?: Date;
}

export interface IHabitacionDTO {
    id: string;
    artiCod?: string;
    numero: string;
    estado: string;
    tipo?: string;
    piso?: number;
    huesped?: string;
    documento?: string;
    fechaReserva?: string;
    fechaSalida?: string;
    precioNoche?: number;
    caracteristicas?: string;
    observaciones?: string;
    peweId?: number;
    productos: number;
    total: number;
}

export interface IHabitacionMovim {
    ID_MOVIM?: number;
    ID_HABITACION: string;
    ID_DOC?: number;
    FECHA_RESERVA?: string;
    FECHA_SALIDA?: string;
    DINW_ID?: number;
    ESTADO?: string;
    ANCL_ID?: number;
    TIPO?: number;
}

export interface INuevaHabitacionDTO {
    numero: string;
    artiCod: string;
    tipo?: string;
    piso?: number;
    precioNoche?: number;
    caracteristicas?: string;
    observaciones?: string;
}
