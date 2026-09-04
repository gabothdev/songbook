import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Globe,
  Sparkles,
  ArrowRight,
  Music,
  Star,
  Loader2,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { searchSongsOnline, fetchSongContent } from '../../services/scraperApi';
import { useLanguage } from '../../context/LanguageContext';

export default function SongScraperModal({ isOpen, onClose, onImportSong }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'Ultimate Guitar' | 'Cifra Club'
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const searchInputRef = useRef(null);

  const QUICK_SUGGESTIONS = [
    'Luis Alberto Spinetta',
    'Charly García',
    'Soda Stereo',
    'Fito Páez',
    'Andrés Calamaro',
    'Divididos',
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleSearch = async (searchTerm = query) => {
    const clean = searchTerm.trim();
    if (!clean) return;

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const data = await searchSongsOnline(clean, sourceFilter);
      setResults(data);
      if (data.length === 0) {
        setErrorMessage(`No se encontraron resultados para "${clean}".`);
      }
    } catch (e) {
      setErrorMessage('Error al conectar con los servicios de búsqueda.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickSearch = (term) => {
    setQuery(term);
    handleSearch(term);
  };

  const handleImport = async (item) => {
    setImportingId(item.id || item.url);
    try {
      const fullSong = await fetchSongContent(item);
      
      if (onImportSong) {
        onImportSong({
          id: `scraped_${Date.now()}`,
          title: fullSong.title,
          artist: fullSong.artist,
          key: fullSong.key || 'C',
          bpm: fullSong.bpm || 100,
          timeSignature: '4/4',
          youtubeId: '1F8oHw1jW10',
          uniqueChords: fullSong.uniqueChords || ['C', 'G', 'Am', 'F'],
          sections: [
            { name: 'Intro', time: '0:00' },
            { name: 'Verso 1', time: '0:15' },
            { name: 'Estribillo', time: '0:45' },
          ],
          content: fullSong.content || `[Intro]\n[C]  [G]\n\n[Verso 1]\n[C]          [G]\n${fullSong.title}`,
        });
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-2xl bg-[#fcf9f2] text-stone-900 rounded-3xl shadow-2xl border-4 border-[#35251d] overflow-hidden paper-texture z-10 p-6 sm:p-7 flex flex-col max-h-[88vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-1.5 bg-amber-800 text-amber-100 rounded-lg shadow-sm">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-900 tracking-tight">
                Buscador de Canciones en la Web
              </h3>
            </div>
            <p className="text-xs font-sans text-stone-600">
              Scraping en tiempo real desde <strong>Ultimate Guitar</strong> y <strong>Cifra Club</strong>.
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2 mb-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe la canción o artista (ej: Spinetta, Flaca, Seguir viviendo)..."
                className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 pl-10 pr-3 py-2.5 rounded-xl text-xs sm:text-sm text-stone-900 font-sans transition-all outline-none shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-stone-900 hover:bg-black text-amber-100 rounded-xl font-sans font-bold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <>
                  <span>Buscar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
            <span className="text-[11px] font-sans text-stone-500 font-semibold">Sugerencias:</span>
            {QUICK_SUGGESTIONS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleQuickSearch(term)}
                className="px-2.5 py-0.5 bg-white/80 hover:bg-white text-stone-700 rounded-lg border border-stone-300 text-[11px] font-sans font-semibold transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto pr-1.5 space-y-2 min-h-[240px]">
            {isSearching ? (
              <div className="py-14 flex flex-col items-center justify-center text-stone-500 gap-2.5">
                <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
                <span className="font-serif italic text-xs sm:text-sm">Buscando acordes y tablaturas en vivo...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white rounded-xl border border-stone-200/90 shadow-sm flex items-center justify-between gap-3 hover:border-amber-400 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif font-black text-stone-900 text-sm truncate">
                        {item.title}
                      </h4>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        item.source === 'Ultimate Guitar' 
                          ? 'bg-amber-100 text-amber-900 border-amber-300' 
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {item.source}
                      </span>
                      {item.versionNumber && (
                        <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1 rounded">
                          v{item.versionNumber}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-sans text-stone-600 mt-0.5 font-medium">
                      {item.artist}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-sans text-stone-400 mt-1">
                      {item.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-800 font-bold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {item.rating.toFixed(1)} ({item.votes || 0})
                        </span>
                      )}
                      {item.type && <span>Tipo: {item.type}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleImport(item)}
                    disabled={importingId === (item.id || item.url)}
                    className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-amber-50 rounded-xl font-sans font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {importingId === (item.id || item.url) ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Extrayendo...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Al Cuaderno</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            ) : errorMessage ? (
              <div className="py-14 text-center text-stone-500 text-xs font-sans">
                {errorMessage}
              </div>
            ) : (
              <div className="py-14 text-center text-stone-400 text-xs font-sans">
                Escribe el nombre de una canción o artista para buscar en tiempo real.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-stone-200/80 mt-2 flex items-center justify-between text-xs font-sans text-stone-500">
            <span>Conectado al Scraper Server (Puerto 3001)</span>
            <span className="font-serif italic text-amber-900 font-semibold">SongBook Engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
