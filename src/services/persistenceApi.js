/**
 * Persistence API service for SongBook.
 * Centralizes all communication with SQLite backend (/api/persistence/*).
 */

import { config } from '../config';

const BASE_URL = `${config.API_BASE_URL || '/api'}/persistence`;

/**
 * Fetches all saved songs from the database
 */
export async function fetchSavedSongs() {
  try {
    const res = await fetch(`${BASE_URL}/songs`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to fetch songs from database:', err.message);
  }
  return [];
}

/**
 * Upserts a song in the database
 */
export async function saveSong(songData) {
  try {
    const res = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(songData),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to save song:', err.message);
  }
  return null;
}

/**
 * Saves a customized / arranged version of a song (isCustom: true)
 */
export async function saveCustomSongVersion({ id, title, artist, content, syncData, originalContent }) {
  try {
    const res = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title,
        artist,
        content,
        syncData,
        originalContent,
        isCustom: true,
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to save custom song version:', err.message);
  }
  return null;
}

/**
 * Restores a song to its original unedited content
 */
export async function restoreOriginalSong({ id, title, artist }) {
  try {
    const res = await fetch(`${BASE_URL}/songs/restore-original`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, artist }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to restore original song:', err.message);
  }
  return null;
}

/**
 * Updates a song's transpose, chord variant preferences, artwork and album/version metadata
 */
export async function updateSongPreferences({ 
  id, title, artist, content, youtubeId, syncData, transpose, chordVariants, artistImage, albumCover,
  album, releaseYear, versionType, versionDetails, user, userId, isCustom 
}) {
  try {
    const res = await fetch(`${BASE_URL}/songs/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id, title, artist, content, youtubeId, syncData, transpose, chordVariants, artistImage, albumCover,
        album, releaseYear, versionType, versionDetails, user, userId, isCustom 
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to update preferences:', err.message);
  }
  return null;
}

/**
 * Fetches all favorite songs
 */
export async function fetchFavorites() {
  try {
    const res = await fetch(`${BASE_URL}/favorites`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to fetch favorites:', err.message);
  }
  return [];
}

/**
 * Adds a song to favorites
 */
export async function addFavorite(songData) {
  try {
    const res = await fetch(`${BASE_URL}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(songData),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to add favorite:', err.message);
  }
  return null;
}

/**
 * Removes a song from favorites
 */
export async function removeFavorite(songId) {
  try {
    const res = await fetch(`${BASE_URL}/favorites/${encodeURIComponent(songId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[Persistence API] Failed to remove favorite:', err.message);
  }
  return false;
}

/**
 * Fetches all setlists with their songs
 */
export async function fetchSetlists() {
  try {
    const res = await fetch(`${BASE_URL}/setlists`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to fetch setlists:', err.message);
  }
  return [];
}

/**
 * Creates a new setlist by name
 */
export async function createSetlist(name) {
  try {
    const res = await fetch(`${BASE_URL}/setlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to create setlist:', err.message);
  }
  return null;
}

/**
 * Deletes a setlist by name
 */
export async function deleteSetlist(name) {
  try {
    const res = await fetch(`${BASE_URL}/setlists/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[Persistence API] Failed to delete setlist:', err.message);
  }
  return false;
}

/**
 * Adds a song to a setlist
 */
export async function addSongToSetlist(payload) {
  try {
    const res = await fetch(`${BASE_URL}/setlists/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to add song to setlist:', err.message);
  }
  return null;
}

/**
 * Removes a song from a setlist
 */
export async function removeSongFromSetlist(setlistName, songId) {
  try {
    const res = await fetch(
      `${BASE_URL}/setlists/${encodeURIComponent(setlistName)}/songs/${encodeURIComponent(songId)}`,
      { method: 'DELETE' }
    );
    return res.ok;
  } catch (err) {
    console.warn('[Persistence API] Failed to remove song from setlist:', err.message);
  }
  return false;
}

/**
 * Looks up a chord definition from SQLite
 */
export async function lookupChord(chordName, instrument = 'guitar') {
  try {
    const res = await fetch(
      `${BASE_URL}/chords/lookup?name=${encodeURIComponent(chordName)}&instrument=${encodeURIComponent(instrument)}`
    );
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to lookup chord:', err.message);
  }
  return null;
}

/**
 * Saves a custom chord definition
 */
export async function saveCustomChord({ instrument, chordName, data }) {
  try {
    const res = await fetch(`${BASE_URL}/chords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instrument, chordName, data }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to save custom chord:', err.message);
  }
  return null;
}

/**
 * Updates an artist's image in the database
 */
export async function updateArtistImage({ id, name, image }) {
  try {
    const res = await fetch(`${BASE_URL}/artists/update-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, image }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to update artist image:', err.message);
  }
  return null;
}

