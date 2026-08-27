import { Request, Response } from 'express';
import { ArticuloService } from '../services/articulo.service';

export class ArticuloController {
    static async getAll(req: Request, res: Response) {
        const { grupo, excluirGrupo } = req.query;
        try {
            const articulos = await ArticuloService.getArticulos(
                grupo ? String(grupo) : undefined,
                excluirGrupo ? String(excluirGrupo) : undefined
            );
            res.json(articulos);
        } catch (error: any) {
            console.error('Error en ArticuloController.getAll:', error.message);
            res.status(500).json({ error: 'Error al consultar catálogo de artículos' });
        }
    }

    static async getListasPrecios(req: Request, res: Response) {
        try {
            const listas = await ArticuloService.getListasPrecios();
            res.json(listas);
        } catch (error: any) {
            console.error('Error en ArticuloController.getListasPrecios:', error.message);
            res.status(500).json({ error: 'Error al consultar listas de precios' });
        }
    }

    static async getPrecio(req: Request, res: Response) {
        const { artiCod, liprCod } = req.query;
        if (!artiCod) {
            return res.status(400).json({ error: 'artiCod es obligatorio' });
        }
        try {
            const precio = await ArticuloService.getPrecioArticulo(
                String(artiCod).trim(),
                liprCod ? parseInt(String(liprCod), 10) : undefined
            );
            res.json({ artiCod: String(artiCod).trim(), liprCod: liprCod ? parseInt(String(liprCod), 10) : 1, precio });
        } catch (error: any) {
            console.error('Error en ArticuloController.getPrecio:', error.message);
            res.status(500).json({ error: 'Error al consultar precio del artículo' });
        }
    }
}

