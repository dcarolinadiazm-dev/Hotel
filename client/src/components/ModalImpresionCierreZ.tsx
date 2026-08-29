import React from 'react';

export interface ResumenCierreZData {
  turno: {
    idTurno: number;
    usuario: string;
    fechaApertura: string;
    base: number;
    estado: string;
    observacionesApertura?: string;
  };
  fechaCierre: string;
  pagosPorForma: Array<{
    formaPagoId: number;
    nombreForma: string;
    total: number;
    cantidadTransacciones: number;
  }>;
  totalVentasFacturadas: number;
  totalRecaudadoPagos: number;
  totalEfectivoEsperado: number;
  facturasGeneradas: Array<{
    prefijo: string;
    facturaInicial: number;
    facturaFinal: number;
    cantidad: number;
    total: number;
  }>;
  totalesHabitaciones: {
    disponibles: number;
    ocupadas: number;
    reservadas: number;
    inhabilitadas: number;
  };
  observaciones?: string;
}

interface ModalImpresionCierreZProps {
  data: ResumenCierreZData;
  onClose: () => void;
}

export const ModalImpresionCierreZ: React.FC<ModalImpresionCierreZProps> = ({
  data,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formatFecha = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="pos-print-backdrop">
      <div className="pos-print-modal-container">
        {/* Barra de Acciones Superior */}
        <div className="pos-print-actions no-print">
          <div className="pos-print-title-area">
            <span className="pos-print-badge-tipo" style={{ background: '#7c3aed' }}>
              REPORTE CIERRE Z
            </span>
            <span className="pos-print-doc-num">TURNO #{data.turno.idTurno}</span>
          </div>
          <div className="pos-print-btn-group">
            <button type="button" className="btn-pos-print" onClick={handlePrint}>
              🖨️ Imprimir Cierre Z
            </button>
            <button type="button" className="btn-pos-close" onClick={onClose}>
              🚪 Salir
            </button>
          </div>
        </div>

        {/* Formato de Tirilla Térmica POS 80mm */}
        <div className="pos-ticket-wrapper" id="pos-ticket-cierre-z">
          {/* Encabezado Hotel */}
          <div className="pos-ticket-header">
            <h2 className="pos-hotel-name">HOTEL & SUITES</h2>
            <p className="pos-hotel-nit">NIT: 900.123.456-7</p>
            <p className="pos-hotel-dir">Av. Principal # 12-34 · Recepción</p>
            <div className="pos-ticket-divider-double" />
            <h3 className="pos-doc-title" style={{ fontSize: '15px', fontWeight: 800 }}>
              REPORTE DE CIERRE Z
            </h3>
            <p className="pos-doc-prefijo-num" style={{ fontSize: '13px', fontWeight: 700 }}>
              TURNO #{data.turno.idTurno}
            </p>
            <div className="pos-ticket-divider-dashed" />
          </div>

          {/* Datos del Turno */}
          <div className="pos-meta-grid">
            <div className="pos-meta-row">
              <span className="pos-meta-label">Cajero/Usuario:</span>
              <span className="pos-meta-val" style={{ fontWeight: 700 }}>
                {data.turno.usuario}
              </span>
            </div>
            <div className="pos-meta-row">
              <span className="pos-meta-label">Apertura:</span>
              <span className="pos-meta-val">{formatFecha(data.turno.fechaApertura)}</span>
            </div>
            <div className="pos-meta-row">
              <span className="pos-meta-label">Cierre:</span>
              <span className="pos-meta-val">{formatFecha(data.fechaCierre)}</span>
            </div>
          </div>

          <div className="pos-ticket-divider-solid" />

          {/* Resumen de Valores de Caja */}
          <div style={{ padding: '6px 0' }}>
            <div className="pos-meta-row" style={{ fontSize: '13px' }}>
              <span style={{ fontWeight: 700 }}>BASE INICIAL:</span>
              <span style={{ fontWeight: 800 }}>${data.turno.base.toLocaleString('es-CO')}</span>
            </div>
            <div className="pos-meta-row" style={{ fontSize: '13px' }}>
              <span style={{ fontWeight: 700 }}>TOTAL FACTURADO:</span>
              <span style={{ fontWeight: 800 }}>${data.totalVentasFacturadas.toLocaleString('es-CO')}</span>
            </div>
            <div className="pos-meta-row" style={{ fontSize: '13px' }}>
              <span style={{ fontWeight: 700 }}>TOTAL RECAUDOS:</span>
              <span style={{ fontWeight: 800 }}>${data.totalRecaudadoPagos.toLocaleString('es-CO')}</span>
            </div>
            <div className="pos-ticket-divider-dashed" />
            <div className="pos-meta-row" style={{ fontSize: '14px', background: '#f3f4f6', padding: '4px 6px', borderRadius: '4px' }}>
              <span style={{ fontWeight: 800 }}>EFECTIVO ESPERADO:</span>
              <span style={{ fontWeight: 800, color: '#047857' }}>
                ${data.totalEfectivoEsperado.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          <div className="pos-ticket-divider-double" />

          {/* Desglose de Formas de Pago */}
          <div style={{ margin: '8px 0' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DESGLOSE POR FORMAS DE PAGO
            </h4>
            <table className="pos-items-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '55%' }}>Forma de Pago</th>
                  <th style={{ textAlign: 'center', width: '15%' }}>Tx</th>
                  <th style={{ textAlign: 'right', width: '30%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.pagosPorForma.map((p) => (
                  <tr key={p.formaPagoId}>
                    <td style={{ textAlign: 'left', fontWeight: 600 }}>{p.nombreForma}</td>
                    <td style={{ textAlign: 'center' }}>{p.cantidadTransacciones}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      ${p.total.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pos-ticket-divider-solid" />

          {/* Rango de Facturas Emitidas */}
          <div style={{ margin: '8px 0' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              FACTURACIÓN EMITIDA
            </h4>
            {data.facturasGeneradas && data.facturasGeneradas.length > 0 ? (
              <table className="pos-items-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '25%' }}>Pref</th>
                    <th style={{ textAlign: 'left', width: '40%' }}>Rango</th>
                    <th style={{ textAlign: 'center', width: '10%' }}>Cant</th>
                    <th style={{ textAlign: 'right', width: '25%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.facturasGeneradas.map((f, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{f.prefijo}</td>
                      <td style={{ textAlign: 'left' }}>
                        #{f.facturaInicial} - #{f.facturaFinal}
                      </td>
                      <td style={{ textAlign: 'center' }}>{f.cantidad}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        ${f.total.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: '11px', textAlign: 'center', fontStyle: 'italic', margin: '4px 0' }}>
                No se generaron facturas en este turno.
              </p>
            )}
          </div>

          <div className="pos-ticket-divider-solid" />

          {/* Estado de Habitaciones al Cierre */}
          <div style={{ margin: '8px 0' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ESTADO DE HABITACIONES
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
              <div>🟢 Disponibles: <b>{data.totalesHabitaciones.disponibles}</b></div>
              <div>🔴 Ocupadas: <b>{data.totalesHabitaciones.ocupadas}</b></div>
              <div>🟡 Reservadas: <b>{data.totalesHabitaciones.reservadas}</b></div>
              <div>⚫ Inhabilitadas: <b>{data.totalesHabitaciones.inhabilitadas}</b></div>
            </div>
          </div>

          {data.observaciones && (
            <>
              <div className="pos-ticket-divider-dashed" />
              <div style={{ margin: '6px 0', fontSize: '11px' }}>
                <span style={{ fontWeight: 700 }}>OBSERVACIONES DE ENTREGA:</span>
                <p style={{ margin: '2px 0 0 0', fontStyle: 'italic' }}>{data.observaciones}</p>
              </div>
            </>
          )}

          <div className="pos-ticket-divider-double" />

          {/* Firmas de Auditoría */}
          <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
            <div>
              <div style={{ borderTop: '1px solid #111', width: '80%', margin: '0 auto 4px auto' }} />
              <p style={{ textAlign: 'center', margin: 0, fontSize: '11px', fontWeight: 700 }}>
                FIRMA CAJERO / ENTREGA
              </p>
              <p style={{ textAlign: 'center', margin: 0, fontSize: '10px', opacity: 0.8 }}>
                {data.turno.usuario}
              </p>
            </div>
            <div>
              <div style={{ borderTop: '1px solid #111', width: '80%', margin: '0 auto 4px auto' }} />
              <p style={{ textAlign: 'center', margin: 0, fontSize: '11px', fontWeight: 700 }}>
                FIRMA RECIBIDO / AUDITORÍA
              </p>
            </div>
          </div>

          <div className="pos-ticket-footer" style={{ marginTop: '16px' }}>
            <p className="pos-software-brand">SYSplus ERP · Control de Turnos</p>
          </div>
        </div>
      </div>
    </div>
  );
};
