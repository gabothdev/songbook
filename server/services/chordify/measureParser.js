/**
 * Normaliza un nombre de acorde crudo de Chordify (ej: "D:min" -> "Dm", "N" -> "𝄾").
 */
export function normalizeChord(chord) {
  if (!chord || chord === 'N' || chord === 'none') return '𝄾';
  let c = chord.trim();

  // 1. Colon replacements from Chordify (e.g. E:maj -> E, E:min -> Em, E:maj7 -> Emaj7)
  c = c
    .replace(/:min/gi, 'm')
    .replace(/:maj(?=\/|$)/gi, '')
    .replace(/:maj/gi, 'maj')
    .replace(/:/g, '');

  // 2. Pure major triad simplification (e.g. Emaj/Ab -> E/Ab, Emaj -> E, while preserving Emaj7, Emaj9)
  c = c.replace(/^([A-G][b#]?)maj(?!\d)(\/[A-G][b#]?)?$/i, (match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  c = c.replace(/^([A-G][b#]?)major(?!\d)(\/[A-G][b#]?)?$/i, (match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  return c;
}

/**
 * Construye segmentos crudos { chord, text } a partir de lyricLine.lyrics y lyricLine.chords
 */
export function buildRawLyricSegments(lyrics = '', chordsList = []) {
  const segments = [];
  let lyricIndex = 0;
  let pendingChord = null;
  let textBuffer = '';

  for (const item of chordsList) {
    if (item.chord) {
      const norm = normalizeChord(item.chord);
      if (!norm || norm === '𝄾' || norm === '𝄽') {
        continue;
      }
      if (pendingChord !== null || textBuffer.length > 0) {
        segments.push({ chord: pendingChord, text: textBuffer });
        textBuffer = '';
      }
      pendingChord = norm;
    } else if (item.step !== undefined) {
      const stepVal = item.step;
      textBuffer += lyrics.substring(lyricIndex, lyricIndex + stepVal);
      lyricIndex += stepVal;
    }
  }

  if (lyricIndex < lyrics.length) {
    textBuffer += lyrics.substring(lyricIndex);
  }

  if (pendingChord !== null || textBuffer.length > 0) {
    segments.push({ chord: pendingChord, text: textBuffer });
  }

  return segments;
}

function getSegmentWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean);
}

function getLeadingSpacesCount(text) {
  const m = (text || '').match(/^\s*/);
  return m ? m[0].length : 0;
}

function isMultiSpaceOrEmptySegment(seg) {
  if (!seg) return false;
  const words = getSegmentWords(seg.text);
  const lead = getLeadingSpacesCount(seg.text);
  return lead >= 2 || (Boolean(seg.chord) && words.length === 0);
}

/**
 * Formatea una secuencia de segmentos vocales limpiando espacios múltiples artificiales
 * y asegurando que cada acorde quede anclado sobre su palabra sin desfasajes.
 */
export function formatVocalSegments(rawSegs) {
  if (!rawSegs || rawSegs.length === 0) return '';
  const cleaned = rawSegs.map((s) => ({
    chord: s.chord,
    text: (s.text || '').replace(/\s{2,}/g, ' '),
  }));

  for (let i = 0; i < cleaned.length; i++) {
    const curr = cleaned[i];
    if (curr.chord && curr.text.trim().length > 0 && curr.text.startsWith(' ')) {
      curr.text = curr.text.replace(/^\s+/, '');
      if (i > 0 && cleaned[i - 1].text.length > 0 && !cleaned[i - 1].text.endsWith(' ')) {
        cleaned[i - 1].text += ' ';
      }
    } else if (i === 0 && !curr.chord && curr.text.startsWith(' ')) {
      curr.text = curr.text.replace(/^\s+/, '');
    }
  }

  return cleaned
    .map((s) => `${s.chord ? `[${s.chord}]` : ''}${s.text}`)
    .join('')
    .trim();
}

/**
 * Separa acordes instrumentales infiltrados sobre espacios múltiples en una lyricLine de Chordify
 * respecto de los acordes vocales reales cantados sobre palabras.
 */
export function sanitizeLyricLineSegments(
  rawSegments,
  { isFirstContentOfSection = false, lastChordGlobal = null } = {}
) {
  const segments = (rawSegments || []).map((s) => ({ ...s }));
  const leadingInstrumentalChords = [];
  const trailingInstrumentalChords = [];
  let droppedCarryoverChord = null;

  // Caso 1A: Riff instrumental al inicio de la línea con palabras sueltas de ASR intercaladas en huecos de >= 2 espacios
  // Ej: "I [F]  [Dm]   took [F]  all of his money..." o "Yeah, [Dm]   my [F]  shot of rain..."
  if (segments.length >= 2) {
    let startChordIdx = 0;
    if (segments[0].chord === null && getSegmentWords(segments[0].text).length <= 1) {
      startChordIdx = 1;
    }

    if (startChordIdx < segments.length && segments[startChordIdx]?.chord) {
      let k = startChordIdx;
      while (
        k < segments.length &&
        segments[k].chord &&
        isMultiSpaceOrEmptySegment(segments[k]) &&
        getSegmentWords(segments[k].text).length <= 1
      ) {
        k++;
      }

      if (
        k > startChordIdx &&
        k < segments.length &&
        segments[k].chord &&
        getLeadingSpacesCount(segments[k].text) >= 2 &&
        getSegmentWords(segments[k].text).length >= 2
      ) {
        for (let i = 0; i <= k; i++) {
          if (segments[i].chord) {
            leadingInstrumentalChords.push(segments[i].chord);
          }
        }
        const prefixWords = segments
          .slice(0, k)
          .map((s) => (s.text || '').trim())
          .filter(Boolean)
          .join(' ');
        const mainText = (segments[k].text || '').trimStart();
        segments[k] = {
          chord: segments[k].chord,
          text: prefixWords ? `${prefixWords} ${mainText}` : mainText,
        };
        segments.splice(0, k);
      }
    }
  }

  // Caso 1B: Acordes instrumentales o de arrastre (carryover bleed) al inicio de la línea sobre espacios iniciales
  if (leadingInstrumentalChords.length === 0) {
    while (segments.length > 1 && segments[0].chord !== null) {
      const s0 = segments[0];
      const words0 = getSegmentWords(s0.text);
      const lead0 = getLeadingSpacesCount(s0.text);

      if (words0.length === 0) {
        segments.shift();
        if (
          isFirstContentOfSection &&
          leadingInstrumentalChords.length === 0 &&
          !droppedCarryoverChord &&
          lastChordGlobal &&
          s0.chord === lastChordGlobal
        ) {
          droppedCarryoverChord = s0.chord;
        } else {
          leadingInstrumentalChords.push(s0.chord);
        }
      } else if (words0.length === 1 && lead0 >= 3 && segments[1]?.chord !== null) {
        if (
          isFirstContentOfSection &&
          leadingInstrumentalChords.length === 0 &&
          !droppedCarryoverChord &&
          lastChordGlobal &&
          s0.chord === lastChordGlobal
        ) {
          droppedCarryoverChord = s0.chord;
        } else {
          leadingInstrumentalChords.push(s0.chord);
        }
        segments[0] = { chord: null, text: (s0.text || '').trimStart() };
        break;
      } else {
        break;
      }
    }
  }

  // Caso 2: Acordes instrumentales al final de la línea (sobre huecos de >= 2 espacios o sin texto)
  // Ej: "...brought it home to [Dm]   [Bb]   my..." o "...walk alone.[Fm][Ab][Eb][Bb]"
  if (segments.length >= 2) {
    let tailStart = segments.length;
    const lastIdx = segments.length - 1;
    const lastSeg = segments[lastIdx];
    const lastWords = getSegmentWords(lastSeg.text);

    if (
      lastSeg.chord !== null &&
      isMultiSpaceOrEmptySegment(lastSeg) &&
      lastWords.length <= 1
    ) {
      tailStart = lastIdx;
      while (
        tailStart - 1 >= 1 &&
        segments[tailStart - 1].chord !== null &&
        getSegmentWords(segments[tailStart - 1].text).length === 0
      ) {
        tailStart--;
      }
    }

    const tailCount = segments.length - tailStart;
    const hasVocalBeforeTail = segments
      .slice(0, tailStart)
      .some((s) => getSegmentWords(s.text).length > 0);

    if (tailCount >= 2 && hasVocalBeforeTail) {
      const tailSegs = segments.splice(tailStart, tailCount);
      tailSegs.forEach((ts) => {
        if (ts.chord) trailingInstrumentalChords.push(ts.chord);
      });
      const trailingWord = (tailSegs[tailSegs.length - 1]?.text || '').trim();
      if (trailingWord && segments.length > 0) {
        const prev = segments[segments.length - 1];
        const prevClean = (prev.text || '').replace(/\s+$/, '');
        prev.text = prevClean ? `${prevClean} ${trailingWord}` : trailingWord;
      }
    }
  }

  // Caso 3: Interludios instrumentales puros en mitad de línea (>= 2 acordes sin palabras entre frases vocales)
  const bodyLines = [];
  let chunkStart = 0;
  let idx = 0;
  while (idx < segments.length) {
    if (segments[idx].chord !== null && getSegmentWords(segments[idx].text).length === 0) {
      let runEnd = idx;
      while (
        runEnd + 1 < segments.length &&
        segments[runEnd + 1].chord !== null &&
        getSegmentWords(segments[runEnd + 1].text).length === 0
      ) {
        runEnd++;
      }
      const runLen = runEnd - idx + 1;
      const beforeSegs = segments.slice(chunkStart, idx);
      const afterSegs = segments.slice(runEnd + 1);
      const hasWordsBefore = beforeSegs.some((s) => getSegmentWords(s.text).length > 0);
      const hasWordsAfter = afterSegs.some((s) => getSegmentWords(s.text).length >= 2);

      if (runLen >= 2 && hasWordsBefore && hasWordsAfter) {
        const vocalBefore = formatVocalSegments(beforeSegs);
        if (vocalBefore) {
          bodyLines.push({ kind: 'lyrics', text: vocalBefore });
        }
        const instChords = segments
          .slice(idx, runEnd + 1)
          .map((s) => s.chord)
          .filter(Boolean);
        bodyLines.push({
          kind: 'chords',
          chords: instChords,
          text: instChords.map((ch) => `[${ch}]`).join('   '),
        });
        chunkStart = runEnd + 1;
        idx = runEnd + 1;
        continue;
      }
    }
    idx++;
  }

  if (chunkStart < segments.length) {
    const remainingSegs = segments.slice(chunkStart);
    const hasAnyWords = remainingSegs.some((s) => getSegmentWords(s.text).length > 0);
    if (hasAnyWords) {
      const vocalText = formatVocalSegments(remainingSegs);
      if (vocalText) {
        bodyLines.push({ kind: 'lyrics', text: vocalText });
      }
    } else {
      const onlyChords = remainingSegs.map((s) => s.chord).filter(Boolean);
      if (onlyChords.length > 0) {
        bodyLines.push({
          kind: 'chords',
          chords: onlyChords,
          text: onlyChords.map((ch) => `[${ch}]`).join('   '),
        });
      }
    }
  }

  // Determinar primer acorde conservado y último acorde de toda la línea
  const firstKeptChord =
    leadingInstrumentalChords[0] ||
    segments.find((s) => s.chord && s.chord !== '𝄾' && s.chord !== '𝄽')?.chord ||
    trailingInstrumentalChords[0] ||
    null;

  const allLineChords = [
    ...leadingInstrumentalChords,
    ...segments.map((s) => s.chord).filter(Boolean),
    ...trailingInstrumentalChords,
  ].filter((ch) => ch && ch !== '𝄾' && ch !== '𝄽');

  const lastChordInLine = allLineChords.length > 0 ? allLineChords[allLineChords.length - 1] : null;

  const summaryParts = [];
  if (leadingInstrumentalChords.length > 0) {
    summaryParts.push(leadingInstrumentalChords.map((ch) => `[${ch}]`).join('   '));
  }
  bodyLines.forEach((bl) => {
    if (bl.text) summaryParts.push(bl.text);
  });
  if (trailingInstrumentalChords.length > 0) {
    summaryParts.push(trailingInstrumentalChords.map((ch) => `[${ch}]`).join('   '));
  }

  return {
    leadingInstrumentalChords,
    bodyLines,
    trailingInstrumentalChords,
    droppedCarryoverChord,
    firstKeptChord,
    lastChordInLine,
    debugSummaryText: summaryParts.join('\n'),
  };
}

/**
 * Parsea la estructura musical y lírica de Chordify en compases (para BeatGrid) y leadSheetText (para SongSheetView).
 * Conserva los compases iniciales completos de silencio ("N" -> "𝄾") desde el primer downbeat (beatNum === 1)
 * para que el BeatGrid muestre el silencio inicial real de la canción, mientras los omite del leadSheetText.
 */
export function parseChordifyMeasuresAndLyrics(chordsData, options = {}) {
  const { fallbackTitle = null, fallbackArtist = null } = options;

  const chordsObj = chordsData?.chords?.value || chordsData?.chords || {};
  let songTitle =
    chordsData?.title ||
    chordsObj?.title ||
    chordsData?.meta?.title ||
    chordsData?.track?.title ||
    null;
  let songArtist =
    chordsData?.artist ||
    chordsObj?.artist ||
    chordsData?.meta?.artist ||
    chordsData?.track?.artist ||
    null;

  if (songTitle && /^chordify$/i.test(songTitle.trim())) {
    songTitle = null;
  }

  if (!songTitle && fallbackTitle) songTitle = fallbackTitle;
  if (!songArtist && fallbackArtist) songArtist = fallbackArtist;

  const bpm = chordsObj?.chordInfo?.derivedBpm || chordsObj?.bpm || chordsData?.bpm || 120;
  const key = chordsObj?.chordInfo?.derivedKey || chordsObj?.key || chordsData?.key || 'C:maj';
  const normalizedKey = normalizeChord(key);
  const barLength = chordsObj?.barLength || chordsObj?.chordInfo?.barLength || 4;
  const chordsStr = chordsObj?.chords || '';

  if (!chordsStr) {
    throw new Error('La cadena de acordes de Chordify está vacía.');
  }

  // 1. Parsear la cadena de acordes crudos: "beatNum;chord;startTime;endTime"
  const lines = chordsStr.split(/\r?\n/).filter((l) => l.trim() !== '');
  const beats = lines.map((line) => {
    const parts = line.split(';');
    return {
      beatNum: parseInt(parts[0], 10),
      rawChord: parts[1] || 'N',
      chord: normalizeChord(parts[1] || 'N'),
      startTime: parseFloat(parts[2] || '0'),
      endTime: parseFloat(parts[3] || '0'),
    };
  });

  // 2. Agrupar en compases conservando los compases completos de silencio inicial ("N" -> "𝄾")
  // desde el primer downbeat (beatNum === 1), descartando únicamente micro-pulsos incompletos previos al primer 1.
  const firstChordIdx = beats.findIndex((b) => b.chord !== '𝄾' && b.chord !== '𝄽');
  const firstBarIdx = beats.findIndex((b) => b.beatNum === 1);
  const rawMeasures = [];
  let droppedPreRollBeats = [];
  let keptPickupBeats = [];

  if (firstChordIdx > 0) {
    if (firstBarIdx !== -1 && firstBarIdx <= firstChordIdx) {
      // Si antes del primer beatNum === 1 hubiera acordes musicales reales (anacrusa), conservarlos
      if (firstBarIdx > 0) {
        const preBarBeats = beats.slice(0, firstBarIdx);
        const hasPreBarMusic = preBarBeats.some(
          (b) => b.chord && b.chord !== '𝄾' && b.chord !== '𝄽' && b.chord !== 'N' && b.chord !== 'none'
        );
        if (hasPreBarMusic) {
          rawMeasures.push(preBarBeats);
          keptPickupBeats = preBarBeats;
        } else {
          droppedPreRollBeats = preBarBeats;
        }
      }
      // Conservar desde el primer downbeat (beatNum === 1) todos los compases de 4 tiempos (incluyendo los de silencio 𝄾)
      const songBeats = beats.slice(firstBarIdx);
      for (let i = 0; i < songBeats.length; i += barLength) {
        rawMeasures.push(songBeats.slice(i, i + barLength));
      }
    } else {
      // Si el primer acorde musical ocurre antes del primer beatNum === 1
      droppedPreRollBeats = beats.slice(0, firstChordIdx);
      const songBeats = beats.slice(firstChordIdx);
      for (let i = 0; i < songBeats.length; i += barLength) {
        rawMeasures.push(songBeats.slice(i, i + barLength));
      }
    }
  } else {
    for (let i = 0; i < beats.length; i += barLength) {
      rawMeasures.push(beats.slice(i, i + barLength));
    }
  }

  // 3. Reconstruir leadSheet si existe y extraer secciones canónicas
  let leadSheetText = null;
  const leadSections = [];
  const rawSectionsStructured = [];
  const leadSheet = chordsData?.leadSheet;

  if (leadSheet && leadSheet.data && leadSheet.data.value) {
    try {
      const sections = leadSheet.data.value;
      let textOutput = '';
      let lastChordGlobal = null;

      sections.forEach((section) => {
        const title = section.title || 'Sección';
        const firstContent = section.content && section.content[0];
        let secTimeVal = firstContent ? parseFloat((firstContent.start / 1000).toFixed(2)) : 0;

        const secDebugLines = [];
        const emittedLines = []; // { kind: 'chords' | 'lyrics', chords?: string[], text: string }

        if (section.content) {
          section.content.forEach((c, cIdx) => {
            const startSec = c.start !== undefined ? parseFloat((c.start / 1000).toFixed(2)) : null;
            const endSec = c.end !== undefined ? parseFloat((c.end / 1000).toFixed(2)) : null;

            if (c.line && c.line.lyricLine) {
              const lyrics = c.line.lyricLine.lyrics || '';
              const chordsList = c.line.lyricLine.chords || [];

              const rawSegments = buildRawLyricSegments(lyrics, chordsList);
              const rawRenderedText = rawSegments
                .map((s) => `${s.chord ? `[${s.chord}]` : ''}${s.text}`)
                .join('');

              const sanitized = sanitizeLyricLineSegments(rawSegments, {
                isFirstContentOfSection: cIdx === 0 && emittedLines.length === 0,
                lastChordGlobal,
              });

              // Si se descartó un acorde de arrastre (carryover bleed) al inicio de la sección,
              // ajustar secTimeVal al compás donde entra el primer acorde real de la sección
              if (
                cIdx === 0 &&
                sanitized.droppedCarryoverChord &&
                sanitized.firstKeptChord &&
                rawMeasures.length > 0
              ) {
                let closestIdx = 0;
                let minDiff = Infinity;
                for (let m = 0; m < rawMeasures.length; m++) {
                  const mTime = rawMeasures[m][0]?.startTime || 0;
                  const diff = Math.abs(mTime - secTimeVal);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = m;
                  }
                }
                const currMeasureChord = rawMeasures[closestIdx]?.[0]?.chord;
                const nextMeasure = rawMeasures[closestIdx + 1];
                const nextMeasureChord = nextMeasure?.[0]?.chord;
                const nextMeasureTime = nextMeasure?.[0]?.startTime;
                if (
                  currMeasureChord === sanitized.droppedCarryoverChord &&
                  nextMeasureChord === sanitized.firstKeptChord &&
                  nextMeasureTime !== undefined &&
                  nextMeasureTime - secTimeVal <= 4.5
                ) {
                  secTimeVal = parseFloat(nextMeasureTime.toFixed(2));
                }
              }

              // 1. Acordes instrumentales previos a la voz en esta línea
              if (sanitized.leadingInstrumentalChords.length > 0) {
                const prevEmitted = emittedLines[emittedLines.length - 1];
                if (prevEmitted && prevEmitted.kind === 'chords') {
                  prevEmitted.chords.push(...sanitized.leadingInstrumentalChords);
                  prevEmitted.text = prevEmitted.chords.map((ch) => `[${ch}]`).join('   ');
                } else {
                  emittedLines.push({
                    kind: 'chords',
                    chords: [...sanitized.leadingInstrumentalChords],
                    text: sanitized.leadingInstrumentalChords.map((ch) => `[${ch}]`).join('   '),
                  });
                }
              }

              // 2. Líneas vocales (e interludios instrumentales intermedios si los hubiera)
              sanitized.bodyLines.forEach((bLine) => {
                if (!bLine.text) return;
                emittedLines.push(bLine);
              });

              // 3. Acordes instrumentales al cierre de la línea
              if (sanitized.trailingInstrumentalChords.length > 0) {
                emittedLines.push({
                  kind: 'chords',
                  chords: [...sanitized.trailingInstrumentalChords],
                  text: sanitized.trailingInstrumentalChords.map((ch) => `[${ch}]`).join('   '),
                });
              }

              if (sanitized.lastChordInLine) {
                lastChordGlobal = sanitized.lastChordInLine;
              }

              secDebugLines.push({
                type: 'lyricLine',
                startTime: startSec,
                endTime: endSec,
                rawLyrics: lyrics,
                rawChords: chordsList,
                rawRenderedText,
                renderedText: sanitized.debugSummaryText,
                leadingInstrumentalChords: sanitized.leadingInstrumentalChords,
                trailingInstrumentalChords: sanitized.trailingInstrumentalChords,
                droppedCarryoverChord: sanitized.droppedCarryoverChord,
              });
            } else if (c.line && c.line.chordsLine) {
              // Secciones o compases instrumentales (Intro, Interludio, Solo, Outro)
              const chordsList = c.line.chordsLine.chords || [];
              const normalizedChords = chordsList
                .map((ch) => normalizeChord(ch))
                .filter((ch) => ch && ch !== '𝄾' && ch !== '𝄽');
              const formatted = normalizedChords
                .map((ch) => `[${ch}]`)
                .join('   ');
              if (formatted) {
                emittedLines.push({
                  kind: 'chords',
                  chords: [...normalizedChords],
                  text: formatted,
                });
                const lastMusical = [...normalizedChords].reverse().find((ch) => ch !== '𝄾' && ch !== '𝄽');
                if (lastMusical) lastChordGlobal = lastMusical;
              }
              secDebugLines.push({
                type: 'chordsLine',
                startTime: startSec,
                endTime: endSec,
                rawChords: chordsList,
                normalizedChords,
                renderedText: formatted,
              });
            }
          });
        }

        const secTimeSec = secTimeVal.toFixed(1);
        leadSections.push({ title, startTime: secTimeVal, emittedLines });
        textOutput += `\n[${title} @ ${secTimeSec}]\n`;
        emittedLines.forEach((el) => {
          if (el.text) {
            textOutput += el.text + '\n';
          }
        });

        rawSectionsStructured.push({
          title,
          startTime: secTimeVal,
          lines: secDebugLines,
        });
      });

      leadSheetText = textOutput.trim();
    } catch (err) {
      console.warn('[Chordify Scraper] Error al reconstruir leadSheet:', err.message);
    }
  }

  // 4. Correlacionar secciones reales de Chordify con los compases
  const sectionStarts = [];
  if (leadSections.length > 0) {
    leadSections.forEach((sec) => {
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < rawMeasures.length; i++) {
        const mTime = rawMeasures[i][0]?.startTime || 0;
        const diff = Math.abs(mTime - sec.startTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      sectionStarts.push({
        title: sec.title,
        startIdx: closestIdx,
        startTime: sec.startTime,
        timeDiff: minDiff,
      });
    });

    // Asegurar que la primera sección cubra desde el compás 0 (incluyendo cualquier compás inicial de silencio 𝄾)
    if (sectionStarts.length > 0 && sectionStarts[0].startIdx > 0) {
      const leadingOnlySilence = rawMeasures
        .slice(0, sectionStarts[0].startIdx)
        .every((m) => m.every((b) => b.chord === '𝄾' || b.chord === '𝄽'));
      if (leadingOnlySilence) {
        sectionStarts[0].startIdx = 0;
      }
    }

    // Asegurar índices de inicio estrictamente monótonos
    for (let i = 1; i < sectionStarts.length; i++) {
      if (sectionStarts[i].startIdx <= sectionStarts[i - 1].startIdx) {
        sectionStarts[i].startIdx = sectionStarts[i - 1].startIdx + 1;
      }
    }

    // Reconstruir leadSheetText con el timestamp del primer compás musical de cada sección
    // (para que en SongSheetView no figure el tiempo de silencio previo, mientras BeatGrid sí conserva C.1 @ 0.56s)
    if (rawMeasures.length > 0) {
      let reconciledOutput = '';
      leadSections.forEach((sec, idx) => {
        const matchedStartIdx = sectionStarts[idx]?.startIdx ?? 0;
        const nextStartIdx = sectionStarts[idx + 1]?.startIdx ?? rawMeasures.length;
        let headerMeasureIdx = matchedStartIdx;
        for (let m = matchedStartIdx; m < nextStartIdx; m++) {
          const hasMusic = (rawMeasures[m] || []).some(
            (b) => b.chord && b.chord !== '𝄾' && b.chord !== '𝄽'
          );
          if (hasMusic) {
            headerMeasureIdx = m;
            break;
          }
        }
        const measureStartTime = rawMeasures[headerMeasureIdx]?.[0]?.startTime ?? sec.startTime;
        if (rawSectionsStructured[idx]) {
          rawSectionsStructured[idx].startTime = measureStartTime;
        }
        reconciledOutput += `\n[${sec.title} @ ${measureStartTime.toFixed(1)}]\n`;
        (sec.emittedLines || []).forEach((el) => {
          if (el.text) {
            reconciledOutput += el.text + '\n';
          }
        });
      });
      leadSheetText = reconciledOutput.trim();
    }
  }

  const hasIntro =
    rawMeasures.length > 0 &&
    rawMeasures[0].every((b) => b.chord === '𝄾' || b.chord === '𝄽');

  const compases = rawMeasures.map((measureBeats, mIdx) => {
    const acordes = measureBeats.map((b) => b.chord);
    const beatTimes = measureBeats.map((b) => b.startTime);
    const id = mIdx + 1;

    let seccion = '';
    let isSecStart = false;

    if (sectionStarts.length > 0) {
      let matchedSec = sectionStarts[0];
      for (let i = 0; i < sectionStarts.length; i++) {
        if (mIdx >= sectionStarts[i].startIdx) {
          matchedSec = sectionStarts[i];
        } else {
          break;
        }
      }
      seccion = matchedSec.title;
      isSecStart = mIdx === matchedSec.startIdx;
    } else {
      if (hasIntro && mIdx === 0) {
        seccion = 'Intro';
        isSecStart = true;
      } else {
        const songMeasureIdx = hasIntro ? mIdx - 1 : mIdx;
        const secIdx = Math.floor(songMeasureIdx / 8) + 1;
        seccion = `Estrofa ${secIdx}`;
        isSecStart = songMeasureIdx % 8 === 0;
      }
    }

    // El tiempo de inicio del compás siempre coincide con el primer pulso del compás en el audio
    const secTime = isSecStart && measureBeats[0] ? measureBeats[0].startTime : null;

    return {
      id,
      acordes,
      beatTimes,
      seccion,
      ...(secTime !== null ? { secTime } : {}),
    };
  });

  const hasLyrics = Boolean(leadSheetText);

  return {
    songTitle,
    songArtist,
    bpm,
    barLength,
    key,
    normalizedKey,
    compases,
    hasLyrics,
    leadSheetText,
    diagnostics: {
      totalBeatsCount: beats.length,
      firstMusicalChordIndex: firstChordIdx,
      droppedPreRollCount: droppedPreRollBeats.length,
      droppedPreRollBeats,
      keptPickupCount: keptPickupBeats.length,
      keptPickupBeats,
      rawMeasuresCount: rawMeasures.length,
      leadSectionsCount: leadSections.length,
      sectionStarts,
      rawSectionsStructured,
      rawHydrationLeadSheet: leadSheet?.data?.value || null,
      beats,
    },
  };
}
