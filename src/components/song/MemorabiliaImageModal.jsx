import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Upload,
  Link as LinkIcon,
  Check,
  Sparkles,
  Camera,
  Disc,
  Trash2,
  RefreshCw,
  Move,
  ZoomIn,
  RotateCcw,
  ClipboardPaste,
  Filter,
} from 'lucide-react';
import {
  searchAlbumArtworkOptions,
  searchArtistPhotoOptions,
  parseImageFraming,
  serializeImageFraming,
} from '../../services/artworkService';
import ArtistPolaroid from './ArtistPolaroid';
import SongReleaseArtifact from './SongReleaseArtifact';

const VERSION_TYPE_OPTIONS = [
  { id: 'studio', label: 'Estudio', icon: '💿', artifact: 'cd-2.svg' },
  { id: 'acoustic', label: 'Acústico', icon: '🪕', artifact: 'cd-2.svg' },
  { id: 'live', label: 'En Vivo', icon: '🎙️', artifact: 'ticket.svg' },
  { id: 'soundtrack', label: 'Película', icon: '🎬', artifact: 'movie.svg' },
  { id: 'session', label: 'Sesión', icon: '📻', artifact: 'movie.svg' },
];

/**
 * MemorabiliaImageModal Component (Split-View Studio)
 * 
 * Features:
 * 1. Split-View Layout:
 *    - Left Panel: Multi-source search (Deezer, iTunes, Cover Art, Wikipedia) with source filter chips,
 *      URL pasting, file upload, and direct Ctrl+V clipboard pasting.
 *    - Right Panel: Live interactive Polaroid, CD, Ticket or Movie frame preview with tactile drag-to-pan & zoom slider.
 * 2. Version & Album Metadata:
 *    - Switch between Studio (CD), Live (Ticket), Movie (Film) and Session.
 *    - Editable Album / Soundtrack name, release year and custom context notes.
 * 3. Precision Framing:
 *    - Drag directly on the preview photo to center faces or artwork.
 *    - Zoom slider from 1.0x to 2.5x with instant live updates.
 *    - Preserves remote URL and saves framing metadata { url, zoom, x, y }.
 */
export default function MemorabiliaImageModal({
  isOpen = false,
  onClose,
  type = 'artist', // 'artist' | 'disc'
  currentImage = null,
  artistName = '',
  songTitle = '',
  albumName = '',
  releaseYear = null,
  versionType = 'studio',
  versionDetails = '',
  onSave,
}) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'url' | 'upload'
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Framing and selection state
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Version and metadata state
  const [versionTypeState, setVersionTypeState] = useState(versionType || 'studio');
  const [albumNameState, setAlbumNameState] = useState(albumName || '');
  const [releaseYearState, setReleaseYearState] = useState(releaseYear ? String(releaseYear) : '');
  const [versionDetailsState, setVersionDetailsState] = useState(versionDetails || '');

  // Drag-to-pan interaction
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  const isArtist = type === 'artist';

  // Available search sources
  const SOURCE_OPTIONS = useMemo(() => {
    const list = [
      { id: 'all', label: 'Todas', icon: '🌐' },
      { id: 'deezer', label: 'Deezer', icon: '🎵', badge: '1000px' },
      { id: 'itunes', label: 'Apple Music', icon: '🍎' },
      { id: 'wikipedia', label: 'Wikipedia', icon: '📖' },
    ];
    if (!isArtist) {
      list.push({ id: 'coverart', label: 'Cover Art Archive', icon: '💿' });
    }
    return list;
  }, [isArtist]);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      const framing = parseImageFraming(currentImage);
      setSelectedUrl(framing.url);
      setZoom(framing.zoom || 1);
      setPanX(framing.x || 0);
      setPanY(framing.y || 0);
      setUrlInput(framing.url || '');
      setVersionTypeState(versionType || 'studio');
      setAlbumNameState(albumName || '');
      setReleaseYearState(releaseYear ? String(releaseYear) : '');
      setVersionDetailsState(versionDetails || '');

      const defaultQuery = isArtist 
        ? artistName 
        : albumNameState || `${artistName} ${songTitle}`;
      setSearchQuery(defaultQuery);
      setSelectedSource('all');
      fetchSuggestions(defaultQuery, 'all');
    }
  }, [isOpen, type, currentImage, artistName, songTitle, albumName, releaseYear, versionType, versionDetails]);

  // Global Ctrl + V clipboard paste handler
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setSelectedUrl(ev.target.result);
              setZoom(1);
              setPanX(0);
              setPanY(0);
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }

      const text = e.clipboardData?.getData('text');
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setSelectedUrl(text.trim());
        setUrlInput(text.trim());
        setZoom(1);
        setPanX(0);
        setPanY(0);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const fetchSuggestions = async (query = searchQuery, source = selectedSource) => {
    if (!query) return;
    setIsLoading(true);
    try {
      if (isArtist) {
        const results = await searchArtistPhotoOptions(query, source);
        setSuggestions(results);
      } else {
        const results = await searchAlbumArtworkOptions(artistName, songTitle || query, source);
        setSuggestions(results);
      }
    } catch (err) {
      console.warn('[MemorabiliaImageModal] Error loading suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSource = (sourceId) => {
    setSelectedSource(sourceId);
    fetchSuggestions(searchQuery, sourceId);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedUrl(event.target.result);
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };
    reader.readAsDataURL(file);
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panX,
      initialPanY: panY,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    // Scale factor adjusted for SVG coordinate space
    const factor = isArtist ? 1.0 : 3.5;
    setPanX(Math.round(dragStartRef.current.initialPanX + dx * factor));
    setPanY(Math.round(dragStartRef.current.initialPanY + dy * factor));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.min(2.5, Math.max(1, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleResetFraming = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleConfirm = () => {
    const payload = selectedUrl ? serializeImageFraming({
      url: selectedUrl,
      zoom,
      x: panX,
      y: panY,
    }) : null;

    if (isArtist) {
      onSave(payload);
    } else {
      onSave({
        framedString: payload,
        url: selectedUrl,
        zoom,
        x: panX,
        y: panY,
        album: albumNameState.trim() || null,
        releaseYear: releaseYearState ? (parseInt(releaseYearState, 10) || null) : null,
        versionType: versionTypeState || 'studio',
        versionDetails: versionDetailsState.trim() || null,
      });
    }
    onClose();
  };

  const handleRemove = () => {
    onSave(null);
    onClose();
  };

  // Live framed image object for the right-hand preview
  const liveFramedImage = useMemo(() => {
    if (!selectedUrl) return null;
    return {
      url: selectedUrl,
      zoom,
      x: panX,
      y: panY,
    };
  }, [selectedUrl, zoom, panX, panY]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-5xl bg-[#241c16] border border-[#44332a] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-200 max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
                {isArtist ? <Camera className="w-5 h-5" /> : <Disc className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-serif font-black text-sm sm:text-base text-stone-100 flex items-center gap-2">
                  <span>{isArtist ? 'Estudio de Foto Polaroid' : 'Estudio de Carátula de Disco'}</span>
                  <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Multifuente
                  </span>
                </h3>
                <p className="text-xs text-stone-400 font-sans">
                  {isArtist ? artistName : `${artistName} • ${songTitle}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-400 font-sans bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700/60">
                <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                <span>Pega imágenes con <kbd className="font-mono bg-stone-700 px-1 rounded text-stone-200">Ctrl+V</kbd></span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body: Split View (Left: Search & Sources, Right: Live Framing Preview) */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* ================= LEFT COLUMN: SEARCH & OPTIONS ================= */}
            <div className="w-full md:w-[58%] border-b md:border-b-0 md:border-r border-stone-800 flex flex-col min-h-0 bg-stone-900/30">
              {/* Navigation Tabs */}
              <div className="flex border-b border-stone-800 bg-stone-900/50 px-4 pt-2 gap-2 text-xs font-sans font-bold flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'search'
                      ? 'border-amber-500 text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Sugerencias Online</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'url'
                      ? 'border-amber-500 text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Pegar URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'upload'
                      ? 'border-amber-500 text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Archivo</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-3.5 sm:p-4 flex-1 overflow-y-auto space-y-3.5">
                {/* TAB 1: SEARCH SUGGESTIONS */}
                {activeTab === 'search' && (
                  <>
                    {/* Source Selector Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-sans scrollbar-none">
                      <span className="text-stone-400 flex items-center gap-1 mr-1 text-[11px] font-bold flex-shrink-0">
                        <Filter className="w-3.5 h-3.5 text-amber-400" />
                        <span>Fuente:</span>
                      </span>
                      {SOURCE_OPTIONS.map((source) => {
                        const isActive = selectedSource === source.id;
                        return (
                          <button
                            key={source.id}
                            type="button"
                            onClick={() => handleSelectSource(source.id)}
                            disabled={isLoading}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 border ${
                              isActive
                                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-[1.02]'
                                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700/80 hover:border-stone-600'
                            }`}
                          >
                            <span>{source.icon}</span>
                            <span>{source.label}</span>
                            {source.badge && (
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                  isActive
                                    ? 'bg-stone-900/30 text-stone-950 font-bold'
                                    : 'bg-stone-700 text-amber-300'
                                }`}
                              >
                                {source.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Bar */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchSuggestions(searchQuery, selectedSource)}
                          placeholder={
                            selectedSource === 'deezer'
                              ? 'Buscar en Deezer (alta resolución 1000px)...'
                              : selectedSource === 'itunes'
                              ? 'Buscar en Apple Music / iTunes...'
                              : selectedSource === 'wikipedia'
                              ? 'Buscar en Wikipedia y Wikimedia...'
                              : selectedSource === 'coverart'
                              ? 'Buscar en Cover Art Archive (MusicBrainz)...'
                              : isArtist
                              ? 'Buscar artista en Deezer, Wikipedia, Apple...'
                              : 'Buscar álbum en Deezer, Apple, Cover Art...'
                          }
                          className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchSuggestions(searchQuery, selectedSource)}
                        disabled={isLoading}
                        className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Buscar</span>
                      </button>
                    </div>

                    {/* Results Grid */}
                    {isLoading ? (
                      <div className="py-14 text-center text-xs text-stone-400 font-sans flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                        <span>
                          {selectedSource === 'all'
                            ? 'Consultando Deezer, iTunes, Cover Art y Wikipedia...'
                            : `Buscando imágenes en ${SOURCE_OPTIONS.find((s) => s.id === selectedSource)?.label || selectedSource}...`}
                        </span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {suggestions.map((item, idx) => {
                          const isSelected = selectedUrl === item.url;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedUrl(item.url);
                                handleResetFraming();
                              }}
                              className={`group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all shadow-md ${
                                isSelected
                                  ? 'border-amber-500 ring-2 ring-amber-500/50 scale-[1.02]'
                                  : 'border-stone-700 hover:border-amber-400/70'
                              }`}
                            >
                              <img
                                src={item.url}
                                alt={item.label || ''}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />

                              {/* Source Badge */}
                              <div className="absolute top-1.5 left-1.5">
                                <span className="px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-amber-200 font-mono text-[9px] font-bold border border-white/10 shadow-xs">
                                  {item.source || 'Online'}
                                </span>
                              </div>

                              {/* Selected Checkmark */}
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 p-1 bg-amber-500 text-stone-900 rounded-full shadow-md">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}

                              {/* Bottom Caption Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                                <span className="text-[10px] text-white font-sans font-bold truncate">
                                  {item.label}
                                </span>
                                {item.resolution && (
                                  <span className="text-[9px] font-mono text-stone-300">
                                    {item.resolution}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-stone-400 font-sans flex flex-col items-center gap-2 bg-stone-900/40 rounded-xl p-6 border border-stone-800/60">
                        <div className="p-2.5 bg-stone-800 rounded-full text-stone-500">
                          <Search className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-stone-300">No se encontraron imágenes</span>
                        <span className="text-stone-500 max-w-xs">
                          No hubo resultados en{' '}
                          {selectedSource === 'all'
                            ? 'las fuentes consultadas'
                            : SOURCE_OPTIONS.find((s) => s.id === selectedSource)?.label}
                          . Prueba buscando con otro término o seleccionando otra fuente arriba.
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* TAB 2: PASTE URL */}
                {activeTab === 'url' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-stone-300 font-sans">
                      Enlace directo a la imagen (JPG, PNG, WebP):
                    </label>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setSelectedUrl(e.target.value);
                        handleResetFraming();
                      }}
                      placeholder="https://ejemplo.com/foto.jpg"
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-sans"
                    />
                    <p className="text-[11px] text-stone-400 font-sans">
                      💡 <em>Tip: También puedes copiar cualquier foto de la web y presionar <kbd className="bg-stone-800 px-1 rounded text-stone-200">Ctrl+V</kbd> en este modal.</em>
                    </p>
                  </div>
                )}

                {/* TAB 3: FILE UPLOAD */}
                {activeTab === 'upload' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-stone-300 font-sans">
                      Selecciona una imagen desde tu dispositivo:
                    </label>
                    <div className="border-2 border-dashed border-stone-700 hover:border-amber-500/70 rounded-2xl p-6 text-center transition-colors">
                      <Upload className="w-8 h-8 text-stone-500 mx-auto mb-2" />
                      <p className="text-xs text-stone-300 font-sans font-medium mb-1">
                        Arrastra o haz clic para subir
                      </p>
                      <p className="text-[11px] text-stone-500 font-sans mb-3">
                        PNG, JPG o WebP
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-stone-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-500 file:cursor-pointer cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ================= RIGHT COLUMN: LIVE FRAMING PREVIEW & CONTROLS ================= */}
            <div className="w-full md:w-[42%] flex flex-col justify-between bg-stone-950/60 p-4 sm:p-5 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-serif font-black text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Encuadre y Previsualización</span>
                  </span>
                  {(zoom !== 1 || panX !== 0 || panY !== 0) && (
                    <button
                      type="button"
                      onClick={handleResetFraming}
                      className="text-[11px] font-sans font-bold text-stone-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      title="Restablecer encuadre y zoom"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Centrar</span>
                    </button>
                  )}
                </div>

                {/* Version Type Selector & Album Metadata (Release only) */}
                {!isArtist && (
                  <div className="mb-3 space-y-2.5 bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 font-sans mb-1 uppercase tracking-wider flex items-center justify-between">
                        <span>Tipo de Versión:</span>
                        <span className="text-[10px] text-amber-400 font-mono font-normal">
                          {versionTypeState === 'live'
                            ? 'ticket.svg'
                            : versionTypeState === 'soundtrack' || versionTypeState === 'session'
                            ? 'movie.svg'
                            : 'cd-2.svg'}
                        </span>
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {VERSION_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setVersionTypeState(opt.id)}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-sans font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                              versionTypeState === opt.id
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                            }`}
                          >
                            <span className="text-xs">{opt.icon}</span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-stone-400 font-sans mb-0.5">
                          {versionTypeState === 'live'
                            ? 'Concierto / Recital:'
                            : versionTypeState === 'soundtrack'
                            ? 'Película / Serie:'
                            : 'Álbum Musical:'}
                        </label>
                        <input
                          type="text"
                          value={albumNameState}
                          onChange={(e) => setAlbumNameState(e.target.value)}
                          placeholder={
                            versionTypeState === 'live'
                              ? 'ej: Obras 1982'
                              : versionTypeState === 'soundtrack'
                              ? 'ej: Pulp Fiction'
                              : 'ej: Artaud'
                          }
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-100 placeholder-stone-600 font-sans focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 font-sans mb-0.5">
                          Año:
                        </label>
                        <input
                          type="text"
                          value={releaseYearState}
                          onChange={(e) => setReleaseYearState(e.target.value)}
                          placeholder="1973"
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-100 placeholder-stone-600 font-mono text-center focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-stone-400 font-sans mb-0.5">
                          Detalle o momento contextual:
                        </label>
                        <input
                          type="text"
                          value={versionDetailsState}
                          onChange={(e) => setVersionDetailsState(e.target.value)}
                          placeholder={
                            versionTypeState === 'live'
                              ? 'ej: Recital de despedida'
                              : versionTypeState === 'soundtrack'
                              ? 'ej: Escena del baile con Vincent Vega'
                              : 'ej: Grabación original de estudio'
                          }
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-100 placeholder-stone-600 font-sans focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tactile Preview Card Container */}
                <div
                  className="relative mx-auto my-2 max-w-[240px] sm:max-w-[270px] select-none cursor-grab active:cursor-grabbing rounded-2xl group transition-transform"
                  onMouseDown={handleMouseDown}
                  onWheel={handleWheel}
                  title="Haz clic y arrastra para encuadrar • Rueda para zoom"
                >
                  {isArtist ? (
                    <ArtistPolaroid
                      artistImage={liveFramedImage}
                      artistName={artistName}
                      songTitle={songTitle}
                      canEdit={false}
                      isHoverable={false}
                    />
                  ) : (
                    <SongReleaseArtifact
                      versionType={versionTypeState}
                      albumCover={liveFramedImage}
                      artistName={artistName}
                      songTitle={songTitle}
                      albumName={albumNameState}
                      releaseYear={releaseYearState ? parseInt(releaseYearState, 10) : null}
                      versionDetails={versionDetailsState}
                      canEdit={false}
                      isHoverable={false}
                    />
                  )}

                  {/* Drag overlay guide icon on hover */}
                  <div className="absolute top-2 right-2 p-1.5 bg-black/75 backdrop-blur-sm rounded-lg text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md flex items-center gap-1 text-[10px] font-sans">
                    <Move className="w-3 h-3" />
                    <span>Arrastrar</span>
                  </div>
                </div>

                {/* Framing Tool Instructions */}
                <p className="text-[11px] font-sans text-stone-400 text-center mt-1">
                  🖱️ Arrastra la foto para encuadrar • Usa la rueda para zoom
                </p>

                {/* Zoom Slider */}
                <div className="mt-4 pt-3 border-t border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-sans font-bold text-stone-300">
                    <span className="flex items-center gap-1 text-stone-400">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Zoom:</span>
                    </span>
                    <span className="font-mono text-amber-300">{zoom.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Offset Indicator (Mini Coordinates) */}
              <div className="mt-3 text-[10px] font-mono text-stone-500 text-center">
                Offset: X={panX}px | Y={panY}px
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-3.5 sm:p-4 border-t border-stone-800 bg-stone-900/80 backdrop-blur-sm flex items-center justify-between gap-3">
            <div>
              {currentImage && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Quitar foto</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold font-sans shadow-md cursor-pointer transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a la Canción</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
