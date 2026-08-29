import { Router } from 'express';
import { TurnoController } from '../controllers/turno.controller';

const router = Router();

router.get('/activo', TurnoController.getTurnoActivo);
router.post('/apertura', TurnoController.aperturaTurno);
router.get('/resumen-cierre/:id?', TurnoController.getResumenCierre);
router.post('/cierre', TurnoController.cierreTurno);

export default router;
