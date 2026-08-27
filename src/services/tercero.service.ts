import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { ITerceroDTO, IGrabeTercero } from '../models/tercero.model';

export class TerceroService {
    // Listar los terceros que sean clientes (TERC_CLIE = 'S') ordenados por nombre
    static async getTerceros(): Promise<ITerceroDTO[]> {
        const rows = await db(tables.TERCEROS)
            .select(
                db.raw('TRIM(TERC_NIT) as "nit"'),
                db.raw('TRIM(TERC_NOM) as "nombre"'),
                db.raw('TRIM(TERC_TEL) as "telefono"'),
                db.raw('TRIM(TERC_CEL) as "celular"'),
                db.raw('TRIM(TERC_EMAIL) as "email"'),
                db.raw('TRIM(TERC_DIR) as "direccion"')
            )
            .where(db.raw("UPPER(TRIM(COALESCE(TERC_CLIE, 'N'))) = 'S'"))
            .whereNotNull('TERC_NOM')
            .andWhere('TERC_NOM', '<>', '')
            .limit(200)
            .orderBy('TERC_NOM', 'asc');

        return rows.map((r: any) => ({
            nit: String(r.nit || '').trim(),
            nombre: String(r.nombre || '').trim(),
            telefono: r.telefono ? String(r.telefono).trim() : undefined,
            celular: r.celular ? String(r.celular).trim() : undefined,
            email: r.email ? String(r.email).trim() : undefined,
            direccion: r.direccion ? String(r.direccion).trim() : undefined
        }));
    }

    // Asegurar que el tercero también esté registrado como CLIENTE en SYSPLUS
    static async ensureCliente(nit: string) {
        const cleanNit = nit.trim();
        const existingCliente = await db(tables.CLIENTES)
            .where('TERC_NIT', cleanNit)
            .first();

        if (!existingCliente) {
            try {
                await db(tables.CLIENTES).insert({
                    TERC_NIT: cleanNit,
                    CLIE_COD: cleanNit,
                    CLIE_ESTADO: 'A',
                    CLIE_RTEFTE: 0,
                    CLIE_RTEIVA: 0,
                    CLIE_RTEICA: 0,
                    CLIE_RTFTEBASE: 0,
                    CLIE_DTOMAX: 0,
                    CLIE_CUPO: 10000000,
                    COBR_COD: 1,
                    VEND_COD: 1,
                    ZONA_ID: '1',
                    LIPR_COD: 1,
                    CLIE_DIAS: 0,
                    CLIE_FECHA: new Date(),
                    CLIE_DIASBLOQ: 1,
                    CLIE_DETALLE: 'N',
                    CLIE_RESALTAR: 'N',
                    CLIE_CONTADO: 'S',
                    CLIE_FPAGO: 1
                });
            } catch (clieErr: any) {
                console.warn('Aviso insertando en CLIENTES (reintentando con campos esenciales):', clieErr.message);
                try {
                    await db(tables.CLIENTES).insert({
                        TERC_NIT: cleanNit,
                        CLIE_COD: cleanNit,
                        CLIE_ESTADO: 'A',
                        CLIE_CUPO: 10000000,
                        COBR_COD: 1,
                        VEND_COD: 1,
                        ZONA_ID: '1',
                        LIPR_COD: 1
                    });
                } catch (e2: any) {
                    console.error('Error insertando en CLIENTES:', e2.message);
                    throw e2;
                }
            }
        }
    }

    // Obtener los tipos de documento desde TIPO_DOCUMENTO
    static async getTiposDocumento(): Promise<any[]> {
        try {
            const rows = await db(tables.TIPO_DOCUMENTO)
                .select(
                    db.raw('TIDO_COD as "cod"'),
                    db.raw('TRIM(TIDO_NOMCORTO) as "nomCorto"'),
                    db.raw('TRIM(TIDO_NOMLARGO) as "nomLargo"')
                )
                .orderBy('TIDO_COD', 'asc');

            if (rows && rows.length > 0) {
                return rows.map((r: any) => ({
                    cod: Number(r.cod || r.COD),
                    nomCorto: String(r.nomCorto || r.NOMCORTO || '').trim(),
                    nomLargo: String(r.nomLargo || r.NOMLARGO || '').trim()
                }));
            }
        } catch (e: any) {
            console.warn('Aviso consultando TIPO_DOCUMENTO:', e.message);
        }

        // Tipos de documento estándar por defecto
        return [
            { cod: 1, nomCorto: 'CC', nomLargo: 'CÉDULA DE CIUDADANÍA' },
            { cod: 2, nomCorto: 'NIT', nomLargo: 'NIT / RUT' },
            { cod: 3, nomCorto: 'CE', nomLargo: 'CÉDULA DE EXTRANJERÍA' },
            { cod: 4, nomCorto: 'PAS', nomLargo: 'PASAPORTE' },
            { cod: 5, nomCorto: 'TI', nomLargo: 'TARJETA DE IDENTIDAD' },
            { cod: 6, nomCorto: 'PEP', nomLargo: 'PERMISO ESPECIAL' }
        ];
    }

    // Grabar o actualizar tercero (cliente / huésped) similar a SYSplusCloudBE
    static async grabeTercero(data: IGrabeTercero): Promise<any> {
        if (!data.tipoId || data.tipoId.trim() === '') {
            throw new Error('El tipo de documento es obligatorio');
        }

        if (!data.nit || data.nit.trim() === '') {
            throw new Error('El NIT / Cédula / Documento es obligatorio');
        }

        // Construir nombre completo si vienen nombres y apellidos separados
        let nombreCompleto = data.nombre ? data.nombre.trim() : '';
        if (!nombreCompleto && (data.nombre1 || data.apellido1)) {
            nombreCompleto = [data.nombre1, data.nombre2, data.apellido1, data.apellido2]
                .filter(Boolean)
                .join(' ')
                .trim();
        }

        if (!nombreCompleto) {
            throw new Error('El nombre o razón social del tercero es obligatorio');
        }

        if ((!data.cel || data.cel.trim() === '') && (!data.tel || data.tel.trim() === '')) {
            throw new Error('El celular / teléfono es obligatorio');
        }

        if (!data.email || data.email.trim() === '') {
            throw new Error('El correo electrónico es obligatorio');
        }

        if (!data.dir || data.dir.trim() === '') {
            throw new Error('La dirección es obligatoria');
        }

        const nit = data.nit.trim();
        const telefono = (data.cel || data.tel || '').trim();

        // 1. Verificar si el tercero ya existe en la tabla TERCEROS
        const existing = await db(tables.TERCEROS)
            .where('TERC_NIT', nit)
            .first();

        const terceroPayload = {
            TERC_NOM: nombreCompleto,
            TERC_DV: data.dv || null,
            TERC_TIPOID: (data.tipoId || 'CC').substring(0, 10),
            TERC_NOMBRE1: data.nombre1 || null,
            TERC_NOMBRE2: data.nombre2 || null,
            TERC_APELLIDO1: data.apellido1 || null,
            TERC_APELLIDO2: data.apellido2 || null,
            TERC_DIR: data.dir ? data.dir.trim() : null,
            TERC_TEL: telefono,
            TERC_CEL: telefono,
            TERC_EMAIL: data.email ? data.email.trim() : null,
            CIUD_COD: data.codCiu || '05001',
            PAIS_ID: data.codPais || '169',
            TERC_CLIE: 'S',
            TERC_ESTADO: 'S',
            TERC_NOTIFICAR: 'S',
            TERC_OBS: data.observaciones || null,
        };

        if (existing) {
            await db(tables.TERCEROS)
                .where('TERC_NIT', nit)
                .update(terceroPayload);
        } else {
            await db(tables.TERCEROS).insert({
                TERC_NIT: nit,
                TERC_NITCONTA: nit,
                ...terceroPayload
            });
        }

        // Asegurar registro en la tabla CLIENTES
        await this.ensureCliente(nit);

        return {
            success: true,
            action: existing ? 'UPDATED' : 'CREATED',
            nit: nit,
            nombre: nombreCompleto,
            message: existing ? 'Tercero actualizado exitosamente en Firebird' : 'Nuevo tercero grabado exitosamente en Firebird'
        };
    }
}
