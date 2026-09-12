import React, { useState, useEffect } from 'react';
import { ModalImpresionPOS } from './ModalImpresionPOS';
import { ClienteSearchSelect } from './ClienteSearchSelect';
import { checkArticleStockAndAlert } from '../utils/stockValidator';

interface ModalFacturacionDirectaProps {
  isOpen: boolean;
  onClose: () => void;
  onFacturaGenerada?: () => void;
}

interface TerceroItem {
  nit: string;
  nombre: string;
  dv?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

interface CiudadItem {
  cod: string;
  nom: string;
  dpto?: string;
}

interface ListaPrecioItem {
  liprCod: number;
  nombre: string;
  esPredeterminada: boolean;
}

interface ArticuloPrecioItem {
  liprCod: number;
  nombre: string;
  precio: number;
  esPredeterminada: boolean;
}

interface ArticuloItem {
  codigo: string;
  descripcion: string;
  precio: number;
  unidad: string;
  grinCod?: string;
  taivCod?: number;
  ivaPorc?: number;
  codigosBarra?: string[];
  precios?: ArticuloPrecioItem[];
}

interface LineaCarrito {
  id: string;
  articulo: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  descuento: number;
  dtoPorc: number;
  ivaPorc: number;
  tiva: number;
  lista: number;
  unidad: string;
}

interface FormaPagoItem {
  id: number;
  nombre: string;
  esEfectivo: boolean;
}

interface LineaPago {
  id: number;
  formaPagoId: number;
  monto: number;
}

interface PrefijoFactura {
  prefijo: string;
  nombre: string;
  tipoDoc: number;
  actual: string;
  ivaInc: boolean;
  activo: boolean;
  auto: boolean;
}

export const calculaDigitoVerificacion = (nit: string): string => {
  if (!nit || isNaN(Number(nit))) return '';
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let suma = 0;
  const nitString = nit.toString().trim();
  for (let i = 0; i < nitString.length; i++) {
    suma += parseInt(nitString.charAt(nitString.length - 1 - i), 10) * pesos[i];
  }
  const residuo = suma % 11;
  const dv = residuo > 1 ? 11 - residuo : residuo;
  return String(dv);
};

const formatMoney = (amount: number | string | undefined): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return '$ 0';
  return `$ ${Math.round(num).toLocaleString('es-CO')}`;
};

export const ModalFacturacionDirecta: React.FC<ModalFacturacionDirectaProps> = ({
  isOpen,
  onClose,
  onFacturaGenerada,
}) => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clientes / Terceros
  const [terceros, setTerceros] = useState<TerceroItem[]>([]);
  const [selectedNit, setSelectedNit] = useState<string>('');
  const [selectedNombre, setSelectedNombre] = useState<string>('');

  // Formulario rápido nuevo cliente
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [tiposDocumento] = useState([
    { cod: '13', nombre: 'CÉDULA DE CIUDADANÍA', codShd: 'CC' },
    { cod: 'J', nombre: 'NIT PERSONA JURÍDICA', codShd: 'NIT' },
    { cod: '31', nombre: 'NIT PERSONA NATURAL', codShd: 'NIT' },
    { cod: '22', nombre: 'CÉDULA DE EXTRANJERÍA', codShd: 'CE' },
    { cod: '41', nombre: 'PASAPORTE', codShd: 'PAS' },
    { cod: '11', nombre: 'REGISTRO CIVIL', codShd: 'RC' },
    { cod: '12', nombre: 'TARJETA DE IDENTIDAD', codShd: 'TI' },
  ]);
  const [newTipoDoc, setNewTipoDoc] = useState<string>('13');
  const [newNit, setNewNit] = useState<string>('');
  const [newDv, setNewDv] = useState<string>('');
  const [newNombre, setNewNombre] = useState<string>('');
  const [newApellido1, setNewApellido1] = useState<string>('');
  const [newApellido2, setNewApellido2] = useState<string>('');
  const [newNombre1, setNewNombre1] = useState<string>('');
  const [newNombre2, setNewNombre2] = useState<string>('');
  const [newCelular, setNewCelular] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newDireccion, setNewDireccion] = useState<string>('');
  const [newCodCiu, setNewCodCiu] = useState<string>('05001');
  const [ciudades, setCiudades] = useState<CiudadItem[]>([]);

  // Listas de Precios y Artículos
  const [listasPrecios, setListasPrecios] = useState<ListaPrecioItem[]>([]);
  const [selectedLiprCod, setSelectedLiprCod] = useState<number>(1);
  const [articulos, setArticulos] = useState<ArticuloItem[]>([]);

  // Formulario agregar producto
  const [selectedArticuloCod, setSelectedArticuloCod] = useState<string>('');
  const [customDescripcion, setCustomDescripcion] = useState<string>('');
  const [customCantidad, setCustomCantidad] = useState<number>(1);
  const [customPrecio, setCustomPrecio] = useState<number>(0);
  const [customUnidad, setCustomUnidad] = useState<string>('UNIDAD');
  const [customIvaPorc, setCustomIvaPorc] = useState<number>(19);
  const [customTaivCod, setCustomTaivCod] = useState<number>(6);
  const [cartItems, setCartItems] = useState<LineaCarrito[]>([]);
  const [observaciones, setObservaciones] = useState<string>('');

  // Prefijos y Formas de Pago
  const [prefijosFactura, setPrefijosFactura] = useState<PrefijoFactura[]>([]);
  const [selectedPrefijo, setSelectedPrefijo] = useState<string>('0000');
  const [formasPago, setFormasPago] = useState<FormaPagoItem[]>([]);
  const [lineasPago, setLineasPago] = useState<LineaPago[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [activeRequestId, setActiveRequestId] = useState<string>('');

  // Impresión
  const [impresionData, setImpresionData] = useState<{ tipo: 'FACTURA' | 'REMISION'; idDoc: number } | null>(null);

  const handleResetForm = () => {
    setCartItems([]);
    setSelectedNit('');
    setSelectedNombre('');
    setObservaciones('');
    setLineasPago([]);
    setSelectedArticuloCod('');
    setCustomDescripcion('');
    setCustomCantidad(1);
    setCustomPrecio(0);
    setSearchArticuloText('');
    setShowConfirmModal(false);
    setActiveRequestId('');
    setFeedback(null);
  };

  const handleCloseModal = () => {
    handleResetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    handleResetForm();

    const token = localStorage.getItem('hotel_token');

    // 1. Cargar Terceros
    const pTerceros = fetch('/api/terceros', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTerceros(data);
      })
      .catch((e) => console.error('Error cargando terceros:', e));

    // 2. Cargar Ciudades
    const pCiudades = fetch('/api/terceros/ciudades', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCiudades(data);
      })
      .catch((e) => console.error('Error cargando ciudades:', e));

    // 3. Cargar Listas de Precios
    const pListas = fetch('/api/articulos/listas-precios', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setListasPrecios(data);
          const predet = data.find((lp: any) => lp.esPredeterminada);
          if (predet) setSelectedLiprCod(predet.liprCod);
          else setSelectedLiprCod(data[0].liprCod);
        }
      })
      .catch((e) => console.error('Error cargando listas:', e));

    // 4. Cargar Artículos (excluyendo habitaciones)
    const pArticulos = fetch('/api/articulos', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const filtered = data.filter((a: ArticuloItem) => !a.codigo.toUpperCase().startsWith('H-') && a.grinCod !== 'HAB');
          setArticulos(filtered);
        }
      })
      .catch((e) => console.error('Error cargando artículos:', e));

    // 5. Cargar Formas de Pago
    const pFormasPago = fetch('/api/abonos/formas-pago', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.formasPago || [];
        if (Array.isArray(list) && list.length > 0) {
          setFormasPago(list);
        }
      })
      .catch((e) => console.error('Error cargando formas de pago:', e));

    // 6. Cargar Prefijos
    const pPrefijos = fetch('/api/pedidos/prefijos-factura', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPrefijosFactura(data);
          const active = data.find((p: any) => p.activo);
          setSelectedPrefijo(active ? active.prefijo : data[0].prefijo);
        }
      })
      .catch((e) => console.error('Error cargando prefijos:', e));

    Promise.all([pTerceros, pCiudades, pListas, pArticulos, pFormasPago, pPrefijos]).finally(() => {
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLiprChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLipr = parseInt(e.target.value, 10) || 1;
    setSelectedLiprCod(newLipr);

    if (selectedArticuloCod) {
      const found = articulos.find((a) => a.codigo === selectedArticuloCod);
      if (found) {
        let precioFinal = found.precio;
        if (found.precios && found.precios.length > 0) {
          const precioEnLista = found.precios.find((p) => p.liprCod === newLipr);
          if (precioEnLista) precioFinal = precioEnLista.precio;
        }
        setCustomPrecio(precioFinal);
      }
    }
  };

  const [searchArticuloText, setSearchArticuloText] = useState<string>('');


  const seleccionarArticulo = (found: ArticuloItem) => {
    setSelectedArticuloCod(found.codigo);
    setCustomDescripcion(found.descripcion);
    setCustomUnidad(found.unidad || 'UNIDAD');
    setCustomIvaPorc(found.ivaPorc !== undefined && found.ivaPorc !== null ? found.ivaPorc : 0);
    setCustomTaivCod(found.taivCod || 0);

    let precioFinal = found.precio;
    if (found.precios && found.precios.length > 0) {
      const precioEnLista = found.precios.find((p) => p.liprCod === selectedLiprCod);
      if (precioEnLista) precioFinal = precioEnLista.precio;
    }
    setCustomPrecio(precioFinal);
    setCustomCantidad(1);
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
    let precioFinal = match.precio;
    if (match.precios && match.precios.length > 0) {
      const precioEnLista = match.precios.find((p) => p.liprCod === selectedLiprCod);
      if (precioEnLista && precioEnLista.precio !== undefined) {
        precioFinal = precioEnLista.precio;
      }
    }

    if (precioFinal <= 0) {
      alert(`⚠️ El artículo "${match.descripcion}" no tiene precio asignado en la lista seleccionada o su precio es $0. No se puede agregar.`);
      setSearchArticuloText('');
      return;
    }

    // Validar existencias mediante el procedimiento EXISTENCIAS_UNIDAD_BOD
    await checkArticleStockAndAlert(match.codigo, match.descripcion, match.unidad);

    // Agregar de una vez al carrito con cantidad 1 (o incrementar +1 si ya existe)
    setCartItems((prev) => {
      const existing = prev.find(
        (it) => it.articulo.toLowerCase() === match.codigo.toLowerCase() && it.lista === selectedLiprCod
      );
      if (existing) {
        return prev.map((it) =>
          it.id === existing.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      const newItem: LineaCarrito = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        articulo: match.codigo.trim() || 'GEN-01',
        descripcion: match.descripcion.trim() || match.codigo,
        cantidad: 1,
        precio: precioFinal,
        descuento: 0,
        dtoPorc: 0,
        ivaPorc: match.ivaPorc || 0,
        tiva: match.taivCod || 0,
        lista: selectedLiprCod,
        unidad: match.unidad || 'UND',
      };
      return [...prev, newItem];
    });

    setFeedback({
      type: 'success',
      message: `⚡ Producto escaneado y agregado: ${match.descripcion} (1 x ${formatMoney(precioFinal)})`,
    });
    setSearchArticuloText('');
  };

  const handleArticuloSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    setSelectedArticuloCod(cod);
    const found = articulos.find((a) => a.codigo === cod);
    if (found) {
      seleccionarArticulo(found);
    } else {
      setCustomDescripcion('');
      setCustomPrecio(0);
      setCustomCantidad(1);
      setCustomIvaPorc(0);
      setCustomTaivCod(0);
    }
  };

  const handleAddItemToCart = async () => {
    if (!selectedArticuloCod && !customDescripcion.trim()) {
      alert('Seleccione un artículo o ingrese una descripción');
      return;
    }
    if (customCantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    if (customPrecio <= 0) {
      alert('El precio del artículo debe ser mayor a cero ($0). No se pueden agregar productos con precio en cero.');
      return;
    }

    // Validar existencias mediante el procedimiento EXISTENCIAS_UNIDAD_BOD
    if (selectedArticuloCod) {
      const found = articulos.find((a) => a.codigo === selectedArticuloCod);
      await checkArticleStockAndAlert(
        selectedArticuloCod,
        customDescripcion.trim() || selectedArticuloCod,
        found?.unidad || customUnidad
      );
    }

    const newItem: LineaCarrito = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      articulo: selectedArticuloCod || 'GEN-01',
      descripcion: customDescripcion.trim() || selectedArticuloCod,
      cantidad: customCantidad,
      precio: customPrecio,
      descuento: 0,
      dtoPorc: 0,
      ivaPorc: customIvaPorc,
      tiva: customTaivCod,
      lista: selectedLiprCod,
      unidad: customUnidad,
    };

    setCartItems((prev) => [...prev, newItem]);
    setSelectedArticuloCod('');
    setCustomDescripcion('');
    setCustomPrecio(0);
    setCustomCantidad(1);
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItemCantidad = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const nuevaCant = it.cantidad + delta;
            return nuevaCant > 0 ? { ...it, cantidad: nuevaCant } : null;
          }
          return it;
        })
        .filter(Boolean) as LineaCarrito[]
    );
  };

  // Totales
  const totalPagar = cartItems.reduce((acc, it) => acc + Math.max(0, it.precio - it.descuento) * it.cantidad, 0);

  // Registro de nuevo cliente
  const handleGrabeTercero = async () => {
    if (!newTipoDoc || !newTipoDoc.trim()) {
      setClientError('El tipo de documento es obligatorio (*)');
      return;
    }
    if (!newNit || !newNit.trim()) {
      setClientError('El número de documento / NIT es obligatorio (*)');
      return;
    }

    const isJuridica = newTipoDoc.trim().toUpperCase() === 'J';
    const isNit = isJuridica || newTipoDoc.trim().toUpperCase() === 'N';
    if (isJuridica) {
      if (!newNombre.trim()) {
        setClientError('La razón social es obligatoria (*)');
        return;
      }
    } else {
      if (!newApellido1.trim()) {
        setClientError('El 1er. Apellido es obligatorio (*)');
        return;
      }
      if (!newNombre1.trim()) {
        setClientError('El 1er. Nombre es obligatorio (*)');
        return;
      }
    }

    if (!newCelular.trim()) {
      setClientError('El celular / teléfono es obligatorio (*)');
      return;
    }
    if (!newEmail.trim()) {
      setClientError('El correo electrónico es obligatorio (*)');
      return;
    }
    if (!newDireccion.trim()) {
      setClientError('La dirección es obligatoria (*)');
      return;
    }
    if (!newCodCiu.trim()) {
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

      setSelectedNit(newNit.trim());
      setSelectedNombre(calculatedName);

      // Recargar lista
      const pTerceros = await fetch('/api/terceros', { headers: { Authorization: `Bearer ${token}` } });
      const tercData = await pTerceros.json();
      if (Array.isArray(tercData)) setTerceros(tercData);

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
      setFeedback({ type: 'success', message: `✅ Cliente "${calculatedName}" registrado exitosamente.` });
    } catch (err: any) {
      setClientError(err.message || 'Error al conectar con el servidor');
    } finally {
      setSavingClient(false);
    }
  };

  // Modal de confirmación de pago y facturación
  const handleOpenFacturarModal = () => {
    if (cartItems.length === 0) {
      alert('El carrito no contiene productos para facturar');
      return;
    }
    if (!selectedNit) {
      alert('Por favor seleccione o cree un cliente para la factura');
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
    setActiveRequestId(`pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    setShowConfirmModal(true);
  };

  const handleAddLineaPago = () => {
    const defaultFp = formasPago[0]?.id || 1;
    const totalAsignado = lineasPago.reduce((acc, l) => acc + (Number(l.monto) || 0), 0);
    const faltante = Math.max(0, totalPagar - totalAsignado);
    setLineasPago((prev) => [...prev, { id: Date.now(), formaPagoId: defaultFp, monto: faltante }]);
  };

  const handleRemoveLineaPago = (id: number) => {
    setLineasPago((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLineaPago = (id: number, field: 'formaPagoId' | 'monto', val: any) => {
    setLineasPago((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: field === 'monto' ? parseFloat(val) || 0 : val } : l))
    );
  };

  const totalPagosAsignados = lineasPago.reduce((acc, l) => acc + (Number(l.monto) || 0), 0);
  const esTotalCuadrado = Math.abs(totalPagosAsignados - totalPagar) < 1;
  const diferenciaPagos = totalPagar - totalPagosAsignados;

  const handleExecuteFacturarDirecto = async () => {
    if (processing) return;
    if (!esTotalCuadrado) {
      alert('El total asignado en las formas de pago debe cuadrar exactamente con el total de la factura');
      return;
    }

    setProcessing(true);
    setFeedback(null);
    const token = localStorage.getItem('hotel_token');
    const reqId = activeRequestId || `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/pedidos/facturar-directo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clienteNit: selectedNit,
          clienteNom: selectedNombre,
          items: cartItems.map((it) => ({
            articulo: it.articulo,
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precio: it.precio,
            descuento: it.descuento,
            dtoPorc: it.dtoPorc,
            ivaPorc: it.ivaPorc,
            tiva: it.tiva,
            lista: it.lista,
            unidad: it.unidad,
          })),
          prefijo: selectedPrefijo,
          pagos: lineasPago.map((l) => ({ formaPagoId: l.formaPagoId, monto: Number(l.monto) || 0 })),
          observaciones: observaciones.trim() || undefined,
          requestId: reqId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar la factura directa');

      setShowConfirmModal(false);
      handleResetForm();

      if (onFacturaGenerada) {
        onFacturaGenerada();
      }

      if (data.idDoc) {
        setImpresionData({ tipo: 'FACTURA', idDoc: data.idDoc });
      } else {
        onClose();
      }
    } catch (err: any) {
      // Detección de error de conexión / microcorte de red / "Failed to fetch"
      const errMsg = String(err?.message || '');
      const isNetworkError =
        err?.name === 'TypeError' ||
        errMsg.toLowerCase().includes('fetch') ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('load failed');

      if (isNetworkError) {
        console.warn('Intermitencia de red detectada al facturar. Verificando si el servidor alcanzó a procesar la factura...');
        try {
          // Esperar 1.5s para que la transacción de Firebird termine de consolidarse en el backend
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const verifyRes = await fetch(
            `/api/pedidos/verificar-reciente?clienteNit=${encodeURIComponent(selectedNit)}&total=${totalPagar}&requestId=${encodeURIComponent(reqId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            if (verifyData.encontrada && verifyData.factura?.idDoc) {
              alert(`⚠️ Hubo una intermitencia de red ("Failed to fetch"), pero el servidor registró exitosamente la Factura #${verifyData.factura.numDoc || verifyData.factura.idDoc}. Se abrirá el comprobante para impresión.`);
              setShowConfirmModal(false);
              handleResetForm();
              if (onFacturaGenerada) {
                onFacturaGenerada();
              }
              setImpresionData({ tipo: 'FACTURA', idDoc: verifyData.factura.idDoc });
              return;
            }
          }
        } catch (verifyErr) {
          console.warn('Error al verificar factura reciente tras corte de red:', verifyErr);
        }
      }

      alert(err.message || 'Error al procesar la factura');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop">
        <div
          className="modal-card-dialog modal-card-large"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
        >
          {/* Overlay de Carga durante Facturación Directa */}
          {processing && (
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
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>Generando Factura Directa...</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>Por favor espere mientras se graba la venta y se sincroniza la contabilidad en Firebird.</p>
            </div>
          )}

          {/* Header del Modal */}
          <div className="modal-dialog-header">
            <div className="header-title-box">
              <h2 className="modal-dialog-title">🧾 Facturación Directa de Productos (POS)</h2>
              <span className="badge-pewe-modal">⚡ Venta Mostrador</span>
            </div>
            <button className="btn-modal-close-x" onClick={handleCloseModal} title="Cerrar ventana">
              ✕
            </button>
          </div>

          {loading ? (
            <div className="modal-loading" style={{ padding: '40px', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p>Cargando información y catálogo de artículos...</p>
            </div>
          ) : (
            <div
              className="modal-dialog-body"
              style={{
                overflowY: 'auto',
                maxHeight: 'calc(92vh - 80px)',
                paddingBottom: '20px',
              }}
            >
              {feedback && (
                <div className={`modal-action-feedback ${feedback.type}`} style={{ margin: '14px 28px 0 28px' }}>
                  <span>{feedback.message}</span>
                  <button className="btn-close-feedback" onClick={() => setFeedback(null)}>
                    ✕
                  </button>
                </div>
              )}

              <div className="modal-two-columns">
                {/* Columna Izquierda: Huésped / Cliente y Selección de Artículos */}
                <div className="modal-left-col">
                  {/* 1. Selección y Registro de Cliente */}
                  <div className="modal-form-group">
                    <div className="label-with-action">
                      <label className="modal-form-label">👤 Cliente / Tercero:</label>
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
                      <div className="quick-client-form-card" style={{ marginBottom: '14px' }}>
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
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setNewNit(val);
                                  const tipo = newTipoDoc?.trim().toUpperCase();
                                  if (tipo === 'J' || tipo === 'N') {
                                    setNewDv(calculaDigitoVerificacion(val));
                                  } else {
                                    setNewDv('');
                                  }
                                }}
                                placeholder="Ej: 1098765432"
                                required
                              />
                              {(newTipoDoc?.trim().toUpperCase() === 'J' || newTipoDoc?.trim().toUpperCase() === 'N') && (
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
                                  DV: {newDv || calculaDigitoVerificacion(newNit)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {newTipoDoc?.trim().toUpperCase() === 'J' ? (
                          <div className="modal-form-group">
                            <label className="modal-form-label">Razón Social / Nombre de la Empresa *:</label>
                            <input
                              type="text"
                              className="modal-form-input"
                              value={newNombre}
                              onChange={(e) => setNewNombre(e.target.value.toUpperCase())}
                              placeholder="Ej: INVERSIONES S.A.S."
                              required
                            />
                          </div>
                        ) : (
                          <>
                            <div className="modal-form-row">
                              <div className="modal-form-group flex-1">
                                <label className="modal-form-label">1er. Apellido *:</label>
                                <input
                                  type="text"
                                  className="modal-form-input"
                                  value={newApellido1}
                                  onChange={(e) => setNewApellido1(e.target.value.toUpperCase())}
                                  placeholder="Primer Apellido"
                                  required
                                />
                              </div>
                              <div className="modal-form-group flex-1">
                                <label className="modal-form-label">2do. Apellido:</label>
                                <input
                                  type="text"
                                  className="modal-form-input"
                                  value={newApellido2}
                                  onChange={(e) => setNewApellido2(e.target.value.toUpperCase())}
                                  placeholder="Segundo Apellido"
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
                                  onChange={(e) => setNewNombre1(e.target.value.toUpperCase())}
                                  placeholder="Primer Nombre"
                                  required
                                />
                              </div>
                              <div className="modal-form-group flex-1">
                                <label className="modal-form-label">2do. Nombre:</label>
                                <input
                                  type="text"
                                  className="modal-form-input"
                                  value={newNombre2}
                                  onChange={(e) => setNewNombre2(e.target.value.toUpperCase())}
                                  placeholder="Segundo Nombre"
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
                              placeholder="Calle 10 # 20 - 30"
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
                                  {c.nom} {c.dpto ? `(${c.dpto})` : ''}
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

                    {/* Selector de Cliente con Búsqueda por Nombre, Apellidos y NIT */}
                    {!showNewClientForm && (
                      <ClienteSearchSelect
                        clientes={terceros}
                        selectedNit={selectedNit}
                        selectedNombre={selectedNombre}
                        onSelect={(cliente) => {
                          if (cliente) {
                            setSelectedNit(cliente.nit);
                            setSelectedNombre(cliente.nombre);
                          } else {
                            setSelectedNit('');
                            setSelectedNombre('');
                          }
                        }}
                        placeholder="-- Buscar cliente por nombre, apellido o NIT/C.C. --"
                      />
                    )}
                  </div>

                  {/* 2. Catálogo y Agregar Productos */}
                  <h3 className="modal-section-subtitle" style={{ marginTop: '16px' }}>
                    📦 Seleccionar Producto para Agregar
                  </h3>

                  <div className="modal-add-item-box">
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
                          onChange={handleLiprChange}
                        >
                          {listasPrecios.map((lp) => (
                            <option key={lp.liprCod} value={lp.liprCod}>
                              {lp.nombre} {lp.esPredeterminada ? '(Pred.)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="modal-form-group">
                      <label className="modal-form-label">Descripción del Producto:</label>
                      <input
                        type="text"
                        className="modal-form-input"
                        value={customDescripcion}
                        onChange={(e) => setCustomDescripcion(e.target.value)}
                        placeholder="Descripción o nombre del producto"
                      />
                    </div>

                    <div className="modal-form-row">
                      <div className="modal-form-group flex-1">
                        <label className="modal-form-label">Precio Unit. ($):</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="modal-form-input"
                          value={customPrecio ? Number(customPrecio).toLocaleString('es-CO') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setCustomPrecio(raw ? parseInt(raw, 10) : 0);
                          }}
                          placeholder="0"
                        />
                      </div>

                      <div className="modal-form-group flex-1">
                        <label className="modal-form-label">Cantidad:</label>
                        <input
                          type="number"
                          className="modal-form-input"
                          value={customCantidad}
                          onChange={(e) => setCustomCantidad(parseInt(e.target.value, 10) || 1)}
                          min="1"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-modal-add-item"
                      onClick={handleAddItemToCart}
                      disabled={(!selectedArticuloCod && !customDescripcion.trim()) || Number(customPrecio || 0) <= 0 || Number(customCantidad || 0) <= 0}
                      title={
                        Number(customPrecio || 0) <= 0
                          ? 'El precio del artículo debe ser mayor a cero ($0) para agregar al carrito'
                          : 'Agregar producto al carrito'
                      }
                      style={{ marginTop: '4px' }}
                    >
                      ➕ Agregar Producto al Carrito
                    </button>
                  </div>

                  {/* 3. Observaciones */}
                  <div className="modal-form-group" style={{ marginTop: '16px' }}>
                    <label className="modal-form-label">Observaciones de la Factura:</label>
                    <textarea
                      className="modal-form-textarea"
                      rows={2}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Notas especiales de la venta..."
                    />
                  </div>
                </div>

                {/* Columna Derecha: Carrito de Compras */}
                <div className="modal-right-col">
                  <div className="modal-cart-card">
                    <div className="header-title-box" style={{ marginBottom: '10px' }}>
                      <h3 className="modal-section-subtitle" style={{ margin: 0 }}>
                        🛒 Carrito de Venta ({cartItems.length} {cartItems.length === 1 ? 'ítem' : 'ítems'})
                      </h3>
                      {cartItems.length > 0 && (
                        <button
                          type="button"
                          className="btn-link-action"
                          style={{ color: '#ef4444', fontSize: '12px' }}
                          onClick={() => setCartItems([])}
                        >
                          Vaciar
                        </button>
                      )}
                    </div>

                    {/* Lista de Items */}
                    <div className="modal-cart-items-wrapper" style={{ minHeight: '220px', maxHeight: '340px' }}>
                      {cartItems.length === 0 ? (
                        <div className="cart-empty-state" style={{ padding: '36px 12px', textAlign: 'center' }}>
                          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🛍️</span>
                          <p style={{ margin: 0, fontWeight: 600, color: '#64748b' }}>El carrito está vacío</p>
                          <small style={{ color: '#94a3b8' }}>
                            Seleccione productos a la izquierda para agregarlos a la venta.
                          </small>
                        </div>
                      ) : (
                        cartItems.map((item, idx) => {
                          const subtotal = item.precio * item.cantidad;

                          return (
                            <div key={item.id} className="modal-cart-item-row-interactive">
                              <div className="item-info">
                                <span className="item-title">
                                  <span className="item-number-badge">#{idx + 1}</span> {item.descripcion}
                                </span>
                                <span className="item-unit-price">
                                  {formatMoney(item.precio)} c/u
                                </span>
                              </div>

                              <div className="item-actions-box">
                                <div className="modal-stepper">
                                  <button
                                    type="button"
                                    className="stepper-btn-mini"
                                    onClick={() => handleUpdateItemCantidad(item.id, -1)}
                                  >
                                    -
                                  </button>
                                  <span className="stepper-count">{item.cantidad}</span>
                                  <button
                                    type="button"
                                    className="stepper-btn-mini"
                                    onClick={() => handleUpdateItemCantidad(item.id, 1)}
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="item-subtotal">{formatMoney(subtotal)}</span>

                                <button
                                  type="button"
                                  className="btn-remove-mini"
                                  onClick={() => handleRemoveItem(item.id)}
                                  title="Eliminar"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Resumen Total y Botón Facturar */}
                    <div className="modal-cart-totals-breakdown-card" style={{ marginTop: '12px' }}>
                      <div className="modal-cart-total-row">
                        <span className="modal-total-label">Total a pagar:</span>
                        <span className="modal-total-value">{formatMoney(totalPagar)}</span>
                      </div>
                    </div>

                    <div className="modal-cart-actions-row" style={{ marginTop: '12px' }}>
                      <button
                        type="button"
                        className="btn-modal-facturar"
                        onClick={handleOpenFacturarModal}
                        disabled={cartItems.length === 0 || !selectedNit || processing}
                      >
                        {processing ? 'Facturando en Firebird...' : `⚡ Enviar a facturar (${formatMoney(totalPagar)})`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación para Facturación y Formas de Pago */}
      {showConfirmModal && (
        <div
          className="confirm-modal-backdrop"
          onClick={() => setShowConfirmModal(false)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px' }}
          >
            <div className="confirm-modal-icon-wrapper icon-success">
              <span className="confirm-modal-symbol">🧾</span>
            </div>

            <h3 className="confirm-modal-title">🧾 Factura de Venta Directa</h3>
            <p className="confirm-modal-message">
              Revisa y confirma los datos de facturación para <strong>{selectedNombre}</strong>:
            </p>

            <div className="factura-config-grid">
              {/* Selector de Prefijo */}
              <div className="factura-field-group">
                <label className="factura-modal-label">📑 Prefijo de Facturación (Tipo 31):</label>
                <select
                  className="select-prefijo-factura"
                  value={selectedPrefijo}
                  onChange={(e) => setSelectedPrefijo(e.target.value)}
                >
                  {prefijosFactura.length > 0 ? (
                    prefijosFactura.map((p) => (
                      <option key={p.prefijo} value={p.prefijo}>
                        Prefijo: {p.prefijo} {p.actual ? `— Consecutivo Actual: ${p.actual}` : ''}{' '}
                        {p.activo ? '⭐ [Activo]' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="0000">0000 (Predeterminado)</option>
                  )}
                </select>
              </div>

              {/* Formas de Pago Múltiples */}
              <div className="formas-pago-container">
                <div className="formas-pago-header-row">
                  <label className="factura-modal-label">
                    💳 Formas de Pago ({lineasPago.length}):
                  </label>
                  <button type="button" className="btn-add-forma-pago" onClick={handleAddLineaPago}>
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
                        onChange={(e) => handleUpdateLineaPago(linea.id, 'formaPagoId', parseInt(e.target.value, 10))}
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
                            handleUpdateLineaPago(linea.id, 'monto', raw ? parseFloat(raw) : 0);
                          }}
                        />
                      </div>

                      {lineasPago.length > 1 ? (
                        <button
                          type="button"
                          className="btn-remove-linea-pago"
                          onClick={() => handleRemoveLineaPago(linea.id)}
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

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-confirm-cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={processing}
              >
                ✕ Volver / Cancelar
              </button>
              <button
                type="button"
                className="btn-confirm-action btn-confirm-success"
                onClick={handleExecuteFacturarDirecto}
                disabled={!esTotalCuadrado || processing}
              >
                {processing ? '⏳ Generando Factura...' : '🧾 Generar Factura de Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impresión POS */}
      {impresionData && (
        <ModalImpresionPOS
          tipoDoc={impresionData.tipo}
          idDoc={impresionData.idDoc}
          onClose={() => {
            setImpresionData(null);
            handleCloseModal();
          }}
        />
      )}
    </>
  );
};

export default ModalFacturacionDirecta;
