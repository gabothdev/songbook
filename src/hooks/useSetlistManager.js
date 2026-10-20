import { useCallback } from 'react';
import { useUserLibrary, INITIAL_USER_SONGS } from './useUserLibrary';
import { useSetlistRepertoire, INITIAL_SETLISTS } from './useSetlistRepertoire';

export { INITIAL_USER_SONGS, INITIAL_SETLISTS };

/**
 * useSetlistManager Hook
 * Composes user's personal song library and setlists repertoire,
 * preserving 100% backwards-compatibility and synchronizing auto-save behaviors.
 */
export function useSetlistManager({ currentUser = null, onSelectSong = null, onUpdateSelectedSong = null } = {}) {
  const library = useUserLibrary({ currentUser, onUpdateSelectedSong });

  // When a song is added to a setlist, ensure it is also marked as saved in user library
  const handleSongAddedToSetlist = useCallback(
    (song) => {
      library.setUserSongs((prev) => {
        const exists = prev.some(
          (s) => String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
        );
        if (exists) {
          return prev.map((s) =>
            String(s.id) === String(song.id) || (s.title === song.title && s.artist === song.artist)
              ? { ...s, isSaved: true }
              : s
          );
        }
        return [{ ...song, isSaved: true }, ...prev];
      });
    },
    [library]
  );

  const repertoire = useSetlistRepertoire({
    currentUser,
    onSelectSong,
    onSongAdded: handleSongAddedToSetlist,
  });

  const handleToggleSaveSongWithSetlists = useCallback(
    (song) => {
      return library.handleToggleSaveSong(song, repertoire.setlists);
    },
    [library, repertoire.setlists]
  );

  return {
    userSongs: library.userSongs,
    setUserSongs: library.setUserSongs,
    setlists: repertoire.setlists,
    setSetlists: repertoire.setSetlists,
    activeSetlist: repertoire.activeSetlist,
    setActiveSetlist: repertoire.setActiveSetlist,
    stageModeSetlist: repertoire.stageModeSetlist,
    setStageModeSetlist: repertoire.setStageModeSetlist,
    setlistContext: repertoire.setlistContext,
    handleToggleFavorite: library.handleToggleFavorite,
    handleToggleSaveSong: handleToggleSaveSongWithSetlists,
    handleCreateSetlist: repertoire.handleCreateSetlist,
    handleDeleteSetlist: repertoire.handleDeleteSetlist,
    handleAddSongToSetlist: repertoire.handleAddSongToSetlist,
    handleRemoveSongFromSetlist: repertoire.handleRemoveSongFromSetlist,
    handlePlaySetlist: repertoire.handlePlaySetlist,
    handlePlaySongFromSetlistPanel: repertoire.handlePlaySongFromSetlistPanel,
    handleImportScrapedSong: library.handleImportScrapedSong,
  };
}

export default useSetlistManager;
