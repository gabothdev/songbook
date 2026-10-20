export const CHORD_DATABASE = {
  C: { chordName: 'C', frets: 'x32010', fingers: '032010', position: 1, barres: [], type: 'major' },
  Em: { chordName: 'Em', frets: '022000', fingers: '023000', position: 1, barres: [], type: 'minor' },
  F: { chordName: 'F', frets: '133211', fingers: '134211', position: 1, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'major' },
  G: { chordName: 'G', frets: '320033', fingers: '210034', position: 1, barres: [], type: 'major' },
  Am: { chordName: 'Am', frets: 'x02210', fingers: '002310', position: 1, barres: [], type: 'minor' },
  Dm: { chordName: 'Dm', frets: 'xx0231', fingers: '000231', position: 1, barres: [], type: 'minor' },
  D: { chordName: 'D', frets: 'xx0232', fingers: '000132', position: 1, barres: [], type: 'major' },
  Bm: { chordName: 'Bm', frets: 'x24432', fingers: '013421', position: 2, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'minor' },
  A: { chordName: 'A', frets: 'x02220', fingers: '001230', position: 1, barres: [], type: 'major' },
  E: { chordName: 'E', frets: '022100', fingers: '023100', position: 1, barres: [], type: 'major' },
  E7: { chordName: 'E7', frets: '020100', fingers: '020100', position: 1, barres: [], type: 'dominant' },
  G7: { chordName: 'G7', frets: '320001', fingers: '320001', position: 1, barres: [], type: 'dominant' },
  'F#m': { chordName: 'F#m', frets: '244222', fingers: '134111', position: 2, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'minor' },
  'Gbm': { chordName: 'Gbm', frets: '244222', fingers: '134111', position: 2, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'minor' },
  'C#m': { chordName: 'C#m', frets: 'x46654', fingers: '013421', position: 4, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'minor' },
  'Dbm': { chordName: 'Dbm', frets: 'x46654', fingers: '013421', position: 4, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'minor' },
  B: { chordName: 'B', frets: 'x24442', fingers: '012341', position: 2, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'major' },
  Bb: { chordName: 'Bb', frets: 'x13331', fingers: '012341', position: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'major' },
  'A#': { chordName: 'A#', frets: 'x13331', fingers: '012341', position: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'major' },
  Bbm: { chordName: 'Bbm', frets: 'x13321', fingers: '013421', position: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'minor' },
  'A#m': { chordName: 'A#m', frets: 'x13321', fingers: '013421', position: 1, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'minor' },
  Eb: { chordName: 'Eb', frets: 'x68886', fingers: '012341', position: 6, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'major' },
  'D#': { chordName: 'D#', frets: 'x68886', fingers: '012341', position: 6, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'major' },
  Ebm: { chordName: 'Ebm', frets: 'x68876', fingers: '013421', position: 6, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'minor' },
  'D#m': { chordName: 'D#m', frets: 'x68876', fingers: '013421', position: 6, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'minor' },
  Ab: { chordName: 'Ab', frets: '466544', fingers: '134211', position: 4, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'major' },
  'G#': { chordName: 'G#', frets: '466544', fingers: '134211', position: 4, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'major' },
  Abm: { chordName: 'Abm', frets: '466444', fingers: '134111', position: 4, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'minor' },
  'G#m': { chordName: 'G#m', frets: '466444', fingers: '134111', position: 4, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'minor' },
  Db: { chordName: 'Db', frets: 'x46664', fingers: '012341', position: 4, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'major' },
  'C#': { chordName: 'C#', frets: 'x46664', fingers: '012341', position: 4, barres: [{ fromString: 5, toString: 1, fret: 1 }], type: 'major' },
  Gb: { chordName: 'Gb', frets: '244322', fingers: '134211', position: 2, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'major' },
  'F#': { chordName: 'F#', frets: '244322', fingers: '134211', position: 2, barres: [{ fromString: 6, toString: 1, fret: 1 }], type: 'major' },
};

/**
 * In-memory cache for dynamically loaded songs from SQLite database / external search.
 */
export const SAMPLE_SONGS_DATA = {};

