import { Router } from 'express';
import { TerceroController } from '../controllers/tercero.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Listar tipos de documento
router.get('/tipos-documento', verifyToken, TerceroController.getTiposDocumento);

// Listar terceros
router.get('/', verifyToken, TerceroController.getAll);

// Grabar nuevo cliente / huésped
router.post('/', verifyToken, TerceroController.grabeTercero);
router.post('/grabeTercero', verifyToken, TerceroController.grabeTercero);

export default router;
