/**
 * Modal moderno y estilizado para avisos de inventario
 */
export const showModernStockModal = (
  artiCod: string,
  descripcion: string,
  stock: number
): Promise<void> => {
  return new Promise((resolve) => {
    // Evitar duplicados si ya hay un modal abierto
    const existing = document.getElementById('stock-warning-modal-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'stock-warning-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity 0.25s ease;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #ffffff;
      width: 100%;
      max-width: 480px;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8);
      overflow: hidden;
      transform: scale(0.92) translateY(12px);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
      display: flex;
      flex-direction: column;
    `;

    modal.innerHTML = `
      <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 24px 24px 20px; border-bottom: 1px solid #fde68a; display: flex; align-items: flex-start; gap: 16px;">
        <div style="width: 50px; height: 50px; border-radius: 14px; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.35);">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 9999px; background: #fef3c7; border: 1px solid #fcd34d; font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            ⚠️ Control de Inventario
          </div>
          <h3 style="margin: 0; font-size: 19px; font-weight: 800; color: #1e293b; line-height: 1.25;">
            Artículo sin Existencias
          </h3>
          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
            Validación en tiempo real con bodega
          </p>
        </div>
      </div>

      <div style="padding: 22px 24px; display: flex; flex-direction: column; gap: 14px;">
        <!-- Tarjeta del Producto -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.35; margin-bottom: 8px;">
            ${descripcion}
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="display: inline-flex; align-items: center; padding: 3px 9px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; font-family: monospace;">
              Cód: ${artiCod}
            </span>
            <span style="display: inline-flex; align-items: center; padding: 3px 10px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; font-size: 12px; font-weight: 700; color: #b91c1c;">
              Existencia actual: ${stock}
            </span>
          </div>
        </div>

        <!-- Banner de Advertencia de Facturación -->
        <div style="background: #fff7ed; border-left: 4px solid #f97316; border-radius: 10px; padding: 12px 14px; display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 18px; line-height: 1; flex-shrink: 0;">🚫</span>
          <div style="font-size: 13px; color: #9a3412; line-height: 1.45;">
            <strong>Restricción para facturar:</strong> El artículo se agregará al pedido, pero al momento de facturar el sistema <strong>no le permitirá generar la factura</strong> si no cuenta con existencias.
          </div>
        </div>

        <div style="font-size: 12.5px; color: #64748b; line-height: 1.4; display: flex; align-items: center; gap: 6px;">
          <span>💡</span>
          <span>Por favor recuerde registrar la entrada de este producto en el módulo de inventarios.</span>
        </div>
      </div>

      <div style="padding: 14px 24px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
        <button id="swm-continue-btn" type="button" style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 22px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 16px -4px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
          width: 100%;
        ">
          <span>Entendido, continuar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animación de entrada
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1) translateY(0)';
    });

    const close = () => {
      overlay.style.opacity = '0';
      modal.style.transform = 'scale(0.94) translateY(8px)';
      document.removeEventListener('keydown', onKeyDown);
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 200);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    const btn = modal.querySelector('#swm-continue-btn') as HTMLButtonElement | null;
    if (btn) {
      btn.addEventListener('click', close);
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 12px 20px -4px rgba(37, 99, 235, 0.45)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 8px 16px -4px rgba(37, 99, 235, 0.35)';
      });
      // Auto-enfoque al botón para confirmación inmediata con Enter o Barra espaciadora
      setTimeout(() => btn.focus(), 50);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
  });
};

/**
 * Validador de existencias de artículos mediante el procedimiento EXISTENCIAS_UNIDAD_BOD
 * 
 * Si la existencia es <= 0, muestra un modal moderno al usuario indicándole
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
        // Mostrar modal moderno y estilizado en vez del alert() nativo clásico
        await showModernStockModal(artiCod.trim(), descripcion.trim(), stock);
        return { existencia: stock, hasStock: false };
      }

      return { existencia: stock, hasStock: true };
    }
  } catch (err) {
    console.warn('Aviso verificando existencias de artículo:', err);
  }

  return { existencia: 0, hasStock: true };
};
