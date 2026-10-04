import { normalizeChordName, alignChordsWithLyrics } from './music.js';

export const SECTION_TYPES = [
  'Intro',
  'Estrofa 1',
  'Estrofa 2',
  'Estrofa 3',
  'Pre-Coro',
  'Coro',
  'Puente',
  'Solo',
  'Interludio',
  'Outro',
  'Final',
  'Parte A',
  'Parte B',
  'Instrumental',
  'Acapella',
  'Coda',
];

export const INSTRUMENTAL_PRESETS = [
  { name: 'Solo', timeSig: '4/4', defaultChords: ['𝄾', '𝄾', '𝄾', '𝄾'] },
  { name: 'Interludio', timeSig: '4/4', defaultChords: ['𝄾', '𝄾', '𝄾', '𝄾'] },
  { name: 'Puente Instrumental', timeSig: '4/4', defaultChords: ['𝄾', '𝄾', '𝄾', '𝄾'] },
  { name: 'Intro Instrumental', timeSig: '4/4', defaultChords: ['𝄾', '𝄾', '𝄾', '𝄾'] },
  { name: 'Outro', timeSig: '4/4', defaultChords: ['𝄾', '𝄾', '𝄾', '𝄾'] },
  { name: 'Coda', timeSig: '4/4', defaultChords: ['𝄾', '𝄾', '𝄾', '𝄾'] },
];

export const SECTION_KEYWORDS =
  /^(intro|verse|verso|estrofa|prechorus|pre-chorus|precoro|pre-coro|chorus|coro|estribillo|bridge|puente|solo|outro|final|coda|hook|interlude|interludio|part|parte|seccion|sección|tema|acapella|instrumental|bloque|bpm|beats|time)/i;

/**
 * Parses raw text with [Section] and [Chord] tags into structured visual blocks,
 * including prefixChords (pickup/anacrusa), words/syllables, and suffixChords (remate/out).
 */
export function parseLyricsToVisualBlocks(rawText) {
  if (!rawText || !rawText.trim()) return [];

  // Harmonically align multi-line chord tabs into inline chord words
  const alignedText = alignChordsWithLyrics(rawText);
  const lines = alignedText.split('\n');
  const sections = [];
  let currentSection = {
    id: `sec_${Date.now()}_0`,
    name: 'Intro',
    time: null,
    lines: [],
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    // Check for Section Header: [Intro @ 12.5], [Verse 1], [Parte A], [Coro], etc.
    const headerMatch = trimmed.match(
      /^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*([0-9:.]+))?\s*\]$/
    );
    const innerName = headerMatch ? headerMatch[1].trim() : '';
    const isMetadata = /^(bpm|beats|time|timesignature|metro)$/i.test(innerName);
    const isSection =
      headerMatch &&
      !isMetadata &&
      (headerMatch[2] !== undefined ||
        SECTION_KEYWORDS.test(innerName) ||
        !/^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*$/i.test(innerName));

    if (isMetadata) {
      return;
    }

    if (isSection) {
      if (currentSection.lines.length > 0 || currentSection.name !== 'Intro') {
        sections.push(currentSection);
      }
      currentSection = {
        id: `sec_${Date.now()}_${lineIdx}_${Math.random().toString(36).substring(2, 6)}`,
        name: innerName,
        time: headerMatch[2] ? headerMatch[2].trim() : null,
        lines: [],
      };
      return;
    }

    // Split line into bracketed chords and raw text segments
    const parts = line.split(/(\[[^\]]+\])/g);
    const tokens = [];

    parts.forEach((part) => {
      if (!part) return;
      if (part.startsWith('[') && part.endsWith(']')) {
        const chord = part.slice(1, -1).trim();
        if (/^(?:BPM|Beats|Time|TimeSignature|Metro)/i.test(chord)) return;
        tokens.push({
          type: 'chord',
          chord: normalizeChordName(chord),
        });
      } else {
        tokens.push({
          type: 'text',
          text: part,
        });
      }
    });

    // Determine if the line has any text characters (excluding spaces)
    const firstTextIdx = tokens.findIndex(
      (t) => t.type === 'text' && t.text.trim().length > 0
    );
    const lastTextIdx = tokens.reduce(
      (acc, t, idx) => (t.type === 'text' && t.text.trim().length > 0 ? idx : acc),
      -1
    );

    const prefixChords = [];
    const suffixChords = [];
    const middleTokens = [];

    if (firstTextIdx === -1) {
      // Pure chord line / instrumental line: all chords become prefixChords
      tokens.forEach((t) => {
        if (t.type === 'chord') {
          prefixChords.push({
            id: `p_${Math.random().toString(36).substring(2, 8)}`,
            chord: t.chord,
          });
        }
      });
    } else {
      // Collect prefix chords before first real text token
      for (let i = 0; i < firstTextIdx; i++) {
        const t = tokens[i];
        if (t.type === 'chord') {
          prefixChords.push({
            id: `p_${Math.random().toString(36).substring(2, 8)}`,
            chord: t.chord,
          });
        }
      }

      // Collect suffix chords after last real text token
      for (let i = lastTextIdx + 1; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.type === 'chord') {
          suffixChords.push({
            id: `s_${Math.random().toString(36).substring(2, 8)}`,
            chord: t.chord,
          });
        }
      }

      // Everything in between is processed for words and inline chords
      for (let i = firstTextIdx; i <= lastTextIdx; i++) {
        middleTokens.push(tokens[i]);
      }
    }

    // Parse middle tokens into words, syllables, spaces, and attached chords
    const parsedWords = [];
    let pendingChord = null;

    middleTokens.forEach((tok) => {
      if (tok.type === 'chord') {
        if (pendingChord) {
          // If a chord was pending and another chord comes without text, push as prefix or space chord
          parsedWords.push({
            id: `w_${Math.random().toString(36).substring(2, 8)}`,
            type: 'word',
            text: ' ',
            chord: pendingChord,
          });
        }
        pendingChord = tok.chord;
      } else {
        // tok.type === 'text'
        // Handle words and whitespace
        const subParts = tok.text.split(/(\s+)/);
        subParts.forEach((sp) => {
          if (!sp) return;
          if (/^\s+$/.test(sp)) {
            parsedWords.push({ type: 'space', text: sp });
          } else {
            parsedWords.push({
              id: `w_${Math.random().toString(36).substring(2, 8)}`,
              type: 'word',
              text: sp,
              chord: pendingChord,
            });
            pendingChord = null;
          }
        });
      }
    });

    if (pendingChord) {
      suffixChords.push({
        id: `s_${Math.random().toString(36).substring(2, 8)}`,
        chord: pendingChord,
      });
      pendingChord = null;
    }

    if (parsedWords.length > 0 || prefixChords.length > 0 || suffixChords.length > 0) {
      currentSection.lines.push({
        id: `line_${lineIdx}_${Math.random().toString(36).substring(2, 6)}`,
        prefixChords,
        words: parsedWords,
        suffixChords,
      });
    }
  });

  if (currentSection.lines.length > 0 || sections.length === 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Reconstructs raw text from visual sections, words, prefixChords and suffixChords
 */
export function reconstructTextFromBlocks(sections) {
  let output = '';
  sections.forEach((sec) => {
    const validLines = sec.lines.filter(
      (line) =>
        line &&
        ((line.words && line.words.length > 0) ||
          (line.prefixChords && line.prefixChords.length > 0) ||
          (line.suffixChords && line.suffixChords.length > 0))
    );

    if (validLines.length === 0 && sec.name === 'Intro') {
      return;
    }

    const timeStr = sec.time ? ` @ ${sec.time}` : '';
    output += `[${sec.name}${timeStr}]\n`;

    validLines.forEach((line) => {
      let lineStr = '';

      // 1. Prepend prefix chords (pickup / entrada)
      if (line.prefixChords && line.prefixChords.length > 0) {
        lineStr += line.prefixChords.map((p) => `[${p.chord}]`).join(' ') + ' ';
      }

      // 2. Middle words and syllables
      if (line.words && line.words.length > 0) {
        line.words.forEach((item) => {
          if (item.type === 'space') {
            lineStr += item.text;
          } else if (item.type === 'word') {
            if (item.chord) {
              lineStr += `[${item.chord}]${item.text}`;
            } else {
              lineStr += item.text;
            }
          }
        });
      }

      // 3. Append suffix chords (remate / salida)
      if (line.suffixChords && line.suffixChords.length > 0) {
        const suffixStr = line.suffixChords.map((s) => `[${s.chord}]`).join(' ');
        lineStr = lineStr.trimEnd() ? `${lineStr.trimEnd()} ${suffixStr}` : suffixStr;
      }

      if (lineStr.trim()) {
        output += lineStr.trimEnd() + '\n';
      }
    });

    output += '\n';
  });

  return output.trim();
}

/**
 * Determines if visual sections represent an unconfigured / empty lyric song
 * that should display the prompt to add lyrics or mark as completely instrumental.
 */
export function isInstrumentalSong(sections, isExplicitInstrumental = false) {
  if (isExplicitInstrumental) return false;
  if (!sections || sections.length === 0) return true;
  let wordCount = 0;
  sections.forEach((sec) => {
    sec.lines.forEach((line) => {
      line.words?.forEach((w) => {
        if (w.type === 'word' && w.text.trim() && w.text !== ' ') {
          wordCount++;
        }
      });
    });
  });
  return wordCount <= 3;
}

/**
 * Splits a word at a specific character index into two connected syllables without spaces
 */
export function splitWordAtChar(words, wordId, splitCharIndex) {
  const newWords = [];
  words.forEach((item) => {
    if (item.id === wordId && item.type === 'word' && item.text.length > 1) {
      const text = item.text;
      const idx = Math.max(1, Math.min(text.length - 1, splitCharIndex));
      const firstPart = text.slice(0, idx);
      const secondPart = text.slice(idx);

      newWords.push({
        id: `w_${Math.random().toString(36).substring(2, 8)}`,
        type: 'word',
        text: firstPart,
        chord: item.chord, // preserve original chord on first syllable
        isSyllable: true,
      });

      newWords.push({
        id: `w_${Math.random().toString(36).substring(2, 8)}`,
        type: 'word',
        text: secondPart,
        chord: null, // second syllable ready for new chord
        isSyllable: true,
      });
    } else {
      newWords.push(item);
    }
  });
  return newWords;
}

/**
 * Merges two adjacent connected syllables into a single word
 */
export function mergeSyllableWithNext(words, wordId) {
  const idx = words.findIndex((w) => w.id === wordId);
  if (idx === -1 || idx >= words.length - 1) return words;

  const current = words[idx];
  const next = words[idx + 1];

  if (current.type === 'word' && next.type === 'word') {
    const merged = {
      id: current.id,
      type: 'word',
      text: `${current.text}${next.text}`,
      chord: current.chord || next.chord,
      isSyllable: false,
    };
    const newWords = [...words];
    newWords.splice(idx, 2, merged);
    return newWords;
  }

  return words;
}
