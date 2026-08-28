import { db } from '../config/knex.config';
import { tables } from '../utils/tables';
import { IArticuloDTO, IListaPrecioDTO, IArticuloPrecioDTO } from '../models/articulo.model';


export class ArticuloService {
    // Obtener el código de lista de precios predeterminada
    static async getDefaultLiprCod(): Promise<number> {
        try {
            const row = await db(tables.LISTA_PRECIOS)
                .where('LIPR_PREDET', 'S')
                .orWhere('LIPR_PREDET', 's')
                .orWhere('LIPR_PREDET', '1')
                .first();
            if (row && row.LIPR_COD) {
                return parseInt(String(row.LIPR_COD), 10);
            }
            const firstRow = await db(tables.LISTA_PRECIOS).orderBy('LIPR_COD', 'asc').first();
            if (firstRow && firstRow.LIPR_COD) {
                return parseInt(String(firstRow.LIPR_COD), 10);
            }
        } catch (e: any) {
            console.warn('Aviso consultando LISTA_PRECIOS:', e.message);
        }
        return 1;
    }

    // Obtener precio de un artículo desde PRECIOS_ARTICULO según la lista predeterminada
    static async getPrecioArticulo(artiCod: string, liprCod?: number): Promise<number> {
        const defaultLipr = liprCod || await this.getDefaultLiprCod();
        try {
            const precioRow = await db(tables.PRECIOS_ARTICULO)
                .where({
                    LIPR_COD: defaultLipr,
                    ARTI_COD: artiCod
                })
                .first();
            if (precioRow && precioRow.PRAR_FIJO !== undefined && precioRow.PRAR_FIJO !== null) {
                return parseFloat(String(precioRow.PRAR_FIJO));
            }
        } catch (e: any) {
            console.warn('Aviso consultando PRECIOS_ARTICULO:', e.message);
        }

        // Fallback a ARTICULO.ARTI_PRECIO
        try {
            const artRow = await db(tables.ARTICULO).where('ARTI_COD', artiCod).first();
            if (artRow && artRow.ARTI_PRECIO !== undefined && artRow.ARTI_PRECIO !== null) {
                return parseFloat(String(artRow.ARTI_PRECIO));
            }
        } catch (e) {}

        return 0;
    }

    // Obtener la tarifa de IVA de un artículo (TAIV_COD y porcentaje de TARIFA_IVA)
    static async getTarifaIvaArticulo(artiCod: string): Promise<{ taivCod: number; ivaPorc: number }> {
        if (!artiCod) return { taivCod: 0, ivaPorc: 0 };
        try {
            const row = await db(tables.ARTICULO)
                .leftJoin('TARIFA_IVA', `${tables.ARTICULO}.TAIV_COD`, '=', 'TARIFA_IVA.TAIV_COD')
                .where(`${tables.ARTICULO}.ARTI_COD`, artiCod)
                .select(`${tables.ARTICULO}.TAIV_COD as TAIV_COD`, 'TARIFA_IVA.TAIV_PORC as TAIV_PORC')
                .first();
            if (row) {
                const taivCod = row.TAIV_COD !== null && row.TAIV_COD !== undefined ? parseInt(String(row.TAIV_COD), 10) : 0;
                const ivaPorc = row.TAIV_PORC !== null && row.TAIV_PORC !== undefined ? parseFloat(String(row.TAIV_PORC)) : 0;
                return { taivCod, ivaPorc };
            }
        } catch (e: any) {
            console.warn('Aviso obteniendo tarifa IVA:', e.message);
        }
        return { taivCod: 0, ivaPorc: 0 };
    }

    // Obtener todas las listas de precios activas
    static async getListasPrecios(): Promise<IListaPrecioDTO[]> {
        try {
            const rawListas = await db.raw('SELECT LIPR_COD, TRIM(LIPR_NOM) AS LISTANOMBRE, LIPR_PREDET FROM LISTA_PRECIOS ORDER BY LIPR_COD ASC');
            const rows = rawListas.rows ? rawListas.rows : (Array.isArray(rawListas) ? rawListas : [rawListas]);
            return rows.map((r: any) => {
                const liprCod = parseInt(String(r.LIPR_COD ?? r.liprCod ?? 1), 10);
                const nombre = String(r.LISTANOMBRE ?? r.nombre ?? r.LIPR_NOM ?? `Lista #${liprCod}`).trim();
                const predet = r.LIPR_PREDET ?? r.esPredeterminada;
                return {
                    liprCod,
                    nombre,
                    esPredeterminada: predet === 'S' || predet === 's' || predet === 1 || predet === true
                };
            });
        } catch (e: any) {
            console.warn('Aviso obteniendo listas de precios:', e.message);
            return [{ liprCod: 1, nombre: 'DETAL', esPredeterminada: true }];
        }
    }

    static async getArticulos(grupo?: string, excluirGrupo?: string): Promise<IArticuloDTO[]> {
        const defaultLipr = await this.getDefaultLiprCod();

        let query = db(tables.ARTICULO)
            .leftJoin(tables.PRECIOS_ARTICULO, function () {
                this.on(`${tables.ARTICULO}.ARTI_COD`, '=', `${tables.PRECIOS_ARTICULO}.ARTI_COD`)
                    .andOnVal(`${tables.PRECIOS_ARTICULO}.LIPR_COD`, '=', defaultLipr);
            })
            .leftJoin('TARIFA_IVA', `${tables.ARTICULO}.TAIV_COD`, '=', 'TARIFA_IVA.TAIV_COD')
            .select(
                db.raw(`TRIM(${tables.ARTICULO}.ARTI_COD) as "codigo"`),
                db.raw(`TRIM(${tables.ARTICULO}.ARTI_DES) as "descripcion"`),
                db.raw(`COALESCE(${tables.PRECIOS_ARTICULO}.PRAR_FIJO, ${tables.ARTICULO}.ARTI_PRECIO, 0) as "precio"`),
                db.raw(`TRIM(${tables.ARTICULO}.ARTI_UNIDAD) as "unidad"`),
                db.raw(`TRIM(${tables.ARTICULO}.GRIN_COD) as "grinCod"`),
                `${tables.ARTICULO}.TAIV_COD as taivCod`,
                `TARIFA_IVA.TAIV_PORC as ivaPorc`
            )
            .whereNotNull(`${tables.ARTICULO}.ARTI_DES`)
            .andWhere(`${tables.ARTICULO}.ARTI_DES`, '<>', '')
            .whereRaw(`TRIM(${tables.ARTICULO}.ARTI_COD) NOT STARTING WITH '.'`)
            .whereRaw(`TRIM(${tables.ARTICULO}.ARTI_COD) NOT IN ('.t', '.t0', '.t1', '.t2', '.T', '.T0', '.T1', '.T2')`);

        if (grupo) {
            query = query.whereRaw(`TRIM(${tables.ARTICULO}.GRIN_COD) = ?`, [grupo.trim().toUpperCase()]);
        }

        if (excluirGrupo) {
            query = query.where(function () {
                this.whereNull(`${tables.ARTICULO}.GRIN_COD`)
                    .orWhereRaw(`TRIM(${tables.ARTICULO}.GRIN_COD) <> ?`, [excluirGrupo.trim().toUpperCase()]);
            });
        }

        const rows = await query
            .limit(500)
            .orderBy(`${tables.ARTICULO}.ARTI_DES`, 'asc');

        // Consultar todos los precios de los artículos en PRECIOS_ARTICULO junto con el nombre de LISTA_PRECIOS
        let allPreciosRows: any[] = [];
        try {
            const rawPrecios = await db.raw(`
                SELECT TRIM(P.ARTI_COD) AS ARTICOD, P.LIPR_COD, TRIM(L.LIPR_NOM) AS LISTANOMBRE, P.PRAR_FIJO, L.LIPR_PREDET 
                FROM PRECIOS_ARTICULO P 
                JOIN LISTA_PRECIOS L ON P.LIPR_COD = L.LIPR_COD
                ORDER BY P.LIPR_COD ASC
            `);
            allPreciosRows = rawPrecios.rows ? rawPrecios.rows : (Array.isArray(rawPrecios) ? rawPrecios : [rawPrecios]);
        } catch (e: any) {
            console.warn('Aviso consultando PRECIOS_ARTICULO generales:', e.message);
        }

        return rows.map((r: any) => {
            const cod = String(r.codigo || r.ARTI_COD || '').trim();
            const preciosArticulo = allPreciosRows
                .filter((p: any) => String(p.ARTICOD || p.artiCod || p.ARTI_COD || '').trim() === cod)
                .map((p: any) => {
                    const liprVal = p.LIPR_COD ?? p.liprCod ?? 1;
                    const nomVal = p.LISTANOMBRE ?? p.listaNombre ?? p.LIPR_NOM ?? `Lista #${liprVal}`;
                    const precioVal = p.PRAR_FIJO ?? p.precio ?? 0;
                    const predetVal = p.LIPR_PREDET ?? p.esPredeterminada ?? 'N';
                    return {
                        liprCod: parseInt(String(liprVal), 10),
                        listaNombre: String(nomVal).trim(),
                        precio: parseFloat(String(precioVal || '0')),
                        esPredeterminada: predetVal === 'S' || predetVal === 's' || predetVal === 1 || predetVal === true
                    };
                });

            const taivVal = r.taivCod ?? r.TAIVCOD ?? r.TAIV_COD ?? 0;
            const ivaPorcVal = r.ivaPorc ?? r.IVAPORC ?? r.TAIV_PORC ?? 0;

            return {
                codigo: cod,
                descripcion: String(r.descripcion || r.ARTI_DES || '').trim(),
                precio: parseFloat(r.precio || '0'),
                unidad: String(r.unidad || r.ARTI_UNIDAD || 'UND').trim() || 'UND',
                grinCod: String(r.grinCod || r.GRIN_COD || '').trim(),
                taivCod: parseInt(String(taivVal || '0'), 10) || 0,
                ivaPorc: parseFloat(String(ivaPorcVal || '0')) || 0,
                precios: preciosArticulo.length > 0 ? preciosArticulo : [
                    { liprCod: defaultLipr, listaNombre: 'DETAL', precio: parseFloat(r.precio || '0'), esPredeterminada: true }
                ]
            };
        });
    }
}


