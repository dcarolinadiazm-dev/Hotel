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
        console.log(`[HTTP-REQUEST] POST /api/pedidos/enviar-facturar recibido para habitacionId: ${habitacionId}, peweId: ${peweId}, prefijo: ${prefijo}`);
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
            console.log(`[HTTP-RESPONSE] POST /api/pedidos/enviar-facturar completado exitosamente:`, resultado);
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.enviarAFacturar:', error.message);
            res.status(500).json({ error: error.message || 'Error al procesar factura mediante GRABE_DOCUMENTO_INV_WEB' });
        }
    }

    // POST /api/pedidos/enviar-facturar-multiples
    static async enviarAFacturarMultiples(req: Request, res: Response) {
        const { habitacionesIds, formaPagoId, prefijo, pagos, observaciones, clienteNit, clienteNom, nit, nombreCliente } = req.body;
        console.log(`[HTTP-REQUEST] POST /api/pedidos/enviar-facturar-multiples recibido para habitaciones: ${habitacionesIds}, prefijo: ${prefijo || 'default'}`);
        if (!habitacionesIds || !Array.isArray(habitacionesIds) || habitacionesIds.length === 0) {
            return res.status(400).json({ error: 'Debe proporcionar una lista de IDs de habitaciones' });
        }

        try {
            const finalNit = nit || clienteNit ? String(nit || clienteNit).trim() : undefined;
            const finalNom = nombreCliente || clienteNom ? String(nombreCliente || clienteNom).trim() : undefined;

            const resultado = await PedidoService.enviarAFacturarMultiples(
                habitacionesIds.map(String),
                formaPagoId ? parseInt(String(formaPagoId), 10) : undefined,
                prefijo ? String(prefijo).trim() : undefined,
                pagos,
                observaciones ? String(observaciones).trim() : undefined,
                finalNit,
                finalNom
            );
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.enviarAFacturarMultiples:', error.message);
            res.status(500).json({ error: error.message || 'Error al procesar factura consolidada de habitaciones' });
        }
    }

    // POST /api/pedidos/facturar-directo
    static async facturarDirecto(req: Request, res: Response) {
        const { clienteNit, clienteNom, items, formaPagoId, prefijo, pagos, observaciones, requestId } = req.body;
        console.log(`[HTTP-REQUEST] POST /api/pedidos/facturar-directo recibido para cliente: ${clienteNit || 'General'}, items: ${items?.length || 0}, prefijo: ${prefijo || 'default'}, requestId: ${requestId || 'none'}`);
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
                observaciones ? String(observaciones).trim() : undefined,
                requestId ? String(requestId).trim() : undefined
            );
            console.log(`[HTTP-RESPONSE] POST /api/pedidos/facturar-directo completado exitosamente:`, resultado);
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.facturarDirecto:', error.message);
            res.status(400).json({ error: error.message || 'Error al facturar productos' });
        }
    }

    // GET /api/pedidos/verificar-reciente
    static async verificarFacturaReciente(req: Request, res: Response) {
        const { clienteNit, total, requestId } = req.query;
        try {
            const resultado = await PedidoService.verificarFacturaReciente(
                clienteNit ? String(clienteNit).trim() : undefined,
                total ? parseFloat(String(total)) : undefined,
                requestId ? String(requestId).trim() : undefined
            );
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.verificarFacturaReciente:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/pedidos/agregar-item
    static async agregarConsumo(req: Request, res: Response) {
        const { habitacionId, item, peweId } = req.body;
        if (!habitacionId || !item || !item.descripcion) {
            return res.status(400).json({ error: 'habitacionId y datos del item son requeridos' });
        }

        const precioVal = parseFloat(String(item.precio || 0));
        if (isNaN(precioVal) || precioVal <= 0) {
            return res.status(400).json({ error: 'No se puede ingresar ni guardar un producto con precio en cero ($0).' });
        }

        try {
            const parsedPeweId = peweId ? parseInt(String(peweId), 10) : undefined;
            const resultado = await PedidoService.agregarConsumo(String(habitacionId), item, parsedPeweId);
            res.json(resultado);
        } catch (error: any) {
            console.error('Error en PedidoController.agregarConsumo:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/reportes/pedidos
    static async getReporte(req: Request, res: Response) {
        const { fechaDesde, fechaHasta, subHuesped } = req.query;
        try {
            const reporte = await PedidoService.getReportePedidos(
                fechaDesde ? String(fechaDesde) : undefined,
                fechaHasta ? String(fechaHasta) : undefined,
                subHuesped ? String(subHuesped) : undefined
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
