import { useState, useEffect, useCallback } from 'react';
import { updateSongPreferences } from '../services/persistenceApi';

/**
 * useSongPreferences Hook
 * Encapsulates the loading, updating, and bidirectional persistence of:
 * - Tone transposition (`transpose`)
 * - Chord variant selections (`chordVariants` / `selectedVariants`)
 * - User notifications for Pro audio features & feedback toasts
 */
export function useSongPreferences({ song, isPremium = false, openUpgradeModal = null, currentUser = null }) {
  const userIdentifier = currentUser?.email || currentUser?.id || 'gabothdev@gmail.com';

  const getInitialTranspose = useCallback(() => {
    if (!song) return 0;
    if (song.transpose !== undefined && song.transpose !== null) {
      return parseInt(song.transpose, 10) || 0;
    }
    const savedKey = `songbook_pref_transpose_${userIdentifier}_${song.id || song.title}`;
    const saved = localStorage.getItem(savedKey) || localStorage.getItem(`songbook_pref_transpose_${song.id || song.title}`);
    return saved !== null ? parseInt(saved, 10) || 0 : 0;
  }, [song, userIdentifier]);

  const getInitialChordVariants = useCallback(() => {
    if (!song) return {};
    if (song.chordVariants) {
      try {
        const parsed = typeof song.chordVariants === 'string' ? JSON.parse(song.chordVariants) : song.chordVariants;
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
        /* ignore */
      }
    }
    const savedKey = `songbook_pref_variants_${userIdentifier}_${song.id || song.title}`;
    const saved = localStorage.getItem(savedKey) || localStorage.getItem(`songbook_pref_variants_${song.id || song.title}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* ignore */
      }
    }
    return {};
  }, [song, userIdentifier]);

  const [transpose, setTranspose] = useState(getInitialTranspose);
  const [selectedVariants, setSelectedVariants] = useState(getInitialChordVariants);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [proAudioNotice, setProAudioNotice] = useState(false);

  // Sync state when active song changes
  useEffect(() => {
    setTranspose(getInitialTranspose());
    setSelectedVariants(getInitialChordVariants());
    setProAudioNotice(false);
  }, [song?.id, song?.title, getInitialTranspose, getInitialChordVariants]);

  // Transpose handler
  const handleTranspose = (delta, onTransposeChange = null) => {
    if (!song) return;
    const nextTranspose = transpose + delta;
    setTranspose(nextTranspose);

    if (onTransposeChange) {
      onTransposeChange(nextTranspose);
    }

    // Persist transpose locally per user
    localStorage.setItem(`songbook_pref_transpose_${userIdentifier}_${song.id || song.title}`, String(nextTranspose));
    localStorage.setItem(`songbook_pref_transpose_${song.id || song.title}`, String(nextTranspose));

    // Persist transpose to backend SQLite (UserSongPreference)
    updateSongPreferences({
      id: song.id,
      title: song.title,
      artist: song.artist,
      transpose: nextTranspose,
      user: userIdentifier,
    });

    // Pro tier audio notifications
    if (song.youtubeId) {
      if (!isPremium && nextTranspose !== 0) {
        setProAudioNotice(true);
      } else if (nextTranspose === 0) {
        setProAudioNotice(false);
      }
    }
  };

  // Variant change handler
  const handleVariantChange = (chordName, newVariantIndex, onUpdateDefinition = null) => {
    if (!chordName || !song) return;
    const clean = chordName.trim();
    const updated = {
      ...selectedVariants,
      [clean]: newVariantIndex,
    };
    setSelectedVariants(updated);

    // Persist chord variants locally per user
    localStorage.setItem(`songbook_pref_variants_${userIdentifier}_${song.id || song.title}`, JSON.stringify(updated));
    localStorage.setItem(`songbook_pref_variants_${song.id || song.title}`, JSON.stringify(updated));

    // Optional callback to update in-memory chord definition
    if (onUpdateDefinition) {
      onUpdateDefinition(clean, newVariantIndex);
    }

    // Persist chord variants to backend SQLite (UserSongPreference)
    updateSongPreferences({
      id: song.id,
      title: song.title,
      artist: song.artist,
      chordVariants: updated,
      user: userIdentifier,
    });
  };

  return {
    transpose,
    setTranspose,
    selectedVariants,
    setSelectedVariants,
    feedbackToast,
    setFeedbackToast,
    proAudioNotice,
    setProAudioNotice,
    handleTranspose,
    handleVariantChange,
  };
}

export default useSongPreferences;
