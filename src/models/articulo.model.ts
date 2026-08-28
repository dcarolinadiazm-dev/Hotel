export interface IArticuloPrecioDTO {
    liprCod: number;
    listaNombre: string;
    precio: number;
    esPredeterminada?: boolean;
}

export interface IListaPrecioDTO {
    liprCod: number;
    nombre: string;
    esPredeterminada: boolean;
}

export interface IArticuloDTO {
    codigo: string;
    descripcion: string;
    precio: number;
    unidad: string;
    grinCod?: string;
    taivCod?: number;
    ivaPorc?: number;
    codigosBarra?: string[];
    precios?: IArticuloPrecioDTO[];
}


