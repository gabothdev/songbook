import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Check, Search } from 'lucide-react';
import { config } from '../../../config';

/**
 * Componente interactivo de autocompletado y sugerencia de artistas
 */
export default function ArtistAutocompleteInput({
  value,
  onChange,
  onSelectArtist,
  onAddCustom,
  placeholder = 'Escribe el nombre de un artista...',
  buttonLabel = 'Añadir',
  existingNames = [],
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Consultar artistas en la base de datos
  const fetchSuggestions = useCallback(async (q) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/artists/suggest?q=${encodeURIComponent(q || '')}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data || []);
      }
    } catch (e) {
      console.warn('Error fetching artist suggestions:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 150);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (suggestions.length === 0) {
      fetchSuggestions(value);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        fetchSuggestions(value);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else if (value.trim()) {
        handleCustomSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (artist) => {
    if (onSelectArtist) {
      onSelectArtist(artist);
    }
    onChange(artist.name);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (!value.trim()) return;
    if (onAddCustom) {
      onAddCustom(value.trim());
    }
    setIsOpen(false);
  };

  // Filtrar sugerencias que ya estén asignadas si se proporcionó la lista
  const filteredSuggestions = suggestions.filter((s) => !existingNames.includes(s.name.toLowerCase()));

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleCustomSubmit}
          disabled={!value.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-cyan-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{buttonLabel}</span>
        </button>
      </div>

      {/* Menú flotante de autocompletado */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-stone-900 border border-stone-700/80 rounded-xl shadow-2xl divide-y divide-stone-800/60 font-sans">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((artist, idx) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => handleSelect(artist)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition cursor-pointer ${
                  activeIndex === idx ? 'bg-cyan-950/60 text-cyan-300' : 'text-stone-300 hover:bg-stone-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-6 h-6 rounded-full object-cover border border-stone-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-[10px] text-stone-400 flex-shrink-0 font-bold">
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <span className="font-semibold text-white">{artist.name}</span>
                    {artist._count?.songs !== undefined && (
                      <span className="ml-2 text-[10px] text-stone-500">
                        {artist._count.songs} {artist._count.songs === 1 ? 'canción' : 'canciones'}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-cyan-400 font-medium">Seleccionar</span>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-stone-500">
              {isLoading ? 'Buscando artistas...' : 'No se encontraron artistas existentes.'}
              {value.trim() && (
                <div className="mt-1.5 pt-1.5 border-t border-stone-800">
                  <span className="text-[11px] text-stone-400">Presiona Enter o "Añadir" para crearlo.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
