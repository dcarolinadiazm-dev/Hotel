import { Request, Response } from 'express';
import { TurnoService } from '../services/turno.service';

export class TurnoController {
    // GET /api/turnos/activo
    static async getTurnoActivo(req: Request, res: Response) {
        try {
            const turno = await TurnoService.getTurnoActivo();
            res.json({ turno });
        } catch (error: any) {
            console.error('Error en TurnoController.getTurnoActivo:', error.message);
            res.status(500).json({ error: error.message || 'Error al consultar turno activo' });
        }
    }

    // POST /api/turnos/apertura
    static async aperturaTurno(req: Request, res: Response) {
        try {
            const { usuario, base, observaciones } = req.body;
            const turno = await TurnoService.aperturaTurno({
                usuario,
                base: Number(base || 0),
                observaciones
            });
            res.json({ success: true, turno });
        } catch (error: any) {
            console.error('Error en TurnoController.aperturaTurno:', error.message);
            res.status(400).json({ error: error.message || 'Error al abrir turno' });
        }
    }

    // GET /api/turnos/resumen-cierre/:id?
    static async getResumenCierre(req: Request, res: Response) {
        try {
            const idTurno = req.params.id ? parseInt(String(req.params.id), 10) : undefined;
            const resumen = await TurnoService.getResumenCierre(idTurno);
            res.json(resumen);
        } catch (error: any) {
            console.error('Error en TurnoController.getResumenCierre:', error.message);
            res.status(500).json({ error: error.message || 'Error al obtener resumen de cierre Z' });
        }
    }

    // POST /api/turnos/cierre
    static async cierreTurno(req: Request, res: Response) {
        try {
            const { idTurno, observaciones } = req.body;
            if (!idTurno) {
                return res.status(400).json({ error: 'idTurno es requerido para el cierre' });
            }
            const resultado = await TurnoService.cierreTurno({
                idTurno: parseInt(String(idTurno), 10),
                observaciones
            });
            res.json({ success: true, resultado });
        } catch (error: any) {
            console.error('Error en TurnoController.cierreTurno:', error.message);
            res.status(500).json({ error: error.message || 'Error al realizar Cierre Z' });
        }
    }

    // GET /api/turnos/historial
    static async getHistorial(req: Request, res: Response) {
        try {
            const { fechaDesde, fechaHasta, usuario, estado } = req.query;
            const turnos = await TurnoService.getHistorialTurnos({
                fechaDesde: fechaDesde ? String(fechaDesde) : undefined,
                fechaHasta: fechaHasta ? String(fechaHasta) : undefined,
                usuario: usuario ? String(usuario) : undefined,
                estado: estado ? String(estado) : undefined
            });
            res.json({ turnos });
        } catch (error: any) {
            console.error('Error en TurnoController.getHistorial:', error.message);
            res.status(500).json({ error: error.message || 'Error al consultar historial de turnos' });
        }
    }

    // GET /api/turnos/detalle/:id
    static async getDetalle(req: Request, res: Response) {
        try {
            const idTurno = parseInt(String(req.params.id), 10);
            if (isNaN(idTurno)) {
                return res.status(400).json({ error: 'ID de turno no válido' });
            }
            const detalle = await TurnoService.getDetalleTurnoCerrado(idTurno);
            res.json(detalle);
        } catch (error: any) {
            console.error('Error en TurnoController.getDetalle:', error.message);
            res.status(500).json({ error: error.message || 'Error al consultar detalle del turno' });
        }
    }
}
