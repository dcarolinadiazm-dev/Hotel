/**
 * Validador de existencias de artículos mediante el procedimiento EXISTENCIAS_UNIDAD_BOD
 * 
 * Si la existencia es <= 0, muestra una alerta informativa al usuario indicándole
 * que no hay existencias y que al momento de facturar no le va a permitir.
 * Luego de cerrar la alerta, permite continuar agregando el producto con normalidad.
 */
export const checkArticleStockAndAlert = async (
  artiCod: string,
  descripcion: string,
  unidad?: string
): Promise<{ existencia: number; hasStock: boolean }> => {
  if (!artiCod || !artiCod.trim()) {
    return { existencia: 0, hasStock: true };
  }

  // Ignorar artículos de control interno que empiezan por punto
  if (artiCod.trim().startsWith('.')) {
    return { existencia: 0, hasStock: true };
  }

  try {
    const token = localStorage.getItem('hotel_token');
    const res = await fetch(
      `/api/articulos/existencia?artiCod=${encodeURIComponent(artiCod.trim())}${
        unidad ? `&unidad=${encodeURIComponent(unidad.trim())}` : ''
      }`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const stock = Number(data.existencia) || 0;

      if (stock <= 0) {
        alert(
          `⚠️ AVISO DE INVENTARIO:\n\n` +
          `El artículo "${descripcion.trim()}" (${artiCod.trim()}) NO tiene existencias disponibles en la bodega (Existencia actual: ${stock}).\n\n` +
          `Tenga en cuenta que al momento de facturar, el sistema no le va a permitir generar la factura si no cuenta con existencias.\n\n` +
          `Por favor recuerde ingresar la existencia correspondiente en el módulo de inventarios.`
        );
        return { existencia: stock, hasStock: false };
      }

      return { existencia: stock, hasStock: true };
    }
  } catch (err) {
    console.warn('Aviso verificando existencias de artículo:', err);
  }

  return { existencia: 0, hasStock: true };
};
