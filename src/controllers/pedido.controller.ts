import { Request, Response } from 'express';
import { PedidoService } from '../services/pedido.service';

export class PedidoController {
    // POST /api/pedidos/grabar-web
    static async grabarPedidoWeb(req: Request, res: Response) {
        const { habitacionId, items, huesped } = req.body;
        if (!habitacionId) {
            return res.status(400).json({ error: 'habitacionId es requerido' });
        }

        try {
            const resultado = await PedidoService.grabarPedidoWeb(String(habitacionId), items, huesped);
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.grabarPedidoWeb:', error.message);
            res.status(500).json({ error: error.message || 'Error al grabar pedido web' });
        }
    }

    // GET /api/pedidos/prefijos-factura
    static async getPrefijosFactura(req: Request, res: Response) {
        try {
            const prefijos = await PedidoService.getPrefijosFactura();
            res.json(prefijos);
        } catch (error: any) {
            console.error('Error en PedidoController.getPrefijosFactura:', error.message);
            res.status(500).json({ error: error.message || 'Error al obtener prefijos de factura' });
        }
    }

    // POST /api/pedidos/enviar-facturar
    static async enviarAFacturar(req: Request, res: Response) {
        const { habitacionId, peweId, formaPagoId, prefijo, pagos, observaciones } = req.body;
        if (!habitacionId) {
            return res.status(400).json({ error: 'habitacionId es requerido' });
        }

        try {
            const resultado = await PedidoService.enviarAFacturar(
                String(habitacionId),
                peweId ? parseInt(String(peweId), 10) : undefined,
                'FACTURA',
                formaPagoId ? parseInt(String(formaPagoId), 10) : undefined,
                prefijo ? String(prefijo).trim() : undefined,
                pagos,
                observaciones ? String(observaciones).trim() : undefined
            );
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.enviarAFacturar:', error.message);
            res.status(500).json({ error: error.message || 'Error al procesar factura mediante GRABE_DOCUMENTO_INV_WEB' });
        }
    }

    // POST /api/pedidos/enviar-facturar-multiples
    static async enviarAFacturarMultiples(req: Request, res: Response) {
        const { habitacionesIds, formaPagoId, prefijo, pagos, observaciones } = req.body;
        if (!habitacionesIds || !Array.isArray(habitacionesIds) || habitacionesIds.length === 0) {
            return res.status(400).json({ error: 'Debe proporcionar una lista de IDs de habitaciones' });
        }

        try {
            const resultado = await PedidoService.enviarAFacturarMultiples(
                habitacionesIds.map(String),
                formaPagoId ? parseInt(String(formaPagoId), 10) : undefined,
                prefijo ? String(prefijo).trim() : undefined,
                pagos,
                observaciones ? String(observaciones).trim() : undefined
            );
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.enviarAFacturarMultiples:', error.message);
            res.status(500).json({ error: error.message || 'Error al procesar factura consolidada de habitaciones' });
        }
    }

    // POST /api/pedidos/facturar-directo
    static async facturarDirecto(req: Request, res: Response) {
        const { clienteNit, clienteNom, items, formaPagoId, prefijo, pagos, observaciones } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'El carrito no contiene productos para facturar' });
        }

        try {
            const resultado = await PedidoService.facturarDirecto(
                clienteNit,
                clienteNom,
                items,
                formaPagoId ? parseInt(String(formaPagoId), 10) : undefined,
                prefijo ? String(prefijo).trim() : undefined,
                pagos,
                observaciones ? String(observaciones).trim() : undefined
            );
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.facturarDirecto:', error.message);
            res.status(500).json({ error: error.message || 'Error al facturar productos' });
        }
    }

    // POST /api/pedidos/agregar-item
    static async agregarConsumo(req: Request, res: Response) {
        const { habitacionId, item } = req.body;
        if (!habitacionId || !item || !item.descripcion) {
            return res.status(400).json({ error: 'habitacionId y datos del item son requeridos' });
        }

        try {
            const resultado = await PedidoService.agregarConsumo(String(habitacionId), item);
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.agregarConsumo:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/reportes/pedidos
    static async getReporte(req: Request, res: Response) {
        const { fechaDesde, fechaHasta } = req.query;
        try {
            const reporte = await PedidoService.getReportePedidos(
                fechaDesde ? String(fechaDesde) : undefined,
                fechaHasta ? String(fechaHasta) : undefined
            );
            res.json(reporte);
        } catch (error: any) {
            console.error('Error en PedidoController.getReporte:', error.message);
            res.status(500).json({ error: 'Error al generar reporte de pedidos' });
        }
    }

    // GET /api/pedidos/imprimir/:tipoDoc/:idDoc
    static async getDatosImpresion(req: Request, res: Response) {
        const { tipoDoc, idDoc } = req.params;
        if (!idDoc) {
            return res.status(400).json({ error: 'idDoc es requerido' });
        }

        try {
            const datos = await PedidoService.getDatosImpresion(String(tipoDoc), parseInt(String(idDoc), 10));
            res.json(datos);
        } catch (error: any) {
            console.error('Error en PedidoController.getDatosImpresion:', error.message);
            res.status(500).json({ error: error.message || 'Error al obtener datos de impresión' });
        }
    }
}
