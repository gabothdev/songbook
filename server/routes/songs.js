// server/routes/songs.js
import express from 'express';
import axios from 'axios';
import { 
  searchSongs as searchUG, 
  getSongContent as getUGContent,
  searchSongsOnCifraClub as searchCC,
  getSongContentFromCifraClub as getCCContent,
} from '../services/scraper.js';
import { getChordifyBeatGrid, searchSongsOnChordify } from '../services/chordify-scraper.js';
import prisma from '../services/db.js';
import { exec } from 'child_process';
import util from 'util';

const router = express.Router();
const execPromise = util.promisify(exec);

// Helper para formatear compases de vuelta a texto plano de acordes con secciones y timestamps
function formatCompasesToText(compases) {
  let textOutput = '';
  let lastSection = '';
  
  let i = 0;
  while (i < compases.length) {
    const compas1 = compases[i];
    
    // Si el compás inicia una nueva sección, agregar el encabezado de sección
    if (compas1.seccion && compas1.seccion !== lastSection) {
      const timeStr = compas1.secTime !== undefined && compas1.secTime !== null ? ` @ ${compas1.secTime.toFixed(1)}` : '';
      textOutput += `\n[${compas1.seccion}${timeStr}]\n`;
      lastSection = compas1.seccion;
    }
    
    // Si es un compás de silencio (ej. Intro con silencio)
    const isAllRest1 = compas1.acordes.every(ch => !ch || ch === '𝄾' || ch === '𝄽');
    if (isAllRest1) {
      const restCount = compas1.acordes.length;
      textOutput += `[𝄾 (${restCount}T)]\n`;
      i++;
      continue;
    }
    
    const compas2 = (i + 1 < compases.length && compases[i + 1].seccion === compas1.seccion) ? compases[i + 1] : null;
    
    const lyricText = (compas1.lyric || (compas2 && compas2.lyric) || '').trim();
    
    if (lyricText) {
      // Caso B: Línea mixta (tiene letra)
      const lineBeats = [...compas1.acordes];
      if (compas2) {
        lineBeats.push(...compas2.acordes);
      }
      
      const totalLineBeats = lineBeats.length;
      const lineChords = [];
      
      lineBeats.forEach((chord, beatIdx) => {
        if (chord && chord !== '𝄾' && chord !== '𝄽') {
          lineChords.push({ chord, beatIdx });
        }
      });
      
      if (lineChords.length === 0) {
        textOutput += `${lyricText}\n`;
      } else {
        let rebuiltLine = '';
        let lastCharIdx = 0;
        const cleanLength = lyricText.length;
        let lastChord = '';
        
        lineChords.forEach(c => {
          if (c.chord === lastChord) {
            return;
          }
          lastChord = c.chord;
          
          const divisor = totalLineBeats > 1 ? totalLineBeats - 1 : 1;
          const ratio = c.beatIdx / divisor;
          const charIdx = Math.min(cleanLength, Math.round(ratio * cleanLength));
          
          rebuiltLine += lyricText.substring(lastCharIdx, charIdx) + `[${c.chord}]`;
          lastCharIdx = charIdx;
        });
        rebuiltLine += lyricText.substring(lastCharIdx);
        textOutput += `${rebuiltLine}\n`;
      }
    } else {
      // Caso A: Línea con solo acordes. Preservar TODOS los acordes en cualquier tiempo del compás.
      const formatCompasChords = (c) => {
        if (!c || !c.acordes) return '';
        const distinct = [];
        let lastCh = null;
        c.acordes.forEach(ch => {
          const clean = (ch || '').trim();
          if (!clean) return;
          if (clean !== lastCh) {
            distinct.push(clean);
            lastCh = clean;
          }
        });
        if (distinct.length === 0) return '[𝄾]';
        return distinct.map(ch => `[${ch}]`).join(' ');
      };
      
      const str1 = formatCompasChords(compas1);
      const str2 = compas2 ? formatCompasChords(compas2) : '';
      
      textOutput += str2 ? `${str1}   ${str2}\n` : `${str1}\n`;
    }
    
    i += compas2 ? 2 : 1;
  }
  
  return textOutput.trim();
}

import youtubedl from 'youtube-dl-exec';

// Helper para obtener metadatos de YouTube instantáneamente vía oEmbed
async function getYouTubeMetadata(youtubeId) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
    const res = await axios.get(oembedUrl, { timeout: 4000 });
    const fullTitle = res.data.title || 'Canción de YouTube';
    const author = res.data.author_name || 'Artista';

    let title = fullTitle;
    let artist = author;

    if (fullTitle.includes(' - ')) {
      const parts = fullTitle.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    return { title, artist };
  } catch (e) {
    console.warn('[YouTube oEmbed] Error al obtener metadatos:', e.message);
    return {
      title: 'Canción de YouTube',
      artist: 'Artista'
    };
  }
}

// --- Ruta de Búsqueda de YouTube (Fase 4 - Auto-Playback) ---

// --- Ruta de Búsqueda de YouTube con múltiples opciones para selector visual ---

router.get('/search/youtube', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ message: 'Query is required.' });
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    // Fetch HTML from YouTube search page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es,en;q=0.9',
      },
      timeout: 6000,
    });

    const html = response.data;
    
    // Find all occurrences of "videoId":"XXXXXXXXXXX"
    const regex = /"videoId":\s*"([^"]{11})"/g;
    const matches = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
      if (matches.length >= 6) break;
    }

    if (matches.length > 0) {
      // Obtener metadatos rápidos de las primeras 4 opciones
      const topIds = matches.slice(0, 4);
      const videoOptions = await Promise.all(
        topIds.map(async (vId) => {
          const meta = await getYouTubeMetadata(vId);
          return {
            videoId: vId,
            title: meta.title || query,
            artist: meta.artist || 'YouTube',
            thumbnail: `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${vId}`,
          };
        })
      );

      res.json({
        videoId: matches[0],
        options: videoOptions,
      });
    } else {
      res.status(404).json({ message: 'No se encontraron videos.', options: [] });
    }
  } catch (error) {
    console.error('[API YouTube] Error al buscar video:', error.message);
    res.status(500).json({ message: `Error en el servidor al buscar video: ${error.message}`, options: [] });
  }
});

// --- Rutas de Búsqueda Separadas ---

router.get('/search/ultimate-guitar', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ message: 'Query is required.' });
  try {
    const results = await searchUG(query, req.signal);
    res.json(results);
  } catch (error) {
    if (error.name !== 'AbortError') {
      res.status(500).json({ message: error.message });
    }
  }
});

router.get('/search/cifra-club', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ message: 'Query is required.' });
  try {
    const results = await searchCC(query, req.signal);
    res.json(results);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[API Cifra Club] Error al buscar:', error.message);
      // Devolver array vacío en lugar de error 500 para que UG siga funcionando
      if (error.message.includes('Timeout') || error.message.includes('no se encontraron resultados')) {
        console.log('[API Cifra Club] Devolviendo resultados vacíos debido a timeout o cambios en la web');
        res.json([]);
      } else {
        res.status(500).json({ message: `Error en el servidor al buscar en Cifra Club: ${error.message}` });
      }
    }
  }
});

router.get('/search/chordify', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ message: 'Query is required.' });
  try {
    const results = await searchSongsOnChordify(query, req.signal);
    res.json(results);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[API Chordify] Error al buscar en Chordify:', error.message);
      res.status(500).json({ message: `Error en el servidor al buscar en Chordify: ${error.message}` });
    }
  }
});


// --- Ruta de Contenido Unificada ---

router.get('/content', async (req, res) => {
  const { url, source } = req.query;

  if (!url || !source) {
    return res.status(400).json({ message: 'Los parámetros "url" y "source" son requeridos.' });
  }

  try {
    let content;
    console.log(`(API) Solicitud de contenido para source: "${source}"`);

    // Decidir qué scraper usar basándose en el parámetro `source`
    if (source === 'Cifra Club') {
      content = await getCCContent(url, req.signal);
    } else if (source === 'Ultimate Guitar') {
      content = await getUGContent(url, req.signal);
    } else {
      return res.status(400).json({ message: `La fuente "${source}" no está soportada.` });
    }
    
    res.json({ content });
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error al obtener el contenido de la canción:', error.message);
      res.status(500).json({ message: error.message || 'Error interno del servidor al obtener el contenido.' });
    }
  }
});

// --- Ruta de Transcripción de YouTube con IA ---
router.post('/transcribe/youtube', async (req, res) => {
  const { youtubeId, method = 'chordify' } = req.body;
  if (!youtubeId) {
    return res.status(400).json({ message: 'El parámetro youtubeId es requerido.' });
  }

  try {
    console.log(`[IA Transcribe] Solicitando transcripción para video: ${youtubeId} usando método: ${method}`);

    // 1. Verificar si ya existe la canción transcrita en la base de datos
    let existingSong = await prisma.song.findFirst({
      where: { youtubeId }
    });

    if (existingSong && existingSong.syncData) {
      console.log(`[IA Transcribe] Encontrada en caché de BD: ${existingSong.title}`);
      const parsedCompases = JSON.parse(existingSong.syncData);
      const bpmValue = existingSong.bpm || 120;
      
      return res.json({
        status: "success",
        cached: true,
        bpm: bpmValue,
        title: existingSong.title,
        artist: existingSong.artist,
        text: existingSong.content,
        compases: parsedCompases
      });
    }

    let bpm = 120, compases = [], customText = null, barLength = 4;
    let scrapeSuccess = false;
    let songTitle = 'Canción de YouTube';
    let songArtist = 'Artista';

    // 2. Si el método es chordify, ejecutar scraping de acordes y BeatGrid
    if (method === 'chordify') {
      try {
        console.log(`[IA Transcribe] Ejecutando scraper de Chordify...`);
        const chordifyResult = await getChordifyBeatGrid(youtubeId);
        bpm = chordifyResult.bpm || 120;
        compases = chordifyResult.compases || [];
        barLength = chordifyResult.barLength || 4;
        if (chordifyResult.title) songTitle = chordifyResult.title;
        if (chordifyResult.artist) songArtist = chordifyResult.artist;
        if (chordifyResult.leadSheetText) {
          customText = chordifyResult.leadSheetText;
        }
        scrapeSuccess = true;
        console.log(`[IA Transcribe] Scraping de Chordify completado con éxito. BPM: ${bpm}, Título: ${songTitle}`);
      } catch (chordifyErr) {
        console.warn(`[IA Transcribe] Scraping de Chordify falló: ${chordifyErr.message}. Activando fallback de transcripción...`);
      }
    }

    // 3. Fallback de metadatos si no se obtuvieron de Chordify
    if (!songTitle || songTitle === 'Canción de YouTube') {
      const metadata = await getYouTubeMetadata(youtubeId);
      if (metadata.title) songTitle = metadata.title;
      if (metadata.artist) songArtist = metadata.artist;
    }

    // 4. Si el método es explícitamente 'local', ejecutar Demucs+Omnizart en WSL
    if (method === 'local' && !scrapeSuccess) {
      const wavPath = `/tmp/${youtubeId}.wav`;
      console.log(`[IA Transcribe] Descargando audio a: ${wavPath}`);
      const downloadCmd = `wsl -u gabomarchanta /home/gabomarchanta/chordbook-env/bin/yt-dlp --extractor-args "youtube:player_client=android,web" -x --audio-format wav -o "${wavPath}" "https://www.youtube.com/watch?v=${youtubeId}"`;
      await execPromise(downloadCmd);

      console.log(`[IA Transcribe] Ejecutando transcripción local (Omnizart & Librosa)...`);
      const transcribeCmd = `wsl -u gabomarchanta TF_USE_LEGACY_KERAS=1 TF_XLA_FLAGS="--tf_xla_auto_jit=-1" /home/gabomarchanta/chordbook-env/bin/python /mnt/e/Proyectos/chordbook/server/services/transcribe.py "${wavPath}"`;
      const { stdout } = await execPromise(transcribeCmd);

      try {
        await execPromise(`wsl -u gabomarchanta rm "${wavPath}"`);
      } catch (cleanupErr) {
        console.error('[IA Transcribe] Error al limpiar archivo temporal:', cleanupErr);
      }

      const result = JSON.parse(stdout);
      if (result.status === 'error') {
        throw new Error(result.message || 'Error en el script de transcripción de Python.');
      }

      bpm = result.bpm;
      compases = result.compases;
      scrapeSuccess = true;
    }

    // 4b. Fallback rítmico si compases está vacío
    if (!compases || compases.length === 0) {
      console.log(`[IA Transcribe] Generando cuadrícula rítmica estimada para "${songTitle}"`);
      compases = Array.from({ length: 16 }, (_, idx) => ({
        id: idx + 1,
        acordes: ['𝄾', '𝄾', '𝄾', '𝄾'],
        beatTimes: [idx * 2, idx * 2 + 0.5, idx * 2 + 1.0, idx * 2 + 1.5],
        seccion: idx < 4 ? 'Intro' : `Parte ${Math.floor((idx - 4) / 4) + 1}`,
        ...(idx % 4 === 0 ? { secTime: idx * 2 } : {})
      }));
    }

    const bpmHeader = `[BPM @ ${bpm}]\n[Beats @ ${barLength}]\n\n`;
    const contentText = bpmHeader + (customText || formatCompasesToText(compases));

    // 5. Guardar o actualizar la canción en la base de datos
    let song = await prisma.song.findFirst({
      where: { youtubeId }
    });

    if (!song && songTitle && songArtist && songTitle !== 'Canción de YouTube') {
      song = await prisma.song.findFirst({
        where: {
          title: { equals: songTitle.trim() },
          artist: { equals: songArtist.trim() }
        }
      });
    }

    if (song) {
      song = await prisma.song.update({
        where: { id: song.id },
        data: {
          title: songTitle,
          artist: songArtist,
          youtubeId,
          content: contentText,
          syncData: JSON.stringify(compases)
        }
      });
    } else {
      song = await prisma.song.create({
        data: {
          title: songTitle,
          artist: songArtist,
          content: contentText,
          youtubeId,
          syncData: JSON.stringify(compases)
        }
      });
    }

    console.log(`[IA Transcribe] Transcripción completada y guardada en BD: ${songTitle}`);

    res.json({
      status: "success",
      cached: false,
      bpm,
      title: songTitle,
      artist: songArtist,
      text: contentText,
      compases
    });

  } catch (error) {
    console.error('[IA Transcribe] Error durante la transcripción:', error.message);
    res.status(500).json({ message: `Error durante la transcripción: ${error.message}` });
  }
});

export default router; 