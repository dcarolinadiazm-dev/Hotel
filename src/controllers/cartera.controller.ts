import { Request, Response } from 'express';
import { CarteraService } from '../services/cartera.service';

export class CarteraController {
  // GET /api/reportes/cartera
  static async getReporteCartera(req: Request, res: Response) {
    try {
      const fecha = req.query.fecha ? String(req.query.fecha) : undefined;
      const nit = req.query.nit ? String(req.query.nit) : undefined;
      const nombre = req.query.nombre ? String(req.query.nombre) : undefined;

      const resultado = await CarteraService.getReporteCartera(fecha, nit, nombre);
      res.json(resultado);
    } catch (error: any) {
      console.error('Error en CarteraController.getReporteCartera:', error.message);
      res.status(500).json({ error: error.message || 'Error al obtener reporte de cartera' });
    }
  }
}
