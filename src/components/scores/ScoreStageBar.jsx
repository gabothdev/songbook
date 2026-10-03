import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Mic2,
  ListMusic,
  CheckCircle,
  LogOut,
} from 'lucide-react';

/**
 * Barra superior de concierto en vivo cuando se ejecuta un Setlist / Repertorio.
 */
export default function ScoreStageBar({
  setlistContext,
  currentTitle,
  onBack,
}) {
  const [isSetlistDropdownOpen, setIsSetlistDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isSetlistDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSetlistDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSetlistDropdownOpen]);

  if (!setlistContext) return null;

  return (
    <div className="w-full flex-shrink-0 bg-[#241a14] text-amber-100 p-2.5 sm:p-3 border-b-2 border-amber-700/60 shadow-xl flex items-center justify-between gap-3 relative z-50 select-none print:hidden">
      {/* Previous Song Button */}
      <button
        type="button"
        disabled={setlistContext.currentIndex === 0}
        onClick={setlistContext.onPrevSong}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
          setlistContext.currentIndex === 0
            ? 'opacity-30 cursor-not-allowed text-stone-400 bg-stone-900/40'
            : 'bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-900/50 shadow-sm'
        }`}
        title={
          setlistContext.currentIndex > 0
            ? `Anterior: ${setlistContext.setlist.songs[setlistContext.currentIndex - 1]?.title}`
            : 'Inicio del Setlist'
        }
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Anterior</span>
      </button>

      {/* Center Stage Info & Quick Setlist Picker */}
      <div ref={dropdownRef} className="flex items-center gap-2 text-center min-w-0 relative z-50">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex-shrink-0">
          <Mic2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">En Vivo:</span> {setlistContext.setlist.name}
        </div>

        {/* Setlist Song Index & Title Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsSetlistDropdownOpen(!isSetlistDropdownOpen)}
          className="px-2.5 py-1 bg-stone-900/90 hover:bg-stone-800 rounded-lg border border-amber-900/40 text-stone-200 hover:text-white font-serif font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer truncate transition-colors"
          title="Ver lista de canciones del repertorio"
        >
          <span className="text-amber-400 font-mono text-xs">
            [{setlistContext.currentIndex + 1}/{setlistContext.setlist.songs.length}]
          </span>
          <span className="truncate">{currentTitle}</span>
          <ListMusic className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 ml-1" />
        </button>

        {/* Dropdown Menu of Setlist Songs */}
        <AnimatePresence>
          {isSetlistDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-[#1f1611] text-stone-200 rounded-xl border border-amber-800/80 shadow-2xl p-2 z-[70] text-left max-h-60 overflow-y-auto"
            >
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/80 px-2 py-1 border-b border-stone-800 mb-1">
                Repertorio: {setlistContext.setlist.name}
              </div>
              {setlistContext.setlist.songs.map((s, idx) => {
                const isScoreItem = Boolean(
                  s.isScore ||
                  s.type === 'score' ||
                  s.type === 'tango_archive' ||
                  s.songsterrId ||
                  s.tangoId ||
                  (typeof s.content === 'string' && s.content.startsWith('[SCORE_SHEET]'))
                );
                const isTangoItem = s.type === 'tango_archive' || Boolean(s.tangoId) || (typeof s.content === 'string' && s.content.includes('"tango_archive"'));
                return (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => {
                      setlistContext.onSelectSongIndex(idx);
                      setIsSetlistDropdownOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-sans flex items-center justify-between transition-colors cursor-pointer ${
                      idx === setlistContext.currentIndex
                        ? 'bg-amber-700 text-white font-bold'
                        : 'hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <span className="truncate mr-2">{idx + 1}. {s.title}</span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0 bg-stone-900 text-stone-300">
                      {isTangoItem ? '🎻 Tango' : isScoreItem ? '🎸 Tab' : (s.key || 'C')}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Next Song / Exit Stage */}
      <div className="flex items-center gap-2">
        {setlistContext.currentIndex < setlistContext.setlist.songs.length - 1 ? (
          <button
            type="button"
            onClick={setlistContext.onNextSong}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-md"
            title={`Siguiente: ${setlistContext.setlist.songs[setlistContext.currentIndex + 1]?.title}`}
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setlistContext.onExitStage();
              if (onBack) onBack();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-md"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Fin del Show</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setlistContext.onExitStage();
            if (onBack) onBack();
          }}
          className="p-1.5 bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Salir del Modo Escenario"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
