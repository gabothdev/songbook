/**
 * Artwork and Artist Photo service for SongBook.
 * Integrates multi-source discovery (Deezer, iTunes, Cover Art Archive, Wikipedia)
 * framing coordinate persistence ({ url, zoom, x, y })
 * and automatic developer email reporting for broken links.
 */

import { config } from '../config';

const BASE_URL = `${config.API_BASE_URL || '/api'}/artwork`;
const ARTWORK_CACHE_KEY = 'songbook_memorabilia_cache_v2';

/**
 * Parses an image value that may be either a plain URL string or a JSON framing object { url, zoom, x, y }.
 */
export function parseImageFraming(value) {
  if (!value) {
    return { url: null, zoom: 1, x: 0, y: 0 };
  }

  if (typeof value === 'object' && value.url) {
    return {
      url: value.url,
      zoom: typeof value.zoom === 'number' ? value.zoom : 1,
      x: typeof value.x === 'number' ? value.x : 0,
      y: typeof value.y === 'number' ? value.y : 0,
    };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.url) {
          return {
            url: parsed.url,
            zoom: typeof parsed.zoom === 'number' ? parsed.zoom : 1,
            x: typeof parsed.x === 'number' ? parsed.x : 0,
            y: typeof parsed.y === 'number' ? parsed.y : 0,
          };
        }
      } catch (e) {}
    }
    return { url: trimmed, zoom: 1, x: 0, y: 0 };
  }

  return { url: null, zoom: 1, x: 0, y: 0 };
}

/**
 * Serializes a framing object into a clean JSON string or plain URL if defaults are used.
 */
export function serializeImageFraming({ url, zoom = 1, x = 0, y = 0 }) {
  if (!url) return null;
  if (zoom === 1 && x === 0 && y === 0) {
    return url;
  }
  return JSON.stringify({
    url,
    zoom: parseFloat(Number(zoom).toFixed(2)),
    x: Math.round(x),
    y: Math.round(y),
  });
}

/**
 * Reports a broken image to the backend.
 * The backend will alert gabothdev@gmail.com the first time that particular image fails.
 */
export async function reportBrokenImage({
  type = 'artist',
  name = '',
  songTitle = '',
  url = '',
  httpStatus = null,
}) {
  const framing = parseImageFraming(url);
  const actualUrl = framing.url;
  if (!actualUrl || typeof actualUrl !== 'string' || actualUrl.startsWith('data:')) {
    return;
  }

  try {
    await fetch(`${BASE_URL}/report-broken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        name,
        songTitle,
        url: actualUrl,
        httpStatus,
      }),
    });
  } catch (err) {
    // Reporting failed silently in background
  }
}

function getLocalCache() {
  try {
    const raw = localStorage.getItem(ARTWORK_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setLocalCache(key, data) {
  try {
    const cache = getLocalCache();
    cache[key] = { ...data, cachedAt: Date.now() };
    localStorage.setItem(ARTWORK_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

/**
 * Clean artist and title strings from noise like "- Topic", "(En Vivo)", etc.
 */
export function cleanSearchQuery(text = '') {
  return text
    .replace(/\s*-\s*Topic\b/gi, '')
    .replace(/\s*\(.*?(live|en vivo|remaster|oficial|video).*?\)/gi, '')
    .replace(/\s*\[.*?(live|en vivo|remaster|oficial|video).*?\]/gi, '')
    .trim();
}

/**
 * Search album artwork options from the backend aggregator (Deezer, iTunes, Cover Art Archive, Wikipedia)
 */
export async function searchAlbumArtworkOptions(artist = '', title = '', source = 'all') {
  const cleanArt = cleanSearchQuery(artist);
  const cleanTit = cleanSearchQuery(title);
  if (!cleanArt && !cleanTit) return [];

  // 1. Try multi-source backend aggregator
  try {
    const res = await fetch(
      `${BASE_URL}/search?type=album&q=${encodeURIComponent(cleanArt)}&title=${encodeURIComponent(cleanTit)}&source=${encodeURIComponent(source)}`
    );
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => ({
          albumCover: item.url,
          url: item.url,
          label: item.label,
          source: item.source,
          resolution: item.resolution || '1000×1000',
        }));
      }
    }
  } catch (e) {
    console.warn('[ArtworkService] Aggregator search error, falling back to direct iTunes:', e);
  }

  // 2. Direct browser fallback via iTunes (only if source is 'all' or 'itunes')
  if (source === 'all' || source === 'itunes') {
    try {
      const query = `${cleanArt} ${cleanTit}`.trim();
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();

      if (data?.results?.length > 0) {
        return data.results
          .filter((item) => item.artworkUrl100)
          .map((item) => ({
            albumCover: item.artworkUrl100.replace('100x100bb', '1000x1000bb'),
            url: item.artworkUrl100.replace('100x100bb', '1000x1000bb'),
            label: `${item.collectionName || item.trackName} (${item.releaseDate ? new Date(item.releaseDate).getFullYear() : 'iTunes'})`,
            source: 'iTunes',
            resolution: '1000×1000',
          }));
      }
    } catch (err) {
      console.warn('[ArtworkService] iTunes fallback error:', err);
    }
  }

  return [];
}

/**
 * Search artist portrait options from the backend aggregator (Deezer, iTunes, Wikipedia, Wikimedia)
 */
export async function searchArtistPhotoOptions(artist = '', source = 'all') {
  const cleanArt = cleanSearchQuery(artist);
  if (!cleanArt) return [];

  // 1. Try multi-source backend aggregator
  try {
    const res = await fetch(
      `${BASE_URL}/search?type=artist&q=${encodeURIComponent(cleanArt)}&source=${encodeURIComponent(source)}`
    );
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => ({
          url: item.url,
          label: item.label,
          source: item.source,
          resolution: item.resolution || '1000×1000',
        }));
      }
    }
  } catch (e) {
    console.warn('[ArtworkService] Aggregator artist search error, falling back to Wikipedia:', e);
  }

  // 2. Direct browser fallback via Wikipedia (if source is 'all' or 'wikipedia')
  if (source === 'all' || source === 'wikipedia') {
    const candidates = [];
    try {
      const esUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanArt)}&prop=pageimages&format=json&pithumbsize=1000&origin=*`;
      const res = await fetch(esUrl);
      if (res.ok) {
        const data = await res.json();
        const pages = data?.query?.pages || {};
        for (const key of Object.keys(pages)) {
          const page = pages[key];
          if (page.thumbnail?.source) {
            candidates.push({
              url: page.thumbnail.source,
              label: `${page.title} (Biografía Wikipedia)`,
              source: 'Wikipedia',
              resolution: '1000×1000',
            });
          }
        }
      }
    } catch (e) {}
    return candidates;
  }

  return [];
}

/**
 * Automatically resolves both artist photo and album cover for a song.
 * Uses local storage caching to minimize network requests.
 */
export async function autoDiscoverSongMemorabilia({ artist = '', title = '', youtubeId = '' }) {
  const cacheKey = `${artist.trim().toLowerCase()}_${title.trim().toLowerCase()}`;
  const localCache = getLocalCache();

  if (localCache[cacheKey]) {
    return localCache[cacheKey];
  }

  let albumCover = null;
  let artistImage = null;

  try {
    const [albumResults, artistResults] = await Promise.allSettled([
      searchAlbumArtworkOptions(artist, title),
      searchArtistPhotoOptions(artist),
    ]);

    if (albumResults.status === 'fulfilled' && albumResults.value?.length > 0) {
      albumCover = albumResults.value[0].url || albumResults.value[0].albumCover;
    }

    if (artistResults.status === 'fulfilled' && artistResults.value?.length > 0) {
      artistImage = artistResults.value[0].url;
    }
  } catch (e) {
    console.warn('[ArtworkService] Auto-discover error:', e);
  }

  // Fallback for album cover: YouTube thumbnail if available
  if (!albumCover && youtubeId) {
    albumCover = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  const result = { artistImage, albumCover };
  if (artistImage || albumCover) {
    setLocalCache(cacheKey, result);
  }

  return result;
}
