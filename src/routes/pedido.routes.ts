import { Router } from 'express';
import { PedidoController } from '../controllers/pedido.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Grabar en PEDIDO_WEB y PEDIDO_WEB_DETALLE
router.post('/grabar-web', verifyToken, PedidoController.grabarPedidoWeb);

// Enviar a facturar usando GRABE_PEDIDO_APP
router.post('/enviar-facturar', verifyToken, PedidoController.enviarAFacturar);

// Agregar nuevo ítem al carrito de habitación
router.post('/agregar-item', verifyToken, PedidoController.agregarConsumo);

// Obtener prefijos disponibles para factura de venta (TIDO_COD = 31)
router.get('/prefijos-factura', verifyToken, PedidoController.getPrefijosFactura);

// Obtener datos para impresión de comprobante / tirilla POS
router.get('/imprimir/:tipoDoc/:idDoc', verifyToken, PedidoController.getDatosImpresion);

// Compatibilidad
router.post('/crear', verifyToken, PedidoController.enviarAFacturar);

export default router;
