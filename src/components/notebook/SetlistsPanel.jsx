import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  Music,
  Guitar,
  Crown,
  Globe,
  Sparkles,
  ChevronRight,
  Folder,
  Disc3,
  Bookmark,
  Star,
  Check
} from 'lucide-react';

export default function SetlistsPanel({
  currentUser,
  userSongs = [],
  setlists = [],
  activeLibraryFilter = 'all', // 'all' | 'favorites' | 'setlist'
  activeSetlist = null,
  onSelectFilter, // (filterType: 'all' | 'favorites') => void
  onSelectSetlist, // (setlist) => void
  onCreateSetlist,
  onDeleteSetlist,
  isPro = false,
  onOpenUpgradeModal,
  onOpenSearchModal,
}) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [deletingSetlistName, setDeletingSetlistName] = useState(null);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newSetlistName.trim()) return;
    onCreateSetlist(newSetlistName.trim());
    setNewSetlistName('');
    setIsCreatingNew(false);
  };

  const savedCount = userSongs.filter((s) => s.isSaved !== false).length;
  const favoritesCount = userSongs.filter((s) => s.isFavorite).length;

  return (
    <div className="h-full flex flex-col justify-between select-none">
      {/* ================= TOP / MAIN NAVIGATION SECTION ================= */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* User Mini Profile Header */}
        <div className="flex-shrink-0 flex items-center gap-3.5 mb-4 bg-white/75 p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center font-serif text-lg font-bold shadow-xs flex-shrink-0">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 tracking-tight truncate">
              {currentUser?.name || 'Músico'}
            </h2>
            <p className="text-[11px] font-sans text-stone-500 flex items-center gap-1.5 mt-0.5 truncate">
              <Guitar className="w-3 h-3 text-amber-700 flex-shrink-0" />
              <span className="truncate">{currentUser?.instrument || 'Guitarra'}</span>
            </p>
          </div>
        </div>

        {/* ================= FILTROS PRINCIPALES DE BIBLIOTECA ================= */}
        <div className="flex-shrink-0 space-y-1.5 mb-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-sans block px-1">
            Explorar Repertorio
          </span>

          <div className="grid grid-cols-2 gap-2">
            {/* Botón: Mis Guardadas */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelectFilter && onSelectFilter('all')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                activeLibraryFilter === 'all'
                  ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-bold shadow-xs ring-1 ring-amber-300/60'
                  : 'bg-white/80 hover:bg-white border-stone-200/90 text-stone-700 hover:border-amber-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 ${
                    activeLibraryFilter === 'all'
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-amber-100/80 text-amber-800'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-sans font-bold block truncate">
                    Mis Guardadas
                  </span>
                  <span className="text-[10px] font-sans text-stone-500">
                    Todo mi catálogo
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ml-1.5 flex-shrink-0 ${
                  activeLibraryFilter === 'all'
                    ? 'bg-amber-200/80 text-amber-950'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {savedCount}
              </span>
            </motion.button>

            {/* Botón: Mis Favoritas */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelectFilter && onSelectFilter('favorites')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                activeLibraryFilter === 'favorites'
                  ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-bold shadow-xs ring-1 ring-amber-300/60'
                  : 'bg-white/80 hover:bg-white border-stone-200/90 text-stone-700 hover:border-amber-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 ${
                    activeLibraryFilter === 'favorites'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100/80 text-amber-800'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-sans font-bold block truncate">
                    Mis Favoritas
                  </span>
                  <span className="text-[10px] font-sans text-stone-500">
                    Canciones clave
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ml-1.5 flex-shrink-0 ${
                  activeLibraryFilter === 'favorites'
                    ? 'bg-amber-200/80 text-amber-950'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {favoritesCount}
              </span>
            </motion.button>
          </div>
        </div>

        {/* ================= SECCIÓN DE SETLISTS & REPERTORIOS ================= */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 font-sans flex items-center gap-1.5">
              <ListMusic className="w-3.5 h-3.5 text-amber-700" />
              Mis Setlists ({setlists.length})
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="text-[11px] font-sans text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingNew ? 'Cancelar' : 'Nueva Lista'}</span>
            </button>
          </div>

          {/* Formulario en línea para crear nuevo Setlist */}
          {isCreatingNew && (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleCreateSubmit}
              className="p-2.5 mb-2 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 shadow-2xs flex-shrink-0"
            >
              <label className="text-[10.5px] font-sans font-bold text-stone-700 block">
                Nombre del repertorio o fecha de show:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newSetlistName}
                  onChange={(e) => setNewSetlistName(e.target.value)}
                  placeholder="Ej: Acústico en Bar..."
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 font-sans text-stone-900"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
                >
                  Guardar
                </button>
              </div>
            </motion.form>
          )}

          {/* Lista de Carpetas de Setlists con autoscroll */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {setlists.map((setlist) => {
              const songCount = setlist.songs ? setlist.songs.length : (setlist.count || 0);
              const isActive = activeLibraryFilter === 'setlist' && activeSetlist?.name === setlist.name;
              const isDeleting = deletingSetlistName === setlist.name;

              return (
                <motion.div
                  key={setlist.name}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectSetlist && onSelectSetlist(setlist)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/30 text-amber-950 font-bold shadow-xs'
                      : 'bg-white/80 hover:bg-white border-stone-200/90 hover:border-amber-300 shadow-2xs text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                        isActive
                          ? 'bg-stone-900 text-amber-300'
                          : 'bg-amber-100/70 text-amber-800 group-hover:bg-stone-900 group-hover:text-amber-300'
                      }`}
                    >
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-sans font-bold truncate group-hover:text-amber-950 transition-colors">
                        {setlist.name}
                      </h4>
                      <span className="text-[10px] font-mono text-stone-500 font-medium">
                        {songCount} {songCount === 1 ? 'tema' : 'temas'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-1.5 py-0.5">
                        <span className="text-[10px] font-sans font-bold text-red-700">¿Borrar?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSetlist(setlist.name);
                            setDeletingSetlistName(null);
                          }}
                          className="px-1.5 py-0.2 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold font-sans cursor-pointer"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSetlistName(null)}
                          className="px-1.5 py-0.2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[10px] font-bold font-sans cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingSetlistName(setlist.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                        title="Eliminar este repertorio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <ChevronRight
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-amber-800' : 'text-stone-300 group-hover:text-amber-700'
                      }`}
                    />
                  </div>
                </motion.div>
              );
            })}

            {setlists.length === 0 && !isCreatingNew && (
              <div className="py-6 px-3 text-center bg-white/40 rounded-xl border border-dashed border-stone-300 text-stone-500 font-sans text-xs">
                <Disc3 className="w-7 h-7 mx-auto mb-1.5 text-stone-400 opacity-60" />
                <p className="font-semibold">No tienes setlists aún</p>
                <p className="text-[10.5px] text-stone-400 mt-0.5">
                  Crea listas para organizar tus ensayos y shows.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= BOTTOM PRO / UTILITY SECTION ================= */}
      <div className="flex-shrink-0 pt-3 border-t border-stone-200/80 space-y-2 mt-2">
        {!isPro && (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="w-full py-1.5 px-3 bg-amber-100 hover:bg-amber-200/90 text-amber-900 border border-amber-300 rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>Desbloquear SongBook Pro</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="py-2 px-2.5 bg-amber-100 hover:bg-amber-200/90 text-amber-950 border border-amber-300 rounded-xl font-sans font-bold text-[11px] sm:text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all truncate"
          >
            <Globe className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span className="truncate">Buscar en Web</span>
          </button>

          <button
            type="button"
            onClick={onOpenSearchModal}
            className="py-2 px-2.5 bg-stone-900 hover:bg-black text-amber-100 rounded-xl font-sans font-bold text-[11px] sm:text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all truncate"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">Nueva Canción</span>
          </button>
        </div>
      </div>
    </div>
  );
}
