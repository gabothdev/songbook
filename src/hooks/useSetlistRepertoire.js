import { useState, useEffect, useMemo, useCallback } from 'react';
import { SAMPLE_SONGS_DATA } from '../data/sampleSongs';
import { extractUniqueChords } from '../services/scraperApi';
import {
  fetchSetlists,
  createSetlist,
  deleteSetlist,
  addSongToSetlist,
  removeSongFromSetlist,
} from '../services/persistenceApi';

export const INITIAL_SETLISTS = [];

/**
 * useSetlistRepertoire Hook
 * Encapsulates repertory setlists, active/stage modes, and live gig navigation context.
 */
export function useSetlistRepertoire({
  currentUser = null,
  onSelectSong = null,
  onSongAdded = null,
} = {}) {
  const [setlists, setSetlists] = useState(() => {
    if (!currentUser) return INITIAL_SETLISTS;
    const userKey = `songbook_setlists_${currentUser.id || currentUser.email}`;
    const saved = localStorage.getItem(userKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const filtered = Array.isArray(parsed)
          ? parsed.filter(
              (sl) =>
                !['En Vivo Acústico', 'Canciones para Fogón', 'Práctica de Bandoneón'].includes(
                  sl.name
                )
            )
          : [];
        if (filtered.length > 0) return filtered;
      } catch (e) {
        /* ignore */
      }
    }
    return INITIAL_SETLISTS;
  });

  const [activeSetlist, setActiveSetlist] = useState(null);
  const [stageModeSetlist, setStageModeSetlist] = useState(null);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (currentUser) {
      const userKey = `songbook_setlists_${currentUser.id || currentUser.email}`;
      localStorage.setItem(userKey, JSON.stringify(setlists));
    }
  }, [setlists, currentUser]);

  // Keep activeSetlist in sync with setlists array
  useEffect(() => {
    if (activeSetlist) {
      const updated = setlists.find((s) => s.name === activeSetlist.name);
      if (updated) {
        setActiveSetlist(updated);
      } else {
        setActiveSetlist(null);
      }
    }
  }, [setlists, activeSetlist]);

  // Load setlists from database
  useEffect(() => {
    async function loadSetlistsData() {
      if (!currentUser) {
        setSetlists([]);
        setActiveSetlist(null);
        return;
      }

      try {
        const setlistsRes = await fetchSetlists(currentUser);
        if (Array.isArray(setlistsRes) && setlistsRes.length > 0) {
          const mappedSetlists = setlistsRes.map((sl) => ({
            name: sl.name,
            songs: Array.isArray(sl.songs)
              ? sl.songs.map((ss) => {
                  const uChords = extractUniqueChords(ss.content);
                  return {
                    id: String(ss.id),
                    title: ss.title,
                    artist: ss.artist,
                    artistImage: ss.artistImage || null,
                    albumCover: ss.albumCover || null,
                    album: ss.album || null,
                    releaseYear: ss.releaseYear || null,
                    versionType: ss.versionType || 'studio',
                    versionDetails: ss.versionDetails || null,
                    artists: ss.artists || [],
                    isCustom: Boolean(ss.isCustom),
                    key: uChords[0] || 'C',
                    content: ss.content,
                    youtubeId: ss.youtubeId,
                    syncData: ss.syncData,
                    transpose: ss.transpose ?? 0,
                    chordVariants: ss.chordVariants || null,
                  };
                })
              : [],
          }));
          setSetlists(mappedSetlists);
        } else {
          setSetlists([]);
          setActiveSetlist(null);
        }
      } catch (err) {
        console.warn('[useSetlistRepertoire] Error loading setlists:', err);
      }
    }

    loadSetlistsData();
  }, [currentUser]);

  // Create setlist
  const handleCreateSetlist = useCallback(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (setlists.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
        alert('Ya existe un setlist con ese nombre.');
        return;
      }

      const newSetlist = { name: trimmed, songs: [] };
      setSetlists((prev) => [...prev, newSetlist]);
      setActiveSetlist(newSetlist);

      try {
        await createSetlist(trimmed, currentUser);
      } catch (e) {
        console.warn('[useSetlistRepertoire] Setlist created in memory:', e);
      }
    },
    [setlists, currentUser]
  );

  // Delete setlist
  const handleDeleteSetlist = useCallback(
    async (name) => {
      setSetlists((prev) => prev.filter((s) => s.name !== name));
      if (activeSetlist && activeSetlist.name === name) {
        setActiveSetlist(null);
      }

      try {
        await deleteSetlist(name, currentUser);
      } catch (e) {
        console.warn('[useSetlistRepertoire] Setlist deleted in memory:', e);
      }
    },
    [activeSetlist, currentUser]
  );

  // Add song or score to setlist
  const handleAddSongToSetlist = useCallback(
    async (setlistName, song) => {
      const isScore = Boolean(
        song.isScore ||
        song.type === 'score' ||
        song.type === 'tango_archive' ||
        song.songsterrId ||
        song.tangoId ||
        song.pages
      );

      let contentToSave = song.content || '';
      if (isScore && !contentToSave.startsWith('[SCORE_SHEET]')) {
        const payload = {
          isScore: true,
          type: song.type || (song.songsterrId ? 'score' : 'tango_archive'),
          songsterrId: song.songsterrId,
          tangoId: song.tangoId,
          composer: song.composer || song.artist,
          rhythm: song.rhythm,
          pages: song.pages,
          recordings: song.recordings,
          tracks: song.tracks,
          activePartId: song.activePartId,
          youtubeId: song.youtubeId,
          difficulty: song.difficulty,
        };
        contentToSave = `[SCORE_SHEET]${JSON.stringify(payload)}`;
      }

      const songId = song.id || (song.songsterrId ? `st_${song.songsterrId}` : `tango_${song.tangoId || Date.now()}`);

      const songToAppend = {
        id: String(songId),
        title: song.title,
        artist: song.artist || song.composer || 'Artista',
        key: isScore ? (song.rhythm || 'Score') : (song.key || 'C'),
        content: contentToSave,
        youtubeId: song.youtubeId,
        syncData: song.syncData,
        transpose: song.transpose ?? 0,
        chordVariants: song.chordVariants || null,
        isScore,
        type: song.type || (song.songsterrId ? 'score' : (isScore ? 'tango_archive' : undefined)),
        songsterrId: song.songsterrId,
        tangoId: song.tangoId,
        pages: song.pages,
        recordings: song.recordings,
      };

      setSetlists((prev) =>
        prev.map((sl) => {
          if (sl.name === setlistName) {
            const currentSongs = sl.songs || [];
            return {
              ...sl,
              songs: [...currentSongs, songToAppend],
            };
          }
          return sl;
        })
      );

      if (onSongAdded) {
        onSongAdded(songToAppend);
      }

      try {
        await addSongToSetlist(
          {
            setlistName,
            title: song.title,
            artist: song.artist || song.composer || 'Artista',
            content: contentToSave,
            youtubeId: song.youtubeId || '',
            syncData: song.syncData || '',
            transpose: song.transpose ?? 0,
            chordVariants: song.chordVariants || null,
          },
          currentUser
        );
      } catch (e) {
        console.warn('[useSetlistRepertoire] Song added to setlist in memory:', e);
      }
    },
    [currentUser, onSongAdded]
  );

  // Remove song from setlist
  const handleRemoveSongFromSetlist = useCallback(
    async (setlistName, songId) => {
      setSetlists((prev) =>
        prev.map((sl) => {
          if (sl.name === setlistName) {
            return {
              ...sl,
              songs: (sl.songs || []).filter((s) => s.id !== songId),
            };
          }
          return sl;
        })
      );

      try {
        await removeSongFromSetlist(setlistName, songId, currentUser);
      } catch (e) {
        console.warn('[useSetlistRepertoire] Song removed from setlist in memory:', e);
      }
    },
    [currentUser]
  );

  // Live Stage Mode: Play entire setlist from a given index
  const handlePlaySetlist = useCallback(
    (setlist, startIndex = 0, callback = onSelectSong) => {
      if (!setlist.songs || setlist.songs.length === 0) return;
      const songItem = setlist.songs[startIndex] || setlist.songs[0];
      const fullSongData = SAMPLE_SONGS_DATA[songItem.id] || songItem;

      setStageModeSetlist({ setlist, currentIndex: startIndex });
      if (callback) {
        callback(fullSongData);
      }
    },
    [onSelectSong]
  );

  const handlePlaySongFromSetlistPanel = useCallback(
    (song, openSongCallback) => {
      if (activeSetlist && activeSetlist.songs) {
        const idx = activeSetlist.songs.findIndex((s) => s.id === song.id);
        handlePlaySetlist(activeSetlist, idx >= 0 ? idx : 0, openSongCallback);
      } else if (openSongCallback) {
        openSongCallback(song);
      }
    },
    [activeSetlist, handlePlaySetlist]
  );

  // Build live stage navigation context
  const setlistContext = useMemo(() => {
    if (!stageModeSetlist) return null;

    return {
      setlist: stageModeSetlist.setlist,
      currentIndex: stageModeSetlist.currentIndex,
      onNextSong: (callback = onSelectSong) => {
        const nextIdx = stageModeSetlist.currentIndex + 1;
        if (nextIdx < stageModeSetlist.setlist.songs.length) {
          const nextSong = stageModeSetlist.setlist.songs[nextIdx];
          setStageModeSetlist({ ...stageModeSetlist, currentIndex: nextIdx });
          if (callback) {
            callback(SAMPLE_SONGS_DATA[nextSong.id] || nextSong);
          }
        }
      },
      onPrevSong: (callback = onSelectSong) => {
        const prevIdx = stageModeSetlist.currentIndex - 1;
        if (prevIdx >= 0) {
          const prevSong = stageModeSetlist.setlist.songs[prevIdx];
          setStageModeSetlist({ ...stageModeSetlist, currentIndex: prevIdx });
          if (callback) {
            callback(SAMPLE_SONGS_DATA[prevSong.id] || prevSong);
          }
        }
      },
      onSelectSongIndex: (idx, callback = onSelectSong) => {
        if (idx >= 0 && idx < stageModeSetlist.setlist.songs.length) {
          const chosenSong = stageModeSetlist.setlist.songs[idx];
          setStageModeSetlist({ ...stageModeSetlist, currentIndex: idx });
          if (callback) {
            callback(SAMPLE_SONGS_DATA[chosenSong.id] || chosenSong);
          }
        }
      },
      onExitStage: (callback = null) => {
        setStageModeSetlist(null);
        if (typeof callback === 'function') {
          callback();
        }
      },
    };
  }, [stageModeSetlist, onSelectSong]);

  return {
    setlists,
    setSetlists,
    activeSetlist,
    setActiveSetlist,
    stageModeSetlist,
    setStageModeSetlist,
    setlistContext,
    handleCreateSetlist,
    handleDeleteSetlist,
    handleAddSongToSetlist,
    handleRemoveSongFromSetlist,
    handlePlaySetlist,
    handlePlaySongFromSetlistPanel,
  };
}
