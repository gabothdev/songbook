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
      compases.push({
        id: measureCounter++,
        seccion: currentSection,
        acordes: lineBeats.slice(0, beatsPerMeasure),
        secTime: sectionStartTime,
        lyric: trimmedLine.replace(/\[.*?\]/g, '').trim()
      });
      sectionStartTime = null;

      // Compás 2 (tiempos 4 a 7)
      compases.push({
        id: measureCounter++,
        seccion: currentSection,
        acordes: lineBeats.slice(beatsPerMeasure, totalBeatsForLine),
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
export function alignCompasesWithSongSections(compases, lyricsText) {
  if (!compases || compases.length === 0 || !lyricsText || typeof lyricsText !== 'string') {
    return compases;
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
      const isMetadata = /^(bpm|beats|time|timesignature|metro)$/i.test(headerName);
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

  // Check if compases already has valid sections matching the lyrics
  const compasSections = new Set(compases.map((c) => (c.seccion || '').trim().toLowerCase()));
  const lyricsSectionNames = lyricsSections.map((s) => s.name.trim().toLowerCase());
  const hasMatchingSections = lyricsSectionNames.every((name) => compasSections.has(name));
  const isAllGeneric = compases.every((c) => !c.seccion || c.seccion === 'Tema');

  // If compases already has these sections, preserve existing assignment!
  if (hasMatchingSections && !isAllGeneric) {
    return compases;
  }

  // 1. If lyrics sections have explicit timestamps (@ 12.5s), map to the closest compas
  const timedSections = lyricsSections.filter((s) => s.time !== null && !isNaN(s.time));

  if (timedSections.length > 0) {
    timedSections.sort((a, b) => a.time - b.time);

    // Find the compas index with minimum distance to each section start time
    const sectionStarts = timedSections.map((sec) => {
      let closestIdx = 0;
      let minDiff = Infinity;
      compases.forEach((c, cIdx) => {
        const cTime = c.secTime ?? (c.beatTimes && c.beatTimes.length > 0 ? c.beatTimes[0] : null);
        if (cTime !== null && cTime !== undefined) {
          const diff = Math.abs(cTime - sec.time);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = cIdx;
          }
        }
      });
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
      return {
        ...c,
        seccion: matchedSec.name,
      };
    });
  }

  // 2. If compases has generic sections but lyrics has real section headers, distribute evenly
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
 * Duplica el tempo (BPM x2) subdividiendo cada compás en dos compases de 4 tiempos.
 * Conserva la duración total y la sincronización temporal exacta de los beatTimes.
 */
export function doubleGridBpm(compases) {
  if (!compases || !Array.isArray(compases)) return [];
  const result = [];
  let nextId = 1;

  for (let i = 0; i < compases.length; i++) {
    const c = compases[i];
    const chords = c.acordes || ['𝄾', '𝄾', '𝄾', '𝄾'];
    const times = c.beatTimes;
    const nextCompas = compases[i + 1];
    const nextStartTime = nextCompas?.beatTimes?.[0] ?? (times && times.length >= 2 ? times[times.length - 1] + (times[times.length - 1] - times[0]) / 3 : null);

    // Compás A: primeros dos tiempos expandidos a 4 tiempos
    const chordsA = [
      chords[0] || '𝄾',
      chords[0] || '𝄾',
      chords[1] || chords[0] || '𝄾',
      chords[1] || chords[0] || '𝄾'
    ];

    let beatTimesA = null;
    if (Array.isArray(times) && times.length >= 4) {
      const t0 = times[0];
      const t1 = times[1];
      const t2 = times[2];
      beatTimesA = [
        Number(t0.toFixed(2)),
        Number(((t0 + t1) / 2).toFixed(2)),
        Number(t1.toFixed(2)),
        Number(((t1 + t2) / 2).toFixed(2))
      ];
    }

    result.push({
      id: nextId++,
      seccion: c.seccion,
      secTime: c.secTime !== undefined ? c.secTime : null,
      acordes: chordsA,
      ...(beatTimesA ? { beatTimes: beatTimesA } : {}),
      lyric: c.lyric || undefined
    });

    // Compás B: últimos dos tiempos expandidos a 4 tiempos
    const chordsB = [
      chords[2] || chords[1] || '𝄾',
      chords[2] || chords[1] || '𝄾',
      chords[3] || chords[2] || '𝄾',
      chords[3] || chords[2] || '𝄾'
    ];

    let beatTimesB = null;
    if (Array.isArray(times) && times.length >= 4) {
      const t2 = times[2];
      const t3 = times[3];
      const tNext = nextStartTime ?? (t3 + (t3 - t2));
      beatTimesB = [
        Number(t2.toFixed(2)),
        Number(((t2 + t3) / 2).toFixed(2)),
        Number(t3.toFixed(2)),
        Number(((t3 + tNext) / 2).toFixed(2))
      ];
    }

    result.push({
      id: nextId++,
      seccion: c.seccion,
      secTime: null,
      acordes: chordsB,
      ...(beatTimesB ? { beatTimes: beatTimesB } : {})
    });
  }

  return result;
}

/**
 * Divide el tempo a la mitad (BPM ÷2) fusionando compases consecutivos de a pares en 1 compás de 4 tiempos.
 */
export function halveGridBpm(compases) {
  if (!compases || !Array.isArray(compases)) return [];
  const result = [];
  let nextId = 1;

  for (let i = 0; i < compases.length; i += 2) {
    const cA = compases[i];
    const cB = compases[i + 1];

    if (!cB) {
      result.push({ ...cA, id: nextId++ });
      break;
    }

    const chordsA = cA.acordes || [];
    const chordsB = cB.acordes || [];
    const mergedChords = [
      chordsA[0] || '𝄾',
      chordsA[2] || chordsA[1] || chordsA[0] || '𝄾',
      chordsB[0] || '𝄾',
      chordsB[2] || chordsB[1] || chordsB[0] || '𝄾'
    ];

    let mergedBeatTimes = null;
    if (cA.beatTimes && cB.beatTimes) {
      mergedBeatTimes = [
        cA.beatTimes[0],
        cA.beatTimes[2] ?? cA.beatTimes[1],
        cB.beatTimes[0],
        cB.beatTimes[2] ?? cB.beatTimes[1]
      ];
    }

    result.push({
      id: nextId++,
      seccion: cA.seccion,
      secTime: cA.secTime !== undefined ? cA.secTime : null,
      acordes: mergedChords,
      ...(mergedBeatTimes ? { beatTimes: mergedBeatTimes } : {}),
      lyric: cA.lyric || cB.lyric || undefined
    });
  }

  return result;
}


