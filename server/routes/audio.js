import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const CACHE_DIR = path.resolve(__dirname, '../cache/audio');
const YT_DLP_PATH = path.resolve(__dirname, '../node_modules/youtube-dl-exec/bin/yt-dlp.exe');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Track ongoing background download processes to avoid duplicate downloads
const activeDownloads = new Set();

function startBackgroundDownload(youtubeId) {
  if (activeDownloads.has(youtubeId)) return;
  activeDownloads.add(youtubeId);

  const outputPath = path.join(CACHE_DIR, `${youtubeId}.webm`);
  console.log(`[AudioStream] Iniciando descarga en segundo plano para ${youtubeId}...`);

  const child = spawn(
    YT_DLP_PATH,
    [
      '--extractor-args', 'youtube:player_client=android,web',
      '-f', 'ba/b',
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '-o', outputPath,
      `https://www.youtube.com/watch?v=${youtubeId}`,
    ],
    {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  child.on('close', (code) => {
    activeDownloads.delete(youtubeId);
    if (code === 0 && fs.existsSync(outputPath)) {
      console.log(`[AudioStream] ✅ Descarga completada para ${youtubeId} (${fs.statSync(outputPath).size} bytes)`);
    } else {
      console.warn(`[AudioStream] ⚠️ Descarga para ${youtubeId} finalizó con código: ${code}`);
    }
  });

  child.on('error', (err) => {
    activeDownloads.delete(youtubeId);
    console.error(`[AudioStream] Error en descarga de ${youtubeId}:`, err.message);
  });
}

/**
 * GET /api/audio/stream?youtubeId=...
 * Streams audio track for Tone.js PitchShift Web Audio processing.
 * Reads instantly from server/cache/audio/ if cached, or triggers background download.
 */
router.get('/stream', (req, res) => {
  const { youtubeId } = req.query;

  if (!youtubeId || typeof youtubeId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
    return res.status(400).json({ error: 'ID de YouTube inválido' });
  }

  // Check supported cached extensions
  const extensions = ['.webm', '.mp3', '.m4a', '.ogg', '.wav'];
  for (const ext of extensions) {
    const candidatePath = path.join(CACHE_DIR, `${youtubeId}${ext}`);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).size > 1000) {
      return streamFileWithRange(req, res, candidatePath);
    }
  }

  // If not cached, trigger background download and return 503 so frontend uses video audio while downloading
  startBackgroundDownload(youtubeId);
  return res.status(503).json({
    status: 'downloading',
    message: 'Pista de audio descargándose en segundo plano. Se reproducirá audio de YouTube mientras tanto.',
  });
});

/**
 * Streams an audio file with HTTP 206 Partial Content (Fast Seeking & Range Support)
 */
function streamFileWithRange(req, res, filePath) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(filePath).toLowerCase();

  const mimeMap = {
    '.mp4': 'audio/mp4',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm',
    '.wav': 'audio/wav',
  };
  const mimeType = mimeMap[ext] || 'audio/webm';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', mimeType);

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

export default router;
