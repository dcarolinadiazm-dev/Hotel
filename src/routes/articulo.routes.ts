import { Router } from 'express';
import { ArticuloController } from '../controllers/articulo.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/listas-precios', verifyToken, ArticuloController.getListasPrecios);
router.get('/precio', verifyToken, ArticuloController.getPrecio);
router.get('/', verifyToken, ArticuloController.getAll);

export default router;

