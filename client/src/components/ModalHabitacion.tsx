import { useState, useEffect, useRef } from 'react';
import type { Habitacion } from './Habitaciones';
import { ModalAbonos } from './ModalAbonos';
import { ModalImpresionPOS } from './ModalImpresionPOS';


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
  precios?: ArticuloPrecio[];
}

interface ListaPrecioItem {
  liprCod: number;
  nombre: string;
  esPredeterminada: boolean;
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
  const [items, setItems] = useState<ConsumoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Campos editables de la habitación
  const [estado, setEstado] = useState<string>(habitacion.estado || 'Disponible');
  const [roomArtiCod, setRoomArtiCod] = useState<string>(habitacion.artiCod || '');
  const [peweId, setPeweId] = useState<number | undefined>(habitacion.peweId);
  const [huesped, setHuesped] = useState<string>('');
  const [documento, setDocumento] = useState<string>('');
  const [fechaReserva, setFechaReserva] = useState<string>('');
  const [fechaSalida, setFechaSalida] = useState<string>('');
  const [precioNoche, setPrecioNoche] = useState<number | string>(0);
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
  const [tiposDocumento, setTiposDocumento] = useState<Array<{ cod: number; nomCorto: string; nomLargo: string }>>([
    { cod: 1, nomCorto: 'CC', nomLargo: 'CÉDULA DE CIUDADANÍA' },
    { cod: 2, nomCorto: 'NIT', nomLargo: 'NIT / RUT' },
    { cod: 3, nomCorto: 'CE', nomLargo: 'CÉDULA DE EXTRANJERÍA' },
    { cod: 4, nomCorto: 'PAS', nomLargo: 'PASAPORTE' },
    { cod: 5, nomCorto: 'TI', nomLargo: 'TARJETA DE IDENTIDAD' },
    { cod: 6, nomCorto: 'PEP', nomLargo: 'PERMISO ESPECIAL' }
  ]);
  const [newTipoDoc, setNewTipoDoc] = useState('CC');
  const [newNit, setNewNit] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newCelular, setNewCelular] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

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

  const fetchRoomDetails = () => {

    const token = localStorage.getItem('hotel_token');
    const fetchHab = fetch(`/api/habitaciones/${habitacion.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setEstado(data.estado || habitacion.estado || 'Disponible');
        setRoomArtiCod(data.artiCod || habitacion.artiCod || '');
        setPeweId(data.peweId);
        setHuesped(data.huesped || '');
        setDocumento(data.documento || '');
        setFechaReserva(toDatetimeLocal(data.fechaReserva) || getCurrentDatetimeLocal(0));
        setFechaSalida(toDatetimeLocal(data.fechaSalida) || getCurrentDatetimeLocal(24));
        setPrecioNoche(data.precioNoche || 0);
        if (data.liprCod) {
          setRoomLiprCod(data.liprCod);
        }
        setCaracteristicas(data.caracteristicas || 'Cama Doble, Aire Acondicionado, Wi-Fi');
        setObservaciones(data.observaciones || '');
        setItems(data.items || []);
        return data;
      });

    const fetchAbonosTotal = fetch(`/api/abonos/habitacion/${habitacion.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setTotalAbonos(data.totalAbonado || 0);
      })
      .catch((err) => console.error('Error al cargar total de abonos:', err));

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
          setNewTipoDoc((prev) => prev || data[0].nomCorto);
        }
      })
      .catch((err) => console.error('Error al cargar tipos de documento:', err));

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

  const handleTerceroSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedNit = e.target.value;
    if (!selectedNit) {
      setDocumento('');
      setHuesped('');
      return;
    }
    const found = terceros.find((t) => t.nit === selectedNit);
    if (found) {
      setDocumento(found.nit);
      setHuesped(found.nombre);
    }
  };

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
    if (!newNombre || !newNombre.trim()) {
      setClientError('El nombre completo es obligatorio (*)');
      return;
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

    setSavingClient(true);
    setClientError(null);
    const token = localStorage.getItem('hotel_token');

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
            nombre: newNombre.trim(),
            cel: newCelular.trim(),
            email: newEmail.trim(),
            dir: newDireccion.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al grabar tercero');

      setDocumento(newNit.trim());
      setHuesped(newNombre.trim());
      await fetchTerceros();

      setNewNit('');
      setNewNombre('');
      setNewCelular('');
      setNewEmail('');
      setNewDireccion('');
      setShowNewClientForm(false);
      setActionFeedback({
        type: 'success',
        message: `✅ Cliente "${newNombre.trim()}" registrado exitosamente en Firebird`,
      });
    } catch (err: any) {
      setClientError(err.message || 'Error al conectar con el servidor');
    } finally {
      setSavingClient(false);
    }
  };

  const handleArticuloSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    setSelectedArticuloCod(cod);
    const found = articulos.find((a) => a.codigo === cod);
    if (found) {
      setCustomDescripcion(found.descripcion);
      setCustomUnidad(found.unidad || 'UND');

      // Buscar precio según la lista seleccionada actualmente
      let precioFinal = found.precio;
      if (found.precios && found.precios.length > 0) {
        const precioEnLista = found.precios.find((p) => p.liprCod === selectedLiprCod);
        if (precioEnLista) {
          precioFinal = precioEnLista.precio;
        } else {
          precioFinal = found.precios[0].precio;
          setSelectedLiprCod(found.precios[0].liprCod);
        }
      }
      setCustomPrecio(precioFinal);
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
      if (found && found.precios && found.precios.length > 0) {
        const precioEnLista = found.precios.find((p) => p.liprCod === lipr);
        if (precioEnLista) {
          setCustomPrecio(precioEnLista.precio);
        }
      }
    }
  };

  const handleAddProductToCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDescripcion.trim()) {
      alert('Por favor selecciona o escribe la descripción del producto');
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
          tipoDoc: 'FACTURA',
          prefijo: prefijoToSend,
          pagos: pagosToSend.map((l) => ({ formaPagoId: l.formaPagoId, monto: Number(l.monto) || 0 })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const docNum = data.numDoc || data.numPed || '';
        setActionFeedback({
          type: 'success',
          message: `🎉 ¡Factura de Venta generada con Éxito! Número oficial: ${docNum}. La habitación ha quedado Disponible.`,
        });
        if (data.idDoc) {
          setImpresionData({ tipo: 'FACTURA', idDoc: data.idDoc });
        }
        setEstado('Disponible');
        setHuesped('');
        setDocumento('');
        setFechaReserva(getCurrentDatetimeLocal(0));
        setFechaSalida(getCurrentDatetimeLocal(24));
        setPeweId(undefined);
        setItems([]);
        await fetchRoomDetails();
        if (onHabitacionUpdated) onHabitacionUpdated();
      } else {
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
    setLineasPago([
      {
        id: Date.now(),
        formaPagoId: defaultFp,
        monto: totalPagar,
      },
    ]);
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
      });
      const data = await res.json();
      if (res.ok) {
        if (onHabitacionUpdated) onHabitacionUpdated();
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
    setConfirmModal({
      isOpen: true,
      type: 'CANCELAR_RESERVA',
      title: '¿Confirmar Cancelación de Reserva?',
      message: `¿Estás seguro de que deseas cancelar la reserva de la Habitación ${habitacion.numero}?`,
      details: 'La habitación volverá a estado "Disponible", se anulará el pedido web activo y se anularán los anticipos y recibos de caja asociados en el sistema.',
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
          estado,
          artiCod: roomArtiCod,
          huesped,
          documento,
          fechaReserva,
          fechaSalida,
          precioNoche: Number(precioNoche),
          liprCod: roomLiprCod,
          dias: diasCalculados,
          cantidad: diasCalculados,
          caracteristicas,
          observaciones,
        }),
      });


      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: '✅ Datos guardados, la habitacion quedo en estado ' + estado + '.',
        });
        await fetchRoomDetails();
        if (onHabitacionUpdated) onHabitacionUpdated();
      } else {
        const d = await res.json();
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

  const formatMoney = (val: number) => {
    return '$' + Number(val || 0).toLocaleString('es-CO');
  };


  // Validaciones obligatorias para habilitar el botón de Guardar
  const isEstadoReservada = estado === 'Reservada';
  const hasHuesped = Boolean((documento && documento.trim() !== '') || (huesped && huesped.trim() !== ''));
  const hasFechaEntrada = Boolean(fechaReserva && fechaReserva.trim() !== '');
  const hasFechaSalida = Boolean(fechaSalida && fechaSalida.trim() !== '');
  const hasPrecioNoche = Number(precioNoche || 0) > 0;

  const isFormValid = isEstadoReservada && hasHuesped && hasFechaEntrada && hasFechaSalida && hasPrecioNoche;

  let validationReason = '';
  if (!isEstadoReservada) {
    validationReason = 'El estado debe estar en "Reservada" para guardar';
  } else if (!hasHuesped) {
    validationReason = 'Debes seleccionar un Huésped / Cliente';
  } else if (!hasFechaEntrada) {
    validationReason = 'Debes registrar la Fecha y hora de entrada';
  } else if (!hasFechaSalida) {
    validationReason = 'Debes registrar la Fecha y hora de salida';
  } else if (!hasPrecioNoche) {
    validationReason = 'El Precio por noche ($) debe ser mayor a 0';
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card-dialog modal-card-large" onClick={(e) => e.stopPropagation()}>
        {/* Header del Modal */}
        <div className="modal-dialog-header">
          <div className="header-title-box">
            <h2 className="modal-dialog-title">
              Gestión y Carrito de la Reserva - Habitación {habitacion.numero}
            </h2>
            {peweId && (
              <span className="badge-pewe-modal" title="Documento de Inventario / Remisión Web Vinculada">
                📋 Remisión Web #{peweId}
              </span>
            )}
          </div>
          <button className="btn-modal-close-x" onClick={onClose} title="Cerrar ventana">
            ✕
          </button>

        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Cargando información, consumos y catálogo de Firebird...</p>
          </div>
        ) : (
          <div className="modal-dialog-body">
            {actionFeedback && (
              <div className={`modal-action-feedback ${actionFeedback.type}`}>
                <span>{actionFeedback.message}</span>
                <button className="btn-close-feedback" onClick={() => setActionFeedback(null)}>✕</button>
              </div>
            )}


            <div className="modal-two-columns">
              {/* Columna Izquierda: Formulario de Reserva & Huésped */}
              <div className="modal-left-col">
                <h3 className="modal-section-subtitle">📋 Información de la habitación y huésped</h3>

                {/* 1. Estado y Artículo de Habitación */}
                <div className="modal-form-row">
                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Estado de la habitación:</label>
                    <select
                      className="modal-form-select status-select"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
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
                            onChange={(e) => setNewTipoDoc(e.target.value)}
                            required
                          >
                            {tiposDocumento.map((td) => (
                              <option key={td.cod} value={td.nomCorto}>
                                {td.nomCorto} - {td.nomLargo}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="modal-form-group flex-1">
                          <label className="modal-form-label">Número de Documento / NIT *:</label>
                          <input
                            type="text"
                            className="modal-form-input"
                            value={newNit}
                            onChange={(e) => setNewNit(e.target.value)}
                            placeholder="Ej: 1098765432"
                            required
                          />
                        </div>
                      </div>

                      <div className="modal-form-group">
                        <label className="modal-form-label">Nombre Completo / Razón Social *:</label>
                        <input
                          type="text"
                          className="modal-form-input"
                          value={newNombre}
                          onChange={(e) => setNewNombre(e.target.value)}
                          placeholder="Ej: Carlos Alberto Mendoza"
                          required
                        />
                      </div>

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

                      <div className="modal-form-group">
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
                    <select
                      className="modal-form-select"
                      value={documento}
                      onChange={handleTerceroSelect}
                    >
                      <option value="">-- Seleccione un tercero o cliente --</option>
                      {documento && !terceros.some((t) => t.nit === documento) && (
                        <option value={documento}>
                          {huesped ? `${huesped} (${documento})` : documento}
                        </option>
                      )}
                      {terceros.map((t) => (
                        <option key={t.nit} value={t.nit}>
                          {t.nombre} ({t.nit})
                        </option>
                      ))}
                    </select>
                  )}

                  {huesped && (
                    <span className="form-hint-text">
                      👤 <strong>Cliente activo:</strong> {huesped} · NIT/C.C: {documento || 'Sin documento'}
                    </span>
                  )}
                </div>

                {/* 3. Fechas de Entrada y Salida con Calendario y Selector de Horas */}
                <div className="modal-form-row">
                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">📅 Fecha y hora de entrada:</label>
                    <input
                      type="datetime-local"
                      className="modal-form-input modal-datetime-picker"
                      value={fechaReserva}
                      onChange={(e) => setFechaReserva(e.target.value)}
                    />
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

                {/* 4. Lista de Precios, Precio por noche & Características */}
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
                      className="modal-form-input"
                      value={Number(precioNoche || 0).toLocaleString('es-CO')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setPrecioNoche(raw ? parseInt(raw, 10) : 0);
                      }}
                      placeholder="0"
                    />
                  </div>

                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Características / Tipo:</label>
                    <input
                      type="text"
                      className="modal-form-input readonly-input-field"
                      value={caracteristicas || habitacion.tipo || 'SENCILLA'}
                      disabled
                      readOnly
                      title="Las características y tipo se configuran desde la edición de la habitación"
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
                        {calculateDiasEstadia(fechaReserva, fechaSalida)} x {formatMoney(Number(precioNoche || 0))} = <strong>{formatMoney(calculateDiasEstadia(fechaReserva, fechaSalida) * Number(precioNoche || 0))}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* 5. Observaciones */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Observaciones:</label>
                  <textarea
                    className="modal-form-textarea"
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas especiales de la reserva o habitación..."
                  />
                </div>

                {/* Acciones de Reserva (Debajo de Observaciones) */}
                <div className="reservation-form-actions">
                  {!isFormValid && (
                    <div className="modal-validation-warning" title={validationReason}>
                      ⚠️ <span>{validationReason}</span>
                    </div>
                  )}
                  <div className="reservation-buttons-row">
                    {/* Botón Cancelar Reserva (activo si está Reservada o tiene pedido) */}
                    {(estado === 'Reservada' || Boolean(peweId)) ? (
                      <button
                        type="button"
                        className="btn-modal-cancel-reservation"
                        onClick={requestCancelarReserva}
                        disabled={saving || cancelling}
                        title="Anular la reserva y dejar la habitación disponible"
                      >
                        {cancelling ? 'Cancelando...' : '🚫 Cancelar reserva'}
                      </button>
                    ) : (
                      <button type="button" className="btn-modal-close-action" onClick={onClose} disabled={saving}>
                        Cerrar
                      </button>
                    )}

                    {/* Botón Abonos al lado de Cancelar Reserva (se activa cuando la reserva ya está guardada) */}
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
                      <div className="modal-form-row">
                        <div className="modal-form-group flex-2">
                          <label className="modal-form-label">Catálogo de Artículos:</label>
                          <select
                            className="modal-form-select"
                            value={selectedArticuloCod}
                            onChange={handleArticuloSelect}
                          >
                            <option value="">-- Seleccione un artículo o ingrese manual --</option>
                            {articulos.map((a) => (
                              <option key={a.codigo} value={a.codigo}>
                                {a.descripcion} ({formatMoney(a.precio)}) - {a.unidad} {a.ivaPorc ? `[IVA ${a.ivaPorc}%]` : ''}
                              </option>
                            ))}
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
                            type="number"
                            className="modal-form-input"
                            value={customPrecio}
                            onChange={(e) => setCustomPrecio(e.target.value)}
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

                      <button type="submit" className="btn-modal-add-item">
                        + Agregar al Carrito
                      </button>
                    </form>

                    {/* Lista de productos en el carrito con scroll independiente */}
                    <div className="modal-cart-items-wrapper">
                      {items.length === 0 ? (
                        <p className="modal-cart-empty">El carrito de esta habitación no tiene productos aún.</p>
                      ) : (
                        <div className="modal-cart-items-list">
                          {items.map((item) => (
                            <div key={item.id} className="modal-cart-item-row-interactive">
                              <div className="item-info">
                                <span className="item-title">
                                  <span className="item-number-badge">#{item.id}</span> {item.articulo}
                                </span>
                                <span className="item-unit-price">{formatMoney(item.precio)} c/u</span>
                              </div>

                              <div className="item-actions-box">
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

                                <span className="item-subtotal">{formatMoney(item.subtotal)}</span>

                                <button
                                  type="button"
                                  className="btn-remove-mini"
                                  onClick={() => handleDeleteItem(item.id)}
                                  title="Eliminar"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
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
                            className="btn-modal-facturar"
                            onClick={requestEnviarAFacturar}
                            disabled={processingAction !== null}
                          >
                            {processingAction === 'FACTURAR' ? 'Facturando en Firebird...' : '⚡ Enviar a facturar'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>


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

                {/* Formas de Pago Múltiples */}
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
                            type="number"
                            min="0"
                            step="100"
                            className="input-monto-pago"
                            placeholder="0"
                            value={linea.monto === 0 ? '' : linea.monto}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
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
                  (confirmModal.type === 'FACTURAR' && (!esTotalCuadrado || lineasPago.length === 0))
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
          onClose={() => setShowModalAbonos(false)}
          onAbonoRegistrado={() => {
            fetchRoomDetails();
            if (onHabitacionUpdated) onHabitacionUpdated();
          }}
        />
      )}

      {impresionData && (
        <ModalImpresionPOS
          tipoDoc={impresionData.tipo}
          idDoc={impresionData.idDoc}
          habitacionNumero={habitacion.numero}
          onClose={() => setImpresionData(null)}
        />
      )}
    </div>
  );
};



