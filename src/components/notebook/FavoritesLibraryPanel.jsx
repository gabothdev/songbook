import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Search,
  Sparkles,
  Play,
  Plus,
  Check,
  Music,
  Database,
  X,
  Heart,
  ListPlus
} from 'lucide-react';
import AdBanner from '../monetization/AdBanner';

export default function FavoritesLibraryPanel({
  userSongs = [],
  onOpenSong,
  onToggleFavorite,
  activeSetlist = null,
  onAddSongToSetlist,
  onOpenSearchModal,
  isPro = false,
}) {
  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [justAddedSongId, setJustAddedSongId] = useState(null);

  const favoriteSongs = userSongs.filter((s) => s.isFavorite);
  const baseSongsList = activeTab === 'favorites' ? favoriteSongs : userSongs;

  const filteredSongs = baseSongsList.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (s.title && s.title.toLowerCase().includes(term)) ||
      (s.artist && s.artist.toLowerCase().includes(term)) ||
      (s.key && s.key.toLowerCase().includes(term))
    );
  });

  const handleAddClick = (e, song) => {
    e.stopPropagation();
    if (!activeSetlist) return;
    onAddSongToSetlist(activeSetlist.name, song);
    setJustAddedSongId(song.id);
    setTimeout(() => setJustAddedSongId(null), 1500);
  };

  const isSongInActiveSetlist = (songId) => {
    if (!activeSetlist || !activeSetlist.songs) return false;
    return activeSetlist.songs.some((s) => s.id === songId);
  };

  return (
    <div className="h-full flex flex-col justify-between select-none">
      <div>
        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>{activeTab === 'favorites' ? 'Canciones Favoritas' : 'Todas las Canciones'}</span>
              <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                {activeTab === 'favorites' ? favoriteSongs.length : userSongs.length}
              </span>
            </h3>
            <p className="text-xs font-sans text-stone-500 mt-0.5">
              {activeSetlist ? (
                <span className="text-amber-900 font-medium">
                  📌 Setlist abierto: <strong className="font-serif">{activeSetlist.name}</strong> (usa <strong className="text-amber-800">+</strong> para sumar temas)
                </span>
              ) : (
                'Toca cualquier tema para abrir la partitura interactiva con acordes y video'
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSearchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-amber-50 rounded-xl font-sans font-bold text-xs shadow-sm transition-all cursor-pointer flex-shrink-0 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Buscar en Web</span>
          </button>
        </div>

        {/* ================= TABS & SEARCH BAR ================= */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          {/* Tab Selector */}
          <div className="bg-stone-200/70 p-1 rounded-xl flex items-center shadow-inner self-start flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>Favoritas ({favoriteSongs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-stone-500" />
              <span>Todas ({userSongs.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por título, artista o tono (ej. C, G, Bm)..."
              className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 pl-9 pr-8 py-1.5 rounded-xl text-xs text-stone-900 font-sans transition-all outline-none shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ================= SONGS LIST ================= */}
        <div className="space-y-2 max-h-[340px] xl:max-h-[390px] overflow-y-auto pr-1">
          {filteredSongs.map((song) => {
            const isFav = !!song.isFavorite;
            const inActiveSet = isSongInActiveSetlist(song.id);
            const isJustAdded = justAddedSongId === song.id;

            return (
              <motion.div
                key={song.id}
                whileHover={{ x: 3, scale: 1.004 }}
                onClick={() => onOpenSong(song)}
                className="p-3 bg-white/90 hover:bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                {/* Left: Key Badge & Song Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-mono text-xs font-bold border border-amber-300 group-hover:bg-stone-900 group-hover:text-amber-300 group-hover:border-stone-900 transition-colors shadow-sm flex-shrink-0">
                    {song.key || 'C'}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm group-hover:text-amber-900 transition-colors truncate">
                      {song.title}
                    </h4>
                    <p className="text-[11px] font-sans text-stone-500 truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Quick Add to Active Setlist */}
                  {activeSetlist && (
                    <button
                      type="button"
                      onClick={(e) => handleAddClick(e, song)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold font-sans flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                        isJustAdded
                          ? 'bg-emerald-600 text-white'
                          : inActiveSet
                          ? 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                      }`}
                      title={
                        inActiveSet
                          ? `Ya está en "${activeSetlist.name}". Clic para agregar de nuevo.`
                          : `Sumar a "${activeSetlist.name}"`
                      }
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span className="text-[10px]">¡Listo!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span className="hidden md:inline text-[10px]">Al Set</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Favorite Star Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(song)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 transition-all cursor-pointer"
                    title={isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                  >
                    <Star
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        isFav
                          ? 'text-amber-500 fill-amber-400'
                          : 'text-stone-300 hover:text-amber-400'
                      }`}
                    />
                  </button>

                  {/* Play / Open Button */}
                  <button
                    type="button"
                    onClick={() => onOpenSong(song)}
                    className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-stone-900 text-stone-400 group-hover:text-amber-300 transition-colors cursor-pointer"
                    title="Abrir acordes"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {filteredSongs.length === 0 && (
            <div className="py-10 text-center bg-white/60 rounded-2xl border border-dashed border-stone-300 p-6">
              {activeTab === 'favorites' && !searchTerm ? (
                <>
                  <Star className="w-10 h-10 mx-auto mb-2 text-amber-300 fill-amber-100" />
                  <h4 className="font-serif font-bold text-stone-800 text-sm">No tienes canciones favoritas aún</h4>
                  <p className="text-xs font-sans text-stone-500 mt-1 max-w-sm mx-auto">
                    Ve a la pestaña <strong>"Todas"</strong> y toca la estrella <Star className="w-3 h-3 inline text-amber-500 fill-amber-400" /> en tus temas predilectos para armar tu cancionero principal.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="mt-3 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
                  >
                    Ver todas las canciones
                  </button>
                </>
              ) : (
                <>
                  <Music className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                  <p className="font-serif font-bold text-stone-700 text-xs">No se encontraron canciones</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Prueba con otra búsqueda o importa desde la web.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Non-Pro Ad Banner */}
        {!isPro && <AdBanner slotId="dashboard-bottom" />}
      </div>

      {/* ================= FOOTER INFO ================= */}
      <div className="pt-3 border-t border-stone-200/70 flex items-center justify-between text-[11px] font-sans text-stone-500 mt-auto">
        <span className="font-medium">
          {filteredSongs.length} {filteredSongs.length === 1 ? 'canción mostrada' : 'canciones mostradas'}
        </span>
        <span className="font-serif italic flex items-center gap-1 text-amber-900 font-semibold">
          <Database className="w-3 h-3" /> Sincronizado en Vivo
        </span>
      </div>
    </div>
  );
}
