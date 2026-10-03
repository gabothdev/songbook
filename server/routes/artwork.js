import express from 'express';
import axios from 'axios';
import { sendBrokenImageAlert } from '../services/mailer.js';

const router = express.Router();

// Simple in-memory search cache with 1-hour TTL
const searchCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCached(key) {
  const item = searchCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  searchCache.set(key, { data, timestamp: Date.now() });
}

// Clean queries from noise like "Topic", "Remaster", etc.
function cleanQuery(text = '') {
  return text
    .replace(/\s*-\s*Topic\b/gi, '')
    .replace(/\s*\(.*?(live|en vivo|remaster|oficial|video).*?\)/gi, '')
    .replace(/\s*\[.*?(live|en vivo|remaster|oficial|video).*?\]/gi, '')
    .trim();
}

/**
 * POST /api/artwork/report-broken
 * Endpoint to report a broken image (dispatched from browser on `onError`).
 * Deduplicates and alerts gabothdev@gmail.com on the first failure.
 */
router.post('/report-broken', async (req, res) => {
  const { type, name, songTitle, url, httpStatus } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    const result = await sendBrokenImageAlert({
      type: type || 'artist',
      name,
      songTitle,
      url,
      httpStatus,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Artwork Route] Error reporting broken image:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/artwork/search?type=artist|album&q=...&title=...
 * Aggregator querying Deezer, iTunes, Cover Art Archive, Wikipedia in parallel.
 */
router.get('/search', async (req, res) => {
  const { type = 'artist', q = '', title = '', source = 'all' } = req.query;
  const cleanQ = cleanQuery(q);
  const cleanT = cleanQuery(title);

  if (!cleanQ) {
    return res.json([]);
  }

  const cacheKey = `${type}_${cleanQ}_${cleanT}_${source}`.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const results = [];
  const seenUrls = new Set();

  function addResult({ url, label, source: src, resolution = '1000x1000' }) {
    if (!url || typeof url !== 'string' || seenUrls.has(url)) return;
    seenUrls.add(url);
    results.push({ url, label, source: src, resolution });
  }

  const tasks = [];

  // 1. DEEZER API (Artists & Albums in high-res 1000x1000)
  if (source === 'all' || source === 'deezer') {
    tasks.push((async () => {
      try {
        const limit = source === 'deezer' ? 15 : 6;
        const endpoint =
          type === 'artist'
            ? `https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanQ)}&limit=${limit}`
            : `https://api.deezer.com/search/album?q=${encodeURIComponent(`${cleanQ} ${cleanT}`.trim())}&limit=${limit}`;

        const response = await axios.get(endpoint, { timeout: 4500 });
        const items = response.data?.data || [];

        items.forEach((item) => {
          if (type === 'artist') {
            const img = item.picture_xl || item.picture_big;
            if (img) {
              addResult({
                url: img,
                label: `${item.name} (${item.nb_fan ? `${(item.nb_fan / 1000).toFixed(0)}k oyentes` : 'Deezer Oficial'})`,
                source: 'Deezer',
                resolution: '1000×1000',
              });
            }
          } else {
            const img = item.cover_xl || item.cover_big;
            if (img) {
              addResult({
                url: img,
                label: `${item.title} • ${item.artist?.name || cleanQ}`,
                source: 'Deezer',
                resolution: '1000×1000',
              });
            }
          }
        });
      } catch (e) {}
    })());
  }

  // 2. ITUNES SEARCH API
  if (source === 'all' || source === 'itunes') {
    tasks.push((async () => {
      try {
        const limit = source === 'itunes' ? 15 : 6;
        const query = type === 'artist' ? cleanQ : `${cleanQ} ${cleanT}`.trim();
        const entity = type === 'artist' ? 'musicArtist' : 'album';
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${entity}&limit=${limit}`;

        const response = await axios.get(itunesUrl, { timeout: 4500 });
        const items = response.data?.results || [];

        items.forEach((item) => {
          const rawCover = item.artworkUrl100;
          if (rawCover) {
            const hiRes = rawCover.replace('100x100bb', '1000x1000bb');
            addResult({
              url: hiRes,
              label: `${item.collectionName || item.artistName || cleanQ}${item.releaseDate ? ` (${new Date(item.releaseDate).getFullYear()})` : ''}`,
              source: 'iTunes',
              resolution: '1000×1000',
            });
          }
        });
      } catch (e) {}
    })());
  }

  // 3. WIKIPEDIA & WIKIMEDIA COMMONS
  if (source === 'all' || source === 'wikipedia') {
    tasks.push((async () => {
      try {
        const limit = source === 'wikipedia' ? 12 : 5;
        // Spanish Wikipedia
        const esUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanQ)}&prop=pageimages&format=json&pithumbsize=1000`;
        const esRes = await axios.get(esUrl, { timeout: 4000 });
        const pages = esRes.data?.query?.pages || {};
        for (const k of Object.keys(pages)) {
          const page = pages[k];
          if (page.thumbnail?.source) {
            addResult({
              url: page.thumbnail.source,
              label: `${page.title} (Biografía Wikipedia)`,
              source: 'Wikipedia',
              resolution: '1000×1000',
            });
          }
        }

        // English Wikipedia
        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanQ)}&prop=pageimages&format=json&pithumbsize=1000`;
        const enRes = await axios.get(enUrl, { timeout: 4000 });
        const enPages = enRes.data?.query?.pages || {};
        for (const k of Object.keys(enPages)) {
          const page = enPages[k];
          if (page.thumbnail?.source) {
            addResult({
              url: page.thumbnail.source,
              label: `${page.title} (Wikipedia EN)`,
              source: 'Wikipedia',
              resolution: '1000×1000',
            });
          }
        }

        // Wikimedia Commons
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQ + (type === 'artist' ? ' musician' : ' album'))}&gsrlimit=${limit}&prop=pageimages&pithumbsize=1000&format=json`;
        const comRes = await axios.get(commonsUrl, { timeout: 4000 });
        const cPages = comRes.data?.query?.pages || {};
        for (const k of Object.keys(cPages)) {
          const p = cPages[k];
          if (p.thumbnail?.source) {
            addResult({
              url: p.thumbnail.source,
              label: p.title?.replace('File:', '') || cleanQ,
              source: 'Wikimedia',
              resolution: '1000×1000',
            });
          }
        }
      } catch (e) {}
    })());
  }

  // 4. COVER ART ARCHIVE / MUSICBRAINZ (For historical vinyl/CD album covers)
  if ((source === 'all' || source === 'coverart') && type === 'album') {
    tasks.push((async () => {
      try {
        const limit = source === 'coverart' ? 10 : 4;
        const mbUrl = `https://musicbrainz.org/ws/2/release/?query=release:${encodeURIComponent(cleanT || cleanQ)}+AND+artist:${encodeURIComponent(cleanQ)}&fmt=json&limit=${limit}`;
        const mbRes = await axios.get(mbUrl, {
          headers: { 'User-Agent': 'SongBookApp/1.0 (gabothdev@gmail.com)' },
          timeout: 4500,
        });

        const releases = mbRes.data?.releases || [];
        for (const rel of releases) {
          if (rel.id) {
            const coverUrl = `https://coverartarchive.org/release/${rel.id}/front-500`;
            addResult({
              url: coverUrl,
              label: `${rel.title} • Edición Original (${rel.date ? rel.date.substring(0, 4) : 'MusicBrainz'})`,
              source: 'Cover Art Archive',
              resolution: '1200×1200',
            });
          }
        }
      } catch (e) {}
    })());
  }

  // Wait for all searches to conclude or timeout gracefully
  await Promise.allSettled(tasks);

  setCached(cacheKey, results);
  res.json(results);
});

export default router;
