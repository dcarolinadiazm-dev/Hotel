import { Request, Response } from 'express';
import { HabitacionService } from '../services/habitacion.service';

export class HabitacionController {
    // GET /api/habitaciones
    static async getAll(req: Request, res: Response) {
        try {
            const habitaciones = await HabitacionService.getAllHabitaciones();
            res.json(habitaciones);
        } catch (error: any) {
            console.error('Error en HabitacionController.getAll:', error.message);
            res.status(500).json({ error: 'Error al consultar habitaciones en Firebird con Knex' });
        }
    }

    // GET /api/habitaciones/:id
    static async getById(req: Request, res: Response) {
        const id = String(req.params.id);
        try {
            const habitacion = await HabitacionService.getHabitacionById(id);
            if (!habitacion) {
                return res.status(404).json({ error: 'Habitación no encontrada' });
            }
            res.json(habitacion);
        } catch (error: any) {
            console.error(`Error en HabitacionController.getById (${id}):`, error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/habitaciones
    static async create(req: Request, res: Response) {
        try {
            const { numero, artiCod, tipo, piso, precioNoche, caracteristicas, observaciones } = req.body;
            if (!numero || !artiCod) {
                return res.status(400).json({ error: 'El número de habitación y el código de artículo (artiCod) son obligatorios' });
            }
            const nueva = await HabitacionService.createHabitacion({
                numero,
                artiCod,
                tipo,
                piso: piso ? parseInt(String(piso), 10) : 1,
                precioNoche: precioNoche ? parseFloat(String(precioNoche)) : 0,
                caracteristicas,
                observaciones
            });
            res.status(201).json({ success: true, message: 'Habitación creada exitosamente', data: nueva });
        } catch (error: any) {
            console.error('Error en HabitacionController.create:', error.message);
            res.status(500).json({ error: error.message || 'Error al crear habitación' });
        }
    }

    // PUT /api/habitaciones/:id
    static async update(req: Request, res: Response) {
        const id = String(req.params.id);
        try {
            await HabitacionService.updateHabitacion(id, req.body);
            res.json({ success: true, message: 'Habitación actualizada correctamente en Firebird' });
        } catch (error: any) {
            console.error(`Error en HabitacionController.update (${id}):`, error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/habitaciones/:id
    static async delete(req: Request, res: Response) {
        const id = String(req.params.id);
        try {
            await HabitacionService.deleteHabitacion(id);
            res.json({ success: true, message: 'Habitación inhabilitada exitosamente' });
        } catch (error: any) {
            console.error(`Error en HabitacionController.delete (${id}):`, error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/habitaciones/:id/cancelar-reserva
    static async cancelarReserva(req: Request, res: Response) {
        const id = String(req.params.id);
        try {
            const result = await HabitacionService.cancelarReserva(id);
            res.json({ success: true, message: result.message });
        } catch (error: any) {
            console.error(`Error en HabitacionController.cancelarReserva (${id}):`, error.message);
            res.status(500).json({ error: error.message });
        }
    }


    // GET /api/habitaciones/:id/consumos
    static async getConsumos(req: Request, res: Response) {
        const id = String(req.params.id);
        try {
            const consumos = await HabitacionService.getConsumos(id);
            res.json(consumos);
        } catch (error: any) {
            console.error(`Error en HabitacionController.getConsumos (${id}):`, error.message);
            res.status(500).json({ error: 'Error al consultar consumos' });
        }
    }

    // PUT /api/habitaciones/:id/consumos/:consumoId
    static async updateConsumoCantidad(req: Request, res: Response) {
        const id = String(req.params.id);
        const consumoId = parseInt(String(req.params.consumoId), 10);
        const { cantidad } = req.body;
        try {
            await HabitacionService.updateConsumoCantidad(id, consumoId, cantidad);
            res.json({ success: true, message: 'Cantidad actualizada' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/habitaciones/:id/consumos/:consumoId
    static async deleteConsumo(req: Request, res: Response) {
        const id = String(req.params.id);
        const consumoId = parseInt(String(req.params.consumoId), 10);
        try {
            await HabitacionService.deleteConsumo(id, consumoId);
            res.json({ success: true, message: 'Producto eliminado del carrito' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/habitaciones/:id/consumos
    static async emptyCart(req: Request, res: Response) {
        const id = String(req.params.id);
        try {
            await HabitacionService.emptyCart(id);
            res.json({ success: true, message: 'Carrito vaciado exitosamente' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
