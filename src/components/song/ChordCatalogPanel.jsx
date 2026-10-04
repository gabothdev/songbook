import React from 'react';
import {
  Activity,
  Music,
  AlignJustify,
  Grid,
  Play,
  Pause,
  Sparkles,
  Clock,
} from 'lucide-react';
import BeatGrid from './BeatGrid';
import ActiveChordCard from './ActiveChordCard';
import GuitarChordDiagram from '../guitar/GuitarChordDiagram';
import BandoneonDiagram from '../bandoneon/BandoneonDiagram';

/**
 * ChordCatalogPanel Component
 * Renders the right page of the notebook spread:
 * - Top tab switcher: [BeatGrid] vs [Acordes & Rasgueo]
 * - BeatGrid mode (Ribbon / Grid) & Live Metronome pulse
 * - Active chord card with real-time sounding chord and upcoming next chord
 * - Full chord diagrams catalog with variant pagination (◀ 1/4 ▶)
 * - Strumming pattern guide & Song structure timestamps
 * - Notebook footer
 */
export default function ChordCatalogPanel({
  song,
  rightPageView = 'beatgrid',
  setRightPageView,
  beatGridMode = 'ribbon',
  setBeatGridMode,
  isMetronomeActive = false,
  setIsMetronomeActive,
  isPlaybackActive = false,
  transposedCompases = [],
  currentBeatIndex = -1,
  onBeatClick = null,
  transpose = 0,
  currentPlayingChord = 'C',
  nextChordName = null,
  beatsUntilNext = null,
  selectedVariants = {},
  onVariantChange,
  onPlayChord,
  currentUniqueChords = [],
  chordDefinitions = {},
  activeChord = 'C',
  instrument = 'guitar',
  setlistContext = null,
  isEditMode = false,
  currentTime = null,
  onSetTimestamp = null,
  onAddMeasure = null,
  onUpdateChord = null,
  currentBpm = 100,
  onScaleBpm = null,
  className = '',
}) {
  return (
    <div className={`flex-1 min-w-0 flex flex-col justify-between bg-[#fcf9f2] rounded-2xl md:rounded-l-none md:rounded-r-2xl shadow-[inset_10px_0_15px_rgba(0,0,0,0.06)] border border-stone-300 overflow-hidden paper-texture p-7 lg:p-9 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] relative z-10 ${className}`}>
      <div className="absolute top-0 left-0 bottom-0 w-10 bg-gradient-to-r from-stone-900/10 to-transparent pointer-events-none z-10" />

      <div className="space-y-4">
        {/* Header Selector: [BeatGrid] vs [Acordes & Rasgueo] */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-200 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-stone-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setRightPageView('beatgrid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                rightPageView === 'beatgrid'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-700" />
              <span>BeatGrid ({transposedCompases.length}C)</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPageView('chords')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                rightPageView === 'chords'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-amber-700" />
              <span>Acordes & Rasgueo</span>
            </button>
          </div>

          {/* Mode Toggles & Metronome Pulse Button when in BeatGrid */}
          {rightPageView === 'beatgrid' && (
            <div className="flex items-center gap-2">
              {/* Ribbon / Grid view toggle */}
              <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-stone-600">
                <button
                  type="button"
                  onClick={() => setBeatGridMode('ribbon')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    beatGridMode === 'ribbon' ? 'bg-white text-amber-900 shadow-xs' : 'hover:text-stone-900'
                  }`}
                  title="Modo Cinta Horizontal (Por defecto)"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBeatGridMode('grid')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    beatGridMode === 'grid' ? 'bg-white text-amber-900 shadow-xs' : 'hover:text-stone-900'
                  }`}
                  title="Modo Grilla Estructural"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* BPM Scaling Controls in Edit Mode */}
              {isEditMode && onScaleBpm && (
                <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-xs font-mono shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onScaleBpm(0.5)}
                    className="px-1.5 py-0.5 hover:bg-stone-200 text-stone-700 font-bold rounded transition-colors cursor-pointer"
                    title="Dividir BPM a la mitad (÷2) y fusionar compases"
                  >
                    ÷2
                  </button>
                  <span className="px-1.5 py-0.5 text-[11px] font-bold text-amber-950 font-sans border-x border-stone-200">
                    {currentBpm || 100} BPM
                  </span>
                  <button
                    type="button"
                    onClick={() => onScaleBpm(2)}
                    className="px-1.5 py-0.5 hover:bg-stone-200 text-stone-700 font-bold rounded transition-colors cursor-pointer"
                    title="Duplicar BPM (x2) y subdividir compases"
                  >
                    x2
                  </button>
                </div>
              )}

              {/* Metronome / Pulse Tracker Button */}
              <button
                type="button"
                onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-sm ${
                  isMetronomeActive || isPlaybackActive
                    ? 'bg-amber-600 text-white shadow-amber-200'
                    : 'bg-white hover:bg-stone-50 border border-stone-300 text-stone-700'
                }`}
                title={isMetronomeActive || isPlaybackActive ? 'Detener pulso rítmico' : 'Seguir ritmo en vivo'}
              >
                {isMetronomeActive || isPlaybackActive ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span>{isMetronomeActive || isPlaybackActive ? 'Pausar' : 'Pulso'}</span>
              </button>
            </div>
          )}
        </div>

        {/* View 1: BEATGRID COMPONENT */}
        {rightPageView === 'beatgrid' && (
          <div className="space-y-4">
            {/* The BeatGrid Ribbon / Grid */}
            <BeatGrid
              compases={transposedCompases}
              currentBeatIndex={currentBeatIndex}
              beatsPerMeasure={4}
              onBeatClick={onBeatClick}
              mode={beatGridMode}
              transpose={transpose}
              isEditMode={isEditMode}
              currentTime={currentTime}
              onSetTimestamp={onSetTimestamp}
              onAddMeasure={onAddMeasure}
              onUpdateChord={onUpdateChord}
            />

            {/* Active Chord Card in real-time below the Ribbon */}
            {beatGridMode === 'ribbon' && (
              <ActiveChordCard
                chordName={currentPlayingChord}
                nextChordName={nextChordName}
                beatsUntilNext={beatsUntilNext}
                selectedVariantIndex={selectedVariants[currentPlayingChord] || 0}
                onVariantChange={onVariantChange}
                onChordSelect={onPlayChord}
              />
            )}
          </div>
        )}

        {/* View 2: CHORD DIAGRAMS & STRUMMING (From SQLite Database) */}
        {rightPageView === 'chords' && (
          <div className="space-y-5 max-h-[380px] xl:max-h-[440px] overflow-y-auto pr-1">
            {/* Expanded Chord Diagrams from Database */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 font-sans flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-amber-700" />
                  Catálogo de Acordes ({currentUniqueChords.length})
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  Haz clic en cualquier acorde para oírlo
                </span>
              </div>

              {/* Grid of Chord Diagrams with dynamic SQLite data */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentUniqueChords.map((chordName) => {
                  const chordDef = chordDefinitions[chordName] || {
                    chordName,
                    frets: 'x32010',
                    fingers: '032010',
                    position: 1,
                    barres: [],
                  };

                  const isSelected = activeChord === chordName;
                  const totalVars = chordDef.allPositions?.length || 1;
                  const currentVarIdx = selectedVariants[chordName] || 0;

                  return (
                    <div
                      key={chordName}
                      onClick={() => onPlayChord && onPlayChord(chordName)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col items-center justify-between ${
                        isSelected
                          ? 'bg-amber-100/90 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                          : 'bg-white/90 hover:bg-white border-stone-300/80 shadow-2xs hover:shadow-sm hover:scale-[1.02]'
                      }`}
                    >
                      <span className="font-serif font-black text-base sm:text-lg text-stone-900 tracking-tight mb-1">
                        {chordName}
                      </span>

                      {instrument === 'bandoneon' ? (
                        <div className="w-48 sm:w-56 flex items-center justify-center p-1">
                          <BandoneonDiagram
                            chordName={chordName}
                            className="w-full"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="w-28 sm:w-32 h-auto flex items-center justify-center">
                            <GuitarChordDiagram
                              chord={{ ...chordDef, chordName }}
                              isSelected={isSelected}
                              showPlayOverlay={false}
                              className="p-0"
                            />
                          </div>

                          {totalVars > 1 ? (
                            <div
                              className="mt-1 flex items-center gap-1 text-[10px] font-mono font-bold text-stone-600 bg-stone-100 dark:bg-stone-800/60 px-1.5 py-0.5 rounded-md border border-stone-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const newIdx = currentVarIdx > 0 ? currentVarIdx - 1 : totalVars - 1;
                                  onVariantChange(chordName, newIdx);
                                }}
                                className="hover:text-amber-700 px-0.5 cursor-pointer"
                                title="Posición anterior"
                              >
                                ◀
                              </button>
                              <span>
                                {currentVarIdx + 1}/{totalVars}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newIdx = currentVarIdx < totalVars - 1 ? currentVarIdx + 1 : 0;
                                  onVariantChange(chordName, newIdx);
                                }}
                                className="hover:text-amber-700 px-0.5 cursor-pointer"
                                title="Siguiente posición"
                              >
                                ▶
                              </button>
                            </div>
                          ) : chordDef.position > 1 ? (
                            <span className="text-[10px] font-mono font-bold text-stone-500 mt-1">
                              Traste {chordDef.position}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strumming & Rhythm Guide */}
            <div className="bg-white/80 rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 font-sans flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  Patrón Rítmico de Acompañamiento
                </span>
                <span className="font-mono text-xs font-bold text-stone-500">{song.timeSignature || '4/4'}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/90 rounded-xl px-3 py-2">
                  <span className="font-mono font-black text-amber-900 text-base">↓</span>
                  <span className="font-mono font-black text-amber-900 text-base">↓</span>
                  <span className="font-mono font-black text-amber-900 text-base">↑</span>
                  <span className="font-mono font-black text-amber-900 text-base">↑</span>
                  <span className="font-mono font-black text-amber-900 text-base">↓</span>
                  <span className="font-mono font-black text-amber-900 text-base">↑</span>
                </div>
                <div className="text-xs font-sans text-stone-600">
                  <p className="font-bold text-stone-800">Rasgueo Folclórico / Pop Rock</p>
                  <p className="text-[11px] text-stone-500">Abajo, Abajo, Arriba, Arriba, Abajo, Arriba</p>
                </div>
              </div>
            </div>

            {/* Song Sections Timeline */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 font-sans flex items-center gap-1.5 mb-2.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Estructura & Tiempos de la Canción
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(song.sections || [
                  { name: 'Intro', time: '0:00' },
                  { name: 'Verso 1', time: '0:18' },
                  { name: 'Estribillo', time: '0:54' },
                ]).map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-sm flex items-center justify-between text-xs font-sans hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-stone-800 truncate">{sec.name}</span>
                    <span className="font-mono text-[11px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded font-semibold ml-1">
                      {sec.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs font-sans text-stone-500">
        <span>{setlistContext ? `Show en Vivo: ${setlistContext.setlist.name}` : 'SongBook Studio • Modo Cuaderno'}</span>
        <span className="font-serif italic text-amber-900 font-semibold">{song.title} — {song.artist}</span>
      </div>
    </div>
  );
}
