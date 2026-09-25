const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_MAPPING = {
  'C': 'C', 'C#': 'C#', 'Db': 'C#',
  'D': 'D', 'D#': 'D#', 'Eb': 'D#',
  'E': 'E',
  'F': 'F', 'F#': 'F#', 'Gb': 'F#',
  'G': 'G', 'G#': 'G#', 'Ab': 'G#',
  'A': 'A', 'A#': 'A#', 'Bb': 'A#',
  'B': 'B'
};

function getNoteIndex(note) {
  const normalized = NOTE_MAPPING[note];
  return NOTES.indexOf(normalized);
}

/**
 * Normalizes chord nomenclature (e.g. Emaj/Ab -> E/Ab, Cmaj -> C, preserving Emaj7, Emaj9, etc.)
 */
export function normalizeChordName(chord) {
  if (!chord || typeof chord !== 'string') return '';
  const trimmed = chord.trim();
  if (trimmed === '𝄾' || trimmed === '𝄽' || trimmed.includes('@')) return trimmed;

  // Clean Chordify colons
  let c = trimmed
    .replace(/:min/gi, 'm')
    .replace(/:maj(?=\/|$)/gi, '')
    .replace(/:maj/gi, 'maj')
    .replace(/:/g, '');

  // Simplify pure major chords with or without slash: Emaj -> E, Emaj/Ab -> E/Ab (preserving Emaj7, Emaj9, etc.)
  c = c.replace(/^([A-G][b#]?)maj(?!\d)(\/[A-G][b#]?)?$/i, (match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  // Simplify Emajor -> E, Emajor/Ab -> E/Ab
  c = c.replace(/^([A-G][b#]?)major(?!\d)(\/[A-G][b#]?)?$/i, (match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  // Clean unicode flats/sharps
  c = c.replace(/♯/g, '#').replace(/♭/g, 'b');

  return c;
}

/**
 * Transposes an individual chord name by a number of semitones
 */
export function transposeChord(chord, amount = 0) {
  if (!chord) return chord;
  const normalized = normalizeChordName(chord);
  const trimmed = normalized.trim();

  // Ignore rests and section or metadata tags
  if (trimmed === '𝄾' || trimmed === '𝄽' || trimmed.includes('@') || trimmed.toLowerCase().startsWith('bpm') || trimmed.toLowerCase().startsWith('beats')) {
    return chord;
  }

  if (amount === 0) return normalized;

  const chordRegex = /^([A-G][b#]?)((?:maj|min|dim|aug|m|sus|add|b|#|\d)*)(?:\/([A-G][b#]?))?$/;
  const match = trimmed.match(chordRegex);

  if (!match) return normalized;

  const [, originalNote, type, bassNote] = match;

  const transposeNote = (n) => {
    const idx = getNoteIndex(n);
    if (idx === -1) return n;
    const newIdx = (idx + amount + NOTES.length * 10) % NOTES.length;
    return NOTES[newIdx];
  };

  const newRoot = transposeNote(originalNote);
  const newBass = bassNote ? transposeNote(bassNote) : null;
  const cleanType = type === 'maj' ? '' : (type || '');

  return `${newRoot}${cleanType}${newBass ? `/${newBass}` : ''}`;
}

/**
 * Transposes text containing [Chord] tags, safely ignoring section tags and metadata
 */
export function transposeTextWithChords(text, amount = 0) {
  if (!text) return text;
  return text.replace(/\[([^\]]+)\]/g, (match, chord) => {
    const trimmed = chord.trim();
    if (
      trimmed.includes('@') ||
      /^(bpm|beats|time|intro|verse|verso|estrofa|prechorus|pre-chorus|chorus|coro|estribillo|bridge|puente|solo|outro|final|coda|hook|interlude)/i.test(trimmed)
    ) {
      return match;
    }
    return `[${transposeChord(chord, amount)}]`;
  });
}

// Section keywords to recognize section headers accurately
const SECTION_KEYWORDS = /^(intro|verse|verso|estrofa|prechorus|pre-chorus|precoro|pre-coro|chorus|coro|estribillo|bridge|puente|solo|outro|final|coda|hook|interlude|interludio|part|parte|seccion|sección|tema|acapella|instrumental|bloque)/i;

// Regex to test standard music chord notation
export const CHORD_REGEX = /^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*$/i;

/**
 * Normalizes and aligns 2-line chord notation (chords on line A, lyrics on line B)
 * into compact inline chord notation: "[C]Quiero [Em]ver, [F]quiero [G]entrar".
 * Preserves instrumental sections, standalone chord lines, and existing inline chords.
 */
export function alignChordsWithLyrics(text) {
  if (!text || typeof text !== 'string') return '';

  const lines = text.split('\n');
  const resultLines = [];
  let pendingChordLines = [];

  const isChordName = (str) => {
    if (!str) return false;
    const clean = str.replace(/[\[\]]/g, '').trim();
    if (!clean || clean === '|' || clean === '𝄾' || clean === '𝄽' || clean === '/') return false;
    return CHORD_REGEX.test(clean);
  };

  const isSectionHeader = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Check bracketed header: [Intro @ 0.0], [Verse 1], [Parte A], etc.
    const bracketMatch = trimmed.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*([0-9:.]+))?\s*\]$/);
    if (bracketMatch) {
      const inner = bracketMatch[1].trim();
      return (
        bracketMatch[2] !== undefined ||
        SECTION_KEYWORDS.test(inner) ||
        !CHORD_REGEX.test(inner)
      );
    }

    // Check colon header: 'Verse 1:'
    const colonMatch = trimmed.match(/^([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]+):$/);
    if (colonMatch && SECTION_KEYWORDS.test(colonMatch[1].trim())) {
      return true;
    }

    return false;
  };

  const isMetadataTag = (line) => {
    const trimmed = line.trim();
    return /^\[\s*(?:BPM|Beats|Time|TimeSignature|YouTube)\s*[@:]?\s*[^\]]+\]$/i.test(trimmed);
  };

  const isChordOnlyLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (isSectionHeader(line) || isMetadataTag(line)) return false;

    // Check bracketed chords: '[G]   [F#m7] [B7]'
    if (/\[[^\]]+\]/.test(line)) {
      const withoutChords = line.replace(/\[[^\]]+\]/g, '');
      const validChords = (line.match(/\[[^\]]+\]/g) || []).every((ch) => isChordName(ch));
      return validChords && /^[\s|/\\.:\-_0-9]*$/.test(withoutChords);
    }

    // Check unbracketed chords: 'G   F#m7   B7'
    const tokens = trimmed.split(/\s+/);
    if (tokens.length > 0 && tokens.every((t) => isChordName(t) || t === '|' || t === '/' || /^x\d+$/i.test(t))) {
      return true;
    }

    return false;
  };

  const extractChordsFromLine = (line) => {
    const chords = [];
    let col = 0;

    if (/\[[^\]]+\]/.test(line)) {
      const parts = line.split(/(\[[^\]]+\])/g);
      parts.forEach((part) => {
        if (!part) return;
        if (part.startsWith('[') && part.endsWith(']')) {
          const chord = part.slice(1, -1).trim();
          if (chord && chord !== '|' && isChordName(chord)) {
            chords.push({ chord, col });
            col += chord.length;
          }
        } else {
          col += part.length;
        }
      });
    } else {
      const parts = line.split(/(\s+)/);
      parts.forEach((part) => {
        if (!part) return;
        const trimmed = part.trim();
        if (trimmed && isChordName(trimmed)) {
          chords.push({ chord: trimmed, col });
        }
        col += part.length;
      });
    }

    return chords;
  };

  const mergeChordsIntoLyric = (chords, lyricLine) => {
    if (!chords || chords.length === 0) return lyricLine;

    const words = [];
    const regex = /\S+/g;
    let match;
    while ((match = regex.exec(lyricLine)) !== null) {
      words.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
        chords: [],
      });
    }

    if (words.length === 0) {
      return chords.map((c) => `[${c.chord}]`).join(' ');
    }

    let lastAssignedWordIdx = -1;
    const trailingChords = [];

    for (let ci = 0; ci < chords.length; ci++) {
      const c = chords[ci];
      let bestWordIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        let dist;
        if (c.col >= w.start && c.col <= w.end) {
          dist = 0;
        } else if (c.col < w.start) {
          dist = w.start - c.col;
        } else {
          dist = c.col - w.end;
        }

        if (w.chords.length > 0) {
          dist += 2;
        }

        if (dist < minDistance && i >= lastAssignedWordIdx) {
          minDistance = dist;
          bestWordIdx = i;
        }
      }

      if (bestWordIdx === -1 || (c.col > words[words.length - 1].end + 4 && lastAssignedWordIdx === words.length - 1)) {
        trailingChords.push(c.chord);
      } else {
        words[bestWordIdx].chords.push(c.chord);
        lastAssignedWordIdx = bestWordIdx;
      }
    }

    let result = '';
    let lastIndex = 0;

    words.forEach((w) => {
      result += lyricLine.substring(lastIndex, w.start);
      w.chords.forEach((ch) => {
        result += `[${ch}]`;
      });
      result += w.word;
      lastIndex = w.end;
    });

    result += lyricLine.substring(lastIndex);

    if (trailingChords.length > 0) {
      result += ' ' + trailingChords.map((ch) => `[${ch}]`).join(' ');
    }

    return result;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (pendingChordLines.length > 0) {
        pendingChordLines.forEach((cl) => resultLines.push(cl));
        pendingChordLines = [];
      }
      resultLines.push('');
      continue;
    }

    if (isMetadataTag(line)) {
      if (pendingChordLines.length > 0) {
        pendingChordLines.forEach((cl) => resultLines.push(cl));
        pendingChordLines = [];
      }
      resultLines.push(line);
      continue;
    }

    if (isSectionHeader(line)) {
      if (pendingChordLines.length > 0) {
        pendingChordLines.forEach((cl) => resultLines.push(cl));
        pendingChordLines = [];
      }
      resultLines.push(line);
      continue;
    }

    if (isChordOnlyLine(line)) {
      pendingChordLines.push(line);
      continue;
    }

    // It is a lyrics line
    if (pendingChordLines.length > 0) {
      const allChords = [];
      pendingChordLines.forEach((cl) => {
        allChords.push(...extractChordsFromLine(cl));
      });
      pendingChordLines = [];

      resultLines.push(mergeChordsIntoLyric(allChords, line));
    } else {
      resultLines.push(line);
    }
  }

  if (pendingChordLines.length > 0) {
    pendingChordLines.forEach((cl) => resultLines.push(cl));
  }

  return resultLines.join('\n');
}
