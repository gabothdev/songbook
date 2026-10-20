import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { buildChordTimeline } from './wizardChordDistributor.js';

/**
 * Format seconds to mm:ss.s
 */
export function formatTime(seconds) {
  if (seconds == null || isNaN(seconds)) return '0:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
}

export function useSteppedSyncEngine({
  isOpen,
  initialContent = '',
  uniqueChords = [],
  currentTime = 0,
  playerInstance = null,
  currentBpm = 100,
  compases = [],
}) {
  // Step 1: 'lyrics' | Step 2: 'sync'
  const [currentStep, setCurrentStep] = useState(1);

  // ================= STATE STEP 1 (LYRICS) =================
  const [rawLyrics, setRawLyrics] = useState('');
  const [availableChords, setAvailableChords] = useState([]);

  // Extract plain lyrics and existing chords when opening modal
  useEffect(() => {
    if (!isOpen) return;

    // Detect chords in brackets [Am] and from compases
    const chordMatches = initialContent.match(/\[([A-G][b#]?[a-zA-Z0-9/]*)\]/g) || [];
    const compasChords = Array.isArray(compases)
      ? compases.flatMap((c) => c.acordes || []).filter((ch) => ch && ch !== '𝄾' && ch !== '𝄽')
      : [];
    const extractedChords = Array.from(
      new Set(
        [
          ...uniqueChords,
          ...compasChords,
          ...chordMatches.map((m) => m.replace(/[[\]]/g, '').trim()),
        ].filter(Boolean)
      )
    );
    setAvailableChords(extractedChords.length > 0 ? extractedChords : ['C', 'G', 'Am', 'F']);

    // Extract clean lines without section headers [Intro] and without bracket chords
    const cleanLines = initialContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (l.match(/^\[(?:BPM|Beats|Time|TimeSignature|Metro)\b/i)) return false;
        if (l.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*[\d.]+)?\s*\]$/)) return false;
        return true;
      })
      .map((l) => l.replace(/\[.*?\]/g, '').trim())
      .filter((l) => l.length > 0);

    setRawLyrics(cleanLines.join('\n'));
    setCurrentStep(1);

    // Reset sync state completely on modal opening
    setSyncedSections([]);
    setCurrentSectionPhrases([]);
    setCurrentPhraseIndex(0);
    setFirstSectionName('Intro');
    setCurrentSectionName('Intro');
    setIsNamingFirstSection(true);
    setHasStartedSync(false);
    setIsNamingSection(false);
  }, [isOpen, initialContent, uniqueChords, compases]);

  // Clean lines prepared for syncing (excludes section headers if user typed [Verso 1] in Step 1)
  const parsedPhrases = useMemo(() => {
    return rawLyrics
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false;
        if (l.match(/^\[(?:BPM|Beats|Time|TimeSignature|Metro)\b/i)) return false;
        if (l.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*[\d.]+)?\s*\]$/)) return false;
        return true;
      });
  }, [rawLyrics]);

  // ================= STATE STEP 2 (SYNC) =================
  const [hasStartedSync, setHasStartedSync] = useState(false);
  const [firstSectionName, setFirstSectionName] = useState('Intro');
  const [isNamingFirstSection, setIsNamingFirstSection] = useState(true);

  // Active sync progress
  const [syncedSections, setSyncedSections] = useState([]); // [{ name, startTime, endTime, phrases: [{ text, time }] }]
  const [currentSectionName, setCurrentSectionName] = useState('Intro');
  const [currentSectionStartTime, setCurrentSectionStartTime] = useState(0.0);
  const [currentSectionPhrases, setCurrentSectionPhrases] = useState([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  // Section completion & naming popover
  const [isNamingSection, setIsNamingSection] = useState(false);
  const [sectionToName, setSectionToName] = useState('');
  const wasPlayingBeforeModalRef = useRef(false);

  // Lyrics correction modal during sync
  const [isCorrectingLyrics, setIsCorrectingLyrics] = useState(false);
  const [tempLyrics, setTempLyrics] = useState('');

  // Toast notification inside modal
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // All recorded phrases across completed sections and the current active section
  const allRecordedPhrases = useMemo(() => {
    const list = [];
    syncedSections.forEach((sec) => {
      sec.phrases.forEach((p) => list.push(p));
    });
    currentSectionPhrases.forEach((p) => list.push(p));
    return list;
  }, [syncedSections, currentSectionPhrases]);

  // Next phrase preview for modal button
  const nextPhrasePreview = useMemo(() => {
    return currentPhraseIndex < parsedPhrases.length ? parsedPhrases[currentPhraseIndex] : null;
  }, [currentPhraseIndex, parsedPhrases]);

  // Timeline of underlying measures from real BeatGrid compases (or initialContent) for precision snapping
  const timeline = useMemo(() => {
    return buildChordTimeline(initialContent, currentBpm || 100, compases);
  }, [initialContent, currentBpm, compases]);

  // Helper to snap a timestamp to the closest measure start time
  const snapToNearestMeasure = useCallback(
    (time) => {
      if (!timeline.measureTimes || timeline.measureTimes.length === 0) {
        return { time: parseFloat(time.toFixed(2)), measureIdx: 0, measureId: 1 };
      }
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < timeline.measureTimes.length; i++) {
        const diff = Math.abs(timeline.measureTimes[i] - time);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      const snappedTime = parseFloat(timeline.measureTimes[closestIdx].toFixed(2));
      const measure = timeline.compases[closestIdx];
      return {
        time: snappedTime,
        measureIdx: closestIdx,
        measureId: measure?.id ?? closestIdx + 1,
      };
    },
    [timeline]
  );

  // Detect the last recorded phrase and whether it is currently "open" (no endTime marked)
  const lastRecordedPhrase = useMemo(() => {
    if (currentSectionPhrases.length > 0) {
      return currentSectionPhrases[currentSectionPhrases.length - 1];
    }
    if (syncedSections.length > 0) {
      const lastSec = syncedSections[syncedSections.length - 1];
      if (lastSec.phrases && lastSec.phrases.length > 0) {
        return lastSec.phrases[lastSec.phrases.length - 1];
      }
    }
    return null;
  }, [currentSectionPhrases, syncedSections]);

  const isLastPhraseOpen = useMemo(() => {
    if (!lastRecordedPhrase) return false;
    return lastRecordedPhrase.endTime == null;
  }, [lastRecordedPhrase]);

  // ================= LIVE PLAYER CLOCK & PROGRESS POLLING =================
  const [polledTime, setPolledTime] = useState(currentTime || 0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const syncPlayerMetrics = () => {
      if (playerInstance) {
        try {
          if (typeof playerInstance.getCurrentTime === 'function') {
            const t = playerInstance.getCurrentTime();
            if (typeof t === 'number' && !isNaN(t)) setPolledTime(t);
          }
          if (typeof playerInstance.getDuration === 'function') {
            const d = playerInstance.getDuration();
            if (typeof d === 'number' && !isNaN(d) && d > 0) setVideoDuration(d);
          }
          if (typeof playerInstance.getPlayerState === 'function') {
            setIsVideoPlaying(playerInstance.getPlayerState() === 1);
          }
        } catch (e) {}
      } else {
        setPolledTime(currentTime || 0);
      }
    };

    syncPlayerMetrics();
    const interval = setInterval(syncPlayerMetrics, 100);
    return () => clearInterval(interval);
  }, [isOpen, playerInstance, currentTime]);

  const liveCurrentTime = playerInstance ? polledTime : currentTime || 0;

  // Estimate total duration from videoDuration or last measure in timeline
  const effectiveDuration = useMemo(() => {
    if (videoDuration > 0) return videoDuration;
    if (timeline.measureTimes && timeline.measureTimes.length > 0) {
      return timeline.measureTimes[timeline.measureTimes.length - 1] + (60 / (currentBpm || 100)) * 4;
    }
    return 180;
  }, [videoDuration, timeline.measureTimes, currentBpm]);

  const togglePlayPause = useCallback(() => {
    if (!playerInstance) return;
    try {
      const state = playerInstance.getPlayerState();
      if (state === 1) {
        playerInstance.pauseVideo();
        setIsVideoPlaying(false);
      } else {
        playerInstance.playVideo();
        setIsVideoPlaying(true);
      }
    } catch (e) {
      console.warn('Error toggling play/pause:', e);
    }
  }, [playerInstance]);

  const seekToTime = useCallback(
    (targetSeconds) => {
      const clamped = Math.max(0, Math.min(effectiveDuration, targetSeconds));
      setPolledTime(clamped);
      if (playerInstance && typeof playerInstance.seekTo === 'function') {
        try {
          playerInstance.seekTo(clamped, true);
        } catch (e) {
          console.warn('Error seeking:', e);
        }
      }
    },
    [playerInstance, effectiveDuration]
  );

  const rewindSeconds = useCallback(
    (seconds = 3) => {
      if (!playerInstance) return;
      try {
        const cur = playerInstance.getCurrentTime() ?? liveCurrentTime ?? 0;
        const nextT = Math.max(0, cur - seconds);
        playerInstance.seekTo(nextT, true);
        setPolledTime(nextT);
      } catch (e) {
        console.warn('Error rewinding:', e);
      }
    },
    [playerInstance, liveCurrentTime]
  );

  // ================= TRANSITION TO STEP 2 (RESET PREVIOUS SECTIONS) =================
  const handleProceedToStep2 = useCallback(() => {
    setSyncedSections([]);
    setCurrentSectionPhrases([]);
    setCurrentPhraseIndex(0);
    setFirstSectionName('Intro');
    setCurrentSectionName('Intro');
    setCurrentSectionStartTime(0.0);
    setIsNamingFirstSection(true);
    setHasStartedSync(false);
    setIsNamingSection(false);
    setIsCorrectingLyrics(false);

    if (playerInstance && typeof playerInstance.pauseVideo === 'function') {
      try {
        playerInstance.pauseVideo();
        playerInstance.seekTo(0, true);
        setPolledTime(0);
        setIsVideoPlaying(false);
      } catch (e) {}
    }

    setCurrentStep(2);
  }, [playerInstance]);

  // ================= ACTION: MARK PHRASE (KEY C) =================
  const markCurrentPhrase = useCallback(() => {
    if (currentPhraseIndex >= parsedPhrases.length) return;

    let timeToRecord = currentTime;
    if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
      timeToRecord = playerInstance.getCurrentTime() || currentTime;
    }

    const snappedStart = snapToNearestMeasure(timeToRecord);
    const phraseText = parsedPhrases[currentPhraseIndex];

    setCurrentSectionPhrases((prev) => {
      // If the preceding phrase was still open, close it automatically at the new phrase start time
      const updated = prev.map((p, idx) => {
        if (idx === prev.length - 1 && p.endTime == null) {
          const autoEnd = Math.max(p.time, snappedStart.time);
          return {
            ...p,
            endTime: autoEnd,
            endMeasureId: snappedStart.measureId,
          };
        }
        return p;
      });

      const newPhraseObj = {
        text: phraseText,
        time: snappedStart.time,
        startMeasureId: snappedStart.measureId,
        endTime: null,
      };

      return [...updated, newPhraseObj];
    });

    setCurrentPhraseIndex((prev) => prev + 1);
    showToast(`Inicio: "${phraseText.slice(0, 18)}..." en compás #${snappedStart.measureId} (@ ${formatTime(snappedStart.time)})`);
  }, [currentPhraseIndex, parsedPhrases, currentTime, playerInstance, snapToNearestMeasure, showToast]);

  // ================= ACTION: MARK PHRASE END (KEY V) =================
  const markCurrentPhraseEnd = useCallback(() => {
    if (!isLastPhraseOpen) return;

    let timeToRecord = currentTime;
    if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
      timeToRecord = playerInstance.getCurrentTime() || currentTime;
    }

    const snappedEnd = snapToNearestMeasure(timeToRecord);

    if (currentSectionPhrases.length > 0) {
      setCurrentSectionPhrases((prev) => {
        const lastIdx = prev.length - 1;
        const last = prev[lastIdx];
        if (!last || last.endTime != null) return prev;

        const effectiveEndTime = Math.max(last.time, snappedEnd.time);
        const updated = [...prev];
        updated[lastIdx] = {
          ...last,
          endTime: effectiveEndTime,
          endMeasureId: snappedEnd.measureId,
        };
        return updated;
      });
      showToast(`Fin de oración marcado en compás #${snappedEnd.measureId} (@ ${formatTime(snappedEnd.time)})`);
    } else if (syncedSections.length > 0) {
      setSyncedSections((prev) => {
        const lastSecIdx = prev.length - 1;
        const lastSec = prev[lastSecIdx];
        if (!lastSec || !lastSec.phrases || lastSec.phrases.length === 0) return prev;
        const lastPIdx = lastSec.phrases.length - 1;
        const lastP = lastSec.phrases[lastPIdx];
        if (lastP.endTime != null) return prev;

        const effectiveEndTime = Math.max(lastP.time, snappedEnd.time);
        const updatedPhrases = [...lastSec.phrases];
        updatedPhrases[lastPIdx] = {
          ...lastP,
          endTime: effectiveEndTime,
          endMeasureId: snappedEnd.measureId,
        };
        const updatedSections = [...prev];
        updatedSections[lastSecIdx] = { ...lastSec, phrases: updatedPhrases };
        return updatedSections;
      });
      showToast(`Fin de oración marcado en compás #${snappedEnd.measureId} (@ ${formatTime(snappedEnd.time)})`);
    }
  }, [isLastPhraseOpen, currentTime, playerInstance, snapToNearestMeasure, currentSectionPhrases.length, syncedSections.length, showToast]);

  // ================= ACTION: REMOVE / UNDO LAST MARK =================
  const handleRemoveLastTimestamp = useCallback(() => {
    if (currentPhraseIndex <= 0) return;

    if (playerInstance && typeof playerInstance.pauseVideo === 'function') {
      try {
        playerInstance.pauseVideo();
      } catch (e) {}
    }

    // If the last phrase has its endTime set, undoing FIRST re-opens it by clearing endTime
    if (lastRecordedPhrase && lastRecordedPhrase.endTime != null) {
      if (currentSectionPhrases.length > 0) {
        setCurrentSectionPhrases((prev) => {
          const lastIdx = prev.length - 1;
          const updated = [...prev];
          updated[lastIdx] = { ...updated[lastIdx], endTime: null, endMeasureId: null };
          return updated;
        });
      } else if (syncedSections.length > 0) {
        setSyncedSections((prev) => {
          const lastSecIdx = prev.length - 1;
          const lastSec = prev[lastSecIdx];
          const lastPIdx = lastSec.phrases.length - 1;
          const updatedPhrases = [...lastSec.phrases];
          updatedPhrases[lastPIdx] = { ...updatedPhrases[lastPIdx], endTime: null, endMeasureId: null };
          const updated = [...prev];
          updated[lastSecIdx] = { ...lastSec, phrases: updatedPhrases };
          return updated;
        });
      }
      showToast('Fin de oración desmarcado (frase reabierta para pulsar V)');
      return;
    }

    let undoneTime = null;

    if (currentSectionPhrases.length > 0) {
      const lastPhrase = currentSectionPhrases[currentSectionPhrases.length - 1];
      undoneTime = lastPhrase?.time;
      setCurrentSectionPhrases((prev) => prev.slice(0, -1));
      setCurrentPhraseIndex((prev) => Math.max(0, prev - 1));
      showToast('Última frase desmarcada');
    } else if (syncedSections.length > 0) {
      // Reopen last completed section if current one was empty
      const lastSec = syncedSections[syncedSections.length - 1];
      const remainingSections = syncedSections.slice(0, -1);
      setSyncedSections(remainingSections);
      setCurrentSectionName(lastSec.name);
      setCurrentSectionStartTime(lastSec.startTime || 0.0);

      if (lastSec.phrases && lastSec.phrases.length > 0) {
        const lastPhrase = lastSec.phrases[lastSec.phrases.length - 1];
        undoneTime = lastPhrase?.time;
        setCurrentSectionPhrases(lastSec.phrases.slice(0, -1));
        setCurrentPhraseIndex((prev) => Math.max(0, prev - 1));
      } else {
        setCurrentSectionPhrases([]);
      }
      showToast(`Sección [${lastSec.name}] reabierta para continuar`);
    } else {
      setCurrentPhraseIndex((prev) => Math.max(0, prev - 1));
    }

    // Rewind slightly before the removed timestamp to hear the lead-in
    if (playerInstance && typeof playerInstance.seekTo === 'function') {
      try {
        const cur = playerInstance.getCurrentTime() || currentTime || 0;
        const target = undoneTime != null ? Math.max(0, undoneTime - 1.5) : Math.max(0, cur - 3);
        playerInstance.seekTo(target, true);
      } catch (e) {}
    }
  }, [
    currentPhraseIndex,
    lastRecordedPhrase,
    currentSectionPhrases,
    syncedSections,
    playerInstance,
    currentTime,
    showToast,
  ]);

  // ================= CORRECTION OF LYRICS IN STEP 2 =================
  const openCorrectLyricsModal = useCallback(() => {
    if (playerInstance && typeof playerInstance.pauseVideo === 'function') {
      try {
        playerInstance.pauseVideo();
      } catch (e) {}
    }
    setTempLyrics(rawLyrics);
    setIsCorrectingLyrics(true);
  }, [playerInstance, rawLyrics]);

  const handleSaveCorrectedLyrics = useCallback(
    (newText) => {
      const cleanLines = newText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      setRawLyrics(cleanLines.join('\n'));

      if (currentPhraseIndex > cleanLines.length) {
        setCurrentPhraseIndex(cleanLines.length);
      }

      let lineIdx = 0;
      setSyncedSections((prev) =>
        prev.map((sec) => {
          const updatedPhrases = sec.phrases.map((p) => {
            const updatedText = cleanLines[lineIdx] || p.text;
            lineIdx++;
            return { ...p, text: updatedText };
          });
          return { ...sec, phrases: updatedPhrases };
        })
      );

      setCurrentSectionPhrases((prev) =>
        prev.map((p) => {
          const updatedText = cleanLines[lineIdx] || p.text;
          lineIdx++;
          return { ...p, text: updatedText };
        })
      );

      setIsCorrectingLyrics(false);
    },
    [currentPhraseIndex]
  );

  // ================= ACTION: CANCEL SECTION MODAL =================
  const handleCancelSectionModal = useCallback(() => {
    setIsNamingSection(false);
    if (wasPlayingBeforeModalRef.current && playerInstance && typeof playerInstance.playVideo === 'function') {
      try {
        playerInstance.playVideo();
      } catch (e) {}
    }
    showToast(`Cancelado. Continuando en [${currentSectionName || 'sección actual'}]`);
  }, [playerInstance, showToast, currentSectionName]);

  // ================= ACTION: TRIGGER SECTION END (KEY X) =================
  const handleTriggerSectionEnd = useCallback(() => {
    let isPlaying = false;
    if (playerInstance && typeof playerInstance.getPlayerState === 'function') {
      try {
        isPlaying = playerInstance.getPlayerState() === 1;
      } catch (e) {}
    }
    wasPlayingBeforeModalRef.current = isPlaying;

    if (playerInstance && typeof playerInstance.pauseVideo === 'function') {
      try {
        playerInstance.pauseVideo();
        setIsVideoPlaying(false);
      } catch (e) {}
    }

    const activeLower = (currentSectionName || firstSectionName || 'Intro').toLowerCase();
    let suggest = 'Verso 1';
    if (activeLower.includes('intro')) suggest = 'Verso 1';
    else if (activeLower.includes('verso 1') || activeLower.includes('estrofa 1')) suggest = 'Verso 2';
    else if (activeLower.includes('verso 2') || activeLower.includes('estrofa 2')) suggest = 'Coro';
    else if (activeLower.includes('pre-coro')) suggest = 'Coro';
    else if (activeLower.includes('coro') || activeLower.includes('estribillo')) suggest = 'Verso 3';
    else if (activeLower.includes('verso 3') || activeLower.includes('estrofa 3')) suggest = 'Solo';
    else if (activeLower.includes('solo') || activeLower.includes('interludio')) suggest = 'Coro';
    else if (activeLower.includes('puente')) suggest = 'Coro';
    else suggest = 'Coro';

    setSectionToName(suggest);
    setIsNamingSection(true);
  }, [playerInstance, currentSectionName, firstSectionName]);

  // ================= ACTION: CONFIRM SECTION =================
  const handleConfirmSection = useCallback(
    (newSectionName, alsoMarkNextPhrase = false) => {
      let nowTime = liveCurrentTime;
      if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
        nowTime = playerInstance.getCurrentTime() || liveCurrentTime;
      }
      const snappedSecEnd = snapToNearestMeasure(nowTime);
      const effectiveSecEndTime = Math.max(currentSectionStartTime + 0.2, snappedSecEnd.time);

      const closingSectionName =
        (currentSectionName && currentSectionName.trim()) || firstSectionName || 'Intro';
      const nextActiveSectionName = (newSectionName && newSectionName.trim()) || 'Verso 1';

      // Ensure any open phrase in currentSectionPhrases is closed at effectiveSecEndTime
      const closedPhrases = currentSectionPhrases.map((p) => {
        if (p.endTime == null) {
          return {
            ...p,
            endTime: Math.max(p.time, effectiveSecEndTime),
            endMeasureId: snappedSecEnd.measureId,
          };
        }
        return p;
      });

      const completedSection = {
        name: closingSectionName,
        startTime: currentSectionStartTime,
        endTime: effectiveSecEndTime,
        phrases: closedPhrases,
      };

      setSyncedSections((prev) => [...prev, completedSection]);

      if (alsoMarkNextPhrase && currentPhraseIndex < parsedPhrases.length) {
        const nextPhraseText = parsedPhrases[currentPhraseIndex];
        const nextPhraseObj = {
          text: nextPhraseText,
          time: effectiveSecEndTime,
          startMeasureId: snappedSecEnd.measureId,
          endTime: null,
        };
        setCurrentSectionPhrases([nextPhraseObj]);
        setCurrentPhraseIndex((prev) => prev + 1);
        showToast(
          `[${closingSectionName}] cerrada → [${nextActiveSectionName}] iniciada con "${nextPhraseText.slice(0, 20)}..." (@ ${formatTime(effectiveSecEndTime)})`
        );
      } else {
        setCurrentSectionPhrases([]);
        showToast(
          `[${closingSectionName}] guardada (${formatTime(currentSectionStartTime)} - ${formatTime(effectiveSecEndTime)}) → Ahora en [${nextActiveSectionName}]`
        );
      }

      setCurrentSectionStartTime(effectiveSecEndTime);
      setCurrentSectionName(nextActiveSectionName);
      setIsNamingSection(false);

      if (playerInstance && typeof playerInstance.playVideo === 'function') {
        try {
          playerInstance.playVideo();
          setIsVideoPlaying(true);
        } catch (e) {}
      }
    },
    [
      currentSectionName,
      firstSectionName,
      currentSectionStartTime,
      currentSectionPhrases,
      liveCurrentTime,
      playerInstance,
      currentPhraseIndex,
      parsedPhrases,
      snapToNearestMeasure,
      showToast,
    ]
  );

  // ================= ACTION: START SYNC AFTER NAMING FIRST SECTION =================
  const handleStartSyncAfterNaming = useCallback(
    (name) => {
      const finalName = name.trim() || 'Intro';
      setFirstSectionName(finalName);
      setCurrentSectionName(finalName);
      setCurrentSectionStartTime(0.0);
      setIsNamingFirstSection(false);
      setHasStartedSync(true);

      if (playerInstance && typeof playerInstance.playVideo === 'function') {
        try {
          playerInstance.playVideo();
          setIsVideoPlaying(true);
        } catch (e) {}
      }
    },
    [playerInstance]
  );

  // ================= KEYBOARD SHORTCUTS LISTENER =================
  useEffect(() => {
    if (!isOpen || currentStep !== 2) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isNamingSection) {
          e.preventDefault();
          handleCancelSectionModal();
          return;
        } else if (isCorrectingLyrics) {
          e.preventDefault();
          setIsCorrectingLyrics(false);
          return;
        }
      }

      if (isNamingSection && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey && currentPhraseIndex < parsedPhrases.length) {
          handleConfirmSection(sectionToName, true);
        } else {
          handleConfirmSection(sectionToName, false);
        }
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (isNamingSection || isNamingFirstSection || isCorrectingLyrics) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        markCurrentPhrase();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        markCurrentPhraseEnd();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleTriggerSectionEnd();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleRemoveLastTimestamp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    currentStep,
    isNamingSection,
    sectionToName,
    currentPhraseIndex,
    parsedPhrases.length,
    isNamingFirstSection,
    isCorrectingLyrics,
    togglePlayPause,
    markCurrentPhrase,
    markCurrentPhraseEnd,
    handleTriggerSectionEnd,
    handleConfirmSection,
    handleRemoveLastTimestamp,
    handleCancelSectionModal,
  ]);

  return {
    currentStep,
    setCurrentStep,
    rawLyrics,
    setRawLyrics,
    availableChords,
    parsedPhrases,
    hasStartedSync,
    firstSectionName,
    setFirstSectionName,
    isNamingFirstSection,
    syncedSections,
    currentSectionName,
    currentSectionStartTime,
    currentSectionPhrases,
    currentPhraseIndex,
    allRecordedPhrases,
    lastRecordedPhrase,
    isLastPhraseOpen,
    nextPhrasePreview,
    isNamingSection,
    sectionToName,
    setSectionToName,
    isCorrectingLyrics,
    setIsCorrectingLyrics,
    tempLyrics,
    setTempLyrics,
    toastMsg,
    showToast,
    liveCurrentTime,
    effectiveDuration,
    isVideoPlaying,
    togglePlayPause,
    seekToTime,
    rewindSeconds,
    handleProceedToStep2,
    markCurrentPhrase,
    markCurrentPhraseEnd,
    handleRemoveLastTimestamp,
    openCorrectLyricsModal,
    handleSaveCorrectedLyrics,
    handleCancelSectionModal,
    handleTriggerSectionEnd,
    handleConfirmSection,
    handleStartSyncAfterNaming,
    snapToNearestMeasure,
  };
}

