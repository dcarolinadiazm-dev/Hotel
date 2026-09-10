import { useState, useEffect, useRef } from 'react';
import type { Habitacion } from './Habitaciones';
import { ModalAbonos } from './ModalAbonos';
import { ModalImpresionPOS } from './ModalImpresionPOS';
import { ClienteSearchSelect } from './ClienteSearchSelect';


interface Tercero {
  nit: string;
  nombre: string;
  telefono?: string;
  celular?: string;
  email?: string;
  direccion?: string;
}

interface ConsumoItem {
  id: number;
  articulo: string;
  unidad: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface ArticuloPrecio {
  liprCod: number;
  listaNombre: string;
  precio: number;
  esPredeterminada?: boolean;
}

interface ArticuloCatalogo {
  codigo: string;
  descripcion: string;
  precio: number;
  unidad: string;
  taivCod?: number;
  ivaPorc?: number;
  codigosBarra?: string[];
  precios?: ArticuloPrecio[];
}

interface ListaPrecioItem {
  liprCod: number;
  nombre: string;
  esPredeterminada: boolean;
}



export interface MovimientoReserva {
  idMovim: number;
  dinwId?: number;
  huesped?: string;
  documento?: string;
  observaciones?: string;
  fechaReserva?: string;
  fechaSalida?: string;
  precioNoche?: number;
  descuento?: number;
  dtoPorc?: number;
  liprCod?: number;
  items?: ConsumoItem[];
  totalPagar?: number;
  totalAbonos?: number;
}

interface ModalHabitacionProps {
  habitacion: Habitacion;
  onClose: () => void;
  onGoToCart?: (habitacion: Habitacion) => void;
  onHabitacionUpdated?: () => void;
}

export const ModalHabitacion = ({
  habitacion,
  onClose,
  onHabitacionUpdated,
}: ModalHabitacionProps) => {
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [searchArticuloText, setSearchArticuloText] = useState<string>('');
  const [items, setItems] = useState<ConsumoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => {
        setActionFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Múltiples reservas de la habitación
  const [movimientos, setMovimientos] = useState<MovimientoReserva[]>([]);
  const [selectedMovimId, setSelectedMovimId] = useState<number | 'NUEVA' | null>(null);
  const [defaultRoomPrecio, setDefaultRoomPrecio] = useState<number>(0);

  // Campos editables de la reserva activa / seleccionada
  const [estado, setEstado] = useState<string>(habitacion.estado || 'Disponible');
  const [roomArtiCod, setRoomArtiCod] = useState<string>(habitacion.artiCod || '');
  const [peweId, setPeweId] = useState<number | undefined>(habitacion.peweId);
  const [huesped, setHuesped] = useState<string>('');
  const [documento, setDocumento] = useState<string>('');
  const [fechaReserva, setFechaReserva] = useState<string>('');
  const [fechaSalida, setFechaSalida] = useState<string>('');
  const [precioNoche, setPrecioNoche] = useState<number | string>(0);
  const [descuentoNoche, setDescuentoNoche] = useState<number | string>(0);
  const [caracteristicas, setCaracteristicas] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [totalAbonos, setTotalAbonos] = useState<number>(0);


  // Formulario para agregar producto al carrito de la habitación
  const [listasPrecios, setListasPrecios] = useState<ListaPrecioItem[]>([]);
  const [formasPago, setFormasPago] = useState<{ id: number; nombre: string }[]>([]);
  const [prefijosFactura, setPrefijosFactura] = useState<Array<{ prefijo: string; actual: string; activo: boolean; ivaInc: boolean }>>([]);
  const [selectedPrefijo, setSelectedPrefijo] = useState<string>('SETT');
  const [lineasPago, setLineasPago] = useState<Array<{ id: number; formaPagoId: number; monto: number }>>([]);
  const [impresionData, setImpresionData] = useState<{ tipo: 'FACTURA' | 'REMISION'; idDoc: number } | null>(null);
  const [roomLiprCod, setRoomLiprCod] = useState<number>(1);
  const [selectedLiprCod, setSelectedLiprCod] = useState<number>(1);
  const [selectedArticuloCod, setSelectedArticuloCod] = useState('');
  const [customDescripcion, setCustomDescripcion] = useState('');
  const [customPrecio, setCustomPrecio] = useState<number | string>(0);
  const [customCantidad, setCustomCantidad] = useState<number>(1);
  const [customUnidad, setCustomUnidad] = useState('UND');



  // Formulario rápido de nuevo cliente
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [tiposDocumento, setTiposDocumento] = useState<Array<{ cod: string; nombre: string; codShd?: string }>>([
    { cod: 'C', nombre: 'CEDULA CIUDADANIA', codShd: 'CC' },
    { cod: 'D', nombre: 'DOCUMENTO EXTRANJERO', codShd: '' },
    { cod: 'E', nombre: 'CEDULA EXTRANJERIA', codShd: 'CE' },
    { cod: 'F', nombre: 'EXTRANJERO DIFERENTE NIT DIAN', codShd: '' },
    { cod: 'I', nombre: 'CARNE DIPLOMATICO', codShd: '' },
    { cod: 'J', nombre: 'NIT PERSONA JURIDICA', codShd: 'NIT' },
    { cod: 'L', nombre: 'SUCESION ILIQUIDA SIN DOCUMENT', codShd: '' },
    { cod: 'N', nombre: 'NIT PERSONA NATURAL', codShd: 'NIT' },
    { cod: 'O', nombre: 'EXTRANJERO PERSONA JURICA', codShd: '' },
    { cod: 'P', nombre: 'PASAPORTE', codShd: 'PA' },
    { cod: 'Q', nombre: 'SUCESION ILIQUIDA NOTARIA/JUZG', codShd: '' },
    { cod: 'R', nombre: 'REGISTRO CIVIL', codShd: 'RC' },
    { cod: 'S', nombre: 'EXTRANJERO SIN DOCUMENTO', codShd: '' },
    { cod: 'T', nombre: 'TARJETA IDENTIDAD', codShd: 'TI' },
    { cod: 'U', nombre: 'NIUP', codShd: '' },
    { cod: 'V', nombre: 'PERMISO PROTECCION TEMPORAL', codShd: 'PT' },
    { cod: 'X', nombre: 'TARJETA EXTRANJERIA', codShd: '' },
    { cod: 'Z', nombre: 'PERMISO ESPECIAL PERMANENCIA', codShd: 'PE' }
  ]);
  const [newTipoDoc, setNewTipoDoc] = useState('C');
  const [newNit, setNewNit] = useState('');
  const [newDv, setNewDv] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newApellido1, setNewApellido1] = useState('');
  const [newApellido2, setNewApellido2] = useState('');
  const [newNombre1, setNewNombre1] = useState('');
  const [newNombre2, setNewNombre2] = useState('');
  const [newCelular, setNewCelular] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [ciudades, setCiudades] = useState<Array<{ cod: string; nom: string; dpto?: string }>>([
    { cod: '05001', nom: 'MEDELLIN', dpto: 'ANTIOQUIA' },
    { cod: '11001', nom: 'BOGOTA D.C.', dpto: 'CUNDINAMARCA' },
    { cod: '76001', nom: 'CALI', dpto: 'VALLE DEL CAUCA' },
    { cod: '08001', nom: 'BARRANQUILLA', dpto: 'ATLANTICO' },
    { cod: '13001', nom: 'CARTAGENA', dpto: 'BOLIVAR' },
    { cod: '68001', nom: 'BUCARAMANGA', dpto: 'SANTANDER' },
    { cod: '66001', nom: 'PEREIRA', dpto: 'RISARALDA' },
    { cod: '17001', nom: 'MANIZALES', dpto: 'CALDAS' },
    { cod: '63001', nom: 'ARMENIA', dpto: 'QUINDIO' },
    { cod: '54001', nom: 'CUCUTA', dpto: 'NORTE DE SANTANDER' },
    { cod: '41001', nom: 'NEIVA', dpto: 'HUILA' },
    { cod: '73001', nom: 'IBAGUE', dpto: 'TOLIMA' },
    { cod: '50001', nom: 'VILLAVICENCIO', dpto: 'META' },
    { cod: '20001', nom: 'VALLEDUPAR', dpto: 'CESAR' },
    { cod: '23001', nom: 'MONTERIA', dpto: 'CORDOBA' },
    { cod: '47001', nom: 'SANTA MARTA', dpto: 'MAGDALENA' },
    { cod: '52001', nom: 'PASTO', dpto: 'NARINO' },
    { cod: '19001', nom: 'POPAYAN', dpto: 'CAUCA' }
  ]);
  const [newCodCiu, setNewCodCiu] = useState('05001');
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Cálculo del dígito de verificación DIAN
  const calculaDigitoVerificacion = (nit: string): string => {
    const cleanNit = nit.trim();
    if (cleanNit && !isNaN(Number(cleanNit))) {
      const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
      let suma = 0;
      const nitString = cleanNit.toString();

      for (let i = 0; i < nitString.length; i++) {
        suma += parseInt(nitString.charAt(nitString.length - 1 - i), 10) * pesos[i];
      }

      const residuo = suma % 11;
      const dv = residuo > 1 ? 11 - residuo : residuo;
      return String(dv);
    }
    return '';
  };

  const handleNitChange = (val: string) => {
    setNewNit(val);
    const tipo = newTipoDoc?.trim().toUpperCase();
    if (tipo === 'J' || tipo === 'N') {
      setNewDv(calculaDigitoVerificacion(val));
    } else {
      setNewDv('');
    }
  };

  // Helper para obtener fecha y hora actual en formato 'YYYY-MM-DDTHH:mm'
  const getCurrentDatetimeLocal = (offsetHours = 0): string => {
    const now = new Date();
    if (offsetHours !== 0) {
      now.setHours(now.getHours() + offsetHours);
    }
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  };

  // Helper para obtener fecha de salida por defecto con hora 13:00 (1:00 PM)
  const getDefaultFechaSalida = (baseDateStr?: string, daysAhead = 1): string => {
    let d: Date;
    if (baseDateStr && baseDateStr.trim()) {
      const parsed = new Date(baseDateStr);
      d = !isNaN(parsed.getTime()) ? parsed : new Date();
    } else {
      d = new Date();
    }
    d.setDate(d.getDate() + daysAhead);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T13:00`;
  };

  // Helper para convertir cualquier formato de fecha a 'YYYY-MM-DDTHH:mm' para input datetime-local
  const toDatetimeLocal = (val?: string): string => {
    if (!val || val.trim() === '') return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      return val.substring(0, 16);
    }
    const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(a\.\s*m\.|p\.\s*m\.|am|pm|m\.))?)?/i);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      let hours = parseInt(match[4] || '08', 10);
      const mins = (match[5] || '00').padStart(2, '0');
      const meridian = (match[6] || '').toLowerCase().replace(/\s+/g, '');

      if ((meridian.includes('pm') || meridian.includes('p.m.')) && hours < 12) {
        hours += 12;
      } else if ((meridian.includes('am') || meridian.includes('a.m.')) && hours === 12) {
        hours = 0;
      }
      return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${mins}`;
    }

    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}`;
    }
    return '';
  };

  const calculateDiasEstadia = (entradaStr: string, salidaStr: string): number => {

    if (!entradaStr || !salidaStr) return 1;
    const d1 = new Date(entradaStr);
    const d2 = new Date(salidaStr);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;

    const d1Cal = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const d2Cal = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    const diffDays = Math.round((d2Cal.getTime() - d1Cal.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const cargarMovimientoEnFormulario = (m: MovimientoReserva) => {
    setSelectedMovimId(m.idMovim);
    setPeweId(m.dinwId);
    setHuesped(m.huesped || '');
    setDocumento(m.documento || '');
    setObservaciones(m.observaciones || m.huesped || '');
    const fResLocal = toDatetimeLocal(m.fechaReserva) || getCurrentDatetimeLocal(0);
    const fSalLocal = toDatetimeLocal(m.fechaSalida) || getDefaultFechaSalida(m.fechaReserva, 1);
    setFechaReserva(fResLocal);
    setFechaSalida(fSalLocal);
    setPrecioNoche(m.precioNoche || defaultRoomPrecio || 0);
    setDescuentoNoche(m.descuento || 0);
    if (m.liprCod) {
      setRoomLiprCod(m.liprCod);
    }
    setItems(m.items || []);
    if (m.totalAbonos !== undefined && m.totalAbonos !== null) {
      setTotalAbonos(m.totalAbonos);
    } else {
      refreshAbonosTotal(m.documento, m.idMovim);
    }

    // Si la reserva inicia en fecha futura (> hoy), el estado debe ser 'Reservada'
    // Si inicia hoy o en el pasado, el estado es 'Ocupada'
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fResDate = String(m.fechaReserva || '').split('T')[0];

    if (fResDate && fResDate > todayStr) {
      setEstado('Reservada');
    } else if (fResDate && fResDate <= todayStr) {
      setEstado('Ocupada');
    } else {
      setEstado('Reservada');
    }
  };

  const iniciarNuevaReserva = () => {
    setSelectedMovimId('NUEVA');
    setPeweId(undefined);
    setHuesped('');
    setDocumento('');
    setObservaciones('');
    setFechaReserva(getCurrentDatetimeLocal(0));
    setFechaSalida(getDefaultFechaSalida(undefined, 1));
    setPrecioNoche(defaultRoomPrecio || 0);
    setDescuentoNoche(0);
    setItems([]);
    setTotalAbonos(0);
    setEstado('Reservada');
  };

  const refreshAbonosTotal = (docNit?: string, movId?: number | 'NUEVA') => {
    const token = localStorage.getItem('hotel_token');
    const nitParam = docNit !== undefined ? docNit : documento;
    const activeMovId = movId !== undefined ? movId : selectedMovimId;
    const queryParams: string[] = [];
    if (nitParam && nitParam.trim()) queryParams.push(`nit=${encodeURIComponent(nitParam.trim())}`);
    if (activeMovId && activeMovId !== 'NUEVA') queryParams.push(`idMovim=${activeMovId}`);
    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    return fetch(`/api/abonos/habitacion/${habitacion.id}${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const val = data.totalAbonado || 0;
        setTotalAbonos(val);
        return val;
      })
      .catch((err) => {
        console.error('Error al cargar total de abonos:', err);
        return 0;
      });
  };

  const fetchRoomDetails = (preferredMovimId?: number) => {
    const token = localStorage.getItem('hotel_token');
    const fetchHab = fetch(`/api/habitaciones/${habitacion.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setEstado(data.estado || habitacion.estado || 'Disponible');
        setRoomArtiCod(data.artiCod || habitacion.artiCod || '');
        setCaracteristicas(data.caracteristicas || 'Cama Doble, Aire Acondicionado, Wi-Fi');
        setObservaciones(data.observaciones || '');
        if (data.precioNoche) setDefaultRoomPrecio(data.precioNoche);

        const movs: MovimientoReserva[] = data.movimientos || [];
        setMovimientos(movs);

        if (movs.length > 0) {
          const targetId = preferredMovimId ?? (selectedMovimId !== 'NUEVA' ? selectedMovimId : undefined);
          let target = targetId ? movs.find((m) => m.idMovim === targetId) : undefined;
          if (!target) {
            target = (data.peweId ? movs.find((m) => m.dinwId === data.peweId) : null) || movs[movs.length - 1] || movs[0];
          }
          if (target) {
            cargarMovimientoEnFormulario(target);
          }
        } else {
          iniciarNuevaReserva();
          setPrecioNoche(data.precioNoche || 0);
        }
        return data;
      });

    const fetchAbonosTotal = refreshAbonosTotal();

    return Promise.all([fetchHab, fetchAbonosTotal]);
  };



  const fetchTerceros = () => {
    const token = localStorage.getItem('hotel_token');
    fetch('/api/terceros/tipos-documento', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTiposDocumento(data);
          setNewTipoDoc((prev) => prev || data[0].cod);
        }
      })
      .catch((err) => console.error('Error al cargar tipos de documento:', err));

    fetch('/api/terceros/ciudades', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCiudades(data);
          setNewCodCiu((prev) => prev || data[0].cod);
        }
      })
      .catch((err) => console.error('Error al cargar ciudades:', err));

    return fetch('/api/terceros', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTerceros(data);
      })
      .catch((err) => console.error('Error al cargar terceros:', err));
  };

  const fetchArticulos = () => {
    const token = localStorage.getItem('hotel_token');
    return Promise.all([
      fetch('/api/articulos?excluirGrupo=SER', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/articulos/listas-precios', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([artData, listasData]) => {
        if (Array.isArray(artData)) setArticulos(artData);
        if (Array.isArray(listasData)) {
          setListasPrecios(listasData);
          const defaultL = listasData.find((l: ListaPrecioItem) => l.esPredeterminada);
          if (defaultL) {
            setSelectedLiprCod(defaultL.liprCod);
            setRoomLiprCod((prev) => prev || defaultL.liprCod);
          }
        }
      })
      .catch((err) => console.error('Error al cargar artículos o listas:', err));
  };

  const fetchFormasPago = () => {
    const token = localStorage.getItem('hotel_token');
    return fetch('/api/abonos/formas-pago', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.formasPago || []);
        if (Array.isArray(list) && list.length > 0) {
          setFormasPago(list);
        }
      })
      .catch((err) => console.error('Error al cargar formas de pago:', err));
  };

  const fetchPrefijosFactura = () => {
    const token = localStorage.getItem('hotel_token');
    return fetch('/api/pedidos/prefijos-factura', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPrefijosFactura(data);
          const active = data.find((p: any) => p.activo);
          setSelectedPrefijo(active ? active.prefijo : data[0].prefijo);
        }
      })
      .catch((err) => console.error('Error al cargar prefijos de factura:', err));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchRoomDetails(),
      fetchTerceros(),
      fetchArticulos(),
      fetchFormasPago(),
      fetchPrefijosFactura(),
    ]).finally(() => setLoading(false));
  }, [habitacion.id]);

  const handleGrabeTercero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipoDoc || !newTipoDoc.trim()) {
      setClientError('El tipo de documento es obligatorio (*)');
      return;
    }
    if (!newNit || !newNit.trim()) {
      setClientError('El número de documento / Cédula / NIT es obligatorio (*)');
      return;
    }

    const isJuridica = newTipoDoc?.trim().toUpperCase() === 'J';
    const isNit = isJuridica || newTipoDoc?.trim().toUpperCase() === 'N';

    if (isJuridica) {
      if (!newNombre || !newNombre.trim()) {
        setClientError('La razón social / nombre de la empresa es obligatorio (*)');
        return;
      }
    } else {
      if (!newApellido1 || !newApellido1.trim()) {
        setClientError('El 1er. Apellido es obligatorio (*)');
        return;
      }
      if (!newNombre1 || !newNombre1.trim()) {
        setClientError('El 1er. Nombre es obligatorio (*)');
        return;
      }
    }

    if (!newCelular || !newCelular.trim()) {
      setClientError('El celular / teléfono es obligatorio (*)');
      return;
    }
    if (!newEmail || !newEmail.trim()) {
      setClientError('El correo electrónico es obligatorio (*)');
      return;
    }
    if (!newDireccion || !newDireccion.trim()) {
      setClientError('La dirección es obligatoria (*)');
      return;
    }
    if (!newCodCiu || !newCodCiu.trim()) {
      setClientError('La ciudad es obligatoria (*)');
      return;
    }

    setSavingClient(true);
    setClientError(null);
    const token = localStorage.getItem('hotel_token');

    const calculatedName = isJuridica
      ? newNombre.trim()
      : [newApellido1.trim(), newApellido2.trim(), newNombre1.trim(), newNombre2.trim()].filter(Boolean).join(' ').trim();

    const selectedCity = ciudades.find((c) => c.cod === newCodCiu);

    try {
      const res = await fetch('/api/terceros/grabeTercero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tercero: {
            tipoId: newTipoDoc.trim(),
            nit: newNit.trim(),
            dv: isNit ? (newDv || calculaDigitoVerificacion(newNit)) : null,
            nombre: isJuridica ? newNombre.trim() : calculatedName,
            apellido1: !isJuridica ? newApellido1.trim() : undefined,
            apellido2: !isJuridica ? newApellido2.trim() : undefined,
            nombre1: !isJuridica ? newNombre1.trim() : undefined,
            nombre2: !isJuridica ? newNombre2.trim() : undefined,
            cel: newCelular.trim(),
            email: newEmail.trim(),
            dir: newDireccion.trim(),
            codCiu: newCodCiu.trim(),
            nomCiu: selectedCity ? selectedCity.nom : 'MEDELLIN',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al grabar tercero');

      setDocumento(newNit.trim());
      setHuesped(calculatedName);
      await fetchTerceros();

      setNewNit('');
      setNewDv('');
      setNewNombre('');
      setNewApellido1('');
      setNewApellido2('');
      setNewNombre1('');
      setNewNombre2('');
      setNewCelular('');
      setNewEmail('');
      setNewDireccion('');
      setShowNewClientForm(false);
      setActionFeedback({
        type: 'success',
        message: `✅ Cliente "${calculatedName}" registrado exitosamente.`,
      });
    } catch (err: any) {
      setClientError(err.message || 'Error al conectar con el servidor');
    } finally {
      setSavingClient(false);
    }
  };



  const seleccionarArticulo = (found: ArticuloCatalogo, overrideLiprCod?: number) => {
    setSelectedArticuloCod(found.codigo);
    setCustomDescripcion(found.descripcion);
    setCustomUnidad(found.unidad || 'UND');

    const activeLipr = overrideLiprCod !== undefined ? overrideLiprCod : selectedLiprCod;
    const precioObj = found.precios?.find((p) => p.liprCod === activeLipr);

    if (precioObj && precioObj.precio !== undefined) {
      setCustomPrecio(precioObj.precio);
    } else {
      // Si el artículo NO tiene precio asignado en esta lista de precios
      setCustomPrecio(0);
    }
  };

  const handleBarcodeScanOrSearch = async (query: string) => {
    const term = query.trim().toLowerCase();
    if (!term) return;

    // Buscar coincidencia exacta por código de barras o código de artículo
    const match = articulos.find(
      (a) =>
        a.codigo.toLowerCase() === term ||
        (a.codigosBarra && a.codigosBarra.some((b) => b.toLowerCase() === term))
    );

    if (!match) {
      alert(`⚠️ No se encontró ningún producto con el código de barras: "${query.trim()}"`);
      setSearchArticuloText('');
      return;
    }

    // Obtener precio en la lista de precios seleccionada
    const pObj = match.precios?.find((p) => p.liprCod === selectedLiprCod);
    const precioNum = pObj && pObj.precio !== undefined ? Number(pObj.precio) : 0;

    if (precioNum <= 0) {
      setActionFeedback({
        type: 'error',
        message: `⚠️ El producto "${match.descripcion}" (${match.codigo}) no tiene precio asignado en la lista seleccionada o su precio es $0. No se pudo agregar.`,
      });
      setSearchArticuloText('');
      return;
    }

    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch('/api/pedidos/agregar-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionId: habitacion.id,
          item: {
            articuloCod: match.codigo.trim(),
            artiCod: match.codigo.trim(),
            descripcion: match.descripcion.trim(),
            unidad: match.unidad || 'UND',
            cantidad: 1,
            precio: precioNum,
            liprCod: selectedLiprCod,
          },
        }),
      });

      if (res.ok) {
        setSearchArticuloText('');
        setActionFeedback({
          type: 'success',
          message: `⚡ Producto escaneado y agregado: ${match.descripcion} (1 x ${formatMoney(precioNum)})`,
        });
        await fetchRoomDetails();
        if (onHabitacionUpdated) onHabitacionUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionFeedback({
          type: 'error',
          message: data.error || 'Error al agregar producto por código de barras.',
        });
      }
    } catch (err: any) {
      console.error('Error al agregar producto escaneado:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al agregar producto.',
      });
    } finally {
      setSearchArticuloText('');
    }
  };

  const handleArticuloSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    setSelectedArticuloCod(cod);
    const found = articulos.find((a) => a.codigo === cod);
    if (found) {
      seleccionarArticulo(found);
    }
  };

  const handleRoomLiprChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lipr = parseInt(e.target.value, 10);
    setRoomLiprCod(lipr);

    const targetCod = (roomArtiCod || habitacion.artiCod || '').trim();
    if (targetCod) {
      // 1. Intentar buscar en artículos locales si está cargado
      const found = articulos.find((a) => a.codigo.trim() === targetCod);
      if (found && found.precios && found.precios.length > 0) {
        const precioEnLista = found.precios.find((p) => p.liprCod === lipr);
        if (precioEnLista && precioEnLista.precio !== undefined) {
          setPrecioNoche(precioEnLista.precio);
          return;
        }
      }

      // 2. Consultar directamente a la API de Firebird el precio de esa lista
      const token = localStorage.getItem('hotel_token');
      try {
        const res = await fetch(`/api/articulos/precio?artiCod=${encodeURIComponent(targetCod)}&liprCod=${lipr}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.precio !== undefined) {
            setPrecioNoche(data.precio);
          }
        }
      } catch (err) {
        console.error('Error al consultar precio de la habitación en la lista:', err);
      }
    }
  };

  const handleListaPrecioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lipr = parseInt(e.target.value, 10);
    setSelectedLiprCod(lipr);

    const targetCod = (selectedArticuloCod || '').trim();
    if (targetCod) {
      const found = articulos.find((a) => a.codigo.trim() === targetCod);
      if (found) {
        seleccionarArticulo(found, lipr);
      }
    }
  };

  const handleAddProductToCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDescripcion.trim()) {
      alert('Por favor selecciona o escribe la descripción del producto');
      return;
    }

    const precioNum = Number(customPrecio) || 0;
    if (precioNum <= 0) {
      setActionFeedback({
        type: 'error',
        message: '⚠️ No se puede agregar al carrito un producto con precio en cero ($0). Selecciona un artículo con precio o asigna un valor mayor a cero.',
      });
      return;
    }

    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch('/api/pedidos/agregar-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionId: habitacion.id,
          item: {
            articuloCod: selectedArticuloCod ? selectedArticuloCod.trim() : undefined,
            artiCod: selectedArticuloCod ? selectedArticuloCod.trim() : undefined,
            descripcion: customDescripcion.trim(),
            unidad: customUnidad,
            cantidad: customCantidad || 1,
            precio: Number(customPrecio) || 0,
            liprCod: selectedLiprCod,
          },
        }),
      });

      if (res.ok) {
        setSelectedArticuloCod('');
        setCustomDescripcion('');
        setCustomPrecio(0);
        setCustomCantidad(1);
        await fetchRoomDetails();
        if (onHabitacionUpdated) onHabitacionUpdated();
      }
    } catch (err) {
      console.error('Error al agregar producto:', err);
    }
  };

  const handleUpdateCantidad = async (consumoId: number, nuevaCantidad: number) => {
    const targetItem = items.find((it) => it.id === consumoId);
    if (targetItem) {
      const isRoomStayItem = targetItem.id === 1 || targetItem.articulo.toLowerCase().includes('hospedaje') || targetItem.articulo.toLowerCase().includes('habitacion');
      if (isRoomStayItem) {
        alert('⚠️ La cantidad de días/noches del hospedaje de la habitación no se puede modificar manualmente en el carrito. Se calcula automáticamente según la Fecha de Entrada y Salida.');
        return;
      }
    }

    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch(`/api/habitaciones/${habitacion.id}/consumos/${consumoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cantidad: nuevaCantidad }),
      });
      if (res.ok) {
        await fetchRoomDetails();
        if (onHabitacionUpdated) onHabitacionUpdated();
      }
    } catch (err) {
      console.error('Error al actualizar cantidad:', err);
    }
  };

  const handleDeleteItem = async (consumoId: number) => {
    const targetItem = items.find((it) => it.id === consumoId);
    if (targetItem) {
      const isRoomStayItem = targetItem.id === 1 || targetItem.articulo.toLowerCase().includes('hospedaje') || targetItem.articulo.toLowerCase().includes('habitacion');
      if (isRoomStayItem) {
        alert('⚠️ El ítem principal de hospedaje de la habitación no se puede eliminar del carrito.');
        return;
      }
    }

    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch(`/api/habitaciones/${habitacion.id}/consumos/${consumoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchRoomDetails();
        if (onHabitacionUpdated) onHabitacionUpdated();
      }
    } catch (err) {
      console.error('Error al eliminar ítem:', err);
    }
  };

  // Estado del Modal de Confirmación personalizado
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'CANCELAR_RESERVA' | 'FACTURAR' | null;
    title: string;
    message: string;
    details?: string;
    confirmText: string;
    confirmButtonClass: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
    details: '',
    confirmText: 'Confirmar',
    confirmButtonClass: 'btn-confirm-danger',
    onConfirm: () => { },
  });

  const lineasPagoRef = useRef(lineasPago);
  lineasPagoRef.current = lineasPago;
  const selectedPrefijoRef = useRef(selectedPrefijo);
  selectedPrefijoRef.current = selectedPrefijo;

  // Ejecución real de Generar Factura de Venta usando GRABE_DOCUMENTO_INV_WEB
  const executeEnviarAFacturar = async (
    pagosOverride?: Array<{ id: number; formaPagoId: number; monto: number }>,
    prefijoOverride?: string
  ) => {
    setProcessingAction('FACTURAR');
    setActionFeedback(null);
    const token = localStorage.getItem('hotel_token');

    const pagosToSend = (pagosOverride && pagosOverride.length > 0)
      ? pagosOverride
      : (lineasPagoRef.current && lineasPagoRef.current.length > 0 ? lineasPagoRef.current : lineasPago);

    const prefijoToSend = prefijoOverride || selectedPrefijoRef.current || selectedPrefijo;

    try {
      const res = await fetch('/api/pedidos/enviar-facturar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionId: habitacion.id,
          peweId: peweId || habitacion.peweId || undefined,
          tipoDoc: 'FACTURA',
          prefijo: prefijoToSend,
          pagos: pagosToSend.map((l) => ({ formaPagoId: l.formaPagoId, monto: Number(l.monto) || 0 })),
          observaciones: observaciones ? observaciones.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const docNum = data.numDoc || data.numPed || '';
        setActionFeedback({
          type: 'success',
          message: `🎉 ¡Factura de Venta generada con Éxito! Número oficial: ${docNum}. La habitación ha quedado Disponible.`,
        });
        if (onHabitacionUpdated) onHabitacionUpdated();
        if (data.idDoc) {
          setImpresionData({ tipo: 'FACTURA', idDoc: data.idDoc });
        } else {
          onClose();
        }
      } else {
        if (res.status === 401) {
          throw new Error('Tu sesión ha expirado por inactividad. Por favor recarga la página o inicia sesión nuevamente.');
        }
        throw new Error(data.error || 'Error al procesar factura en el servidor');
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `❌ Error al procesar: ${err.message}`,
      });
    } finally {
      setProcessingAction(null);
    }
  };

  // Abrir modal de confirmación para Facturar
  const requestEnviarAFacturar = () => {
    if (items.length === 0) {
      alert('El carrito no contiene productos para facturar');
      return;
    }
    const defaultFp = formasPago[0]?.id || 1;
    if (totalPagar <= 0 && totalAbonos > 0) {
      setLineasPago([]);
    } else {
      setLineasPago([
        {
          id: Date.now(),
          formaPagoId: defaultFp,
          monto: totalPagar,
        },
      ]);
    }
    if (prefijosFactura.length > 0 && !selectedPrefijo) {
      const active = prefijosFactura.find((p) => p.activo);
      setSelectedPrefijo(active ? active.prefijo : prefijosFactura[0].prefijo);
    }
    setConfirmModal({
      isOpen: true,
      type: 'FACTURAR',
      title: `🧾 Factura de Venta - Habitación ${habitacion.numero}`,
      message: `Revisa y confirma los datos de facturación para la Habitación ${habitacion.numero}:`,
      details: '',
      confirmText: '🧾 Generar Factura de Venta',
      confirmButtonClass: 'btn-confirm-success',
      onConfirm: () => executeEnviarAFacturar(),
    });
  };

  const [cancelling, setCancelling] = useState(false);
  const [showModalAbonos, setShowModalAbonos] = useState(false);

  // Ejecución real de Cancelar Reserva
  const executeCancelarReserva = async () => {
    setCancelling(true);
    const token = localStorage.getItem('hotel_token');
    try {
      const res = await fetch(`/api/habitaciones/${habitacion.id}/cancelar-reserva`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idMovim: selectedMovimId === 'NUEVA' ? undefined : selectedMovimId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: '✅ Reserva cancelada correctamente.',
        });
        if (onHabitacionUpdated) onHabitacionUpdated();
        await fetchRoomDetails();
        onClose();
      } else {
        alert(data.error || 'Error al cancelar la reserva');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión al cancelar reserva');
    } finally {
      setCancelling(false);
    }
  };

  // Abrir modal de confirmación para Cancelar Reserva
  const requestCancelarReserva = () => {
    const targetMov = movimientos.find(m => m.idMovim === selectedMovimId);
    const guestInfo = targetMov?.huesped ? `de ${targetMov.huesped}` : '';
    setConfirmModal({
      isOpen: true,
      type: 'CANCELAR_RESERVA',
      title: '¿Confirmar Cancelación de Reserva / Limpiar Habitación?',
      message: `¿Estás seguro de que deseas cancelar la reserva ${guestInfo} en la Habitación ${habitacion.numero} y dejarla disponible?`,
      details: totalAbonos && totalAbonos > 0
        ? `Se anularán los borradores web y se liberarán/anularán los abonos vinculados ($${totalAbonos.toLocaleString()}).`
        : 'Se anulará el borrador web activo y se liberará la habitación.',
      confirmText: 'Sí, Cancelar Reserva',
      confirmButtonClass: 'btn-confirm-danger',
      onConfirm: executeCancelarReserva,
    });
  };


  const handleSaveChanges = async () => {
    setSaving(true);
    setActionFeedback(null);
    const token = localStorage.getItem('hotel_token');
    const diasCalculados = calculateDiasEstadia(fechaReserva, fechaSalida);

    try {
      const res = await fetch(`/api/habitaciones/${habitacion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idMovim: selectedMovimId === 'NUEVA' ? undefined : selectedMovimId,
          esNuevaReserva: selectedMovimId === 'NUEVA',
          estado,
          artiCod: roomArtiCod,
          huesped,
          documento,
          fechaReserva,
          fechaSalida,
          precioNoche: Number(precioNoche),
          descuento: Number(descuentoNoche) || 0,
          liprCod: roomLiprCod,
          dias: diasCalculados,
          cantidad: diasCalculados,
          caracteristicas,
          observaciones,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: '✅ Reserva guardada exitosamente.',
        });
        const savedMovimId = d.idMovim || d.data?.idMovim;
        await fetchRoomDetails(savedMovimId);
        if (onHabitacionUpdated) onHabitacionUpdated();
      } else {
        alert(d.error || 'Error al guardar cambios de habitación');
      }
    } catch (err) {
      console.error('Error al guardar:', err);
    } finally {
      setSaving(false);
    }
  };


  const totalReserva = items.reduce((sum, it) => sum + it.subtotal, 0);
  const totalPagar = Math.max(0, totalReserva - totalAbonos);

  const totalPagosAsignados = lineasPago.reduce((acc, l) => acc + (Number(l.monto) || 0), 0);
  const diferenciaPagos = totalPagar - totalPagosAsignados;
  const esTotalCuadrado = Math.abs(diferenciaPagos) < 1;

  const formatMoney = (val?: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
    if (isNaN(num)) return '$ 0';
    return '$ ' + Math.round(num).toLocaleString('es-CO');
  };


  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const isReservaParaHoy = (() => {
    if (!fechaReserva) return false;
    return String(fechaReserva).split('T')[0] <= todayStr;
  })();

  // Validaciones obligatorias para habilitar el botón de Guardar
  const hasHuesped = Boolean((documento && documento.trim() !== '') || (huesped && huesped.trim() !== ''));
  const hasFechaEntrada = Boolean(fechaReserva && fechaReserva.trim() !== '');
  const hasFechaSalida = Boolean(fechaSalida && fechaSalida.trim() !== '');
  const hasPrecioNoche = Number(precioNoche || 0) > 0;
  const isFechaEntradaValida = Boolean(
    selectedMovimId !== 'NUEVA' ||
    !fechaReserva ||
    fechaReserva.split('T')[0] >= todayStr
  );

  const isFormValid = hasHuesped && hasFechaEntrada && hasFechaSalida && hasPrecioNoche && isFechaEntradaValida;

  let validationReason = '';
  if (!hasHuesped) {
    validationReason = 'Debes seleccionar un Huésped / Cliente';
  } else if (!hasFechaEntrada) {
    validationReason = 'Debes registrar la Fecha y hora de entrada';
  } else if (!isFechaEntradaValida && selectedMovimId === 'NUEVA') {
    validationReason = 'La Fecha de entrada no puede ser anterior al día actual';
  } else if (!hasFechaSalida) {
    validationReason = 'Debes registrar la Fecha y hora de salida';
  } else if (!hasPrecioNoche) {
    validationReason = 'El Precio por noche ($) debe ser mayor a 0';
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card-dialog modal-card-large" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        {/* Overlay de Carga durante Facturación */}
        {processingAction && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            color: '#ffffff',
            backdropFilter: 'blur(3px)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(255,255,255,0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '16px'
            }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>Procesando Facturación...</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>Por favor espere mientras se graba la factura y se sincroniza la contabilidad en Firebird.</p>
          </div>
        )}

        {/* Header del Modal */}
        <div className="modal-dialog-header">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
            <div className="header-title-box">
              <h2 className="modal-dialog-title" style={{ margin: 0 }}>
                Gestión y Carrito de la Reserva - Habitación {habitacion.numero}
              </h2>
              {peweId && (
                <span className="badge-pewe-modal" title="Documento de Inventario / Remisión Web Vinculada">
                  📋 Remisión Web #{peweId}
                </span>
              )}
            </div>
            <div style={{ fontFamily: '"Arial Now", Arial, sans-serif', fontSize: '11px', color: '#475569', marginTop: '3px', textAlign: 'left' }}>
              <strong style={{ fontFamily: '"Arial Now", Arial, sans-serif', fontWeight: 700, color: '#1e293b' }}>
                Características / Tipo:{' '}
              </strong>
              <span>{caracteristicas || habitacion.caracteristicas || habitacion.tipo || 'SENCILLA'}</span>
            </div>
          </div>
          <button className="btn-modal-close-x" onClick={onClose} title="Cerrar ventana">
            ✕
          </button>
        </div>

        {/* Notificación Flotante Centrada en Medio del Modal */}
        {actionFeedback && (
          <div className={`modal-toast-center ${actionFeedback.type}`}>
            <div className="modal-toast-center-content">
              <div className="modal-toast-center-icon">
                {actionFeedback.type === 'success' ? '✓' : '⚠️'}
              </div>
              <div className="modal-toast-center-text">
                {actionFeedback.message.replace(/^[✅❌⚠️🎉🔍📋]+\s*/, '') || actionFeedback.message}
              </div>
            </div>
            <button
              type="button"
              className="modal-toast-center-close"
              onClick={() => setActionFeedback(null)}
              title="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Cargando información, consumos y catálogo de Firebird...</p>
          </div>
        ) : (
          <div className="modal-dialog-body">
            {/* Tira visual de Agenda de Reservas de la Habitación */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (movimientos.length > 0 || selectedMovimId === 'NUEVA') ? '10px' : '0' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📅 Agenda de Reservas de esta Habitación {movimientos.length > 0 ? `(${movimientos.length})` : ''}
                </span>
                <button
                  type="button"
                  className={`btn-nueva-reserva-compact ${selectedMovimId === 'NUEVA' ? 'active' : ''}`}
                  onClick={iniciarNuevaReserva}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: selectedMovimId === 'NUEVA' ? '#2563eb' : '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Programar una nueva reserva para otros días en esta habitación"
                >
                  {selectedMovimId === 'NUEVA' ? '✓ Programando Nueva Reserva' : '➕ Nueva Reserva'}
                </button>
              </div>

              {(movimientos.length > 0 || selectedMovimId === 'NUEVA') && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {movimientos.map((m) => {
                    const fIni = m.fechaReserva ? m.fechaReserva.split('T')[0] : 'Sin fecha';
                    const fFin = m.fechaSalida ? m.fechaSalida.split('T')[0] : '';
                    const guestName = m.huesped || 'Huésped Sin Nombre';
                    const isSelected = selectedMovimId === m.idMovim;
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const isToday = fIni <= todayStr && (!fFin || fFin >= todayStr);

                    return (
                      <div
                        key={m.idMovim}
                        onClick={() => cargarMovimientoEnFormulario(m)}
                        style={{
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                          boxShadow: isSelected ? '0 2px 6px rgba(59, 130, 246, 0.18)' : '0 1px 2px rgba(0,0,0,0.03)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          minWidth: '210px',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: isToday ? '#dcfce7' : '#fef3c7', color: isToday ? '#15803d' : '#b45309' }}>
                            {isToday ? '🟢 En curso' : '🟡 Futura'}
                          </span>
                          {isSelected && <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>✓ Editando</span>}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👤 {guestName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          📅 {fIni} ➔ {fFin}
                        </div>
                      </div>
                    );
                  })}

                  {selectedMovimId === 'NUEVA' && (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '2px dashed #22c55e',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        minWidth: '210px',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                          ➕ Nueva Reserva
                        </span>
                        <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>✓ Editando</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        👤 {huesped || 'Nuevo Huésped'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                        📅 {fechaReserva ? fechaReserva.split('T')[0] : 'Hoy'} ➔ {fechaSalida ? fechaSalida.split('T')[0] : 'Mañana'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-two-columns">
              {/* Columna Izquierda: Formulario de Reserva & Huésped */}
              <div className="modal-left-col">
                <h3 className="modal-section-subtitle">📋 Información de la habitación y huésped</h3>

                {/* 1. Estado y Artículo de Habitación */}
                <div className="modal-form-row">
                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Estado de la habitación:</label>
                    <select
                      className="modal-form-select status-select readonly-input-field"
                      value={estado}
                      disabled
                      title="El estado de la habitación no se modifica manualmente en la reserva. Se calcula automáticamente según las fechas."
                    >
                      <option value="Disponible">🟩 Disponible</option>
                      <option value="Reservada">🟧 Reservada</option>
                      <option value="Ocupada">🟥 Ocupada</option>
                      <option value="Inhabilitada">⬛ Inhabilitada</option>
                    </select>
                  </div>

                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Artículo Vinculado (ARTI_COD):</label>
                    <input
                      type="text"
                      className="modal-form-input readonly-input-field"
                      value={
                        articulos.find((a) => a.codigo === roomArtiCod)
                          ? `[${roomArtiCod}] ${articulos.find((a) => a.codigo === roomArtiCod)?.descripcion}`
                          : (roomArtiCod ? `[${roomArtiCod}] Artículo Vinculado` : 'Sin artículo vinculado')
                      }
                      disabled
                      readOnly
                      title="El artículo vinculado está protegido contra modificación en este modal"
                    />
                  </div>
                </div>



                {/* 2. Seleccionar Huésped de Terceros */}
                <div className="modal-form-group">
                  <div className="label-with-action">
                    <label className="modal-form-label">Huésped / Cliente:</label>
                    <button
                      type="button"
                      className="btn-toggle-new-client"
                      onClick={() => setShowNewClientForm(!showNewClientForm)}
                    >
                      {showNewClientForm ? '✕ Cancelar' : '+ Grabar nuevo cliente'}
                    </button>
                  </div>

                  {/* Formulario Rápido de Grabar Tercero */}
                  {showNewClientForm && (
                    <div className="quick-client-form-card">
                      <h4 className="quick-form-title">➕ Grabar Nuevo Cliente (SYSPLUS)</h4>
                      {clientError && <div className="quick-error-alert">{clientError}</div>}

                      <div className="modal-form-row">
                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Tipo de Documento *:</label>
                          <select
                            className="modal-form-select"
                            value={newTipoDoc}
                            onChange={(e) => {
                              const val = e.target.value.trim().toUpperCase();
                              setNewTipoDoc(e.target.value);
                              if (val !== 'J' && val !== 'N') {
                                setNewDv('');
                              } else if (newNit) {
                                setNewDv(calculaDigitoVerificacion(newNit));
                              }
                            }}
                            required
                          >
                            {tiposDocumento.map((td) => (
                              <option key={td.cod} value={td.cod}>
                                {td.cod} - {td.nombre} {td.codShd ? `(${td.codShd})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Número de Documento / NIT *:</label>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="modal-form-input"
                              style={{ flex: 1 }}
                              value={newNit}
                              onChange={(e) => handleNitChange(e.target.value)}
                              placeholder="Ej: 900123456"
                              required
                            />
                            {newDv && (newTipoDoc?.trim().toUpperCase() === 'J' || newTipoDoc?.trim().toUpperCase() === 'N') && (
                              <span
                                style={{
                                  padding: '8px 10px',
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  whiteSpace: 'nowrap',
                                }}
                                title="Dígito de Verificación calculado"
                              >
                                DV: {newDv}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Si es Persona Jurídica (J - NIT PERSONA JURIDICA) pide Razón Social */}
                      {newTipoDoc?.trim().toUpperCase() === 'J' ? (
                        <div className="modal-form-group">
                          <label className="modal-form-label">Razón Social / Nombre de la Empresa *:</label>
                          <input
                            type="text"
                            className="modal-form-input"
                            value={newNombre}
                            onChange={(e) => setNewNombre(e.target.value)}
                            placeholder="Ej: INVERSIONES HOTELERAS S.A.S."
                            required
                          />
                        </div>
                      ) : (
                        /* Si es Persona Natural pide Apellidos y Nombres */
                        <>
                          <div className="modal-form-row">
                            <div className="modal-form-group flex-1">
                              <label className="modal-form-label">1er. Apellido *:</label>
                              <input
                                type="text"
                                className="modal-form-input"
                                value={newApellido1}
                                onChange={(e) => setNewApellido1(e.target.value)}
                                placeholder="Ej: Sierra"
                                required
                              />
                            </div>
                            <div className="modal-form-group flex-1">
                              <label className="modal-form-label">2do. Apellido:</label>
                              <input
                                type="text"
                                className="modal-form-input"
                                value={newApellido2}
                                onChange={(e) => setNewApellido2(e.target.value)}
                                placeholder="Opcional"
                              />
                            </div>
                          </div>

                          <div className="modal-form-row">
                            <div className="modal-form-group flex-1">
                              <label className="modal-form-label">1er. Nombre *:</label>
                              <input
                                type="text"
                                className="modal-form-input"
                                value={newNombre1}
                                onChange={(e) => setNewNombre1(e.target.value)}
                                placeholder="Ej: Kevin"
                                required
                              />
                            </div>
                            <div className="modal-form-group flex-1">
                              <label className="modal-form-label">2do. Nombre:</label>
                              <input
                                type="text"
                                className="modal-form-input"
                                value={newNombre2}
                                onChange={(e) => setNewNombre2(e.target.value)}
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="modal-form-row">
                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Celular / Teléfono *:</label>
                          <input
                            type="text"
                            className="modal-form-input"
                            value={newCelular}
                            onChange={(e) => setNewCelular(e.target.value)}
                            placeholder="310 123 4567"
                            required
                          />
                        </div>
                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Email *:</label>
                          <input
                            type="email"
                            className="modal-form-input"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="cliente@email.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="modal-form-row">
                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Dirección *:</label>
                          <input
                            type="text"
                            className="modal-form-input"
                            value={newDireccion}
                            onChange={(e) => setNewDireccion(e.target.value)}
                            placeholder="Carrera 15 #23-45"
                            required
                          />
                        </div>
                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Ciudad *:</label>
                          <select
                            className="modal-form-select"
                            value={newCodCiu}
                            onChange={(e) => setNewCodCiu(e.target.value)}
                            required
                          >
                            {ciudades.map((c) => (
                              <option key={c.cod} value={c.cod}>
                                {c.dpto && !c.nom.toLowerCase().includes(c.dpto.toLowerCase())
                                  ? `${c.nom} (${c.dpto})`
                                  : c.nom}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-quick-save-client"
                        onClick={handleGrabeTercero}
                        disabled={savingClient}
                      >
                        {savingClient ? 'Grabando en Firebird...' : '💾 Grabar Cliente en Firebird'}
                      </button>
                    </div>
                  )}

                  {!showNewClientForm && (
                    <ClienteSearchSelect
                      clientes={terceros}
                      selectedNit={documento}
                      selectedNombre={huesped}
                      onSelect={(cliente) => {
                        if (cliente) {
                          setDocumento(cliente.nit);
                          setHuesped(cliente.nombre);
                          setObservaciones(cliente.nombre);
                          refreshAbonosTotal(cliente.nit);
                        } else {
                          setDocumento('');
                          setHuesped('');
                          setObservaciones('');
                          refreshAbonosTotal('');
                        }
                      }}
                      placeholder="-- Buscar huésped por nombre, apellido o NIT/C.C. --"
                    />
                  )}

                  {huesped && (
                    <div style={{ marginTop: '8px', marginBottom: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <span className="form-hint-text" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#1e293b' }}>
                        👤 <strong>Cliente activo:</strong> {huesped} · NIT/C.C: {documento || 'Sin documento'}
                      </span>
                      <div className="modal-form-group" style={{ marginBottom: 0 }}>
                        <label className="modal-form-label" style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>🪪 Sub-Huésped / Ocupante (Observación):</span>
                        </label>
                        <input
                          type="text"
                          className="modal-form-input"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Nombre de la persona que se hospeda..."
                          style={{ background: '#ffffff', borderColor: '#94a3b8' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de rangos de fechas ya ocupados en esta habitación */}
                {movimientos.filter(m => selectedMovimId === 'NUEVA' || m.idMovim !== selectedMovimId).length > 0 && (
                  <div className="reserved-ranges-card">
                    <div className="reserved-ranges-title">
                      <span>🔒 Fechas ya reservadas en esta habitación:</span>
                    </div>
                    <ul className="reserved-ranges-list">
                      {movimientos
                        .filter(m => selectedMovimId === 'NUEVA' || m.idMovim !== selectedMovimId)
                        .map(m => (
                          <li key={m.idMovim}>
                            <strong>{m.fechaReserva ? m.fechaReserva.replace('T', ' ') : ''}</strong> hasta <strong>{m.fechaSalida ? m.fechaSalida.replace('T', ' ') : ''}</strong> — {m.huesped || 'Huésped'}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* 3. Fechas de Entrada y Salida con Calendario y Selector de Horas */}
                <div className="modal-form-row">
                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">
                      📅 Fecha y hora de entrada:
                      {estado === 'Ocupada' && (
                        <span style={{ fontSize: '11px', color: '#dc2626', marginLeft: '6px', fontWeight: 700 }}>
                          (Inhabilitada - Habitación Ocupada)
                        </span>
                      )}
                    </label>
                    <input
                      type="datetime-local"
                      className="modal-form-input modal-datetime-picker"
                      value={fechaReserva}
                      disabled={estado === 'Ocupada'}
                      min={selectedMovimId === 'NUEVA' ? `${todayStr}T00:00` : undefined}
                      style={estado === 'Ocupada' ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b', borderColor: '#cbd5e1' } : {}}
                      title={estado === 'Ocupada' ? 'La fecha de entrada está inhabilitada porque la habitación ya está ocupada' : undefined}
                      onChange={(e) => {
                        const val = e.target.value;
                        const currNow = new Date();
                        const currToday = `${currNow.getFullYear()}-${String(currNow.getMonth() + 1).padStart(2, '0')}-${String(currNow.getDate()).padStart(2, '0')}`;
                        if (selectedMovimId === 'NUEVA' && val && val.split('T')[0] < currToday) {
                          alert('⚠️ No es posible seleccionar una fecha de entrada anterior al día actual para una nueva reserva.');
                          const defaultVal = getCurrentDatetimeLocal(0);
                          setFechaReserva(defaultVal);
                          setFechaSalida(getDefaultFechaSalida(defaultVal, 1));
                          return;
                        }
                        setFechaReserva(val);
                        if (val) {
                          setFechaSalida(getDefaultFechaSalida(val, 1));
                          const fDate = val.split('T')[0];
                          if (fDate > currToday) {
                            setEstado('Reservada');
                          } else {
                            setEstado('Ocupada');
                          }
                        }
                      }}
                    />
                    {fechaReserva && (
                      estado === 'Ocupada' ? (
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          🔒 Habitación ocupada: La fecha de entrada no se puede modificar.
                        </span>
                      ) : isReservaParaHoy ? (
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>
                          ⚡ Inicia hoy: Al guardar quedará en estado <strong>OCUPADA</strong>.
                        </span>
                      ) : (
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                          📅 Reserva futura: La habitación permanecerá <strong>DISPONIBLE</strong> hoy y pasará a <strong>OCUPADA</strong> automáticamente el día de su inicio.
                        </span>
                      )
                    )}
                  </div>

                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">📅 Fecha y hora de salida:</label>
                    <input
                      type="datetime-local"
                      className="modal-form-input modal-datetime-picker"
                      value={fechaSalida}
                      onChange={(e) => setFechaSalida(e.target.value)}
                    />
                  </div>
                </div>

                {/* 4. Lista de Precios, Precio por noche & Descuento Total ($) */}
                <div className="modal-form-row">
                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Lista de Precios:</label>
                    <select
                      className="modal-form-select"
                      value={roomLiprCod}
                      onChange={handleRoomLiprChange}
                    >
                      {listasPrecios.length > 0 ? (
                        listasPrecios.map((lp) => (
                          <option key={lp.liprCod} value={lp.liprCod}>
                            {lp.nombre} {lp.esPredeterminada ? '(Predeterminada)' : ''}
                          </option>
                        ))
                      ) : (
                        <option value={1}>DETAL (Predeterminada)</option>
                      )}
                    </select>
                  </div>

                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Precio por noche ($):</label>
                    <input
                      type="text"
                      className="modal-form-input readonly-input-field"
                      value={Number(precioNoche || 0).toLocaleString('es-CO')}
                      readOnly
                      disabled
                      title="El precio base se calcula según la Lista de Precios seleccionada. Utilice el campo Descuento para aplicar rebajas."
                    />
                  </div>

                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">
                      Descuento Total ($):
                      {(() => {
                        const dVal = calculateDiasEstadia(fechaReserva, fechaSalida);
                        const subTotalBase = dVal * Number(precioNoche || 0);
                        const dDesc = Number(descuentoNoche || 0);
                        if (subTotalBase > 0 && dDesc > 0) {
                          const pct = Math.round(((dDesc / subTotalBase) * 100) * 100) / 100;
                          return (
                            <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 'bold', marginLeft: '6px' }}>
                              ({pct}%)
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </label>
                    <input
                      type="text"
                      className="modal-form-input"
                      value={Number(descuentoNoche || 0).toLocaleString('es-CO')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setDescuentoNoche(raw ? parseInt(raw, 10) : 0);
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Badge informativo de cálculo de días de estadía */}
                {fechaReserva && fechaSalida && (
                  <div className="dias-estadia-info-card">
                    <div className="dias-estadia-left">
                      <span className="dias-estadia-icon">🌙</span>
                      <span className="dias-estadia-text">
                        Estadía calculada: <strong>{calculateDiasEstadia(fechaReserva, fechaSalida)} {calculateDiasEstadia(fechaReserva, fechaSalida) === 1 ? 'día / noche' : 'días / noches'}</strong>
                      </span>
                    </div>
                    {Number(precioNoche || 0) > 0 && (
                      <span className="dias-estadia-subtotal">
                        {(() => {
                          const dVal = calculateDiasEstadia(fechaReserva, fechaSalida);
                          const pNoche = Number(precioNoche || 0);
                          const subTotalBase = dVal * pNoche;
                          const dDesc = Number(descuentoNoche || 0);
                          const totalFinalEstadia = Math.max(0, subTotalBase - dDesc);

                          if (dDesc > 0) {
                            return (
                              <>
                                {dVal} x {formatMoney(pNoche)} = {formatMoney(subTotalBase)} - {formatMoney(dDesc)} (desc.) = <strong>{formatMoney(totalFinalEstadia)}</strong>
                              </>
                            );
                          }
                          return (
                            <>
                              {dVal} x {formatMoney(pNoche)} = <strong>{formatMoney(totalFinalEstadia)}</strong>
                            </>
                          );
                        })()}
                      </span>
                    )}
                  </div>
                )}

              </div>

              {/* Columna Derecha: Carrito y Pedido de la Habitación */}
              <div className="modal-right-col">
                {!peweId ? (
                  <div className="modal-cart-card modal-cart-card-pending">
                    <div className="cart-pending-placeholder">
                      <div className="cart-pending-icon">🛒🔒</div>
                      <h3 className="cart-pending-title">Carrito no habilitado</h3>
                      <p className="cart-pending-text">
                        Para habilitar el carrito y registrar consumos adicionales, primero debes seleccionar el <strong>Huésped / Cliente</strong> y hacer clic en <strong>"💾 Guardar datos de habitación y reserva"</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="modal-cart-card">
                    <div className="header-title-box" style={{ marginBottom: '10px' }}>
                      <h3 className="modal-section-subtitle" style={{ margin: 0 }}>
                        🛒 Carrito de Pedido (Habitación {habitacion.numero})
                      </h3>
                      <span className="badge-pewe-id" title={`Pedido Web activo #${peweId}`}>
                        WEB #{peweId}
                      </span>
                    </div>

                    {/* Formulario para agregar productos al carrito */}
                    <form className="modal-add-item-box" onSubmit={handleAddProductToCart}>
                      {/* Buscador por nombre y código de barras */}
                      <div className="modal-form-group" style={{ marginBottom: '10px' }}>
                        <label className="modal-form-label">
                          🔍 Escanear código de barras:
                        </label>
                        <div className="barcode-search-box-row">
                          <input
                            type="text"
                            className="modal-form-input barcode-search-input"
                            placeholder="Escanee el código de barras con el lector..."
                            value={searchArticuloText}
                            onChange={(e) => setSearchArticuloText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleBarcodeScanOrSearch(searchArticuloText);
                              }
                            }}
                            autoComplete="off"
                          />
                          {searchArticuloText && (
                            <button
                              type="button"
                              className="btn-clear-search-text"
                              onClick={() => setSearchArticuloText('')}
                              title="Limpiar"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="modal-form-row">
                        <div className="modal-form-group flex-2">
                          <label className="modal-form-label">
                            Catálogo de Artículos:
                          </label>
                          <select
                            className="modal-form-select"
                            value={selectedArticuloCod}
                            onChange={handleArticuloSelect}
                          >
                            <option value="">-- Seleccione un artículo o ingrese manual --</option>
                            {articulos.map((a) => {
                              const pObj = a.precios?.find((p) => p.liprCod === selectedLiprCod);
                              const precioTxt = pObj && pObj.precio !== undefined ? formatMoney(pObj.precio) : 'Sin precio en esta lista';
                              return (
                                <option key={a.codigo} value={a.codigo}>
                                  {a.descripcion} ({precioTxt}) - {a.unidad} {a.ivaPorc ? `[IVA ${a.ivaPorc}%]` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Lista de Precios:</label>
                          <select
                            className="modal-form-select"
                            value={selectedLiprCod}
                            onChange={handleListaPrecioChange}
                          >
                            {listasPrecios.length > 0 ? (
                              listasPrecios.map((lp) => (
                                <option key={lp.liprCod} value={lp.liprCod}>
                                  {lp.nombre} {lp.esPredeterminada ? '(Pred.)' : ''}
                                </option>
                              ))
                            ) : (
                              <option value={1}>DETAL</option>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="modal-form-row">
                        <div className="modal-form-group flex-2">
                          <label className="modal-form-label">Descripción:</label>
                          <input
                            type="text"
                            className="modal-form-input"
                            value={customDescripcion}
                            onChange={(e) => setCustomDescripcion(e.target.value)}
                            placeholder="Nombre del producto"
                            required
                          />
                        </div>

                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Precio ($):</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="modal-form-input"
                            value={customPrecio ? Number(String(customPrecio).replace(/\D/g, '')).toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setCustomPrecio(raw ? Number(raw).toLocaleString('es-CO') : '');
                            }}
                            placeholder="0"
                          />
                        </div>

                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Cant:</label>
                          <input
                            type="number"
                            className="modal-form-input"
                            value={customCantidad}
                            onChange={(e) => setCustomCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn-modal-add-item"
                        disabled={!customDescripcion.trim() || Number(customPrecio || 0) <= 0 || Number(customCantidad || 0) <= 0}
                        title={
                          Number(customPrecio || 0) <= 0
                            ? 'El precio del artículo debe ser mayor a cero ($0) para agregar al carrito'
                            : 'Agregar producto al carrito'
                        }
                      >
                        + Agregar al Carrito
                      </button>
                    </form>

                    {/* Lista de productos en el carrito con scroll independiente */}
                    <div className="modal-cart-items-wrapper">
                      {items.length === 0 ? (
                        <p className="modal-cart-empty">El carrito de esta habitación no tiene productos aún.</p>
                      ) : (
                        <div className="modal-cart-items-list">
                          {items.map((item) => {
                            const isRoomStayItem = item.id === 1 || item.articulo.toLowerCase().includes('hospedaje') || item.articulo.toLowerCase().includes('habitacion');

                            return (
                              <div key={item.id} className="modal-cart-item-row-interactive">
                                <div className="item-info">
                                  <span className="item-title">
                                    <span className="item-number-badge">#{item.id}</span> {item.articulo}
                                  </span>
                                  <span className="item-unit-price">{formatMoney(item.precio)} c/u</span>
                                </div>

                                <div className="item-actions-box">
                                  {isRoomStayItem ? (
                                    <div className="modal-stepper readonly-stepper" title="La cantidad de noches de la habitación se calcula automáticamente según las fechas de reserva">
                                      <span className="stepper-count-readonly">{item.cantidad} {item.cantidad === 1 ? 'noche' : 'noches'}</span>
                                    </div>
                                  ) : (
                                    <div className="modal-stepper">
                                      <button
                                        type="button"
                                        className="stepper-btn-mini"
                                        onClick={() => handleUpdateCantidad(item.id, item.cantidad - 1)}
                                      >
                                        -
                                      </button>
                                      <span className="stepper-count">{item.cantidad}</span>
                                      <button
                                        type="button"
                                        className="stepper-btn-mini"
                                        onClick={() => handleUpdateCantidad(item.id, item.cantidad + 1)}
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}

                                  <span className="item-subtotal">{formatMoney(item.subtotal)}</span>

                                  {!isRoomStayItem && (
                                    <button
                                      type="button"
                                      className="btn-remove-mini"
                                      onClick={() => handleDeleteItem(item.id)}
                                      title="Eliminar producto"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Resumen Total y Acciones del Carrito con Desglose de Abonos */}
                    {items.length > 0 && (
                      <>
                        <div className="modal-cart-totals-breakdown-card">
                          {totalAbonos > 0 && (
                            <>
                              <div className="modal-cart-breakdown-row">
                                <span className="breakdown-label">Total Reserva / Consumos:</span>
                                <span className="breakdown-value">{formatMoney(totalReserva)}</span>
                              </div>
                              <div className="modal-cart-breakdown-row breakdown-abonos-row">
                                <span className="breakdown-label">Total Abonos:</span>
                                <span className="breakdown-value text-abono-green">- {formatMoney(totalAbonos)}</span>
                              </div>
                              <div className="breakdown-divider"></div>
                            </>
                          )}
                          <div className="modal-cart-total-row">
                            <span className="modal-total-label">Total a pagar:</span>
                            <span className="modal-total-value">{formatMoney(totalPagar)}</span>
                          </div>
                        </div>

                        <div className="modal-cart-actions-row">
                          <button
                            type="button"
                            className={`btn-modal-facturar ${estado !== 'Ocupada' ? 'btn-disabled-locked' : ''}`}
                            onClick={requestEnviarAFacturar}
                            disabled={processingAction !== null || estado !== 'Ocupada'}
                            title={
                              estado !== 'Ocupada'
                                ? 'La habitación debe estar en estado OCUPADA para poder facturar'
                                : 'Enviar a facturar la habitación'
                            }
                          >
                            {processingAction === 'FACTURAR' ? 'Facturando en Firebird...' : '⚡ Enviar a facturar'}
                          </button>
                        </div>
                        {estado !== 'Ocupada' && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                            🔒 El botón para facturar se activa únicamente cuando la habitación está en estado <strong>Ocupada</strong>.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>


            </div>
          </div>
        )}

        {/* Footer flotante / fijo al pie de la ventana */}
        {!loading && (
          <div className="modal-dialog-footer">
            <div className="footer-validation-box">
              {!isFormValid && (
                <div className="footer-validation-warning" title={validationReason}>
                  <span>⚠️ {validationReason}</span>
                </div>
              )}
            </div>

            <div className="footer-buttons-group">
              {/* Botón Cancelar Reserva: Disponible para habitaciones reservadas, ocupadas o con movimiento activo */}
              {(estado === 'Reservada' || estado === 'Ocupada' || Boolean(peweId) || (movimientos && movimientos.length > 0)) && (
                <button
                  type="button"
                  className="btn-modal-cancel-reservation"
                  onClick={requestCancelarReserva}
                  disabled={saving || cancelling}
                  title="Anular la reserva u ocupación y dejar la habitación disponible"
                >
                  {cancelling ? 'Cancelando...' : '🚫 Cancelar reserva'}
                </button>
              )}

              <button type="button" className="btn-modal-close-action" onClick={onClose} disabled={saving || cancelling}>
                Cerrar
              </button>

              {/* Botón Abonos */}
              {(() => {
                const isReservaGuardada = Boolean(peweId) && (estado === 'Reservada' || Boolean(documento));
                return (
                  <button
                    type="button"
                    className={`btn-modal-abonos-action ${!isReservaGuardada ? 'btn-disabled-locked' : ''}`}
                    onClick={() => setShowModalAbonos(true)}
                    disabled={saving || cancelling || !isReservaGuardada}
                    title={
                      !isReservaGuardada
                        ? 'Debe guardar los datos de la reserva antes de gestionar abonos'
                        : 'Registrar y consultar abonos / anticipos'
                    }
                  >
                    💳 Abonos
                  </button>
                );
              })()}

              {/* Botón Guardar datos de reserva */}
              <button
                className={`btn-modal-save-action ${!isFormValid ? 'btn-disabled-locked' : ''}`}
                onClick={handleSaveChanges}
                disabled={saving || !isFormValid || cancelling}
                title={!isFormValid ? validationReason : 'Guardar datos de reserva'}
              >
                {saving ? 'Guardando...' : '💾 Guardar datos de reserva'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmación para Cancelar Reserva / Facturación */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-backdrop" onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: confirmModal.type === 'FACTURAR' ? '560px' : '440px' }}>
            <div className={`confirm-modal-icon-wrapper ${confirmModal.type === 'CANCELAR_RESERVA' ? 'icon-danger' : 'icon-success'}`}>
              {confirmModal.type === 'CANCELAR_RESERVA' ? (
                <span className="confirm-modal-symbol">🚫</span>
              ) : (
                <span className="confirm-modal-symbol">🧾</span>
              )}
            </div>

            <h3 className="confirm-modal-title">{confirmModal.title}</h3>
            <p className="confirm-modal-message">{confirmModal.message}</p>

            {confirmModal.type === 'FACTURAR' && (
              <div className="factura-config-grid">
                {/* Selector de Prefijo */}
                <div className="factura-field-group">
                  <label className="factura-modal-label">
                    📑 Prefijo de Facturación (Tipo 31):
                  </label>
                  <select
                    className="select-prefijo-factura"
                    value={selectedPrefijo}
                    onChange={(e) => setSelectedPrefijo(e.target.value)}
                  >
                    {prefijosFactura.length > 0 ? (
                      prefijosFactura.map((p) => (
                        <option key={p.prefijo} value={p.prefijo}>
                          Prefijo: {p.prefijo} {p.actual ? `— Consecutivo Actual: ${p.actual}` : ''} {p.activo ? '⭐ [Activo]' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="SETT">SETT (Predeterminado)</option>
                    )}
                  </select>
                </div>

                {/* Formas de Pago o Mensaje de Abonos Previos */}
                {totalPagar <= 0 && totalAbonos > 0 ? (
                  <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                    <div style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                      💳 Cubierto 100% con Abonos / Anticipos Previos
                    </div>
                    <div style={{ color: '#388e3c', fontSize: '13px', lineHeight: '1.4' }}>
                      El valor facturado ({formatMoney(totalReserva)}) está totalmente cancelado mediante los abonos registrados previamente ({formatMoney(totalAbonos)}). La factura se emitirá sin registrar nuevas formas de pago para no duplicar el recibo de caja.
                    </div>
                  </div>
                ) : (
                  <div className="formas-pago-container">
                    <div className="formas-pago-header-row">
                      <label className="factura-modal-label">
                        💳 Formas de Pago ({lineasPago.length}):
                      </label>
                      <button
                        type="button"
                        className="btn-add-forma-pago"
                        onClick={() => {
                          const yaAsignado = lineasPago.reduce((acc, l) => acc + (Number(l.monto) || 0), 0);
                          const pendiente = Math.max(0, totalPagar - yaAsignado);
                          setLineasPago([
                            ...lineasPago,
                            {
                              id: Date.now(),
                              formaPagoId: formasPago[0]?.id || 1,
                              monto: pendiente,
                            },
                          ]);
                        }}
                      >
                        ➕ Agregar forma de pago
                      </button>
                    </div>

                    <div className="lineas-pago-list">
                      {lineasPago.map((linea, index) => (
                        <div key={linea.id} className="linea-pago-row">
                          <span className="linea-pago-num">#{index + 1}</span>
                          <select
                            className="select-forma-pago-item"
                            value={linea.formaPagoId}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setLineasPago(lineasPago.map((l) => (l.id === linea.id ? { ...l, formaPagoId: val } : l)));
                            }}
                          >
                            {formasPago.map((fp) => (
                              <option key={fp.id} value={fp.id}>
                                {fp.nombre}
                              </option>
                            ))}
                          </select>

                          <div className="input-monto-pago-wrapper">
                            <span className="currency-prefix">$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="input-monto-pago"
                              placeholder="0"
                              value={linea.monto ? Number(linea.monto).toLocaleString('es-CO') : ''}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const val = raw ? parseFloat(raw) : 0;
                                setLineasPago(lineasPago.map((l) => (l.id === linea.id ? { ...l, monto: val } : l)));
                              }}
                            />
                          </div>

                          {lineasPago.length > 1 ? (
                            <button
                              type="button"
                              className="btn-remove-linea-pago"
                              onClick={() => setLineasPago(lineasPago.filter((l) => l.id !== linea.id))}
                              title="Eliminar forma de pago"
                            >
                              🗑️
                            </button>
                          ) : (
                            <div></div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Tarjeta de Balance */}
                    <div className={`pago-balance-card ${esTotalCuadrado ? 'balance-ok' : 'balance-mismatch'}`}>
                      <div className="balance-item">
                        <span>Total Factura:</span>
                        <strong>{formatMoney(totalPagar)}</strong>
                      </div>
                      <div className="balance-item">
                        <span>Total Pagos:</span>
                        <strong>{formatMoney(totalPagosAsignados)}</strong>
                      </div>
                      <div className="balance-item">
                        <span>Balance:</span>
                        <strong>
                          {esTotalCuadrado
                            ? '✅ Cuadrado exacto'
                            : diferenciaPagos > 0
                              ? `⚠️ Faltan ${formatMoney(diferenciaPagos)}`
                              : `⚠️ Excede en ${formatMoney(Math.abs(diferenciaPagos))}`}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {confirmModal.type !== 'FACTURAR' && confirmModal.details && (
              <div className="confirm-modal-details-box">
                <p className="confirm-modal-details">{confirmModal.details}</p>
              </div>
            )}

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-confirm-cancel"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={cancelling || processingAction !== null}
              >
                ✕ Volver / Cancelar
              </button>
              <button
                type="button"
                className={`btn-confirm-action ${confirmModal.type === 'FACTURAR' ? 'btn-confirm-success' : confirmModal.confirmButtonClass}`}
                onClick={() => {
                  if (confirmModal.type === 'FACTURAR') {
                    executeEnviarAFacturar(lineasPago, selectedPrefijo);
                  } else {
                    confirmModal.onConfirm();
                  }
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                }}
                disabled={
                  cancelling ||
                  processingAction !== null ||
                  (confirmModal.type === 'FACTURAR' && totalPagar > 0 && (!esTotalCuadrado || lineasPago.length === 0))
                }
              >
                {cancelling || processingAction !== null
                  ? 'Procesando...'
                  : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalAbonos && (
        <ModalAbonos
          habitacionId={habitacion.id}
          habitacionNumero={habitacion.numero}
          huesped={huesped}
          documento={documento}
          totalFacturado={totalReserva}
          idMovim={typeof selectedMovimId === 'number' ? selectedMovimId : undefined}
          onClose={() => setShowModalAbonos(false)}
          onAbonoRegistrado={() => {
            refreshAbonosTotal(documento, typeof selectedMovimId === 'number' ? selectedMovimId : undefined);
            fetchRoomDetails(typeof selectedMovimId === 'number' ? selectedMovimId : undefined);
            if (onHabitacionUpdated) onHabitacionUpdated();
          }}
        />
      )}

      {impresionData && (
        <ModalImpresionPOS
          tipoDoc={impresionData.tipo}
          idDoc={impresionData.idDoc}
          habitacionNumero={habitacion.numero}
          onClose={() => {
            setImpresionData(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};



