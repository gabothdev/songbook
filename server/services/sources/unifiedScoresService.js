import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchSongsterr, getFullScore } from '../songsterr.js';
import { searchTangoScores, getTangoScoreDetails } from '../todotango.js';
import { searchMidiArchive, fetchAndStoreMidi } from './midiArchiveSource.js';
import { searchOpenScore, fetchAndStoreOpenScore } from './openScoreSource.js';
import { searchImslp, fetchAndStoreImslp } from './imslpSource.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/scores');

/**
 * Búsqueda agregada a través de las 6 fuentes sin exponer URLs externas
 * @param {string} query 
 * @param {string} sourceFilter 'all' | 'songsterr' | 'tango' | 'midi' | 'classical'
 * @returns {Promise<Array>}
 */
export async function searchUnifiedScores(query, sourceFilter = 'all') {
  if (!query || !query.trim()) return [];

  const results = [];
  const q = query.trim();

  const runSongsterr = sourceFilter === 'all' || sourceFilter === 'songsterr';
  const runTango = sourceFilter === 'all' || sourceFilter === 'tango';
  const runMidi = sourceFilter === 'all' || sourceFilter === 'midi';
  const runClassical = sourceFilter === 'all' || sourceFilter === 'classical';

  // 1. Songsterr (Tablaturas multitrack modernas)
  const songsterrPromise = runSongsterr
    ? searchSongsterr(q)
        .then(items => items.map(i => ({
          id: `songsterr_${i.songId}`,
          source: 'songsterr',
          sourceId: String(i.songId),
          sourceLabel: '🎸 Songsterr (Multitrack)',
          title: i.title,
          artist: i.artist,
          format: 'tab',
          hasAudio: true,
          tracksCount: i.tracksCount || 1,
          isPublicDomain: false
        })))
        .catch(err => {
          console.warn('[UnifiedScores] Error en Songsterr:', err.message);
          return [];
        })
    : Promise.resolve([]);

  // 2. TodoTango (Partituras históricas de tango)
  const tangoPromise = runTango
    ? searchTangoScores(q)
        .then(items => items.map(i => ({
          id: `tango_${i.id}`,
          source: 'todotango',
          sourceId: String(i.id),
          sourceLabel: '🎻 Archivo Tango (Histórico)',
          title: i.title,
          artist: i.composer || 'Tradicional',
          lyricist: i.lyricist || '',
          format: 'historical_scan',
          hasAudio: !!i.audioUrl,
          pagesCount: i.pagesCount || 1,
          isPublicDomain: true
        })))
        .catch(err => {
          console.warn('[UnifiedScores] Error en TodoTango:', err.message);
          return [];
        })
    : Promise.resolve([]);

  // 3. BitMidi (Colección Multitrack MIDI)
  const midiPromise = runMidi
    ? searchMidiArchive(q)
        .catch(err => {
          console.warn('[UnifiedScores] Error en MIDI Archive:', err.message);
          return [];
        })
    : Promise.resolve([]);

  // 4 & 5. OpenScore & IMSLP (Dominio Público Clásico / Tango Antiguo)
  const classicalPromise = runClassical
    ? Promise.all([searchOpenScore(q), searchImslp(q)])
        .then(([openItems, imslpItems]) => [...openItems, ...imslpItems])
        .catch(err => {
          console.warn('[UnifiedScores] Error en Clásicos:', err.message);
          return [];
        })
    : Promise.resolve([]);

  const [songsterrRes, tangoRes, midiRes, classicalRes] = await Promise.all([
    songsterrPromise,
    tangoPromise,
    midiPromise,
    classicalPromise
  ]);

  results.push(...songsterrRes, ...tangoRes, ...midiRes, ...classicalRes);

  return results;
}

/**
 * Carga o importa una partitura de cualquier fuente a la memoria/almacenamiento privado
 * @param {string} source 
 * @param {string} sourceId 
 * @returns {Promise<object>} Objeto de partitura estructurado para el atril interactivo
 */
export async function loadOrImportScore(source, sourceId) {
  if (source === 'songsterr') {
    const fullScore = await getFullScore(Number(sourceId));
    return {
      success: true,
      score: {
        id: `songsterr_${sourceId}`,
        source: 'songsterr',
        sourceId: String(sourceId),
        title: fullScore.title,
        artist: fullScore.artist,
        format: 'tab',
        alphaTex: fullScore.alphaTex,
        partData: fullScore.partData,
        tracks: fullScore.tracks,
        selectedTrackIndex: fullScore.selectedTrackIndex || 0,
        youtubeId: fullScore.youtubeId,
        videoPoints: fullScore.videoPoints,
        measuresCount: fullScore.measuresCount
      }
    };
  }

  if (source === 'todotango') {
    const scoreData = await getTangoScoreDetails(sourceId);
    return {
      success: true,
      score: {
        id: `tango_${sourceId}`,
        source: 'todotango',
        sourceId: String(sourceId),
        title: scoreData.title,
        artist: scoreData.composer,
        format: 'historical_scan',
        pages: scoreData.pages,
        audioUrl: scoreData.audioUrl,
        audioTitle: scoreData.audioTitle,
        youtubeId: scoreData.youtubeId,
        rhythm: scoreData.rhythm,
        year: scoreData.year
      }
    };
  }

  if (source === 'midi_archive') {
    const { filePath, buffer, fileName } = await fetchAndStoreMidi(sourceId);
    return {
      success: true,
      score: {
        id: `midi_${sourceId}`,
        source: 'midi_archive',
        sourceId: String(sourceId),
        title: `MIDI Score #${sourceId}`,
        artist: 'Colección MIDI',
        format: 'midi',
        streamUrl: `/api/scores/unified/stream/midi_${sourceId}`,
        fileName,
        fileSize: buffer.byteLength
      }
    };
  }

  if (source === 'openscore') {
    const { filePath, buffer, fileName } = await fetchAndStoreOpenScore(sourceId);
    return {
      success: true,
      score: {
        id: `openscore_${sourceId}`,
        source: 'openscore',
        sourceId: String(sourceId),
        title: `OpenScore ${sourceId}`,
        artist: 'Dominio Público',
        format: 'musicxml',
        streamUrl: `/api/scores/unified/stream/openscore_${sourceId}`,
        fileName,
        fileSize: buffer.byteLength
      }
    };
  }

  if (source === 'imslp') {
    const { filePath, buffer, fileName } = await fetchAndStoreImslp(sourceId);
    return {
      success: true,
      score: {
        id: `imslp_${sourceId}`,
        source: 'imslp',
        sourceId: String(sourceId),
        title: `IMSLP ${sourceId}`,
        artist: 'Petrucci Library',
        format: 'musicxml',
        streamUrl: `/api/scores/unified/stream/imslp_${sourceId}`,
        fileName,
        fileSize: buffer.byteLength
      }
    };
  }

  throw new Error(`Fuente no soportada: ${source}`);
}

/**
 * Obtiene el flujo binario de un archivo privado almacenado en disco
 * @param {string} fileId 
 * @returns {{ stream: fs.ReadStream, mimeType: string, fileSize: number }}
 */
export function getScoreFileStream(fileId) {
  // Buscar archivo coincidente en STORAGE_DIR
  const files = fs.readdirSync(STORAGE_DIR);
  const match = files.find(f => f.startsWith(fileId));

  if (!match) {
    throw new Error(`Archivo de partitura no encontrado: ${fileId}`);
  }

  const fullPath = path.join(STORAGE_DIR, match);
  const stat = fs.statSync(fullPath);

  let mimeType = 'application/octet-stream';
  if (match.endsWith('.mid') || match.endsWith('.midi')) {
    mimeType = 'audio/midi';
  } else if (match.endsWith('.musicxml') || match.endsWith('.xml')) {
    mimeType = 'application/xml';
  } else if (match.endsWith('.mxl')) {
    mimeType = 'application/vnd.recordare.musicxml+xml';
  } else if (match.endsWith('.gp') || match.endsWith('.gp5') || match.endsWith('.gpx')) {
    mimeType = 'application/x-guitar-pro';
  }

  return {
    stream: fs.createReadStream(fullPath),
    mimeType,
    fileSize: stat.size
  };
}
