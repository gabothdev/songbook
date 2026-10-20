import { useState, useEffect, useCallback } from 'react';
import { SAMPLE_SONGS_DATA } from '../data/sampleSongs';
import { extractUniqueChords } from '../services/scraperApi';
import {
  fetchSavedSongs,
  fetchUserLibrary,
  saveSongToLibrary,
  unsaveSongFromLibrary,
  saveSong,
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from '../services/persistenceApi';

export const INITIAL_USER_SONGS = [];

/**
 * useUserLibrary Hook
 * Manages user's personal song library, SQLite catalog sync,
 * favorite toggles, and bookmark/save actions.
 */
export function useUserLibrary({ currentUser = null, onUpdateSelectedSong = null } = {}) {
  const [userSongs, setUserSongs] = useState(() => {
    const saved = localStorage.getItem('songbook_user_songs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const filtered = Array.isArray(parsed)
          ? parsed.filter((s) => !['1', '2', '3', '4', '5', '6'].includes(String(s.id)))
          : [];
        if (filtered.length > 0) return filtered;
      } catch (e) {
        /* ignore */
      }
    }
    return INITIAL_USER_SONGS;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('songbook_user_songs', JSON.stringify(userSongs));
  }, [userSongs]);

  // Load songs and favorites from SQLite Database on mount and when currentUser changes
  useEffect(() => {
    async function loadDatabaseData() {
      try {
        const [songsRes, favsRes] = await Promise.all([
          currentUser ? fetchUserLibrary(currentUser) : fetchSavedSongs(),
          currentUser ? fetchFavorites(currentUser) : Promise.resolve([]),
        ]);

        const favIds = new Set(Array.isArray(favsRes) ? favsRes.map((f) => String(f.id)) : []);

        if (Array.isArray(songsRes)) {
          const mappedSongs = songsRes.map((s) => {
            const uniqueChords = extractUniqueChords(s.content);
            const isFavorite = s.isFavorite !== undefined ? Boolean(s.isFavorite) : favIds.has(String(s.id));
            const isSaved = s.isSaved !== undefined ? Boolean(s.isSaved) : (currentUser ? true : false);

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
              isSaved,
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
      } catch (err) {
        console.warn('[useUserLibrary] Using local catalog fallback:', err);
      }
    }

    loadDatabaseData();
  }, [currentUser]);

  // Toggle save to personal notebook library
  const handleToggleSaveSong = useCallback(
    async (song, setlists = []) => {
      if (!song || !currentUser) return;

      const currentSongInState = userSongs.find(
        (s) => String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
      );
      const isCurrentlySaved = currentSongInState ? !!currentSongInState.isSaved : !!song.isSaved;
      const newSaveStatus = !isCurrentlySaved;

      if (newSaveStatus) {
        const updatedSong = { ...song, isSaved: true };
        setUserSongs((prev) => {
          const exists = prev.some((s) => String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist));
          if (exists) {
            return prev.map((s) =>
              String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
                ? { ...s, isSaved: true }
                : s
            );
          }
          return [updatedSong, ...prev];
        });

        if (onUpdateSelectedSong) {
          onUpdateSelectedSong((prev) =>
            prev && (String(prev.id) === String(song.id) || prev.title === song.title)
              ? { ...prev, isSaved: true }
              : prev
          );
        }

        try {
          await saveSongToLibrary(
            {
              songId: song.id,
              title: song.title,
              artist: song.artist,
              content: song.content,
              youtubeId: song.youtubeId,
              syncData: song.syncData,
              transpose: song.transpose,
              chordVariants: song.chordVariants,
            },
            currentUser
          );
        } catch (e) {
          console.warn('[useUserLibrary] Error saving to library:', e);
        }
      } else {
        const isFav = currentSongInState?.isFavorite;
        const inSetlist = setlists.some((sl) => sl.songs?.some((ss) => String(ss.id) === String(song.id)));

        setUserSongs((prev) => {
          if (!isFav && !inSetlist) {
            return prev.filter((s) => String(s.id) !== String(song.id) && !(s.title === song.title && s.artist === song.artist));
          }
          return prev.map((s) =>
            String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
              ? { ...s, isSaved: false }
              : s
          );
        });

        if (onUpdateSelectedSong) {
          onUpdateSelectedSong((prev) =>
            prev && (String(prev.id) === String(song.id) || prev.title === song.title)
              ? { ...prev, isSaved: false }
              : prev
          );
        }

        try {
          await unsaveSongFromLibrary(currentSongInState?.id || song.id, currentUser);
        } catch (e) {
          console.warn('[useUserLibrary] Error unsaving from library:', e);
        }
      }
    },
    [userSongs, currentUser, onUpdateSelectedSong]
  );

  // Toggle favorite with SQLite & state update
  const handleToggleFavorite = useCallback(
    async (song) => {
      if (!song) return;

      const currentSongInState = userSongs.find(
        (s) => String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
      );
      const isCurrentlyFav = currentSongInState ? !!currentSongInState.isFavorite : !!song.isFavorite;
      const newFavStatus = !isCurrentlyFav;

      setUserSongs((prev) => {
        const exists = prev.some((s) => String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist));
        if (exists) {
          return prev.map((s) => {
            if (String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)) {
              return { ...s, isFavorite: newFavStatus, ...(newFavStatus ? { isSaved: true } : {}) };
            }
            return s;
          });
        }
        return [{ ...song, isFavorite: newFavStatus, isSaved: true }, ...prev];
      });

      if (onUpdateSelectedSong) {
        onUpdateSelectedSong((prev) =>
          prev && (String(prev.id) === String(song.id) || prev.title === song.title)
            ? { ...prev, isFavorite: newFavStatus, ...(newFavStatus ? { isSaved: true } : {}) }
            : prev
        );
      }

      try {
        if (newFavStatus) {
          const saved = await addFavorite(
            {
              title: song.title,
              artist: song.artist,
              content: song.content || '',
              youtubeId: song.youtubeId || '',
              syncData: song.syncData || '',
              transpose: song.transpose ?? 0,
              chordVariants: song.chordVariants || null,
            },
            currentUser
          );
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
            await removeFavorite(songIdToDelete, currentUser);
          }
        }
      } catch (e) {
        console.warn('[useUserLibrary] Favorite persistence notice:', e);
      }
    },
    [userSongs, currentUser, onUpdateSelectedSong]
  );

  // Import scraped song
  const handleImportScrapedSong = useCallback(
    async (songData, openSongCallback) => {
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
        isSaved: true,
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
        console.warn('[useUserLibrary] Scraped song saved in memory:', e);
      }

      setUserSongs((prev) => [
        {
          id: newSong.id,
          title: newSong.title,
          artist: newSong.artist,
          key: newSong.key,
          isFavorite: true,
          isSaved: true,
          transpose: newSong.transpose,
          chordVariants: newSong.chordVariants,
        },
        ...prev,
      ]);
      SAMPLE_SONGS_DATA[newSong.id] = newSong;

      if (openSongCallback) {
        openSongCallback(newSong);
      }
    },
    []
  );

  return {
    userSongs,
    setUserSongs,
    handleToggleSaveSong,
    handleToggleFavorite,
    handleImportScrapedSong,
  };
}
