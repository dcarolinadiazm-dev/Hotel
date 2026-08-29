import { Router } from 'express';
import { TurnoController } from '../controllers/turno.controller';

const router = Router();

router.get('/activo', TurnoController.getTurnoActivo);
router.post('/apertura', TurnoController.aperturaTurno);
router.get('/resumen-cierre', TurnoController.getResumenCierre);
router.get('/resumen-cierre/:id', TurnoController.getResumenCierre);
router.post('/cierre', TurnoController.cierreTurno);
router.get('/historial', TurnoController.getHistorial);
router.get('/detalle/:id', TurnoController.getDetalle);

export default router;
