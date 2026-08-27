import { Router } from 'express';
import { HabitacionController } from '../controllers/habitacion.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Habitaciones CRUD
router.get('/', verifyToken, HabitacionController.getAll);
router.post('/', verifyToken, HabitacionController.create);
router.get('/:id', verifyToken, HabitacionController.getById);
router.put('/:id', verifyToken, HabitacionController.update);
router.post('/:id/cancelar-reserva', verifyToken, HabitacionController.cancelarReserva);
router.delete('/:id', verifyToken, HabitacionController.delete);


// Consumos de Habitación (Carrito)
router.get('/:id/consumos', verifyToken, HabitacionController.getConsumos);
router.put('/:id/consumos/:consumoId', verifyToken, HabitacionController.updateConsumoCantidad);
router.delete('/:id/consumos/:consumoId', verifyToken, HabitacionController.deleteConsumo);
router.delete('/:id/consumos', verifyToken, HabitacionController.emptyCart);

export default router;
