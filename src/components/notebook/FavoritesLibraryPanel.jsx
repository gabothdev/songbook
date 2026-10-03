import React, { useState, useEffect } from 'react';
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
  FileText,
  Layers,
  Loader2,
  Bookmark,
  Guitar,
  ArrowRight
} from 'lucide-react';
import AdBanner from '../monetization/AdBanner';
import { scoresApi } from '../../services/scoresApi';

const POPULAR_SEARCH_SUGGESTIONS = [
  'Master of Puppets',
  'Hotel California',
  'Nothing Else Matters',
  'Sultans of Swing',
  'Stairway to Heaven',
  'Sweet Child O\' Mine',
  'Yesterday',
  'Back in Black',
];

export default function FavoritesLibraryPanel({
  userSongs = [],
  onOpenSong,
  onToggleFavorite,
  activeSetlist = null,
  onAddSongToSetlist,
  onOpenSearchModal,
  isPro = false,
  onSelectScore,
  savedScores = [],
}) {
  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'all' | 'scores'
  const [searchTerm, setSearchTerm] = useState('');
  const [justAddedSongId, setJustAddedSongId] = useState(null);

  // Estados para búsqueda de partituras Songsterr
  const [scoreResults, setScoreResults] = useState([]);
  const [isSearchingScores, setIsSearchingScores] = useState(false);
  const [scoreSearchError, setScoreSearchError] = useState(null);

  // Debounce para búsqueda en Songsterr cuando activeTab === 'scores'
  useEffect(() => {
    if (activeTab !== 'scores') return;
    if (!searchTerm.trim()) {
      setScoreResults([]);
      setIsSearchingScores(false);
      setScoreSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingScores(true);
      setScoreSearchError(null);
      try {
        const results = await scoresApi.searchSongsterr(searchTerm);
        setScoreResults(results || []);
      } catch (err) {
        console.error('Error al buscar en Songsterr:', err);
        setScoreSearchError('No se pudo conectar con Songsterr.');
      } finally {
        setIsSearchingScores(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  const favoriteSongs = userSongs.filter((s) => s.isFavorite);
  const baseSongsList = activeTab === 'favorites' ? favoriteSongs : userSongs;

  const filteredSongs = baseSongsList.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const artistNames = Array.isArray(s.artists) && s.artists.length > 0
      ? s.artists.map((a) => a.name).join(' ')
      : (s.artist || '');
    return (
      (s.title && s.title.toLowerCase().includes(term)) ||
      artistNames.toLowerCase().includes(term) ||
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

  const handleSelectScoreItem = (song) => {
    if (!onSelectScore) return;
    onSelectScore({
      songsterrId: song.songId,
      title: song.title,
      artist: song.artist,
      defaultTrack: song.popularTrackGuitar ?? song.popularTrack ?? song.defaultTrack ?? 0,
      tracks: song.tracks,
    });
  };

  const handleSelectSavedScoreItem = (saved) => {
    if (!onSelectScore) return;
    onSelectScore({
      id: saved.id,
      songsterrId: saved.songsterrId,
      title: saved.title,
      artist: saved.artist,
      defaultTrack: saved.defaultTrack,
      tracks: saved.tracks,
      songData: saved.songData,
    });
  };

  return (
    <div className="h-full flex flex-col justify-between select-none">
      <div>
        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>
                {activeTab === 'favorites' && 'Canciones Favoritas'}
                {activeTab === 'all' && 'Cancionero Completo'}
                {activeTab === 'scores' && 'Partituras & Tablaturas'}
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                activeTab === 'scores'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {activeTab === 'favorites' && favoriteSongs.length}
                {activeTab === 'all' && userSongs.length}
                {activeTab === 'scores' && 'Songsterr'}
              </span>
            </h3>
            <p className="text-xs font-sans text-stone-500 mt-0.5">
              {activeTab === 'scores' ? (
                'Toca cualquier tema para abrir la partitura completa en hoja blanca de atril'
              ) : activeSetlist ? (
                <span className="text-amber-900 font-medium">
                  📌 Setlist abierto: <strong className="font-serif">{activeSetlist.name}</strong> (usa <strong className="text-amber-800">+</strong> para sumar temas)
                </span>
              ) : (
                'Toca cualquier tema para abrir acordes, letra sincronizada y video'
              )}
            </p>
          </div>

          {activeTab !== 'scores' && (
            <button
              type="button"
              onClick={onOpenSearchModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-amber-50 rounded-xl font-sans font-bold text-xs shadow-sm transition-all cursor-pointer flex-shrink-0 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Buscar en Web</span>
            </button>
          )}
        </div>

        {/* ================= TABS SELECTOR & SEARCH BAR ================= */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          {/* Selector de Modos: Favoritas | Todas | Partituras */}
          <div className="bg-stone-200/70 p-1 rounded-xl flex items-center shadow-inner self-start flex-shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('favorites');
                setSearchTerm('');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1 cursor-pointer ${
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
              onClick={() => {
                setActiveTab('all');
                setSearchTerm('');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-stone-500" />
              <span>Todas ({userSongs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('scores');
                setSearchTerm('');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'scores'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>Partituras & Tabs</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'scores'
                  ? 'Buscar en Songsterr (ej. Metallica, Queen, Hotel California)...'
                  : 'Filtrar por título, artista o tono (ej. C, G, Bm)...'
              }
              className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 pl-9 pr-8 py-1.5 rounded-xl text-xs text-stone-900 font-sans transition-all outline-none shadow-sm"
            />
            {isSearchingScores ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-700 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* ================= CONTENIDO DE LA LISTA ================= */}
        <div className="space-y-2 max-h-[340px] xl:max-h-[390px] overflow-y-auto pr-1">
          {/* ================= VISTA A: PARTITURAS & TABS SONGSTERR ================= */}
          {activeTab === 'scores' ? (
            <>
              {scoreSearchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-sans">
                  {scoreSearchError}
                </div>
              )}

              {/* Si hay resultados de búsqueda en Songsterr */}
              {scoreResults.length > 0 && (
                <div className="space-y-2">
                  {scoreResults.map((song) => (
                    <motion.div
                      key={song.songId}
                      whileHover={{ x: 3, scale: 1.004 }}
                      onClick={() => handleSelectScoreItem(song)}
                      className="p-3 bg-white/95 hover:bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-300 group-hover:bg-emerald-700 group-hover:text-white transition-colors shadow-xs flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm group-hover:text-emerald-900 transition-colors truncate">
                            {song.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] font-sans text-stone-500 truncate">
                            <span>{song.artist}</span>
                            {song.tracks && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-800 font-medium">
                                  {song.tracks.length} {song.tracks.length === 1 ? 'pista' : 'pistas'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectScoreItem(song)}
                          className="px-2.5 py-1 bg-emerald-50 group-hover:bg-emerald-700 text-emerald-800 group-hover:text-white border border-emerald-200 group-hover:border-emerald-700 rounded-lg text-xs font-bold font-sans flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">Ver Partitura</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Si no se está buscando y no hay resultados todavía */}
              {!searchTerm.trim() && scoreResults.length === 0 && (
                <div className="space-y-3">
                  {/* Partituras Guardadas si existen */}
                  {savedScores && savedScores.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-stone-800 mb-2">
                        <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        <span>Partituras Guardadas en tu Biblioteca ({savedScores.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {savedScores.map((saved) => (
                          <div
                            key={saved.id}
                            onClick={() => handleSelectSavedScoreItem(saved)}
                            className="p-2.5 bg-white/90 hover:bg-white rounded-xl border border-stone-200 hover:border-amber-400 shadow-2xs transition cursor-pointer flex items-center justify-between"
                          >
                            <div className="min-w-0">
                              <h5 className="font-serif font-bold text-xs text-stone-900 truncate">
                                {saved.title}
                              </h5>
                              <p className="text-[10px] text-stone-500 truncate">{saved.artist}</p>
                            </div>
                            <button
                              type="button"
                              className="p-1 rounded-md bg-stone-100 hover:bg-emerald-700 hover:text-white text-stone-600 transition"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sugerencias Rápidas */}
                  <div className="p-3.5 bg-white/80 rounded-2xl border border-stone-200/90 shadow-xs">
                    <span className="text-xs font-serif font-bold text-stone-800 block mb-1.5">
                      ✦ Búsquedas Populares con Tablatura:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SEARCH_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setSearchTerm(sug)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 rounded-lg text-[11px] font-sans text-stone-700 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>{sug}</span>
                          <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner Explicativo */}
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-sans leading-relaxed">
                    <span className="font-bold block mb-0.5">🎼 Notación Interactiva de Songsterr:</span>
                    Accede a tablaturas de guitarra, bajo, batería y teclados. Puedes aislar pistas, cambiar la velocidad para ensayar pasajes difíciles y ver la partitura en pantalla completa.
                  </div>
                </div>
              )}

              {/* Si buscó y no hubo resultados */}
              {searchTerm.trim() && !isSearchingScores && scoreResults.length === 0 && (
                <div className="py-10 text-center bg-white/60 rounded-2xl border border-dashed border-stone-300 p-6">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                  <p className="font-serif font-bold text-stone-700 text-xs">
                    No se encontraron partituras para "{searchTerm}"
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Prueba buscando por el nombre de la banda o en inglés.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* ================= VISTA B: CANCIONERO (FAVORITAS / TODAS) ================= */
            <>
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
                          {Array.isArray(song.artists) && song.artists.length > 0
                            ? song.artists.map((a) => a.name).join(', ')
                            : song.artist}
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
                        Ve a la pestaña <strong>"Todas"</strong> o toca <strong>"Partituras & Tabs"</strong> para explorar canciones y agregarlas a tus favoritos.
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
                      <p className="text-[11px] text-stone-400 mt-0.5">Prueba con otra búsqueda o busca en Partituras & Tabs.</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Non-Pro Ad Banner */}
        {!isPro && <AdBanner slotId="dashboard-bottom" />}
      </div>

      {/* ================= FOOTER INFO ================= */}
      <div className="pt-3 border-t border-stone-200/70 flex items-center justify-between text-[11px] font-sans text-stone-500 mt-auto">
        <span className="font-medium">
          {activeTab === 'scores'
            ? scoreResults.length > 0
              ? `${scoreResults.length} partituras encontradas`
              : `${savedScores.length} partituras guardadas`
            : `${filteredSongs.length} ${filteredSongs.length === 1 ? 'canción mostrada' : 'canciones mostradas'}`}
        </span>
        <span className="font-serif italic flex items-center gap-1 text-amber-900 font-semibold">
          <Database className="w-3 h-3" /> Sincronizado en Vivo
        </span>
      </div>
    </div>
  );
}
