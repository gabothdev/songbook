import { useState, useEffect, useCallback } from 'react';
import { saveCustomSongVersion, restoreOriginalSong, saveSong } from '../services/persistenceApi';

/**
 * useSongArrangement Hook
 * Manages custom user arrangement, draft edits, instrumental toggles,
 * YouTube link attachment, and persistence of custom vs original versions.
 */
export function useSongArrangement({
  song,
  currentUser = null,
  activeCompases = null,
  onNotify = null,
}) {
  const [currentContent, setCurrentContent] = useState(song?.content || '');
  const [isCustom, setIsCustom] = useState(Boolean(song?.isCustom));
  const [isInstrumental, setIsInstrumental] = useState(Boolean(song?.isInstrumental));
  const [originalContent, setOriginalContent] = useState(song?.originalContent || null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState(song?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [currentYouTubeId, setCurrentYouTubeId] = useState(song?.youtubeId || '');

  // Reset or initialize state when active song changes
  useEffect(() => {
    if (!song) return;
    setCurrentContent(song.content || '');
    setIsCustom(Boolean(song.isCustom));
    setIsInstrumental(Boolean(song.isInstrumental));
    setOriginalContent(song.originalContent || null);
    setDraftContent(song.content || '');
    setCurrentYouTubeId(song.youtubeId || '');
    setIsEditMode(false);
  }, [song?.id, song?.title, song?.content, song?.isCustom, song?.isInstrumental, song?.originalContent, song?.youtubeId]);

  const notify = useCallback(
    (msg, timeout = 2500) => {
      if (onNotify) {
        onNotify(msg);
        setTimeout(() => onNotify(null), timeout);
      }
    },
    [onNotify]
  );

  const handleToggleEditMode = useCallback(() => {
    if (!isEditMode) {
      setDraftContent(currentContent);
    }
    setIsEditMode((prev) => !prev);
  }, [isEditMode, currentContent]);

  const handleSelectYouTubeVideo = useCallback(
    async (newYtId) => {
      if (!song) return;
      setCurrentYouTubeId(newYtId);
      try {
        await saveSong({
          id: song.id,
          title: song.title,
          artist: song.artist,
          youtubeId: newYtId,
          content: currentContent,
        });
        notify('Video de YouTube vinculado');
      } catch (e) {
        console.warn('[useSongArrangement] Error saving linked youtubeId:', e);
      }
    },
    [song, currentContent, notify]
  );

  const handleSaveCustomVersion = useCallback(async (overrideCompases = null) => {
    if (!song) return;
    setIsSaving(true);
    try {
      const cleanDraftContent = (draftContent || '').replace(/\u200D/g, '');
      const compasesToSave = overrideCompases !== null ? overrideCompases : activeCompases;
      const backupOriginal = originalContent || song.originalContent || song.content;
      await saveCustomSongVersion({
        id: song.id,
        title: song.title,
        artist: song.artist,
        content: cleanDraftContent,
        syncData: compasesToSave ? JSON.stringify(compasesToSave) : (song.syncData || null),
        originalContent: backupOriginal,
        isInstrumental: Boolean(isInstrumental || song.isInstrumental),
        user: currentUser?.email,
        userId: currentUser?.id,
      });

      // Update in-memory song object so parent and other views don't read stale data
      song.content = cleanDraftContent;
      if (compasesToSave) {
        song.syncData = JSON.stringify(compasesToSave);
      }
      song.isCustom = true;
      song.isInstrumental = Boolean(isInstrumental || song.isInstrumental);

      setCurrentContent(cleanDraftContent);
      setDraftContent(cleanDraftContent);
      setIsCustom(true);
      if (!originalContent) {
        setOriginalContent(backupOriginal);
      }
      setIsEditMode(false);
      notify('¡Cambios guardados con éxito!');
    } catch (err) {
      console.error('[useSongArrangement] Error saving song:', err);
      notify(err.message || 'Error al guardar la canción', 3000);
    } finally {
      setIsSaving(false);
    }
  }, [song, originalContent, draftContent, activeCompases, isInstrumental, currentUser, notify]);

  const handleMarkAsInstrumental = useCallback(
    async (newContent, targetIsInstrumental = true, overrideCompases = null) => {
      if (!song) return;
      setIsInstrumental(targetIsInstrumental);
      const contentToSave = newContent || draftContent;
      setDraftContent(contentToSave);
      setCurrentContent(contentToSave);

      try {
        const compasesToSave = overrideCompases !== null ? overrideCompases : activeCompases;
        const backupOriginal = originalContent || song.originalContent || song.content;
        await saveCustomSongVersion({
          id: song.id,
          title: song.title,
          artist: song.artist,
          content: contentToSave,
          syncData: compasesToSave ? JSON.stringify(compasesToSave) : (song.syncData || null),
          originalContent: backupOriginal,
          isInstrumental: targetIsInstrumental,
          user: currentUser?.email,
          userId: currentUser?.id,
        });
        notify(targetIsInstrumental ? '¡Canción configurada como instrumental!' : '¡Letra añadida a la canción!');
      } catch (err) {
        console.error('[useSongArrangement] Error updating instrumental state:', err);
        notify(err.message || 'Error al actualizar la canción', 3000);
      }
    },
    [song, draftContent, originalContent, activeCompases, currentUser, notify]
  );

  const handleRestoreOriginal = useCallback(async () => {
    if (!song) return;
    setIsSaving(true);
    try {
      const res = await restoreOriginalSong({
        id: song.id,
        title: song.title,
        artist: song.artist,
        user: currentUser?.email,
        userId: currentUser?.id,
      });
      const restoredText = res?.song?.content || originalContent || song.originalContent;
      if (restoredText) {
        setCurrentContent(restoredText);
        setDraftContent(restoredText);
      }
      setIsCustom(false);
      setIsInstrumental(Boolean(res?.song?.isInstrumental));
      setIsEditMode(false);
      notify('Versión original restaurada');
    } catch (err) {
      console.error('[useSongArrangement] Error restoring song:', err);
      notify(err.message || 'Error al restaurar la canción', 3000);
    } finally {
      setIsSaving(false);
    }
  }, [song, originalContent, currentUser, notify]);

  return {
    currentContent,
    setCurrentContent,
    isCustom,
    setIsCustom,
    isInstrumental,
    setIsInstrumental,
    originalContent,
    setOriginalContent,
    isEditMode,
    setIsEditMode,
    draftContent,
    setDraftContent,
    isSaving,
    currentYouTubeId,
    setCurrentYouTubeId,
    handleToggleEditMode,
    handleSelectYouTubeVideo,
    handleSaveCustomVersion,
    handleMarkAsInstrumental,
    handleRestoreOriginal,
  };
}
