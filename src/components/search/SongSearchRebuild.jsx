import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  TrashIcon, 
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles, Music, Activity } from 'lucide-react';
import { config } from '../../config.js';
import { searchCache, songCache, createCacheKey } from '../../utils/cache.js';
import { useSearchHistory } from '../../hooks/useSearchHistory.js';
import { useTheme } from '../../hooks/useTheme.jsx';

const API_BASE_URL = config.API_BASE_URL;

// Estrellas de puntuación premium
const StarRating = ({ rating, votes }) => {
  if (rating === null || rating === undefined || !votes || votes === 0) {
    return <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Sin votos</span>;
  }

  const fullStars = Math.round(rating);
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      i <= fullStars ? (
        <StarSolidIcon key={i} className="w-3.5 h-3.5 text-amber-500" />
      ) : (
        <StarOutlineIcon key={i} className="w-3.5 h-3.5 text-slate-350 dark:text-slate-600" />
      )
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold ml-1">({votes})</span>
    </div>
  );
};

export default function SongSearchRebuild({ isOpen, onClose, onSongSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ ug: [], cc: [], chordify: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [importProgress, setImportProgress] = useState(null);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  const { isDark } = useTheme();
  const { searchHistory, addToHistory, removeFromHistory, clearHistory, getSuggestions } = useSearchHistory();
  const suggestions = getSuggestions(query);

  const handleSearch = useCallback(async (searchQuery) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    // Agregar al historial
    addToHistory(trimmedQuery);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cacheKey = createCacheKey('search', trimmedQuery);

    // Verificar cache primero
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      setResults(cached);
      setError(null);
      setExpandedIndex(null);
      setSelectedIndex(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setExpandedIndex(null);
    setSelectedIndex(null);

    try {
      // Buscar en Chordify (prioridad #1), Ultimate Guitar y Cifra Club en paralelo
      const chordifyPromise = fetch(`${API_BASE_URL}/songs/search/chordify?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal
      }).then(r => r.ok ? r.json() : []).catch(() => []);

      const ugPromise = fetch(`${API_BASE_URL}/songs/search/ultimate-guitar?q=${encodeURIComponent(trimmedQuery)}`, { 
        signal: controller.signal 
      }).then(r => r.ok ? r.json() : []).catch(() => []);

      const ccPromise = fetch(`${API_BASE_URL}/songs/search/cifra-club?q=${encodeURIComponent(trimmedQuery)}`, { 
        signal: controller.signal 
      }).then(r => r.ok ? r.json() : []).catch(() => []);

      const [chordifyResults, ugResults, ccResults] = await Promise.all([chordifyPromise, ugPromise, ccPromise]);

      if (controller.signal.aborted) return;

      const finalResults = {
        chordify: Array.isArray(chordifyResults) ? chordifyResults : [],
        ug: Array.isArray(ugResults) ? ugResults : [],
        cc: Array.isArray(ccResults) ? ccResults : [],
      };
      setResults(finalResults);

      if (finalResults.chordify.length > 0 || finalResults.ug.length > 0 || finalResults.cc.length > 0) {
        searchCache.set(cacheKey, finalResults);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Error al conectar con el servidor.');
      setResults({ chordify: [], ug: [], cc: [] });
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [addToHistory]);

  const handleSelectSong = useCallback(async (version, songData = null) => {
    if (!version || !version.url) return;

    let source = 'Ultimate Guitar';
    if (version.url.includes('cifraclub')) {
      source = 'Cifra Club';
    } else if (version.url.includes('chordify.net') || version.source === 'Chordify') {
      source = 'Chordify';
    }

    const songTitle = songData ? songData.title : (version.title || 'Canción Importada');
    const songArtist = songData ? songData.artist : (version.artist || 'Artista');

    const cacheKey = createCacheKey('song', version.url, source);

    if (songCache.has(cacheKey)) {
      const cached = songCache.get(cacheKey);
      onSongSelect({
        content: typeof cached === 'string' ? cached : cached.content,
        title: songTitle,
        artist: songArtist,
        ...(source === 'Chordify' && typeof cached === 'object' ? { youtubeId: cached.youtubeId, compases: cached.compases } : {})
      });
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    // Initial step setup
    if (source === 'Chordify') {
      setImportProgress({
        title: songTitle,
        artist: songArtist,
        source: 'Chordify',
        currentStep: 1,
        percent: 25,
        steps: [
          { id: 1, label: '1. Conectando con YouTube y Chordify...', active: true, done: false },
          { id: 2, label: '2. Descargando compases rítmicos y BPM...', active: false, done: false },
          { id: 3, label: '3. Generando BeatGrid y estructura musical...', active: false, done: false },
        ]
      });
    } else {
      setImportProgress({
        title: songTitle,
        artist: songArtist,
        source,
        currentStep: 1,
        percent: 40,
        steps: [
          { id: 1, label: `1. Conectando con ${source}...`, active: true, done: false },
          { id: 2, label: '2. Extrayendo letra y acordes transponibles...', active: false, done: false },
        ]
      });
    }

    try {
      if (source === 'Chordify') {
        const decodedUrl = decodeURIComponent(version.url || '');
        const match = decodedUrl.match(/youtube[:=]([a-zA-Z0-9_-]{11})/) || decodedUrl.match(/([a-zA-Z0-9_-]{11})$/);
        const youtubeId = version.youtubeId || (match ? match[1] : '');
        if (!youtubeId) throw new Error('No se pudo determinar el ID de video de YouTube.');

        // Step 2 update
        setImportProgress(prev => prev ? {
          ...prev,
          currentStep: 2,
          percent: 60,
          steps: [
            { id: 1, label: '1. Conectando con YouTube y Chordify...', active: false, done: true },
            { id: 2, label: '2. Descargando compases rítmicos y BPM...', active: true, done: false },
            { id: 3, label: '3. Generando BeatGrid y estructura musical...', active: false, done: false },
          ]
        } : null);

        const response = await fetch(`${API_BASE_URL}/songs/transcribe/youtube`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ youtubeId, method: 'chordify' })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Error al transcribir desde Chordify.');
        }

        const data = await response.json();
        
        // Step 3 update
        setImportProgress(prev => prev ? {
          ...prev,
          currentStep: 3,
          percent: 100,
          steps: [
            { id: 1, label: '1. Conectando con YouTube y Chordify...', active: false, done: true },
            { id: 2, label: '2. Descargando compases rítmicos y BPM...', active: false, done: true },
            { id: 3, label: '3. Generando BeatGrid y estructura musical...', active: false, done: true },
          ]
        } : null);

        await new Promise(res => setTimeout(res, 450));

        const cachedObj = { content: data.text, youtubeId, compases: data.compases };
        songCache.set(cacheKey, cachedObj);

        onSongSelect({
          content: data.text,
          title: songData ? songData.title : (data.title || 'Canción de Chordify'),
          artist: songData ? songData.artist : (data.artist || 'Artista'),
          youtubeId: youtubeId,
          compases: data.compases
        });
      } else {
        // Step 2 for standard scrapers
        setImportProgress(prev => prev ? {
          ...prev,
          currentStep: 2,
          percent: 85,
          steps: [
            { id: 1, label: `1. Conectando con ${source}...`, active: false, done: true },
            { id: 2, label: '2. Extrayendo letra y acordes transponibles...', active: true, done: false },
          ]
        } : null);

        const params = new URLSearchParams({ url: version.url, source });
        const response = await fetch(`${API_BASE_URL}/songs/content?${params.toString()}`);

        if (!response.ok) {
          throw new Error('No se pudo cargar el contenido de la canción.');
        }
        
        const data = await response.json();

        setImportProgress(prev => prev ? {
          ...prev,
          percent: 100,
          steps: [
            { id: 1, label: `1. Conectando con ${source}...`, active: false, done: true },
            { id: 2, label: '2. Extrayendo letra y acordes transponibles...', active: false, done: true },
          ]
        } : null);

        await new Promise(res => setTimeout(res, 350));

        songCache.set(cacheKey, data.content);

        onSongSelect({
          content: data.content,
          title: songTitle,
          artist: songArtist
        });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  }, [onSongSelect, onClose]);

  // Debounce search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults({ ug: [], cc: [], chordify: [] });
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(query);
    }, 450);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Resetear estados al cerrar
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ ug: [], cc: [], chordify: [] });
      setError(null);
      setIsLoading(false);
      setExpandedIndex(null);
      setSelectedIndex(null);
      setShowSuggestions(false);
      setSuggestionIndex(-1);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  // Navegación por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      const allResults = [...results.ug, ...results.cc];
      
      if (showSuggestions && suggestions.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
            break;
          case 'Enter':
            e.preventDefault();
            if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
              const term = suggestions[suggestionIndex].term;
              setQuery(term);
              setShowSuggestions(false);
              setSuggestionIndex(-1);
              handleSearch(term);
            } else {
              setShowSuggestions(false);
              handleSearch(query);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setShowSuggestions(false);
            setSuggestionIndex(-1);
            break;
          default:
            break;
        }
        return;
      }

      // Navegación de resultados normales
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          if (allResults.length > 0) {
            e.preventDefault();
            setSelectedIndex(prev => (prev === null ? 0 : (prev + 1) % allResults.length));
          }
          break;
        case 'ArrowUp':
          if (allResults.length > 0) {
            e.preventDefault();
            setSelectedIndex(prev => (prev === null ? allResults.length - 1 : (prev - 1 + allResults.length) % allResults.length));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex !== null && allResults[selectedIndex]) {
            const song = allResults[selectedIndex];
            if (song.versions && song.versions.length === 1) {
              handleSelectSong(song.versions[0], song);
            } else {
              setExpandedIndex(prev => (prev === selectedIndex ? null : selectedIndex));
            }
          } else {
            handleSearch(query);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, showSuggestions, suggestionIndex, query, suggestions, handleSelectSong, handleSearch, onClose]);

  if (!isOpen) return null;

  const allResults = [...(results.chordify || []), ...results.ug, ...results.cc];

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div 
        className="w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/70 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= MODAL DE PROGRESO DE IMPORTACIÓN ================= */}
        <AnimatePresence>
          {importProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-6 select-none"
            >
              <motion.div
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 10 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-5"
              >
                {/* Animated Pulse Icon */}
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                  <div className="relative w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                    {importProgress.source === 'Chordify' ? (
                      <Activity className="w-7 h-7 animate-pulse" />
                    ) : (
                      <Music className="w-7 h-7 animate-bounce" />
                    )}
                  </div>
                </div>

                {/* Song title and artist */}
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                    Procesando • {importProgress.source}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-2 truncate">
                    {importProgress.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {importProgress.artist}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>Progreso del proceso</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">{importProgress.percent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/60 p-0.5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                      initial={{ width: '15%' }}
                      animate={{ width: `${importProgress.percent}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Step List */}
                <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80">
                  {importProgress.steps.map((st) => (
                    <div
                      key={st.id}
                      className={`flex items-center gap-2.5 text-xs font-medium transition-all ${
                        st.done
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : st.active
                          ? 'text-amber-700 dark:text-amber-300 font-bold'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {st.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : st.active ? (
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 flex-shrink-0">
                          {st.id}
                        </div>
                      )}
                      <span className="truncate">{st.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header del Buscador */}
        <div className="flex justify-between items-center mb-5 border-b border-slate-150 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/10 dark:bg-blue-500/10 p-2 rounded-xl border border-blue-500/15">
              <MagnifyingGlassIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Buscar Canciones Online</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {searchHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('¿Limpiar todo el historial de búsqueda?')) {
                    clearHistory();
                  }
                }}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15 px-2.5 py-1.5 rounded-lg transition-all"
                title="Limpiar Historial"
              >
                Limpiar Historial ({searchHistory.length})
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input de Búsqueda */}
        <div className="relative mb-5">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe canción o artista (ej: Mano a mano Carlos Gardel)"
              className="w-full bg-slate-100/55 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800/80 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <MagnifyingGlassIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 select-none">
            {error}
          </div>
        )}

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading && allResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider">Buscando en Ultimate Guitar, Cifra Club & Chordify...</p>
            </div>
          ) : allResults.length > 0 ? (
            <div className="space-y-4">
              {/* Resultados de Chordify (Prioridad #1) */}
              {results.chordify && results.chordify.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Chordify (Compases & Video Sincronizado)</h4>
                    <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800">
                      Recomendado
                    </span>
                  </div>
                  {results.chordify.map((song, idx) => {
                    const overallIndex = idx;
                    const isSelected = selectedIndex === overallIndex;
                    const isExpanded = expandedIndex === overallIndex;

                    return (
                      <SongItem
                        key={`chordify-${idx}-${song.title}`}
                        song={song}
                        isSelected={isSelected}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpandedIndex(isExpanded ? null : overallIndex)}
                        onSelectVersion={(v) => handleSelectSong(v, song)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Resultados de Ultimate Guitar */}
              {results.ug.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ultimate Guitar</h4>
                  {results.ug.map((song, idx) => {
                    const overallIndex = (results.chordify?.length || 0) + idx;
                    const isSelected = selectedIndex === overallIndex;
                    const isExpanded = expandedIndex === overallIndex;

                    return (
                      <SongItem
                        key={`ug-${idx}-${song.title}`}
                        song={song}
                        isSelected={isSelected}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpandedIndex(isExpanded ? null : overallIndex)}
                        onSelectVersion={(v) => handleSelectSong(v, song)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Resultados de Cifra Club */}
              {results.cc.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cifra Club</h4>
                  {results.cc.map((song, idx) => {
                    const overallIndex = (results.chordify?.length || 0) + results.ug.length + idx;
                    const isSelected = selectedIndex === overallIndex;
                    const isExpanded = expandedIndex === overallIndex;

                    return (
                      <SongItem
                        key={`cc-${idx}-${song.title}`}
                        song={song}
                        isSelected={isSelected}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpandedIndex(isExpanded ? null : overallIndex)}
                        onSelectVersion={(v) => handleSelectSong(v, song)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : query && !isLoading ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 select-none">
              <p className="text-sm font-semibold">No se encontraron resultados para "{query}"</p>
              <p className="text-xs mt-1">Revisa la ortografía o prueba con otra búsqueda.</p>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 select-none border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-xs font-semibold">Empieza a escribir para buscar acordes online.</p>
              <p className="text-[10px] mt-1 uppercase tracking-wider font-extrabold text-blue-500/60">Ultimate Guitar • Cifra Club • Chordify</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponente SongItem para renderizar canciones
const SongItem = ({ song, isSelected, isExpanded, onToggleExpand, onSelectVersion }) => {
  const primaryVersion = song.versions && song.versions[0];
  const hasMultipleVersions = song.versions && song.versions.length > 1;

  return (
    <div className={`border rounded-xl transition-all duration-200 overflow-hidden bg-white/40 dark:bg-slate-900/20
      ${isSelected 
        ? 'border-blue-500 ring-1 ring-blue-500/30 dark:border-blue-500/60' 
        : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      }
    `}>
      <div 
        className="p-3.5 flex items-center justify-between cursor-pointer"
        onClick={() => {
          if (!hasMultipleVersions && primaryVersion) {
            onSelectVersion(primaryVersion);
          } else {
            onToggleExpand();
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-500">{song.title}</h5>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-455 truncate">{song.artist}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {primaryVersion && (
            <div className="flex flex-col items-end gap-0.5">
              <StarRating rating={primaryVersion.rating} votes={primaryVersion.votes} />
              {hasMultipleVersions && (
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-0.5 mt-0.5">
                  {song.versions.length} versiones {isExpanded ? <ChevronUpIcon className="w-2.5 h-2.5" /> : <ChevronDownIcon className="w-2.5 h-2.5" />}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {isExpanded && hasMultipleVersions && (
        <div className="border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-black/15 p-2 space-y-1">
          {song.versions.map((version, vIdx) => (
            <button
              key={`${version.type}-${vIdx}`}
              onClick={() => onSelectVersion(version)}
              className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer"
            >
              <span className="font-bold text-slate-700 dark:text-slate-350">{version.type || 'Versión'}</span>
              <StarRating rating={version.rating} votes={version.votes} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
