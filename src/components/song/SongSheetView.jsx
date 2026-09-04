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
import { CHORD_DATABASE } from '../../data/sampleSongs';
import { transposeChord, normalizeChordName } from '../../utils/music';
import { playStrummedChord, getNotesFromFrets } from '../../utils/audioPlayer';
import { parseSongTextToGrid } from '../../utils/gridParser';
import { useYouTubeSync } from '../../hooks/useYouTubeSync';
import { lookupChord } from '../../services/persistenceApi';

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
  const { currentUser, openUpgradeModal, isPro } = useAuth();
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
  });

  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed] = useState(1);
  const [activeChord, setActiveChord] = useState(song.uniqueChords?.[0] || 'C');
  const [isVideoPaperOpen, setIsVideoPaperOpen] = useState(true);
  const [isSetlistDropdownOpen, setIsSetlistDropdownOpen] = useState(false);

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
    youtubeId: song.youtubeId || '',
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

  // Parse or retrieve pre-computed rhythmic measures (BeatGrid)
  const parsedCompases = useMemo(() => {
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
    return parseSongTextToGrid(song.content || '', 4);
  }, [song.compases, song.syncData, song.content]);

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

  const totalBeats = transposedCompases.length * 4;

  // Flattened beats list for real-time tracking
  const flatBeats = useMemo(() => {
    return transposedCompases.flatMap((m) => m.acordes);
  }, [transposedCompases]);

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
    bpm: song.bpm || 100,
    youtubeId: song.youtubeId || '',
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
    if (lyricsScrollRef.current) {
      lyricsScrollRef.current.scrollTop = 0;
    }
  }, [song.id, song.title]);

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
      if (sIdx !== undefined && sIdx >= 0 && sIdx < sectionCompasBlocks.length) {
        targetGlobalCompasIdx = sectionCompasBlocks[sIdx].startIdx;
      } else if (sec.name) {
        const found = sectionCompasBlocks.find(
          (b) => b.name.toLowerCase() === sec.name.toLowerCase()
        );
        if (found) targetGlobalCompasIdx = found.startIdx;
      }

      if (targetGlobalCompasIdx !== -1) {
        const beatIdx = targetGlobalCompasIdx * 4;
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
    [sectionCompasBlocks, jumpToBeat, playerInstance, syncSeekTime]
  );

  // Synchronize BeatGrid and Video to the exact timestamp and line occurrence of the clicked chord
  const handleSelectChordFromLyrics = useCallback(
    (chordName, chordContext) => {
      if (!chordName || chordName === '𝄾' || chordName === '𝄽') return;

      handlePlayChord(chordName);

      const sec = chordContext?.sec || chordContext;
      const sIdx = chordContext?.sIdx ?? -1;
      const chordRatio = chordContext?.chordRatio ?? 0;
      const startTime = chordContext?.startTime;
      const nextTime = chordContext?.nextTime;

      let targetTime = null;

      // 1. High precision timestamp calculation from section timestamps
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
        const beatIdx = targetGlobalCompasIdx * 4;
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
    [handlePlayChord, transposedCompases, sectionCompasBlocks, jumpToBeat, playerInstance, syncSeekTime]
  );

  return (
    <>
      <div className="w-full flex-1 flex flex-col min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] relative">
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
            <div className="flex items-center gap-2 text-center min-w-0 relative z-50">
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

        {/* ================= MAIN DUAL PAGE SPREAD ================= */}
        <div className="w-full flex-1 flex flex-col md:flex-row min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] relative z-10">
          {/* ================= LEFT PAGE (Lyrics & Controls) ================= */}
          <div className="hidden md:flex flex-col justify-between flex-1 bg-[#fcf9f2] rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border-y border-l border-stone-300 overflow-hidden paper-texture p-7 lg:p-9 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] relative z-10">
            <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

            <div>
              {/* Header Controls */}
              <SongHeaderControls
                song={song}
                onBack={onBack}
                setlistContext={setlistContext}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
                setlists={setlists}
                onAddSongToSetlist={onAddSongToSetlist}
                transpose={transpose}
                onTranspose={handleTranspose}
                isPitchShiftActive={isPitchShiftActive}
                isLoadingAudio={isLoadingAudio}
                pitchShiftStatus={pitchShiftStatus}
                isPremium={isPremium}
                openUpgradeModal={openUpgradeModal}
                isVideoPaperOpen={isVideoPaperOpen}
                onOpenVideoPaper={() => setIsVideoPaperOpen(true)}
                onFeedbackToast={(msg) => {
                  setFeedbackToast(msg);
                  setTimeout(() => setFeedbackToast(null), 2500);
                }}
              />

              {/* Lyrics & Chords Renderer */}
              <SongLyricsRenderer
                song={song}
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

          {/* ================= PERMANENT CENTRAL SPIRAL RINGS ================= */}
          <div className="hidden md:flex w-10 z-30 items-center justify-center -mx-2.5 pointer-events-none">
            <SpiralRings count={13} />
          </div>

          {/* ================= RIGHT PAGE (BeatGrid / Chords Catalog) ================= */}
          <ChordCatalogPanel
            song={song}
            rightPageView={rightPageView}
            setRightPageView={setRightPageView}
            beatGridMode={beatGridMode}
            setBeatGridMode={setBeatGridMode}
            isMetronomeActive={isMetronomeActive}
            setIsMetronomeActive={setIsMetronomeActive}
            isPlaybackActive={isPlaybackActive}
            transposedCompases={transposedCompases}
            currentBeatIndex={currentBeatIndex}
            onBeatClick={(chord, idx) => {
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
          />
        </div>
      </div>

      {/* ================= FLOATING / PINNED PAPER SCRAP WITH YOUTUBE VIDEO ================= */}
      {song.youtubeId && (
        <FloatingVideoPaper
          youtubeId={song.youtubeId}
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
        />
      )}
    </>
  );
}
