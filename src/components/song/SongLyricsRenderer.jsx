import React, { useMemo, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { transposeTextWithChords, normalizeChordName } from '../../utils/music';

// Section keywords to recognize section headers accurately
const SECTION_KEYWORDS = /^(intro|verse|verso|estrofa|prechorus|pre-chorus|precoro|pre-coro|chorus|coro|estribillo|bridge|puente|solo|outro|final|coda|hook|interlude|interludio|part|parte|tema)/i;

// Stray characters to ignore as chords (preserving musical rests 𝄾 and 𝄽)
const IGNORED_CHORD_REGEX = /^['´’`".,\-_\s]+$/;

/**
 * Splits a line containing embedded [Chord] tags into structured segments where each segment
 * has an optional chord positioned directly over its corresponding text / syllable.
 */
export function parseLineToChordSegments(line) {
  if (!line) return [];

  if (!/\[[^\]]+\]/.test(line)) {
    return [{ chord: null, text: line }];
  }

  const segments = [];
  const parts = line.split(/(\[[^\]]+\])/g);
  let pendingChord = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith('[') && part.endsWith(']')) {
      const rawChord = part.slice(1, -1).trim();

      // Ignore stray accents, quotes, and rest symbols like [´], [’], [']
      if (IGNORED_CHORD_REGEX.test(rawChord) || rawChord.length === 0) {
        continue;
      }

      const chordName = normalizeChordName(rawChord);

      if (pendingChord) {
        // If there was a previous chord without text, push it over a space
        segments.push({ chord: pendingChord, text: ' ' });
      }
      pendingChord = chordName;
    } else {
      segments.push({ chord: pendingChord, text: part });
      pendingChord = null;
    }
  }

  if (pendingChord) {
    segments.push({ chord: pendingChord, text: ' ' });
  }

  return segments;
}

/**
 * Parses raw text with [Section @ timestamp] or [Section] headers and metadata into clean structured blocks
 */
export function parseSongStructure(rawContent, transposeAmount = 0) {
  const transposed = transposeTextWithChords(rawContent, transposeAmount);
  const lines = transposed.split('\n');

  let extractedBpm = null;
  let extractedTimeSignature = null;
  const sections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentSection) {
        currentSection.lines.push('');
      }
      continue;
    }

    // 1. Check for Metadata Tags: [BPM @ 158] or [BPM: 158]
    const bpmMatch = trimmed.match(/^\[\s*BPM\s*[@:]?\s*(\d+)\s*\]$/i);
    if (bpmMatch) {
      extractedBpm = parseInt(bpmMatch[1], 10);
      continue;
    }

    // 2. Check for Metadata Tags: [Beats @ 3] or [Time @ 3/4]
    const beatsMatch = trimmed.match(/^\[\s*Beats\s*[@:]?\s*(\d+)\s*\]$/i);
    if (beatsMatch) {
      const beats = parseInt(beatsMatch[1], 10);
      extractedTimeSignature = beats === 3 ? '3/4' : beats === 6 ? '6/8' : `${beats}/4`;
      continue;
    }

    const timeSigMatch = trimmed.match(/^\[\s*(?:Time|TimeSignature|Metro)\s*[@:]?\s*(\d+\/\d+)\s*\]$/i);
    if (timeSigMatch) {
      extractedTimeSignature = timeSigMatch[1];
      continue;
    }

    // 3. Check for Section Headers: [Intro @ 0.0], [Verse @ 9.1], [Chorus], etc.
    const bracketHeaderMatch = trimmed.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]+?)(?:\s*@\s*([0-9:.]+))?\s*\]$/);
    const isSectionHeader =
      bracketHeaderMatch &&
      (bracketHeaderMatch[2] !== undefined || SECTION_KEYWORDS.test(bracketHeaderMatch[1].trim()));

    if (isSectionHeader) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      const rawName = bracketHeaderMatch[1].trim();
      const timeTag = bracketHeaderMatch[2] ? bracketHeaderMatch[2].trim() : null;

      currentSection = {
        name: rawName,
        time: timeTag,
        lines: [],
      };
      continue;
    }

    // 4. Fallback for un-bracketed Section Headers like "Verse 1:" or "Chorus:"
    const colonHeaderMatch = trimmed.match(/^([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]+):$/);
    if (colonHeaderMatch && SECTION_KEYWORDS.test(colonHeaderMatch[1].trim())) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        name: colonHeaderMatch[1].trim(),
        time: null,
        lines: [],
      };
      continue;
    }

    // 5. Regular Lyrics Line
    if (!currentSection) {
      currentSection = { name: 'Intro', time: null, lines: [] };
    }
    currentSection.lines.push(rawLine);
  }

  if (currentSection && currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    sections.push({ name: 'Letra', time: null, lines: lines });
  }

  return {
    sections,
    bpm: extractedBpm,
    timeSignature: extractedTimeSignature,
  };
}

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
  transpose = 0,
  onPlayChord,
  onSelectSection = null,
  onSelectChord = null,
  isAutoScrolling = false,
  onToggleAutoScroll = null,
  scrollRef = null,
  currentTime = null,
  currentPlayingChord = null,
  isPlaybackActive = false,
}) {
  const { sections, bpm: parsedBpm, timeSignature: parsedTimeSignature } = useMemo(() => {
    return parseSongStructure(song.content || '', transpose);
  }, [song.content, transpose]);

  const effectiveBpm = song.bpm || parsedBpm || 100;
  const effectiveTimeSignature = song.timeSignature || parsedTimeSignature || '4/4';

  const activeLineRef = useRef(null);

  // Map each section's start time and next section's start time for piece-wise linear chord seeking
  const sectionTimingMap = useMemo(() => {
    return sections.map((sec, idx) => {
      let startTime = null;
      if (sec.time) {
        if (sec.time.includes(':')) {
          const [m, s] = sec.time.split(':').map(Number);
          startTime = (m || 0) * 60 + (s || 0);
        } else {
          startTime = parseFloat(sec.time);
        }
      }

      let nextTime = null;
      for (let j = idx + 1; j < sections.length; j++) {
        if (sections[j].time) {
          if (sections[j].time.includes(':')) {
            const [m, s] = sections[j].time.split(':').map(Number);
            nextTime = (m || 0) * 60 + (s || 0);
          } else {
            nextTime = parseFloat(sections[j].time);
          }
          break;
        }
      }

      return { startTime, nextTime };
    });
  }, [sections]);

  // Determine the active section and line index based on real-time currentTime
  const { activeSectionIdx, activeLineIdx } = useMemo(() => {
    if (!isPlaybackActive || currentTime === null || currentTime === undefined || currentTime < 0) {
      return { activeSectionIdx: -1, activeLineIdx: -1 };
    }

    // 1. Piece-wise check with exact section timestamps
    for (let i = 0; i < sections.length; i++) {
      const timing = sectionTimingMap[i];
      if (timing && timing.startTime !== null) {
        const start = timing.startTime;
        const end = timing.nextTime !== null ? timing.nextTime : start + 45;

        if (currentTime >= start && currentTime < end) {
          const sec = sections[i];
          const nonEmptyLines = sec.lines.filter((l) => l.trim().length > 0);
          const lineCount = Math.max(1, nonEmptyLines.length);
          const duration = Math.max(1, end - start);
          const progress = Math.min(0.999, Math.max(0, (currentTime - start) / duration));
          const lineIdx = Math.floor(progress * lineCount);

          return { activeSectionIdx: i, activeLineIdx: lineIdx };
        }
      }
    }

    // 2. Fallback: linear calculation across sections based on BPM
    let totalLines = 0;
    sections.forEach((s) => (totalLines += Math.max(1, s.lines.length)));
    const secondsPerBeat = 60 / (effectiveBpm || 100);
    const estimatedTotalSeconds = totalLines * 4 * secondsPerBeat;
    const globalProgress = Math.min(0.999, Math.max(0, currentTime / Math.max(1, estimatedTotalSeconds)));
    const targetGlobalLine = Math.floor(globalProgress * totalLines);

    let runningCount = 0;
    for (let i = 0; i < sections.length; i++) {
      if (targetGlobalLine < runningCount + sections[i].lines.length) {
        return { activeSectionIdx: i, activeLineIdx: targetGlobalLine - runningCount };
      }
      runningCount += sections[i].lines.length;
    }

    return { activeSectionIdx: -1, activeLineIdx: -1 };
  }, [isPlaybackActive, currentTime, sections, sectionTimingMap, effectiveBpm]);

  // Auto-scroll to keep the active line centered during playback
  useEffect(() => {
    if ((isAutoScrolling || isPlaybackActive) && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSectionIdx, activeLineIdx, isAutoScrolling, isPlaybackActive]);

  return (
    <>
      {/* Lyrics Scrollable Container */}
      <div
        ref={scrollRef}
        className="max-h-[380px] xl:max-h-[440px] overflow-y-auto pr-2 space-y-4 font-mono text-sm leading-relaxed"
      >
        {sections.map((sec, sIdx) => {
          const timing = sectionTimingMap[sIdx] || {};
          const isSectionActive = isPlaybackActive && sIdx === activeSectionIdx;

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
                  const isLineActive = isPlaybackActive && sIdx === activeSectionIdx && lIdx === activeLineIdx;

                  if (hasChords) {
                    const segments = parseLineToChordSegments(line);
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
                          const isChordActive =
                            isLineActive &&
                            currentPlayingChord &&
                            seg.chord &&
                            normalizeChordName(seg.chord) === normalizeChordName(currentPlayingChord);

                          return (
                            <div
                              key={segIdx}
                              className="inline-flex flex-col items-start justify-end flex-shrink-0"
                            >
                              {/* Top Row: Clickable Chord Badge positioned above syllable */}
                              <div className="h-5 flex items-center mb-0.5">
                                {seg.chord ? (
                                  seg.chord.includes('𝄾') || seg.chord.includes('𝄽') || seg.chord.toLowerCase().includes('silencio') ? (
                                    <div
                                      className={`inline-flex items-center gap-1 font-serif text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded border border-amber-400/80 text-xs font-bold shadow-xs select-none transition-all ${
                                        isChordActive ? 'ring-2 ring-amber-600 bg-amber-400 scale-105 shadow-md font-black' : ''
                                      }`}
                                      title="Silencio de introducción (2 tiempos)"
                                    >
                                      <span className="text-sm leading-none font-bold">𝄾</span>
                                      <span className="text-[10px] font-mono tracking-tight text-amber-900 font-bold">2T</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onSelectChord) {
                                          onSelectChord(seg.chord, {
                                            sec,
                                            sIdx,
                                            lIdx,
                                            segIdx,
                                            chordRatio: (lIdx + (segIdx + 0.5) / Math.max(1, segments.length)) / Math.max(1, sec.lines.length),
                                            startTime: timing.startTime,
                                            nextTime: timing.nextTime,
                                          });
                                        } else if (onPlayChord) {
                                          onPlayChord(seg.chord);
                                        }
                                      }}
                                      className={`inline-flex items-center font-mono font-bold px-1.5 py-0.5 rounded text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap select-none ${
                                        isChordActive
                                          ? 'bg-amber-500 text-amber-950 ring-2 ring-amber-600 shadow-md scale-110 z-10 font-black'
                                          : 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400/80 transform hover:scale-105 active:scale-95'
                                      }`}
                                      title={`Tocar y sincronizar ${seg.chord}`}
                                    >
                                      {seg.chord}
                                    </button>
                                  )
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
      <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs font-sans text-stone-600">
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
    </>
  );
}
