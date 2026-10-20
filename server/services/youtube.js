import axios from 'axios';

/**
 * YouTube Music Filtering & Search Service
 * Emulates Chordify's music filtering logic:
 * - Rejects non-song content (podcasts, tutorials, lessons, reactions, full albums, live streams).
 * - Enforces music track duration bounds (1:15 to 12:00 minutes).
 * - Prioritizes official audio tracks (- Topic channels, Official Audio, Verified Artist channels).
 */

const DURATION_MIN_SEC = 75;  // 1:15 min
const DURATION_MAX_SEC = 720; // 12:00 min

const NEGATIVE_TITLE_PATTERNS = [
  /tutorial/i,
  /c[oó]mo tocar/i,
  /how to play/i,
  /guitar lesson/i,
  /piano lesson/i,
  /bass lesson/i,
  /drum lesson/i,
  /clases? de/i,
  /lecci[oó]n/i,
  /aprende a tocar/i,
  /tablatura/i,
  /acordes y ritmo/i,
  /podcast/i,
  /interview|entrevista/i,
  /reacci[oó]n|reaction/i,
  /review|rese[nñ]a/i,
  /gameplay|unboxing|vlog/i,
  /disco completo|album completo|[aá]lbum completo|full album/i,
  /grandes [eé]xitos|\d+\s*[eé]xitos|lo mejor de|best of/i,
  /compilaci[oó]n|compilation/i,
  /\d+\s*hours?|\d+\s*horas|hour version|1 hour|10 hours|loop/i,
  /behind the scenes|making of/i,
  /deconstruye|an[aá]lisis musical/i
];

const NEGATIVE_CHANNEL_PATTERNS = [
  /clases? de/i,
  /tutorial/i,
  /guitarraviva/i,
  /christianvib/i,
  /chordhouse/i,
  /guitarra libre/i,
  /guitar lesson/i
];

export function parseDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function isLiveOrStream(video) {
  if (!video.lengthText) return true;
  const badges = video.badges || [];
  return badges.some((b) => {
    const label = b.metadataBadgeRenderer?.label || '';
    const style = b.metadataBadgeRenderer?.style || '';
    return /live|directo/i.test(label) || /live/i.test(style);
  });
}

function findKeysRecursive(obj, targetKey, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  if (obj[targetKey] !== undefined) {
    results.push(obj[targetKey]);
  }
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      findKeysRecursive(obj[key], targetKey, results);
    }
  }
  return results;
}

export function evaluateMusicVideo(video, query = '') {
  const durationSec = parseDuration(video.lengthText?.simpleText);
  const formattedDuration = video.lengthText?.simpleText || '';

  // 1. Filtrado por duración
  if (durationSec < DURATION_MIN_SEC || durationSec > DURATION_MAX_SEC) {
    return { valid: false, reason: `Duración fuera de rango: ${durationSec}s (${formattedDuration})` };
  }

  // 2. Filtrado de transmisiones en vivo / streams
  if (isLiveOrStream(video)) {
    return { valid: false, reason: 'Transmisión en vivo o sin duración fija' };
  }

  const rawTitle = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
  const channel = video.ownerText?.runs?.[0]?.text || video.shortBylineText?.runs?.[0]?.text || '';

  // 3. Palabras clave negativas en el título
  for (const pattern of NEGATIVE_TITLE_PATTERNS) {
    if (pattern.test(rawTitle)) {
      return { valid: false, reason: `Título descartado por patrón negativo: ${pattern}` };
    }
  }

  // 4. Palabras clave negativas en el canal
  for (const pattern of NEGATIVE_CHANNEL_PATTERNS) {
    if (pattern.test(channel)) {
      return { valid: false, reason: `Canal descartado por canal educativo/tutorial: ${pattern}` };
    }
  }

  // 5. Sistema de scoring y ponderación
  let score = 10;
  const isTopicChannel = /- Topic$/i.test(channel) || /Tema$/i.test(channel);
  if (isTopicChannel) score += 50;

  const ownerBadges = video.ownerBadges || [];
  const isArtistVerified = ownerBadges.some(
    (b) =>
      b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' ||
      b.metadataBadgeRenderer?.icon?.iconType === 'AUDIO_BADGE'
  );
  if (isArtistVerified) score += 35;

  const isVerified = ownerBadges.some(
    (b) => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED'
  );
  if (isVerified && !isArtistVerified) score += 15;

  if (/official audio|audio oficial/i.test(rawTitle)) score += 30;
  else if (/official video|video oficial|videoclip|music video/i.test(rawTitle)) score += 25;
  else if (/lyric video|video con letra|visualizer/i.test(rawTitle)) score += 20;

  if (/remaster/i.test(rawTitle)) score += 10;
  if (/en vivo|live|acoustic|ac[uú]stico/i.test(rawTitle)) score += 5;

  if (/\bcover\b/i.test(rawTitle)) score -= 15;
  if (/karaoke|instrumental/i.test(rawTitle)) score -= 10;

  // Limpieza de artista y título
  let cleanTitle = rawTitle;
  let cleanArtist = channel.replace(/ - Topic$/i, '').trim();

  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    cleanArtist = parts[0].trim();
    cleanTitle = parts.slice(1).join(' - ').trim();
  }

  // Quitar sufijos comunes entre paréntesis de video para limpiar el título
  cleanTitle = cleanTitle
    .replace(/\s*[\(\[](?:Official\s*(?:Audio|Video|Music\s*Video|Lyric\s*Video)|Video\s*Oficial|Audio\s*Oficial|Videoclip|Remaster(?:ed)?|HD|4K)[\)\]]/gi, '')
    .trim();

  return {
    valid: true,
    score,
    videoId: video.videoId,
    title: cleanTitle || rawTitle,
    rawTitle,
    artist: cleanArtist || channel || 'YouTube',
    channel,
    duration: formattedDuration,
    durationSec,
    thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    isTopicChannel,
    isArtistVerified,
  };
}

/**
 * Realiza una búsqueda en YouTube aplicando los criterios de filtrado y scoring de canciones.
 */
export async function searchYouTubeMusic(query, { signal, maxResults = 10 } = {}) {
  if (!query || !query.trim()) return [];

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  };

  try {
    const response = await axios.get(url, { headers, signal, timeout: 10000 });
    const html = response.data;

    const match = html.match(/ytInitialData\s*=\s*({[\s\S]*?});/);
    if (!match) {
      console.warn('[YouTube Service] No se pudo encontrar ytInitialData en el HTML de YouTube.');
      return [];
    }

    const data = JSON.parse(match[1]);
    const videoRenderers = findKeysRecursive(data, 'videoRenderer');

    const validCandidates = [];
    for (const v of videoRenderers) {
      if (!v.videoId) continue;
      const evalRes = evaluateMusicVideo(v, query);
      if (evalRes.valid) {
        validCandidates.push(evalRes);
      }
    }

    // Ordenar por score decreciente
    validCandidates.sort((a, b) => b.score - a.score);

    return validCandidates.slice(0, maxResults);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('[YouTube Service] Error al buscar en YouTube:', error.message);
    return [];
  }
}
