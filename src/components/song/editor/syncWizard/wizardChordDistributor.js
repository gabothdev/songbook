import { parseSongTextToGrid } from '../../../../utils/gridParser.js';
import {
  parseLyricsToVisualBlocks,
  reconstructTextFromBlocks,
  isInstrumentalSong,
} from '../../../../utils/lyricsBlocks.js';

/**
 * Builds a monotonic timeline of compases and chord events based on the active BeatGrid compases
 * (or parsed from initialContent as fallback).
 * Uses exact beatTimes when present or piece-wise linear interpolation across timestamped measures.
 */
export function buildChordTimeline(initialContent, bpm = 100, passedCompases = null) {
  const compases =
    Array.isArray(passedCompases) && passedCompases.length > 0
      ? passedCompases.map((c) => ({
          ...c,
          acordes: Array.isArray(c.acordes) ? [...c.acordes] : [],
          ...(Array.isArray(c.beatTimes) ? { beatTimes: [...c.beatTimes] } : {}),
        }))
      : parseSongTextToGrid(initialContent, 4);

  const secPerBeat = 60 / (bpm || 100);

  const timed = [];
  compases.forEach((c, idx) => {
    const t = c.secTime ?? (c.beatTimes && c.beatTimes.length > 0 ? c.beatTimes[0] : null);
    if (t !== null && t !== undefined && !isNaN(t)) {
      timed.push({ idx, time: parseFloat(t) });
    }
  });

  const measureTimes = new Array(compases.length);
  if (timed.length === 0) {
    for (let i = 0; i < compases.length; i++) {
      measureTimes[i] = i * 4 * secPerBeat;
    }
  } else {
    const first = timed[0];
    const avgSecPerM =
      timed.length > 1
        ? (timed[timed.length - 1].time - first.time) / Math.max(1, timed[timed.length - 1].idx - first.idx)
        : 4 * secPerBeat;

    for (let i = 0; i < first.idx; i++) {
      measureTimes[i] = Math.max(0, first.time - (first.idx - i) * avgSecPerM);
    }
    measureTimes[first.idx] = first.time;

    for (let t = 0; t < timed.length - 1; t++) {
      const cur = timed[t];
      const nxt = timed[t + 1];
      const span = Math.max(1, nxt.idx - cur.idx);
      for (let i = cur.idx; i <= nxt.idx; i++) {
        measureTimes[i] = cur.time + ((i - cur.idx) / span) * (nxt.time - cur.time);
      }
    }

    const last = timed[timed.length - 1];
    for (let i = last.idx; i < compases.length; i++) {
      measureTimes[i] = last.time + (i - last.idx) * avgSecPerM;
    }
  }

  const chordEvents = [];
  compases.forEach((m, mIdx) => {
    const mStart = measureTimes[mIdx];
    const mEnd = mIdx + 1 < compases.length ? measureTimes[mIdx + 1] : mStart + 4 * secPerBeat;
    const chords = m.acordes || [];
    const beatDur = (mEnd - mStart) / Math.max(1, chords.length);

    chords.forEach((ch, bIdx) => {
      const exactBeatTime =
        Array.isArray(m.beatTimes) && m.beatTimes[bIdx] != null && !isNaN(m.beatTimes[bIdx])
          ? parseFloat(m.beatTimes[bIdx])
          : mStart + bIdx * beatDur;

      chordEvents.push({
        chord: ch,
        time: exactBeatTime,
        measureIdx: mIdx,
        beatIdx: bIdx,
      });
    });
  });

  return { compases, measureTimes, chordEvents };
}

/**
 * Distributes chords uniformly across the words of a phrase.
 * First chord attaches directly to the 1st word: [C]Word.
 * Subsequent chords attach to words calculated by uniform spacing: Math.floor(words.length * i / N).
 */
export function attachChordsToWords(phraseText, chords, suffixChords = []) {
  const cleanChords = (chords || []).filter((c) => c && c !== '𝄾' && c !== '𝄽');
  const cleanSuffix = (suffixChords || []).filter((c) => c && c !== '𝄾' && c !== '𝄽');
  const suffixStr = cleanSuffix.length > 0 ? ' ' + cleanSuffix.map((c) => `[${c}]`).join(' ') : '';

  if (cleanChords.length === 0) return `${phraseText.trim()}${suffixStr}`.trim();

  const words = phraseText.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return `${cleanChords.map((c) => `[${c}]`).join(' ')}${suffixStr}`.trim();
  }

  if (cleanChords.length === 1) {
    return `[${cleanChords[0]}]${words[0]} ${words.slice(1).join(' ')}${suffixStr}`.trim();
  }

  const wordChords = new Map();
  wordChords.set(0, cleanChords[0]);

  for (let c = 1; c < cleanChords.length; c++) {
    const targetIdx = Math.min(
      words.length - 1,
      Math.max(1, Math.floor((c * words.length) / cleanChords.length))
    );
    if (wordChords.has(targetIdx)) {
      wordChords.set(targetIdx, `${wordChords.get(targetIdx)} [${cleanChords[c]}]`);
    } else {
      wordChords.set(targetIdx, cleanChords[c]);
    }
  }

  const resultWords = words.map((w, idx) => {
    if (wordChords.has(idx)) {
      const ch = wordChords.get(idx);
      return `[${ch}]${w}`;
    }
    return w;
  });

  return `${resultWords.join(' ')}${suffixStr}`.trim();
}

/**
 * Helper to extract deduplicated chords in a [startTime, endTime) window from chordEvents.
 */
function extractChordsInTimeWindow(chordEvents, startTime, endTime) {
  const matching = chordEvents.filter(
    (e) =>
      e.chord &&
      e.chord !== '𝄾' &&
      e.chord !== '𝄽' &&
      e.time >= startTime - 0.15 &&
      e.time < endTime - 0.15
  );
  const deduplicated = [];
  matching.forEach((e) => {
    if (deduplicated.length === 0 || deduplicated[deduplicated.length - 1] !== e.chord) {
      deduplicated.push(e.chord);
    }
  });
  return deduplicated;
}

/**
 * Structures raw lyrics directly without video tapping (for the "Montar letra directo sin sincronizar" option in Step 1).
 * Preserves any [Section] headers present in rawLyrics or splits paragraphs into [Verso 1], [Verso 2], etc.
 */
export function buildDirectMountedContent({
  rawLyrics = '',
  initialContent = '',
  compases: passedCompases = null,
  currentBpm = 100,
}) {
  const trimmed = rawLyrics.trim();
  if (!trimmed) {
    return {
      generatedText: initialContent,
      generatedCompases: passedCompases || parseSongTextToGrid(initialContent, 4),
    };
  }

  const hasSectionHeaders = /^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*[\d.]+)?\s*\]$/m.test(
    trimmed
  );

  const linesOut = [`[BPM @ ${currentBpm || 100}]`, ''];

  if (hasSectionHeaders) {
    linesOut.push(trimmed);
  } else {
    // Group paragraphs separated by blank lines into [Verso 1], [Verso 2]...
    const paragraphs = trimmed
      .split(/\n\s*\n/)
      .map((p) =>
        p
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      )
      .filter((p) => p.length > 0);

    if (paragraphs.length <= 1) {
      linesOut.push('[Verso 1]');
      linesOut.push(trimmed);
    } else {
      paragraphs.forEach((paraLines, idx) => {
        linesOut.push(`[Verso ${idx + 1}]`);
        paraLines.forEach((l) => linesOut.push(l));
        linesOut.push('');
      });
    }
  }

  const generatedText = linesOut.join('\n').trim();
  const generatedCompases =
    Array.isArray(passedCompases) && passedCompases.length > 0
      ? passedCompases
      : parseSongTextToGrid(generatedText, 4);

  return {
    generatedText,
    generatedCompases,
  };
}

/**
 * Assembles and distributes synced lyrics and real-time chords into final formatted song text and rhythm grid.
 * Accurately extracts the real chords sounding in each phrase's [phrase.time, phrase.endTime || nextPhrase.time) window,
 * preserves pure instrumental sections (Intro/Solo), and keeps chords sounding in post-[V] instrumental gaps.
 */
export function buildFinalSynchronizedContent({
  allSections = [],
  initialContent = '',
  compases: passedCompases = null,
  parsedPhrases = [],
  currentPhraseIndex = 0,
  currentBpm = 100,
  availableChords = ['C', 'G', 'Am', 'F'],
  allRecordedPhrases = [],
  currentSectionStartTime = 0,
}) {
  const originalBlocks = parseLyricsToVisualBlocks(initialContent);
  const wasOriginallyInstrumental = isInstrumentalSong(originalBlocks, false);

  const {
    compases: baseCompases,
    measureTimes,
    chordEvents,
  } = buildChordTimeline(initialContent, currentBpm || 100, passedCompases);

  const contentLines = [];
  contentLines.push(`[BPM @ ${currentBpm || 100}]`);
  contentLines.push('');

  // 1. Calculate the boundary of synchronized sections
  const lastPhraseTime = Math.max(
    ...allSections.flatMap((s) => (s.phrases || []).map((p) => p.endTime || p.time || 0)),
    0
  );
  const maxSyncedTime = Math.max(
    ...allSections.map((s) => s.startTime || 0),
    ...allSections.map((s) => s.endTime || 0),
    lastPhraseTime,
    currentSectionStartTime || 0
  );

  // Identify any untouched original vocal sections that start after synchronization
  const hasOriginalTimes = originalBlocks.some((b) => b.time != null);
  let unsyncedOriginalSections = [];
  let minUntouchedTime = Infinity;

  if (!wasOriginallyInstrumental && hasOriginalTimes && maxSyncedTime > 0) {
    unsyncedOriginalSections = originalBlocks.filter((b) => {
      if (b.time == null) return false;
      const t = parseFloat(b.time);
      if (!isNaN(t) && t >= maxSyncedTime - 0.2) {
        if (t < minUntouchedTime) minUntouchedTime = t;
        return true;
      }
      return false;
    });
  }

  // 2. Mount synchronized sections with chords mapped by actual time windows
  allSections.forEach((sec, sIdx) => {
    contentLines.push(`[${sec.name} @ ${sec.startTime.toFixed(1)}]`);

    const nextSec = allSections[sIdx + 1];
    let secEndTime = nextSec ? nextSec.startTime : sec.endTime;
    if (secEndTime == null) {
      if (minUntouchedTime < Infinity) {
        secEndTime = minUntouchedTime;
      } else {
        const lastMeasureEnd =
          measureTimes && measureTimes.length > 0
            ? measureTimes[measureTimes.length - 1] + (60 / (currentBpm || 100)) * 4
            : 0;
        const secDurationEstimate =
          sec.phrases && sec.phrases.length > 0
            ? (sec.phrases[sec.phrases.length - 1].endTime ||
                sec.phrases[sec.phrases.length - 1].time) -
              sec.startTime +
              (60 / (currentBpm || 100)) * 8
            : 15.0;
        secEndTime = Math.max(sec.startTime + secDurationEstimate, lastMeasureEnd);
      }
    }

    if (!sec.phrases || sec.phrases.length === 0) {
      // Pure instrumental section (e.g. Intro, Solo, Interludio)
      // First extract real sounding chords from the BeatGrid timeline in [sec.startTime, secEndTime)
      const instChords = extractChordsInTimeWindow(chordEvents, sec.startTime, secEndTime);

      if (instChords.length > 0) {
        // Format in readable groups of up to 4 chords per line
        for (let i = 0; i < instChords.length; i += 4) {
          const chunk = instChords.slice(i, i + 4);
          contentLines.push(chunk.map((c) => `[${c}]`).join(' '));
        }
      } else {
        // Fallback to any matching originalBlocks lines
        const matching = originalBlocks.filter((b) => {
          if (b.time == null) return false;
          const t = parseFloat(b.time);
          return !isNaN(t) && t >= sec.startTime - 0.2 && t < secEndTime - 0.2;
        });

        const lines = [];
        matching.forEach((b) => {
          (b.lines || []).forEach((l) => {
            const parts = [];
            if (l.prefixChords) l.prefixChords.forEach((c) => c.chord && parts.push(`[${c.chord}]`));
            if (l.words) {
              l.words.forEach((w) => {
                const ch = w.chord ? `[${w.chord}]` : '';
                parts.push(`${ch}${w.text}`.trim());
              });
            }
            if (l.suffixChords) l.suffixChords.forEach((c) => c.chord && parts.push(`[${c.chord}]`));
            const str = parts.join(' ').trim();
            if (str) lines.push(str);
          });
        });

        if (lines.length > 0) {
          lines.forEach((l) => contentLines.push(l));
        } else {
          contentLines.push('[𝄾 (4T)]');
        }
      }
    } else {
      // Vocal section with synchronized phrases
      const firstPhrase = sec.phrases[0];

      // Instrumental lead-in before the first phrase
      if (firstPhrase.time > sec.startTime + 0.8) {
        const leadInChords = extractChordsInTimeWindow(chordEvents, sec.startTime, firstPhrase.time);
        if (leadInChords.length > 0) {
          for (let i = 0; i < leadInChords.length; i += 4) {
            const chunk = leadInChords.slice(i, i + 4);
            contentLines.push(chunk.map((c) => `[${c}]`).join(' '));
          }
        }
      }

      // Distribute sounding chords onto each phrase
      sec.phrases.forEach((phrase, pIdx) => {
        const pStart = phrase.time;
        const nextPhraseStart =
          pIdx < sec.phrases.length - 1
            ? sec.phrases[pIdx + 1].time
            : sec.endTime || Math.min(secEndTime, pStart + (60 / (currentBpm || 100)) * 8);

        const vocalEnd = phrase.endTime ? Math.min(phrase.endTime, nextPhraseStart) : nextPhraseStart;

        const chordsInWindow = extractChordsInTimeWindow(chordEvents, pStart, vocalEnd);

        // If no chord change fell directly in this window, inherit the currently sounding active chord
        if (chordsInWindow.length === 0) {
          const past = chordEvents.filter(
            (e) => e.chord && e.chord !== '𝄾' && e.chord !== '𝄽' && e.time <= pStart
          );
          if (past.length > 0) {
            chordsInWindow.push(past[past.length - 1].chord);
          } else if (availableChords.length > 0) {
            chordsInWindow.push(availableChords[0]);
          }
        }

        // Check if user marked [V] (phrase.endTime) and there is an instrumental tail before nextPhraseStart
        let tailChords = [];
        if (phrase.endTime && nextPhraseStart - vocalEnd >= 0.8) {
          const rawTail = extractChordsInTimeWindow(chordEvents, vocalEnd, nextPhraseStart);
          const lastVocalChord = chordsInWindow[chordsInWindow.length - 1];
          tailChords =
            rawTail.length > 0 && rawTail[0] === lastVocalChord ? rawTail.slice(1) : rawTail;
        }

        // Attach up to 3 tail chords as suffix chords on the same line; if more, emit an instrumental line below
        const inlineSuffix = tailChords.length <= 3 ? tailChords : [];
        const formattedLine = attachChordsToWords(phrase.text, chordsInWindow, inlineSuffix);
        contentLines.push(formattedLine);

        if (tailChords.length > 3) {
          for (let i = 0; i < tailChords.length; i += 4) {
            const chunk = tailChords.slice(i, i + 4);
            contentLines.push(chunk.map((c) => `[${c}]`).join(' '));
          }
        }
      });
    }

    contentLines.push('');
  });

  // 3. Preserve untouched sections from original content (only for vocal songs)
  let unsyncedText = '';
  if (unsyncedOriginalSections.length > 0) {
    unsyncedText = reconstructTextFromBlocks(unsyncedOriginalSections).trim();
  }

  // 4. Append remaining lyrics that weren't synchronized yet
  const remainingPhrases = parsedPhrases.slice(currentPhraseIndex);
  if (remainingPhrases.length > 0) {
    const firstPhraseSample = remainingPhrases[0];
    const isAlreadyIncluded = unsyncedText && unsyncedText.includes(firstPhraseSample);
    if (!isAlreadyIncluded) {
      const remainingLyricsBlock = `[Letra Pendiente de Sincronizar]\n${remainingPhrases.join('\n')}`;
      if (unsyncedText) {
        unsyncedText += `\n\n${remainingLyricsBlock}`;
      } else {
        unsyncedText = remainingLyricsBlock;
      }
    }
  }

  let generatedText = contentLines.join('\n').trim();
  if (unsyncedText) {
    generatedText += `\n\n${unsyncedText}`;
  }

  // 5. Construct generatedCompases directly from baseCompases to preserve exact measure boundaries
  let generatedCompases = [];
  if (baseCompases && baseCompases.length > 0) {
    generatedCompases = baseCompases.map((c) => ({
      id: c.id,
      seccion: c.seccion,
      acordes: [...(c.acordes || [])],
      secTime: c.secTime ?? null,
      lyric: c.lyric || '',
      ...(Array.isArray(c.beatTimes) ? { beatTimes: [...c.beatTimes] } : {}),
    }));

    function snapMeasureIdx(time) {
      if (!measureTimes || measureTimes.length === 0) return 0;
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < measureTimes.length; i++) {
        const diff = Math.abs(measureTimes[i] - time);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return closestIdx;
    }

    allSections.forEach((sec, sIdx) => {
      const sSnapIdx = snapMeasureIdx(sec.startTime);
      const nextSec = allSections[sIdx + 1];
      let secEnd = nextSec ? nextSec.startTime : sec.endTime;
      if (secEnd == null) {
        if (minUntouchedTime < Infinity) {
          secEnd = minUntouchedTime;
        } else {
          const secDurationEstimate =
            sec.phrases && sec.phrases.length > 0
              ? (sec.phrases[sec.phrases.length - 1].endTime ||
                  sec.phrases[sec.phrases.length - 1].time) -
                sec.startTime +
                (60 / (currentBpm || 100)) * 8
              : 15.0;
          secEnd = sec.startTime + secDurationEstimate;
        }
      }
      const eSnapIdx = Math.max(sSnapIdx + 1, snapMeasureIdx(secEnd));

      // Section head receives secTime; clear inner secTimes
      if (generatedCompases[sSnapIdx]) {
        generatedCompases[sSnapIdx].secTime = sec.startTime;
      }
      for (let i = sSnapIdx + 1; i < eSnapIdx && i < generatedCompases.length; i++) {
        if (generatedCompases[i]) {
          generatedCompases[i].secTime = null;
        }
      }

      // Assign section name to all its measures
      for (let i = sSnapIdx; i < eSnapIdx && i < generatedCompases.length; i++) {
        if (generatedCompases[i]) {
          generatedCompases[i].seccion = sec.name;
          generatedCompases[i].lyric = '';
        }
      }

      // For vocal sections, attach lyrics to the starting measure of each phrase
      if (sec.phrases && sec.phrases.length > 0) {
        sec.phrases.forEach((phrase) => {
          const pStartIdx = snapMeasureIdx(phrase.time);
          if (generatedCompases[pStartIdx]) {
            generatedCompases[pStartIdx].lyric = phrase.text;
          }
        });
      }
    });
  } else {
    generatedCompases = parseSongTextToGrid(generatedText, 4);
  }

  return {
    generatedText,
    generatedCompases,
  };
}

