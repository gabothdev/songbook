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
export async function saveCustomSongVersion({ id, title, artist, content, syncData, originalContent, isInstrumental, user, userId }) {
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
        ...(isInstrumental !== undefined ? { isInstrumental: Boolean(isInstrumental) } : {}),
        user,
        userId,
      }),
    });
    if (res.ok) return await res.json();
    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Solo los administradores pueden editar canciones.');
    }
  } catch (err) {
    console.warn('[Persistence API] Failed to save custom song version:', err.message);
    throw err;
  }
  return null;
}

/**
 * Restores a song to its original unedited content
 */
export async function restoreOriginalSong({ id, title, artist, user, userId }) {
  try {
    const res = await fetch(`${BASE_URL}/songs/restore-original`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, artist, user, userId }),
    });
    if (res.ok) return await res.json();
    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Solo los administradores pueden restaurar canciones.');
    }
  } catch (err) {
    console.warn('[Persistence API] Failed to restore original song:', err.message);
    throw err;
  }
  return null;
}

/**
 * Updates a song's transpose, chord variant preferences, artwork and album/version metadata
 */
export async function updateSongPreferences({ 
  id, title, artist, content, youtubeId, syncData, transpose, chordVariants, artistImage, albumCover,
  album, releaseYear, versionType, versionDetails, user, userId, isCustom, genre 
}) {
  try {
    const res = await fetch(`${BASE_URL}/songs/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id, title, artist, content, youtubeId, syncData, transpose, chordVariants, artistImage, albumCover,
        album, releaseYear, versionType, versionDetails, user, userId, isCustom, genre 
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to update preferences:', err.message);
  }
  return null;
}

/**
 * Fetches user's personal saved library of songs
 */
export async function fetchUserLibrary(user) {
  if (!user) return [];
  try {
    const userParam = typeof user === 'object' ? (user.id || user.email) : user;
    const res = await fetch(`${BASE_URL}/library?user=${encodeURIComponent(userParam)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to fetch library:', err.message);
  }
  return [];
}

/**
 * Saves a song to user's personal notebook library
 */
export async function saveSongToLibrary(songData, user) {
  try {
    const userParam = typeof user === 'object' ? (user?.id || user?.email) : (user || songData?.user);
    const res = await fetch(`${BASE_URL}/library/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...songData,
        ...(userParam ? { user: userParam } : {}),
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to save song to library:', err.message);
  }
  return null;
}

/**
 * Removes a song from user's personal library
 */
export async function unsaveSongFromLibrary(songId, user) {
  try {
    const userParam = typeof user === 'object' ? (user?.id || user?.email) : user;
    const res = await fetch(`${BASE_URL}/library/unsave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId,
        ...(userParam ? { user: userParam } : {}),
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to unsave song from library:', err.message);
  }
  return null;
}

/**
 * Fetches all favorite songs for a specific user
 */
export async function fetchFavorites(user) {
  if (!user) return [];
  try {
    const userParam = typeof user === 'object' ? (user.id || user.email) : user;
    const res = await fetch(`${BASE_URL}/favorites?user=${encodeURIComponent(userParam)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to fetch favorites:', err.message);
  }
  return [];
}

export async function addFavorite(songData, user) {
  try {
    const userParam = typeof user === 'object' ? (user?.id || user?.email) : (user || songData?.user);
    const res = await fetch(`${BASE_URL}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...songData,
        ...(userParam ? { user: userParam } : {}),
      }),
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
export async function removeFavorite(songId, user) {
  try {
    const userParam = typeof user === 'object' ? (user.id || user.email) : user;
    const url = userParam
      ? `${BASE_URL}/favorites/${encodeURIComponent(songId)}?user=${encodeURIComponent(userParam)}`
      : `${BASE_URL}/favorites/${encodeURIComponent(songId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[Persistence API] Failed to remove favorite:', err.message);
  }
  return false;
}

/**
 * Fetches setlists belonging to a specific user
 */
export async function fetchSetlists(user) {
  if (!user) return [];
  try {
    const userParam = typeof user === 'object' ? (user.id || user.email) : user;
    const res = await fetch(`${BASE_URL}/setlists?user=${encodeURIComponent(userParam)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to fetch setlists:', err.message);
  }
  return [];
}

/**
 * Creates a new setlist by name for a user
 */
export async function createSetlist(name, user) {
  try {
    const userParam = typeof user === 'object' ? (user.id || user.email) : user;
    const res = await fetch(`${BASE_URL}/setlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, user: userParam }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[Persistence API] Failed to create setlist:', err.message);
  }
  return null;
}

/**
 * Deletes a setlist by name belonging to a user
 */
export async function deleteSetlist(name, user) {
  try {
    const userParam = typeof user === 'object' ? (user.id || user.email) : user;
    const url = userParam
      ? `${BASE_URL}/setlists/${encodeURIComponent(name)}?user=${encodeURIComponent(userParam)}`
      : `${BASE_URL}/setlists/${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[Persistence API] Failed to delete setlist:', err.message);
  }
  return false;
}

export async function addSongToSetlist(payload, user) {
  try {
    const userParam = typeof user === 'object' ? (user?.id || user?.email) : (user || payload?.user);
    const res = await fetch(`${BASE_URL}/setlists/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        ...(userParam ? { user: userParam } : {}),
      }),
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
export async function removeSongFromSetlist(setlistName, songId, user) {
  try {
    const userParam = typeof user === 'object' ? (user.id || user.email) : user;
    const url = userParam
      ? `${BASE_URL}/setlists/${encodeURIComponent(setlistName)}/songs/${encodeURIComponent(songId)}?user=${encodeURIComponent(userParam)}`
      : `${BASE_URL}/setlists/${encodeURIComponent(setlistName)}/songs/${encodeURIComponent(songId)}`;
    const res = await fetch(url, { method: 'DELETE' });
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
  if (!chordName || typeof chordName !== 'string') return null;
  const clean = chordName.trim();
  if (
    !clean ||
    clean === '|' ||
    clean.startsWith('𝄾') ||
    clean.startsWith('𝄽') ||
    clean.includes('(') ||
    clean.includes('T')
  ) {
    return null;
  }

  try {
    const res = await fetch(
      `${BASE_URL}/chords/lookup?name=${encodeURIComponent(clean)}&instrument=${encodeURIComponent(instrument)}`
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

