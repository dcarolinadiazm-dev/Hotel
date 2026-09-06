import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface ClienteItem {
  nit: string;
  nombre: string;
  dv?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

interface ClienteSearchSelectProps {
  clientes: ClienteItem[];
  selectedNit: string;
  selectedNombre?: string;
  onSelect: (cliente: ClienteItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

// Normaliza texto eliminando tildes y caracteres diacríticos para búsqueda insensible a acentos y mayúsculas
const normalizeText = (text: string): string => {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const ClienteSearchSelect: React.FC<ClienteSearchSelectProps> = ({
  clientes,
  selectedNit,
  selectedNombre,
  onSelect,
  placeholder = '-- Buscar por nombre, apellido o NIT/C.C. --',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Cliente actualmente seleccionado en la lista o fallback
  const currentSelected = useMemo(() => {
    if (!selectedNit) return null;
    const found = clientes.find((c) => String(c.nit).trim() === String(selectedNit).trim());
    if (found) return found;
    if (selectedNombre) {
      return {
        nit: selectedNit,
        nombre: selectedNombre,
      };
    }
    return { nit: selectedNit, nombre: selectedNit };
  }, [clientes, selectedNit, selectedNombre]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofoco en el input de búsqueda al abrir el dropdown
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filtrado de clientes: Busca en cualquier posición tokens de nombres, apellidos y nit
  const filteredClientes = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) {
      // Si no hay término, mostrar los primeros 60 clientes
      return clientes.slice(0, 60);
    }

    const tokens = normalizeText(term).split(/\s+/).filter((t) => t.length > 0);
    const cleanTermDigits = term.replace(/\D/g, '');

    const matches: Array<{ item: ClienteItem; score: number }> = [];

    for (const c of clientes) {
      const normNombre = normalizeText(c.nombre);
      const normNit = normalizeText(c.nit);
      const fullSearchable = `${normNit} ${normNombre}`;

      // Verificar que CADA token ingresado exista en alguna posición del nombre o NIT
      const allTokensMatch = tokens.every((token) => fullSearchable.includes(token));

      if (allTokensMatch) {
        // Puntuación de relevancia para ordenar los resultados
        let score = 0;

        // 1. Coincidencia exacta de NIT (máxima prioridad)
        if (normNit === normNit.trim() && (normNit === term || (cleanTermDigits && normNit === cleanTermDigits))) {
          score += 1000;
        } else if (normNit.startsWith(term) || (cleanTermDigits && normNit.startsWith(cleanTermDigits))) {
          score += 500;
        }

        // 2. Coincidencia al inicio del nombre
        if (normNombre.startsWith(term)) {
          score += 300;
        }

        // 3. Coincidencia exacta de alguna palabra completa en el nombre (ej. apellido exacto)
        const palabras = normNombre.split(/\s+/);
        for (const token of tokens) {
          if (palabras.some((p) => p === token)) {
            score += 100;
          } else if (palabras.some((p) => p.startsWith(token))) {
            score += 40;
          }
        }

        matches.push({ item: c, score });
      }
    }

    // Ordenar por score descendente y limitar a 80 para un renderizado ultra-rápido
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 80).map((m) => m.item);
  }, [clientes, searchTerm]);

  // Reset index al cambiar resultados
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredClientes]);

  // Scroll automático en teclado
  useEffect(() => {
    if (listRef.current && listRef.current.children[highlightedIndex]) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = (cliente: ClienteItem) => {
    onSelect(cliente);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredClientes.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredClientes[highlightedIndex]) {
        handleSelect(filteredClientes[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div
      ref={containerRef}
      className="cliente-search-select-container"
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
      }}
    >
      {/* Botón / Gatillo de Selección */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          background: disabled ? '#f1f5f9' : '#ffffff',
          border: isOpen ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          minHeight: '38px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          <span style={{ fontSize: '15px' }}>👤</span>
          {currentSelected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  maxWidth: '380px',
                }}
              >
                {currentSelected.nombre}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  border: '1px solid #bae6fd',
                }}
              >
                NIT/C.C: {currentSelected.nit}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          {currentSelected && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Quitar cliente seleccionado"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            >
              ✕
            </button>
          )}
          <span
            style={{
              fontSize: '10px',
              color: '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Barra de Búsqueda Integrada */}
          <div
            style={{
              padding: '10px 12px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#64748b' }}>🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por nombre, apellidos o número de documento..."
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '13px',
                outline: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 500,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
              {filteredClientes.length} coincidencia{filteredClientes.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Lista de Resultados */}
          <ul
            ref={listRef}
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              margin: 0,
              padding: '4px 0',
              listStyle: 'none',
            }}
          >
            {filteredClientes.length === 0 ? (
              <li
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#64748b',
                }}
              >
                No se encontró ningún cliente con: "<strong>{searchTerm}</strong>"
              </li>
            ) : (
              filteredClientes.map((cliente, idx) => {
                const isSelected = currentSelected && String(currentSelected.nit).trim() === String(cliente.nit).trim();
                const isHighlighted = highlightedIndex === idx;

                return (
                  <li
                    key={cliente.nit}
                    onClick={() => handleSelect(cliente)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isSelected
                        ? '#eff6ff'
                        : isHighlighted
                        ? '#f8fafc'
                        : 'transparent',
                      borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                      transition: 'background 0.1s ease',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? '#1d4ed8' : '#1e293b',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {cliente.nombre}
                      </span>
                      {cliente.direccion && (
                        <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          📍 {cliente.direccion}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: isSelected ? '#dbeafe' : '#f1f5f9',
                          color: isSelected ? '#1e40af' : '#475569',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {cliente.nit}
                      </span>
                      {isSelected && <span style={{ color: '#2563eb', fontWeight: 800, fontSize: '14px' }}>✓</span>}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
