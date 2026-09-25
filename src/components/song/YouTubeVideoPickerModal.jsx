import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Youtube,
  Search,
  X,
  Play,
  Check,
  Link,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { searchYouTubeOptions } from '../../services/scraperApi';

/**
 * YouTubeVideoPickerModal Component
 * Allows users to search, preview, and attach a YouTube video to songs that don't have one.
 */
export default function YouTubeVideoPickerModal({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectVideo,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [customInput, setCustomInput] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setCustomInput('');
      setPreviewVideoId(null);
      if (initialQuery.trim()) {
        handleSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q || !q.trim()) return;
    setIsLoading(true);
    try {
      const options = await searchYouTubeOptions(q.trim());
      setResults(options);
    } catch (e) {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (videoId) => {
    if (!videoId) return;
    onSelectVideo(videoId);
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    // Extract ID from full URL or use raw ID
    const urlMatch = customInput.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const videoId = urlMatch ? urlMatch[1] : customInput.trim();

    if (/^[\w-]{11}$/.test(videoId)) {
      handleSelect(videoId);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-[#fcf9f2] rounded-3xl border-4 border-[#35251d] p-6 shadow-2xl space-y-4 paper-texture z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Youtube className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-serif font-black text-lg text-stone-900">
                  Vincular Video de YouTube
                </h3>
                <p className="text-xs font-sans text-stone-500">
                  Elige un video para reproducir y sincronizar con la letra y acordes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar video o artista en YouTube..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-sans text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-600 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-xl text-xs sm:text-sm font-bold font-sans shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Buscar</span>
            </button>
          </form>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-36 text-stone-500 text-xs font-sans space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                <span>Buscando videos disponibles...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((video) => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 hover:bg-white border border-stone-200/80 hover:border-red-300 transition-all shadow-2xs group"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-stone-200 flex-shrink-0 cursor-pointer"
                    onClick={() => handleSelect(video.videoId)}
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent flex items-center justify-center">
                      <Play className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-xs sm:text-sm font-serif font-bold text-stone-900 truncate group-hover:text-red-950">
                      {video.title}
                    </h4>
                    <p className="text-[11px] font-sans text-stone-500 truncate mt-0.5">
                      {video.artist}
                    </p>
                  </div>

                  {/* Action */}
                  <button
                    type="button"
                    onClick={() => handleSelect(video.videoId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-sans shadow transition-all cursor-pointer flex-shrink-0 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Vincular</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-stone-400 text-xs font-sans text-center px-4 space-y-1">
                <Youtube className="w-8 h-8 text-stone-300 mb-1" />
                <span>Ingresa el título o pega un enlace directo para vincular un video de YouTube.</span>
              </div>
            )}
          </div>

          {/* Direct Link or Video ID Input */}
          <div className="pt-3 border-t border-stone-200">
            <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1 flex-shrink-0">
                <Link className="w-3 h-3 text-red-600" />
                <span>Enlace directo:</span>
              </span>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... o ID"
                className="flex-1 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:border-red-600 shadow-inner"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
              >
                Vincular
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
