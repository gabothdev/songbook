import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListMusic,
  Plus,
  ArrowLeft,
  Play,
  Trash2,
  Music,
  Guitar,
  Crown,
  Globe,
  Sparkles,
  ChevronRight,
  Folder,
  Disc3
} from 'lucide-react';

export default function SetlistsPanel({
  currentUser,
  setlists = [],
  activeSetlist = null,
  onSelectSetlist,
  onBackToSetlists,
  onCreateSetlist,
  onDeleteSetlist,
  onRemoveSongFromSetlist,
  onPlaySong,
  onPlaySetlist,
  isPro = false,
  onOpenUpgradeModal,
  onOpenSearchModal,
}) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newSetlistName.trim()) return;
    onCreateSetlist(newSetlistName.trim());
    setNewSetlistName('');
    setIsCreatingNew(false);
  };

  return (
    <div className="h-full flex flex-col justify-between select-none">
      {/* ================= TOP SECTION ================= */}
      <div>
        {/* User Mini Profile Header */}
        <div className="flex items-center gap-3.5 mb-5 bg-white/75 p-3.5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center font-serif text-xl font-bold shadow-md flex-shrink-0">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-900 tracking-tight truncate">
              {currentUser?.name || 'Músico'}
            </h2>
            <p className="text-xs font-sans text-stone-500 flex items-center gap-1.5 mt-0.5 truncate">
              <Guitar className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span className="truncate">{currentUser?.instrument || 'Guitarra'}</span>
            </p>
          </div>
        </div>

        {/* Setlist Navigation Switcher (List vs Detail) */}
        <AnimatePresence mode="wait">
          {!activeSetlist ? (
            /* ================= VIEW 1: SETLISTS OVERVIEW ================= */
            <motion.div
              key="setlists-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 font-sans flex items-center gap-1.5">
                  <ListMusic className="w-4 h-4 text-amber-700" />
                  Mis Setlists & Repertorios ({setlists.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className="text-xs font-sans text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingNew ? 'Cancelar' : 'Nueva Lista'}</span>
                </button>
              </div>

              {/* In-line New Setlist Input */}
              {isCreatingNew && (
                <motion.form
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleCreateSubmit}
                  className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 shadow-sm"
                >
                  <label className="text-[11px] font-sans font-bold text-stone-700 block">
                    Nombre del Repertorio o Show:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newSetlistName}
                      onChange={(e) => setNewSetlistName(e.target.value)}
                      placeholder="Ej: Acústico de Viernes..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 font-sans text-stone-900"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Setlists Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] xl:max-h-[300px] overflow-y-auto pr-1">
                {setlists.map((setlist) => {
                  const songCount = setlist.songs ? setlist.songs.length : (setlist.count || 0);
                  return (
                    <motion.div
                      key={setlist.name}
                      whileHover={{ scale: 1.015, y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onSelectSetlist(setlist)}
                      className="p-3 bg-white/85 hover:bg-white rounded-xl border border-stone-200/90 hover:border-amber-300 shadow-sm hover:shadow-md flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-amber-100/70 text-amber-800 group-hover:bg-stone-900 group-hover:text-amber-300 transition-colors flex-shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-sans font-bold text-stone-800 group-hover:text-amber-900 transition-colors truncate">
                            {setlist.name}
                          </h4>
                          <span className="text-[11px] font-mono text-stone-400 font-medium">
                            {songCount} {songCount === 1 ? 'tema' : 'temas'}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-700 transition-colors flex-shrink-0" />
                    </motion.div>
                  );
                })}

                {setlists.length === 0 && !isCreatingNew && (
                  <div className="col-span-full py-8 text-center bg-white/50 rounded-xl border border-dashed border-stone-300 text-stone-500 font-sans text-xs">
                    <Disc3 className="w-8 h-8 mx-auto mb-2 text-stone-400 opacity-60" />
                    <p className="font-semibold">No tienes setlists creados aún</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Crea uno para armar tu repertorio en vivo.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ================= VIEW 2: SELECTED SETLIST CONTENT ================= */
            <motion.div
              key="setlist-detail"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Breadcrumb & Setlist Header */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <button
                  type="button"
                  onClick={onBackToSetlists}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-lg border border-stone-300 text-xs font-bold font-sans shadow-sm transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Todos los Setlists</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar el setlist "${activeSetlist.name}"?`)) {
                      onDeleteSetlist(activeSetlist.name);
                    }
                  }}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar este setlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-serif font-black text-stone-900 tracking-tight flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-amber-700" />
                    <span>{activeSetlist.name}</span>
                  </h3>
                  <p className="text-[11px] font-sans text-stone-500">
                    {activeSetlist.songs?.length || 0} canciones en orden de ejecución
                  </p>
                </div>

                {activeSetlist.songs && activeSetlist.songs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onPlaySetlist(activeSetlist)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-black text-amber-200 rounded-xl font-sans font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tocar Set</span>
                  </button>
                )}
              </div>

              {/* Setlist Songs Ordered List */}
              <div className="space-y-1.5 max-h-[250px] xl:max-h-[290px] overflow-y-auto pr-1">
                {activeSetlist.songs && activeSetlist.songs.length > 0 ? (
                  activeSetlist.songs.map((song, sIdx) => (
                    <div
                      key={song.id || sIdx}
                      className="p-2.5 bg-white/90 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between hover:bg-white hover:border-amber-200 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-stone-400 w-4 text-center">
                          {sIdx + 1}
                        </span>

                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-mono text-[11px] font-bold border border-amber-300 flex-shrink-0">
                          {song.key || 'C'}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-serif font-bold text-xs text-stone-900 truncate">
                            {song.title}
                          </h4>
                          <p className="text-[10px] font-sans text-stone-500 truncate">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onPlaySong(song)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-900 text-stone-600 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                          title="Abrir acordes de esta canción"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSongFromSetlist(activeSetlist.name, song.id)}
                          className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Quitar del setlist"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 px-4 text-center bg-amber-50/60 rounded-xl border border-dashed border-amber-300 text-stone-600 font-sans text-xs">
                    <p className="font-semibold text-stone-800">Setlist sin canciones</p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Haz clic en el botón <strong className="text-amber-800">+</strong> en las canciones favoritas de la página derecha para sumarlas a esta lista.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= BOTTOM PRO / UTILITY SECTION ================= */}
      <div className="pt-4 border-t border-stone-200/70 space-y-2.5 mt-auto">
        {!isPro && (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="w-full py-2 px-3 bg-amber-100 hover:bg-amber-200/90 text-amber-900 border border-amber-300 rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>Desbloquear SongBook Pro</span>
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="py-2.5 px-3 bg-amber-100 hover:bg-amber-200/90 text-amber-950 border border-amber-300 rounded-xl font-sans font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-amber-700" />
            <span>Buscar en Web</span>
          </button>

          <button
            type="button"
            onClick={onOpenSearchModal}
            className="py-2.5 px-3 bg-stone-900 hover:bg-black text-amber-100 rounded-xl font-sans font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nueva Canción</span>
          </button>
        </div>
      </div>
    </div>
  );
}
