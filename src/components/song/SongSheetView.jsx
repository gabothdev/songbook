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
import { lookupChord, updateSongPreferences } from '../../services/persistenceApi';
import useAutoScroll from '../../hooks/useAutoScroll';
import useChordDefinitions from '../../hooks/useChordDefinitions';
import { useSongArrangement } from '../../hooks/useSongArrangement';
import { useSongRhythmGrid, useCurrentPlayingChord } from '../../hooks/useSongRhythmGrid';
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
  onNavigateAuth = null,
  setlistContext = null,
  isFavorite = false,
  onToggleFavorite = null,
  isSaved = false,
  onToggleSaveSong = null,
  setlists = [],
  onAddSongToSetlist = null,
  onUpdateSong = null,
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

  // Encapsulated Song Arrangement & Custom Version Hook
  const {
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
  } = useSongArrangement({
    song,
    currentUser,
    onNotify: setFeedbackToast,
  });

  const [activeStampChord, setActiveStampChord] = useState(null);
  const [isYouTubePickerOpen, setIsYouTubePickerOpen] = useState(false);

  const {
    isAutoScrolling,
    setIsAutoScrolling,
    scrollSpeed,
    scrollContainerRef: lyricsScrollRef,
    toggleAutoScroll,
    resetScroll,
  } = useAutoScroll({ initialSpeed: 1 });

  const [activeChord, setActiveChord] = useState(song.uniqueChords?.[0] || 'C');
  const [isVideoPaperOpen, setIsVideoPaperOpen] = useState(true);
  const [isSetlistDropdownOpen, setIsSetlistDropdownOpen] = useState(false);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

  const handleGuardedToggleFavorite = (s) => {
    if (!currentUser) {
      setShowAuthRequiredModal(true);
      return;
    }
    if (onToggleFavorite) onToggleFavorite(s);
  };

  const handleGuardedAddToSetlist = (setlistName, s) => {
    if (!currentUser) {
      setShowAuthRequiredModal(true);
      return;
    }
    if (onAddSongToSetlist) onAddSongToSetlist(setlistName, s);
  };

  const handleGuardedToggleSave = (s) => {
    if (!currentUser) {
      setShowAuthRequiredModal(true);
      return;
    }
    if (onToggleSaveSong) onToggleSaveSong(s);
  };

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
    async ({ artistImage, albumCover, album, releaseYear, versionType, versionDetails, artists }) => {
      if (!song) return;
      if (artistImage !== undefined) song.artistImage = artistImage;
      if (albumCover !== undefined) song.albumCover = albumCover;
      if (album !== undefined) song.album = album;
      if (releaseYear !== undefined) song.releaseYear = releaseYear;
      if (versionType !== undefined) song.versionType = versionType;
      if (versionDetails !== undefined) song.versionDetails = versionDetails;
      if (artists !== undefined) song.artists = artists;

      if (onUpdateSong) {
        onUpdateSong({
          ...(artistImage !== undefined ? { artistImage } : {}),
          ...(albumCover !== undefined ? { albumCover } : {}),
          ...(album !== undefined ? { album } : {}),
          ...(releaseYear !== undefined ? { releaseYear } : {}),
          ...(versionType !== undefined ? { versionType } : {}),
          ...(versionDetails !== undefined ? { versionDetails } : {}),
          ...(artists !== undefined ? { artists } : {}),
        });
      }

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
          artists,
          user: currentUser?.email || currentUser?.id,
          isCustom: song.isCustom,
        });

        if (saved?.id) {
          song.id = String(saved.id);
        }
        if (saved?.artists) {
          song.artists = saved.artists;
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
    [song, onUpdateSong, currentUser]
  );

  // Rhythm, BPM scaling and measure transposition hook
  const {
    initialCompases,
    activeCompases,
    setActiveCompases,
    parsedCompases,
    transposedCompases,
    measureBeatOffsets,
    totalBeats,
    flatBeats,
    currentBpm,
    handleScaleBpm,
    handleSetMeasureTimestamp,
    handleAddMeasureToSection,
    handleUpdateBeatGridChord,
    handleChangeMeasureLength,
    currentUniqueChords,
  } = useSongRhythmGrid({
    song,
    currentContent,
    setCurrentContent,
    draftContent,
    setDraftContent,
    isEditMode,
    isCustom,
    transpose,
    onNotify: setFeedbackToast,
  });

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

  // Dynamically resolve currently sounding chord & distance to next chord
  const { currentPlayingChord, nextChordName, beatsUntilNext } = useCurrentPlayingChord({
    currentBeatIndex,
    flatBeats,
    activeChord,
    fallbackChord: song.uniqueChords?.[0] || 'C',
  });

  // Dynamic chord definitions loaded and cached via useChordDefinitions
  const {
    chordDefinitions,
    setChordDefinitions,
    onVariantChangeHandler,
  } = useChordDefinitions({
    uniqueChords: currentUniqueChords,
    selectedVariants,
    instrument,
    handleVariantChange,
  });

  // Reset or initialize view state when song changes
  useEffect(() => {
    setIsAutoScrolling(false);
    setIsMetronomeActive(false);
    setExternalTime(null);
    setActiveChord(song?.uniqueChords?.[0] || 'C');
    resetScroll();
  }, [song?.id, song?.title, resetScroll, setIsAutoScrolling]);

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
      if (!chordContext) return;

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
        <div className="w-full flex-1 min-w-0 flex flex-col md:flex-row h-[580px] xl:h-[640px] 2xl:h-[700px] min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] max-h-[580px] xl:max-h-[640px] 2xl:max-h-[700px] relative z-10">
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
              onSave={() => {
                setActiveStampChord(null);
                handleSaveCustomVersion(activeCompases || parsedCompases);
              }}
              onCancel={() => {
                setIsEditMode(false);
                setActiveStampChord(null);
                setDraftContent(currentContent);
                setActiveCompases(initialCompases);
              }}
              onRestoreOriginal={handleRestoreOriginal}
              hasOriginal={Boolean(originalContent || song.originalContent)}
              isSaving={isSaving}
              currentPlaybackTime={currentTime}
              activeSectionName={
                currentBeatIndex >= 0
                  ? (() => {
                      const activeCompas = transposedCompases.find((c, mIdx) => {
                        const start = measureBeatOffsets[mIdx] ?? mIdx * 4;
                        const len = c?.acordes?.length || 4;
                        return currentBeatIndex >= start && currentBeatIndex < start + len;
                      });
                      return activeCompas?.seccion || null;
                    })()
                  : null
              }
              onSelectSection={handleSelectSection}
              onSelectChord={handleSelectChordFromLyrics}
              isInstrumental={isInstrumental}
              onMarkAsInstrumental={(content, isInstr) => handleMarkAsInstrumental(content, isInstr, activeCompases || parsedCompases)}
              currentBpm={currentBpm}
              onScaleBpm={handleScaleBpm}
              playerInstance={playerInstance}
              youtubeId={currentYouTubeId || song.youtubeId || ''}
              onSaveCompases={setActiveCompases}
              activeStampChord={activeStampChord}
              onChangeActiveStampChord={setActiveStampChord}
              compases={activeCompases || parsedCompases}
              currentBeatIndex={currentBeatIndex}
              isPlaybackActive={isPlaybackActive}
            />
          ) : (
            <div className={`${mobilePage === 'lyrics' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 bg-[#fcf9f2] rounded-2xl md:rounded-r-none md:rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border border-stone-300 md:border-r-0 overflow-hidden paper-texture p-7 lg:p-9 h-[580px] xl:h-[640px] 2xl:h-[700px] min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] max-h-[580px] xl:max-h-[640px] 2xl:max-h-[700px] relative z-10`}>
              <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

              {/* Header Controls */}
              <div className="flex-shrink-0">
                <SongHeaderControls
                  song={{ ...song, content: currentContent, isCustom, originalContent, youtubeId: currentYouTubeId }}
                  onBack={onBack}
                  setlistContext={setlistContext}
                  isFavorite={isFavorite}
                  onToggleFavorite={handleGuardedToggleFavorite}
                  isSaved={isSaved}
                  onToggleSaveSong={handleGuardedToggleSave}
                  setlists={setlists}
                  onAddSongToSetlist={handleGuardedAddToSetlist}
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
              </div>

              {/* Lyrics & Chords Renderer */}
              <SongLyricsRenderer
                className="flex-1 mt-2"
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
            onChangeMeasureLength={handleChangeMeasureLength}
            currentBpm={currentBpm}
            onScaleBpm={handleScaleBpm}
            activeStampChord={activeStampChord}
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

      {/* ================= MODAL DE INICIO DE SESIÓN REQUERIDO ================= */}
      <AnimatePresence>
        {showAuthRequiredModal && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              className="relative w-full max-w-md bg-[#fcf9f2] rounded-3xl border-4 border-[#35251d] p-6 shadow-2xl paper-texture text-center space-y-4 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-serif font-black text-stone-900 tracking-tight">
                  Iniciá sesión para guardar tus canciones
                </h3>
                <p className="text-xs sm:text-sm font-sans text-stone-600 leading-relaxed px-2">
                  Para marcar canciones como favoritas y organizar tus propios repertorios (setlists), necesitás ingresar a tu cuaderno de músico.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthRequiredModal(false);
                    if (onNavigateAuth) {
                      onNavigateAuth('register');
                    } else {
                      onBack();
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-xl font-sans font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Crear Cuenta Gratis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthRequiredModal(false);
                    if (onNavigateAuth) {
                      onNavigateAuth('login');
                    } else {
                      onBack();
                    }
                  }}
                  className="w-full py-2 px-4 bg-stone-200/80 hover:bg-stone-300/80 text-stone-800 rounded-xl font-sans font-bold text-xs transition cursor-pointer"
                >
                  Ya tengo cuenta: Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthRequiredModal(false)}
                  className="w-full py-1.5 px-4 bg-transparent hover:bg-stone-200/60 text-stone-500 hover:text-stone-700 rounded-xl font-sans font-medium text-xs transition cursor-pointer"
                >
                  Seguir tocando en Modo Libre
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
