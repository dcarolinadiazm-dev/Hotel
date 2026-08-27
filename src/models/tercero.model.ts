export interface ITercero {
    TERC_NIT: string;
    TERC_NOM: string;
    TERC_CEL?: string;
    TERC_TEL?: string;
    TERC_EMAIL?: string;
}

export interface ITerceroDTO {
    nit: string;
    nombre: string;
    telefono?: string;
    celular?: string;
    email?: string;
    direccion?: string;
}

export interface IGrabeTercero {
    nit: string;
    dv?: string;
    tipoId?: string;
    nombre?: string;
    nombre1?: string;
    nombre2?: string;
    apellido1?: string;
    apellido2?: string;
    dir?: string;
    barrio?: string;
    tel?: string;
    cel?: string;
    email?: string;
    codCiu?: string;
    codPais?: string;
    zona?: string;
    observaciones?: string;
}
