import { Router } from 'express';
import { PedidoController } from '../controllers/pedido.controller';
import { CarteraController } from '../controllers/cartera.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Reporte de Pedidos / Remisiones
router.get('/pedidos', verifyToken, PedidoController.getReporte);

// Reporte de Cartera Consolidada (REP_CARTERA_CONSOLIDADA)
router.get('/cartera', verifyToken, CarteraController.getReporteCartera);

export default router;
