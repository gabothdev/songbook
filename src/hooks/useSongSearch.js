import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { config } from '../config.js';
import { searchCache, songCache, createCacheKey } from '../utils/cache.js';
import { fetchSavedSongs } from '../services/persistenceApi.js';
import { scoresApi } from '../services/scoresApi.js';

const API_BASE_URL = config.API_BASE_URL;

/**
 * useSongSearch Hook
 * Maneja el estado, debounce, caché y peticiones concurrentes de:
 * - Búsqueda instantánea en base de datos local
 * - Opciones online de acordes (Chordify con BeatGrid, Ultimate Guitar, Cifra Club)
 * - Partituras y tablaturas multitrack (Songsterr, TodoTango)
 */
export function useSongSearch({
  isOpen,
  databaseSongs = [],
  isPro = false,
  onSongSelect,
  onScoreSelect,
  onDirectPlaySong,
  onClose,
  openUpgradeModal,
}) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('chords'); // 'chords' | 'scores'
  const [results, setResults] = useState({ ug: [], cc: [], chordify: [] });
  const [scoreResults, setScoreResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [internalDbSongs, setInternalDbSongs] = useState([]);
  const abortControllerRef = useRef(null);

  // Cargar canciones de la base de datos si no vinieron por props
  useEffect(() => {
    if (isOpen && (!databaseSongs || databaseSongs.length === 0)) {
      fetchSavedSongs()
        .then((songs) => {
          if (Array.isArray(songs) && songs.length > 0) {
            setInternalDbSongs(songs);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, databaseSongs]);

  const allDbSongs = databaseSongs && databaseSongs.length > 0 ? databaseSongs : internalDbSongs;

  // Filtrado reactivo de canciones de nuestra base de datos (Prioridad número 1)
  const trimmedLower = query.trim().toLowerCase();
  const matchingDatabaseSongs = useMemo(() => {
    if (!trimmedLower) {
      return allDbSongs.slice(0, 10);
    }
    return allDbSongs.filter((song) => {
      const title = (song.title || '').toLowerCase();
      const artist = (song.artist || '').toLowerCase();
      const artists = Array.isArray(song.artists)
        ? song.artists.map((a) => (typeof a === 'string' ? a : a?.name || '')).join(' ').toLowerCase()
        : '';
      const chords = Array.isArray(song.uniqueChords)
        ? song.uniqueChords.join(' ').toLowerCase()
        : '';
      return (
        title.includes(trimmedLower) ||
        artist.includes(trimmedLower) ||
        artists.includes(trimmedLower) ||
        chords.includes(trimmedLower)
      );
    });
  }, [trimmedLower, allDbSongs]);

  const handleSelectDatabaseSong = useCallback((song) => {
    if (onDirectPlaySong) {
      onDirectPlaySong(song);
    } else if (onSongSelect) {
      onSongSelect(song);
    }
    if (onClose) onClose();
  }, [onDirectPlaySong, onSongSelect, onClose]);

  const handleSearch = useCallback(async (searchQuery) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    if (!isPro) {
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setExpandedIndex(null);
    setSelectedIndex(null);

    // ================= MODO 1: PARTITURAS & TABS =================
    if (searchType === 'scores') {
      try {
        const songsterrP = scoresApi.searchSongsterr(trimmedQuery)
          .then((items) => items.map((s) => ({ ...s, _source: 'songsterr' })))
          .catch(() => []);

        const tangoP = scoresApi.searchTango(trimmedQuery)
          .then((items) => items.map((t) => ({ ...t, _source: 'todotango' })))
          .catch(() => []);

        const [stResults, tgResults] = await Promise.all([songsterrP, tangoP]);
        if (controller.signal.aborted) return;

        setScoreResults([...tgResults, ...stResults]);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError('Error al consultar catálogos de partituras.');
        setScoreResults([]);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
      return;
    }

    // ================= MODO 2: ACORDES & LETRAS =================
    const cacheKey = createCacheKey('search', trimmedQuery);
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      setResults(cached);
      setIsLoading(false);
      return;
    }

    try {
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
  }, [searchType, isPro]);

  const handleSelectSong = useCallback(async (version, songData = null) => {
    if (!version || !version.url) return;

    if (!isPro) {
      if (openUpgradeModal) openUpgradeModal();
      return;
    }

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
      if (onSongSelect) {
        onSongSelect({
          content: typeof cached === 'string' ? cached : cached.content,
          title: songTitle,
          artist: songArtist,
          ...(source === 'Chordify' && typeof cached === 'object' ? { youtubeId: cached.youtubeId, compases: cached.compases } : {})
        });
      }
      if (onClose) onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    if (source === 'Chordify') {
      setImportProgress({
        title: songTitle,
        artist: songArtist,
        source: 'Opción con BeatGrid',
        currentStep: 1,
        percent: 25,
        steps: [
          { id: 1, label: '1. Conectando con video sincronizado...', active: true, done: false },
          { id: 2, label: '2. Descargando compases rítmicos y BPM...', active: false, done: false },
          { id: 3, label: '3. Generando BeatGrid y estructura musical...', active: false, done: false },
        ]
      });
    } else {
      setImportProgress({
        title: songTitle,
        artist: songArtist,
        source: 'Opción de Acordes',
        currentStep: 1,
        percent: 40,
        steps: [
          { id: 1, label: '1. Obteniendo versión seleccionada...', active: true, done: false },
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

        setImportProgress(prev => prev ? {
          ...prev,
          currentStep: 2,
          percent: 60,
          steps: [
            { id: 1, label: '1. Conectando con video sincronizado...', active: false, done: true },
            { id: 2, label: '2. Descargando compases rítmicos y BPM...', active: true, done: false },
            { id: 3, label: '3. Generando BeatGrid y estructura musical...', active: false, done: false },
          ]
        } : null);

        const response = await fetch(`${API_BASE_URL}/songs/transcribe/youtube`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeId, method: 'chordify' })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Error al transcribir la canción.');
        }

        const data = await response.json();
        
        setImportProgress(prev => prev ? {
          ...prev,
          currentStep: 3,
          percent: 100,
          steps: [
            { id: 1, label: '1. Conectando con video sincronizado...', active: false, done: true },
            { id: 2, label: '2. Descargando compases rítmicos y BPM...', active: false, done: true },
            { id: 3, label: '3. Generando BeatGrid y estructura musical...', active: false, done: true },
          ]
        } : null);

        await new Promise(res => setTimeout(res, 450));

        const cachedObj = { content: data.text, youtubeId, compases: data.compases };
        songCache.set(cacheKey, cachedObj);

        if (onSongSelect) {
          onSongSelect({
            content: data.text,
            title: songData ? songData.title : (data.title || 'Canción'),
            artist: songData ? songData.artist : (data.artist || 'Artista'),
            youtubeId: youtubeId,
            compases: data.compases
          });
        }
      } else {
        setImportProgress(prev => prev ? {
          ...prev,
          currentStep: 2,
          percent: 85,
          steps: [
            { id: 1, label: '1. Obteniendo versión seleccionada...', active: false, done: true },
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
            { id: 1, label: '1. Obteniendo versión seleccionada...', active: false, done: true },
            { id: 2, label: '2. Extrayendo letra y acordes transponibles...', active: false, done: true },
          ]
        } : null);

        await new Promise(res => setTimeout(res, 350));

        songCache.set(cacheKey, data.content);

        if (onSongSelect) {
          onSongSelect({
            content: data.content,
            title: songTitle,
            artist: songArtist
          });
        }
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  }, [onSongSelect, onClose, isPro, openUpgradeModal]);

  const handleSelectScoreItem = useCallback((score) => {
    if (!isPro) {
      if (openUpgradeModal) openUpgradeModal();
      return;
    }
    if (onScoreSelect) {
      onScoreSelect(score);
    }
    if (onClose) onClose();
  }, [isPro, openUpgradeModal, onScoreSelect, onClose]);

  // Debounce search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults({ ug: [], cc: [], chordify: [] });
      setScoreResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(query);
    }, 450);

    return () => clearTimeout(timer);
  }, [query, searchType, handleSearch]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ ug: [], cc: [], chordify: [] });
      setScoreResults([]);
      setError(null);
      setIsLoading(false);
      setExpandedIndex(null);
      setSelectedIndex(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  return {
    query,
    setQuery,
    searchType,
    setSearchType,
    results,
    scoreResults,
    isLoading,
    error,
    expandedIndex,
    setExpandedIndex,
    selectedIndex,
    setSelectedIndex,
    importProgress,
    matchingDatabaseSongs,
    handleSearch,
    handleSelectSong,
    handleSelectScoreItem,
    handleSelectDatabaseSong,
  };
}
