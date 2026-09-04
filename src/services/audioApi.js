/**
 * Audio API service for SongBook.
 * Centralizes communication with audio streaming and transcription endpoints.
 */

import { config } from '../config';

const API_BASE_URL = config.API_BASE_URL || '/api';

/**
 * Returns the full stream URL for real-time audio pitch shifting
 */
export function getAudioStreamUrl(youtubeId) {
  if (!youtubeId) return '';
  return `${API_BASE_URL}/audio/stream?youtubeId=${encodeURIComponent(youtubeId)}`;
}

/**
 * Transcribes a YouTube video to chord grid / lyrics using Chordify backend service
 */
export async function transcribeYouTubeAudio(youtubeId, method = 'chordify') {
  try {
    const response = await fetch(`${API_BASE_URL}/songs/transcribe/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeId, method }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[Audio API] Failed to transcribe audio:', err.message);
  }
  return null;
}

/**
 * Fetches parsed lyrics and chords from external scraping sources (Ultimate Guitar / Cifra Club)
 */
export async function fetchExternalSongContent(url, source = 'Ultimate Guitar') {
  try {
    const params = new URLSearchParams({ url, source });
    const response = await fetch(`${API_BASE_URL}/songs/content?${params.toString()}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[Audio API] Failed to fetch external song content:', err.message);
  }
  return null;
}
