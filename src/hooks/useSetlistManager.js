import { useState, useEffect, useMemo, useCallback } from 'react';
import { SAMPLE_SONGS_DATA } from '../data/sampleSongs';
import { extractUniqueChords } from '../services/scraperApi';
import {
  fetchSavedSongs,
  saveSong,
  fetchFavorites,
  addFavorite,
  removeFavorite,
  fetchSetlists,
  createSetlist,
  deleteSetlist,
  addSongToSetlist,
  removeSongFromSetlist,
} from '../services/persistenceApi';

export const INITIAL_USER_SONGS = [
  { id: '3', title: 'Seminare', artist: 'Serú Girán', key: 'C', isFavorite: true },
  { id: '1', title: 'Muchacha (Ojos de papel)', artist: 'Almendra', key: 'G', isFavorite: true },
  { id: '2', title: 'De Música Ligera', artist: 'Soda Stereo', key: 'Bm', isFavorite: true },
  { id: '4', title: 'Los Mareados', artist: 'Aníbal Troilo', key: 'Am', isFavorite: false },
  { id: '5', title: 'Rezo por vos', artist: 'Charly García & Spinetta', key: 'A', isFavorite: true },
  { id: '6', title: 'Seguir viviendo sin tu amor', artist: 'Luis Alberto Spinetta', key: 'E', isFavorite: false },
];

export const INITIAL_SETLISTS = [
  {
    name: 'En Vivo Acústico',
    songs: [
      { id: '3', title: 'Seminare', artist: 'Serú Girán', key: 'C' },
      { id: '1', title: 'Muchacha (Ojos de papel)', artist: 'Almendra', key: 'G' },
      { id: '6', title: 'Seguir viviendo sin tu amor', artist: 'Luis Alberto Spinetta', key: 'E' },
    ],
  },
  {
    name: 'Canciones para Fogón',
    songs: [
      { id: '2', title: 'De Música Ligera', artist: 'Soda Stereo', key: 'Bm' },
      { id: '5', title: 'Rezo por vos', artist: 'Charly García & Spinetta', key: 'A' },
      { id: '3', title: 'Seminare', artist: 'Serú Girán', key: 'C' },
    ],
  },
  {
    name: 'Práctica de Bandoneón',
    songs: [
      { id: '4', title: 'Los Mareados', artist: 'Aníbal Troilo', key: 'Am' },
    ],
  },
];

/**
 * useSetlistManager Hook
 * Manages repertories (setlists), favorites, song catalog, persistence,
 * and live stage navigation context.
 */
export function useSetlistManager({ onSelectSong = null, onUpdateSelectedSong = null } = {}) {
  const [userSongs, setUserSongs] = useState(() => {
    const saved = localStorage.getItem('songbook_user_songs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* ignore */
      }
    }
    return INITIAL_USER_SONGS;
  });

  const [setlists, setSetlists] = useState(() => {
    const saved = localStorage.getItem('songbook_setlists');
    if (saved) {
      try {
        return JSON.parse(saved);
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
    localStorage.setItem('songbook_user_songs', JSON.stringify(userSongs));
  }, [userSongs]);

  useEffect(() => {
    localStorage.setItem('songbook_setlists', JSON.stringify(setlists));
  }, [setlists]);

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

  // Load songs, favorites and setlists from SQLite Database on mount
  useEffect(() => {
    async function loadDatabaseData() {
      try {
        const [songsRes, favsRes, setlistsRes] = await Promise.all([
          fetchSavedSongs(),
          fetchFavorites(),
          fetchSetlists(),
        ]);

        const favIds = new Set(Array.isArray(favsRes) ? favsRes.map((f) => String(f.id)) : []);

        if (Array.isArray(songsRes) && songsRes.length > 0) {
          const mappedSongs = songsRes.map((s) => {
            const uniqueChords = extractUniqueChords(s.content);
            const isFavorite = favIds.has(String(s.id));

            // Extract BPM and TimeSignature from content tags if present
            const bpmMatch = s.content ? s.content.match(/\[\s*BPM\s*[@:]?\s*(\d+)\s*\]/i) : null;
            const beatsMatch = s.content ? s.content.match(/\[\s*Beats\s*[@:]?\s*(\d+)\s*\]/i) : null;
            const timeSigMatch = s.content ? s.content.match(/\[\s*(?:Time|TimeSignature|Metro)\s*[@:]?\s*(\d+\/\d+)\s*\]/i) : null;

            const parsedBpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 100;
            const parsedTimeSig = timeSigMatch
              ? timeSigMatch[1]
              : beatsMatch
              ? (parseInt(beatsMatch[1], 10) === 3 ? '3/4' : parseInt(beatsMatch[1], 10) === 6 ? '6/8' : `${beatsMatch[1]}/4`)
              : '4/4';

            const fullSong = {
              id: String(s.id),
              title: s.title,
              artist: s.artist,
              artistImage: s.artistImage || null,
              albumCover: s.albumCover || null,
              album: s.album || null,
              releaseYear: s.releaseYear || null,
              versionType: s.versionType || 'studio',
              versionDetails: s.versionDetails || null,
              artists: s.artists || [],
              isCustom: Boolean(s.isCustom),
              originalContent: s.originalContent || null,
              key: uniqueChords[0] || 'C',
              bpm: parsedBpm,
              timeSignature: parsedTimeSig,
              youtubeId: s.youtubeId || '1F8oHw1jW10',
              syncData: s.syncData,
              transpose: s.transpose ?? 0,
              chordVariants: s.chordVariants || null,
              uniqueChords,
              isFavorite,
              sections: [
                { name: 'Intro', time: '0:00' },
                { name: 'Verso 1', time: '0:15' },
                { name: 'Estribillo', time: '0:45' },
              ],
              content: s.content,
            };
            SAMPLE_SONGS_DATA[String(s.id)] = fullSong;
            return fullSong;
          });

          setUserSongs(mappedSongs);
        }

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
        }
      } catch (err) {
        console.warn('[useSetlistManager] Using local catalog fallback:', err);
      }
    }

    loadDatabaseData();
  }, []);

  // Toggle favorite with SQLite & state update
  const handleToggleFavorite = async (song) => {
    if (!song) return;

    // Find current song in userSongs state
    const currentSongInState = userSongs.find(
      (s) => String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
    );
    const isCurrentlyFav = currentSongInState ? !!currentSongInState.isFavorite : !!song.isFavorite;
    const newFavStatus = !isCurrentlyFav;

    setUserSongs((prev) =>
      prev.map((s) => {
        if (String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)) {
          return { ...s, isFavorite: newFavStatus };
        }
        return s;
      })
    );

    // Notify parent to sync currently-open song's favorite status
    if (onUpdateSelectedSong) {
      onUpdateSelectedSong((prev) =>
        prev && (String(prev.id) === String(song.id) || prev.title === song.title)
          ? { ...prev, isFavorite: newFavStatus }
          : prev
      );
    }

    try {
      if (newFavStatus) {
        const saved = await addFavorite({
          title: song.title,
          artist: song.artist,
          content: song.content || '',
          youtubeId: song.youtubeId || '',
          syncData: song.syncData || '',
          transpose: song.transpose ?? 0,
          chordVariants: song.chordVariants || null,
        });
        if (saved && saved.id) {
          setUserSongs((prev) =>
            prev.map((s) =>
              s.title === song.title && s.artist === song.artist
                ? { ...s, id: String(saved.id), isFavorite: true }
                : s
            )
          );
        }
      } else {
        const songIdToDelete = currentSongInState?.id || song.id;
        if (songIdToDelete) {
          await removeFavorite(songIdToDelete);
        }
      }
    } catch (e) {
      console.warn('[useSetlistManager] Favorite saved to local storage:', e);
    }
  };

  // Create setlist
  const handleCreateSetlist = async (name) => {
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
      await createSetlist(trimmed);
    } catch (e) {
      console.warn('[useSetlistManager] Setlist created in memory:', e);
    }
  };

  // Delete setlist
  const handleDeleteSetlist = async (name) => {
    setSetlists((prev) => prev.filter((s) => s.name !== name));
    if (activeSetlist && activeSetlist.name === name) {
      setActiveSetlist(null);
    }

    try {
      await deleteSetlist(name);
    } catch (e) {
      console.warn('[useSetlistManager] Setlist deleted in memory:', e);
    }
  };

  // Add song or score to setlist
  const handleAddSongToSetlist = async (setlistName, song) => {
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
        difficulty: song.difficulty
      };
      contentToSave = `[SCORE_SHEET]${JSON.stringify(payload)}`;
    }

    const songId = song.id || (song.songsterrId ? `st_${song.songsterrId}` : `tango_${song.tangoId || Date.now()}`);

    setSetlists((prev) =>
      prev.map((sl) => {
        if (sl.name === setlistName) {
          const currentSongs = sl.songs || [];
          return {
            ...sl,
            songs: [
              ...currentSongs,
              {
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
                recordings: song.recordings
              },
            ],
          };
        }
        return sl;
      })
    );

    try {
      await addSongToSetlist({
        setlistName,
        title: song.title,
        artist: song.artist || song.composer || 'Artista',
        content: contentToSave,
        youtubeId: song.youtubeId || '',
        syncData: song.syncData || '',
        transpose: song.transpose ?? 0,
        chordVariants: song.chordVariants || null,
      });
    } catch (e) {
      console.warn('[useSetlistManager] Song added to setlist in memory:', e);
    }
  };

  // Remove song from setlist
  const handleRemoveSongFromSetlist = async (setlistName, songId) => {
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
      await removeSongFromSetlist(setlistName, songId);
    } catch (e) {
      console.warn('[useSetlistManager] Song removed from setlist in memory:', e);
    }
  };

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

  // Import scraped song
  const handleImportScrapedSong = async (songData, openSongCallback) => {
    const rawContent = typeof songData === 'string' ? songData : songData.content || '';
    const uniqueChords = extractUniqueChords(rawContent);

    const syncData = songData.compases ? JSON.stringify(songData.compases) : songData.syncData || null;

    const newSong = {
      id: `scraped_${Date.now()}`,
      title: songData.title || 'Canción Importada',
      artist: songData.artist || 'Artista Desconocido',
      key: uniqueChords[0] || 'C',
      bpm: songData.bpm || 100,
      timeSignature: '4/4',
      youtubeId: songData.youtubeId || '1F8oHw1jW10',
      uniqueChords,
      isFavorite: true,
      syncData,
      compases: songData.compases || (syncData ? JSON.parse(syncData) : null),
      transpose: songData.transpose ?? 0,
      chordVariants: songData.chordVariants || null,
      sections: [
        { name: 'Intro', time: '0:00' },
        { name: 'Verso 1', time: '0:15' },
        { name: 'Estribillo', time: '0:45' },
      ],
      content: rawContent,
    };

    // Save in DB
    try {
      await saveSong({
        title: newSong.title,
        artist: newSong.artist,
        content: newSong.content,
        youtubeId: newSong.youtubeId,
        syncData: newSong.syncData,
        transpose: newSong.transpose,
        chordVariants: newSong.chordVariants,
      });
    } catch (e) {
      console.warn('[useSetlistManager] Saved to memory:', e);
    }

    setUserSongs((prev) => [
      {
        id: newSong.id,
        title: newSong.title,
        artist: newSong.artist,
        key: newSong.key,
        isFavorite: true,
        transpose: newSong.transpose,
        chordVariants: newSong.chordVariants,
      },
      ...prev,
    ]);
    SAMPLE_SONGS_DATA[newSong.id] = newSong;

    if (openSongCallback) {
      openSongCallback(newSong);
    }
  };

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
    userSongs,
    setUserSongs,
    setlists,
    setSetlists,
    activeSetlist,
    setActiveSetlist,
    stageModeSetlist,
    setStageModeSetlist,
    setlistContext,
    handleToggleFavorite,
    handleCreateSetlist,
    handleDeleteSetlist,
    handleAddSongToSetlist,
    handleRemoveSongFromSetlist,
    handlePlaySetlist,
    handlePlaySongFromSetlistPanel,
    handleImportScrapedSong,
  };
}

export default useSetlistManager;
