import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Mic2,
  CheckCircle,
  ListMusic,
  LogOut,
  Check,
  Sparkles,
  Play,
} from 'lucide-react';
import SpiralRings from '../notebook/SpiralRings';
import FloatingVideoPaper from './FloatingVideoPaper';
import SongHeaderControls from './SongHeaderControls';
import SongLyricsRenderer from './SongLyricsRenderer';
import ChordCatalogPanel from './ChordCatalogPanel';
import { useInstrument } from '../../context/InstrumentContext';
import { useAuth } from '../../context/AuthContext';
import usePitchShiftAudio from '../../hooks/usePitchShiftAudio';
import useSongPreferences from '../../hooks/useSongPreferences';
import useYouTubeSync from '../../hooks/useYouTubeSync';
import { CHORD_DATABASE, SAMPLE_SONGS_DATA } from '../../data/sampleSongs';
import { transposeChord, normalizeChordName } from '../../utils/music';
import { playStrummedChord, getNotesFromFrets } from '../../utils/audioPlayer';
import { parseSongTextToGrid, alignCompasesWithSongSections, formatCompasesToText, getSongBpm, updateTextBpm, doubleGridBpm, halveGridBpm } from '../../utils/gridParser';
import { lookupChord, saveCustomSongVersion, restoreOriginalSong, saveSong, updateSongPreferences } from '../../services/persistenceApi';
import SongLyricsEditor from './SongLyricsEditor';
import SongLyricsVisualEditor from './SongLyricsVisualEditor';
import YouTubeVideoPickerModal from './YouTubeVideoPickerModal';
import SongMemorabiliaDesk from './SongMemorabiliaDesk';

/**
 * SongSheetView Component
 * High-performance, modular sheet music and chords viewer in notebook dual-page spread.
 */
export default function SongSheetView({
  song,
  onBack,
  setlistContext = null,
  isFavorite = false,
  onToggleFavorite = null,
  setlists = [],
  onAddSongToSetlist = null,
}) {
  const { currentUser, openUpgradeModal, isPro, isAdmin } = useAuth();
  const isPremium = isPro || currentUser?.tier === 'PREMIUM';
  const { instrument } = useInstrument();

  // Encapsulated Tone & Variant Preferences
  const {
    transpose,
    selectedVariants,
    feedbackToast,
    setFeedbackToast,
    proAudioNotice,
    setProAudioNotice,
    handleTranspose,
    handleVariantChange,
  } = useSongPreferences({
    song,
    isPremium,
    openUpgradeModal,
    currentUser,
  });

  // Song Content & Custom Arrangement State
  const [currentContent, setCurrentContent] = useState(song.content || '');
  const [isCustom, setIsCustom] = useState(Boolean(song.isCustom));
  const [isInstrumental, setIsInstrumental] = useState(Boolean(song.isInstrumental));
  const [originalContent, setOriginalContent] = useState(song.originalContent || null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState(song.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [currentYouTubeId, setCurrentYouTubeId] = useState(song.youtubeId || '');
  const [isSyncMode, setIsSyncMode] = useState(true);
  const [isYouTubePickerOpen, setIsYouTubePickerOpen] = useState(false);

  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed] = useState(1);
  const [activeChord, setActiveChord] = useState(song.uniqueChords?.[0] || 'C');
  const [isVideoPaperOpen, setIsVideoPaperOpen] = useState(true);
  const [isSetlistDropdownOpen, setIsSetlistDropdownOpen] = useState(false);
  // Mobile-only tab switcher: 'lyrics' | 'chords'
  const [mobilePage, setMobilePage] = useState('lyrics');

  // YouTube player instance and time tracking
  const [playerInstance, setPlayerInstance] = useState(null);
  const [externalTime, setExternalTime] = useState(null);

  // Pitch shift audio stream hook
  const {
    isPitchShiftActive,
    isLoadingAudio,
    pitchShiftStatus,
    pitchShiftMessage,
    syncPlaybackState,
    syncSeekTime,
  } = usePitchShiftAudio({
    youtubeId: currentYouTubeId || '',
    transpose,
    isPremium,
    playerInstance,
  });

  // Right Page Tabs: 'beatgrid' | 'chords'
  const [rightPageView, setRightPageView] = useState('beatgrid');
  const [beatGridMode, setBeatGridMode] = useState('ribbon');
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);

  // Dynamic chord definitions loaded from SQLite database
  const [chordDefinitions, setChordDefinitions] = useState({});

  const lyricsScrollRef = useRef(null);
  const setlistDropdownRef = useRef(null);

  // Fix #11 — Close the setlist dropdown when clicking outside of it
  useEffect(() => {
    if (!isSetlistDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (setlistDropdownRef.current && !setlistDropdownRef.current.contains(e.target)) {
        setIsSetlistDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSetlistDropdownOpen]);

  // Fix #12 — Clamp transpose to [-12, +12] semitones
  const handleTransposeClamped = useCallback((delta) => {
    handleTranspose(delta, (next) => {
      if (next > 12 || next < -12) return; // clamped — no further action needed
    });
  }, [handleTranspose]);

  // Handle updating and persisting artist image and album cover
  const handleUpdateSongImages = useCallback(
    async ({ artistImage, albumCover, album, releaseYear, versionType, versionDetails }) => {
      if (!song) return;
      if (artistImage !== undefined) song.artistImage = artistImage;
      if (albumCover !== undefined) song.albumCover = albumCover;
      if (album !== undefined) song.album = album;
      if (releaseYear !== undefined) song.releaseYear = releaseYear;
      if (versionType !== undefined) song.versionType = versionType;
      if (versionDetails !== undefined) song.versionDetails = versionDetails;

      try {
        const saved = await updateSongPreferences({
          id: song.id,
          title: song.title,
          artist: song.artist,
          content: song.content,
          youtubeId: song.youtubeId,
          syncData: song.syncData,
          transpose: song.transpose,
          chordVariants: song.chordVariants,
          artistImage,
          albumCover,
          album,
          releaseYear,
          versionType,
          versionDetails,
          user: currentUser?.email || currentUser?.id,
          isCustom: song.isCustom,
        });

        if (saved?.id) {
          song.id = String(saved.id);
        }
        if (SAMPLE_SONGS_DATA && song.id) {
          SAMPLE_SONGS_DATA[String(song.id)] = {
            ...(SAMPLE_SONGS_DATA[String(song.id)] || {}),
            ...song,
          };
        }
      } catch (err) {
        console.warn('Error saving song images and metadata:', err);
      }
    },
    [song]
  );

  // Pre-computed rhythmic measures (BeatGrid) from Chordify or database syncData
  const initialCompases = useMemo(() => {
    if (song.compases && Array.isArray(song.compases) && song.compases.length > 0) {
      return song.compases;
    }
    if (song.syncData) {
      try {
        const parsed = JSON.parse(song.syncData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        /* ignore */
      }
    }
    return null;
  }, [song.compases, song.syncData]);

  const [activeCompases, setActiveCompases] = useState(initialCompases);

  // Synchronize activeCompases if the song changes
  useEffect(() => {
    setActiveCompases(initialCompases);
  }, [initialCompases, song.id]);

  // Parse or retrieve pre-computed rhythmic measures (BeatGrid)
  const parsedCompases = useMemo(() => {
    const rawLyrics = isEditMode
      ? draftContent
      : isCustom && currentContent
      ? currentContent
      : currentContent || song.content || '';

    // 1. If the song already has synchronized compases (Chordify / syncData), PRESERVE THEM and align sections!
    if (activeCompases && activeCompases.length > 0) {
      return alignCompasesWithSongSections(activeCompases, rawLyrics);
    }
    // 2. Otherwise parse from draft text or current content
    return parseSongTextToGrid(rawLyrics || '', 4);
  }, [activeCompases, isEditMode, draftContent, isCustom, currentContent, song.content]);

  // Transpose chords in compases dynamically
  const transposedCompases = useMemo(() => {
    return parsedCompases.map((compas) => ({
      ...compas,
      acordes: compas.acordes.map((ch) => {
        if (!ch) return ch;
        return transpose === 0 ? normalizeChordName(ch) : transposeChord(ch, transpose);
      }),
    }));
  }, [parsedCompases, transpose]);

  // Cumulative beat offset for each measure to support measures with variable beat counts (e.g. 2T pickups)
  const measureBeatOffsets = useMemo(() => {
    let count = 0;
    return transposedCompases.map((m) => {
      const start = count;
      count += m.acordes?.length || 4;
      return start;
    });
  }, [transposedCompases]);

  const totalBeats = useMemo(() => {
    return transposedCompases.reduce((acc, m) => acc + (m.acordes?.length || 4), 0);
  }, [transposedCompases]);

  // Flattened beats list for real-time tracking
  const flatBeats = useMemo(() => {
    return transposedCompases.flatMap((m) => m.acordes);
  }, [transposedCompases]);

  // Current song BPM derived from lyrics metadata ([BPM @ 120]) with fallback
  const currentBpm = useMemo(() => {
    return getSongBpm(draftContent || currentContent || song.content, 100);
  }, [draftContent, currentContent, song.content]);

  // Handler to double (x2) or halve (/2) BPM while subdividing or merging measures
  const handleScaleBpm = useCallback(
    (factor) => {
      const rawContent = draftContent || currentContent || song.content || '';
      const oldBpm = getSongBpm(rawContent, 100);
      const newBpm = Math.max(30, Math.min(300, Math.round(oldBpm * factor)));
      const updatedText = updateTextBpm(rawContent, newBpm);

      setDraftContent(updatedText);
      setCurrentContent(updatedText);

      let updatedCompases = null;
      if (factor === 2) {
        updatedCompases = doubleGridBpm(activeCompases || parsedCompases);
      } else if (factor === 0.5) {
        updatedCompases = halveGridBpm(activeCompases || parsedCompases);
      }

      if (updatedCompases && updatedCompases.length > 0) {
        setActiveCompases(updatedCompases);
      }

      setFeedbackToast(
        factor === 2
          ? `BPM duplicado a ${newBpm} (compases subdivididos x2)`
          : `BPM dividido a ${newBpm} (compases fusionados ÷2)`
      );
      setTimeout(() => setFeedbackToast(null), 3000);
    },
    [draftContent, currentContent, song.content, activeCompases, parsedCompases]
  );

  // Sync hook for tracking active beat from YouTube or metronome
  const {
    isPlaybackActive,
    currentBeatIndex,
    currentTime,
    handlePlayerStateChange,
    jumpToBeat,
  } = useYouTubeSync({
    playerInstance,
    totalBeats,
    bpm: currentBpm,
    youtubeId: currentYouTubeId || '',
    compases: transposedCompases,
    isPlaying: isMetronomeActive || isAutoScrolling,
    externalTime,
  });

  // Calculate the currently sounding chord dynamically
  const currentPlayingChord = useMemo(() => {
    if (currentBeatIndex >= 0 && currentBeatIndex < flatBeats.length) {
      for (let i = currentBeatIndex; i >= 0; i--) {
        const ch = flatBeats[i];
        if (ch && ch !== '𝄾' && ch !== '𝄽') {
          return ch;
        }
      }
    }
    return activeChord || song.uniqueChords?.[0] || 'C';
  }, [currentBeatIndex, flatBeats, activeChord, song.uniqueChords]);

  // Calculate the next upcoming chord and distance in beats
  const { nextChordName, beatsUntilNext } = useMemo(() => {
    if (currentBeatIndex < 0 || currentBeatIndex >= flatBeats.length) {
      return { nextChordName: null, beatsUntilNext: null };
    }
    const currentCh = currentPlayingChord;
    for (let i = currentBeatIndex + 1; i < flatBeats.length; i++) {
      const ch = flatBeats[i];
      if (ch && ch !== '𝄾' && ch !== '𝄽' && ch !== currentCh) {
        return {
          nextChordName: ch,
          beatsUntilNext: i - currentBeatIndex,
        };
      }
    }
    return { nextChordName: null, beatsUntilNext: null };
  }, [currentBeatIndex, flatBeats, currentPlayingChord]);

  const currentUniqueChords = useMemo(() => {
    const chordsFromCompases = Array.from(
      new Set(
        transposedCompases
          .flatMap((m) => m.acordes)
          .filter((c) => c && c !== '𝄾' && c !== '𝄽')
      )
    );
    if (chordsFromCompases.length > 0) return chordsFromCompases;

    return (song.uniqueChords || ['C', 'G', 'Am', 'F']).map((ch) =>
      transposeChord(ch, transpose)
    );
  }, [transposedCompases, song.uniqueChords, transpose]);

  // Fetch chord definitions from SQLite database
  useEffect(() => {
    if (!currentUniqueChords || currentUniqueChords.length === 0) return;

    const missingChords = currentUniqueChords.filter(
      (ch) => ch && ch !== '𝄾' && ch !== '𝄽' && !chordDefinitions[ch]
    );

    if (missingChords.length === 0) return;

    missingChords.forEach((chordName) => {
      lookupChord(chordName, 'guitar').then((data) => {
        if (data && data.positions && Array.isArray(data.positions) && data.positions.length > 0) {
          const vIdx = selectedVariants[chordName] || 0;
          const pos = data.positions[vIdx] || data.positions[0];
          setChordDefinitions((prev) => ({
            ...prev,
            [chordName]: {
              chordName,
              frets: Array.isArray(pos.frets)
                ? pos.frets.map((f) => (f === -1 ? 'x' : String(f))).join('')
                : pos.frets || 'x32010',
              fingers: Array.isArray(pos.fingers) ? pos.fingers.join('') : pos.fingers || '032010',
              position: pos.baseFret || pos.position || 1,
              barres: pos.barres || [],
              allPositions: data.positions,
              variantIndex: vIdx,
            },
          }));
        } else {
          const fallback = CHORD_DATABASE[chordName] || {
            chordName,
            frets: 'x32010',
            fingers: '032010',
            position: 1,
            barres: [],
          };
          setChordDefinitions((prev) => ({
            ...prev,
            [chordName]: fallback,
          }));
        }
      });
    });
  }, [currentUniqueChords, chordDefinitions, selectedVariants]);

  // Reset or initialize state when song changes
  useEffect(() => {
    setIsAutoScrolling(false);
    setIsMetronomeActive(false);
    setExternalTime(null);
    setActiveChord(song.uniqueChords?.[0] || 'C');
    setCurrentContent(song.content || '');
    setIsCustom(Boolean(song.isCustom));
    setOriginalContent(song.originalContent || null);
    setDraftContent(song.content || '');
    setCurrentYouTubeId(song.youtubeId || '');
    setIsEditMode(false);
    if (lyricsScrollRef.current) {
      lyricsScrollRef.current.scrollTop = 0;
    }
  }, [song.id, song.title, song.content, song.isCustom, song.originalContent, song.youtubeId]);

  const handleToggleEditMode = () => {
    if (!isEditMode) {
      setDraftContent(currentContent);
    }
    setIsEditMode((prev) => !prev);
  };

  const handleSelectYouTubeVideo = async (newYtId) => {
    setCurrentYouTubeId(newYtId);
    try {
      await saveSong({
        id: song.id,
        title: song.title,
        artist: song.artist,
        youtubeId: newYtId,
        content: currentContent,
      });
      setFeedbackToast('Video de YouTube vinculado');
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (e) {
      console.warn('Error saving linked youtubeId:', e);
    }
  };

  const handleSetMeasureTimestamp = (measureIdx, timestamp) => {
    if (timestamp === null || timestamp === undefined) return;
    const rounded = parseFloat(Number(timestamp).toFixed(1));
    setFeedbackToast(`Compás marcado en ${rounded}s`);
    setTimeout(() => setFeedbackToast(null), 1800);
  };

  const handleAddMeasureToSection = (sectionName) => {
    setDraftContent((prev) => {
      return prev + `\n[${sectionName || 'Estrofa'}]\n[𝄾 4T]\n`;
    });
    setFeedbackToast(`Compás añadido a [${sectionName || 'Estrofa'}]`);
    setTimeout(() => setFeedbackToast(null), 1800);
  };

  const handleUpdateBeatGridChord = (cellGlobalIndex, newChord) => {
    if (!newChord) return;
    const clean = normalizeChordName(newChord);

    setActiveCompases((prev) => {
      const currentGrid = prev || parsedCompases;
      if (!currentGrid || currentGrid.length === 0) return prev;

      const measureIdx = Math.floor(cellGlobalIndex / 4);
      const beatIdx = cellGlobalIndex % 4;

      if (measureIdx < 0 || measureIdx >= currentGrid.length) return prev;

      const updated = currentGrid.map((m, idx) => {
        if (idx === measureIdx) {
          const newAcordes = [...m.acordes];
          newAcordes[beatIdx] = clean;
          return { ...m, acordes: newAcordes };
        }
        return m;
      });

      // Si el contenido actual no tiene letra (es instrumental o puro BeatGrid), sincronizar el texto para el visualizador
      const textWithoutTags = (currentContent || '').replace(/\[[^\]]+\]/g, '').replace(/[\s\d:.\-_/|]+/g, '');
      const hasLyrics = textWithoutTags.length > 20;
      if (!hasLyrics) {
        const bpmMatch = (currentContent || '').match(/\[BPM\s*[@:]?\s*\d+\]/i);
        const beatsMatch = (currentContent || '').match(/\[Beats\s*[@:]?\s*\d+\]/i);
        let header = '';
        if (bpmMatch) header += `${bpmMatch[0]}\n`;
        if (beatsMatch) header += `${beatsMatch[0]}\n`;
        if (header) header += '\n';

        const updatedText = header + formatCompasesToText(updated);
        setCurrentContent(updatedText);
        setDraftContent(updatedText);
      }

      return updated;
    });

    setFeedbackToast(`Acorde [${clean}] actualizado en compás ${Math.floor(cellGlobalIndex / 4) + 1}, pulso ${(cellGlobalIndex % 4) + 1}`);
    setTimeout(() => setFeedbackToast(null), 1500);
  };

  const handleSaveCustomVersion = async () => {
    setIsSaving(true);
    try {
      const backupOriginal = originalContent || song.originalContent || song.content;
      await saveCustomSongVersion({
        id: song.id,
        title: song.title,
        artist: song.artist,
        content: draftContent,
        syncData: activeCompases ? JSON.stringify(activeCompases) : (song.syncData || null),
        originalContent: backupOriginal,
        isInstrumental: Boolean(isInstrumental || song.isInstrumental),
        user: currentUser?.email,
        userId: currentUser?.id,
      });

      setCurrentContent(draftContent);
      setIsCustom(true);
      if (!originalContent) {
        setOriginalContent(backupOriginal);
      }
      setIsEditMode(false);
      setFeedbackToast('¡Cambios guardados con éxito!');
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (err) {
      console.error('[SongSheetView] Error saving song:', err);
      setFeedbackToast(err.message || 'Error al guardar la canción');
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsInstrumental = async (newContent, targetIsInstrumental = true) => {
    setIsInstrumental(targetIsInstrumental);
    const contentToSave = newContent || draftContent;
    setDraftContent(contentToSave);
    setCurrentContent(contentToSave);

    try {
      const backupOriginal = originalContent || song.originalContent || song.content;
      await saveCustomSongVersion({
        id: song.id,
        title: song.title,
        artist: song.artist,
        content: contentToSave,
        syncData: activeCompases ? JSON.stringify(activeCompases) : (song.syncData || null),
        originalContent: backupOriginal,
        isInstrumental: targetIsInstrumental,
        user: currentUser?.email,
        userId: currentUser?.id,
      });
      setFeedbackToast(targetIsInstrumental ? '¡Canción configurada como instrumental!' : '¡Letra añadida a la canción!');
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (err) {
      console.error('[SongSheetView] Error updating instrumental state:', err);
      setFeedbackToast(err.message || 'Error al actualizar la canción');
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  const handleRestoreOriginal = async () => {
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
      setFeedbackToast('Versión original restaurada');
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (err) {
      console.error('[SongSheetView] Error restoring song:', err);
      setFeedbackToast(err.message || 'Error al restaurar la canción');
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-scroll logic
  useEffect(() => {
    let scrollInterval = null;
    if (isAutoScrolling && lyricsScrollRef.current) {
      scrollInterval = setInterval(() => {
        if (lyricsScrollRef.current) {
          lyricsScrollRef.current.scrollTop += scrollSpeed * 1;
        }
      }, 50);
    }
    return () => {
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [isAutoScrolling, scrollSpeed]);

  const onVariantChangeHandler = (chordName, newVariantIndex) => {
    handleVariantChange(chordName, newVariantIndex, (clean, vIdx) => {
      setChordDefinitions((prev) => {
        const existing = prev[clean];
        if (existing && existing.allPositions && existing.allPositions[vIdx]) {
          const pos = existing.allPositions[vIdx];
          return {
            ...prev,
            [clean]: {
              ...existing,
              frets: Array.isArray(pos.frets) ? pos.frets.map((f) => (f === -1 ? 'x' : String(f))).join('') : pos.frets || 'x32010',
              fingers: Array.isArray(pos.fingers) ? pos.fingers.join('') : pos.fingers || '032010',
              position: pos.baseFret || pos.position || 1,
              barres: pos.barres || [],
              variantIndex: vIdx,
            },
          };
        }
        return prev;
      });
    });
  };

  const handlePlayChord = useCallback(
    (chordName) => {
      if (!chordName || chordName === '𝄾' || chordName === '𝄽') return;
      setActiveChord(chordName);
      const chordDef = chordDefinitions[chordName] || CHORD_DATABASE[chordName];
      if (chordDef?.frets) {
        const notes = getNotesFromFrets(chordDef.frets);
        playStrummedChord(notes);
      } else {
        playStrummedChord(chordName);
      }
    },
    [chordDefinitions]
  );

  // Group transposedCompases into contiguous section blocks
  const sectionCompasBlocks = useMemo(() => {
    if (!transposedCompases || transposedCompases.length === 0) return [];
    const blocks = [];
    let current = null;

    transposedCompases.forEach((compas, idx) => {
      const secName = (compas.seccion || 'Intro').trim();
      if (!current || current.name.toLowerCase() !== secName.toLowerCase()) {
        if (current) blocks.push(current);
        current = {
          name: secName,
          startIdx: idx,
          compases: [],
        };
      }
      current.compases.push({ compas, globalIdx: idx });
    });

    if (current) blocks.push(current);
    return blocks;
  }, [transposedCompases]);

  // Synchronize BeatGrid and Video when clicking a Section Header
  const handleSelectSection = useCallback(
    (sec, sIdx) => {
      if (!sec) return;

      let targetTime = null;

      if (sec.time) {
        if (sec.time.includes(':')) {
          const [m, s] = sec.time.split(':').map(Number);
          targetTime = (m || 0) * 60 + (s || 0);
        } else {
          targetTime = parseFloat(sec.time);
        }
      }

      let targetGlobalCompasIdx = -1;
      // Match by exact section name first to be completely resilient to section order variations
      if (sec.name) {
        const found = sectionCompasBlocks.find(
          (b) => b.name.toLowerCase() === sec.name.toLowerCase()
        );
        if (found) targetGlobalCompasIdx = found.startIdx;
      }
      if (targetGlobalCompasIdx === -1 && sIdx !== undefined && sIdx >= 0 && sIdx < sectionCompasBlocks.length) {
        targetGlobalCompasIdx = sectionCompasBlocks[sIdx].startIdx;
      }

      if (targetGlobalCompasIdx !== -1) {
        // Use cumulative beat offset instead of multiplying by 4 (supports 2T/3T measures)
        const beatIdx = measureBeatOffsets[targetGlobalCompasIdx] ?? (targetGlobalCompasIdx * 4);

        const compas = transposedCompases[targetGlobalCompasIdx];
        const firstChord = compas?.acordes?.[0];
        if (firstChord && firstChord !== '𝄾' && firstChord !== '𝄽') {
          handlePlayChord(firstChord);
        }

        const jumpedTime = jumpToBeat(beatIdx);
        if (targetTime === null) {
          targetTime = jumpedTime;
        }
      }

      if (targetTime !== null && !isNaN(targetTime)) {
        if (playerInstance?.seekTo) {
          try {
            playerInstance.seekTo(targetTime, true);
          } catch (e) {}
        }
        syncSeekTime(targetTime);
        setExternalTime(targetTime);
      }
    },
    [sectionCompasBlocks, measureBeatOffsets, transposedCompases, handlePlayChord, jumpToBeat, playerInstance, syncSeekTime]
  );

  // Synchronize BeatGrid and Video to the exact timestamp and line occurrence of the clicked chord
  const handleSelectChordFromLyrics = useCallback(
    (chordName, chordContext) => {
      if (!chordName || chordName === '𝄾' || chordName === '𝄽') return;

      handlePlayChord(chordName);

      // 1. Direct Beat Mapping: if chordContext has exact beatIdx from lineTimingsMap
      if (chordContext?.beatIdx !== undefined && chordContext?.beatIdx !== null && chordContext.beatIdx >= 0) {
        const jumpedTime = jumpToBeat(chordContext.beatIdx);
        const targetTime = chordContext.targetTime !== undefined && chordContext.targetTime !== null
          ? chordContext.targetTime
          : jumpedTime;

        if (targetTime !== null && !isNaN(targetTime)) {
          if (playerInstance?.seekTo) {
            try {
              playerInstance.seekTo(targetTime, true);
            } catch (e) {}
          }
          syncSeekTime(targetTime);
          setExternalTime(targetTime);
        }
        return;
      }

      const sec = chordContext?.sec || chordContext;
      const sIdx = chordContext?.sIdx ?? -1;
      const chordRatio = chordContext?.chordRatio ?? 0;
      const startTime = chordContext?.startTime;
      const nextTime = chordContext?.nextTime;

      let targetTime = null;

      // 2. High precision timestamp calculation from section timestamps (fallback)
      if (startTime !== null && startTime !== undefined) {
        if (nextTime !== null && nextTime !== undefined && nextTime > startTime) {
          targetTime = startTime + chordRatio * (nextTime - startTime);
        } else {
          const estimatedDuration = Math.max(8, (sec?.lines?.length || 4) * 4);
          targetTime = startTime + chordRatio * estimatedDuration;
        }
      }

      let targetGlobalCompasIdx = -1;

      // 2. Find exact compas matching targetTime if available
      if (targetTime !== null) {
        let minDiff = Infinity;
        for (let m = 0; m < transposedCompases.length; m++) {
          const bTimes = transposedCompases[m].beatTimes;
          if (bTimes && bTimes.length > 0) {
            const diff = Math.abs(bTimes[0] - targetTime);
            if (diff < minDiff) {
              minDiff = diff;
              targetGlobalCompasIdx = m;
            }
          }
        }
      }

      // 3. Fallback: Search inside that specific section block closest to chordRatio
      if (targetGlobalCompasIdx === -1) {
        let targetBlock = null;
        if (sIdx >= 0 && sIdx < sectionCompasBlocks.length) {
          const candidate = sectionCompasBlocks[sIdx];
          if (!sec || candidate.name.toLowerCase() === (sec.name || '').toLowerCase()) {
            targetBlock = candidate;
          }
        }

        if (!targetBlock && sec?.name) {
          const matchingBlocks = sectionCompasBlocks.filter(
            (b) => b.name.toLowerCase() === sec.name.toLowerCase()
          );
          if (matchingBlocks.length > 0) {
            const blockIdx = Math.min(
              matchingBlocks.length - 1,
              Math.max(0, Math.floor((sIdx / Math.max(1, sectionCompasBlocks.length)) * matchingBlocks.length))
            );
            targetBlock = matchingBlocks[blockIdx];
          }
        }

        if (targetBlock && targetBlock.compases.length > 0) {
          const matchingCompasesInBlock = targetBlock.compases.filter((item) =>
            item.compas.acordes?.includes(chordName)
          );

          if (matchingCompasesInBlock.length > 0) {
            const targetOffset = Math.min(
              matchingCompasesInBlock.length - 1,
              Math.max(0, Math.floor(chordRatio * matchingCompasesInBlock.length))
            );
            targetGlobalCompasIdx = matchingCompasesInBlock[targetOffset].globalIdx;
          } else {
            const compasOffset = Math.min(
              targetBlock.compases.length - 1,
              Math.max(0, Math.floor(chordRatio * targetBlock.compases.length))
            );
            targetGlobalCompasIdx = targetBlock.compases[compasOffset].globalIdx;
          }
        }
      }

      // 4. Fallback to global search if no section block matched
      if (targetGlobalCompasIdx === -1) {
        targetGlobalCompasIdx = transposedCompases.findIndex((c) => c.acordes?.includes(chordName));
      }

      if (targetGlobalCompasIdx !== -1) {
        const beatIdx = measureBeatOffsets[targetGlobalCompasIdx] ?? (targetGlobalCompasIdx * 4);
        const jumpedTime = jumpToBeat(beatIdx);
        if (targetTime === null) {
          targetTime = jumpedTime;
        }
      }

      if (targetTime !== null && !isNaN(targetTime)) {
        if (playerInstance?.seekTo) {
          try {
            playerInstance.seekTo(targetTime, true);
          } catch (e) {}
        }
        syncSeekTime(targetTime);
        setExternalTime(targetTime);
      }
    },
    [handlePlayChord, transposedCompases, measureBeatOffsets, sectionCompasBlocks, jumpToBeat, playerInstance, syncSeekTime]
  );

  return (
    <>
      <div className="w-full flex-1 min-w-0 flex flex-col min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] relative">
        {/* ================= PITCH SHIFT STEP-BY-STEP PROGRESS TOAST ================= */}
        <AnimatePresence>
          {pitchShiftMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-2xl shadow-2xl border text-xs font-sans font-bold flex items-center gap-2 pointer-events-none backdrop-blur-md ${
                pitchShiftStatus === 'changing'
                  ? 'bg-amber-950/90 text-amber-200 border-amber-500/50'
                  : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
              }`}
            >
              <span>{pitchShiftMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= TOAST NOTIFICATION ================= */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-stone-900/90 backdrop-blur-md text-amber-200 px-4 py-2 rounded-2xl shadow-2xl border border-amber-500/40 text-xs font-sans font-bold flex items-center gap-2 pointer-events-none"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{feedbackToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= PRO AUDIO TRANSPOSE NOTICE FOR FREE USERS ================= */}
        <AnimatePresence>
          {proAudioNotice && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#271d17]/95 backdrop-blur-md text-amber-100 px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-600/70 text-xs font-sans flex items-center gap-3 max-w-md w-[92%] sm:w-auto"
            >
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-amber-300">Acordes transpuestos.</span>{' '}
                <span className="text-stone-300 text-[11px]">
                  El cambio de tono en el audio del video es exclusivo para miembros{' '}
                  <span className="font-bold text-amber-400">SongBook Pro ⭐</span>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProAudioNotice(false);
                  openUpgradeModal();
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-[11px] font-bold cursor-pointer shadow flex-shrink-0"
              >
                Ser Pro
              </button>
              <button
                type="button"
                onClick={() => setProAudioNotice(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= LIVE STAGE NAVIGATION BAR (When in Setlist Mode) ================= */}
        {setlistContext && (
          <div className="w-full mb-3 bg-[#241a14] text-amber-100 p-2.5 sm:p-3 rounded-2xl border-2 border-amber-700/60 shadow-xl flex items-center justify-between gap-3 relative z-50 select-none">
            {/* Previous Song Button */}
            <button
              type="button"
              disabled={setlistContext.currentIndex === 0}
              onClick={setlistContext.onPrevSong}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
                setlistContext.currentIndex === 0
                  ? 'opacity-30 cursor-not-allowed text-stone-400 bg-stone-900/40'
                  : 'bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-900/50 shadow-sm'
              }`}
              title={
                setlistContext.currentIndex > 0
                  ? `Anterior: ${setlistContext.setlist.songs[setlistContext.currentIndex - 1]?.title}`
                  : 'Inicio del Setlist'
              }
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Center Stage Info & Quick Setlist Picker */}
            <div ref={setlistDropdownRef} className="flex items-center gap-2 text-center min-w-0 relative z-50">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex-shrink-0">
                <Mic2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">En Vivo:</span> {setlistContext.setlist.name}
              </div>

              {/* Setlist Song Index & Title Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsSetlistDropdownOpen(!isSetlistDropdownOpen)}
                className="px-2.5 py-1 bg-stone-900/90 hover:bg-stone-800 rounded-lg border border-amber-900/40 text-stone-200 hover:text-white font-serif font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer truncate transition-colors"
                title="Ver lista de canciones del repertorio"
              >
                <span className="text-amber-400 font-mono text-xs">
                  [{setlistContext.currentIndex + 1}/{setlistContext.setlist.songs.length}]
                </span>
                <span className="truncate">{song.title}</span>
                <ListMusic className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 ml-1" />
              </button>

              {/* Dropdown Menu of Setlist Songs */}
              <AnimatePresence>
                {isSetlistDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-[#1f1611] text-stone-200 rounded-xl border border-amber-800/80 shadow-2xl p-2 z-[70] text-left max-h-60 overflow-y-auto"
                  >
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/80 px-2 py-1 border-b border-stone-800 mb-1">
                      Canciones en {setlistContext.setlist.name}
                    </div>
                    {setlistContext.setlist.songs.map((s, idx) => (
                      <button
                        key={s.id || idx}
                        type="button"
                        onClick={() => {
                          setlistContext.onSelectSongIndex(idx);
                          setIsSetlistDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-sans flex items-center justify-between transition-colors cursor-pointer ${
                          idx === setlistContext.currentIndex
                            ? 'bg-amber-700 text-white font-bold'
                            : 'hover:bg-stone-800 text-stone-300'
                        }`}
                      >
                        <span className="truncate">{idx + 1}. {s.title}</span>
                        <span className="font-mono text-[10px] opacity-75">{s.key || 'C'}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Next Song / Exit Stage */}
            <div className="flex items-center gap-2">
              {setlistContext.currentIndex < setlistContext.setlist.songs.length - 1 ? (
                <button
                  type="button"
                  onClick={setlistContext.onNextSong}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-md"
                  title={`Siguiente: ${setlistContext.setlist.songs[setlistContext.currentIndex + 1]?.title}`}
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={setlistContext.onExitStage}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-md"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Fin del Show</span>
                </button>
              )}

              <button
                type="button"
                onClick={setlistContext.onExitStage}
                className="p-1.5 bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Salir del Modo Escenario"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= MOBILE TAB SWITCHER (hidden on md+) ================= */}
        <div className="flex md:hidden items-center justify-center gap-2 mb-3">
          <div className="bg-stone-200/80 p-1 rounded-xl flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => setMobilePage('lyrics')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 ${
                mobilePage === 'lyrics' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>📄 Letra</span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePage('chords')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 ${
                mobilePage === 'chords' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>🎸 Acordes</span>
            </button>
          </div>
        </div>

        {/* ================= MAIN DUAL PAGE SPREAD ================= */}
        <div className="w-full flex-1 min-w-0 flex flex-col md:flex-row min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] relative z-10">
          {/* ================= ANALOG DESK MEMORABILIA (POLAROID & CD) ================= */}
          <SongMemorabiliaDesk
            song={{
              ...song,
              content: currentContent,
              isCustom,
              originalContent,
              youtubeId: currentYouTubeId,
            }}
            onUpdateSongImages={handleUpdateSongImages}
          />

          {/* ================= LEFT PAGE (Lyrics & Controls / Editor) ================= */}
          {isEditMode ? (
            <SongLyricsVisualEditor
              className={`${mobilePage === 'lyrics' ? 'flex' : 'hidden'} md:flex`}
              draftContent={draftContent}
              setDraftContent={setDraftContent}
              uniqueChords={currentUniqueChords}
              onSave={handleSaveCustomVersion}
              onCancel={() => setIsEditMode(false)}
              onRestoreOriginal={handleRestoreOriginal}
              hasOriginal={Boolean(originalContent || song.originalContent)}
              isSaving={isSaving}
              isSyncMode={isSyncMode}
              onToggleSyncMode={() => setIsSyncMode(!isSyncMode)}
              currentPlaybackTime={currentTime}
              activeSectionName={
                currentBeatIndex >= 0 && transposedCompases[Math.floor(currentBeatIndex / 4)]
                  ? transposedCompases[Math.floor(currentBeatIndex / 4)].seccion
                  : null
              }
              onSelectSection={handleSelectSection}
              onSelectChord={handlePlayChord}
              isInstrumental={isInstrumental}
              onMarkAsInstrumental={handleMarkAsInstrumental}
              currentBpm={currentBpm}
              onScaleBpm={handleScaleBpm}
            />
          ) : (
            <div className={`${mobilePage === 'lyrics' ? 'flex' : 'hidden'} md:flex flex-col justify-between flex-1 min-w-0 bg-[#fcf9f2] rounded-2xl md:rounded-r-none md:rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border border-stone-300 md:border-r-0 overflow-hidden paper-texture p-7 lg:p-9 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] relative z-10`}>
              <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

              <div>
                {/* Header Controls */}
                <SongHeaderControls
                  song={{ ...song, content: currentContent, isCustom, originalContent, youtubeId: currentYouTubeId }}
                  onBack={onBack}
                  setlistContext={setlistContext}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                  setlists={setlists}
                  onAddSongToSetlist={onAddSongToSetlist}
                  transpose={transpose}
                  onTranspose={handleTransposeClamped}
                  isPitchShiftActive={isPitchShiftActive}
                  isLoadingAudio={isLoadingAudio}
                  pitchShiftStatus={pitchShiftStatus}
                  isPremium={isPremium}
                  isAdmin={isAdmin}
                  openUpgradeModal={openUpgradeModal}
                  isVideoPaperOpen={isVideoPaperOpen}
                  onOpenVideoPaper={() => setIsVideoPaperOpen(true)}
                  onFeedbackToast={(msg) => {
                    setFeedbackToast(msg);
                    setTimeout(() => setFeedbackToast(null), 2500);
                  }}
                  isEditMode={isEditMode}
                  onToggleEditMode={handleToggleEditMode}
                />

                {/* Lyrics & Chords Renderer */}
                <SongLyricsRenderer
                  song={{ ...song, content: currentContent, isCustom, originalContent }}
                  compases={transposedCompases}
                  transpose={transpose}
                  onPlayChord={handlePlayChord}
                  onSelectSection={handleSelectSection}
                  onSelectChord={handleSelectChordFromLyrics}
                  isAutoScrolling={isAutoScrolling}
                  onToggleAutoScroll={() => setIsAutoScrolling(!isAutoScrolling)}
                  scrollRef={lyricsScrollRef}
                  currentTime={currentTime}
                  currentPlayingChord={currentPlayingChord}
                  currentBeatIndex={currentBeatIndex}
                  isPlaybackActive={isPlaybackActive}
                />
              </div>
            </div>
          )}

          {/* ================= PERMANENT CENTRAL SPIRAL RINGS ================= */}
          <div className="hidden md:flex w-10 flex-shrink-0 z-30 items-center justify-center -mx-2.5 pointer-events-none">
            <SpiralRings count={13} />
          </div>

          {/* ================= RIGHT PAGE (BeatGrid / Chords Catalog) ================= */}
          <ChordCatalogPanel
            className={`${mobilePage === 'chords' ? 'flex' : 'hidden'} md:flex`}
            song={{ ...song, content: currentContent, youtubeId: currentYouTubeId }}
            rightPageView={rightPageView}
            setRightPageView={setRightPageView}
            beatGridMode={beatGridMode}
            setBeatGridMode={setBeatGridMode}
            isMetronomeActive={isMetronomeActive}
            setIsMetronomeActive={setIsMetronomeActive}
            isPlaybackActive={isPlaybackActive}
            transposedCompases={transposedCompases}
            currentBeatIndex={currentBeatIndex}
            onBeatClick={(chord, idx, measure, playSound = true) => {
              if (playSound && chord && chord !== '𝄾' && chord !== '𝄽') {
                handlePlayChord(chord);
              }
              const targetTime = jumpToBeat(idx);
              if (targetTime !== undefined && targetTime !== null) {
                setExternalTime(targetTime);
                syncSeekTime(targetTime);
              }
            }}
            transpose={transpose}
            currentPlayingChord={currentPlayingChord}
            nextChordName={nextChordName}
            beatsUntilNext={beatsUntilNext}
            selectedVariants={selectedVariants}
            onVariantChange={onVariantChangeHandler}
            onPlayChord={handlePlayChord}
            currentUniqueChords={currentUniqueChords}
            chordDefinitions={chordDefinitions}
            activeChord={activeChord}
            instrument={instrument}
            setlistContext={setlistContext}
            isEditMode={isEditMode}
            currentTime={currentTime}
            onSetTimestamp={handleSetMeasureTimestamp}
            onAddMeasure={handleAddMeasureToSection}
            onUpdateChord={handleUpdateBeatGridChord}
            currentBpm={currentBpm}
            onScaleBpm={handleScaleBpm}
          />
        </div>

        {/* ================= FLOATING VIDEO TAB / ETIQUETA (BOTTOM-RIGHT NOTEBOOK EDGE) ================= */}
        <AnimatePresence>
          {currentYouTubeId && !isVideoPaperOpen && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="absolute left-[calc(100%+4px)] sm:left-[calc(100%+10px)] lg:left-[calc(100%+12px)] bottom-6 sm:bottom-8 z-30 select-none"
            >
              <motion.button
                type="button"
                onClick={() => setIsVideoPaperOpen(true)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.94 }}
                className="relative flex items-center justify-center p-2.5 sm:p-3 bg-[#ffedd5]/95 hover:bg-[#fed7aa] text-stone-900 border-y border-r border-orange-300/90 rounded-r-xl shadow-lg transition-colors cursor-pointer select-none group"
                style={{
                  boxShadow: '3px 4px 12px rgba(0,0,0,0.22)',
                }}
                title={isPlaybackActive ? "Video en reproducción • Clic para ver" : "Ver Video"}
                aria-label="Ver Video"
              >
                {/* Colored left strip indicating notebook attachment */}
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-red-600" />
                <Play className={`w-5 h-5 fill-red-600 text-red-600 translate-x-0.5 group-hover:scale-110 transition-transform ${isPlaybackActive ? 'animate-pulse' : ''}`} />
                {isPlaybackActive && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                  </span>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= FLOATING / PINNED PAPER SCRAP WITH YOUTUBE VIDEO ================= */}
      <FloatingVideoPaper
        youtubeId={currentYouTubeId}
        songTitle={song.title}
        songArtist={song.artist}
        isVisible={isVideoPaperOpen}
        isMuted={isPitchShiftActive}
        onClose={() => setIsVideoPaperOpen(false)}
        onTimeUpdate={(t) => setExternalTime(t)}
        onStateChange={(st) => {
          handlePlayerStateChange(st);
          syncPlaybackState(st);
        }}
        onPlayerReady={(p) => setPlayerInstance(p)}
        onOpenVideoPicker={() => setIsYouTubePickerOpen(true)}
      />

      {/* ================= YOUTUBE VIDEO PICKER MODAL ================= */}
      <YouTubeVideoPickerModal
        isOpen={isYouTubePickerOpen}
        onClose={() => setIsYouTubePickerOpen(false)}
        initialQuery={`${song.title} ${song.artist}`}
        onSelectVideo={handleSelectYouTubeVideo}
      />
    </>
  );
}
