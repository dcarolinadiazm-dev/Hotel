import { Request, Response } from 'express';
import { AbonoService } from '../services/abono.service';

export class AbonoController {
    // GET /api/abonos/formas-pago
    static async getFormasPago(req: Request, res: Response) {
        try {
            const formas = await AbonoService.getFormasPago();
            res.json(formas);
        } catch (error: any) {
            console.error('Error en AbonoController.getFormasPago:', error.message);
            res.status(500).json({ error: error.message || 'Error al obtener formas de pago' });
        }
    }

    // GET /api/abonos/habitacion/:id
    static async getAbonos(req: Request, res: Response) {
        const idHabitacion = String(req.params.id);
        const tercNit = req.query.nit ? String(req.query.nit) : undefined;
        try {
            const result = await AbonoService.getAbonos(idHabitacion, tercNit);
            res.json(result);
        } catch (error: any) {
            console.error(`Error en AbonoController.getAbonos (${idHabitacion}):`, error.message);
            res.status(500).json({ error: error.message || 'Error al consultar abonos' });
        }
    }

    // POST /api/abonos
    static async registrarAbono(req: Request, res: Response) {
        try {
            const { idHabitacion, tercNit, nombreCliente, monto, fopaId, concepto, banco, cuenta, comprobanteNumero } = req.body;
            const usuario = (req as any).user?.username || 'SYSDBA';

            if (!idHabitacion || !tercNit || !monto || !fopaId) {
                return res.status(400).json({
                    error: 'Los campos idHabitacion, tercNit, monto y fopaId son obligatorios.'
                });
            }

            const result = await AbonoService.registrarAbono({
                idHabitacion,
                tercNit,
                nombreCliente,
                monto: parseFloat(String(monto)),
                fopaId: parseInt(String(fopaId), 10),
                concepto,
                usuario,
                banco,
                cuenta,
                comprobanteNumero
            });

            res.status(201).json(result);
        } catch (error: any) {
            console.error('Error en AbonoController.registrarAbono:', error.message);
            res.status(500).json({ error: error.message || 'Error al registrar abono en Firebird' });
        }
    }

    // DELETE /api/abonos/:anclId
    static async anularAbono(req: Request, res: Response) {
        const anclId = parseInt(String(req.params.anclId), 10);
        try {
            if (isNaN(anclId)) {
                return res.status(400).json({ error: 'ID de anticipo inválido.' });
            }
            const result = await AbonoService.anularAbono(anclId);
            res.json(result);
        } catch (error: any) {
            console.error(`Error en AbonoController.anularAbono (${anclId}):`, error.message);
            res.status(500).json({ error: error.message || 'Error al anular abono en Firebird' });
        }
    }
}

