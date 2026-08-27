import { Router } from 'express';
import { AbonoController } from '../controllers/abono.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/formas-pago', verifyToken, AbonoController.getFormasPago);
router.get('/habitacion/:id', verifyToken, AbonoController.getAbonos);
router.post('/', verifyToken, AbonoController.registrarAbono);
router.delete('/:anclId', verifyToken, AbonoController.anularAbono);

export default router;

