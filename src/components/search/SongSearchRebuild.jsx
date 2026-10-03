import React, { useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Sparkles, Music, Crown, Library, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSongSearch } from '../../hooks/useSongSearch.js';

// Subcomponentes modulares
import ImportProgressModal from './ImportProgressModal.jsx';
import DatabaseSongList from './DatabaseSongList.jsx';
import OnlineOptionsList from './OnlineOptionsList.jsx';
import ScoreResultsList from './ScoreResultsList.jsx';

export default function SongSearchRebuild({
  isOpen,
  onClose,
  onSongSelect,
  onScoreSelect,
  databaseSongs = [],
  onDirectPlaySong,
  isPro: propIsPro,
  onOpenUpgradeModal: propOpenUpgradeModal,
}) {
  const auth = useAuth();
  const isPro = propIsPro !== undefined ? propIsPro : auth.isPro;
  const openUpgradeModal = propOpenUpgradeModal || auth.openUpgradeModal;
  const inputRef = useRef(null);

  const {
    query,
    setQuery,
    searchType,
    setSearchType,
    results,
    scoreResults,
    isLoading,
    error,
    expandedIndex,
    setExpandedIndex,
    selectedIndex,
    importProgress,
    matchingDatabaseSongs,
    handleSelectSong,
    handleSelectScoreItem,
    handleSelectDatabaseSong,
  } = useSongSearch({
    isOpen,
    databaseSongs,
    isPro,
    onSongSelect,
    onScoreSelect,
    onDirectPlaySong,
    onClose,
    openUpgradeModal,
  });

  if (!isOpen) return null;

  const allResults = [...(results.chordify || []), ...results.ug, ...results.cc];

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div 
        className="w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/70 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal de progreso de importación */}
        <ImportProgressModal importProgress={importProgress} />

        {/* Header del Buscador */}
        <div className="flex justify-between items-center mb-3.5 border-b border-slate-150 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>Buscar Canciones</span>
                {!isPro && (
                  <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Modo Free
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isPro
                  ? 'Canciones en biblioteca + opciones de acordes y BeatGrid online'
                  : 'Canciones disponibles En Biblioteca'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isPro && (
              <button
                type="button"
                onClick={openUpgradeModal}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1 cursor-pointer"
                title="Desbloquear catálogo online completo"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Pro</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de acceso para Modo Free */}
        {!isPro && (
          <div className="mb-3 px-3.5 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 min-w-0">
              <Library className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="truncate">
                <strong>Plan Free:</strong> Acceso a canciones <strong>En Biblioteca</strong>. Pásate a Pro para buscar e importar opciones online.
              </span>
            </div>
            <button
              type="button"
              onClick={openUpgradeModal}
              className="ml-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ver Pro</span>
            </button>
          </div>
        )}

        {/* Tabs: Acordes vs Partituras */}
        <div className="flex items-center gap-2 mb-3 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl self-start border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSearchType('chords')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              searchType === 'chords'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Acordes & Letras</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isPro) {
                if (openUpgradeModal) openUpgradeModal();
                return;
              }
              setSearchType('scores');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              searchType === 'scores'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Partituras & Tabs (Songsterr / Tango)</span>
            {!isPro && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                PRO
              </span>
            )}
          </button>
        </div>

        {/* Input de Búsqueda */}
        <div className="relative mb-3.5">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchType === 'scores'
                  ? 'Buscar partitura o tango (ej: Piazzolla, Hotel California, Gardel)...'
                  : isPro
                  ? 'Buscar en biblioteca o explorar online (ej: Spinetta, Seminare, Gardel)...'
                  : 'Buscar canciones en biblioteca (ej: Spinetta, Seminare, Gardel)...'
              }
              className="w-full bg-slate-100/55 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800/80 rounded-xl pl-10 pr-9 py-2.5 sm:py-3 text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
            <MagnifyingGlassIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 select-none">
            {error}
          </div>
        )}

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider">
                {searchType === 'scores' 
                  ? 'Consultando Songsterr & TodoTango...' 
                  : 'Buscando opciones de acordes...'}
              </p>
            </div>
          ) : searchType === 'scores' ? (
            <ScoreResultsList
              query={query}
              scoreResults={scoreResults}
              isPro={isPro}
              onOpenUpgradeModal={openUpgradeModal}
              onSelectScore={handleSelectScoreItem}
            />
          ) : (
            <div className="space-y-4">
              {/* Sección principal: Canciones En Biblioteca */}
              <DatabaseSongList
                songs={matchingDatabaseSongs}
                onSelectSong={handleSelectDatabaseSong}
              />

              {/* Banner si no es Pro */}
              {!isPro ? (
                <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>¿Buscas más opciones online?</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      En el plan Free tienes acceso ilimitado a todas las canciones <strong>En Biblioteca</strong>. Pásate a Pro para explorar e importar opciones online con BeatGrid y video sincronizado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Desbloquear con Pro</span>
                  </button>
                </div>
              ) : (
                /* Resultados online externos */
                allResults.length > 0 ? (
                  <OnlineOptionsList
                    results={results}
                    selectedIndex={selectedIndex}
                    expandedIndex={expandedIndex}
                    onToggleExpand={(idx) => setExpandedIndex(expandedIndex === idx ? null : idx)}
                    onSelectSong={(v, song) => handleSelectSong(v, song)}
                  />
                ) : query && !isLoading && matchingDatabaseSongs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 select-none">
                    <p className="text-sm font-semibold">No se encontraron resultados para "{query}"</p>
                    <p className="text-xs mt-1">Revisa la ortografía o prueba con otra búsqueda.</p>
                  </div>
                ) : !query && matchingDatabaseSongs.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-500 select-none border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-xs font-semibold">Empieza a escribir para buscar opciones de acordes.</p>
                    <p className="text-[10px] mt-1 uppercase tracking-wider font-extrabold text-amber-500/70 flex items-center justify-center gap-1.5">
                      <Activity className="w-3 h-3 text-amber-500 animate-pulse" />
                      <span>Opciones con BeatGrid rítmico y video sincronizado</span>
                    </p>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
