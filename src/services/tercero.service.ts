import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { ITerceroDTO, IGrabeTercero } from '../models/tercero.model';

export function calculaDigitoVerificacion(nit: string): string {
    const cleanNit = nit.trim();
    if (cleanNit && !isNaN(Number(cleanNit))) {
        const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
        let suma = 0;
        const nitString = cleanNit.toString();

        for (let i = 0; i < nitString.length; i++) {
            suma += parseInt(nitString.charAt(nitString.length - 1 - i), 10) * pesos[i];
        }

        const residuo = suma % 11;
        const dv = residuo > 1 ? 11 - residuo : residuo;
        return String(dv);
    }
    return '';
}

export function cleanSpecialCharacters(text: string): string {
    if (!text) return '';
    return text
        .normalize('NFC')
        .replace(/\s+/g, ' ')
        .trim();
}

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
                    nombre: cleanSpecialCharacters(String(r.NOM || r.nom || '')),
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

    // Obtener catálogo de ciudades desde la tabla CIUDADES
    static async getCiudades(): Promise<any[]> {
        try {
            const rows = await db(tables.CIUDADES)
                .select(
                    'CIUD_COD as cod',
                    'CIUD_NOM as nom',
                    'CIUD_DPTO as dpto'
                )
                .whereRaw("UPPER(TRIM(COALESCE(CIUD_ACTIVA, 'S'))) = 'S'")
                .orderBy('CIUD_NOM', 'asc');

            if (rows && rows.length > 0) {
                return rows.map((r: any) => ({
                    cod: String(r.cod || r.COD || '').trim(),
                    nom: cleanSpecialCharacters(String(r.nom || r.NOM || '')),
                    dpto: cleanSpecialCharacters(String(r.dpto || r.DPTO || ''))
                })).filter((c: any) => c.cod && c.nom);
            }
        } catch (e: any) {
            console.error('Error consultando CIUDADES en Firebird:', e.message);
        }

        // Fallback de ciudades principales de Colombia
        return [
            { cod: '05001', nom: 'MEDELLIN', dpto: 'ANTIOQUIA' },
            { cod: '11001', nom: 'BOGOTA D.C.', dpto: 'CUNDINAMARCA' },
            { cod: '76001', nom: 'CALI', dpto: 'VALLE DEL CAUCA' },
            { cod: '08001', nom: 'BARRANQUILLA', dpto: 'ATLANTICO' },
            { cod: '13001', nom: 'CARTAGENA', dpto: 'BOLIVAR' },
            { cod: '68001', nom: 'BUCARAMANGA', dpto: 'SANTANDER' },
            { cod: '66001', nom: 'PEREIRA', dpto: 'RISARALDA' },
            { cod: '17001', nom: 'MANIZALES', dpto: 'CALDAS' },
            { cod: '63001', nom: 'ARMENIA', dpto: 'QUINDIO' },
            { cod: '54001', nom: 'CUCUTA', dpto: 'NORTE DE SANTANDER' },
            { cod: '41001', nom: 'NEIVA', dpto: 'HUILA' },
            { cod: '73001', nom: 'IBAGUE', dpto: 'TOLIMA' },
            { cod: '50001', nom: 'VILLAVICENCIO', dpto: 'META' },
            { cod: '20001', nom: 'VALLEDUPAR', dpto: 'CESAR' },
            { cod: '23001', nom: 'MONTERIA', dpto: 'CORDOBA' },
            { cod: '47001', nom: 'SANTA MARTA', dpto: 'MAGDALENA' },
            { cod: '52001', nom: 'PASTO', dpto: 'NARINO' },
            { cod: '19001', nom: 'POPAYAN', dpto: 'CAUCA' },
            { cod: '27001', nom: 'QUIBDO', dpto: 'CHOCO' },
            { cod: '70001', nom: 'SINCELEJO', dpto: 'SUCRE' },
            { cod: '15001', nom: 'TUNJA', dpto: 'BOYACA' },
            { cod: '44001', nom: 'RIOHACHA', dpto: 'LA GUAJIRA' },
            { cod: '81001', nom: 'ARAUCA', dpto: 'ARAUCA' },
            { cod: '85001', nom: 'YOPAL', dpto: 'CASANARE' },
            { cod: '86001', nom: 'MOCOA', dpto: 'PUTUMAYO' },
            { cod: '88001', nom: 'SAN ANDRES', dpto: 'SAN ANDRES' },
            { cod: '91001', nom: 'LETICIA', dpto: 'AMAZONAS' },
            { cod: '94001', nom: 'INIRIDA', dpto: 'GUAINIA' },
            { cod: '95001', nom: 'SAN JOSE DEL GUAVIARE', dpto: 'GUAVIARE' },
            { cod: '97001', nom: 'MITU', dpto: 'VAUPES' },
            { cod: '99001', nom: 'PUERTO CARRENO', dpto: 'VICHADA' }
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

        const nit = data.nit.trim();
        const tipoDoc = (data.tipoId || 'C').trim().substring(0, 1).toUpperCase();
        const dvCalculado = data.dv ? data.dv.trim() : calculaDigitoVerificacion(nit);

        let nombreCompleto = '';
        let nom1: string | null = null;
        let nom2: string | null = null;
        let ape1: string | null = null;
        let ape2: string | null = null;

        if (tipoDoc === 'J') {
            // Persona Jurídica: solo razón social en TERC_NOM
            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('La razón social / nombre de la empresa es obligatorio');
            }
            nombreCompleto = data.nombre.trim();
        } else {
            // Persona Natural: mínimo un apellido y un nombre
            ape1 = data.apellido1 ? data.apellido1.trim() : null;
            ape2 = data.apellido2 ? data.apellido2.trim() : null;
            nom1 = data.nombre1 ? data.nombre1.trim() : null;
            nom2 = data.nombre2 ? data.nombre2.trim() : null;

            if (!ape1 && (!data.nombre || data.nombre.trim() === '')) {
                throw new Error('El 1er. Apellido es obligatorio');
            }
            if (!nom1 && (!data.nombre || data.nombre.trim() === '')) {
                throw new Error('El 1er. Nombre es obligatorio');
            }

            if (ape1 || nom1) {
                nombreCompleto = [ape1, ape2, nom1, nom2].filter(Boolean).join(' ').trim();
            } else {
                nombreCompleto = data.nombre ? data.nombre.trim() : '';
            }
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

        const codCiu = (data.codCiu || '05001').trim();
        let nomCiu = data.nomCiu ? data.nomCiu.trim() : '';
        if (!nomCiu && codCiu) {
            try {
                const ciudRow = await db(tables.CIUDADES).where('CIUD_COD', codCiu).first();
                if (ciudRow) nomCiu = String(ciudRow.CIUD_NOM || '').trim();
            } catch (err) {
                // ignore
            }
        }
        if (!nomCiu) nomCiu = 'MEDELLIN';

        const telefono = (data.cel || data.tel || '').trim();

        // 1. Verificar si el tercero ya existe en la tabla TERCEROS
        const existing = await db(tables.TERCEROS)
            .where('TERC_NIT', nit)
            .first();

        const terceroPayload = {
            TERC_NOM: nombreCompleto,
            TERC_DV: dvCalculado || null,
            TERC_DVDIAN: dvCalculado || null,
            TERC_TIPOID: tipoDoc,
            TERC_NOMBRE1: nom1,
            TERC_NOMBRE2: nom2,
            TERC_APELLIDO1: ape1,
            TERC_APELLIDO2: ape2,
            TERC_DIR: data.dir ? data.dir.trim() : null,
            TERC_TEL: telefono,
            TERC_CEL: telefono,
            TERC_EMAIL: data.email ? data.email.trim() : null,
            CIUD_COD: codCiu.substring(0, 5),
            TERC_CIU: nomCiu.substring(0, 60),
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
