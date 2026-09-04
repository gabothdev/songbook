import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { config } from '../../config.js';
import { searchCache, songCache, createCacheKey } from '../../utils/cache.js';
import { useSearchHistory } from '../../hooks/useSearchHistory.js';
import { extractUniqueChords } from '../../services/scraperApi.js';

const API_BASE_URL = config.API_BASE_URL || '/api';

// Star rating display
const StarRating = ({ rating, votes }) => {
  if (rating === null || rating === undefined || !votes || votes === 0) {
    return <span className="text-[10px] text-stone-400 font-semibold">Sin votos</span>;
  }

  const fullStars = Math.round(rating);
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      i <= fullStars ? (
        <StarSolidIcon key={i} className="w-3.5 h-3.5 text-amber-600" />
      ) : (
        <StarOutlineIcon key={i} className="w-3.5 h-3.5 text-stone-300" />
      )
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="text-[10px] text-stone-500 font-bold ml-1">({votes})</span>
    </div>
  );
};

export default function SongSearchModal({ isOpen, onClose, onSongSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ ug: [], cc: [], chordify: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  const { searchHistory, addToHistory, clearHistory } = useSearchHistory();

  const handleSearch = useCallback(async (searchQuery) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    addToHistory(trimmedQuery);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cacheKey = createCacheKey('search', trimmedQuery);

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
      // 1. Ultimate Guitar
      const ugResponse = await fetch(`${API_BASE_URL}/songs/search/ultimate-guitar?q=${encodeURIComponent(trimmedQuery)}`, { 
        signal: controller.signal 
      });
      const ugResults = ugResponse.ok ? await ugResponse.json() : [];

      if (controller.signal.aborted) return;

      const initialResults = {
        ug: Array.isArray(ugResults) ? ugResults : [],
        cc: [],
        chordify: [],
      };
      setResults(initialResults);

      // 2. Cifra Club & Chordify in background
      try {
        const ccPromise = fetch(`${API_BASE_URL}/songs/search/cifra-club?q=${encodeURIComponent(trimmedQuery)}`, { 
          signal: controller.signal 
        }).then(r => r.ok ? r.json() : []).catch(() => []);

        const chordifyPromise = fetch(`${API_BASE_URL}/songs/search/chordify?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal
        }).then(r => r.ok ? r.json() : []).catch(() => []);

        const [ccResults, chordifyResults] = await Promise.all([ccPromise, chordifyPromise]);

        if (controller.signal.aborted) return;

        const finalResults = {
          ug: Array.isArray(ugResults) ? ugResults : [],
          cc: Array.isArray(ccResults) ? ccResults : [],
          chordify: Array.isArray(chordifyResults) ? chordifyResults : [],
        };
        setResults(finalResults);

        if (finalResults.ug.length > 0 || finalResults.cc.length > 0 || finalResults.chordify.length > 0) {
          searchCache.set(cacheKey, finalResults);
        }
      } catch (ccError) {
        console.log('Error en fuentes secundarias:', ccError.message);
        if (initialResults.ug.length > 0) {
          searchCache.set(cacheKey, initialResults);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Error al conectar con el servidor.');
      setResults({ ug: [], cc: [], chordify: [] });
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

    const cacheKey = createCacheKey('song', version.url, source);

    if (songCache.has(cacheKey)) {
      const cached = songCache.get(cacheKey);
      const content = typeof cached === 'string' ? cached : cached.content;
      const uniqueChords = extractUniqueChords(content);

      onSongSelect({
        id: `scraped_${Date.now()}`,
        content,
        title: songData ? songData.title : (version.title || 'Canción Importada'),
        artist: songData ? songData.artist : (version.artist || 'Artista'),
        key: uniqueChords[0] || 'C',
        bpm: 100,
        timeSignature: '4/4',
        youtubeId: '1F8oHw1jW10',
        uniqueChords,
        sections: [
          { name: 'Intro', time: '0:00' },
          { name: 'Verso 1', time: '0:15' },
          { name: 'Estribillo', time: '0:45' },
        ],
      });
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (source === 'Chordify') {
        const match = version.url.match(/youtube:([^/&?]+)/);
        const youtubeId = match ? match[1] : '';
        if (!youtubeId) throw new Error('No se pudo determinar el ID de video de YouTube.');

        const response = await fetch(`${API_BASE_URL}/songs/transcribe/youtube`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeId, method: 'chordify' })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Error al transcribir desde Chordify.');
        }

        const data = await response.json();
        const cachedObj = { content: data.text, youtubeId, compases: data.compases };
        songCache.set(cacheKey, cachedObj);
        const uniqueChords = extractUniqueChords(data.text);

        onSongSelect({
          id: `scraped_${Date.now()}`,
          content: data.text,
          title: songData ? songData.title : (data.title || 'Canción de Chordify'),
          artist: songData ? songData.artist : (data.artist || 'Artista'),
          key: uniqueChords[0] || 'C',
          bpm: 100,
          timeSignature: '4/4',
          youtubeId,
          uniqueChords,
          sections: [
            { name: 'Intro', time: '0:00' },
            { name: 'Verso 1', time: '0:15' },
            { name: 'Estribillo', time: '0:45' },
          ],
        });
      } else {
        const params = new URLSearchParams({ url: version.url, source });
        const response = await fetch(`${API_BASE_URL}/songs/content?${params.toString()}`);

        if (!response.ok) {
          throw new Error('No se pudo cargar el contenido de la canción.');
        }
        
        const data = await response.json();
        songCache.set(cacheKey, data.content);
        const uniqueChords = extractUniqueChords(data.content);

        onSongSelect({
          id: `scraped_${Date.now()}`,
          content: data.content,
          title: songData ? songData.title : (version.title || 'Canción Importada'),
          artist: songData ? songData.artist : (version.artist || 'Artista'),
          key: uniqueChords[0] || 'C',
          bpm: 100,
          timeSignature: '4/4',
          youtubeId: '1F8oHw1jW10',
          uniqueChords,
          sections: [
            { name: 'Intro', time: '0:00' },
            { name: 'Verso 1', time: '0:15' },
            { name: 'Estribillo', time: '0:45' },
          ],
        });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ ug: [], cc: [], chordify: [] });
      setError(null);
      setIsLoading(false);
      setExpandedIndex(null);
      setSelectedIndex(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allResults = [...results.ug, ...results.cc, ...(results.chordify || [])];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div 
        className="w-full max-w-2xl bg-[#fcf9f2] text-stone-900 border-4 border-[#35251d] rounded-3xl shadow-2xl p-6 sm:p-7 flex flex-col max-h-[88vh] overflow-hidden paper-texture"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-stone-300 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-100 p-2 rounded-xl border border-amber-300">
              <MagnifyingGlassIcon className="w-5 h-5 text-amber-900" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-black text-stone-900">Buscar Canciones Online</h2>
              <p className="text-xs font-sans text-stone-500">Ultimate Guitar • Cifra Club • Chordify</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe canción o artista (ej: Spinetta, Calamaro, Charly García)"
            className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none shadow-sm"
            autoFocus
          />
          <MagnifyingGlassIcon className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-800 font-sans">
            {error}
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading && allResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider font-sans">Buscando en Ultimate Guitar, Cifra Club & Chordify...</p>
            </div>
          ) : allResults.length > 0 ? (
            <div className="space-y-4">
              {/* Ultimate Guitar Results */}
              {results.ug.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded inline-block">Ultimate Guitar ({results.ug.length})</h4>
                  {results.ug.map((song, idx) => {
                    const isExpanded = expandedIndex === idx;
                    return (
                      <SongItem
                        key={`ug-${idx}-${song.title}`}
                        song={song}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpandedIndex(isExpanded ? null : idx)}
                        onSelectVersion={(v) => handleSelectSong(v, song)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Cifra Club Results */}
              {results.cc.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded inline-block">Cifra Club ({results.cc.length})</h4>
                  {results.cc.map((song, idx) => {
                    const overallIndex = results.ug.length + idx;
                    const isExpanded = expandedIndex === overallIndex;
                    return (
                      <SongItem
                        key={`cc-${idx}-${song.title}`}
                        song={song}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpandedIndex(isExpanded ? null : overallIndex)}
                        onSelectVersion={(v) => handleSelectSong(v, song)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Chordify Results */}
              {results.chordify && results.chordify.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 bg-purple-100 px-2 py-0.5 rounded inline-block">Chordify ({results.chordify.length})</h4>
                  {results.chordify.map((song, idx) => {
                    const overallIndex = results.ug.length + results.cc.length + idx;
                    const isExpanded = expandedIndex === overallIndex;
                    return (
                      <SongItem
                        key={`chordify-${idx}-${song.title}`}
                        song={song}
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
            <div className="text-center py-16 text-stone-500 font-sans">
              <p className="text-sm font-semibold">No se encontraron resultados para "{query}"</p>
              <p className="text-xs mt-1">Revisa la ortografía o prueba con otra búsqueda.</p>
            </div>
          ) : (
            <div className="text-center py-16 text-stone-400 font-sans border-2 border-dashed border-stone-300 rounded-2xl">
              <p className="text-xs font-semibold text-stone-600">Empieza a escribir para buscar acordes en tiempo real.</p>
              <p className="text-[10px] mt-1 uppercase tracking-wider font-extrabold text-amber-800">Ultimate Guitar • Cifra Club • Chordify</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SongItem = ({ song, isExpanded, onToggleExpand, onSelectVersion }) => {
  const primaryVersion = song.versions && song.versions[0];
  const hasMultipleVersions = song.versions && song.versions.length > 1;

  return (
    <div className="border border-stone-200 hover:border-amber-300 rounded-xl transition-all overflow-hidden bg-white shadow-sm">
      <div 
        className="p-3.5 flex items-center justify-between cursor-pointer"
        onClick={() => {
          if (!hasMultipleVersions && primaryVersion) {
            onSelectVersion(primaryVersion);
          } else if (song.url) {
            onSelectVersion(song);
          } else {
            onToggleExpand();
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <h5 className="text-xs sm:text-sm font-serif font-black text-stone-900 truncate hover:text-amber-900">{song.title}</h5>
          <p className="text-xs font-sans font-medium text-stone-500 truncate">{song.artist}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {primaryVersion && (
            <div className="flex flex-col items-end gap-0.5">
              <StarRating rating={primaryVersion.rating} votes={primaryVersion.votes} />
              {hasMultipleVersions && (
                <span className="text-[10px] text-stone-400 font-semibold flex items-center gap-0.5 mt-0.5">
                  {song.versions.length} versiones {isExpanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                </span>
              )}
            </div>
          )}

          {!hasMultipleVersions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectVersion(primaryVersion || song);
              }}
              className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-amber-50 text-xs font-bold rounded-lg cursor-pointer"
            >
              Abrir
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasMultipleVersions && (
        <div className="border-t border-stone-100 bg-amber-50/50 p-2 space-y-1">
          {song.versions.map((version, vIdx) => (
            <button
              key={`${version.type}-${vIdx}`}
              onClick={() => onSelectVersion(version)}
              className="w-full text-left p-2 hover:bg-white rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer border border-transparent hover:border-amber-200"
            >
              <span className="font-bold text-stone-800">{version.type || `Versión ${vIdx + 1}`}</span>
              <StarRating rating={version.rating} votes={version.votes} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
