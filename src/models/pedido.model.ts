export interface IHabitacionPedido {
    ID_PEDIDO: number;
    NUMERO_PEDIDO: string;
    ID_HABITACION: string;
    HUESPED?: string;
    DOCUMENTO?: string;
    TOTAL_ARTICULOS: number;
    TOTAL_PAGAR: number;
    ESTADO: string;
    FECHA?: Date;
    FECHA_TEXTO?: string;
}

export interface IPedidoDTO {
    id?: number;
    peweId?: number;
    idPed?: number;
    numPed?: string;
    numeroPedido?: string;
    habitacion?: string;
    habitacionNumero?: string;
    huesped?: string;
    cliente?: string;
    documento?: string;
    nit?: string;
    articulos: number;
    total: number;
    estado: string;
    fecha?: string;
    fechaTexto?: string;
    observaciones?: string;
}
