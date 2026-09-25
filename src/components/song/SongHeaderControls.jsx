import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tone from 'tone';
import {
  ArrowLeft,
  Star,
  FolderPlus,
  Plus,
  Sparkles,
  Crown,
  Youtube,
  Edit3,
} from 'lucide-react';
import { transposeChord } from '../../utils/music';

/**
 * SongHeaderControls Component
 * Fixed-dimension utility bar:
 * - Back button / Exit stage
 * - Edit custom version (Pro feature ✏️)
 * - Toggle favorite (⭐)
 * - Add to setlist popover
 * - Transpose controls (+/-) (Fixed width, zero layout shift)
 * - Open floating YouTube video button
 * - Song Title, Artist and Key Badge
 */
export default function SongHeaderControls({
  song,
  onBack,
  setlistContext = null,
  isFavorite = false,
  onToggleFavorite = null,
  setlists = [],
  onAddSongToSetlist = null,
  transpose = 0,
  onTranspose,
  isPitchShiftActive = false,
  isLoadingAudio = false,
  isPremium = false,
  openUpgradeModal = null,
  isVideoPaperOpen = true,
  onOpenVideoPaper = null,
  onFeedbackToast = null,
  isEditMode = false,
  onToggleEditMode = null,
}) {
  const [isAddToSetlistOpen, setIsAddToSetlistOpen] = useState(false);

  const handleEditClick = () => {
    if (!isPremium) {
      if (openUpgradeModal) openUpgradeModal();
      return;
    }
    if (onToggleEditMode) {
      onToggleEditMode();
    }
  };

  const handleSelectSetlistToAdd = (setlistName) => {
    if (onAddSongToSetlist) {
      onAddSongToSetlist(setlistName, { ...song, transpose });
      if (onFeedbackToast) {
        onFeedbackToast(`Añadida a "${setlistName}"`);
      }
    }
    setIsAddToSetlistOpen(false);
  };

  return (
    <div>
      {/* Top Controls Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={setlistContext ? setlistContext.onExitStage : onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-xl border border-stone-300 text-xs font-bold font-sans shadow-sm transition-all cursor-pointer flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{setlistContext ? 'Salir de Show' : 'Volver a Canciones'}</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Edit Custom Arrangement Button (Pro Feature) */}
          <button
            type="button"
            onClick={handleEditClick}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
              isEditMode
                ? 'bg-amber-600 border-amber-700 text-white hover:bg-amber-700'
                : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-700'
            }`}
            title={isEditMode ? 'Cerrar Modo Edición' : 'Editar letra, compases y crear tu versión personal (Pro)'}
          >
            <Edit3 className={`w-3.5 h-3.5 ${isEditMode ? 'text-white' : 'text-amber-700'}`} />
            <span>{isEditMode ? 'Editando' : 'Editar'}</span>
            {!isPremium && <Crown className="w-3 h-3 text-amber-500 fill-amber-400" />}
          </button>

          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(song)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
                isFavorite
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                  : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-700'
              }`}
              title={isFavorite ? 'Quitar de Favoritas' : 'Marcar como Favorita'}
            >
              <Star
                className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                  isFavorite ? 'text-amber-500 fill-amber-400' : 'text-stone-400'
                }`}
              />
              <span className="hidden sm:inline">{isFavorite ? 'Favorita' : 'Favorito'}</span>
            </button>
          )}

          {/* Add to Setlist Popover Button */}
          {onAddSongToSetlist && setlists.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAddToSetlistOpen(!isAddToSetlistOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-xl border border-stone-300 text-xs font-bold font-sans shadow-sm transition-all cursor-pointer"
                title="Agregar esta canción a un setlist"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Al Setlist</span>
              </button>

              {/* Dropdown Menu of Setlists */}
              <AnimatePresence>
                {isAddToSetlistOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-60 bg-white text-stone-900 rounded-2xl border border-stone-300 shadow-2xl p-2.5 z-50 text-left paper-texture"
                  >
                    <div className="text-[11px] font-sans font-bold text-stone-700 px-2 py-1 border-b border-stone-200 mb-1.5 flex items-center justify-between">
                      <span>Sumar a Setlist:</span>
                      <button
                        type="button"
                        onClick={() => setIsAddToSetlistOpen(false)}
                        className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {setlists.map((sl) => {
                        const alreadyIn = sl.songs?.some((s) => s.id === song.id);
                        return (
                          <button
                            key={sl.name}
                            type="button"
                            onClick={() => handleSelectSetlistToAdd(sl.name)}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-sans flex items-center justify-between hover:bg-amber-50 hover:text-amber-950 transition-colors cursor-pointer text-stone-800"
                          >
                            <span className="truncate font-medium">{sl.name}</span>
                            {alreadyIn ? (
                              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                                En lista
                              </span>
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-stone-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Transpose Bar (Completely fixed width, zero layout shift) */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-stone-300 shadow-sm text-xs font-sans">
            <span className="font-semibold text-stone-600 hidden sm:inline">Transponer:</span>
            <button
              type="button"
              disabled={isLoadingAudio}
              onClick={async () => {
                try {
                  if (Tone.context.state !== 'running') {
                    await Tone.start();
                    await Tone.context.resume();
                  }
                } catch (e) {}
                onTranspose(-1);
              }}
              className={`w-6 h-6 rounded-lg font-mono font-bold flex items-center justify-center text-stone-800 transition-colors ${
                isLoadingAudio
                  ? 'bg-stone-100 opacity-40 cursor-not-allowed'
                  : 'bg-stone-100 hover:bg-stone-200 cursor-pointer'
              }`}
              title={isLoadingAudio ? 'Cargando audio...' : 'Bajar 1 semitono'}
            >
              -
            </button>
            <span className={`font-mono font-bold min-w-[28px] text-center ${isLoadingAudio ? 'text-stone-400' : 'text-amber-900'}`}>
              {isLoadingAudio ? '…' : (transpose > 0 ? `+${transpose}` : transpose)}
            </span>
            <button
              type="button"
              disabled={isLoadingAudio}
              onClick={async () => {
                try {
                  if (Tone.context.state !== 'running') {
                    await Tone.start();
                    await Tone.context.resume();
                  }
                } catch (e) {}
                onTranspose(1);
              }}
              className={`w-6 h-6 rounded-lg font-mono font-bold flex items-center justify-center text-stone-800 transition-colors ${
                isLoadingAudio
                  ? 'bg-stone-100 opacity-40 cursor-not-allowed'
                  : 'bg-stone-100 hover:bg-stone-200 cursor-pointer'
              }`}
              title={isLoadingAudio ? 'Cargando audio...' : 'Subir 1 semitono'}
            >
              +
            </button>
          </div>

          {/* Floating Video Toggle Button */}
          {song.youtubeId && !isVideoPaperOpen && onOpenVideoPaper && (
            <button
              type="button"
              onClick={onOpenVideoPaper}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 rounded-xl text-xs font-bold font-sans transition-colors cursor-pointer shadow-sm"
            >
              <Youtube className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">Ver Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Song Title & Metadata */}
      <div className="mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
            {song.title}
          </h2>
          <span className="font-mono text-xs font-bold text-amber-950 bg-amber-200/90 px-2.5 py-0.5 rounded-md border border-amber-300 shadow-sm">
            Tono: {transposeChord(song.key || 'C', transpose)}
          </span>
          {song.isCustom && (
            <span className="font-mono text-[11px] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-700" />
              <span>Arreglo Personal</span>
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm font-sans text-stone-600 mt-0.5">
          {song.artist} {song.composer ? `• ${song.composer}` : ''}
        </p>
      </div>
    </div>
  );
}
