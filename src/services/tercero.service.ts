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

    // Obtener los tipos de documento desde TIPO_ID
    static async getTiposDocumento(): Promise<any[]> {
        try {
            const rows = await db(tables.TIPO_ID)
                .select(
                    'TIID_COD as COD',
                    'TIID_NOM as NOM',
                    'TIID_CODSHD as CODSHD'
                )
                .orderBy('TIID_COD', 'asc');

            if (rows && rows.length > 0) {
                return rows.map((r: any) => ({
                    cod: String(r.COD || r.cod || '').trim(),
                    nombre: String(r.NOM || r.nom || '').trim(),
                    codShd: r.CODSHD || r.codshd ? String(r.CODSHD || r.codshd).trim() : ''
                })).filter((item: any) => item.cod && item.nombre);
            }
        } catch (e: any) {
            console.error('Error consultando TIPO_ID en Firebird:', e.message);
        }

        // Catálogo completo de 18 tipos de SYSplus
        return [
            { cod: 'C', nombre: 'CEDULA CIUDADANIA', codShd: 'CC' },
            { cod: 'D', nombre: 'DOCUMENTO EXTRANJERO', codShd: '' },
            { cod: 'E', nombre: 'CEDULA EXTRANJERIA', codShd: 'CE' },
            { cod: 'F', nombre: 'EXTRANJERO DIFERENTE NIT DIAN', codShd: '' },
            { cod: 'I', nombre: 'CARNE DIPLOMATICO', codShd: '' },
            { cod: 'J', nombre: 'NIT PERSONA JURIDICA', codShd: 'NIT' },
            { cod: 'L', nombre: 'SUCESION ILIQUIDA SIN DOCUMENT', codShd: '' },
            { cod: 'N', nombre: 'NIT PERSONA NATURAL', codShd: 'NIT' },
            { cod: 'O', nombre: 'EXTRANJERO PERSONA JURICA', codShd: '' },
            { cod: 'P', nombre: 'PASAPORTE', codShd: 'PA' },
            { cod: 'Q', nombre: 'SUCESION ILIQUIDA NOTARIA/JUZG', codShd: '' },
            { cod: 'R', nombre: 'REGISTRO CIVIL', codShd: 'RC' },
            { cod: 'S', nombre: 'EXTRANJERO SIN DOCUMENTO', codShd: '' },
            { cod: 'T', nombre: 'TARJETA IDENTIDAD', codShd: 'TI' },
            { cod: 'U', nombre: 'NIUP', codShd: '' },
            { cod: 'V', nombre: 'PERMISO PROTECCION TEMPORAL', codShd: 'PT' },
            { cod: 'X', nombre: 'TARJETA EXTRANJERIA', codShd: '' },
            { cod: 'Z', nombre: 'PERMISO ESPECIAL PERMANENCIA', codShd: 'PE' }
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
            TERC_TIPOID: (data.tipoId || 'C').substring(0, 1),
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
