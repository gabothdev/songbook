import React from 'react';
import { BookOpen, Activity, Play, Library } from 'lucide-react';

export const DatabaseSongItem = ({ song, onSelect }) => {
  const artistName = Array.isArray(song.artists) && song.artists.length > 0
    ? song.artists.map((a) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean).join(', ')
    : song.artist || 'Artista';

  return (
    <div
      onClick={() => onSelect(song)}
      className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/15 hover:border-amber-500/45 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-mono text-xs font-bold border border-amber-500/30 flex-shrink-0">
          {song.key || 'C'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
              {song.title}
            </h5>
            <span className="text-[9px] font-sans font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
              <BookOpen className="w-2.5 h-2.5" />
              <span>En Biblioteca</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {artistName}
            </p>
            {song.album && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                • {song.album} {song.releaseYear ? `(${song.releaseYear})` : ''}
              </span>
            )}
            {song.versionType === 'live' && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                🎙️ En Vivo
              </span>
            )}
            {song.versionType === 'soundtrack' && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                🎬 Película
              </span>
            )}
            {song.versionType === 'acoustic' && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                🪕 Acústico
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {song.syncData && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Activity className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>BeatGrid</span>
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(song);
          }}
          className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          title="Abrir en el cancionero"
        >
          <Play className="w-3 h-3 fill-current ml-0.5" />
          <span className="hidden sm:inline">Abrir</span>
        </button>
      </div>
    </div>
  );
};

export default function DatabaseSongList({ songs, onSelectSong }) {
  if (!songs || songs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-amber-500/25">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Library className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            En Biblioteca ({songs.length})
          </h4>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
          <BookOpen className="w-2.5 h-2.5" />
          <span>Disponible</span>
        </span>
      </div>

      <div className="space-y-2">
        {songs.map((song) => (
          <DatabaseSongItem
            key={`db-${song.id}`}
            song={song}
            onSelect={onSelectSong}
          />
        ))}
      </div>
    </div>
  );
}
