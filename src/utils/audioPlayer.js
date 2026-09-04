import * as Tone from 'tone';
import GuitarAcousticOgg from 'tonejs-instrument-guitar-acoustic-ogg';
import { CHORD_DATABASE } from '../data/sampleSongs';

// Singleton instance of guitar acoustic samples
let guitarInstrument = null;
let readyPromise = null;

function getGuitarInstrument() {
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      guitarInstrument = new GuitarAcousticOgg({
        onload: () => resolve(guitarInstrument),
      });
      guitarInstrument.toDestination();
    });
  }
  return readyPromise;
}

const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_TO_SEMITONE = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11,
};

/**
 * Calculates absolute note names with octaves (e.g. ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']) from frets
 */
export function getNotesFromFrets(frets) {
  if (!frets) return [];
  const notes = [];
  let fretsArr = [];
  if (Array.isArray(frets)) {
    fretsArr = [...frets];
  } else if (typeof frets === 'string') {
    fretsArr = frets.padStart(6, 'x').split('');
  } else {
    return [];
  }

  // Base notes for strings 6 to 1 (E2, A2, D3, G3, B3, E4)
  const STRING_NOTES_BASE = [
    { noteIndex: 4, octave: 2 }, // E2 (6ª)
    { noteIndex: 9, octave: 2 }, // A2 (5ª)
    { noteIndex: 2, octave: 3 }, // D3 (4ª)
    { noteIndex: 7, octave: 3 }, // G3 (3ª)
    { noteIndex: 11, octave: 3 }, // B3 (2ª)
    { noteIndex: 4, octave: 4 },  // E4 (1ª)
  ];

  fretsArr.forEach((fretChar, i) => {
    if (fretChar.toLowerCase() === 'x') return;
    const fretNum = parseInt(fretChar, 36);
    if (isNaN(fretNum)) return;

    const base = STRING_NOTES_BASE[i];
    const totalSemitones = base.noteIndex + fretNum;
    const finalNoteIndex = totalSemitones % 12;
    const finalOctave = base.octave + Math.floor(totalSemitones / 12);

    notes.push(`${CHROMATIC_SCALE[finalNoteIndex]}${finalOctave}`);
  });

  return notes;
}

/**
 * Derives musical notes for any chord name if guitar fret diagram is not available
 */
export function getNotesFromChordName(chordName) {
  if (!chordName || chordName === '𝄾' || chordName === '𝄽') return [];

  // 1. Check known chord definitions first
  if (CHORD_DATABASE[chordName]?.frets) {
    const fromFrets = getNotesFromFrets(CHORD_DATABASE[chordName].frets);
    if (fromFrets.length > 0) return fromFrets;
  }

  // 2. Synthesize notes from harmonic theory
  const clean = chordName.trim();
  const match = clean.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return ['C3', 'E3', 'G3', 'C4'];

  const rootStr = match[1];
  const suffix = match[2] || '';
  const rootSemi = NOTE_TO_SEMITONE[rootStr] ?? 0;

  // Interval offsets from root
  let intervals = [0, 4, 7, 12]; // Default Major (1, 3, 5, 8)
  if (suffix.startsWith('m7') || suffix.startsWith('min7')) {
    intervals = [0, 3, 7, 10, 15];
  } else if (suffix.startsWith('m') || suffix.startsWith('min')) {
    intervals = [0, 3, 7, 12, 15]; // Minor
  } else if (suffix.startsWith('7')) {
    intervals = [0, 4, 7, 10, 16]; // Dominant 7
  } else if (suffix.startsWith('maj7')) {
    intervals = [0, 4, 7, 11, 16]; // Major 7
  } else if (suffix.startsWith('dim')) {
    intervals = [0, 3, 6, 9];
  } else if (suffix.startsWith('aug') || suffix.startsWith('+')) {
    intervals = [0, 4, 8, 12];
  } else if (suffix.startsWith('sus4')) {
    intervals = [0, 5, 7, 12];
  } else if (suffix.startsWith('sus2')) {
    intervals = [0, 2, 7, 12];
  }

  const baseOctave = 2; // E2-D3 range
  return intervals.map((interval) => {
    const totalSemi = rootSemi + interval;
    const noteIdx = (rootSemi + interval) % 12;
    const oct = baseOctave + Math.floor(totalSemi / 12) + (rootSemi < 4 ? 1 : 0);
    return `${CHROMATIC_SCALE[noteIdx]}${oct}`;
  });
}

/**
 * Play authentic strummed guitar chord with high quality samples
 */
export async function playStrummedChord(notesOrChordName, duration = '4n') {
  try {
    if (Tone.context.state !== 'running') {
      await Tone.start();
      await Tone.context.resume();
    }

    let notes = [];
    if (Array.isArray(notesOrChordName)) {
      notes = notesOrChordName;
    } else if (typeof notesOrChordName === 'string') {
      notes = getNotesFromChordName(notesOrChordName);
    }

    if (!notes || notes.length === 0) return;

    const inst = await getGuitarInstrument();

    // Sort notes from low to high frequency for natural strum
    const sortedNotes = [...notes].sort((a, b) => {
      return Tone.Frequency(a).toMidi() - Tone.Frequency(b).toMidi();
    });

    const now = Tone.now();
    const strumDelay = 0.035; // 35ms delay per string

    sortedNotes.forEach((note, i) => {
      inst.triggerAttackRelease(note, duration, now + i * strumDelay);
    });
  } catch (error) {
    console.warn('[AudioPlayer] Error playing guitar chord:', error);
  }
}
