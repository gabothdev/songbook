export interface ChordifyBeat {
  beatNum: number;
  rawChord: string;
  chord: string;
  startTime: number;
  endTime: number;
}

export interface ChordifyCompas {
  id: number;
  acordes: string[];
  beatTimes: number[];
  seccion: string;
  secTime?: number;
}

export interface RawLyricSegment {
  chord: string | null;
  text: string;
}

export interface EmittedLine {
  kind: 'chords' | 'lyrics';
  chords?: string[];
  text: string;
}

export interface SanitizedSegmentsResult {
  leadingInstrumentalChords: string[];
  bodyLines: EmittedLine[];
  trailingInstrumentalChords: string[];
  droppedCarryoverChord: string | null;
  firstKeptChord: string | null;
  lastChordInLine: string | null;
  debugSummaryText: string;
}

export function normalizeChord(chord: string | null | undefined): string {
  if (!chord || chord === 'N' || chord === 'none') return '𝄾';
  let c = chord.trim();

  // 1. Colon replacements from Chordify (e.g. E:maj -> E, E:min -> Em, E:maj7 -> Emaj7)
  c = c
    .replace(/:min/gi, 'm')
    .replace(/:maj(?=\/|$)/gi, '')
    .replace(/:maj/gi, 'maj')
    .replace(/:/g, '');

  // 2. Pure major triad simplification (e.g. Emaj/Ab -> E/Ab, Emaj -> E, while preserving Emaj7, Emaj9)
  c = c.replace(/^([A-G][b#]?)maj(?!\d)(\/[A-G][b#]?)?$/i, (_match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  c = c.replace(/^([A-G][b#]?)major(?!\d)(\/[A-G][b#]?)?$/i, (_match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  return c;
}

export function buildRawLyricSegments(lyrics: string, chordsList: any[]): RawLyricSegment[] {
  const segments: RawLyricSegment[] = [];
  let lyricIndex = 0;
  let pendingChord: string | null = null;
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
      const stepVal = Number(item.step);
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

export function getSegmentWords(text: string | null | undefined): string[] {
  return (text || '').trim().split(/\s+/).filter(Boolean);
}

export function getLeadingSpacesCount(text: string | null | undefined): number {
  const m = (text || '').match(/^\s*/);
  return m ? m[0].length : 0;
}

export function isMultiSpaceOrEmptySegment(seg: RawLyricSegment | null | undefined): boolean {
  if (!seg) return false;
  const words = getSegmentWords(seg.text);
  const lead = getLeadingSpacesCount(seg.text);
  return lead >= 2 || (Boolean(seg.chord) && words.length === 0);
}

export function formatVocalSegments(rawSegs: RawLyricSegment[]): string {
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

export function sanitizeLyricLineSegments(
  rawSegments: RawLyricSegment[],
  { isFirstContentOfSection = false, lastChordGlobal = null }: { isFirstContentOfSection?: boolean; lastChordGlobal?: string | null } = {}
): SanitizedSegmentsResult {
  const segments = rawSegments.map((s) => ({ ...s }));
  const leadingInstrumentalChords: string[] = [];
  const trailingInstrumentalChords: string[] = [];
  let droppedCarryoverChord: string | null = null;

  // Caso 1A: Riff instrumental al inicio de la línea con palabras sueltas de ASR intercaladas en huecos de >= 2 espacios
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
            leadingInstrumentalChords.push(segments[i].chord!);
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

  // Caso 2: Acordes instrumentales al final de la línea
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

  // Caso 3: Interludios instrumentales puros en mitad de línea
  const bodyLines: EmittedLine[] = [];
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
          .filter(Boolean) as string[];
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
      const onlyChords = remainingSegs.map((s) => s.chord).filter(Boolean) as string[];
      if (onlyChords.length > 0) {
        bodyLines.push({
          kind: 'chords',
          chords: onlyChords,
          text: onlyChords.map((ch) => `[${ch}]`).join('   '),
        });
      }
    }
  }

  const firstKeptChord =
    leadingInstrumentalChords[0] ||
    segments.find((s) => s.chord && s.chord !== '𝄾' && s.chord !== '𝄽')?.chord ||
    trailingInstrumentalChords[0] ||
    null;

  const allLineChords = [
    ...leadingInstrumentalChords,
    ...segments.map((s) => s.chord).filter(Boolean),
    ...trailingInstrumentalChords,
  ].filter((ch) => ch && ch !== '𝄾' && ch !== '𝄽') as string[];

  const lastChordInLine = allLineChords.length > 0 ? allLineChords[allLineChords.length - 1] : null;

  const summaryParts: string[] = [];
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
 * Parses raw beats string and hydration data into normalized measures and lead sheet
 */
export function parseChordifyMeasuresAndLyrics(chordsData: any, { fallbackTitle = null, fallbackArtist = null }: { fallbackTitle?: string | null; fallbackArtist?: string | null } = {}) {
  const chordsObj = chordsData?.chords?.value;
  if (!chordsObj) {
    throw new Error('Datos de acordes no disponibles en chordsData.');
  }

  let songTitle = chordsData.title || chordsObj.title || chordsData.meta?.title || chordsData.track?.title || null;
  let songArtist = chordsData.artist || chordsObj.artist || chordsData.meta?.artist || chordsData.track?.artist || null;

  if (songTitle && /^chordify$/i.test(songTitle.trim())) {
    songTitle = null;
  }
  if (!songTitle && fallbackTitle) songTitle = fallbackTitle;
  if (!songArtist && fallbackArtist) songArtist = fallbackArtist;

  const bpm = chordsObj.chordInfo?.derivedBpm || 120;
  const key = chordsObj.chordInfo?.derivedKey || 'C:maj';
  const barLength = chordsObj.barLength || chordsObj.chordInfo?.barLength || 4;
  const chordsStr = chordsObj.chords;

  if (!chordsStr) {
    throw new Error('La cadena de acordes de Chordify está vacía.');
  }

  const lines = chordsStr.split('\n').filter((l: string) => l.trim() !== '');
  const beats: ChordifyBeat[] = lines.map((line: string) => {
    const parts = line.split(';');
    return {
      beatNum: parseInt(parts[0], 10),
      rawChord: parts[1] || 'N',
      chord: normalizeChord(parts[1] || 'N'),
      startTime: parseFloat(parts[2] || '0'),
      endTime: parseFloat(parts[3] || '0'),
    };
  });

  const firstChordIdx = beats.findIndex((b) => b.chord !== '𝄾' && b.chord !== '𝄽');
  const firstBarIdx = beats.findIndex((b) => b.beatNum === 1);
  const rawMeasures: ChordifyBeat[][] = [];
  let droppedPreRollBeats: ChordifyBeat[] = [];
  let keptPickupBeats: ChordifyBeat[] = [];

  if (firstChordIdx > 0) {
    if (firstBarIdx !== -1 && firstBarIdx <= firstChordIdx) {
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
      const songBeats = beats.slice(firstBarIdx);
      for (let i = 0; i < songBeats.length; i += barLength) {
        rawMeasures.push(songBeats.slice(i, i + barLength));
      }
    } else {
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

  let leadSheetText: string | null = null;
  const leadSections: { title: string; startTime: number; emittedLines: EmittedLine[] }[] = [];
  const rawSectionsStructured: any[] = [];
  const leadSheet = chordsData.leadSheet;

  if (leadSheet && leadSheet.data && leadSheet.data.value) {
    try {
      const sections = leadSheet.data.value;
      let textOutput = '';
      let lastChordGlobal: string | null = null;

      sections.forEach((section: any) => {
        const title = section.title || 'Sección';
        const firstContent = section.content && section.content[0];
        let secTimeVal = firstContent ? parseFloat((firstContent.start / 1000).toFixed(2)) : 0;

        const secDebugLines: any[] = [];
        const emittedLines: EmittedLine[] = [];

        if (section.content) {
          section.content.forEach((c: any, cIdx: number) => {
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

              if (sanitized.leadingInstrumentalChords.length > 0) {
                const prevEmitted = emittedLines[emittedLines.length - 1];
                if (prevEmitted && prevEmitted.kind === 'chords' && prevEmitted.chords) {
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

              sanitized.bodyLines.forEach((bLine) => {
                if (!bLine.text) return;
                emittedLines.push(bLine);
              });

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
              const chordsList = c.line.chordsLine.chords || [];
              const normalizedChords = chordsList
                .map((ch: string) => normalizeChord(ch))
                .filter((ch: string) => ch && ch !== '𝄾' && ch !== '𝄽');
              const formatted = normalizedChords
                .map((ch: string) => `[${ch}]`)
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
    } catch (err: any) {
      console.warn('[measureParser] Error al reconstruir leadSheet:', err.message);
    }
  }

  const sectionStarts: { title: string; startIdx: number; startTime: number; timeDiff: number }[] = [];
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
      sectionStarts.push({ title: sec.title, startIdx: closestIdx, startTime: sec.startTime, timeDiff: minDiff });
    });

    if (sectionStarts.length > 0 && sectionStarts[0].startIdx > 0) {
      const leadingOnlySilence = rawMeasures
        .slice(0, sectionStarts[0].startIdx)
        .every((m) => m.every((b) => b.chord === '𝄾' || b.chord === '𝄽'));
      if (leadingOnlySilence) {
        sectionStarts[0].startIdx = 0;
      }
    }

    for (let i = 1; i < sectionStarts.length; i++) {
      if (sectionStarts[i].startIdx <= sectionStarts[i - 1].startIdx) {
        sectionStarts[i].startIdx = sectionStarts[i - 1].startIdx + 1;
      }
    }

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

  const hasIntro = rawMeasures.length > 0 && rawMeasures[0].every((b) => b.chord === '𝄾' || b.chord === '𝄽');
  const compases: ChordifyCompas[] = rawMeasures.map((measureBeats, mIdx) => {
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

    const secTime = isSecStart && measureBeats[0] ? measureBeats[0].startTime : undefined;

    return {
      id,
      acordes,
      beatTimes,
      seccion,
      ...(secTime !== undefined ? { secTime } : {}),
    };
  });

  return {
    songTitle,
    songArtist,
    bpm,
    key,
    normalizedKey: normalizeChord(key),
    barLength,
    compases,
    leadSheetText,
    hasLyrics: Boolean(leadSheetText),
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
      beats,
    },
  };
}
