import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Custom Hook for Beat Tracking and YouTube Rhythmic Synchronization in SongBook
 * 
 * Supports:
 * - Direct lookup when compases contain exact beatTimes (from Chordify transcription).
 * - Piece-wise linear section interpolation with section timestamps ([Coro @ 45.2]).
 * - Fallback to BPM linear calculation when no video timestamps are defined.
 * - Dynamic pulse highlighting on BeatGrid in sync with YouTube playback.
 */
export function useYouTubeSync({
  playerInstance = null,
  totalBeats = 0,
  bpm = 100,
  offset = 0,
  youtubeId = '',
  compases = [],
  beatsPerMeasure = 4,
  isPlaying = false,
  externalTime = null,
}) {
  const [internalTime, setInternalTime] = useState(0);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const seekLatchRef = useRef(null);

  const currentTime = externalTime !== null ? externalTime : internalTime;
  const isPlaybackActive = isPlaying || internalPlaying;

  // Handle YouTube player state changes
  const handlePlayerStateChange = useCallback((state) => {
    if (state === 1) { // Playing
      setInternalPlaying(true);
    } else if (state === 2 || state === 0) { // Paused or Ended
      setInternalPlaying(false);
    }
  }, []);

  // Interval timer tracking beats when playing without YouTube or in pulse mode
  useEffect(() => {
    if (externalTime !== null || !isPlaybackActive || totalBeats <= 0) return;

    const secondsPerBeat = 60 / (bpm || 100);
    const intervalMs = Math.max(25, (secondsPerBeat * 1000) / 4);

    const startTime = Date.now() - (internalTime * 1000);

    const timer = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      setInternalTime(elapsedSeconds);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [externalTime, isPlaybackActive, totalBeats, bpm, internalTime]);

  // Group compases into section blocks and interpolate start times
  const timingBlocks = useMemo(() => {
    if (!compases || compases.length === 0) return [];

    const blocks = [];
    let currentBlock = null;

    compases.forEach((compas, idx) => {
      const secName = compas.seccion || 'Intro';
      if (!currentBlock || currentBlock.name !== secName) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          name: secName,
          startMeasureIdx: idx,
          compasCount: 0,
          startTime: compas.secTime !== undefined && compas.secTime !== null ? compas.secTime : null,
        };
      }
      currentBlock.compasCount++;
    });
    if (currentBlock) {
      blocks.push(currentBlock);
    }

    let totalDuration = 180;
    try {
      totalDuration = playerInstance?.getDuration?.() || 180;
    } catch (e) {}

    const definedIndices = [];
    blocks.forEach((b, idx) => {
      if (b.startTime !== null) {
        definedIndices.push(idx);
      }
    });

    if (definedIndices.length === 0) {
      let currentBeatOffset = 0;
      blocks.forEach((b) => {
        const beatDuration = 60 / (bpm || 100);
        b.startTime = offset + currentBeatOffset * beatDuration;
        currentBeatOffset += b.compasCount * beatsPerMeasure;
      });
    } else {
      if (blocks[0].startTime === null) {
        blocks[0].startTime = offset;
        definedIndices.unshift(0);
      }

      for (let i = 0; i < definedIndices.length - 1; i++) {
        const startIdx = definedIndices[i];
        const endIdx = definedIndices[i + 1];

        const startTime = blocks[startIdx].startTime;
        const endTime = blocks[endIdx].startTime;

        let totalCompases = 0;
        for (let j = startIdx; j < endIdx; j++) {
          totalCompases += blocks[j].compasCount;
        }

        let accumulatedCompases = 0;
        for (let j = startIdx + 1; j < endIdx; j++) {
          accumulatedCompases += blocks[j - 1].compasCount;
          const ratio = accumulatedCompases / totalCompases;
          blocks[j].startTime = startTime + ratio * (endTime - startTime);
        }
      }

      const lastDefinedIdx = definedIndices[definedIndices.length - 1];
      const lastDefinedTime = blocks[lastDefinedIdx].startTime;

      const remainingTime = Math.max(10, totalDuration - lastDefinedTime);
      let remainingCompases = 0;
      for (let j = lastDefinedIdx; j < blocks.length; j++) {
        remainingCompases += blocks[j].compasCount;
      }

      let accumulatedCompases = 0;
      for (let j = lastDefinedIdx + 1; j < blocks.length; j++) {
        accumulatedCompases += blocks[j - 1].compasCount;
        const ratio = accumulatedCompases / remainingCompases;
        blocks[j].startTime = lastDefinedTime + ratio * remainingTime;
      }
    }

    let currentBeatOffset = 0;
    blocks.forEach((b) => {
      b.startBeatIdx = currentBeatOffset;
      b.beatCount = b.compasCount * beatsPerMeasure;
      currentBeatOffset += b.beatCount;
    });

    return blocks;
  }, [compases, bpm, offset, playerInstance, beatsPerMeasure]);

  // Calculate active beat index from currentTime
  const currentBeatIndex = useMemo(() => {
    if (!compases || compases.length === 0 || currentTime < 0) return -1;

    // 0. Check seek latch: protect against YouTube seek keyframe rounding and paused state jitter
    if (seekLatchRef.current) {
      const { beatIdx, targetTime, expiresAt } = seekLatchRef.current;
      if (!isPlaybackActive) {
        // While paused, lock strictly to the user-clicked beat
        return beatIdx;
      }
      if (Date.now() < expiresAt) {
        // While player is settling right after a seek, protect from snapbacks
        if (Math.abs(currentTime - targetTime) < 0.8) {
          return beatIdx;
        }
      } else {
        seekLatchRef.current = null;
      }
    }

    const time = currentTime;

    // 1. Direct lookup if exact beatTimes exist (from Chordify transcription)
    const hasExactBeatTimes = compases.length > 0 && Array.isArray(compases[0].beatTimes);
    if (hasExactBeatTimes) {
      const flatBeats = [];
      let globalBeatCount = 0;

      compases.forEach((compas) => {
        if (Array.isArray(compas.beatTimes)) {
          compas.beatTimes.forEach((bt) => {
            flatBeats.push({ time: bt, globalIdx: globalBeatCount++ });
          });
        }
      });

      if (flatBeats.length === 0) return -1;

      // 60ms tolerance for keyframe landing and audio-visual anticipation
      const BEAT_EPSILON = 0.06;
      let activeIdx = -1;
      for (let i = 0; i < flatBeats.length; i++) {
        if (time >= flatBeats[i].time - BEAT_EPSILON) {
          activeIdx = flatBeats[i].globalIdx;
        } else {
          break;
        }
      }
      return activeIdx;
    }

    // 2. Piece-wise linear timing blocks lookup
    if (timingBlocks.length === 0) return -1;

    let activeBlockIdx = 0;
    for (let i = 0; i < timingBlocks.length; i++) {
      if (time >= timingBlocks[i].startTime) {
        activeBlockIdx = i;
      } else {
        break;
      }
    }

    const block = timingBlocks[activeBlockIdx];
    const nextBlock = timingBlocks[activeBlockIdx + 1];

    const blockStartTime = block.startTime;
    const blockEndTime = nextBlock ? nextBlock.startTime : blockStartTime + 60;
    const blockDuration = Math.max(0.1, blockEndTime - blockStartTime);

    const elapsed = time - blockStartTime;
    const beatRatio = Math.min(1.0, Math.max(0.0, elapsed / blockDuration));

    const localBeatIdx = Math.floor(beatRatio * block.beatCount);
    return block.startBeatIdx + localBeatIdx;
  }, [currentTime, timingBlocks, compases, isPlaybackActive]);

  // Helper to jump to a specific beat and time in the video
  const jumpToBeat = useCallback((beatIdx) => {
    let targetTime = 0;
    const hasExactBeatTimes = compases.length > 0 && Array.isArray(compases[0].beatTimes);

    if (hasExactBeatTimes) {
      let currentBeat = 0;
      let foundTime = null;
      for (let m = 0; m < compases.length; m++) {
        const bTimes = compases[m].beatTimes || [];
        for (let b = 0; b < bTimes.length; b++) {
          if (currentBeat === beatIdx) {
            foundTime = bTimes[b];
            break;
          }
          currentBeat++;
        }
        if (foundTime !== null) break;
      }
      if (foundTime !== null) {
        targetTime = foundTime;
      }
    } else if (timingBlocks.length > 0) {
      let blockFound = false;
      for (let i = 0; i < timingBlocks.length; i++) {
        const b = timingBlocks[i];
        if (beatIdx >= b.startBeatIdx && beatIdx < b.startBeatIdx + b.beatCount) {
          const nextBlock = timingBlocks[i + 1];
          const blockStartTime = b.startTime;
          const blockEndTime = nextBlock
            ? nextBlock.startTime
            : blockStartTime + b.beatCount * (60 / (bpm || 100));
          const blockDuration = Math.max(0.1, blockEndTime - blockStartTime);
          const beatWithinBlock = beatIdx - b.startBeatIdx;
          const ratio = beatWithinBlock / Math.max(1, b.beatCount);
          targetTime = blockStartTime + ratio * blockDuration;
          blockFound = true;
          break;
        }
      }
      if (!blockFound) {
        const secondsPerBeat = 60 / (bpm || 100);
        targetTime = Math.max(0, offset + beatIdx * secondsPerBeat);
      }
    } else {
      const secondsPerBeat = 60 / (bpm || 100);
      targetTime = Math.max(0, offset + beatIdx * secondsPerBeat);
    }

    // Set seek latch to guarantee the clicked beat is selected immediately
    seekLatchRef.current = {
      beatIdx,
      targetTime,
      expiresAt: Date.now() + 800,
    };

    setInternalTime(targetTime);

    if (playerInstance && typeof playerInstance.seekTo === 'function') {
      try {
        playerInstance.seekTo(targetTime, true);
      } catch (e) {
        console.warn('Error seeking YouTube player:', e);
      }
    }

    return targetTime;
  }, [bpm, compases, playerInstance, timingBlocks, offset]);

  return {
    isPlaybackActive,
    setInternalPlaying,
    currentTime,
    setInternalTime,
    currentBeatIndex,
    handlePlayerStateChange,
    jumpToBeat,
  };
}

export default useYouTubeSync;
