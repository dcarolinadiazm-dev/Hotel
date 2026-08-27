import { db } from '../config/knex.config';

export interface ClienteCartera {
  nit: string;
  nombre: string;
  telefono: string;
  celular: string;
  email: string;
  ciudad: string;
  zona: string;
  cobrador: string;
  cantDocumentos: number;
  saldo: number;
  rtfte: number;
  rtiva: number;
  rtica: number;
  cupo: number;
  disponible: number;
  radicada: number;
  sinRadicar: number;
  estado: string;
  diasCredito: number;
}

export class CarteraService {
  static async getReporteCartera(fechaCorteStr?: string, filtroNit?: string, filtroNombre?: string) {
    let fechaCorte = new Date();
    if (fechaCorteStr) {
      const parts = fechaCorteStr.split('-');
      if (parts.length === 3) {
        fechaCorte = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        const d = new Date(fechaCorteStr);
        if (!isNaN(d.getTime())) fechaCorte = d;
      }
    }

    const cleanStr = (s?: any) => {
      if (!s) return '';
      let str = String(s).trim();
      // Corregir codificaciones comunes de Firebird
      str = str
        .replace(/BOGOT[\ufffd\?]?\s*-\s*Bogot[\ufffd\?]?\s*D\.C/gi, 'BOGOTÁ - Bogotá D.C')
        .replace(/MEDELLN/gi, 'MEDELLÍN')
        .replace(/[\ufffd]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return str;
    };

    let rawRows: any[] = [];
    try {
      const res = await db.raw(
        'SELECT * FROM REP_CARTERA_CONSOLIDADA(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['', 'zz', '', 'zz', 0, 999999999, fechaCorte, 'N', 'N', 0, 0, 'N', 0]
      );
      rawRows = res.rows ? res.rows : (Array.isArray(res) ? res : [res]);
    } catch (err: any) {
      console.error('Error ejecutando REP_CARTERA_CONSOLIDADA:', err.message);
      throw new Error(`Error al consultar cartera en base de datos: ${err.message}`);
    }

    let clientes: ClienteCartera[] = (rawRows || [])
      .filter((r: any) => r && (r.NIT || r.NOMBRE))
      .map((r: any) => {
        const saldo = parseFloat(String(r.SALDO || '0'));
        const cupo = parseFloat(String(r.CUPO || '0'));
        const disponible = parseFloat(String(r.DISPONIBLE || '0'));
        const rtfte = parseFloat(String(r.RTFTE || '0'));
        const rtiva = parseFloat(String(r.RTIVA || '0'));
        const rtica = parseFloat(String(r.RTICA || '0'));
        const radicada = parseFloat(String(r.RADICADA || '0'));
        const sinRadicar = parseFloat(String(r.SINRADICAR || '0'));
        const cant = parseInt(String(r.CANT || '0'), 10);
        const dias = parseInt(String(r.DIAS ?? r.DIASCR ?? '0'), 10);

        return {
          nit: cleanStr(r.NIT),
          nombre: cleanStr(r.NOMBRE),
          telefono: cleanStr(r.TELEFONO),
          celular: cleanStr(r.CEL),
          email: cleanStr(r.EMAIL || r.MAILCART),
          ciudad: cleanStr(r.NOMCIUD || r.CIUDAD),
          zona: cleanStr(r.NOMZONA),
          cobrador: cleanStr(r.NOMCOBR),
          cantDocumentos: cant,
          saldo,
          rtfte,
          rtiva,
          rtica,
          cupo,
          disponible,
          radicada,
          sinRadicar,
          estado: cleanStr(r.ESTADO) === 'A' ? 'Activo' : 'Inactivo',
          diasCredito: dias
        };
      });

    // Filtros opcionales en servidor si fueron proporcionados
    if (filtroNit && filtroNit.trim()) {
      const qNit = filtroNit.trim().toLowerCase();
      clientes = clientes.filter((c) => c.nit.toLowerCase().includes(qNit));
    }
    if (filtroNombre && filtroNombre.trim()) {
      const qNom = filtroNombre.trim().toLowerCase();
      clientes = clientes.filter((c) => c.nombre.toLowerCase().includes(qNom));
    }

    const totalSaldo = clientes.reduce((acc, c) => acc + (c.saldo || 0), 0);
    const totalCupo = clientes.reduce((acc, c) => acc + (c.cupo || 0), 0);
    const totalDisponible = clientes.reduce((acc, c) => acc + (c.disponible || 0), 0);
    const totalDocumentos = clientes.reduce((acc, c) => acc + (c.cantDocumentos || 0), 0);
    const totalClientesConSaldo = clientes.filter((c) => c.saldo > 0).length;

    return {
      fechaCorte: fechaCorte.toISOString().split('T')[0],
      fechaCorteTexto: fechaCorte.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      clientes,
      totales: {
        totalClientes: clientes.length,
        totalClientesConSaldo,
        totalDocumentos,
        totalSaldo,
        totalCupo,
        totalDisponible
      }
    };
  }
}
