import axios from 'axios';
import { songsterrToAlphaTex } from './songsterrConverter.js';

const CLOUDFRONT_HOSTS = [
  'dqsljvtekg760.cloudfront.net',
  'd34shlm8p2ums2.cloudfront.net',
  'd3cqchs6g3b5ew.cloudfront.net'
];

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://www.songsterr.com/',
  'Connection': 'close'
};

/**
 * Mapea las sílabas líricas de la pista vocal a cada compás y tiempo fraccional del instrumento activo.
 * En la notación de Songsterr / Guitar Pro, los guiones y espacios dividen las sílabas por nota cantada.
 */
export function buildLyricsMap(vocalPart, targetPart = null) {
  if (!vocalPart || !vocalPart.newLyrics?.[0]?.text) return {};
  const rawText = vocalPart.newLyrics[0].text;
  // Dividir por espacios y guiones preservando el guion (ej: "la-dy" -> ["la-", "dy"])
  const tokens = rawText.trim().split(/\s+|(?<=-)/);
  if (tokens.length === 0) return {};

  function getBeatsWithTimings(measure) {
    const beats = measure.voices?.[0]?.beats || [];
    let currentOffset = 0;
    return beats.map((b, beatIndex) => {
      const dur = b.duration && Array.isArray(b.duration)
        ? (b.duration[0] / b.duration[1])
        : (1 / (b.type || 4));
      const start = currentOffset;
      const end = currentOffset + dur;
      currentOffset += dur;
      const isRest = !b.notes?.length || !!b.rest || (b.notes.length === 1 && b.notes[0].fret === undefined);
      return { beat: b, beatIndex, start, end, isRest, tokens: [] };
    });
  }

  let tokenIdx = 0;
  const lyricsByMeasure = {};

  (vocalPart.measures || []).forEach((vMeas, mIdx) => {
    lyricsByMeasure[mIdx] = [];
    const vBeats = getBeatsWithTimings(vMeas);

    // Extraer sílabas cantadas en este compás de voz con sus intervalos de tiempo
    const vItems = [];
    vBeats.forEach(vb => {
      if (!vb.isRest && vb.beat.notes?.length > 0 && !vb.beat.notes[0].tie) {
        if (tokenIdx < tokens.length) {
          const rawToken = tokens[tokenIdx++];
          const cleanToken = rawToken.replace(/^_+|_+$/g, '').replace(/["\\]/g, '');
          if (cleanToken && cleanToken !== '()') {
            vItems.push({ start: vb.start, end: vb.end, token: cleanToken });
          }
        }
      }
    });

    if (vItems.length === 0) return;

    // Si el instrumento visualizado es la voz misma o no se pasa otro instrumento:
    const tMeas = targetPart?.measures?.[mIdx];
    if (!tMeas || targetPart === vocalPart) {
      vItems.forEach(v => {
        lyricsByMeasure[mIdx].push({ offset: v.start, token: v.token });
      });
      return;
    }

    // Alinear con los pulsos del instrumento destino (guitarra, bajo, etc.)
    const tBeats = getBeatsWithTimings(tMeas);

    vItems.forEach(v => {
      // Candidatos que se solapan en tiempo con la sílaba
      let cand = tBeats.filter(t => (t.start <= v.start + 0.05 && t.end > v.start + 0.01) || (v.start <= t.start && v.end >= t.end));
      if (cand.length === 0) {
        cand = [tBeats.reduce((prev, curr) => Math.abs(curr.start - v.start) < Math.abs(prev.start - v.start) ? curr : prev)];
      }
      // Si hay notas sonadas (no silencios) en los candidatos, preferir la primera nota sonada
      const noteCand = cand.filter(t => !t.isRest);
      const target = noteCand.length > 0 ? noteCand[0] : cand[0];
      target.tokens.push(v.token);
    });

    tBeats.forEach(tb => {
      if (tb.tokens.length > 0) {
        lyricsByMeasure[mIdx].push({
          offset: tb.start,
          beatIndex: tb.beatIndex,
          token: tb.tokens.join(' ')
        });
      }
    });
  });

  return lyricsByMeasure;
}

/**
 * Busca canciones en Songsterr por patrón de texto (título / artista)
 */
export async function searchSongsterr(query) {
  if (!query || !query.trim()) return [];
  const url = `https://www.songsterr.com/api/songs?size=15&pattern=${encodeURIComponent(query.trim())}`;
  const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
  const rawList = Array.isArray(response.data) ? response.data : [];

  return rawList.map(song => ({
    songId: song.songId,
    artistId: song.artistId,
    artist: song.artist,
    title: song.title,
    hasChords: !!song.hasChords,
    hasPlayer: !!song.hasPlayer,
    defaultTrack: song.defaultTrack ?? 0,
    popularTrack: song.popularTrack ?? song.defaultTrack ?? 0,
    popularTrackGuitar: song.popularTrackGuitar,
    popularTrackBass: song.popularTrackBass,
    popularTrackDrum: song.popularTrackDrum,
    popularTrackVocals: song.popularTrackVocals,
    tracks: (song.tracks || []).map((t, idx) => ({
      trackIndex: idx,
      instrumentId: t.instrumentId,
      instrument: t.instrument,
      name: t.name || t.instrument,
      tuning: t.tuning || [],
      difficulty: t.difficulty,
      views: t.views
    }))
  }));
}

/**
 * Obtiene los metadatos completos y la revisión activa de una canción en Songsterr
 */
export async function getSongsterrMeta(songId) {
  const url = `https://www.songsterr.com/api/meta/${songId}`;
  const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return response.data;
}

/**
 * Descarga el JSON de una pista específica (partId) desde Cloudfront
 */
export async function fetchSongsterrPart(songId, revisionId, image, partId) {
  let lastError = null;

  for (const host of CLOUDFRONT_HOSTS) {
    const partUrl = `https://${host}/${songId}/${revisionId}/${image}/${partId}.json`;
    try {
      const response = await axios.get(partUrl, {
        headers: { 'Accept': 'application/json, text/plain, */*' },
        timeout: 9000
      });
      if (response.data && response.data.measures) {
        return response.data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`No se pudo descargar la pista ${partId} de Songsterr`);
}

/**
 * Obtiene la partitura completa (metadatos + pistas + AlphaTex listo para AlphaTab con letra sincronizada)
 */
export async function getFullScore(songId, requestedPartId = null) {
  const meta = await getSongsterrMeta(songId);
  const revisionId = meta.latestRevisionId || meta.revisionId;
  const image = meta.image;

  if (!image || !revisionId) {
    throw new Error('La canción no tiene una revisión de partitura válida disponible.');
  }

  // Pista seleccionada: si no se especifica, usar popularTrackGuitar o defaultTrack
  const partId = requestedPartId !== null 
    ? Number(requestedPartId) 
    : (meta.popularTrackGuitar ?? meta.popularTrack ?? meta.defaultTrack ?? 0);

  const partData = await fetchSongsterrPart(songId, revisionId, image, partId);

  // Extraer video de YouTube enlazado y sus puntos de sincronización por compás
  let youtubeId = null;
  let videoPoints = null;

  try {
    const vpUrl = `https://www.songsterr.com/api/video-points/${songId}/${revisionId}/list`;
    const vpRes = await axios.get(vpUrl, {
      headers: { ...DEFAULT_HEADERS, 'Accept': 'application/json' },
      timeout: 6000
    });
    const vpList = Array.isArray(vpRes.data) ? vpRes.data : [];

    // Filtrar candidatos válidos con puntos de sincronización
    const validCandidates = vpList.filter(vp => Array.isArray(vp.points) && vp.points.length > 0);

    if (validCandidates.length > 0) {
      // Priorizar versión oficial de estudio: inicio inmediato en t≈0 (< 1.5s) y coincidencia con meta.videos
      validCandidates.sort((a, b) => {
        const aStart = a.points[0] ?? 999;
        const bStart = b.points[0] ?? 999;

        const aIsStudio = aStart >= 0 && aStart <= 1.5;
        const bIsStudio = bStart >= 0 && bStart <= 1.5;
        if (aIsStudio && !bIsStudio) return -1;
        if (!aIsStudio && bIsStudio) return 1;

        const aMeta = meta.videos?.find(v => (v.videoId === a.videoId || v.id === a.id) && v.status === 'done');
        const bMeta = meta.videos?.find(v => (v.videoId === b.videoId || v.id === b.id) && v.status === 'done');
        const aIsOriginal = aMeta && !aMeta.feature;
        const bIsOriginal = bMeta && !bMeta.feature;
        if (aIsOriginal && !bIsOriginal) return -1;
        if (!aIsOriginal && bIsOriginal) return 1;

        return Math.abs(aStart) - Math.abs(bStart);
      });

      const bestCandidate = validCandidates[0];
      youtubeId = bestCandidate.videoId;
      videoPoints = bestCandidate.points;
    }
  } catch (err) {
    console.warn('[Songsterr] No se pudieron obtener video-points sincronizados:', err.message);
  }

  // Fallback si la API de video-points no devolvió nada
  if (!youtubeId) {
    const primaryVideo = meta.videos?.find(v => v.status === 'done' && v.videoId) || meta.videos?.[0];
    youtubeId = primaryVideo?.videoId || null;
  }

  // Extraer letra de la pista vocal para alinearla con el instrumento
  let lyricsText = null;
  let vocalPart = null;
  const vocalTrackIndex = meta.popularTrackVocals !== undefined && meta.popularTrackVocals >= 0
    ? meta.popularTrackVocals
    : (meta.tracks || []).findIndex(t => t.instrument?.toLowerCase().includes('vocal') || t.name?.toLowerCase().includes('vocal'));

  if (vocalTrackIndex >= 0) {
    if (vocalTrackIndex === partId) {
      vocalPart = partData;
    } else {
      try {
        vocalPart = await fetchSongsterrPart(songId, revisionId, image, vocalTrackIndex);
      } catch (e) {
        console.warn('No se pudo descargar la pista vocal para alinear letra:', e.message);
      }
    }
  }

  if (vocalPart?.newLyrics?.[0]?.text) {
    lyricsText = vocalPart.newLyrics[0].text;
  } else if (partData?.newLyrics?.[0]?.text) {
    lyricsText = partData.newLyrics[0].text;
  }

  const lyricsByMeasure = buildLyricsMap(vocalPart || partData, partData);
  const alphaTex = songsterrToAlphaTex(meta, partData, lyricsByMeasure);

  return {
    songId: meta.songId,
    revisionId,
    image,
    title: meta.title,
    artist: meta.artist,
    youtubeId,
    videoPoints,
    lyrics: lyricsText,
    activePartId: partId,
    activePartName: partData.name || meta.tracks?.[partId]?.name || 'Pista Principal',
    activeTuning: partData.tuning || [],
    capo: partData.capo || 0,
    difficulty: meta.tracks?.[partId]?.difficulty || null,
    measuresCount: partData.measures?.length || 0,
    tracks: (meta.tracks || []).map((t, idx) => ({
      trackIndex: idx,
      instrumentId: t.instrumentId,
      instrument: t.instrument,
      name: t.name || t.instrument,
      tuning: t.tuning,
      difficulty: t.difficulty,
      views: t.views
    })),
    alphaTex,
    partData
  };
}
