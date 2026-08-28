import React, { useState, useEffect } from 'react';
import { ModalImpresionPOS } from './ModalImpresionPOS';

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

export const ModalFacturacionDirecta: React.FC<ModalFacturacionDirectaProps> = ({
  isOpen,
  onClose,
  onFacturaGenerada,
}) => {
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clientes / Terceros
  const [terceros, setTerceros] = useState<TerceroItem[]>([]);
  const [selectedNit, setSelectedNit] = useState<string>('');
  const [selectedNombre, setSelectedNombre] = useState<string>('');
  const [searchTercero, setSearchTercero] = useState<string>('');

  // Formulario nuevo cliente
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [tiposDoc] = useState([
    { cod: '13', nom: '13 - Cédula de Ciudadanía' },
    { cod: 'J', nom: 'J - NIT PERSONA JURIDICA - 31' },
    { cod: '31', nom: '31 - NIT PERSONA NATURAL' },
    { cod: '22', nom: '22 - Cédula de Extranjería' },
    { cod: '41', nom: '41 - Pasaporte' },
    { cod: '11', nom: '11 - Registro Civil' },
    { cod: '12', nom: '12 - Tarjeta de Identidad' },
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

  // Carrito de productos
  const [selectedArticuloCod, setSelectedArticuloCod] = useState<string>('');
  const [customDescripcion, setCustomDescripcion] = useState<string>('');
  const [customCantidad, setCustomCantidad] = useState<number>(1);
  const [customPrecio, setCustomPrecio] = useState<number>(0);
  const [customDescuento, setCustomDescuento] = useState<number>(0);
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

  // Impresión
  const [impresionData, setImpresionData] = useState<{ tipo: 'FACTURA' | 'REMISION'; idDoc: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setCartItems([]);
    setObservaciones('');

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
          // Filtrar artículos que no sean habitaciones (H-*)
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

    Promise.all([pTerceros, pCiudades, pListas, pArticulos, pFormasPago, pPrefijos]);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrado de Terceros para el selector
  const filteredTerceros = searchTercero
    ? terceros.filter(
      (t) =>
        t.nombre.toLowerCase().includes(searchTercero.toLowerCase()) ||
        t.nit.toLowerCase().includes(searchTercero.toLowerCase())
    )
    : terceros;

  const handleTerceroSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nit = e.target.value;
    setSelectedNit(nit);
    const found = terceros.find((t) => t.nit === nit);
    if (found) {
      setSelectedNombre(found.nombre);
    } else {
      setSelectedNombre('');
    }
  };

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

  const handleArticuloSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    setSelectedArticuloCod(cod);
    const found = articulos.find((a) => a.codigo === cod);
    if (found) {
      setCustomDescripcion(found.descripcion);
      setCustomUnidad(found.unidad || 'UNIDAD');
      setCustomIvaPorc(found.ivaPorc ?? 19);
      setCustomTaivCod(found.taivCod || 6);

      let precioFinal = found.precio;
      if (found.precios && found.precios.length > 0) {
        const precioEnLista = found.precios.find((p) => p.liprCod === selectedLiprCod);
        if (precioEnLista) precioFinal = precioEnLista.precio;
      }
      setCustomPrecio(precioFinal);
      setCustomDescuento(0);
      setCustomCantidad(1);
    } else {
      setCustomDescripcion('');
      setCustomPrecio(0);
      setCustomDescuento(0);
      setCustomCantidad(1);
    }
  };

  const handleAddItemToCart = () => {
    if (!selectedArticuloCod && !customDescripcion.trim()) {
      alert('Seleccione un artículo o ingrese una descripción');
      return;
    }
    if (customCantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    if (customPrecio < 0) {
      alert('El precio no puede ser negativo');
      return;
    }

    const dto = Math.max(0, Number(customDescuento) || 0);
    const dtoPorc = customPrecio > 0 ? (dto / customPrecio) * 100 : 0;

    const newItem: LineaCarrito = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      articulo: selectedArticuloCod || 'GEN-01',
      descripcion: customDescripcion.trim() || selectedArticuloCod,
      cantidad: customCantidad,
      precio: customPrecio,
      descuento: dto,
      dtoPorc,
      ivaPorc: customIvaPorc,
      tiva: customTaivCod,
      lista: selectedLiprCod,
      unidad: customUnidad,
    };

    setCartItems((prev) => [...prev, newItem]);
    setSelectedArticuloCod('');
    setCustomDescripcion('');
    setCustomPrecio(0);
    setCustomDescuento(0);
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
  const handleGrabeTercero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipoDoc || !newTipoDoc.trim()) {
      setClientError('El tipo de documento es obligatorio (*)');
      return;
    }
    if (!newNit || !newNit.trim()) {
      setClientError('El número de documento / NIT es obligatorio (*)');
      return;
    }

    const isJuridica = newTipoDoc.trim().toUpperCase() === 'J';
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
            dv: newDv || calculaDigitoVerificacion(newNit),
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
    if (!esTotalCuadrado) {
      alert('El total asignado en las formas de pago debe cuadrar exactamente con el total de la factura');
      return;
    }

    setProcessing(true);
    setFeedback(null);
    const token = localStorage.getItem('hotel_token');

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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar la factura directa');

      setShowConfirmModal(false);
      setFeedback({
        type: 'success',
        message: `🎉 ¡Factura de Venta #${data.numDoc || ''} generada exitosamente!`,
      });
      setCartItems([]);
      setObservaciones('');

      if (data.idDoc) {
        setImpresionData({ tipo: 'FACTURA', idDoc: data.idDoc });
      }

      if (onFacturaGenerada) {
        onFacturaGenerada();
      }
    } catch (err: any) {
      alert(err.message || 'Error al procesar la factura');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div>
              <h2 className="modal-title">🧾 Facturación Directa de Productos (POS)</h2>
              <p className="modal-subtitle">Facturación rápida de mostrador sin reserva de habitación</p>
            </div>
            <button className="modal-close-btn" onClick={onClose} title="Cerrar ventana">
              ✕
            </button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`modal-feedback-banner feedback-${feedback.type}`}>
              {feedback.message}
              <button className="feedback-close-btn" onClick={() => setFeedback(null)}>
                ✕
              </button>
            </div>
          )}

          {/* Body */}
          <div className="modal-content-grid">
            {/* Columna Izquierda: Cliente y Selección de Productos */}
            <div className="modal-col-left">
              {/* Sección Cliente */}
              <div className="modal-section-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="modal-section-title" style={{ margin: 0 }}>
                    👤 Cliente / Tercero:
                  </label>
                  <button
                    type="button"
                    className="btn-link-action"
                    onClick={() => setShowNewClientForm(!showNewClientForm)}
                  >
                    {showNewClientForm ? '✕ Cancelar nuevo cliente' : '+ Grabar nuevo cliente'}
                  </button>
                </div>

                {/* Formulario Inline para Grabar Nuevo Cliente */}
                {showNewClientForm && (
                  <form onSubmit={handleGrabeTercero} className="new-client-inline-form" style={{ marginBottom: '14px' }}>
                    <div className="client-form-header">
                      <span className="client-form-badge">➕ Registro Rápido de Tercero</span>
                      {clientError && <div className="client-error-banner">{clientError}</div>}
                    </div>

                    <div className="modal-form-row">
                      <div className="modal-form-group flex-1">
                        <label className="modal-form-label">Tipo Doc (*):</label>
                        <select
                          className="modal-form-select"
                          value={newTipoDoc}
                          onChange={(e) => setNewTipoDoc(e.target.value)}
                        >
                          {tiposDoc.map((td) => (
                            <option key={td.cod} value={td.cod}>
                              {td.nom}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="modal-form-group flex-1">
                        <label className="modal-form-label">Número / NIT (*):</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="text"
                            className="modal-form-input"
                            value={newNit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setNewNit(val);
                              setNewDv(calculaDigitoVerificacion(val));
                            }}
                            placeholder="Ej: 1098765432"
                            required
                          />
                          {newTipoDoc === 'J' && (
                            <input
                              type="text"
                              className="modal-form-input readonly-input-field"
                              style={{ width: '45px', textAlign: 'center', fontWeight: 'bold' }}
                              value={newDv || calculaDigitoVerificacion(newNit)}
                              readOnly
                              title="Dígito de Verificación DIAN"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {newTipoDoc === 'J' ? (
                      <div className="modal-form-group">
                        <label className="modal-form-label">Razón Social (*):</label>
                        <input
                          type="text"
                          className="modal-form-input"
                          value={newNombre}
                          onChange={(e) => setNewNombre(e.target.value.toUpperCase())}
                          placeholder="Nombre de la empresa o entidad"
                          required
                        />
                      </div>
                    ) : (
                      <>
                        <div className="modal-form-row">
                          <div className="modal-form-group flex-1">
                            <label className="modal-form-label">1er. Apellido (*):</label>
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
                            <label className="modal-form-label">1er. Nombre (*):</label>
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
                        <label className="modal-form-label">Celular / Teléfono (*):</label>
                        <input
                          type="text"
                          className="modal-form-input"
                          value={newCelular}
                          onChange={(e) => setNewCelular(e.target.value)}
                          placeholder="Ej: 3001234567"
                          required
                        />
                      </div>
                      <div className="modal-form-group flex-1">
                        <label className="modal-form-label">Email (*):</label>
                        <input
                          type="email"
                          className="modal-form-input"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="cliente@correo.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="modal-form-row">
                      <div className="modal-form-group flex-1">
                        <label className="modal-form-label">Dirección (*):</label>
                        <input
                          type="text"
                          className="modal-form-input"
                          value={newDireccion}
                          onChange={(e) => setNewDireccion(e.target.value)}
                          placeholder="Ej: Calle 10 # 20 - 30"
                          required
                        />
                      </div>
                      <div className="modal-form-group flex-1">
                        <label className="modal-form-label">Ciudad (*):</label>
                        <select
                          className="modal-form-select"
                          value={newCodCiu}
                          onChange={(e) => setNewCodCiu(e.target.value)}
                          required
                        >
                          {ciudades.map((c) => (
                            <option key={c.cod} value={c.cod}>
                              {c.nom} {c.dpto ? `- ${c.dpto}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="client-form-actions">
                      <button type="button" className="btn-secondary-outline" onClick={() => setShowNewClientForm(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn-primary-action" disabled={savingClient}>
                        {savingClient ? '⏳ Guardando...' : '💾 Guardar Cliente'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Selector de Tercero */}
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="modal-form-input"
                    placeholder="🔍 Buscar cliente por nombre o documento..."
                    value={searchTercero}
                    onChange={(e) => setSearchTercero(e.target.value)}
                    style={{ marginBottom: '6px' }}
                  />
                  <select
                    className="modal-form-select"
                    value={selectedNit}
                    onChange={handleTerceroSelect}
                    style={{ fontWeight: selectedNit ? 600 : 'normal' }}
                  >
                    <option value="">-- Seleccione un cliente --</option>
                    {filteredTerceros.map((t) => (
                      <option key={t.nit} value={t.nit}>
                        {t.nombre} ({t.nit})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedNit && (
                  <div className="selected-client-badge">
                    <span>👤 <strong>{selectedNombre}</strong> (NIT/C.C.: {selectedNit})</span>
                  </div>
                )}
              </div>

              {/* Selector de Artículos y Lista de Precios */}
              <div className="modal-section-card" style={{ marginTop: '12px' }}>
                <h3 className="modal-section-title">📦 Agregar Productos a la Venta</h3>

                <div className="modal-form-row">
                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Lista de Precios:</label>
                    <select
                      className="modal-form-select"
                      value={selectedLiprCod}
                      onChange={handleLiprChange}
                    >
                      {listasPrecios.map((lp) => (
                        <option key={lp.liprCod} value={lp.liprCod}>
                          {lp.nombre} {lp.esPredeterminada ? '(Predeterminada)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-form-group flex-2">
                    <label className="modal-form-label">Catálogo de Artículos:</label>
                    <select
                      className="modal-form-select"
                      value={selectedArticuloCod}
                      onChange={handleArticuloSelect}
                    >
                      <option value="">-- Seleccione un producto o ingrese manual --</option>
                      {articulos.map((a) => (
                        <option key={a.codigo} value={a.codigo}>
                          {a.descripcion} ({a.codigo}) - ${Number(a.precio).toLocaleString('es-CO')}
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
                    placeholder="Descripción o nombre del producto..."
                  />
                </div>

                <div className="modal-form-row">
                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Precio Unitario ($):</label>
                    <input
                      type="number"
                      className="modal-form-input"
                      value={customPrecio || ''}
                      onChange={(e) => setCustomPrecio(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="modal-form-group flex-1">
                    <label className="modal-form-label">Descuento Unit. ($):</label>
                    <input
                      type="number"
                      className="modal-form-input"
                      value={customDescuento || ''}
                      onChange={(e) => setCustomDescuento(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
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
                  className="btn-primary-action"
                  style={{ width: '100%', marginTop: '8px', padding: '10px' }}
                  onClick={handleAddItemToCart}
                >
                  ➕ Agregar al Carrito
                </button>
              </div>
            </div>

            {/* Columna Derecha: Carrito de Compras y Facturación */}
            <div className="modal-col-right">
              <div className="modal-section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 className="modal-section-title" style={{ margin: 0 }}>
                    🛒 Carrito de Venta ({cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'})
                  </h3>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      className="btn-link-action"
                      style={{ color: '#ef4444' }}
                      onClick={() => setCartItems([])}
                    >
                      Vaciar Carrito
                    </button>
                  )}
                </div>

                {/* Items del Carrito */}
                <div className="cart-items-scroll-area" style={{ flex: 1, minHeight: '220px', maxHeight: '340px', overflowY: 'auto' }}>
                  {cartItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🛍️</span>
                      <p style={{ margin: 0, fontWeight: 500 }}>El carrito está vacío</p>
                      <small>Selecciona productos a la izquierda para agregarlos a la venta directa.</small>
                    </div>
                  ) : (
                    cartItems.map((it, idx) => {
                      const netoUnit = Math.max(0, it.precio - it.descuento);
                      const subtotalItem = netoUnit * it.cantidad;

                      return (
                        <div key={it.id} className="cart-item-row">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              #{idx + 1} {it.descripcion}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                              ${it.precio.toLocaleString('es-CO')} c/u
                              {it.descuento > 0 && (
                                <span style={{ color: '#16a34a', fontWeight: 'bold', marginLeft: '6px' }}>
                                  (Dto: ${it.descuento.toLocaleString('es-CO')})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Control de Cantidad */}
                          <div className="cart-item-qty-controls">
                            <button
                              type="button"
                              className="btn-qty"
                              onClick={() => handleUpdateItemCantidad(it.id, -1)}
                            >
                              -
                            </button>
                            <span className="qty-number">{it.cantidad}</span>
                            <button
                              type="button"
                              className="btn-qty"
                              onClick={() => handleUpdateItemCantidad(it.id, 1)}
                            >
                              +
                            </button>
                          </div>

                          {/* Subtotal y Borrar */}
                          <div style={{ textAlign: 'right', minWidth: '90px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              ${subtotalItem.toLocaleString('es-CO')}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn-remove-item"
                            onClick={() => handleRemoveItem(it.id)}
                            title="Eliminar producto"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Observaciones */}
                <div style={{ marginTop: '12px' }}>
                  <label className="modal-form-label">Observaciones de la Factura:</label>
                  <input
                    type="text"
                    className="modal-form-input"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas o concepto de la venta..."
                  />
                </div>

                {/* Resumen Total */}
                <div className="cart-total-banner" style={{ marginTop: '12px' }}>
                  <span className="cart-total-label">Total a Pagar:</span>
                  <span className="cart-total-amount">${totalPagar.toLocaleString('es-CO')}</span>
                </div>

                {/* Botón Facturar */}
                <button
                  type="button"
                  className="btn-confirm-success"
                  style={{ width: '100%', marginTop: '12px', padding: '14px', fontSize: '1.05rem' }}
                  disabled={cartItems.length === 0 || !selectedNit || processing}
                  onClick={handleOpenFacturarModal}
                >
                  ⚡ Enviar a Facturar (${totalPagar.toLocaleString('es-CO')})
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary-outline" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación y Formas de Pago */}
      {showConfirmModal && (
        <div className="modal-backdrop modal-backdrop-confirm" style={{ zIndex: 1100 }}>
          <div className="modal-container confirm-modal-container" style={{ maxWidth: '560px' }}>
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-badge icon-badge-success">🧾</div>
              <h3 className="confirm-modal-title">Factura de Venta Directa</h3>
              <p className="confirm-modal-message">
                Confirma el prefijo y las formas de pago para <strong>{selectedNombre}</strong>:
              </p>
            </div>

            <div className="confirm-modal-body">
              {/* Prefijo */}
              <div className="modal-form-group" style={{ marginBottom: '14px' }}>
                <label className="modal-form-label">📄 Prefijo de Facturación (Tipo 31):</label>
                <select
                  className="modal-form-select"
                  value={selectedPrefijo}
                  onChange={(e) => setSelectedPrefijo(e.target.value)}
                >
                  {prefijosFactura.map((p) => (
                    <option key={p.prefijo} value={p.prefijo}>
                      Prefijo: {p.prefijo} — Consecutivo Actual: {p.actual} {p.activo ? '⭐ [Activo]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Formas de Pago */}
              <div className="modal-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="modal-form-label" style={{ margin: 0 }}>
                    💳 Formas de Pago ({lineasPago.length}):
                  </label>
                  <button type="button" className="btn-link-action" onClick={handleAddLineaPago}>
                    + Agregar forma de pago
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lineasPago.map((linea, idx) => (
                    <div key={linea.id} className="pago-row">
                      <span className="pago-item-badge">#{idx + 1}</span>
                      <select
                        className="modal-form-select flex-1"
                        value={linea.formaPagoId}
                        onChange={(e) => handleUpdateLineaPago(linea.id, 'formaPagoId', parseInt(e.target.value, 10))}
                      >
                        {formasPago.map((fp) => (
                          <option key={fp.id} value={fp.id}>
                            {fp.nombre}
                          </option>
                        ))}
                      </select>

                      <div className="pago-monto-input-wrapper flex-1">
                        <span className="currency-symbol">$</span>
                        <input
                          type="number"
                          className="modal-form-input"
                          placeholder="0"
                          value={linea.monto === 0 ? '' : linea.monto}
                          onChange={(e) => handleUpdateLineaPago(linea.id, 'monto', e.target.value)}
                        />
                      </div>

                      {lineasPago.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-linea-pago"
                          onClick={() => handleRemoveLineaPago(linea.id)}
                          title="Eliminar forma de pago"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tarjeta de Balance */}
                <div className={`pago-balance-card ${esTotalCuadrado ? 'balance-ok' : 'balance-mismatch'}`} style={{ marginTop: '12px' }}>
                  <div className="balance-item">
                    <span>Total Factura:</span>
                    <strong>${totalPagar.toLocaleString('es-CO')}</strong>
                  </div>
                  <div className="balance-item">
                    <span>Total Pagos:</span>
                    <strong>${totalPagosAsignados.toLocaleString('es-CO')}</strong>
                  </div>
                  <div className="balance-item">
                    <span>Balance:</span>
                    <strong>
                      {esTotalCuadrado
                        ? '✅ Cuadrado exacto'
                        : diferenciaPagos > 0
                          ? `⚠️ Faltan $${diferenciaPagos.toLocaleString('es-CO')}`
                          : `⚠️ Excede en $${Math.abs(diferenciaPagos).toLocaleString('es-CO')}`}
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
          onClose={() => setImpresionData(null)}
        />
      )}
    </>
  );
};

export default ModalFacturacionDirecta;
