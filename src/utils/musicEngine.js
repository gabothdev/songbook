/**
 * MusicEngine.js for SongBook
 * Centralized musical logic for scales, intervals, and instrument tunings.
 */

export const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Unified chromatic scale for internal calculations (semitones 0-11)
export const CHROMATIC_INDEX = NOTES_SHARP;

export const TUNINGS = {
  guitar: {
    standard: [4, 11, 7, 2, 9, 4], // E4, B3, G3, D3, A2, E2 in semitones % 12
    stringNames: ['E', 'B', 'G', 'D', 'A', 'E'],
  },
};

export const INTERVAL_LABELS = {
  0: 'R',
  1: 'b2',
  2: '2',
  3: '3m',
  4: '3M',
  5: '4',
  6: 'b5',
  7: '5',
  8: 'b6',
  9: '6',
  10: '7m',
  11: '7M',
};

/**
 * Normalizes a note name to standard sharp representation.
 */
export function normalizeNote(note) {
  if (!note) return '';
  return note
    .toString()
    .trim()
    .replace(/[0-9]/g, '')
    .replace(/Bb/g, 'A#')
    .replace(/Db/g, 'C#')
    .replace(/Eb/g, 'D#')
    .replace(/Gb/g, 'F#')
    .replace(/Ab/g, 'G#')
    .replace(/bb/g, 'A#')
    .replace(/db/g, 'C#')
    .replace(/eb/g, 'D#')
    .replace(/gb/g, 'F#')
    .replace(/ab/g, 'G#');
}

/**
 * Gets the semitone index (0-11) for a given note name.
 */
export function getNoteSemitone(note) {
  const normalized = normalizeNote(note);
  return CHROMATIC_INDEX.indexOf(normalized);
}

/**
 * Calculates the note at a specific fret for an instrument.
 * @param {string} instrument - 'guitar'
 * @param {number} stringNum - 1-indexed (1 = 1st string / thinnest / highest pitch)
 * @param {number} fret - 0 for open
 */
export function getNoteAt(instrument, stringNum, fret) {
  const tuning = TUNINGS[instrument]?.standard;
  if (!tuning) return 0;
  const baseSemitone = tuning[stringNum - 1];
  return (baseSemitone + fret) % 12;
}

/**
 * Gets the musical interval label between a root note and another note/semitone.
 */
export function getIntervalLabel(root, noteOrSemitone) {
  const rootIdx = getNoteSemitone(root);
  let noteIdx;

  if (typeof noteOrSemitone === 'number') {
    noteIdx = noteOrSemitone;
  } else {
    noteIdx = getNoteSemitone(noteOrSemitone);
  }

  if (rootIdx === -1 || noteIdx === -1) return '';

  const semitones = (noteIdx - rootIdx + 12) % 12;
  return INTERVAL_LABELS[semitones] || '';
}

/**
 * Parses a chord name to find its root note.
 * Example: "C#m7/G" -> "C#"
 */
export function getChordRoot(chordName) {
  if (!chordName) return null;
  const match = chordName.match(/^[A-G][#b]?/);
  return match ? match[0] : null;
}
