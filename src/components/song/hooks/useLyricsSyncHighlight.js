import { useMemo, useEffect, useRef } from 'react';
import {
  parseSongStructure,
  calculateSectionTimingMap,
  calculateLineTimingsMap,
  resolveActivePlaybackLocation,
} from '../utils/lyricsTimingCalculator';

/**
 * Custom hook to manage real-time lyrics synchronization, timing maps, and auto-scroll centering
 */
export function useLyricsSyncHighlight({
  songContent = '',
  transpose = 0,
  songBpm,
  songTimeSignature,
  compases = [],
  currentTime = null,
  currentBeatIndex = -1,
  isPlaybackActive = false,
  isAutoScrolling = false,
  scrollRef = null,
}) {
  const activeLineRef = useRef(null);

  // 1. Parse structural sections and metadata tags
  const { sections, bpm: parsedBpm, timeSignature: parsedTimeSignature } = useMemo(() => {
    return parseSongStructure(songContent || '', transpose);
  }, [songContent, transpose]);

  const effectiveBpm = songBpm || parsedBpm || 100;
  const effectiveTimeSignature = songTimeSignature || parsedTimeSignature || '4/4';

  // 2. Section timing map for piece-wise seeker
  const sectionTimingMap = useMemo(() => {
    return calculateSectionTimingMap(sections);
  }, [sections]);

  // 3. High-precision line timings map derived from BeatGrid compases
  const lineTimingsMap = useMemo(() => {
    return calculateLineTimingsMap(compases, sections, sectionTimingMap, effectiveBpm);
  }, [compases, sections, sectionTimingMap, effectiveBpm]);

  // 4. Resolve active indices, progress and chord rank
  const {
    activeSectionIdx,
    activeLineIdx,
    lineProgress,
    activeChordRank,
    activeChordSectionIdx,
    activeChordLineIdx,
  } = useMemo(() => {
    return resolveActivePlaybackLocation({
      isPlaybackActive,
      currentBeatIndex,
      currentTime,
      lineTimingsMap,
      sections,
      sectionTimingMap,
      effectiveBpm,
    });
  }, [isPlaybackActive, currentBeatIndex, currentTime, lineTimingsMap, sections, sectionTimingMap, effectiveBpm]);

  // 5. Auto-scroll to keep active line centered
  useEffect(() => {
    if ((isAutoScrolling || isPlaybackActive || currentBeatIndex >= 0) && activeLineRef.current && scrollRef?.current) {
      const container = scrollRef.current;
      const line = activeLineRef.current;
      const lineTop = line.offsetTop;
      const lineHeight = line.offsetHeight;
      const containerHeight = container.offsetHeight;
      const targetScrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    }
  }, [activeSectionIdx, activeLineIdx, isAutoScrolling, isPlaybackActive, currentBeatIndex, scrollRef]);

  return {
    sections,
    effectiveBpm,
    effectiveTimeSignature,
    sectionTimingMap,
    lineTimingsMap,
    activeSectionIdx,
    activeLineIdx,
    lineProgress,
    activeChordRank,
    activeChordSectionIdx,
    activeChordLineIdx,
    activeLineRef,
  };
}
