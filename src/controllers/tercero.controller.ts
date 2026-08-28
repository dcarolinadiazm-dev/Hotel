import { Request, Response } from 'express';
import { TerceroService } from '../services/tercero.service';
import { IGrabeTercero } from '../models/tercero.model';

export class TerceroController {
    // GET /api/terceros/tipos-documento
    static async getTiposDocumento(req: Request, res: Response) {
        try {
            const tipos = await TerceroService.getTiposDocumento();
            res.json(tipos);
        } catch (error: any) {
            console.error('Error en TerceroController.getTiposDocumento:', error.message);
            res.status(500).json({ error: 'Error al consultar tipos de documento en Firebird' });
        }
    }

    // GET /api/terceros/ciudades
    static async getCiudades(req: Request, res: Response) {
        try {
            const ciudades = await TerceroService.getCiudades();
            res.json(ciudades);
        } catch (error: any) {
            console.error('Error en TerceroController.getCiudades:', error.message);
            res.status(500).json({ error: 'Error al consultar ciudades en Firebird' });
        }
    }

    // GET /api/terceros
    static async getAll(req: Request, res: Response) {
        try {
            const terceros = await TerceroService.getTerceros();
            res.json(terceros);
        } catch (error: any) {
            console.error('Error en TerceroController.getAll:', error.message);
            res.status(500).json({ error: 'Error al consultar terceros en Firebird con Knex' });
        }
    }

    // POST /api/terceros / POST /api/terceros/grabeTercero
    // Compatible con la estructura del body de SYSplusCloudBE ({ tercero: {...} } o {...})
    static async grabeTercero(req: Request, res: Response) {
        try {
            const payload: IGrabeTercero = req.body.tercero ? req.body.tercero : req.body;

            if (!payload) {
                return res.status(400).json({ error: 'Datos del tercero no proporcionados' });
            }

            const resultado = await TerceroService.grabeTercero(payload);
            return res.status(200).json(resultado);
        } catch (error: any) {
            console.error('Error en TerceroController.grabeTercero:', error.message);
            return res.status(400).json({
                name: error.name || 'ErrorValidacion',
                message: error.message || 'Ocurrió un error al grabar el tercero en Firebird.'
            });
        }
    }
}
