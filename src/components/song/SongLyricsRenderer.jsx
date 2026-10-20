import React from 'react';
import { Play, Pause } from 'lucide-react';
import { normalizeChordName } from '../../utils/music';
import {
  parseLineToChordSegments,
  parseSongStructure,
  IGNORED_CHORD_REGEX,
} from './utils/lyricsTimingCalculator';
import { useLyricsSyncHighlight } from './hooks/useLyricsSyncHighlight';

// Re-export for backward compatibility with tests and studios
export { parseLineToChordSegments, parseSongStructure, IGNORED_CHORD_REGEX };

/**
 * SongLyricsRenderer Component
 * Renders the lyrics sheet with:
 * - 90° rotated section header in left gutter
 * - Chord badges positioned precisely OVER words / syllables
 * - Real-time active line and active chord highlighting during playback
 * - Localized auto-scrollable viewport and bottom playback bar
 */
export default function SongLyricsRenderer({
  song,
  compases = [],
  transpose = 0,
  onPlayChord,
  onSelectSection = null,
  onSelectChord = null,
  isAutoScrolling = false,
  onToggleAutoScroll = null,
  scrollRef = null,
  currentTime = null,
  currentPlayingChord = null,
  currentBeatIndex = -1,
  isPlaybackActive = false,
  className = '',
}) {
  const {
    sections,
    effectiveBpm,
    effectiveTimeSignature,
    sectionTimingMap,
    lineTimingsMap,
    activeSectionIdx,
    activeLineIdx,
    lineProgress,
    activeChordRank,
    activeChordSectionIdx,
    activeChordLineIdx,
    activeLineRef,
  } = useLyricsSyncHighlight({
    songContent: song.content || '',
    transpose,
    songBpm: song.bpm,
    songTimeSignature: song.timeSignature,
    compases,
    currentTime,
    currentBeatIndex,
    isPlaybackActive,
    isAutoScrolling,
    scrollRef,
  });

  const effChordSecIdx = activeChordSectionIdx !== undefined ? activeChordSectionIdx : activeSectionIdx;
  const effChordLineIdx = activeChordLineIdx !== undefined ? activeChordLineIdx : activeLineIdx;

  return (
    <div className={`flex-1 min-h-0 flex flex-col justify-between ${className}`}>
      {/* Lyrics Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4 font-mono text-sm leading-relaxed"
      >
        {sections.map((sec, sIdx) => {
          const timing = sectionTimingMap[sIdx] || {};
          const isSectionActive = (isPlaybackActive || currentBeatIndex >= 0) && sIdx === activeSectionIdx;

          return (
            <div key={sIdx} className="flex items-stretch gap-3 group">
              {/* 90° Rotated Section Header in Left Gutter */}
              <div className="w-8 flex-shrink-0 flex items-center justify-center select-none py-1 border-r border-amber-900/15">
                <button
                  type="button"
                  onClick={() => onSelectSection && onSelectSection(sec, sIdx)}
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                  className={`text-[11px] font-serif font-bold uppercase tracking-wider px-1.5 py-2 rounded-md shadow-xs transition-all whitespace-nowrap cursor-pointer ${
                    isSectionActive
                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-600 shadow-md font-black scale-105'
                      : 'text-amber-950 bg-amber-200/80 hover:bg-amber-300 border border-amber-300'
                  }`}
                  title={sec.time ? `Ir a ${sec.name} (@ ${sec.time}s)` : `Ir a ${sec.name}`}
                >
                  {sec.name}
                </button>
              </div>

              {/* Section Lyrics & Chords positioned OVER the words */}
              <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                {sec.lines.map((line, lIdx) => {
                  const trimmed = line.trim();
                  if (!trimmed) {
                    return <div key={lIdx} className="h-3" />;
                  }

                  const hasChords = /\[([^\]]+)\]/.test(line);
                  const isLineActive = (isPlaybackActive || currentBeatIndex >= 0) && sIdx === activeSectionIdx && lIdx === activeLineIdx;
                  const isChordLineActive = (isPlaybackActive || currentBeatIndex >= 0) && sIdx === effChordSecIdx && lIdx === effChordLineIdx;

                  if (hasChords) {
                    const segments = parseLineToChordSegments(line);
                    if (segments.length === 0) return null;

                    // Pre-calcular posiciones relativas y conteos de acordes en esta línea
                    const chordPositions = [];
                    let runningCharLength = 0;

                    segments.forEach((seg, sIndex) => {
                      if (seg.chord) {
                        chordPositions.push({
                          segIdx: sIndex,
                          chord: normalizeChordName(seg.chord),
                          startChar: runningCharLength,
                        });
                      }
                      runningCharLength += (seg.text || '').length;
                    });

                    const totalChordsInLine = chordPositions.length;

                    // Determinar con alta precisión qué segmento de acorde en la línea es el actualmente activo
                    let activeChordSegIdx = -1;
                    if (isChordLineActive && totalChordsInLine > 0) {
                      // 1. Direct beat-level ranking from BeatGrid lineTimingsMap (including carryover from previous line)
                      if (activeChordRank >= 0 && activeChordRank < totalChordsInLine) {
                        activeChordSegIdx = chordPositions[activeChordRank]?.segIdx ?? -1;
                      }

                      // 2. High precision timestamp lookup
                      if (activeChordSegIdx === -1 && isLineActive) {
                        const lineTiming = lineTimingsMap?.[sIdx]?.[lIdx];
                        if (lineTiming?.chordTimings && lineTiming.chordTimings.length === totalChordsInLine && !lineTiming.startsWithUnchordedPhrase) {
                          for (let cIdx = 0; cIdx < lineTiming.chordTimings.length; cIdx++) {
                            const ct = lineTiming.chordTimings[cIdx];
                            const isLastChord = cIdx === lineTiming.chordTimings.length - 1;
                            if (currentTime >= ct.startTime && (currentTime < ct.endTime || (isLastChord && currentTime < lineTiming.endTime))) {
                              activeChordSegIdx = chordPositions[cIdx]?.segIdx ?? -1;
                              break;
                            }
                          }
                        }
                      }

                      // 3. Legacy fallback when BeatGrid lineTimingsMap is unavailable: divide line duration evenly
                      const lineTiming = lineTimingsMap?.[sIdx]?.[lIdx];
                      if (activeChordSegIdx === -1 && !lineTimingsMap && isLineActive && !lineTiming?.startsWithUnchordedPhrase) {
                        const rank = Math.min(
                          totalChordsInLine - 1,
                          Math.max(0, Math.floor(lineProgress * totalChordsInLine))
                        );
                        activeChordSegIdx = chordPositions[rank]?.segIdx ?? -1;
                      }
                    }

                    return (
                      <div
                        key={lIdx}
                        ref={isLineActive ? activeLineRef : null}
                        className={`flex flex-wrap items-end my-1 leading-none transition-all duration-200 rounded-lg ${
                          isLineActive
                            ? 'bg-amber-100/80 -mx-2 px-2 py-1 border-l-2 border-amber-600 shadow-xs'
                            : 'py-0.5'
                        }`}
                      >
                        {segments.map((seg, segIdx) => {
                          const isChordActive = isChordLineActive && segIdx === activeChordSegIdx;
                          const isSynced = Boolean(sec.time || timing.startTime !== null);

                          return (
                            <div
                              key={segIdx}
                              className="inline-flex flex-col items-start justify-end flex-shrink-0"
                            >
                              {/* Top Row: Clickable Chord Badge positioned above syllable */}
                              <div className="h-5 flex items-center mb-0.5">
                                {seg.chord ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const chordRankInLine = chordPositions.findIndex((cp) => cp.segIdx === segIdx);
                                      const lineTiming = lineTimingsMap?.[sIdx]?.[lIdx];
                                      const chordBeatInfo = chordRankInLine >= 0 ? lineTiming?.chords?.[chordRankInLine] : null;
                                      const chordTimingInfo = chordRankInLine >= 0 ? lineTiming?.chordTimings?.[chordRankInLine] : null;

                                      if (onSelectChord) {
                                        onSelectChord(seg.chord, {
                                          chord: seg.chord,
                                          sec,
                                          sIdx,
                                          lIdx,
                                          segIdx,
                                          chordRank: chordRankInLine,
                                          beatIdx: chordBeatInfo?.startBeatGlobal,
                                          compasIdx: chordBeatInfo?.compasIdx,
                                          beatInCompas: chordBeatInfo?.beatInCompas,
                                          targetTime: chordTimingInfo?.startTime,
                                          chordRatio: (lIdx + (segIdx + 0.5) / Math.max(1, segments.length)) / Math.max(1, sec.lines.length),
                                          startTime: timing.startTime,
                                          nextTime: timing.nextTime,
                                        });
                                      } else if (onPlayChord) {
                                        onPlayChord(seg.chord);
                                      }
                                    }}
                                    className={`inline-flex items-center gap-1 font-mono font-bold px-1.5 py-0.5 rounded text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap select-none ${
                                      isChordActive
                                        ? 'bg-amber-500 text-amber-950 ring-2 ring-amber-600 shadow-md scale-110 z-10 font-black'
                                        : isSynced
                                        ? 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400/80 transform hover:scale-105 active:scale-95'
                                        : 'text-stone-700 bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400 transform hover:scale-105 active:scale-95'
                                    }`}
                                    title={
                                      isSynced
                                        ? `Acorde [${seg.chord}] sincronizado con timestamp @ ${sec.time || timing.startTime}s`
                                        : `Acorde [${seg.chord}] en modo libre (sin timestamp)`
                                    }
                                  >
                                    <span>{seg.chord}</span>
                                    {isSynced && (
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-2xs flex-shrink-0"
                                        title="Sincronizado"
                                      />
                                    )}
                                  </button>
                                ) : (
                                  <span className="invisible text-xs py-0.5 select-none">.</span>
                                )}
                              </div>

                              {/* Bottom Row: Word / Syllable Text */}
                              <div
                                className={`font-sans text-sm whitespace-pre leading-snug transition-colors ${
                                  isLineActive
                                    ? 'text-stone-950 font-bold'
                                    : 'text-stone-900 font-medium'
                                }`}
                              >
                                {seg.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={lIdx}
                      ref={isLineActive ? activeLineRef : null}
                      className={`font-sans text-sm py-0.5 transition-all duration-200 rounded-lg ${
                        isLineActive
                          ? 'bg-amber-100/80 -mx-2 px-2 py-1 border-l-2 border-amber-600 shadow-xs text-stone-950 font-bold'
                          : 'text-stone-800 font-medium'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Auto-scroll Bar with BPM & Time Signature */}
      <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs font-sans text-stone-600 mt-auto flex-shrink-0">
        <button
          type="button"
          onClick={onToggleAutoScroll}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            isAutoScrolling ? 'bg-amber-800 text-amber-50 shadow' : 'bg-stone-200 text-stone-800 hover:bg-stone-300'
          }`}
        >
          {isAutoScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isAutoScrolling ? 'Pausar Scroll' : 'Auto-Scroll'}</span>
        </button>

        {/* Dynamic BPM and Time Signature Footer */}
        <span className="font-mono text-stone-600 text-[11px] font-bold bg-amber-100/60 px-2.5 py-1 rounded-md border border-amber-300/40 shadow-xs">
          {effectiveBpm} BPM • {effectiveTimeSignature}
        </span>
      </div>
    </div>
  );
}
