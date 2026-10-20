import { normalizeChordName, alignChordsWithLyrics, transposeTextWithChords } from '../../../utils/music';
import { SECTION_KEYWORDS } from '../../../utils/lyricsBlocks';

// Stray characters and silence markers to ignore in the SongSheet viewer
export const IGNORED_CHORD_REGEX = /^(?:['´’`".,\-_\s]+|𝄾.*|𝄽.*|silencio.*|N|none)$/i;

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

      // Ignore stray accents, quotes, and rest symbols like [´], [’], ['], [𝄾], [𝄾 (4T)]
      if (IGNORED_CHORD_REGEX.test(rawChord) || rawChord.length === 0) {
        continue;
      }

      const chordName = normalizeChordName(rawChord);
      if (IGNORED_CHORD_REGEX.test(chordName)) {
        continue;
      }

      if (pendingChord) {
        // If there was a previous chord without text, push it over a space
        segments.push({ chord: pendingChord, text: '   ' });
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

  // If this line contains actual vocal words (not a pure instrumental chord line),
  // collapse artificial multi-space gaps and anchor each chord directly to its word.
  const hasVocalText = segments.some((s) => s.text && s.text.trim().length > 0);
  if (hasVocalText) {
    for (let i = 0; i < segments.length; i++) {
      const curr = segments[i];
      if (!curr.text || curr.text.trim().length === 0) {
        curr.text = '   ';
        continue;
      }
      curr.text = curr.text.replace(/\s{2,}/g, ' ');
      if (curr.chord && curr.text.startsWith(' ')) {
        curr.text = curr.text.replace(/^\s+/, '');
        if (i > 0 && segments[i - 1].text && segments[i - 1].text.trim().length > 0 && !segments[i - 1].text.endsWith(' ')) {
          segments[i - 1].text += ' ';
        }
      } else if (i === 0 && !curr.chord && curr.text.startsWith(' ')) {
        curr.text = curr.text.replace(/^\s+/, '');
      }
    }
  } else {
    // Pure chord line: drop any residual empty segment without a chord (e.g. left behind by a stripped [𝄾])
    return segments.filter((s) => Boolean(s.chord));
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

    // 2b. Ignore lines composed solely of silence markers (e.g. [𝄾 (4T)] or [𝄾])
    const withoutSilenceTags = trimmed
      .replace(/\[\s*(?:𝄾[^[\]]*|𝄽[^[\]]*|silencio[^[\]]*|N|none)\s*\]/gi, '')
      .trim();
    if (!withoutSilenceTags) {
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
 * Calculates start and next-section times for piece-wise seeking
 */
export function calculateSectionTimingMap(sections = []) {
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
}

/**
 * High-precision measure-to-line timing map derived directly from BeatGrid compases
 */
export function calculateLineTimingsMap(compases = [], sections = [], sectionTimingMap = [], effectiveBpm = 100) {
  if (!compases || compases.length === 0) return null;

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

      const extractLineChords = (str) =>
        Array.from(str.matchAll(/\[([A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*)\]/g)).map((m) =>
          normalizeChordName(m[1])
        );

      const hasLeadingUnchordedPhrase = (str) => {
        const cleanStr = (str || '').replace(/\[\s*(?:𝄾[^[\]]*|𝄽[^[\]]*|silencio[^[\]]*|N|none)\s*\]/gi, '');
        const firstBracket = cleanStr.indexOf('[');
        const leadingText = (firstBracket >= 0 ? cleanStr.slice(0, firstBracket) : cleanStr).trim();
        const wordCount = leadingText ? leadingText.split(/\s+/).filter(Boolean).length : 0;
        return wordCount >= 3;
      };

      const getCompasDistinctChords = (comp) => {
        const distinct = [];
        for (const ch of comp?.acordes || []) {
          const clean = normalizeChordName((ch || '').trim());
          if (clean && clean !== '𝄾' && clean !== '𝄽' && (distinct.length === 0 || distinct[distinct.length - 1] !== clean)) {
            distinct.push(clean);
          }
        }
        return distinct.length > 0 ? distinct : ['𝄾'];
      };

      const lineChords = extractLineChords(trimmed);
      const lineChordCount = lineChords.length;
      const startsWithUnchordedPhrase = hasLeadingUnchordedPhrase(trimmed);

      // Si esta línea tiene acordes musicales y los compases actuales al inicio son silencios puros, avanzarlos
      if (lineChordCount > 0) {
        while (
          compasOffset < secCompases.length &&
          getCompasDistinctChords(secCompases[compasOffset]).every((ch) => ch === '𝄾')
        ) {
          compasOffset++;
        }
      }

      // Inspeccionar la siguiente línea no vacía de la sección para saber con qué acorde inicia
      let nextLineChords = null;
      let nextLineStartsWithUnchordedPhrase = false;
      for (let nl = lIdx + 1; nl < sec.lines.length; nl++) {
        const nextTrimmed = sec.lines[nl].trim();
        if (nextTrimmed) {
          nextLineChords = extractLineChords(nextTrimmed);
          nextLineStartsWithUnchordedPhrase = hasLeadingUnchordedPhrase(nextTrimmed);
          break;
        }
      }
      const hasNextLineInSec = nextLineChords !== null;
      const nextLineHasChords = hasNextLineInSec && nextLineChords.length > 0;
      const nextLineFirstChord = nextLineHasChords ? nextLineChords[0] : null;

      let compasesForThisLine = 0;
      let chordsAccum = 0;

      if (lineChordCount === 0) {
        const startComp = secCompases[compasOffset];
        const startDistinct = getCompasDistinctChords(startComp);
        const sustainedChord = startDistinct[0];
        let runLen = 0;
        while (compasOffset + runLen < secCompases.length) {
          const d = getCompasDistinctChords(secCompases[compasOffset + runLen]);
          if (d.length === 1 && d[0] === sustainedChord) {
            runLen++;
          } else {
            break;
          }
        }
        if (nextLineFirstChord && nextLineFirstChord !== sustainedChord && runLen > 0) {
          compasesForThisLine = runLen;
        } else {
          compasesForThisLine = Math.max(1, Math.min(runLen, 2));
        }
      } else {
        const firstTargetChord = lineChords[0];
        let leadInCompasesCount = 0;
        if (startsWithUnchordedPhrase && compasOffset < secCompases.length) {
          const firstCompDistinct = getCompasDistinctChords(secCompases[compasOffset]);
          const leadInChord = firstCompDistinct[0];
          if (firstCompDistinct.length === 1 && leadInChord !== '𝄾' && leadInChord !== firstTargetChord) {
            while (compasOffset + compasesForThisLine < secCompases.length) {
              const d = getCompasDistinctChords(secCompases[compasOffset + compasesForThisLine]);
              if (d.length === 1 && d[0] === leadInChord) {
                compasesForThisLine++;
                leadInCompasesCount++;
              } else {
                break;
              }
            }
          }
        }

        let lastSeenChord = null;
        while (compasOffset + compasesForThisLine < secCompases.length) {
          const comp = secCompases[compasOffset + compasesForThisLine];
          const distinctInCompas = getCompasDistinctChords(comp);
          for (const ch of distinctInCompas) {
            if (ch === '𝄾') continue;
            const expectedNextChord = chordsAccum < lineChords.length ? lineChords[chordsAccum] : null;
            const isExplicitRepeatInLine =
              chordsAccum > 0 &&
              expectedNextChord !== null &&
              expectedNextChord === lastSeenChord &&
              ch === expectedNextChord;

            if (ch !== lastSeenChord || isExplicitRepeatInLine) {
              chordsAccum++;
              lastSeenChord = ch;
            }
          }
          compasesForThisLine++;
          if (chordsAccum >= lineChordCount) break;
        }

        if (lastSeenChord && compasOffset + compasesForThisLine < secCompases.length) {
          let sustainedExtra = 0;
          while (compasOffset + compasesForThisLine + sustainedExtra < secCompases.length) {
            const nextD = getCompasDistinctChords(secCompases[compasOffset + compasesForThisLine + sustainedExtra]);
            if (nextD.length === 1 && nextD[0] === lastSeenChord) {
              sustainedExtra++;
            } else {
              break;
            }
          }

          if (sustainedExtra > 0) {
            if (hasNextLineInSec && nextLineFirstChord === lastSeenChord && !nextLineStartsWithUnchordedPhrase) {
              // La siguiente línea comienza explícitamente con este mismo acorde (ej. [A] [A] seguido de [A] [A]):
              // no robarle sus compases a la siguiente línea.
            } else if (
              hasNextLineInSec &&
              (!nextLineHasChords || nextLineStartsWithUnchordedPhrase)
            ) {
              const totalSustainedRun = 1 + sustainedExtra;
              const takeForCurrent = Math.max(1, Math.ceil(totalSustainedRun / 2));
              compasesForThisLine += takeForCurrent - 1;
            } else {
              compasesForThisLine += sustainedExtra;
            }
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

        const secPerCompas = (60 / (effectiveBpm || 100)) * 4;
        const secStart = sectionTimingMap[sIdx]?.startTime ?? 0;
        const startCompas = assignedCompases[0];
        const endCompas = assignedCompases[assignedCompases.length - 1];
        const nextCompas = enrichedCompases[endCompas?.globalIdx + 1];

        const lineStartTime = startCompas?.beatTimes?.[0] ?? (startCompas?.secTime ?? (secStart + compasOffset * secPerCompas));
        const lineEndTime = nextCompas?.beatTimes?.[0] ?? (nextCompas?.secTime ?? (lineStartTime + Math.max(1, compasesForThisLine) * secPerCompas));

        const chords = lineChords;
        const chordTimings = [];
        const chordBeats = [];

        // Excluir los compases de lead-in sin acorde propio al mapear los eventos de los acordes explícitos de la línea
        const chordEventCompases =
          leadInCompasesCount > 0 && leadInCompasesCount < assignedCompases.length
            ? assignedCompases.slice(leadInCompasesCount)
            : assignedCompases;

        // 1. Extraer eventos de acordes deduplicando únicamente pulsos consecutivos DENTRO de cada compás individual
        const rawMeasureEvents = [];
        chordEventCompases.forEach((comp) => {
          let lastChInCompas = null;
          (comp.acordes || []).forEach((ch, bIdx) => {
            const clean = (ch || '').trim();
            if (!clean || clean === '𝄾' || clean === '𝄽') return;
            const normClean = normalizeChordName(clean);
            if (normClean !== lastChInCompas) {
              const bTime = comp.beatTimes?.[bIdx] ?? null;
              const beatInLine = lineBeats.findIndex((lb) => lb.globalBeat === comp.startBeatGlobal + bIdx);
              rawMeasureEvents.push({
                chord: clean,
                normChord: normClean,
                compasIdx: comp.globalIdx,
                beatInCompas: bIdx,
                globalBeat: comp.startBeatGlobal + bIdx,
                beatIndexInLine: beatInLine >= 0 ? beatInLine : 0,
                startTime: bTime,
              });
              lastChInCompas = normClean;
            }
          });
        });

        // 2. Si la cantidad de eventos por compás coincide exactamente con los acordes de la línea (ej. [Bm7] [Bm7] en 2 compases),
        // usar mapeo 1:1 por compás; de lo contrario, colapsar acordes sostenidos entre compases salvo cuando la línea repita explícitamente el acorde.
        const compasChordEvents = [];
        if (rawMeasureEvents.length === chords.length) {
          compasChordEvents.push(...rawMeasureEvents);
        } else {
          let lastCh = null;
          let targetIdx = 0;
          rawMeasureEvents.forEach((ev) => {
            const expectedTarget = targetIdx < chords.length ? normalizeChordName(chords[targetIdx]) : null;
            const isExplicitRepeat =
              targetIdx > 0 &&
              expectedTarget !== null &&
              expectedTarget === lastCh &&
              ev.normChord === expectedTarget;

            if (ev.normChord !== lastCh || isExplicitRepeat) {
              compasChordEvents.push(ev);
              lastCh = ev.normChord;
              targetIdx++;
            }
          });
        }

        let lastMatchedEventIdx = -1;
        const mappedTargets = chords.map((ch, cIdx) => {
          const normCh = normalizeChordName(ch);
          let matchedEvent = null;

          if (compasChordEvents.length > 0) {
            if (chords.length === compasChordEvents.length) {
              matchedEvent = compasChordEvents[cIdx];
            } else {
              const remainingChords = chords.length - 1 - cIdx;
              const maxSearchIdx = compasChordEvents.length - remainingChords;

              for (let i = lastMatchedEventIdx + 1; i < compasChordEvents.length; i++) {
                if (i <= Math.max(lastMatchedEventIdx + 1, maxSearchIdx) && normalizeChordName(compasChordEvents[i].chord) === normCh) {
                  matchedEvent = compasChordEvents[i];
                  lastMatchedEventIdx = i;
                  break;
                }
              }

              if (!matchedEvent) {
                if (lastMatchedEventIdx + 1 < compasChordEvents.length) {
                  lastMatchedEventIdx++;
                  matchedEvent = compasChordEvents[lastMatchedEventIdx];
                } else {
                  const propIdx = Math.min(compasChordEvents.length - 1, Math.floor(cIdx * (compasChordEvents.length / Math.max(1, chords.length))));
                  matchedEvent = compasChordEvents[propIdx];
                }
              }
            }
          }

          if (matchedEvent) {
            return {
              chord: ch,
              compasIdx: matchedEvent.compasIdx,
              beatInCompas: matchedEvent.beatInCompas,
              startBeatGlobal: matchedEvent.globalBeat,
              beatIndexInLine: matchedEvent.beatIndexInLine,
              startTime: matchedEvent.startTime,
            };
          }

          const beatStep = Math.max(1, Math.floor(lineBeats.length / Math.max(1, chords.length)));
          const bIdx = Math.min(lineBeats.length - 1, cIdx * beatStep);
          const targetBeat = lineBeats[bIdx] || lineBeats[0];
          return {
            chord: ch,
            compasIdx: targetBeat?.compasIdx ?? startGlobalIdx,
            beatInCompas: targetBeat?.beatInCompas ?? 0,
            startBeatGlobal: targetBeat?.globalBeat ?? lineStartBeat,
            beatIndexInLine: bIdx,
            startTime: targetBeat?.startTime ?? (allBeatTimes[bIdx] ?? null),
          };
        });

        mappedTargets.forEach((target, cIdx) => {
          chordBeats.push({
            chord: target.chord,
            compasIdx: target.compasIdx,
            beatInCompas: target.beatInCompas,
            startBeatGlobal: target.startBeatGlobal,
          });

          let cStart = target.startTime;
          if (cStart === null || cStart === undefined) {
            if (allBeatTimes[target.beatIndexInLine] !== undefined) {
              cStart = allBeatTimes[target.beatIndexInLine];
            } else {
              cStart = lineStartTime + (target.beatIndexInLine / Math.max(1, lineBeats.length)) * (lineEndTime - lineStartTime);
            }
          }

          let cEnd = lineEndTime;
          const nextTarget = mappedTargets[cIdx + 1];
          if (nextTarget) {
            if (nextTarget.startTime !== null && nextTarget.startTime !== undefined) {
              cEnd = nextTarget.startTime;
            } else if (allBeatTimes[nextTarget.beatIndexInLine] !== undefined) {
              cEnd = allBeatTimes[nextTarget.beatIndexInLine];
            } else {
              cEnd = lineStartTime + (nextTarget.beatIndexInLine / Math.max(1, lineBeats.length)) * (lineEndTime - lineStartTime);
            }
          }

          if (cEnd <= cStart) {
            const beatSec = (60 / (effectiveBpm || 100));
            cEnd = Math.min(lineEndTime, cStart + beatSec);
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
          startsWithUnchordedPhrase,
          chords: chordBeats,
          chordTimings,
        });

        compasOffset += compasesForThisLine;
        return;
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

      const secPerCompas = (60 / (effectiveBpm || 100)) * 4;
      const secStart = sectionTimingMap[sIdx]?.startTime ?? 0;
      const startCompas = assignedCompases[0];
      const endCompas = assignedCompases[assignedCompases.length - 1];
      const nextCompas = enrichedCompases[endCompas?.globalIdx + 1];

      const lineStartTime = startCompas?.beatTimes?.[0] ?? (startCompas?.secTime ?? (secStart + compasOffset * secPerCompas));
      const lineEndTime = nextCompas?.beatTimes?.[0] ?? (nextCompas?.secTime ?? (lineStartTime + Math.max(1, compasesForThisLine) * secPerCompas));

      linesTiming.push({
        startCompasIdx: startGlobalIdx,
        endCompasIdx: endGlobalIdx,
        startBeatGlobal: lineStartBeat,
        endBeatGlobal: lineEndBeat,
        startTime: lineStartTime,
        endTime: lineEndTime,
        compasesCount: compasesForThisLine,
        startsWithUnchordedPhrase,
        chords: [],
        chordTimings: [],
      });

      compasOffset += compasesForThisLine;
    });

    result.push(linesTiming);
  });

  return result;
}

/**
 * Busca hacia atrás en lineTimingsMap la línea anterior más cercana que posea acordes explícitos,
 * para mantener resaltado su último acorde durante frases que inician sosteniendo el acorde previo.
 */
function findPreviousChordLocation(lineTimingsMap, currentSecIdx, currentLineIdx) {
  if (!lineTimingsMap) return null;
  for (let s = currentSecIdx; s >= 0; s--) {
    const secLines = lineTimingsMap[s];
    if (!secLines) continue;
    const startL = s === currentSecIdx ? currentLineIdx - 1 : secLines.length - 1;
    for (let l = startL; l >= 0; l--) {
      const lt = secLines[l];
      if (lt && Array.isArray(lt.chords) && lt.chords.length > 0) {
        return {
          sectionIdx: s,
          lineIdx: l,
          chordRank: lt.chords.length - 1,
        };
      }
    }
  }
  return null;
}

/**
 * Resolves active section, line, progress and active chord rank during playback or beat navigation
 */
export function resolveActivePlaybackLocation({
  isPlaybackActive,
  currentBeatIndex,
  currentTime,
  lineTimingsMap,
  sections,
  sectionTimingMap,
  effectiveBpm = 100,
}) {
  const NEUTRAL_STATE = {
    activeSectionIdx: -1,
    activeLineIdx: -1,
    lineProgress: 0,
    activeChordRank: -1,
    activeChordSectionIdx: -1,
    activeChordLineIdx: -1,
  };

  if (!isPlaybackActive && (currentBeatIndex === null || currentBeatIndex < 0)) {
    return NEUTRAL_STATE;
  }

  // Find the first synced musical line if lineTimingsMap is present
  let firstTimedLine = null;
  if (lineTimingsMap) {
    for (let sIdx = 0; sIdx < lineTimingsMap.length; sIdx++) {
      const secLines = lineTimingsMap[sIdx];
      if (!secLines) continue;
      for (let lIdx = 0; lIdx < secLines.length; lIdx++) {
        if (secLines[lIdx]) {
          firstTimedLine = secLines[lIdx];
          break;
        }
      }
      if (firstTimedLine) break;
    }
  }

  // Guard: During initial silence (before the first musical chord/line enters), keep SongSheetView in neutral waiting state
  if (firstTimedLine) {
    if (currentBeatIndex >= 0 && currentBeatIndex < firstTimedLine.startBeatGlobal) {
      return NEUTRAL_STATE;
    }
    if (currentBeatIndex < 0 && currentTime !== null && currentTime >= 0 && currentTime < firstTimedLine.startTime) {
      return NEUTRAL_STATE;
    }
  }

  // 1. PRIMARY: Match via currentBeatIndex against lineTimingsMap (100% beat-accurate with BeatGrid)
  if (firstTimedLine && currentBeatIndex >= 0) {
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
          if (chordRank === -1 && chords.length > 0 && !lt.startsWithUnchordedPhrase) {
            chordRank = 0;
          }

          let activeChordSectionIdx = sIdx;
          let activeChordLineIdx = lIdx;
          let resolvedChordRank = chordRank;

          // Si la línea actual aún no alcanzó su primer acorde (ej. frase cantada sobre el acorde sostenido previo),
          // mantener resaltado el último acorde de la línea/sección anterior.
          if (resolvedChordRank === -1) {
            const prevLoc = findPreviousChordLocation(lineTimingsMap, sIdx, lIdx);
            if (prevLoc) {
              activeChordSectionIdx = prevLoc.sectionIdx;
              activeChordLineIdx = prevLoc.lineIdx;
              resolvedChordRank = prevLoc.chordRank;
            } else {
              activeChordSectionIdx = -1;
              activeChordLineIdx = -1;
            }
          }

          return {
            activeSectionIdx: sIdx,
            activeLineIdx: lIdx,
            lineProgress: progress,
            activeChordRank: resolvedChordRank,
            activeChordSectionIdx,
            activeChordLineIdx,
          };
        }
      }
    }

    // If currentBeatIndex is in an intermediate silence measure between two synced lines, do not fall back to linear guessing
    return NEUTRAL_STATE;
  }

  // 2. High precision line check using exact timestamps if compases map is available
  if (firstTimedLine && currentTime !== null && currentTime >= 0) {
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
          if (chordRank === -1 && lt.chords?.length > 0 && !lt.startsWithUnchordedPhrase) {
            chordRank = Math.min(lt.chords.length - 1, Math.max(0, Math.floor(progress * lt.chords.length)));
          }

          let activeChordSectionIdx = sIdx;
          let activeChordLineIdx = lIdx;
          let resolvedChordRank = chordRank;

          if (resolvedChordRank === -1) {
            const prevLoc = findPreviousChordLocation(lineTimingsMap, sIdx, lIdx);
            if (prevLoc) {
              activeChordSectionIdx = prevLoc.sectionIdx;
              activeChordLineIdx = prevLoc.lineIdx;
              resolvedChordRank = prevLoc.chordRank;
            } else {
              activeChordSectionIdx = -1;
              activeChordLineIdx = -1;
            }
          }

          return {
            activeSectionIdx: sIdx,
            activeLineIdx: lIdx,
            lineProgress: progress,
            activeChordRank: resolvedChordRank,
            activeChordSectionIdx,
            activeChordLineIdx,
          };
        }
      }
    }

    return NEUTRAL_STATE;
  }

  // 3. Piece-wise check with exact section timestamps (only when compases/lineTimingsMap are not available)
  const hasAnySectionTimestamp = Array.isArray(sectionTimingMap) && sectionTimingMap.some((t) => t && t.startTime !== null);
  if (hasAnySectionTimestamp && currentTime !== null && currentTime >= 0) {
    const firstSecTiming = sectionTimingMap.find((t) => t && t.startTime !== null);
    if (firstSecTiming && currentTime < firstSecTiming.startTime) {
      return NEUTRAL_STATE;
    }

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

          return {
            activeSectionIdx: i,
            activeLineIdx: lineIdx,
            lineProgress: currentLineProgress,
            activeChordRank: -1,
            activeChordSectionIdx: i,
            activeChordLineIdx: lineIdx,
          };
        }
      }
    }

    return NEUTRAL_STATE;
  }

  // 4. Fallback: linear calculation across sections based on BPM (only for legacy songs with no compases and no section timestamps)
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
        const lIdx = targetGlobalLine - runningCount;
        return {
          activeSectionIdx: i,
          activeLineIdx: lIdx,
          lineProgress: currentLineProgress,
          activeChordRank: -1,
          activeChordSectionIdx: i,
          activeChordLineIdx: lIdx,
        };
      }
      runningCount += sections[i].lines.length;
    }
  }

  return NEUTRAL_STATE;
}
