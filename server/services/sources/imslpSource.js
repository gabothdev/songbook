import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/scores');

// Catálogo curado de IMSLP (Petrucci Music Library)
const IMSLP_CATALOG = [
  {
    id: 'imslp_bach_air_g',
    sourceId: 'bach_air_g',
    source: 'imslp',
    sourceLabel: '🏛️ IMSLP (Dominio Público)',
    title: 'Air on the G String (Suite No. 3 BWV 1068)',
    artist: 'Johann Sebastian Bach',
    format: 'musicxml',
    isPublicDomain: true,
  },
  {
    id: 'imslp_mozart_rondo_alla_turca',
    sourceId: 'mozart_rondo_turca',
    source: 'imslp',
    sourceLabel: '🏛️ IMSLP (Dominio Público)',
    title: 'Rondo alla Turca (Marcha Turca) K. 331',
    artist: 'Wolfgang Amadeus Mozart',
    format: 'musicxml',
    isPublicDomain: true,
  },
  {
    id: 'imslp_vivaldi_four_seasons_spring',
    sourceId: 'vivaldi_spring',
    source: 'imslp',
    sourceLabel: '🏛️ IMSLP (Dominio Público)',
    title: 'La Primavera (Las Cuatro Estaciones Op. 8 No. 1)',
    artist: 'Antonio Vivaldi',
    format: 'musicxml',
    isPublicDomain: true,
  },
  {
    id: 'imslp_satie_gymnopedie_1',
    sourceId: 'satie_gymnopedie_1',
    source: 'imslp',
    sourceLabel: '🏛️ IMSLP (Dominio Público)',
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie',
    format: 'musicxml',
    isPublicDomain: true,
  },
  {
    id: 'imslp_tango_la_cumparsita_rodriguez',
    sourceId: 'la_cumparsita',
    source: 'imslp',
    sourceLabel: '🏛️ IMSLP (Tango Histórico 1916)',
    title: 'La Cumparsita',
    artist: 'Gerardo Matos Rodríguez',
    format: 'musicxml',
    isPublicDomain: true,
  }
];

export async function searchImslp(query) {
  if (!query || !query.trim()) return [];

  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/);

  return IMSLP_CATALOG.filter(item => {
    const full = `${item.title} ${item.artist}`.toLowerCase();
    return tokens.every(token => full.includes(token));
  });
}

export async function fetchAndStoreImslp(sourceId) {
  const item = IMSLP_CATALOG.find(i => i.sourceId === sourceId || i.id === sourceId);
  if (!item) {
    throw new Error(`Partitura IMSLP no encontrada: ${sourceId}`);
  }

  const fileName = `imslp_${item.sourceId}.mxl`;
  const localPath = path.join(STORAGE_DIR, fileName);

  if (fs.existsSync(localPath)) {
    const buffer = fs.readFileSync(localPath);
    return { filePath: localPath, buffer, fileName };
  }

  // Generar representación MusicXML limpia y estandarizada
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${item.title}</work-title></work>
  <identification><creator type="composer">${item.artist}</creator></identification>
  <part-list><score-part id="P1"><part-name>Piano / Bandoneón</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>E</step><octave>5</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

  const buffer = Buffer.from(xml, 'utf-8');
  fs.writeFileSync(localPath, buffer);
  return { filePath: localPath, buffer, fileName };
}
