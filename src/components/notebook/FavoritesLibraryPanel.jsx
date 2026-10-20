import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Search,
  Sparkles,
  Play,
  Plus,
  Trash2,
  Music,
  X,
  Bookmark,
  Guitar,
  Flame,
  Folder,
  FolderPlus,
  Check,
  ArrowLeft,
  ListMusic
} from 'lucide-react';
import AdBanner from '../monetization/AdBanner';

export default function FavoritesLibraryPanel({
  userSongs = [],
  setlists = [],
  activeLibraryFilter = 'all', // 'all' | 'favorites' | 'setlist'
  activeSetlist = null,
  onOpenSong,
  onToggleFavorite,
  onToggleSaveSong,
  onAddSongToSetlist,
  onRemoveSongFromSetlist,
  onDeleteSetlist,
  onPlaySetlist,
  onOpenSearchModal,
  onBackToAll,
  isPro = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteSetlist, setConfirmDeleteSetlist] = useState(false);
  const [deletingSongId, setDeletingSongId] = useState(null);
  const [openSetlistMenuSongId, setOpenSetlistMenuSongId] = useState(null);

  // Seleccionar la colección base de canciones según el filtro activo
  const baseSongs = useMemo(() => {
    if (activeLibraryFilter === 'favorites') {
      return userSongs.filter((s) => s.isFavorite);
    }
    if (activeLibraryFilter === 'setlist') {
      return activeSetlist?.songs || [];
    }
    // 'all': canciones guardadas (o todas si no se ha filtrado)
    const saved = userSongs.filter((s) => s.isSaved !== false);
    return saved.length > 0 ? saved : userSongs;
  }, [activeLibraryFilter, activeSetlist, userSongs]);

  // Filtrado reactivo en tiempo real por título, artista o tono
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return baseSongs;
    const q = searchQuery.toLowerCase().trim();
    return baseSongs.filter((s) => {
      const artistNames = Array.isArray(s.artists) && s.artists.length > 0
        ? s.artists.map((a) => a.name).join(' ')
        : (s.artist || '');
      return (
        (s.title || '').toLowerCase().includes(q) ||
        artistNames.toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q)
      );
    });
  }, [baseSongs, searchQuery]);

  return (
    <div className="relative h-full flex flex-col justify-between select-none space-y-2.5">
      {/* ================= ENCABEZADO SUPERIOR ================= */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {activeLibraryFilter === 'setlist' ? (
              <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Folder className="w-3 h-3 text-amber-700" />
                <span>Repertorio</span>
              </span>
            ) : activeLibraryFilter === 'favorites' ? (
              <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                <span>Favoritas</span>
              </span>
            ) : (
              <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Bookmark className="w-3 h-3 fill-amber-700 text-amber-700" />
                <span>Mi Cancionero</span>
              </span>
            )}
            <span className="text-[11px] font-mono text-stone-500 font-medium">
              {filteredSongs.length} {filteredSongs.length === 1 ? 'canción' : 'canciones'}
            </span>
          </div>

          {/* Acciones para cuando hay un Setlist activo */}
          {activeLibraryFilter === 'setlist' && activeSetlist && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {baseSongs.length > 0 && onPlaySetlist && (
                <button
                  type="button"
                  onClick={() => onPlaySetlist(activeSetlist)}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-black text-amber-200 rounded-lg font-sans font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                  title="Comenzar ensayo o show de este setlist"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Tocar Set</span>
                </button>
              )}

              {onDeleteSetlist && (
                <AnimatePresence mode="wait">
                  {confirmDeleteSetlist ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1 bg-red-50 border border-red-300 rounded-lg px-2 py-0.5"
                    >
                      <span className="text-[10px] font-sans font-bold text-red-800">¿Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteSetlist(activeSetlist.name);
                          setConfirmDeleteSetlist(false);
                        }}
                        className="px-1.5 py-0.2 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold font-sans cursor-pointer"
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSetlist(false)}
                        className="px-1.5 py-0.2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[10px] font-bold font-sans cursor-pointer"
                      >
                        No
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="trash"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      type="button"
                      onClick={() => setConfirmDeleteSetlist(true)}
                      className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar este setlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>

        <h2 className="text-lg sm:text-xl font-serif font-black text-stone-900 tracking-tight leading-tight truncate">
          {activeLibraryFilter === 'setlist' && (activeSetlist?.name || 'Repertorio')}
          {activeLibraryFilter === 'favorites' && 'Mis Canciones Favoritas'}
          {activeLibraryFilter === 'all' && 'Mis Canciones Guardadas'}
        </h2>
        <p className="text-[11px] sm:text-xs font-sans text-stone-600 mt-0.5 truncate">
          {activeLibraryFilter === 'setlist'
            ? `Temas ordenados para "${activeSetlist?.name || 'el repertorio'}"`
            : activeLibraryFilter === 'favorites'
            ? 'Tus canciones con estrella para acceso rápido'
            : 'Tu cuaderno personal con letras, acordes y configuraciones de tono'}
        </p>
      </div>

      {/* ================= BUSCADOR RÁPIDO & INDICADOR ================= */}
      <div className="flex-shrink-0 space-y-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por canción, artista o tono en tu repertorio..."
            className="w-full pl-8 pr-7 py-1.5 bg-white/90 focus:bg-white text-xs font-sans text-stone-800 placeholder-stone-400 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 shadow-2xs transition-all outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-sans text-stone-500 px-1">
          <span className="flex items-center gap-1 truncate">
            <Flame className="w-3 h-3 text-amber-600 fill-amber-500 flex-shrink-0" />
            <span className="truncate">
              {activeLibraryFilter === 'setlist'
                ? `En setlist: ${filteredSongs.length} temas`
                : activeLibraryFilter === 'favorites'
                ? `Favoritas: ${filteredSongs.length} temas`
                : `Mi cuaderno: ${filteredSongs.length} temas`}
            </span>
          </span>
          {searchQuery && (
            <span className="text-amber-800 font-medium ml-2 flex-shrink-0">
              Filtrado: "{searchQuery}"
            </span>
          )}
        </div>
      </div>

      {/* ================= CUADRÍCULA DE TARJETAS (2 COLUMNAS) ================= */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredSongs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
              {filteredSongs.map((song, i) => {
                const rotationClass = i % 2 === 0 ? '-rotate-1' : 'rotate-1';
                const isFav = Boolean(song.isFavorite);
                const hasScore = song.popularityScore > 0;

                return (
                  <motion.div
                    key={song.id || `lib-song-${i}`}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => onOpenSong && onOpenSong(song)}
                    className={`p-2 bg-white/95 hover:bg-white rounded-xl border border-stone-200/90 hover:border-amber-400/80 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2.5 group text-left relative ${
                      openSetlistMenuSongId === song.id ? 'z-30' : 'z-0'
                    }`}
                  >
                    {/* Foto del Artista en formato Polaroid con Play visible en Hover */}
                    <div
                      className={`relative p-0.5 pb-1 bg-[#f4f2ec] rounded border border-stone-300/80 shadow-2xs flex-shrink-0 transition-transform duration-200 group-hover:rotate-0 group-hover:scale-105 ${rotationClass}`}
                    >
                      {song.artistImage ? (
                        <img
                          src={song.artistImage}
                          alt={song.artist || 'Artista'}
                          className="w-10 h-10 rounded-[2px] object-cover bg-stone-900 border border-stone-300/40"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-[2px] bg-[#352820] flex items-center justify-center text-amber-200">
                          <Guitar className="w-4 h-4 text-amber-300/80" />
                        </div>
                      )}

                      {/* Icono Play visible sobre la foto al hacer hover en la tarjeta */}
                      <div className="absolute inset-0 bg-stone-900/60 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center backdrop-blur-[0.5px]">
                        <Play className="w-4 h-4 text-amber-300 fill-amber-300 ml-0.5 filter drop-shadow" />
                      </div>
                    </div>

                    {/* Información de la canción */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-stone-900 text-xs group-hover:text-amber-900 transition-colors truncate leading-tight">
                        {song.title}
                      </h4>
                      <p className="text-[10.5px] font-sans text-stone-500 font-medium truncate mt-0.5 leading-tight">
                        {(Array.isArray(song.artists) && song.artists.length > 0
                          ? song.artists.map((a) => a.name).join(', ')
                          : song.artist) || 'Artista Desconocido'}
                      </p>

                      {/* Metadatos: Tono & Popularidad */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {song.key && (
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200/80">
                            {song.key}
                          </span>
                        )}
                        {hasScore ? (
                          <span className="font-sans text-[9px] font-semibold text-amber-700 flex items-center gap-0.5 bg-amber-50/80 px-1 py-0.2 rounded border border-amber-200/50">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                            <span>{song.popularityScore}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Acciones Rápidas en la Tarjeta */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Botón Favorito (Estrella) */}
                      {onToggleFavorite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(song);
                          }}
                          className={`p-1 rounded-lg transition-all cursor-pointer ${
                            isFav
                              ? 'text-amber-500 hover:text-amber-600 bg-amber-50'
                              : 'text-stone-300 hover:text-amber-500 hover:bg-stone-100'
                          }`}
                          title={isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      )}

                      {/* Botón Agregar a Setlist (con Popover desplegable) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenSetlistMenuSongId(openSetlistMenuSongId === song.id ? null : song.id);
                          }}
                          className={`p-1 rounded-lg transition-all cursor-pointer ${
                            openSetlistMenuSongId === song.id
                              ? 'bg-amber-100 text-amber-900'
                              : 'text-stone-400 hover:text-amber-800 hover:bg-stone-100'
                          }`}
                          title="Sumar a un repertorio"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>

                        {/* Popover flotante de selección de Setlist */}
                        {openSetlistMenuSongId === song.id && (
                          <div
                            className={`absolute right-0 ${
                              i >= filteredSongs.length - 2 ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                            } w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-stone-200/90 p-2 z-50 space-y-1 text-left`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                              <span className="font-sans font-bold text-[10px] text-stone-500 uppercase tracking-wider">
                                Sumar a Setlist
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenSetlistMenuSongId(null);
                                }}
                                className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {setlists.length > 0 ? (
                              <div className="max-h-36 overflow-y-auto space-y-0.5 custom-scrollbar py-0.5">
                                {setlists.map((sl) => {
                                  const inThisSetlist = (sl.songs || []).some(
                                    (s) => String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
                                  );
                                  return (
                                    <button
                                      key={sl.name}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (inThisSetlist) {
                                          onRemoveSongFromSetlist && onRemoveSongFromSetlist(sl.name, song.id);
                                        } else {
                                          onAddSongToSetlist && onAddSongToSetlist(sl.name, song);
                                        }
                                      }}
                                      className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] font-sans flex items-center justify-between transition-colors cursor-pointer ${
                                        inThisSetlist
                                          ? 'bg-amber-100/90 text-amber-950 font-bold'
                                          : 'hover:bg-stone-50 text-stone-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Folder className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                                        <span className="truncate">{sl.name}</span>
                                      </div>
                                      {inThisSetlist ? (
                                        <Check className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
                                      ) : (
                                        <Plus className="w-3 h-3 text-stone-400 flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="py-2 px-1 text-center text-stone-500 text-[11px] font-sans">
                                <p className="font-semibold text-stone-700">Sin setlists creados</p>
                                <p className="text-[10px] text-stone-400 mt-0.5">Crea uno en la hoja izquierda para sumar temas.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Botón Quitar de Setlist o Guardadas con Confirmación Inline */}
                      {deletingSongId === song.id ? (
                        <div
                          className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-1.5 py-0.5 shadow-2xs z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-sans font-bold text-red-700">¿Quitar?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeLibraryFilter === 'setlist' && activeSetlist && onRemoveSongFromSetlist) {
                                onRemoveSongFromSetlist(activeSetlist.name, song.id);
                              } else if (onToggleSaveSong) {
                                onToggleSaveSong(song);
                              }
                              setDeletingSongId(null);
                            }}
                            className="px-1.5 py-0.2 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold font-sans cursor-pointer transition-colors"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSongId(null);
                            }}
                            className="px-1.5 py-0.2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[10px] font-bold font-sans cursor-pointer transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Botón Quitar de Setlist */}
                          {activeLibraryFilter === 'setlist' && activeSetlist && onRemoveSongFromSetlist && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingSongId(song.id);
                              }}
                              className="p-1 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Quitar de este setlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botón Quitar de Guardadas (en vista 'all') */}
                          {activeLibraryFilter === 'all' && onToggleSaveSong && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingSongId(song.id);
                              }}
                              className="p-1 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                              title="Quitar de mis canciones guardadas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-stone-500 space-y-2">
              <Music className="w-7 h-7 mx-auto text-stone-400/80" />
              {searchQuery ? (
                <>
                  <p className="text-xs font-sans">No se encontraron temas para "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-sans font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                  >
                    Ver todas las canciones
                  </button>
                </>
              ) : activeLibraryFilter === 'setlist' ? (
                <>
                  <p className="text-xs font-sans font-medium text-stone-700">Este setlist está vacío.</p>
                  <p className="text-[11px] font-sans text-stone-400">
                    Suma temas desde "Mis Guardadas" o usa el buscador global.
                  </p>
                  {onBackToAll && (
                    <button
                      type="button"
                      onClick={onBackToAll}
                      className="mt-1 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
                    >
                      Ir a Mis Guardadas
                    </button>
                  )}
                </>
              ) : activeLibraryFilter === 'favorites' ? (
                <>
                  <p className="text-xs font-sans font-medium text-stone-700">No tienes canciones favoritas todavía.</p>
                  <p className="text-[11px] font-sans text-stone-400">
                    Toca la estrella ⭐ en cualquier tema para sumarlo aquí.
                  </p>
                  {onBackToAll && (
                    <button
                      type="button"
                      onClick={onBackToAll}
                      className="mt-1 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
                    >
                      Explorar Mis Guardadas
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-sans font-medium text-stone-700">Tu cancionero está vacío.</p>
                  <p className="text-[11px] font-sans text-stone-400">
                    Busca canciones en la web o crea una nueva con acordes y video.
                  </p>
                  {onOpenSearchModal && (
                    <button
                      type="button"
                      onClick={onOpenSearchModal}
                      className="mt-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
                    >
                      Buscar en Web
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Backdrop transparente para cerrar menú de Setlist al hacer clic afuera */}
      {openSetlistMenuSongId && (
        <div
          className="fixed inset-0 z-20 pointer-events-auto"
          onClick={() => setOpenSetlistMenuSongId(null)}
        />
      )}

      {/* ================= BANNER INFERIOR SI NO ES PRO ================= */}
      {!isPro && (
        <div className="flex-shrink-0 pt-1">
          <AdBanner slot="library-footer" />
        </div>
      )}
    </div>
  );
}
