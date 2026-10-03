import React, { useMemo, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { transposeTextWithChords, normalizeChordName, alignChordsWithLyrics } from '../../utils/music';
import { SECTION_KEYWORDS } from '../../utils/lyricsBlocks';

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
  const aligned = alignChordsWithLyrics(rawContent || '');
  const transposed = transposeTextWithChords(aligned, transposeAmount);
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

    // 3. Check for Section Headers: [Intro @ 0.0], [Verse @ 9.1], [Parte A], [Chorus], etc.
    const bracketHeaderMatch = trimmed.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*([0-9:.]+))?\s*\]$/);
    const innerHeaderName = bracketHeaderMatch ? bracketHeaderMatch[1].trim() : '';
    const isSectionHeader =
      bracketHeaderMatch &&
      (bracketHeaderMatch[2] !== undefined ||
       SECTION_KEYWORDS.test(innerHeaderName) ||
       !/^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*$/i.test(innerHeaderName));

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

  // High-precision measure-to-line timing map derived directly from BeatGrid compases
  // Tracks both exact beat index bounds (startBeatGlobal, endBeatGlobal) and timestamps
  const lineTimingsMap = useMemo(() => {
    if (!compases || compases.length === 0) return null;

    // First, map each compas's exact global beat range based on its acordes.length
    let globalBeatCounter = 0;
    const enrichedCompases = compases.map((c, idx) => {
      const startBeat = globalBeatCounter;
      const count = (c.acordes || []).length || 4;
      globalBeatCounter += count;
      return {
        ...c,
        globalIdx: idx,
        startBeatGlobal: startBeat,
        endBeatGlobal: startBeat + count - 1,
        beatCount: count,
      };
    });

    const compasesBySection = {};
    enrichedCompases.forEach((c) => {
      const sName = (c.seccion || 'Intro').trim().toLowerCase();
      if (!compasesBySection[sName]) compasesBySection[sName] = [];
      compasesBySection[sName].push(c);
    });

    const result = [];

    sections.forEach((sec, sIdx) => {
      const sName = sec.name.trim().toLowerCase();
      const secCompases = compasesBySection[sName] || [];
      const linesTiming = [];

      if (secCompases.length === 0) {
        result.push(null);
        return;
      }

      let compasOffset = 0;
      sec.lines.forEach((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          linesTiming.push(null);
          return;
        }

        const cMatches = Array.from(trimmed.matchAll(/\[([A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*)\]/g));
        const lineChordCount = cMatches.length;

        let compasesForThisLine = 0;
        let chordsAccum = 0;

        if (lineChordCount === 0) {
          compasesForThisLine = 1;
        } else {
          while (compasOffset + compasesForThisLine < secCompases.length) {
            const comp = secCompases[compasOffset + compasesForThisLine];
            const distinctInCompas = [];
            for (const ch of (comp.acordes || [])) {
              if (ch && ch !== '𝄾' && ch !== '𝄽' && (distinctInCompas.length === 0 || distinctInCompas[distinctInCompas.length - 1] !== ch)) {
                distinctInCompas.push(ch);
              }
            }
            const numChords = distinctInCompas.length || 1;
            chordsAccum += numChords;
            compasesForThisLine++;
            if (chordsAccum >= lineChordCount) break;
          }
        }

        const isLastLine = lIdx === sec.lines.length - 1;
        if (isLastLine && compasOffset + compasesForThisLine < secCompases.length) {
          compasesForThisLine = secCompases.length - compasOffset;
        }

        const assignedCompases = secCompases.slice(compasOffset, compasOffset + compasesForThisLine);
        const startGlobalIdx = assignedCompases[0]?.globalIdx ?? -1;
        const endGlobalIdx = assignedCompases[assignedCompases.length - 1]?.globalIdx ?? -1;
        const lineStartBeat = assignedCompases[0]?.startBeatGlobal ?? 0;
        const lineEndBeat = assignedCompases[assignedCompases.length - 1]?.endBeatGlobal ?? lineStartBeat;

        // Collect beats and timestamps for these compases
        const lineBeats = [];
        const allBeatTimes = [];
        assignedCompases.forEach((comp) => {
          (comp.acordes || []).forEach((ch, bIdx) => {
            lineBeats.push({
              compasIdx: comp.globalIdx,
              beatInCompas: bIdx,
              globalBeat: comp.startBeatGlobal + bIdx,
              chord: ch,
            });
          });
          (comp.beatTimes || []).forEach((bt) => allBeatTimes.push(bt));
        });

        // Compute start and end times for line
        const secPerCompas = (60 / (effectiveBpm || 100)) * 4;
        const secStart = sectionTimingMap[sIdx]?.startTime ?? 0;
        const startCompas = assignedCompases[0];
        const endCompas = assignedCompases[assignedCompases.length - 1];
        const nextCompas = enrichedCompases[endCompas?.globalIdx + 1];

        const lineStartTime = startCompas?.beatTimes?.[0] ?? (startCompas?.secTime ?? (secStart + compasOffset * secPerCompas));
        const lineEndTime = nextCompas?.beatTimes?.[0] ?? (nextCompas?.secTime ?? (lineStartTime + Math.max(1, compasesForThisLine) * secPerCompas));

        const chords = cMatches.map((m) => m[1]);
        const chordTimings = [];
        const chordBeats = [];

        chords.forEach((ch, cIdx) => {
          const beatStep = Math.max(1, Math.floor(lineBeats.length / Math.max(1, chords.length)));
          const targetBeat = lineBeats[cIdx * beatStep] || lineBeats[0];
          chordBeats.push({
            chord: ch,
            compasIdx: targetBeat?.compasIdx,
            beatInCompas: targetBeat?.beatInCompas,
            startBeatGlobal: targetBeat?.globalBeat,
          });

          // Precise chord timestamps
          let cStart = lineStartTime;
          let cEnd = lineEndTime;
          if (allBeatTimes.length >= chords.length) {
            const startBIdx = Math.floor(cIdx * (allBeatTimes.length / chords.length));
            const endBIdx = Math.floor((cIdx + 1) * (allBeatTimes.length / chords.length));
            cStart = allBeatTimes[startBIdx] ?? (lineStartTime + (cIdx / chords.length) * (lineEndTime - lineStartTime));
            cEnd = endBIdx < allBeatTimes.length ? allBeatTimes[endBIdx] : lineEndTime;
          } else {
            cStart = lineStartTime + (cIdx / chords.length) * (lineEndTime - lineStartTime);
            cEnd = lineStartTime + ((cIdx + 1) / chords.length) * (lineEndTime - lineStartTime);
          }
          chordTimings.push({ startTime: cStart, endTime: cEnd });
        });

        linesTiming.push({
          startCompasIdx: startGlobalIdx,
          endCompasIdx: endGlobalIdx,
          startBeatGlobal: lineStartBeat,
          endBeatGlobal: lineEndBeat,
          startTime: lineStartTime,
          endTime: lineEndTime,
          compasesCount: compasesForThisLine,
          chords: chordBeats,
          chordTimings,
        });

        compasOffset += compasesForThisLine;
      });

      result.push(linesTiming);
    });

    return result;
  }, [compases, sections, sectionTimingMap, effectiveBpm]);

  // Determine the active section, line index, intra-line progress and active chord rank
  const { activeSectionIdx, activeLineIdx, lineProgress, activeChordRank } = useMemo(() => {
    if (!isPlaybackActive && (currentBeatIndex === null || currentBeatIndex < 0)) {
      return { activeSectionIdx: -1, activeLineIdx: -1, lineProgress: 0, activeChordRank: -1 };
    }

    // 1. PRIMARY: Match via currentBeatIndex against lineTimingsMap (100% beat-accurate with BeatGrid)
    if (lineTimingsMap && currentBeatIndex >= 0) {
      for (let sIdx = 0; sIdx < lineTimingsMap.length; sIdx++) {
        const secLines = lineTimingsMap[sIdx];
        if (!secLines) continue;

        for (let lIdx = 0; lIdx < secLines.length; lIdx++) {
          const lt = secLines[lIdx];
          if (!lt) continue;

          if (currentBeatIndex >= lt.startBeatGlobal && currentBeatIndex <= lt.endBeatGlobal) {
            const totalLineBeats = Math.max(1, lt.endBeatGlobal - lt.startBeatGlobal + 1);
            const progress = Math.min(0.999, Math.max(0, (currentBeatIndex - lt.startBeatGlobal) / totalLineBeats));

            let chordRank = -1;
            const chords = lt.chords || [];
            for (let cIdx = chords.length - 1; cIdx >= 0; cIdx--) {
              if (currentBeatIndex >= chords[cIdx].startBeatGlobal) {
                chordRank = cIdx;
                break;
              }
            }
            if (chordRank === -1 && chords.length > 0) chordRank = 0;

            return {
              activeSectionIdx: sIdx,
              activeLineIdx: lIdx,
              lineProgress: progress,
              activeChordRank: chordRank,
            };
          }
        }
      }
    }

    // 2. High precision line check using exact timestamps if compases map is available
    if (lineTimingsMap && currentTime !== null && currentTime >= 0) {
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const secLines = lineTimingsMap[sIdx];
        if (!secLines) continue;

        for (let lIdx = 0; lIdx < secLines.length; lIdx++) {
          const lt = secLines[lIdx];
          if (!lt) continue;

          const isLastLineOfSec = lIdx === secLines.length - 1;
          const nextSec = lineTimingsMap[sIdx + 1];
          const nextSecStart = nextSec && nextSec[0] ? nextSec[0].startTime : (sectionTimingMap[sIdx]?.nextTime ?? Infinity);

          if (currentTime >= lt.startTime && (currentTime < lt.endTime || (isLastLineOfSec && currentTime < nextSecStart))) {
            const duration = Math.max(0.1, lt.endTime - lt.startTime);
            const progress = Math.min(0.999, Math.max(0, (currentTime - lt.startTime) / duration));

            let chordRank = -1;
            if (lt.chordTimings && lt.chordTimings.length > 0) {
              for (let cIdx = 0; cIdx < lt.chordTimings.length; cIdx++) {
                const ct = lt.chordTimings[cIdx];
                const isLastChord = cIdx === lt.chordTimings.length - 1;
                if (currentTime >= ct.startTime && (currentTime < ct.endTime || (isLastChord && currentTime < lt.endTime))) {
                  chordRank = cIdx;
                  break;
                }
              }
            }
            if (chordRank === -1 && lt.chords?.length > 0) {
              chordRank = Math.min(lt.chords.length - 1, Math.max(0, Math.floor(progress * lt.chords.length)));
            }

            return {
              activeSectionIdx: sIdx,
              activeLineIdx: lIdx,
              lineProgress: progress,
              activeChordRank: chordRank,
            };
          }
        }
      }
    }

    // 3. Piece-wise check with exact section timestamps
    if (currentTime !== null && currentTime >= 0) {
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
            const currentLineProgress = Math.min(0.999, Math.max(0, (progress * lineCount) - lineIdx));

            return { activeSectionIdx: i, activeLineIdx: lineIdx, lineProgress: currentLineProgress, activeChordRank: -1 };
          }
        }
      }
    }

    // 4. Fallback: linear calculation across sections based on BPM
    if (currentTime !== null && currentTime >= 0) {
      let totalLines = 0;
      sections.forEach((s) => (totalLines += Math.max(1, s.lines.length)));
      const secondsPerBeat = 60 / (effectiveBpm || 100);
      const estimatedTotalSeconds = totalLines * 4 * secondsPerBeat;
      const globalProgress = Math.min(0.999, Math.max(0, currentTime / Math.max(1, estimatedTotalSeconds)));
      const targetGlobalLine = Math.floor(globalProgress * totalLines);
      const currentLineProgress = Math.min(0.999, Math.max(0, (globalProgress * totalLines) - targetGlobalLine));

      let runningCount = 0;
      for (let i = 0; i < sections.length; i++) {
        if (targetGlobalLine < runningCount + sections[i].lines.length) {
          return {
            activeSectionIdx: i,
            activeLineIdx: targetGlobalLine - runningCount,
            lineProgress: currentLineProgress,
            activeChordRank: -1,
          };
        }
        runningCount += sections[i].lines.length;
      }
    }

    return { activeSectionIdx: -1, activeLineIdx: -1, lineProgress: 0, activeChordRank: -1 };
  }, [isPlaybackActive, currentBeatIndex, currentTime, lineTimingsMap, sections, sectionTimingMap, effectiveBpm]);


  // Auto-scroll to keep the active line visible during playback or beat navigation (localized scroll only)
  useEffect(() => {
    if ((isAutoScrolling || isPlaybackActive || currentBeatIndex >= 0) && activeLineRef.current && scrollRef?.current) {
      const container = scrollRef.current;
      const line = activeLineRef.current;
      const lineTop = line.offsetTop;
      const lineHeight = line.offsetHeight;
      const containerHeight = container.offsetHeight;
      const targetScrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    }
  }, [activeSectionIdx, activeLineIdx, isAutoScrolling, isPlaybackActive, currentBeatIndex, scrollRef]);

  return (
    <>
      {/* Lyrics Scrollable Container */}
      <div
        ref={scrollRef}
        className="max-h-[380px] xl:max-h-[440px] overflow-y-auto pr-2 space-y-4 font-mono text-sm leading-relaxed"
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

                  if (hasChords) {
                    const segments = parseLineToChordSegments(line);

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
                    const isPureChordLine = segments.every((seg) => !seg.text || seg.text.trim() === '');

                    // Determinar con alta precisión qué segmento de acorde en la línea es el actualmente activo
                    let activeChordSegIdx = -1;
                    if (isLineActive && totalChordsInLine > 0) {
                      // 1. Direct beat-level ranking from BeatGrid lineTimingsMap
                      if (activeChordRank >= 0 && activeChordRank < totalChordsInLine) {
                        activeChordSegIdx = chordPositions[activeChordRank]?.segIdx ?? -1;
                      }

                      // 2. High precision timestamp lookup
                      if (activeChordSegIdx === -1) {
                        const lineTiming = lineTimingsMap?.[sIdx]?.[lIdx];
                        if (lineTiming?.chordTimings && lineTiming.chordTimings.length === totalChordsInLine) {
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

                      // 3. Fallback: match currentPlayingChord if present in the line
                      if (activeChordSegIdx === -1 && currentPlayingChord) {
                        const normPlaying = normalizeChordName(currentPlayingChord);
                        const match = chordPositions.find((cp) => cp.chord === normPlaying);
                        if (match) activeChordSegIdx = match.segIdx;
                      }

                      // 4. Fallback: si no hay timing exacto, dividir la duración de la línea equitativamente entre los acordes
                      if (activeChordSegIdx === -1) {
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
                          const normalizedSegChord = seg.chord ? normalizeChordName(seg.chord) : null;
                          const isChordActive = isLineActive && segIdx === activeChordSegIdx;

                          const isSynced = Boolean(sec.time || timing.startTime !== null);

                          return (
                            <div
                              key={segIdx}
                              className="inline-flex flex-col items-start justify-end flex-shrink-0"
                            >
                              {/* Top Row: Clickable Chord Badge positioned above syllable */}
                              <div className="h-5 flex items-center mb-0.5">
                                {seg.chord ? (
                                  seg.chord.includes('𝄾') || seg.chord.includes('𝄽') || seg.chord.toLowerCase().includes('silencio') ? (
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
                                        }
                                      }}
                                      className={`inline-flex items-center gap-1 font-serif text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded border border-amber-400/80 text-xs font-bold shadow-xs select-none transition-all cursor-pointer ${
                                        isChordActive ? 'ring-2 ring-amber-600 bg-amber-400 scale-105 shadow-md font-black' : ''
                                      }`}
                                      title="Silencio de introducción (2 tiempos)"
                                    >
                                      <span className="text-sm leading-none font-bold">𝄾</span>
                                      <span className="text-[10px] font-mono tracking-tight text-amber-900 font-bold">2T</span>
                                    </button>
                                  ) : (
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
