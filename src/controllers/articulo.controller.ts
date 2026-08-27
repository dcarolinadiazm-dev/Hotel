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
}

