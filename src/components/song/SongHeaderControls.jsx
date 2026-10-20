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
  Edit3,
  Bookmark,
  BookmarkCheck,
  Disc,
} from 'lucide-react';
import { transposeChord } from '../../utils/music';
import { useAuth } from '../../context/AuthContext';

/**
 * SongHeaderControls Component
 * Fixed-dimension utility bar:
 * - Back button / Exit stage
 * - Edit song button (Admin feature ✏️)
 * - Save to notebook (🔖)
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
  isSaved = false,
  onToggleSaveSong = null,
  setlists = [],
  onAddSongToSetlist = null,
  transpose = 0,
  onTranspose,
  isPitchShiftActive = false,
  isLoadingAudio = false,
  isPremium = false,
  isAdmin: propIsAdmin,
  openUpgradeModal = null,
  isVideoPaperOpen = true,
  onOpenVideoPaper = null,
  onFeedbackToast = null,
  isEditMode = false,
  onToggleEditMode = null,
}) {
  const { currentUser, isAdmin: authIsAdmin } = useAuth();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsAdmin;
  const canEdit = Boolean(isAdmin || currentUser);
  const [isAddToSetlistOpen, setIsAddToSetlistOpen] = useState(false);

  const handleEditClick = () => {
    if (!canEdit) return;
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
          {/* Edit Song Button (For Registered Musicians and Admins) */}
          {canEdit && (
            <button
              type="button"
              onClick={handleEditClick}
              className={`relative group w-8 h-8 flex items-center justify-center rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
                isEditMode
                  ? 'bg-amber-600 border-amber-700 text-white hover:bg-amber-700'
                  : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-700'
              }`}
              title={isEditMode ? 'Cerrar Modo Edición' : 'Editar letra, sincronizar compases y estructura'}
            >
              <Edit3 className={`w-3.5 h-3.5 ${isEditMode ? 'text-white' : 'text-amber-700'}`} />
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900/90 text-stone-100 px-2 py-0.5 text-[10px] font-sans font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md z-40">
                {isEditMode ? 'Editando' : 'Editar'}
              </span>
            </button>
          )}

          {/* Save to Notebook Button */}
          {onToggleSaveSong && (
            <button
              type="button"
              onClick={() => onToggleSaveSong(song)}
              className={`relative group w-8 h-8 flex items-center justify-center rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
                isSaved
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200'
                  : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-700'
              }`}
              title={isSaved ? 'Guardada en tu cuaderno (clic para quitar)' : 'Guardar canción en tu cuaderno'}
            >
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700 fill-emerald-600/30" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900/90 text-stone-100 px-2 py-0.5 text-[10px] font-sans font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md z-40">
                {isSaved ? 'Guardada' : 'Guardar'}
              </span>
            </button>
          )}

          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(song)}
              className={`relative group w-8 h-8 flex items-center justify-center rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
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
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900/90 text-stone-100 px-2 py-0.5 text-[10px] font-sans font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md z-40">
                {isFavorite ? 'Favorita' : 'Favorito'}
              </span>
            </button>
          )}

          {/* Add to Setlist Popover Button */}
          {onAddSongToSetlist && (setlists.length > 0 || !currentUser) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onAddSongToSetlist(null, song);
                    return;
                  }
                  setIsAddToSetlistOpen(!isAddToSetlistOpen);
                }}
                className="relative group w-8 h-8 flex items-center justify-center bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-xl border border-stone-300 text-xs font-bold font-sans shadow-sm transition-all cursor-pointer"
                title="Agregar esta canción a un setlist"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-700" />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900/90 text-stone-100 px-2 py-0.5 text-[10px] font-sans font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md z-40">
                  Al Setlist
                </span>
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
        {(() => {
          let rawNames = [];
          if (Array.isArray(song.artists) && song.artists.length > 0) {
            rawNames = song.artists.map((a) => a?.name).filter(Boolean);
          } else if (song.artist) {
            rawNames = song.artist.split(',').map((s) => s.trim()).filter(Boolean);
          }

          // Desduplicar y descartar cadenas compuestas que sumen a los artistas individuales
          const uniqueArtists = [];
          for (const name of rawNames) {
            if (name.includes(',')) {
              const parts = name.split(',').map((p) => p.trim());
              const allPartsExist = parts.every((p) =>
                rawNames.some((other) => other !== name && other.toLowerCase() === p.toLowerCase())
              );
              if (allPartsExist) continue;
            }
            if (!uniqueArtists.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
              uniqueArtists.push(name);
            }
          }

          const artistDisplay = uniqueArtists.join(', ');
          return (
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm font-sans text-stone-600">
              <span className="font-semibold text-stone-800">{artistDisplay}</span>
              {song.composer && <span className="text-stone-500">• {song.composer}</span>}

              {/* Álbum al lado del artista con icono Disc */}
              {song.album && (
                <span className="inline-flex items-center gap-1.5 text-stone-700">
                  <span className="text-stone-400 not-italic">•</span>
                  <Disc className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                  <span className="font-serif italic font-semibold text-stone-800">
                    {song.album}
                  </span>
                  {song.releaseYear && (
                    <span className="font-mono text-[11px] text-stone-500 not-italic font-normal">
                      ({song.releaseYear})
                    </span>
                  )}
                </span>
              )}

              {/* Si no hay álbum pero sí año de lanzamiento */}
              {!song.album && song.releaseYear && (
                <span className="text-stone-500 font-mono text-[11px]">
                  • ({song.releaseYear})
                </span>
              )}

              {/* Contexto de la Versión si no es de estudio */}
              {song.versionType === 'live' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100/90 text-rose-900 border border-rose-300 text-[10px] font-bold shadow-xs">
                  <span>🎙️</span>
                  <span>En Vivo</span>
                </span>
              ) : song.versionType === 'soundtrack' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300 text-[10px] font-bold shadow-xs">
                  <span>🎬</span>
                  <span>Banda Sonora</span>
                </span>
              ) : song.versionType === 'session' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-200/90 text-stone-800 border border-stone-300 text-[10px] font-bold shadow-xs">
                  <span>📻</span>
                  <span>Sesión</span>
                </span>
              ) : song.versionType === 'acoustic' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100/90 text-orange-900 border border-orange-300 text-[10px] font-bold shadow-xs">
                  <span>🪕</span>
                  <span>Acústico</span>
                </span>
              ) : null}

              {song.versionDetails && (
                <span className="text-stone-500 italic text-[11px]">
                  • {song.versionDetails}
                </span>
              )}

              {song.genre && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-300 text-[10px] font-medium font-sans shadow-xs">
                  {song.genre}
                </span>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
