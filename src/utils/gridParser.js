/**
 * Utilidad de alineación armónica y parsing (gridParser) para SongBook
 * 
 * Toma un texto estándar con acordes en corchetes [C] o datos de sincronización
 * y genera una estructura de compases y tiempos (4/4) para el BeatGrid interactivo.
 */

import { alignChordsWithLyrics } from './music.js';
import { SECTION_KEYWORDS } from './lyricsBlocks.js';

// Regex to test if a string is a standard music chord notation
const CHORD_REGEX = /^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*$/i;

/**
 * Parsea el texto de una canción a un listado de compases estructurados para la grilla
 * @param {string} text Texto completo de la canción
 * @param {number} beatsPerMeasure Cantidad de tiempos por compás (ej: 4)
 * @returns {Array} Listado de compases [{ id, seccion, acordes: [...], secTime }]
 */
export function parseSongTextToGrid(text, beatsPerMeasure = 4) {
  if (!text || typeof text !== 'string') return [];

  const alignedText = alignChordsWithLyrics(text);
  const lines = alignedText.split('\n');
  const compases = [];
  let currentSection = 'Intro';
  let sectionStartTime = null;
  let measureCounter = 1;
  let lastActiveChord = '';

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return;

    // Ignorar líneas de metadatos
    if (trimmedLine.match(/^\[(?:BPM|Beats|TimeSignature|Time)\s*[@:]?\s*[\d./]+\]$/i)) {
      return;
    }

    // 1. Detectar cabeceras de sección con tiempo opcional: [Parte A], [Intro @ 12.5], [Coro], [Solo]
    const headerMatch = trimmedLine.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*([\d.]+))?\s*\]$/);
    if (headerMatch) {
      const headerName = headerMatch[1].trim();
      const isMetadata = /^(bpm|beats|time|timesignature|metro)$/i.test(headerName);
      if (isMetadata) return;

      const isExplicitSection =
        headerMatch[2] !== undefined ||
        SECTION_KEYWORDS.test(headerName) ||
        !CHORD_REGEX.test(headerName);

      if (isExplicitSection) {
        currentSection = headerName;
        sectionStartTime = headerMatch[2] ? parseFloat(headerMatch[2]) : null;
        lastActiveChord = '';
        return;
      }
    }

    // 2. Analizar partes del texto de la línea para separar acordes y letras
    const parts = trimmedLine.split(/(\[.*?\])/g);
    
    // Identificar si es una línea que contiene solo acordes
    const isChordOnlyLine = parts.every(part => part.startsWith('[') || part.trim() === '' || part.trim() === '|');

    // Extraer acordes y sus posiciones relativas
    const lineChords = [];
    let cleanTextLength = 0;
    
    parts.forEach((part) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const chordName = part.replace(/[[\]]/g, '').trim();
        if (chordName && chordName !== '|') {
          lineChords.push({
            chord: chordName,
            charPosition: cleanTextLength
          });
        }
      } else {
        cleanTextLength += part.length;
      }
    });

    if (lineChords.length === 0) return;

    if (isChordOnlyLine) {
      // Caso A: Línea con solo acordes (ej: [C] [G] [Am] [F], o con compases agrupados [C] [G]   [Am] [F] o | [C] [G] | [Am] |)
      const hasBars = trimmedLine.includes('|');
      const hasMultiSpaces = /\s{2,}/.test(trimmedLine);

      if (hasBars || hasMultiSpaces) {
        // Separar por compases explícitos
        const measureChunks = hasBars
          ? trimmedLine.split('|').map((s) => s.trim()).filter((s) => s.length > 0)
          : trimmedLine.split(/\s{2,}/).map((s) => s.trim()).filter((s) => s.length > 0);

        measureChunks.forEach((chunk) => {
          const chunkParts = chunk.split(/(\[.*?\])/g);
          const chunkChords = [];
          chunkParts.forEach((part) => {
            if (part.startsWith('[') && part.endsWith(']')) {
              const chordName = part.replace(/[[\]]/g, '').trim();
              if (chordName && chordName !== '|') {
                chunkChords.push(chordName);
              }
            }
          });

          if (chunkChords.length === 0) return;

          const beatArray = Array(beatsPerMeasure).fill('');
          if (chunkChords.length === 1) {
            beatArray[0] = chunkChords[0];
          } else if (chunkChords.length === 2) {
            beatArray[0] = chunkChords[0];
            beatArray[Math.floor(beatsPerMeasure / 2)] = chunkChords[1];
          } else {
            chunkChords.slice(0, beatsPerMeasure).forEach((ch, idx) => {
              beatArray[idx] = ch;
            });
          }

          if (chunkChords.length > 0) {
            lastActiveChord = chunkChords[chunkChords.length - 1];
          }

          compases.push({
            id: measureCounter++,
            seccion: currentSection,
            acordes: beatArray,
            secTime: sectionStartTime,
          });
          sectionStartTime = null;
        });
      } else {
        // Comportamiento estándar: cada acorde en tiempo 0 de su compás
        lineChords.forEach((chordInfo) => {
          const beatArray = Array(beatsPerMeasure).fill('');
          beatArray[0] = chordInfo.chord;
          lastActiveChord = chordInfo.chord;

          compases.push({
            id: measureCounter++,
            seccion: currentSection,
            acordes: beatArray,
            secTime: sectionStartTime,
          });
          sectionStartTime = null;
        });
      }
    } else {
      // Caso B: Línea mixta con letra y acordes
      const measuresForLine = 2;
      const totalBeatsForLine = measuresForLine * beatsPerMeasure; // 8 tiempos
      
      const lineBeats = Array(totalBeatsForLine).fill('');

      lineChords.forEach((chordInfo) => {
        const relativePosition = cleanTextLength > 0 ? (chordInfo.charPosition / cleanTextLength) : 0;
        const beatIndex = Math.min(
          totalBeatsForLine - 1,
          Math.max(0, Math.round(relativePosition * (totalBeatsForLine - 1)))
        );
        lineBeats[beatIndex] = chordInfo.chord;
      });

      // Compás 1 (tiempos 0 a 3)
      const m1Chords = lineBeats.slice(0, beatsPerMeasure);
      if (m1Chords.every((c) => !c) && lastActiveChord) {
        m1Chords[0] = lastActiveChord;
      }
      m1Chords.forEach((c) => {
        if (c && c !== '𝄾' && c !== '𝄽') lastActiveChord = c;
      });

      compases.push({
        id: measureCounter++,
        seccion: currentSection,
        acordes: m1Chords,
        secTime: sectionStartTime,
        lyric: trimmedLine.replace(/\[.*?\]/g, '').trim()
      });
      sectionStartTime = null;

      // Compás 2 (tiempos 4 a 7)
      const m2Chords = lineBeats.slice(beatsPerMeasure, totalBeatsForLine);
      if (m2Chords.every((c) => !c) && lastActiveChord) {
        m2Chords[0] = lastActiveChord;
      }
      m2Chords.forEach((c) => {
        if (c && c !== '𝄾' && c !== '𝄽') lastActiveChord = c;
      });

      compases.push({
        id: measureCounter++,
        seccion: currentSection,
        acordes: m2Chords,
        secTime: null
      });
    }
  });

  return compases;
}

/**
 * Harmonizes and aligns measure section names with the actual section names defined in the song's lyrics.
 * Maps timestamps or sequential sections from the lyrics to replace generic "Estrofa X" names.
 * 
 * @param {Array} compases Pre-existing measures list (from syncData / Chordify)
 * @param {string} lyricsText Raw or draft song text with [Section] headers
 * @returns {Array} Harmonized measures with accurate section names
 */
export function alignCompasesWithSongSections(compases, lyricsText, fallbackBpm = 100) {
  if (!compases || compases.length === 0 || !lyricsText || typeof lyricsText !== 'string') {
    return compases || [];
  }

  const aligned = alignChordsWithLyrics(lyricsText);
  const lines = aligned.split('\n');
  const lyricsSections = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const headerMatch = trimmed.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*([\d.]+))?\s*\]$/);
    if (headerMatch) {
      const headerName = headerMatch[1].trim();
      const isMetadata = /^(bpm|beats|time|timesignature|metro|letra\s+pendiente.*)$/i.test(headerName);
      if (isMetadata) return;

      const isExplicitSection =
        headerMatch[2] !== undefined ||
        SECTION_KEYWORDS.test(headerName) ||
        !CHORD_REGEX.test(headerName);

      if (isExplicitSection) {
        lyricsSections.push({
          name: headerName,
          time: headerMatch[2] !== undefined ? parseFloat(headerMatch[2]) : null,
        });
      }
    }
  });

  if (lyricsSections.length === 0) return compases;

  // Extract timed sections from lyrics
  const timedSections = lyricsSections.filter((s) => s.time !== null && !isNaN(s.time));

  // Check if compases already has valid non-generic section names
  const compasSections = new Set(compases.map((c) => (c.seccion || '').trim().toLowerCase()));
  const isAllGeneric = compases.every((c) => !c.seccion || c.seccion.toLowerCase() === 'tema');

  // Case A: compases ALREADY has section names matching the lyrics
  // (e.g. compases generated by parseSongTextToGrid, sync wizard, or user edits)
  const matchingLyricsCount = lyricsSections.filter((s) => compasSections.has(s.name.toLowerCase())).length;
  const isAlreadyStructured = !isAllGeneric && (matchingLyricsCount >= Math.min(2, lyricsSections.length));

  if (isAlreadyStructured) {
    if (timedSections.length === 0) return compases;

    const timedMap = new Map();
    timedSections.forEach((s) => timedMap.set(s.name.toLowerCase(), s.time));

    const seenSections = new Set();
    return compases.map((c) => {
      const secKey = (c.seccion || '').trim().toLowerCase();
      if (!seenSections.has(secKey)) {
        seenSections.add(secKey);
        if (timedMap.has(secKey)) {
          const headerTime = timedMap.get(secKey);
          const firstBeat = c.beatTimes?.[0];
          const useBeatTime =
            firstBeat !== undefined &&
            firstBeat !== null &&
            (Math.abs(firstBeat - headerTime) <= 0.15 || c.id === 1);
          return {
            ...c,
            secTime: useBeatTime ? firstBeat : headerTime,
          };
        }
        return c;
      }
      // Non-head compases in this section should not retain stale section head timestamps
      if (c.secTime !== undefined && c.secTime !== null && timedMap.has(secKey)) {
        return {
          ...c,
          secTime: undefined,
        };
      }
      return c;
    });
  }

  // Case B: compases is generic (e.g. from Chordify) and we have timed sections in lyrics
  if (timedSections.length > 0) {
    timedSections.sort((a, b) => a.time - b.time);

    // Build a continuous estimated monotonic time map for each compas index
    const definedTimes = [];
    compases.forEach((c, idx) => {
      const t = c.secTime ?? (c.beatTimes && c.beatTimes.length > 0 ? c.beatTimes[0] : null);
      if (t !== null && t !== undefined && !isNaN(t)) {
        definedTimes.push({ idx, time: parseFloat(t) });
      }
    });

    const compasTimes = new Array(compases.length);
    if (definedTimes.length === 0) {
      const secPerMeasure = (4 * 60) / fallbackBpm;
      for (let i = 0; i < compases.length; i++) {
        compasTimes[i] = i * secPerMeasure;
      }
    } else {
      const firstDef = definedTimes[0];
      const avgSecPerM = definedTimes.length > 1
        ? (definedTimes[definedTimes.length - 1].time - firstDef.time) / Math.max(1, definedTimes[definedTimes.length - 1].idx - firstDef.idx)
        : (4 * 60) / fallbackBpm;

      for (let i = 0; i < firstDef.idx; i++) {
        compasTimes[i] = Math.max(0, firstDef.time - (firstDef.idx - i) * avgSecPerM);
      }
      compasTimes[firstDef.idx] = firstDef.time;

      for (let d = 0; d < definedTimes.length - 1; d++) {
        const cur = definedTimes[d];
        const nxt = definedTimes[d + 1];
        const span = Math.max(1, nxt.idx - cur.idx);
        for (let i = cur.idx; i <= nxt.idx; i++) {
          const ratio = (i - cur.idx) / span;
          compasTimes[i] = cur.time + ratio * (nxt.time - cur.time);
        }
      }

      const lastDef = definedTimes[definedTimes.length - 1];
      for (let i = lastDef.idx; i < compases.length; i++) {
        compasTimes[i] = lastDef.time + (i - lastDef.idx) * avgSecPerM;
      }
    }

    // Find the compas index with minimum distance to each section start time
    const sectionStarts = timedSections.map((sec) => {
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < compases.length; i++) {
        const diff = Math.abs(compasTimes[i] - sec.time);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return { name: sec.name, startIdx: closestIdx, time: sec.time };
    });

    // Ensure monotonically increasing start indices
    for (let i = 1; i < sectionStarts.length; i++) {
      if (sectionStarts[i].startIdx <= sectionStarts[i - 1].startIdx) {
        sectionStarts[i].startIdx = sectionStarts[i - 1].startIdx + 1;
      }
    }

    return compases.map((c, cIdx) => {
      let matchedSec = sectionStarts[0];
      for (let i = 0; i < sectionStarts.length; i++) {
        if (cIdx >= sectionStarts[i].startIdx) {
          matchedSec = sectionStarts[i];
        } else {
          break;
        }
      }
      const isStartOfSection = cIdx === matchedSec.startIdx;
      return {
        ...c,
        seccion: matchedSec.name,
        secTime: isStartOfSection ? matchedSec.time : undefined,
      };
    });
  }

  // Case C: If compases has generic sections but lyrics has real section headers, distribute evenly
  if (lyricsSections.length > 1) {
    const measuresPerSection = Math.ceil(compases.length / lyricsSections.length);
    return compases.map((m, idx) => {
      const secIdx = Math.min(lyricsSections.length - 1, Math.floor(idx / measuresPerSection));
      return {
        ...m,
        seccion: lyricsSections[secIdx].name,
      };
    });
  }

  return compases;
}

/**
 * Formats a list of measures (BeatGrid) back into clean chord text,
 * preserving distinct chord changes on any beat (beat 1, 2, 3, or 4).
 * 
 * @param {Array} compases Measures list
 * @returns {string} Plain text formatted with [Section @ time] and [Chord]
 */
export function formatCompasesToText(compases) {
  if (!compases || !Array.isArray(compases) || compases.length === 0) return '';

  let textOutput = '';
  let lastSection = '';

  let i = 0;
  while (i < compases.length) {
    const compas1 = compases[i];

    // Encabezado de sección
    if (compas1.seccion && compas1.seccion !== lastSection) {
      const timeStr =
        compas1.secTime !== undefined && compas1.secTime !== null
          ? ` @ ${Number(compas1.secTime).toFixed(2)}`
          : '';
      textOutput += `\n[${compas1.seccion}${timeStr}]\n`;
      lastSection = compas1.seccion;
    }

    // Si compas1 es todo silencio
    const isAllRest1 = compas1.acordes.every((ch) => !ch || ch === '𝄾' || ch === '𝄽');
    if (isAllRest1) {
      const restCount = compas1.acordes.length;
      textOutput += `[𝄾 (${restCount}T)]\n`;
      i++;
      continue;
    }

    const compas2 =
      i + 1 < compases.length && compases[i + 1].seccion === compas1.seccion
        ? compases[i + 1]
        : null;

    const lyricText = (compas1.lyric || (compas2 && compas2.lyric) || '').trim();

    if (lyricText) {
      // Caso con letra: Preservar letra con acordes
      const lineBeats = [...compas1.acordes];
      if (compas2) lineBeats.push(...compas2.acordes);
      const totalLineBeats = lineBeats.length;
      const lineChords = [];
      lineBeats.forEach((chord, beatIdx) => {
        if (chord && chord !== '𝄾' && chord !== '𝄽') {
          lineChords.push({ chord, beatIdx });
        }
      });

      if (lineChords.length === 0) {
        textOutput += `${lyricText}\n`;
      } else {
        let rebuiltLine = '';
        let lastCharIdx = 0;
        const cleanLength = lyricText.length;
        let lastChord = '';
        lineChords.forEach((c) => {
          if (c.chord === lastChord) return;
          lastChord = c.chord;
          const divisor = totalLineBeats > 1 ? totalLineBeats - 1 : 1;
          const ratio = c.beatIdx / divisor;
          const charIdx = Math.min(cleanLength, Math.round(ratio * cleanLength));
          rebuiltLine += lyricText.substring(lastCharIdx, charIdx) + `[${c.chord}]`;
          lastCharIdx = charIdx;
        });
        rebuiltLine += lyricText.substring(lastCharIdx);
        textOutput += `${rebuiltLine}\n`;
      }
    } else {
      // Caso A: Línea de solo acordes. Preservar TODOS los cambios de acorde dentro del compás.
      const formatCompasChords = (c) => {
        if (!c || !c.acordes) return '';
        const distinct = [];
        let lastCh = null;
        c.acordes.forEach((ch) => {
          const clean = (ch || '').trim();
          if (!clean) return;
          if (clean !== lastCh) {
            distinct.push(clean);
            lastCh = clean;
          }
        });
        if (distinct.length === 0) return '[𝄾]';
        return distinct.map((ch) => `[${ch}]`).join(' ');
      };

      const str1 = formatCompasChords(compas1);
      const str2 = compas2 ? formatCompasChords(compas2) : '';

      textOutput += str2 ? `${str1}   ${str2}\n` : `${str1}\n`;
    }

    i += compas2 ? 2 : 1;
  }

  return textOutput.trim();
}

/**
 * Extrae el BPM de un texto de canción buscando [BPM @ 120] o [BPM: 120]
 */
export function getSongBpm(text, fallback = 100) {
  if (!text || typeof text !== 'string') return fallback;
  const match = text.match(/\[\s*BPM\s*[@:]?\s*(\d+)\s*\]/i);
  return match ? parseInt(match[1], 10) : fallback;
}

/**
 * Actualiza o inserta la etiqueta [BPM @ newBpm] en el texto de la canción
 */
export function updateTextBpm(text, newBpm) {
  if (!text || typeof text !== 'string') return `[BPM @ ${newBpm}]\n`;
  const cleanBpm = Math.round(newBpm);
  if (/\[\s*BPM\s*[@:]?\s*\d+\s*\]/i.test(text)) {
    return text.replace(/\[\s*BPM\s*[@:]?\s*\d+\s*\]/i, `[BPM @ ${cleanBpm}]`);
  }
  return `[BPM @ ${cleanBpm}]\n${text}`;
}

/**
 * Duplica el tempo (BPM x2) subdividiendo cada compás en dos compases que conservan
 * la métrica original de ese compás (ej: 3/4 -> dos compases de 3/4; 4/4 -> dos compases de 4/4; 6/8 -> dos compases de 6/8).
 * Conserva la duración total y la sincronización temporal exacta de los beatTimes.
 */
export function doubleGridBpm(compases) {
  if (!compases || !Array.isArray(compases)) return [];
  const result = [];
  let nextId = 1;

  for (let i = 0; i < compases.length; i++) {
    const c = compases[i];
    const rawChords = Array.isArray(c.acordes) && c.acordes.length > 0 ? c.acordes : ['𝄾', '𝄾', '𝄾', '𝄾'];
    const measureLen = rawChords.length;
    const times = Array.isArray(c.beatTimes) && c.beatTimes.length > 0 ? c.beatTimes : null;
    const nextCompas = compases[i + 1];

    // Subdividir cada pulso del compás en 2 pulsos (total = 2 * measureLen)
    const subdividedChords = [];
    let lastValidChord = '𝄾';
    for (let b = 0; b < measureLen; b++) {
      const ch = rawChords[b] || lastValidChord || '𝄾';
      if (rawChords[b]) lastValidChord = rawChords[b];
      subdividedChords.push(ch, ch);
    }

    let subdividedTimes = null;
    if (times) {
      subdividedTimes = [];
      const avgBeat =
        times.length >= 2
          ? Math.max(0.05, (times[times.length - 1] - times[0]) / (times.length - 1))
          : 0.5;
      const nextStartTime =
        nextCompas?.beatTimes?.[0] !== undefined && nextCompas.beatTimes[0] > times[times.length - 1]
          ? nextCompas.beatTimes[0]
          : times[times.length - 1] + avgBeat;

      for (let b = 0; b < measureLen; b++) {
        const tCurr =
          b < times.length
            ? times[b]
            : times[times.length - 1] + (b - (times.length - 1)) * avgBeat;
        const tNext =
          b + 1 < measureLen
            ? b + 1 < times.length
              ? times[b + 1]
              : tCurr + avgBeat
            : nextStartTime;

        subdividedTimes.push(
          Number(tCurr.toFixed(2)),
          Number(((tCurr + tNext) / 2).toFixed(2))
        );
      }
    }

    // Compás A: primera mitad (measureLen tiempos)
    const chordsA = subdividedChords.slice(0, measureLen);
    const beatTimesA = subdividedTimes ? subdividedTimes.slice(0, measureLen) : null;

    result.push({
      id: nextId++,
      seccion: c.seccion,
      secTime: c.secTime !== undefined ? c.secTime : null,
      acordes: chordsA,
      ...(beatTimesA ? { beatTimes: beatTimesA } : {}),
      lyric: c.lyric || undefined,
    });

    // Compás B: segunda mitad (measureLen tiempos)
    const chordsB = subdividedChords.slice(measureLen, measureLen * 2);
    const beatTimesB = subdividedTimes ? subdividedTimes.slice(measureLen, measureLen * 2) : null;

    result.push({
      id: nextId++,
      seccion: c.seccion,
      secTime: null,
      acordes: chordsB,
      ...(beatTimesB ? { beatTimes: beatTimesB } : {}),
    });
  }

  return result;
}

/**
 * Divide el tempo a la mitad (BPM ÷2) fusionando compases consecutivos de a pares
 * dentro de la misma sección y métrica (ej: dos compases de 3/4 -> 1 compás de 3/4; dos de 4/4 -> 1 de 4/4).
 */
export function halveGridBpm(compases) {
  if (!compases || !Array.isArray(compases)) return [];
  const result = [];
  let nextId = 1;

  let i = 0;
  while (i < compases.length) {
    const cA = compases[i];
    const cB = compases[i + 1];

    const lenA = cA?.acordes?.length || 4;
    const lenB = cB?.acordes?.length || 4;
    const sameSection = cB && (cA.seccion || '') === (cB.seccion || '');
    const sameMeter = cB && lenA === lenB;

    if (!cB || !sameSection || !sameMeter) {
      result.push({ ...cA, id: nextId++ });
      i += 1;
      continue;
    }

    const combinedChords = [...(cA.acordes || []), ...(cB.acordes || [])];
    const mergedChords = [];
    for (let k = 0; k < lenA; k++) {
      const evenIdx = k * 2;
      const picked =
        combinedChords[evenIdx] ||
        combinedChords[Math.max(0, evenIdx - 1)] ||
        combinedChords[0] ||
        '𝄾';
      mergedChords.push(picked);
    }

    let mergedBeatTimes = null;
    if (Array.isArray(cA.beatTimes) && Array.isArray(cB.beatTimes)) {
      const combinedTimes = [...cA.beatTimes, ...cB.beatTimes];
      mergedBeatTimes = [];
      for (let k = 0; k < lenA; k++) {
        const evenIdx = k * 2;
        const t =
          combinedTimes[evenIdx] ??
          combinedTimes[Math.min(combinedTimes.length - 1, Math.max(0, evenIdx - 1))];
        if (t !== undefined) mergedBeatTimes.push(t);
      }
    }

    result.push({
      id: nextId++,
      seccion: cA.seccion,
      secTime: cA.secTime !== undefined ? cA.secTime : null,
      acordes: mergedChords,
      ...(mergedBeatTimes && mergedBeatTimes.length === lenA ? { beatTimes: mergedBeatTimes } : {}),
      lyric: cA.lyric || cB.lyric || undefined,
    });

    i += 2;
  }

  return result;
}

/**
 * Modifica la duración (cantidad de pulsos / métrica) según el alcance indicado:
 * - 'single' (o boolean true): Cambia solo `targetMeasureIdx` a `newLength` y desplaza los pulsos siguientes (Ripple Shift), conservando la métrica propia de cada compás posterior.
 * - 'isolated' (o boolean false): Ajusta únicamente `targetMeasureIdx` sin desplazar los siguientes compases.
 * - 'section': Reagrupa todos los pulsos de la sección actual (desde `targetMeasureIdx` hasta el fin de esa sección) en compases de `newLength` tiempos, manteniendo intactas las demás secciones.
 * - 'from_here': Reagrupa todos los pulsos desde `targetMeasureIdx` hasta el final de la canción en compases de `newLength` tiempos, preservando las fronteras de sección.
 * - 'all': Reagrupa toda la canción desde el compás 1 en compases de `newLength` tiempos, preservando las secciones y sus timestamps.
 *
 * @param {Array} compases Array de compases [{ id, acordes, beatTimes, seccion, secTime }]
 * @param {number} targetMeasureIdx Índice del compás de referencia (0-based)
 * @param {number} newLength Cantidad de pulsos deseada (ej: 3 para 3/4, 4 para 4/4, 2 para 2/4, 6 para 6/8)
 * @param {string|boolean} scope Alcance: 'single' | 'section' | 'from_here' | 'all' | 'isolated' | boolean
 * @returns {Array} Nuevo array de compases actualizado
 */
export function rippleShiftCompases(compases, targetMeasureIdx, newLength, scope = 'single') {
  if (!compases || !Array.isArray(compases) || compases.length === 0) return [];
  if (!newLength || newLength < 1) return compases;

  const effectiveScope =
    scope === true ? 'single' : scope === false ? 'isolated' : scope || 'single';

  const startIdx = effectiveScope === 'all' ? 0 : targetMeasureIdx;
  if (startIdx < 0 || startIdx >= compases.length) return compases;

  // Caso 0: Ajuste aislado de un único compás sin desplazar el resto
  if (effectiveScope === 'isolated') {
    return compases.map((m, idx) => {
      if (idx !== targetMeasureIdx) return m;
      const chords = [...(m.acordes || [])];
      while (chords.length < newLength) chords.push(chords[chords.length - 1] || '𝄾');
      const newAcordes = chords.slice(0, newLength);

      let newTimes = undefined;
      if (Array.isArray(m.beatTimes) && m.beatTimes.length > 0) {
        const times = [...m.beatTimes];
        const avgDiff =
          times.length >= 2 ? Math.max(0.05, times[times.length - 1] - times[times.length - 2]) : 0.5;
        while (times.length < newLength) {
          times.push(Number((times[times.length - 1] + avgDiff).toFixed(2)));
        }
        newTimes = times.slice(0, newLength);
      }

      return {
        ...m,
        acordes: newAcordes,
        ...(newTimes ? { beatTimes: newTimes } : {}),
      };
    });
  }

  // Determinar el rango de compases [startIdx .. endIdx] a procesar
  let endIdx = compases.length - 1;
  if (effectiveScope === 'section') {
    const targetSec = (compases[startIdx].seccion || 'Tema').trim();
    endIdx = startIdx;
    while (
      endIdx + 1 < compases.length &&
      (compases[endIdx + 1].seccion || 'Tema').trim() === targetSec
    ) {
      endIdx++;
    }
  }

  const prefixMeasures = compases.slice(0, startIdx).map((c) => ({
    ...c,
    acordes: [...(c.acordes || [])],
    beatTimes: Array.isArray(c.beatTimes) ? [...c.beatTimes] : undefined,
  }));

  const suffixMeasures = compases.slice(endIdx + 1).map((c) => ({
    ...c,
    acordes: [...(c.acordes || [])],
    beatTimes: Array.isArray(c.beatTimes) ? [...c.beatTimes] : undefined,
  }));

  // Recolectar todos los pulsos en el rango [startIdx .. endIdx]
  const pulses = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const c = compases[i];
    const len = (c.acordes || []).length || 4;
    const isSecHead =
      i === 0 || (c.seccion || 'Tema').trim() !== (compases[i - 1]?.seccion || 'Tema').trim();

    for (let b = 0; b < len; b++) {
      pulses.push({
        chord: c.acordes[b] || '𝄾',
        time: Array.isArray(c.beatTimes) ? c.beatTimes[b] : undefined,
        seccion: c.seccion || 'Tema',
        isSecHead: b === 0 && isSecHead,
        secTime: b === 0 && isSecHead ? c.secTime : undefined,
        lyric: b === 0 ? c.lyric : undefined,
      });
    }
  }

  if (pulses.length === 0) return compases;

  // Estimar duración promedio de pulso para extrapolación si el último compás requiere relleno
  let avgBeatDuration = 0.5;
  const validTimes = pulses.map((p) => p.time).filter((t) => t !== undefined && t !== null);
  if (validTimes.length >= 2) {
    avgBeatDuration = Math.max(
      0.05,
      (validTimes[validTimes.length - 1] - validTimes[0]) / (validTimes.length - 1)
    );
  }

  const hasAnyTimes = validTimes.length > 0;
  const rebuiltMiddle = [];

  if (effectiveScope === 'single') {
    // 'single': solo el compás targetMeasureIdx cambia a newLength; los siguientes conservan sus longitudes individuales
    const desiredLengths = [newLength];
    for (let i = startIdx + 1; i <= endIdx; i++) {
      desiredLengths.push((compases[i].acordes || []).length || 4);
    }

    let pulseIdx = 0;
    for (let d = 0; d < desiredLengths.length; d++) {
      const origMeasure = compases[startIdx + d];
      const reqLen = desiredLengths[d];
      const newAcordes = [];
      const newBeatTimes = hasAnyTimes ? [] : undefined;

      for (let b = 0; b < reqLen; b++) {
        if (pulseIdx < pulses.length) {
          newAcordes.push(pulses[pulseIdx].chord);
          if (newBeatTimes && pulses[pulseIdx].time !== undefined) {
            newBeatTimes.push(pulses[pulseIdx].time);
          }
          pulseIdx++;
        } else {
          const fallbackChord = newAcordes[newAcordes.length - 1] || '𝄾';
          newAcordes.push(fallbackChord);
          if (newBeatTimes) {
            const prevTime =
              newBeatTimes[newBeatTimes.length - 1] ??
              rebuiltMiddle[rebuiltMiddle.length - 1]?.beatTimes?.slice(-1)[0] ??
              origMeasure.secTime ??
              0;
            newBeatTimes.push(Number((prevTime + avgBeatDuration).toFixed(2)));
          }
        }
      }

      const isSecHead =
        startIdx + d === 0 ||
        (origMeasure.seccion || 'Tema').trim() !==
          ((d === 0 ? prefixMeasures[prefixMeasures.length - 1] : rebuiltMiddle[d - 1])?.seccion ||
            'Tema').trim();

      const updatedSecTime = isSecHead
        ? newBeatTimes && newBeatTimes.length > 0
          ? newBeatTimes[0]
          : origMeasure.secTime
        : undefined;

      rebuiltMiddle.push({
        ...origMeasure,
        acordes: newAcordes,
        ...(newBeatTimes && newBeatTimes.length > 0 ? { beatTimes: newBeatTimes } : {}),
        secTime: updatedSecTime,
      });
    }

    // Si sobraron pulsos al final (cuando newLength < oldLength), agregar compases extra para no perder pulsos
    const tailLen = desiredLengths[desiredLengths.length - 1] || newLength;
    const lastSec = rebuiltMiddle[rebuiltMiddle.length - 1]?.seccion || 'Tema';
    while (pulseIdx < pulses.length) {
      const newAcordes = [];
      const newBeatTimes = hasAnyTimes ? [] : undefined;
      for (let b = 0; b < tailLen; b++) {
        if (pulseIdx < pulses.length) {
          newAcordes.push(pulses[pulseIdx].chord);
          if (newBeatTimes && pulses[pulseIdx].time !== undefined) {
            newBeatTimes.push(pulses[pulseIdx].time);
          }
          pulseIdx++;
        } else {
          const fallbackChord = newAcordes[newAcordes.length - 1] || '𝄾';
          newAcordes.push(fallbackChord);
          if (newBeatTimes) {
            const prevTime = newBeatTimes[newBeatTimes.length - 1] ?? 0;
            newBeatTimes.push(Number((prevTime + avgBeatDuration).toFixed(2)));
          }
        }
      }
      rebuiltMiddle.push({
        id: 0,
        seccion: lastSec,
        acordes: newAcordes,
        ...(newBeatTimes && newBeatTimes.length > 0 ? { beatTimes: newBeatTimes } : {}),
        secTime: undefined,
      });
    }
  } else {
    // 'section' | 'from_here' | 'all': reagrupar todos los pulsos del rango en compases de `newLength` tiempos
    let pulseIdx = 0;
    let prevSectionName =
      prefixMeasures.length > 0
        ? (prefixMeasures[prefixMeasures.length - 1].seccion || 'Tema').trim()
        : null;

    while (pulseIdx < pulses.length) {
      const chunk = pulses.slice(pulseIdx, pulseIdx + newLength);
      pulseIdx += newLength;

      const newAcordes = chunk.map((p) => p.chord);
      const newBeatTimes = hasAnyTimes
        ? chunk.map((p) => p.time).filter((t) => t !== undefined)
        : undefined;

      while (newAcordes.length < newLength) {
        newAcordes.push(newAcordes[newAcordes.length - 1] || '𝄾');
      }
      if (newBeatTimes && newBeatTimes.length > 0) {
        while (newBeatTimes.length < newLength) {
          const prevTime = newBeatTimes[newBeatTimes.length - 1];
          newBeatTimes.push(Number((prevTime + avgBeatDuration).toFixed(2)));
        }
      }

      // Si dentro de este grupo de pulsos comienza una nueva sección, adoptar esa sección
      const secHeadPulse = chunk.find((p) => p.isSecHead);
      const measureSection = secHeadPulse ? secHeadPulse.seccion : chunk[0].seccion;
      const normMeasureSec = (measureSection || 'Tema').trim();
      const isStartOfSec = prevSectionName === null || normMeasureSec !== prevSectionName;
      prevSectionName = normMeasureSec;

      const measureSecTime = isStartOfSec
        ? newBeatTimes && newBeatTimes.length > 0
          ? newBeatTimes[0]
          : secHeadPulse?.secTime ?? chunk[0]?.secTime
        : undefined;

      const measureLyric = chunk.map((p) => p.lyric).filter(Boolean).join(' ') || undefined;

      rebuiltMiddle.push({
        id: 0,
        seccion: measureSection,
        acordes: newAcordes,
        ...(newBeatTimes && newBeatTimes.length > 0 ? { beatTimes: newBeatTimes } : {}),
        ...(measureSecTime !== undefined ? { secTime: measureSecTime } : {}),
        ...(measureLyric ? { lyric: measureLyric } : {}),
      });
    }
  }

  const combined = [...prefixMeasures, ...rebuiltMiddle, ...suffixMeasures];
  return combined.map((m, idx) => ({
    ...m,
    id: idx + 1,
  }));
}




