import { Router } from 'express';
import authRoutes from './auth.routes';
import habitacionRoutes from './habitacion.routes';
import pedidoRoutes from './pedido.routes';
import reporteRoutes from './reporte.routes';
import terceroRoutes from './tercero.routes';
import articuloRoutes from './articulo.routes';
import abonoRoutes from './abono.routes';
import { AuthController } from '../controllers/auth.controller';
import { TerceroController } from '../controllers/tercero.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Estado general de conexión a la BD
router.get('/status', AuthController.getDbStatus);

// Compatibilidad directa con endpoint de SYSplusCloudBE
router.post('/grabeTercero', verifyToken, TerceroController.grabeTercero);

// Módulos
router.use('/auth', authRoutes);
router.use('/habitaciones', habitacionRoutes);
router.use('/pedidos', pedidoRoutes);
router.use('/reportes', reporteRoutes);
router.use('/terceros', terceroRoutes);
router.use('/articulos', articuloRoutes);
router.use('/abonos', abonoRoutes);

export default router;

