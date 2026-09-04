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
