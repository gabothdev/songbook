import express from 'express';
import { PrismaClient } from '@prisma/client';
import { searchSongsterr, getFullScore, fetchSongsterrPart } from '../services/songsterr.js';
import { songsterrToAlphaTex } from '../services/songsterrConverter.js';
import { searchTangoScores, getTangoScoreDetails } from '../services/todotango.js';
import { digitizeScoreImage } from '../services/omrDigitizer.js';
import { digitizeWithAudiveris, isAudiverisAvailable } from '../services/audiverisService.js';
import { searchUnifiedScores, loadOrImportScore, getScoreFileStream } from '../services/sources/unifiedScoresService.js';

const router = express.Router();
const prisma = new PrismaClient();

// ================= RUTAS UNIFICADAS MULTI-FUENTE =================

// Búsqueda unificada en fuentes externas y catálogo (sin exponer URLs de terceros)
router.get('/unified/search', async (req, res) => {
  try {
    const { q, source } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, count: 0, results: [] });
    }

    const results = await searchUnifiedScores(q, source || 'all');
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('[Scores API] Error en búsqueda unificada:', err.message);
    res.status(500).json({ success: false, message: 'Error en búsqueda: ' + err.message });
  }
});

// Cargar o importar partitura al almacenamiento interno privado
router.get('/unified/load/:source/:sourceId', async (req, res) => {
  try {
    const { source, sourceId } = req.params;
    const result = await loadOrImportScore(source, sourceId);
    res.json(result);
  } catch (err) {
    console.error(`[Scores API] Error cargando partitura ${req.params.source}/${req.params.sourceId}:`, err.message);
    res.status(500).json({ success: false, message: 'Error al cargar la partitura: ' + err.message });
  }
});

// Streaming interno de archivo binario privado (.mid, .mxl, .gp) directamente a AlphaTab
router.get('/unified/stream/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const { stream, mimeType, fileSize } = getScoreFileStream(fileId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  } catch (err) {
    console.error(`[Scores API] Error transmitiendo archivo ${req.params.fileId}:`, err.message);
    res.status(404).json({ success: false, message: 'Archivo de partitura no encontrado' });
  }
});

// 1. Buscar canciones en Songsterr en vivo
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, results: [] });
    }
    const results = await searchSongsterr(q);
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('[Scores API] Error en búsqueda de Songsterr:', err.message);
    res.status(500).json({ success: false, message: 'Error al buscar en Songsterr: ' + err.message });
  }
});

// 2. Obtener partitura completa desde Songsterr
router.get('/songsterr/:songId', async (req, res) => {
  try {
    const songId = Number(req.params.songId);
    const partId = req.query.partId !== undefined ? Number(req.query.partId) : null;

    if (!songId || isNaN(songId)) {
      return res.status(400).json({ success: false, message: 'ID de canción inválido' });
    }

    const scoreData = await getFullScore(songId, partId);
    res.json({ success: true, score: scoreData });
  } catch (err) {
    console.error(`[Scores API] Error al cargar partitura ${req.params.songId}:`, err.message);
    res.status(500).json({ success: false, message: 'No se pudo cargar la partitura: ' + err.message });
  }
});

// 3. Cambiar de pista/instrumento en caliente
router.get('/songsterr/:songId/part/:partId', async (req, res) => {
  try {
    const songId = Number(req.params.songId);
    const partId = Number(req.params.partId);

    const scoreData = await getFullScore(songId, partId);

    res.json({
      success: true,
      partId,
      name: scoreData.activePartName,
      tuning: scoreData.activeTuning,
      capo: scoreData.capo || 0,
      measuresCount: scoreData.measuresCount,
      alphaTex: scoreData.alphaTex,
      partData: scoreData.partData,
      youtubeId: scoreData.youtubeId,
      videoPoints: scoreData.videoPoints
    });
  } catch (err) {
    console.error(`[Scores API] Error al cambiar a pista ${req.params.partId}:`, err.message);
    res.status(500).json({ success: false, message: 'Error al obtener la pista solicitada' });
  }
});

// 3b. Buscar partituras de Tango en TodoTango
router.get('/tango/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, results: [] });
    }
    const results = await searchTangoScores(q);
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('[Scores API] Error en búsqueda de Tango:', err.message);
    res.status(500).json({ success: false, message: 'Error al buscar en TodoTango: ' + err.message });
  }
});

// 3c. Obtener partitura histórica y grabaciones de Tango
router.get('/tango/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const scoreData = await getTangoScoreDetails(id);
    res.json({ success: true, score: scoreData });
  } catch (err) {
    console.error(`[Scores API] Error al cargar partitura de Tango ${req.params.id}:`, err.message);
    res.status(500).json({ success: false, message: 'No se pudo cargar la partitura de Tango: ' + err.message });
  }
});

// 4. Catálogo de partituras guardadas en la base de datos (SQLite)
router.get('/library', async (req, res) => {
  try {
    const scores = await prisma.scoreSheet.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    const parsedScores = scores.map(s => ({
      ...s,
      tracks: s.tracks ? JSON.parse(s.tracks) : [],
      songData: s.songData ? JSON.parse(s.songData) : null
    }));

    res.json({ success: true, count: parsedScores.length, scores: parsedScores });
  } catch (err) {
    console.error('[Scores API] Error al obtener biblioteca de partituras:', err.message);
    res.status(500).json({ success: false, message: 'Error al consultar la biblioteca de partituras' });
  }
});

// 5. Guardar / Añadir partitura a la biblioteca del cuaderno
router.post('/library', async (req, res) => {
  try {
    const { id, songsterrId, title, artist, defaultTrack, tracks, songData, filePath } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ success: false, message: 'Título y artista requeridos' });
    }

    let saved;
    const tracksStr = tracks ? (typeof tracks === 'string' ? tracks : JSON.stringify(tracks)) : null;
    const songDataStr = songData ? (typeof songData === 'string' ? songData : JSON.stringify(songData)) : null;

    if (id) {
      saved = await prisma.scoreSheet.upsert({
        where: { id },
        update: {
          title,
          artist,
          defaultTrack: defaultTrack ?? 0,
          tracks: tracksStr,
          songData: songDataStr,
          filePath: filePath || null
        },
        create: {
          id,
          songsterrId: songsterrId ? Number(songsterrId) : null,
          title,
          artist,
          defaultTrack: defaultTrack ?? 0,
          tracks: tracksStr,
          songData: songDataStr,
          filePath: filePath || null
        }
      });
    } else if (songsterrId) {
      saved = await prisma.scoreSheet.upsert({
        where: { songsterrId: Number(songsterrId) },
        update: {
          title,
          artist,
          defaultTrack: defaultTrack ?? 0,
          tracks: tracksStr,
          songData: songDataStr,
          filePath: filePath || null
        },
        create: {
          songsterrId: Number(songsterrId),
          title,
          artist,
          defaultTrack: defaultTrack ?? 0,
          tracks: tracksStr,
          songData: songDataStr,
          filePath: filePath || null
        }
      });
    } else {
      // Partitura digitalizada u OMR sin songsterrId
      saved = await prisma.scoreSheet.create({
        data: {
          title,
          artist,
          defaultTrack: defaultTrack ?? 0,
          tracks: tracksStr,
          songData: songDataStr,
          filePath: filePath || null
        }
      });
    }

    res.json({ success: true, score: saved });
  } catch (err) {
    console.error('[Scores API] Error al guardar partitura en biblioteca:', err.message);
    res.status(500).json({ success: false, message: 'Error al guardar la partitura: ' + err.message });
  }
});

// 6. Eliminar partitura de la biblioteca del cuaderno
router.delete('/library/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.scoreSheet.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Partitura eliminada de la biblioteca' });
  } catch (err) {
    console.error(`[Scores API] Error al eliminar partitura ${req.params.id}:`, err.message);
    res.status(500).json({ success: false, message: 'No se pudo eliminar la partitura' });
  }
});

// 7. Estado de motores OMR disponibles
router.get('/digitize/engines', (req, res) => {
  res.json({
    success: true,
    engines: {
      audiveris: isAudiverisAvailable(),
      gemini: true
    }
  });
});

// 8. Digitalización OMR de partituras (Audiveris o Gemini Vision)
router.post('/digitize', async (req, res) => {
  try {
    const { imageSource, imageUrl, imageData, metadata, apiKey, engine } = req.body;
    const source = imageSource || imageUrl || imageData;

    if (!source) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una imagen (URL o base64) para digitalizar la partitura'
      });
    }

    // Si se solicita explícitamente Audiveris o si el usuario no tiene API Key de Gemini
    if (engine === 'audiveris') {
      console.log(`[Scores API] Iniciando OMR con motor Audiveris para: ${metadata?.title || 'Partitura desconocida'}`);
      const result = await digitizeWithAudiveris(source, metadata || {});
      return res.json(result);
    }

    const key = apiKey || req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    console.log(`[Scores API] Iniciando digitalización OMR para: ${metadata?.title || 'Partitura desconocida'} (Motor: ${engine || 'Gemini'}, API Key: ${key ? 'Sí' : 'No'})`);
    const result = await digitizeScoreImage(source, metadata || {}, key);

    res.json(result);
  } catch (err) {
    console.error('[Scores API] Error en digitalización OMR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al digitalizar la partitura: ' + err.message
    });
  }
});

export default router;
