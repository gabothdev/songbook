import { useState, useEffect, useMemo, useCallback } from 'react';
import { transposeChord, normalizeChordName } from '../utils/music';
import {
  parseSongTextToGrid,
  alignCompasesWithSongSections,
  formatCompasesToText,
  getSongBpm,
  updateTextBpm,
  doubleGridBpm,
  halveGridBpm,
  rippleShiftCompases,
} from '../utils/gridParser';

/**
 * useSongRhythmGrid Hook
 * Encapsulates all rhythmic calculations, BeatGrid parsing, measure transposition,
 * BPM scaling, and current/next chord dynamics.
 */
export function useSongRhythmGrid({
  song,
  currentContent = '',
  setCurrentContent = null,
  draftContent = '',
  setDraftContent = null,
  isEditMode = false,
  isCustom = false,
  transpose = 0,
  currentBeatIndex = -1,
  activeChord = 'C',
  onNotify = null,
}) {
  const notify = useCallback(
    (msg, timeout = 2000) => {
      if (onNotify) {
        onNotify(msg);
        setTimeout(() => onNotify(null), timeout);
      }
    },
    [onNotify]
  );

  // Pre-computed rhythmic measures (BeatGrid) from Chordify or database syncData
  const initialCompases = useMemo(() => {
    if (!song) return null;
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
  }, [song?.compases, song?.syncData]);

  const [activeCompases, setActiveCompases] = useState(initialCompases);

  // Synchronize activeCompases if the song changes
  useEffect(() => {
    setActiveCompases(initialCompases);
  }, [initialCompases, song?.id]);

  // Parse or retrieve pre-computed rhythmic measures (BeatGrid)
  const parsedCompases = useMemo(() => {
    const rawLyrics = isEditMode
      ? draftContent
      : isCustom && currentContent
      ? currentContent
      : currentContent || song?.content || '';

    if (activeCompases && activeCompases.length > 0) {
      return alignCompasesWithSongSections(activeCompases, rawLyrics);
    }
    return parseSongTextToGrid(rawLyrics || '', 4);
  }, [activeCompases, isEditMode, draftContent, isCustom, currentContent, song?.content]);

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

  // Cumulative beat offset for each measure to support variable beat counts
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
    return getSongBpm(draftContent || currentContent || song?.content, 100);
  }, [draftContent, currentContent, song?.content]);

  // Handler to double (x2) or halve (/2) BPM while subdividing or merging measures
  const handleScaleBpm = useCallback(
    (factor) => {
      const rawContent = (isEditMode ? draftContent : currentContent) || song?.content || '';
      const oldBpm = getSongBpm(rawContent, 100);
      const newBpm = Math.max(30, Math.min(300, Math.round(oldBpm * factor)));

      let updatedCompases = null;
      if (factor === 2) {
        updatedCompases = doubleGridBpm(activeCompases || parsedCompases);
      } else if (factor === 0.5) {
        updatedCompases = halveGridBpm(activeCompases || parsedCompases);
      }

      let updatedText = updateTextBpm(rawContent, newBpm);

      if (updatedCompases && updatedCompases.length > 0) {
        setActiveCompases(updatedCompases);

        // Si la canción es instrumental / solo acordes (sin letra), regenerar los renglones de acordes para que coincidan 1:1 con los nuevos compases
        const textWithoutTags = updatedText.replace(/\[[^\]]+\]/g, '').replace(/[\s\d:.\-_/|]+/g, '');
        const hasLyrics = textWithoutTags.length > 20;
        if (!hasLyrics) {
          const bpmMatch = updatedText.match(/\[BPM\s*[@:]?\s*\d+\]/i);
          const beatsMatch = updatedText.match(/\[Beats\s*[@:]?\s*\d+\]/i);
          let header = '';
          if (bpmMatch) header += `${bpmMatch[0]}\n`;
          if (beatsMatch) header += `${beatsMatch[0]}\n`;
          if (header) header += '\n';
          updatedText = header + formatCompasesToText(updatedCompases);
        }
      }

      if (setDraftContent) setDraftContent(updatedText);
      if (!isEditMode && setCurrentContent) setCurrentContent(updatedText);

      notify(
        factor === 2
          ? `BPM duplicado a ${newBpm} (compases subdivididos x2)`
          : `BPM dividido a ${newBpm} (compases fusionados ÷2)`,
        3000
      );
    },
    [isEditMode, draftContent, currentContent, song?.content, activeCompases, parsedCompases, setDraftContent, setCurrentContent, notify]
  );

  const handleSetMeasureTimestamp = useCallback(
    (measureIdx, timestamp) => {
      if (timestamp === null || timestamp === undefined) return;
      const rounded = parseFloat(Number(timestamp).toFixed(1));
      notify(`Compás marcado en ${rounded}s`, 1800);
    },
    [notify]
  );

  const handleAddMeasureToSection = useCallback(
    (sectionName, beatsPerMeasure = 4) => {
      const targetSec = (sectionName || 'Estrofa').trim();
      const numBeats = Math.max(1, Number(beatsPerMeasure) || 4);

      setActiveCompases((prev) => {
        const currentGrid = prev || parsedCompases || [];
        const newMeasure = {
          id: currentGrid.length + 1,
          seccion: targetSec,
          acordes: Array(numBeats).fill('𝄾'),
          secTime: null,
        };

        let insertIdx = -1;
        for (let i = currentGrid.length - 1; i >= 0; i--) {
          if ((currentGrid[i].seccion || '').trim().toLowerCase() === targetSec.toLowerCase()) {
            insertIdx = i + 1;
            break;
          }
        }

        const updated = [...currentGrid];
        if (insertIdx !== -1) {
          updated.splice(insertIdx, 0, newMeasure);
        } else {
          updated.push(newMeasure);
        }

        const reindexed = updated.map((m, idx) => ({ ...m, id: idx + 1 }));

        const activeText = (isEditMode ? draftContent : currentContent) || '';
        const textWithoutTags = activeText.replace(/\[[^\]]+\]/g, '').replace(/[\s\d:.\-_/|]+/g, '');
        const hasLyrics = textWithoutTags.length > 20;
        if (!hasLyrics) {
          const bpmMatch = activeText.match(/\[BPM\s*[@:]?\s*\d+\]/i);
          const beatsMatch = activeText.match(/\[Beats\s*[@:]?\s*\d+\]/i);
          let header = '';
          if (bpmMatch) header += `${bpmMatch[0]}\n`;
          if (beatsMatch) header += `${beatsMatch[0]}\n`;
          if (header) header += '\n';

          const updatedText = header + formatCompasesToText(reindexed);
          if (setDraftContent) setDraftContent(updatedText);
          if (!isEditMode && setCurrentContent) setCurrentContent(updatedText);
        }

        return reindexed;
      });

      notify(`Compás añadido a [${targetSec}]`, 1800);
    },
    [parsedCompases, isEditMode, draftContent, currentContent, setDraftContent, setCurrentContent, notify]
  );

  const handleUpdateBeatGridChord = useCallback(
    (cellGlobalIndex, newChord) => {
      if (!newChord) return;
      const clean = normalizeChordName(newChord);

      setActiveCompases((prev) => {
        const currentGrid = prev || parsedCompases;
        if (!currentGrid || currentGrid.length === 0) return prev;

        let accBeats = 0;
        let measureIdx = -1;
        let beatIdx = -1;
        for (let m = 0; m < currentGrid.length; m++) {
          const mLen = currentGrid[m].acordes?.length || 4;
          if (cellGlobalIndex >= accBeats && cellGlobalIndex < accBeats + mLen) {
            measureIdx = m;
            beatIdx = cellGlobalIndex - accBeats;
            break;
          }
          accBeats += mLen;
        }

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
          if (setCurrentContent) setCurrentContent(updatedText);
          if (setDraftContent) setDraftContent(updatedText);
        }

        return updated;
      });

      notify(`Acorde [${clean}] actualizado`, 1500);
    },
    [parsedCompases, currentContent, setCurrentContent, setDraftContent, notify]
  );

  // Handler para cambiar la métrica/duración de un compás, sección o canción completa con Ripple Shift
  const handleChangeMeasureLength = useCallback(
    (measureIdx, newLength, scope = 'single') => {
      if (!newLength || newLength < 1) return;

      const effectiveScope =
        scope === true ? 'single' : scope === false ? 'isolated' : scope || 'single';

      setActiveCompases((prev) => {
        const currentGrid = prev || parsedCompases;
        if (!currentGrid || measureIdx < 0 || measureIdx >= currentGrid.length) return prev;

        const updated = rippleShiftCompases(currentGrid, measureIdx, newLength, effectiveScope);

        // Si el contenido actual no tiene letra, sincronizar texto
        const activeText = (isEditMode ? draftContent : currentContent) || song?.content || '';
        const textWithoutTags = activeText.replace(/\[[^\]]+\]/g, '').replace(/[\s\d:.\-_/|]+/g, '');
        const hasLyrics = textWithoutTags.length > 20;
        if (!hasLyrics) {
          const bpmMatch = activeText.match(/\[BPM\s*[@:]?\s*\d+\]/i);
          const beatsMatch = activeText.match(/\[Beats\s*[@:]?\s*\d+\]/i);
          let header = '';
          if (bpmMatch) header += `${bpmMatch[0]}\n`;
          if (effectiveScope === 'all') {
            header += `[Beats @ ${newLength}]\n`;
          } else if (beatsMatch) {
            header += `${beatsMatch[0]}\n`;
          }
          if (header) header += '\n';

          const updatedText = header + formatCompasesToText(updated);
          if (!isEditMode && setCurrentContent) setCurrentContent(updatedText);
          if (setDraftContent) setDraftContent(updatedText);
        }

        return updated;
      });

      const meterLabel =
        newLength === 3
          ? '3/4 (3 tiempos)'
          : newLength === 4
          ? '4/4 (4 tiempos)'
          : newLength === 2
          ? '2/4 (2 tiempos)'
          : newLength === 6
          ? '6/8 (6 tiempos)'
          : `${newLength} tiempos`;

      if (effectiveScope === 'all') {
        notify(`Toda la canción reagrupada en ${meterLabel}`, 2600);
      } else if (effectiveScope === 'from_here') {
        notify(`Desde Compás ${measureIdx + 1} hasta el final reagrupado en ${meterLabel}`, 2600);
      } else if (effectiveScope === 'section') {
        const secName = (activeCompases || parsedCompases)?.[measureIdx]?.seccion || 'Sección';
        notify(`Sección [${secName}] reagrupada en ${meterLabel}`, 2500);
      } else {
        notify(`Compás ${measureIdx + 1} ajustado a ${meterLabel}`, 2200);
      }
    },
    [activeCompases, parsedCompases, currentContent, setCurrentContent, setDraftContent, notify]
  );

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
    return activeChord || song?.uniqueChords?.[0] || 'C';
  }, [currentBeatIndex, flatBeats, activeChord, song?.uniqueChords]);

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

    return (song?.uniqueChords || ['C', 'G', 'Am', 'F']).map((ch) =>
      transposeChord(ch, transpose)
    );
  }, [transposedCompases, song?.uniqueChords, transpose]);

  return {
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
    currentPlayingChord,
    nextChordName,
    beatsUntilNext,
    currentUniqueChords,
  };
}

/**
 * useCurrentPlayingChord Hook
 * Dynamically resolves currently active chord and distance to next chord
 * given currentBeatIndex and flatBeats array.
 */
export function useCurrentPlayingChord({
  currentBeatIndex = -1,
  flatBeats = [],
  activeChord = 'C',
  fallbackChord = 'C',
}) {
  const currentPlayingChord = useMemo(() => {
    if (currentBeatIndex >= 0 && currentBeatIndex < flatBeats.length) {
      for (let i = currentBeatIndex; i >= 0; i--) {
        const ch = flatBeats[i];
        if (ch && ch !== '𝄾' && ch !== '𝄽') {
          return ch;
        }
      }
    }
    return activeChord || fallbackChord || 'C';
  }, [currentBeatIndex, flatBeats, activeChord, fallbackChord]);

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

  return { currentPlayingChord, nextChordName, beatsUntilNext };
}
