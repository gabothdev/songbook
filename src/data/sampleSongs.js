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

export const SAMPLE_SONGS_DATA = {
  '3': {
    id: '3',
    title: 'Seminare',
    artist: 'Serú Girán',
    composer: 'Charly García',
    key: 'C',
    bpm: 76,
    timeSignature: '4/4',
    youtubeId: '1F8oHw1jW10',
    artistImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Seru_Giran_1978.jpg/800px-Seru_Giran_1978.jpg',
    albumCover: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/SeruGiran.jpg/500px-SeruGiran.jpg',
    uniqueChords: ['C', 'Em', 'F', 'G', 'Am', 'Dm'],
    sections: [
      { name: 'Intro', time: '0:00' },
      { name: 'Verso 1', time: '0:18' },
      { name: 'Estribillo', time: '0:54' },
      { name: 'Verso 2', time: '1:30' },
      { name: 'Solo / Outro', time: '2:20' },
    ],
    content: `[Intro]
[C]  [Em]  [F]  [G]
[C]  [Em]  [F]  [G]

[Verso 1]
[C]              [Em]
Quiero ver, quiero entrar
[F]             [G]
No me dejes fuera
[C]              [Em]
Hacer el amor, sin pensar
[F]             [G]
Todo el tiempo

[Pre-Coro]
[Am]             [Em]
No me dejes solo amor
[F]             [C]
Yo no sé vivir sin ti
[Dm]                 [F]
Si me falta tu calor
[G]
No puedo respirar

[Estribillo]
[C]        [Em]       [F]        [G]
Ah... no me dejes solo, ah... no me dejes ir
[C]        [Em]       [F]        [G]
Ah... te necesito tanto, no puedo vivir sin ti

[Verso 2]
[C]              [Em]
Siento el sol, en tu piel
[F]             [G]
Mientras nos amamos
[C]              [Em]
La distancia se acortó
[F]             [G]
Hoy estamos juntos

[Pre-Coro]
[Am]             [Em]
No te vayas por favor
[F]             [C]
Quédate esta noche aquí
[Dm]                 [F]
Que sin ti mi corazón
[G]
No sabe cómo latir

[Estribillo]
[C]        [Em]       [F]        [G]
Ah... no me dejes solo, ah... no me dejes ir
[C]        [Em]       [F]        [G]
Ah... te necesito tanto, no puedo vivir sin ti`
  },
  '1': {
    id: '1',
    title: 'Muchacha (Ojos de papel)',
    artist: 'Almendra',
    composer: 'Luis Alberto Spinetta',
    key: 'G',
    bpm: 118,
    timeSignature: '4/4',
    youtubeId: '3U221_HkX0s',
    artistImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Almendra_1969.jpg/800px-Almendra_1969.jpg',
    albumCover: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Almendra1969.jpg/500px-Almendra1969.jpg',
    uniqueChords: ['G', 'Em', 'C', 'D', 'Am'],
    sections: [
      { name: 'Intro', time: '0:00' },
      { name: 'Verso 1', time: '0:10' },
      { name: 'Estribillo', time: '0:45' },
    ],
    content: `[Intro]
[G]  [Em]  [C]  [D]

[Verso 1]
[G]          [Em]
Muchacha ojos de papel
[C]                 [D]
¿A dónde vas? Quédate hasta el alba
[G]          [Em]
Muchacha pequeños pies
[C]                 [D]
No corras más, quédate hasta el alba

[Estribillo]
[Am]             [D]
Sueña un sueño despacito entre mis manos
[G]         [Em]
Hasta que te caiga un manto de dolor
[C]         [D]                 [G]
Y duerme un poco y yo te cantaré`
  },
  '2': {
    id: '2',
    title: 'De Música Ligera',
    artist: 'Soda Stereo',
    composer: 'Gustavo Cerati / Zeta Bosio',
    key: 'Bm',
    bpm: 128,
    timeSignature: '4/4',
    youtubeId: 'T_FkEw27XJ0',
    artistImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Soda_Stereo_1985.jpg/800px-Soda_Stereo_1985.jpg',
    albumCover: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/Cancion_Animal.jpg/500px-Cancion_Animal.jpg',
    uniqueChords: ['Bm', 'G', 'D', 'A'],
    sections: [
      { name: 'Riff Intro', time: '0:00' },
      { name: 'Verso 1', time: '0:22' },
      { name: 'Coro', time: '0:52' },
    ],
    content: `[Intro]
[Bm]  [G]  [D]  [A]
[Bm]  [G]  [D]  [A]

[Verso 1]
[Bm]       [G]          [D]      [A]
Ella durmió al calor de las masas
[Bm]       [G]          [D]      [A]
Y yo desperté queriendo soñarla
[Bm]       [G]          [D]      [A]
Algún tiempo atrás pensé en escribirle
[Bm]       [G]          [D]      [A]
Que nunca sorteé las trampas del amor

[Coro]
[Bm]   [G]         [D]     [A]
De aquel amor de música ligera
[Bm]   [G]         [D]     [A]
Nada nos libra, nada más queda`
  }
};
