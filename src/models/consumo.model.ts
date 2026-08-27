export interface IHabitacionConsumo {
    ID_CONSUMO: number;
    ID_HABITACION: string;
    ID_ARTICULO?: string;
    DESCRIPCION: string;
    UNIDAD: string;
    CANTIDAD: number;
    PRECIO_UNITARIO: number;
    SUBTOTAL: number;
    ESTADO: 'PENDIENTE' | 'FACTURADO' | string;
    FECHA?: Date;
}

export interface IConsumoDTO {
    id: number;
    idHabitacion: string;
    articulo: string;
    unidad: string;
    cantidad: number;
    precio: number;
    subtotal: number;
}
