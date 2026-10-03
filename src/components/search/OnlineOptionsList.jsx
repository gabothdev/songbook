import React from 'react';
import { 
  ChevronDownIcon, 
  ChevronUpIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { Music, Music2, Activity, Layers } from 'lucide-react';

// Estrellas de puntuación
export const StarRating = ({ rating, votes }) => {
  if (rating === null || rating === undefined || !votes || votes === 0) {
    return <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Sin votos</span>;
  }

  const fullStars = Math.round(rating);
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      i <= fullStars ? (
        <StarSolidIcon key={i} className="w-3.5 h-3.5 text-amber-500" />
      ) : (
        <StarOutlineIcon key={i} className="w-3.5 h-3.5 text-slate-350 dark:text-slate-600" />
      )
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold ml-1">({votes})</span>
    </div>
  );
};

// Item individual de canción en resultados online
export const SongItem = ({ song, isSelected, isExpanded, onToggleExpand, onSelectVersion, optionLabel, hasBeatgrid }) => {
  const primaryVersion = song.versions && song.versions[0];
  const hasMultipleVersions = song.versions && song.versions.length > 1;

  return (
    <div className={`border rounded-xl transition-all duration-200 overflow-hidden bg-white/40 dark:bg-slate-900/20
      ${isSelected 
        ? 'border-blue-500 ring-1 ring-blue-500/30 dark:border-blue-500/60' 
        : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      }
    `}>
      <div 
        className="p-3.5 flex items-center justify-between cursor-pointer"
        onClick={() => {
          if (!hasMultipleVersions && primaryVersion) {
            onSelectVersion(primaryVersion);
          } else {
            onToggleExpand();
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            {optionLabel && (
              <span className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded-full border ${
                hasBeatgrid 
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {optionLabel}
              </span>
            )}
            {hasBeatgrid && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                <span>BeatGrid</span>
              </span>
            )}
          </div>
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-500">{song.title}</h5>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-455 truncate">{song.artist}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {primaryVersion && (
            <div className="flex flex-col items-end gap-0.5">
              <StarRating rating={primaryVersion.rating} votes={primaryVersion.votes} />
              {hasMultipleVersions && (
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-0.5 mt-0.5">
                  {song.versions.length} versiones {isExpanded ? <ChevronUpIcon className="w-2.5 h-2.5" /> : <ChevronDownIcon className="w-2.5 h-2.5" />}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {isExpanded && hasMultipleVersions && (
        <div className="border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-black/15 p-2 space-y-1">
          {song.versions.map((version, vIdx) => (
            <button
              key={`${version.type}-${vIdx}`}
              onClick={() => onSelectVersion(version)}
              className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {hasBeatgrid && <Activity className="w-3 h-3 text-amber-500 animate-pulse" />}
                <span className="font-bold text-slate-700 dark:text-slate-350">{version.type || `Versión ${vIdx + 1}`}</span>
              </div>
              <StarRating rating={version.rating} votes={version.votes} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function OnlineOptionsList({
  results = { chordify: [], ug: [], cc: [] },
  selectedIndex,
  expandedIndex,
  onToggleExpand,
  onSelectSong
}) {
  const { chordify = [], ug = [], cc = [] } = results;
  const hasAnyResults = chordify.length > 0 || ug.length > 0 || cc.length > 0;

  if (!hasAnyResults) return null;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div className="p-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <Music2 className="w-3.5 h-3.5" />
        </div>
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Opciones Online Disponibles
        </h4>
      </div>

      {/* Opción 1: Chordify BeatGrid */}
      {chordify.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Opción 1 • Video & BeatGrid Sincronizado
              </h4>
            </div>
            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
              <span>BeatGrid</span>
            </span>
          </div>
          {chordify.map((song, idx) => (
            <SongItem
              key={`chordify-${idx}-${song.title}`}
              song={song}
              optionLabel="Opción 1"
              hasBeatgrid={true}
              isSelected={selectedIndex === idx}
              isExpanded={expandedIndex === idx}
              onToggleExpand={() => onToggleExpand(idx)}
              onSelectVersion={(v) => onSelectSong(v, song)}
            />
          ))}
        </div>
      )}

      {/* Opción 2: Ultimate Guitar */}
      {ug.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-slate-500/15 text-slate-600 dark:text-slate-400">
              <Music className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Opción 2 • Acordes y Tablaturas
            </h4>
          </div>
          {ug.map((song, idx) => {
            const overallIndex = (chordify?.length || 0) + idx;
            return (
              <SongItem
                key={`ug-${idx}-${song.title}`}
                song={song}
                optionLabel="Opción 2"
                isSelected={selectedIndex === overallIndex}
                isExpanded={expandedIndex === overallIndex}
                onToggleExpand={() => onToggleExpand(overallIndex)}
                onSelectVersion={(v) => onSelectSong(v, song)}
              />
            );
          })}
        </div>
      )}

      {/* Opción 3: Cifra Club */}
      {cc.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-slate-500/15 text-slate-600 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Opción 3 • Variantes y Tonos
            </h4>
          </div>
          {cc.map((song, idx) => {
            const overallIndex = (chordify?.length || 0) + ug.length + idx;
            return (
              <SongItem
                key={`cc-${idx}-${song.title}`}
                song={song}
                optionLabel="Opción 3"
                isSelected={selectedIndex === overallIndex}
                isExpanded={expandedIndex === overallIndex}
                onToggleExpand={() => onToggleExpand(overallIndex)}
                onSelectVersion={(v) => onSelectSong(v, song)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
