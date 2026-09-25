import { config } from '../config';
import { transcribeYouTubeAudio, fetchExternalSongContent } from './audioApi';

const API_BASE_URL = `${config.API_BASE_URL || '/api'}/songs`;

import { normalizeChordName } from '../utils/music';

/**
 * Extracts unique chords from chords/lyrics text (e.g. [C], [Am], [G7], [E/Ab])
 */
export function extractUniqueChords(text = '') {
  if (!text) return ['C', 'G', 'Am', 'F'];
  const matches = text.match(/\[([A-G][b#]?[a-zA-Z0-9\/]*)\]/g);
  if (!matches) return ['C', 'G', 'Am', 'F'];
  const unique = Array.from(
    new Set(
      matches
        .map((m) => normalizeChordName(m.replace(/[\[\]]/g, '')))
        .filter((ch) => ch && ch !== '𝄾' && ch !== '𝄽')
    )
  );
  return unique.length > 0 ? unique : ['C', 'G', 'Am', 'F'];
}

/**
 * Searches songs from Chordify (priority #1), Ultimate Guitar and Cifra Club
 */
export async function searchSongsOnline(query, source = 'all') {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim();
  const chordifyResults = [];
  const ugResults = [];
  const ccResults = [];

  try {
    const chordifyPromise =
      source === 'all' || source === 'Chordify'
        ? fetch(`${API_BASE_URL}/search/chordify?q=${encodeURIComponent(cleanQuery)}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        : Promise.resolve([]);

    const ugPromise =
      source === 'all' || source === 'Ultimate Guitar'
        ? fetch(`${API_BASE_URL}/search/ultimate-guitar?q=${encodeURIComponent(cleanQuery)}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        : Promise.resolve([]);

    const ccPromise =
      source === 'all' || source === 'Cifra Club'
        ? fetch(`${API_BASE_URL}/search/cifra-club?q=${encodeURIComponent(cleanQuery)}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        : Promise.resolve([]);

    const [chordifyData, ugData, ccData] = await Promise.all([chordifyPromise, ugPromise, ccPromise]);

    // 1. Process Chordify results (PRIORITY #1)
    if (Array.isArray(chordifyData)) {
      chordifyData.forEach((item, idx) => {
        chordifyResults.push({
          id: `chordify_${item.artist || 'artist'}_${item.title || 'title'}_${idx}`,
          title: item.title,
          artist: item.artist || 'Chordify',
          url: item.url || (item.versions && item.versions[0]?.url),
          source: 'Chordify',
          rating: 5.0,
          votes: 100,
          type: 'BeatGrid + Video',
          youtubeId: item.youtubeId,
        });
      });
    }

    // 2. Flatten Ultimate Guitar results
    if (Array.isArray(ugData)) {
      ugData.forEach((item) => {
        if (item.versions && Array.isArray(item.versions) && item.versions.length > 0) {
          item.versions.forEach((ver, vIdx) => {
            ugResults.push({
              id: `ug_${item.artist}_${item.title}_${vIdx}`,
              title: item.title,
              artist: item.artist,
              url: ver.url,
              source: 'Ultimate Guitar',
              rating: ver.rating || 0,
              votes: ver.votes || 0,
              type: ver.type || 'Chords',
              versionNumber: vIdx + 1,
            });
          });
        } else if (item.url) {
          ugResults.push({
            id: `ug_${item.artist}_${item.title}`,
            title: item.title,
            artist: item.artist,
            url: item.url,
            source: 'Ultimate Guitar',
            rating: item.rating || 0,
            votes: item.votes || 0,
            type: item.type || 'Chords',
          });
        }
      });
    }

    // 3. Process Cifra Club results
    if (Array.isArray(ccData)) {
      ccData.forEach((item, idx) => {
        ccResults.push({
          id: `cc_${item.artist || 'artist'}_${item.title || 'title'}_${idx}`,
          title: item.title,
          artist: item.artist,
          url: item.url,
          source: 'Cifra Club',
          rating: item.rating || 4.8,
          votes: item.votes || 0,
          type: item.type || 'Acordes',
        });
      });
    }

    // Combine with Chordify first!
    const combined = [...chordifyResults, ...ugResults, ...ccResults];
    if (combined.length > 0) {
      return combined;
    }
  } catch (err) {
    console.warn('[Scraper Service] Error communicating with scraper server:', err.message);
  }

  return [];
}

/**
 * Fetches the scraped chords and lyrics content of a selected song URL
 */
export async function fetchSongContent(songItem) {
  if (!songItem || !songItem.url) return songItem;

  try {
    if (songItem.source === 'Chordify') {
      const match = songItem.url.match(/youtube:([^/&?]+)/);
      const youtubeId = songItem.youtubeId || (match ? match[1] : '');

      const data = await transcribeYouTubeAudio(youtubeId, 'chordify');
      if (data) {
        const rawContent = data.text || '';
        const uniqueChords = extractUniqueChords(rawContent);

        return {
          ...songItem,
          content: rawContent,
          key: uniqueChords[0] || 'C',
          bpm: 100,
          timeSignature: '4/4',
          youtubeId,
          syncData: JSON.stringify(data.compases || []),
          compases: data.compases,
          uniqueChords,
        };
      }
    } else {
      const data = await fetchExternalSongContent(songItem.url, songItem.source || 'Ultimate Guitar');
      if (data) {
        const rawContent = data.content || '';
        const uniqueChords = extractUniqueChords(rawContent);

        return {
          ...songItem,
          content: rawContent,
          key: uniqueChords[0] || 'C',
          bpm: 100,
          timeSignature: '4/4',
          uniqueChords,
        };
      }
    }
  } catch (e) {
    console.error('Error fetching live scraped content:', e);
  }

  return songItem;
}

/**
 * Searches YouTube video options with thumbnails, titles and channels
 */
export async function searchYouTubeOptions(query) {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/search/youtube?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      return data.options || (data.videoId ? [{ videoId: data.videoId, title: query, artist: 'YouTube' }] : []);
    }
  } catch (e) {
    console.warn('[searchYouTubeOptions] Error:', e.message);
  }
  return [];
}

