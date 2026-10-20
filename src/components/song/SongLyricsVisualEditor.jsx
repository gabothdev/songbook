import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  RotateCcw,
  Save,
  X,
  Plus,
  Music2,
  FileText,
  ArrowUp,
  ArrowDown,
  Scissors,
  Trash2,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { normalizeChordName } from '../../utils/music';
import {
  SECTION_TYPES,
  parseLyricsToVisualBlocks,
  reconstructTextFromBlocks,
  isInstrumentalSong,
  splitWordAtChar,
  mergeSyllableWithNext,
} from '../../utils/lyricsBlocks';

import AddSectionPopover from './editor/AddSectionPopover';
import SectionBoundaryDivider from './editor/SectionBoundaryDivider';
import SectionGutterHeader from './editor/SectionGutterHeader';
import WordChordDropSlot from './editor/WordChordDropSlot';
import { LinePrefixChords, LineSuffixChords } from './editor/LineChordPrefixSuffix';
import EditorToolbar from './editor/EditorToolbar';
import ChordStampBar from './editor/ChordStampBar';
import QuickChordPickerModal from './editor/QuickChordPickerModal';
import SteppedSyncWizardModal from './editor/SteppedSyncWizardModal';
import { splitWordIntoTwoSyllables } from './editor/syncWizard/wizardChordDistributor';
import {
  calculateSectionTimingMap,
  calculateLineTimingsMap,
  resolveActivePlaybackLocation,
  IGNORED_CHORD_REGEX,
} from './utils/lyricsTimingCalculator';

const MUSICAL_CHORD_REGEX = /^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*$/i;

/**
 * SongLyricsVisualEditor Component
 * Master interactive lyrics & chords arranger matching the 90° gutter notebook theme.
 */
export default function SongLyricsVisualEditor({
  draftContent,
  setDraftContent,
  uniqueChords = [],
  onSave,
  onCancel,
  onRestoreOriginal,
  hasOriginal = false,
  isSaving = false,
  currentPlaybackTime = null,
  activeSectionName = null,
  onSelectSection = null,
  onSelectChord = null,
  isInstrumental: initialIsInstrumental = false,
  onMarkAsInstrumental = null,
  currentBpm = 100,
  playerInstance = null,
  youtubeId = '',
  onSaveCompases = null,
  activeStampChord: controlledStampChord,
  onChangeActiveStampChord = null,
  compases = [],
  currentBeatIndex = -1,
  isPlaybackActive = false,
  className = '',
}) {
  const [isExplicitInstrumental, setIsExplicitInstrumental] = useState(Boolean(initialIsInstrumental));
  const [isSyncWizardOpen, setIsSyncWizardOpen] = useState(false);
  const [editorViewMode, setEditorViewMode] = useState('visual'); // 'visual' | 'text'
  const [isTextSectionMenuOpen, setIsTextSectionMenuOpen] = useState(false);
  const textEditorRef = useRef(null);
  const canvasScrollRef = useRef(null);
  const activeLineRef = useRef(null);

  const visualSections = useMemo(() => {
    return parseLyricsToVisualBlocks(draftContent);
  }, [draftContent]);

  // Build 1:1 structural sections from visualSections for exact BeatGrid/video correlation
  const sectionsForTiming = useMemo(() => {
    return visualSections.map((sec) => ({
      name: sec.name,
      time: sec.time,
      lines: (sec.lines || []).map((line) => {
        let lineStr = '';
        if (line.prefixChords && line.prefixChords.length > 0) {
          lineStr += line.prefixChords.map((p) => `[${p.chord}]`).join(' ') + ' ';
        }
        if (line.words && line.words.length > 0) {
          line.words.forEach((w) => {
            if (w.type === 'space') {
              lineStr += w.text;
            } else {
              if (w.chord) {
                lineStr += `[${w.chord}]`;
              }
              lineStr += w.text;
            }
          });
        }
        if (line.suffixChords && line.suffixChords.length > 0) {
          lineStr += ' ' + line.suffixChords.map((s) => `[${s.chord}]`).join(' ');
        }
        return lineStr.trim();
      }),
    }));
  }, [visualSections]);

  const sectionTimingMap = useMemo(() => {
    return calculateSectionTimingMap(sectionsForTiming);
  }, [sectionsForTiming]);

  const lineTimingsMap = useMemo(() => {
    return calculateLineTimingsMap(compases, sectionsForTiming, sectionTimingMap, currentBpm || 100);
  }, [compases, sectionsForTiming, sectionTimingMap, currentBpm]);

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
      currentTime: currentPlaybackTime,
      lineTimingsMap,
      sections: sectionsForTiming,
      sectionTimingMap,
      effectiveBpm: currentBpm || 100,
    });
  }, [
    isPlaybackActive,
    currentBeatIndex,
    currentPlaybackTime,
    lineTimingsMap,
    sectionsForTiming,
    sectionTimingMap,
    currentBpm,
  ]);

  const effChordSecIdx = activeChordSectionIdx !== undefined ? activeChordSectionIdx : activeSectionIdx;
  const effChordLineIdx = activeChordLineIdx !== undefined ? activeChordLineIdx : activeLineIdx;

  // Auto-scroll visual editor canvas when active line or beat changes
  useEffect(() => {
    if ((isPlaybackActive || currentBeatIndex >= 0) && activeLineRef.current && canvasScrollRef.current) {
      const container = canvasScrollRef.current;
      const line = activeLineRef.current;
      const lineTop = line.offsetTop;
      const lineHeight = line.offsetHeight;
      const containerHeight = container.offsetHeight;
      const targetScrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    }
  }, [activeSectionIdx, activeLineIdx, isPlaybackActive, currentBeatIndex]);

  // Navigate to exact BeatGrid pulse and video timestamp when clicking a chord in the editor
  const handleNavigateToChord = useCallback(
    (sec, secIdx, lineIdx, chordName, chordRank, tokenOffset = 0, totalTokens = 1) => {
      if (!chordName || IGNORED_CHORD_REGEX.test(chordName)) return;
      const timing = sectionTimingMap[secIdx] || {};
      const lineTiming = lineTimingsMap?.[secIdx]?.[lineIdx];
      const chordBeatInfo = chordRank >= 0 ? lineTiming?.chords?.[chordRank] : null;
      const chordTimingInfo = chordRank >= 0 ? lineTiming?.chordTimings?.[chordRank] : null;

      if (onSelectChord) {
        onSelectChord(chordName, {
          chord: chordName,
          sec,
          sIdx: secIdx,
          lIdx: lineIdx,
          chordRank,
          beatIdx: chordBeatInfo?.startBeatGlobal,
          compasIdx: chordBeatInfo?.compasIdx,
          beatInCompas: chordBeatInfo?.beatInCompas,
          targetTime: chordTimingInfo?.startTime,
          chordRatio:
            (lineIdx + (tokenOffset + 0.5) / Math.max(1, totalTokens)) /
            Math.max(1, (sec.lines || []).length),
          startTime: timing.startTime,
          nextTime: timing.nextTime,
        });
      }
    },
    [sectionTimingMap, lineTimingsMap, onSelectChord]
  );

  // History Stacks for Undo / Redo
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  // Editor Interaction States
  const [activeDropWordId, setActiveDropWordId] = useState(null);
  const [internalStampChord, setInternalStampChord] = useState(null);
  const activeStampChord =
    controlledStampChord !== undefined ? controlledStampChord : internalStampChord;
  const setActiveStampChord = useCallback(
    (val) => {
      if (onChangeActiveStampChord) {
        onChangeActiveStampChord(val);
      } else {
        setInternalStampChord(val);
      }
    },
    [onChangeActiveStampChord]
  );

  const [selectedWordForPicker, setSelectedWordForPicker] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [editingSectionPopover, setEditingSectionPopover] = useState(null); // sec.id
  const [addSectionPopover, setAddSectionPopover] = useState(null); // { atIndex: number, id: string }
  const [highlightedLineKey, setHighlightedLineKey] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Helper to commit content updates with undo history
  const updateContentWithHistory = useCallback(
    (newContent) => {
      if (newContent === draftContent) return;
      setHistoryPast((prev) => [...prev.slice(-25), draftContent]);
      setHistoryFuture([]);
      setDraftContent(newContent);
    },
    [draftContent, setDraftContent]
  );

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, prev.length - 1));
    setHistoryFuture((prev) => [draftContent, ...prev]);
    setDraftContent(previous);
    showToast('Deshecho');
  }, [historyPast, draftContent, setDraftContent]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, draftContent]);
    setDraftContent(next);
    showToast('Rehecho');
  }, [historyFuture, draftContent, setDraftContent]);

  // Global Keyboard Shortcuts (Ctrl+Z / Ctrl+Y, Escape) and Outside Dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      const targetTag = e.target?.tagName?.toLowerCase();
      const isTyping = targetTag === 'input' || targetTag === 'textarea';

      if (e.key === 'Escape') {
        setEditingSectionPopover(null);
        setAddSectionPopover(null);
        setIsTextSectionMenuOpen(false);
        setActiveStampChord(null);
        return;
      }

      if (!isTyping && (e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    const handleDismiss = () => {
      setEditingSectionPopover(null);
      setAddSectionPopover(null);
      setIsTextSectionMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleDismiss);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleDismiss);
    };
  }, [handleUndo, handleRedo, setActiveStampChord]);

  const isInstrumental = useMemo(() => {
    return isInstrumentalSong(visualSections, isExplicitInstrumental);
  }, [visualSections, isExplicitInstrumental]);

  const handleMarkAsInstrumental = () => {
    setIsExplicitInstrumental(true);
    let newContent = draftContent;

    // Si no hay secciones o el contenido está casi vacío, generar una plantilla de secciones instrumentales
    if (!visualSections || visualSections.length === 0 || visualSections.every((s) => s.lines.length === 0)) {
      newContent = '[Intro]\n[Tema A]\n[Solo]\n[Final]';
      updateContentWithHistory(newContent);
    }

    if (onMarkAsInstrumental) {
      onMarkAsInstrumental(newContent);
    }
    showToast('🎵 Marcada como completamente instrumental');
  };

  // Updates a specific word's chord (and clears source if dragged from another word/slot)
  const handleAssignChordToWord = (secIdx, lineIdx, wordId, chordName, sourceData = null) => {
    const updated = JSON.parse(JSON.stringify(visualSections));

    // If moved from another word/slot, remove from source first
    if (sourceData) {
      const { sourceWordId, sourcePrefixId, sourceSuffixId, sourceSecIdx, sourceLineIdx } = sourceData;
      if (sourceSecIdx !== undefined && sourceLineIdx !== undefined && updated[sourceSecIdx]?.lines?.[sourceLineIdx]) {
        const srcLine = updated[sourceSecIdx].lines[sourceLineIdx];
        if (sourceWordId && srcLine.words) {
          const srcWord = srcLine.words.find((w) => w.id === sourceWordId);
          if (srcWord) srcWord.chord = null;
        } else if (sourcePrefixId && srcLine.prefixChords) {
          srcLine.prefixChords = srcLine.prefixChords.filter((p) => p.id !== sourcePrefixId);
        } else if (sourceSuffixId && srcLine.suffixChords) {
          srcLine.suffixChords = srcLine.suffixChords.filter((s) => s.id !== sourceSuffixId);
        }
      }
    }

    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line) return;
    const word = line.words.find((w) => w.id === wordId);
    if (word) {
      word.chord = chordName ? normalizeChordName(chordName) : null;
    }
    const newContent = reconstructTextFromBlocks(updated);
    updateContentWithHistory(newContent);
    if (chordName) {
      showToast(sourceData?.sourceWordId || sourceData?.sourcePrefixId || sourceData?.sourceSuffixId ? `Acorde [${chordName}] movido` : `Acorde [${chordName}] asignado`);
      if (onSelectChord) onSelectChord(chordName);
    }
  };

  // Add a prefix chord (pickup / entrada) before the phrase
  const handleAddPrefixChord = (secIdx, lineIdx, chordName, sourceData = null) => {
    if (!chordName) return;
    const updated = JSON.parse(JSON.stringify(visualSections));

    // If moved from another word/slot, remove from source first
    if (sourceData) {
      const { sourceWordId, sourcePrefixId, sourceSuffixId, sourceSecIdx, sourceLineIdx } = sourceData;
      if (sourceSecIdx !== undefined && sourceLineIdx !== undefined && updated[sourceSecIdx]?.lines?.[sourceLineIdx]) {
        const srcLine = updated[sourceSecIdx].lines[sourceLineIdx];
        if (sourceWordId && srcLine.words) {
          const srcWord = srcLine.words.find((w) => w.id === sourceWordId);
          if (srcWord) srcWord.chord = null;
        } else if (sourcePrefixId && srcLine.prefixChords) {
          srcLine.prefixChords = srcLine.prefixChords.filter((p) => p.id !== sourcePrefixId);
        } else if (sourceSuffixId && srcLine.suffixChords) {
          srcLine.suffixChords = srcLine.suffixChords.filter((s) => s.id !== sourceSuffixId);
        }
      }
    }

    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line) return;

    if (!line.prefixChords) line.prefixChords = [];
    line.prefixChords.push({
      id: `p_${Math.random().toString(36).substring(2, 8)}`,
      chord: normalizeChordName(chordName),
    });

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast(sourceData?.sourceWordId || sourceData?.sourcePrefixId || sourceData?.sourceSuffixId ? `Acorde [${chordName}] movido a previo` : `Acorde previo [${chordName}] añadido`);
    if (onSelectChord) onSelectChord(chordName);
  };

  // Remove a prefix chord
  const handleRemovePrefixChord = (secIdx, lineIdx, chordId) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line || !line.prefixChords) return;

    line.prefixChords = line.prefixChords.filter((p) => p.id !== chordId);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
  };

  // Add a suffix chord (remate / salida) after the phrase
  const handleAddSuffixChord = (secIdx, lineIdx, chordName, sourceData = null) => {
    if (!chordName) return;
    const updated = JSON.parse(JSON.stringify(visualSections));

    // If moved from another word/slot, remove from source first
    if (sourceData) {
      const { sourceWordId, sourcePrefixId, sourceSuffixId, sourceSecIdx, sourceLineIdx } = sourceData;
      if (sourceSecIdx !== undefined && sourceLineIdx !== undefined && updated[sourceSecIdx]?.lines?.[sourceLineIdx]) {
        const srcLine = updated[sourceSecIdx].lines[sourceLineIdx];
        if (sourceWordId && srcLine.words) {
          const srcWord = srcLine.words.find((w) => w.id === sourceWordId);
          if (srcWord) srcWord.chord = null;
        } else if (sourcePrefixId && srcLine.prefixChords) {
          srcLine.prefixChords = srcLine.prefixChords.filter((p) => p.id !== sourcePrefixId);
        } else if (sourceSuffixId && srcLine.suffixChords) {
          srcLine.suffixChords = srcLine.suffixChords.filter((s) => s.id !== sourceSuffixId);
        }
      }
    }

    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line) return;

    if (!line.suffixChords) line.suffixChords = [];
    line.suffixChords.push({
      id: `s_${Math.random().toString(36).substring(2, 8)}`,
      chord: normalizeChordName(chordName),
    });

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast(sourceData?.sourceWordId || sourceData?.sourcePrefixId || sourceData?.sourceSuffixId ? `Acorde [${chordName}] movido a final` : `Acorde final [${chordName}] añadido`);
    if (onSelectChord) onSelectChord(chordName);
  };

  // Remove a suffix chord
  const handleRemoveSuffixChord = (secIdx, lineIdx, chordId) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line || !line.suffixChords) return;

    line.suffixChords = line.suffixChords.filter((s) => s.id !== chordId);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
  };

  // ◀ ▶ Shift a chord left or right across words, syllables, or prefix/suffix
  const handleNudgeChord = (secIdx, lineIdx, sourceType, index, direction) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines?.[lineIdx];
    if (!line) return;

    if (!line.prefixChords) line.prefixChords = [];
    if (!line.words) line.words = [];
    if (!line.suffixChords) line.suffixChords = [];

    const wordIndices = [];
    line.words.forEach((w, idx) => {
      if (w.type === 'word') wordIndices.push(idx);
    });

    let nudgedChord = null;

    if (sourceType === 'word') {
      const currentWordIdx = index;
      const currentWord = line.words[currentWordIdx];
      if (!currentWord || !currentWord.chord) return;
      nudgedChord = currentWord.chord;

      const pos = wordIndices.indexOf(currentWordIdx);
      if (pos === -1) return;

      if (direction === -1) {
        // Shift LEFT (◀)
        if (pos > 0) {
          const targetIdx = wordIndices[pos - 1];
          const targetWord = line.words[targetIdx];
          if (!targetWord.chord) {
            targetWord.chord = nudgedChord;
            currentWord.chord = null;
          } else {
            const cleanText = targetWord.text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '');
            const sylParts = splitWordIntoTwoSyllables(targetWord.text);
            if (cleanText.length >= 4 && sylParts) {
              const splitPos = sylParts[0].length;
              line.words = splitWordAtChar(line.words, targetWord.id, splitPos);
              const newTargetIdx = line.words.findIndex((w) => w.id === targetWord.id);
              if (newTargetIdx >= 0 && newTargetIdx + 1 < line.words.length) {
                line.words[newTargetIdx + 1].chord = nudgedChord;
              }
              const updatedCurrent = line.words.find((w) => w.id === currentWord.id);
              if (updatedCurrent) updatedCurrent.chord = null;
            } else {
              const tmp = targetWord.chord;
              targetWord.chord = nudgedChord;
              currentWord.chord = tmp;
            }
          }
        } else {
          // At beginning of line: move to prefixChords
          line.prefixChords.push({
            id: `p_${Math.random().toString(36).substring(2, 8)}`,
            chord: nudgedChord,
          });
          currentWord.chord = null;
        }
      } else if (direction === 1) {
        // Shift RIGHT (▶)
        if (pos < wordIndices.length - 1) {
          const targetIdx = wordIndices[pos + 1];
          const targetWord = line.words[targetIdx];
          if (!targetWord.chord) {
            targetWord.chord = nudgedChord;
            currentWord.chord = null;
          } else {
            const currClean = currentWord.text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '');
            const currSyl = splitWordIntoTwoSyllables(currentWord.text);
            if (currClean.length >= 4 && currSyl && !currentWord.isSyllable) {
              const splitPos = currSyl[0].length;
              line.words = splitWordAtChar(line.words, currentWord.id, splitPos);
              const newCurrIdx = line.words.findIndex((w) => w.id === currentWord.id);
              if (newCurrIdx >= 0 && newCurrIdx + 1 < line.words.length) {
                line.words[newCurrIdx].chord = null;
                line.words[newCurrIdx + 1].chord = nudgedChord;
              }
            } else {
              const targetClean = targetWord.text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '');
              const targetSyl = splitWordIntoTwoSyllables(targetWord.text);
              if (targetClean.length >= 4 && targetSyl) {
                const splitPos = targetSyl[0].length;
                line.words = splitWordAtChar(line.words, targetWord.id, splitPos);
                const newTargetIdx = line.words.findIndex((w) => w.id === targetWord.id);
                if (newTargetIdx >= 0 && newTargetIdx + 1 < line.words.length) {
                  line.words[newTargetIdx + 1].chord = nudgedChord;
                }
                const updatedCurrent = line.words.find((w) => w.id === currentWord.id);
                if (updatedCurrent) updatedCurrent.chord = null;
              } else {
                const tmp = targetWord.chord;
                targetWord.chord = nudgedChord;
                currentWord.chord = tmp;
              }
            }
          }
        } else {
          // At end of line: move to suffixChords
          line.suffixChords.unshift({
            id: `s_${Math.random().toString(36).substring(2, 8)}`,
            chord: nudgedChord,
          });
          currentWord.chord = null;
        }
      }
    } else if (sourceType === 'prefix') {
      const pIdx = index;
      if (!line.prefixChords[pIdx]) return;
      nudgedChord = line.prefixChords[pIdx].chord;

      if (direction === -1) {
        if (pIdx > 0) {
          const tmp = line.prefixChords[pIdx - 1];
          line.prefixChords[pIdx - 1] = line.prefixChords[pIdx];
          line.prefixChords[pIdx] = tmp;
        }
      } else if (direction === 1) {
        if (pIdx < line.prefixChords.length - 1) {
          const tmp = line.prefixChords[pIdx + 1];
          line.prefixChords[pIdx + 1] = line.prefixChords[pIdx];
          line.prefixChords[pIdx] = tmp;
        } else if (wordIndices.length > 0) {
          const firstWord = line.words[wordIndices[0]];
          if (!firstWord.chord) {
            firstWord.chord = nudgedChord;
            line.prefixChords.splice(pIdx, 1);
          } else {
            const cleanText = firstWord.text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '');
            const sylParts = splitWordIntoTwoSyllables(firstWord.text);
            if (cleanText.length >= 4 && sylParts) {
              const splitPos = sylParts[0].length;
              line.words = splitWordAtChar(line.words, firstWord.id, splitPos);
              const newFirstIdx = line.words.findIndex((w) => w.id === firstWord.id);
              if (newFirstIdx >= 0) {
                line.words[newFirstIdx].chord = nudgedChord;
              }
              line.prefixChords.splice(pIdx, 1);
            } else {
              const tmp = firstWord.chord;
              firstWord.chord = nudgedChord;
              line.prefixChords[pIdx].chord = tmp;
            }
          }
        }
      }
    } else if (sourceType === 'suffix') {
      const sIdx = index;
      if (!line.suffixChords[sIdx]) return;
      nudgedChord = line.suffixChords[sIdx].chord;

      if (direction === 1) {
        if (sIdx < line.suffixChords.length - 1) {
          const tmp = line.suffixChords[sIdx + 1];
          line.suffixChords[sIdx + 1] = line.suffixChords[sIdx];
          line.suffixChords[sIdx] = tmp;
        }
      } else if (direction === -1) {
        if (sIdx > 0) {
          const tmp = line.suffixChords[sIdx - 1];
          line.suffixChords[sIdx - 1] = line.suffixChords[sIdx];
          line.suffixChords[sIdx] = tmp;
        } else if (wordIndices.length > 0) {
          const lastWord = line.words[wordIndices[wordIndices.length - 1]];
          if (!lastWord.chord) {
            lastWord.chord = nudgedChord;
            line.suffixChords.splice(sIdx, 1);
          } else {
            const cleanText = lastWord.text.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '');
            const sylParts = splitWordIntoTwoSyllables(lastWord.text);
            if (cleanText.length >= 4 && sylParts) {
              const splitPos = sylParts[0].length;
              line.words = splitWordAtChar(line.words, lastWord.id, splitPos);
              const newLastIdx = line.words.findIndex((w) => w.id === lastWord.id);
              if (newLastIdx >= 0 && newLastIdx + 1 < line.words.length) {
                line.words[newLastIdx + 1].chord = nudgedChord;
              }
              line.suffixChords.splice(sIdx, 1);
            } else {
              const tmp = lastWord.chord;
              lastWord.chord = nudgedChord;
              line.suffixChords[sIdx].chord = tmp;
            }
          }
        }
      }
    }

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast(`Acorde [${nudgedChord}] desplazado`);
  };

  // Fine Syllable Split (✂️)
  const handleSplitWord = (secIdx, lineIdx, wordId, splitCharIndex) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line || !line.words) return;

    line.words = splitWordAtChar(line.words, wordId, splitCharIndex);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast('Palabra dividida en sílabas');
  };

  // Merge Syllables back (🔗)
  const handleMergeWords = (secIdx, lineIdx, wordId) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line || !line.words) return;

    line.words = mergeSyllableWithNext(line.words, wordId);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast('Sílabas unificadas');
  };

  // Add an instrumental measure line inside a section
  const handleAddInstrumentalLine = (secIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;

    const newLine = {
      id: `line_inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      prefixChords: [
        { id: `p_${Math.random().toString(36).substring(2, 8)}`, chord: '𝄾' },
        { id: `p_${Math.random().toString(36).substring(2, 8)}`, chord: '𝄾' },
      ],
      words: [],
      suffixChords: [],
    };

    if (lineIdx !== undefined && lineIdx !== null) {
      sec.lines.splice(lineIdx + 1, 0, newLine);
    } else {
      sec.lines.push(newLine);
    }

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast('Compás instrumental añadido');
  };

  // Add a new vocal verse line inside a section
  const handleAddLyricLine = (secIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;

    const newLine = {
      id: `line_lyric_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      prefixChords: [],
      words: [
        {
          id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'word',
          text: 'Nuevo',
          chord: null,
        },
        {
          type: 'space',
          text: ' ',
        },
        {
          id: `w_${Date.now() + 1}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'word',
          text: 'verso...',
          chord: null,
        },
      ],
      suffixChords: [],
    };

    if (lineIdx !== undefined && lineIdx !== null) {
      sec.lines.splice(lineIdx + 1, 0, newLine);
    } else {
      sec.lines.push(newLine);
    }

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast('Nuevo verso añadido debajo');
  };

  // Delete a specific line from a section
  const handleDeleteLine = (secIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec || !sec.lines || lineIdx < 0 || lineIdx >= sec.lines.length) return;

    sec.lines.splice(lineIdx, 1);

    // If the section becomes completely empty, keep a placeholder if it's the only section, or remove if others exist
    if (sec.lines.length === 0) {
      if (updated.length > 1) {
        updated.splice(secIdx, 1);
      } else {
        sec.lines.push({
          id: `line_empty_${Date.now()}`,
          prefixChords: [],
          words: [
            {
              id: `w_empty_${Date.now()}`,
              type: 'word',
              text: 'Nueva frase...',
              chord: null,
            },
          ],
          suffixChords: [],
        });
      }
    }

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast('Línea eliminada');
  };

  // Helper to insert text at cursor in Text Mode
  const insertAtTextCursor = (textToInsert) => {
    const textarea = textEditorRef.current;
    if (!textarea) {
      updateContentWithHistory((draftContent || '') + textToInsert);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = draftContent || '';
    const updated = current.substring(0, start) + textToInsert + current.substring(end);
    updateContentWithHistory(updated);

    setTimeout(() => {
      if (textEditorRef.current) {
        textEditorRef.current.focus();
        const newPos = start + textToInsert.length;
        textEditorRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Inline Word Text Update (Double-click edit)
  const handleUpdateWordText = (secIdx, lineIdx, wordId, newText) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line) return;
    const word = line.words.find((w) => w.id === wordId);
    if (word) {
      word.text = newText;
    }
    const newContent = reconstructTextFromBlocks(updated);
    updateContentWithHistory(newContent);
    showToast('Palabra actualizada');
  };

  // Drag over word slot handler
  const handleDragOverWord = (e, wordId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (activeDropWordId !== wordId) {
      setActiveDropWordId(wordId);
    }
  };

  const handleDragLeaveWord = (e) => {
    e.preventDefault();
    setActiveDropWordId(null);
  };

  // Drop chord onto word
  const handleDropOnWord = (e, secIdx, lineIdx, wordId) => {
    e.preventDefault();
    setActiveDropWordId(null);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.chord) {
          handleAssignChordToWord(secIdx, lineIdx, wordId, data.chord, data);
          return;
        }
      }
      const rawText = e.dataTransfer.getData('text/plain');
      if (rawText) {
        handleAssignChordToWord(secIdx, lineIdx, wordId, rawText.replace(/[\[\]]/g, '').trim());
      }
    } catch (err) {
      console.warn('Drop error:', err);
    }
  };

  // Smart section namer based on lyric similarity or sequential numbering
  const suggestSmartSectionName = (sections, secIdx, linesForNewSec) => {
    const allText = (linesForNewSec || [])
      .map((l) => (l.words || []).map((w) => w.text).join(''))
      .join(' ')
      .toLowerCase();

    const isChorusLike =
      allText.includes('estribillo') ||
      allText.includes('coro') ||
      sections.some(
        (s) =>
          s.name.toLowerCase().includes('estribillo') &&
          s.lines?.some((sl) => {
            const slText = (sl.words || []).map((w) => w.text).join('').toLowerCase();
            return slText.length > 8 && allText.includes(slText.slice(0, 15));
          })
      );

    if (isChorusLike) {
      const chorusCount = sections.filter((s) => s.name.toLowerCase().includes('estribillo')).length;
      return chorusCount === 0 ? 'Estribillo' : `Estribillo ${chorusCount + 1}`;
    }

    const estrofaCount = sections.filter((s) => s.name.toLowerCase().includes('estrofa')).length;
    return estrofaCount === 0 ? 'Estrofa 2' : `Estrofa ${estrofaCount + 1}`;
  };

  // Synchronize section names and @ timestamps with BeatGrid measures
  const syncCompasesWithVisualSections = (updatedSections) => {
    if (!onSaveCompases || !Array.isArray(compases) || compases.length === 0) return;

    const timingLookup = new Map();
    visualSections.forEach((sec, sIdx) => {
      (sec.lines || []).forEach((line, lIdx) => {
        const lt = lineTimingsMap?.[sIdx]?.[lIdx];
        if (line?.id && lt) {
          timingLookup.set(line.id, lt);
        }
      });
    });

    const nextCompases = compases.map((c) => ({ ...c }));

    updatedSections.forEach((sec) => {
      let firstTiming = null;
      let minCompIdx = Infinity;
      let maxCompIdx = -1;

      (sec.lines || []).forEach((line) => {
        const lt = timingLookup.get(line.id);
        if (lt) {
          if (!firstTiming && lt.startTime != null) {
            firstTiming = lt;
          }
          if (lt.startCompasIdx >= 0 && lt.startCompasIdx < minCompIdx) {
            minCompIdx = lt.startCompasIdx;
          }
          if (lt.endCompasIdx >= 0 && lt.endCompasIdx > maxCompIdx) {
            maxCompIdx = lt.endCompasIdx;
          }
        }
      });

      if (firstTiming && firstTiming.startTime != null) {
        if (!sec.time || sec.time === 'null') {
          sec.time = Number(firstTiming.startTime).toFixed(1);
        }
      }

      if (minCompIdx <= maxCompIdx && minCompIdx < nextCompases.length) {
        for (let m = minCompIdx; m <= maxCompIdx && m < nextCompases.length; m++) {
          nextCompases[m].seccion = sec.name;
          if (m === minCompIdx && sec.time) {
            nextCompases[m].secTime = Number(sec.time);
          }
        }
      }
    });

    onSaveCompases(nextCompases);
  };

  // Move boundary UP: contract current section by moving its last verse to next section
  const handleMoveBoundaryUp = (secIdx) => {
    if (secIdx >= visualSections.length - 1) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    const nextSec = updated[secIdx + 1];
    if (!currentSec || !nextSec || currentSec.lines.length === 0) return;

    const [movedLine] = currentSec.lines.splice(currentSec.lines.length - 1, 1);
    if (!movedLine) return;

    nextSec.lines.unshift(movedLine);
    nextSec.time = null; // Re-align timestamp with new opening line

    if (currentSec.lines.length === 0) {
      updated.splice(secIdx, 1);
    }

    syncCompasesWithVisualSections(updated);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast(`Límite subido: verso cedido a [${nextSec.name}]`);
  };

  // Move boundary DOWN: expand current section by absorbing first verse of next section
  const handleMoveBoundaryDown = (secIdx) => {
    if (secIdx >= visualSections.length - 1) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    const nextSec = updated[secIdx + 1];
    if (!currentSec || !nextSec || nextSec.lines.length === 0) return;

    const [movedLine] = nextSec.lines.splice(0, 1);
    if (!movedLine) return;

    currentSec.lines.push(movedLine);
    nextSec.time = null; // Re-align timestamp with new opening line

    if (nextSec.lines.length === 0) {
      updated.splice(secIdx + 1, 1);
    }

    syncCompasesWithVisualSections(updated);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast(`Límite bajado: verso añadido a [${currentSec.name}]`);
  };

  // Move individual line UP
  const handleMoveLineUp = (secIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    if (!currentSec) return;

    if (lineIdx > 0) {
      const temp = currentSec.lines[lineIdx];
      currentSec.lines[lineIdx] = currentSec.lines[lineIdx - 1];
      currentSec.lines[lineIdx - 1] = temp;
      updateContentWithHistory(reconstructTextFromBlocks(updated));
      showToast('Verso movido hacia arriba');
    } else if (secIdx > 0) {
      const prevSec = updated[secIdx - 1];
      const [movedLine] = currentSec.lines.splice(lineIdx, 1);
      prevSec.lines.push(movedLine);
      if (currentSec.lines.length === 0) {
        updated.splice(secIdx, 1);
      }
      syncCompasesWithVisualSections(updated);
      updateContentWithHistory(reconstructTextFromBlocks(updated));
      showToast(`Verso movido a [${prevSec.name}]`);
    }
  };

  // Move individual line DOWN
  const handleMoveLineDown = (secIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    if (!currentSec) return;

    if (lineIdx < currentSec.lines.length - 1) {
      const temp = currentSec.lines[lineIdx];
      currentSec.lines[lineIdx] = currentSec.lines[lineIdx + 1];
      currentSec.lines[lineIdx + 1] = temp;
      updateContentWithHistory(reconstructTextFromBlocks(updated));
      showToast('Verso movido hacia abajo');
    } else if (secIdx < updated.length - 1) {
      const nextSec = updated[secIdx + 1];
      const [movedLine] = currentSec.lines.splice(lineIdx, 1);
      nextSec.lines.unshift(movedLine);
      if (currentSec.lines.length === 0) {
        updated.splice(secIdx, 1);
      }
      syncCompasesWithVisualSections(updated);
      updateContentWithHistory(reconstructTextFromBlocks(updated));
      showToast(`Verso movido a [${nextSec.name}]`);
    }
  };

  // Split section at line
  const handleSplitSectionAtLine = (secIdx, lineIdx, requestedName = null) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec || lineIdx <= 0 || lineIdx >= sec.lines.length) return;

    const linesForNewSec = sec.lines.splice(lineIdx);
    const newSectionName = requestedName || suggestSmartSectionName(updated, secIdx, linesForNewSec);

    if (sec.name.trim() === 'Estrofa') {
      sec.name = 'Estrofa 1';
    }

    const splitLineTiming = lineTimingsMap?.[secIdx]?.[lineIdx];
    const initialTime = splitLineTiming?.startTime != null ? Number(splitLineTiming.startTime).toFixed(1) : null;

    const newSec = {
      id: `sec_${Date.now()}_split`,
      name: newSectionName,
      time: initialTime,
      lines: linesForNewSec,
    };

    updated.splice(secIdx + 1, 0, newSec);
    syncCompasesWithVisualSections(updated);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast(`Nueva sección [${newSectionName}] creada`);
  };

  // Rename section
  const handleRenameSection = (secIdx, newName) => {
    if (!newName || !newName.trim()) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    if (updated[secIdx]) {
      updated[secIdx].name = newName.trim();
      syncCompasesWithVisualSections(updated);
      updateContentWithHistory(reconstructTextFromBlocks(updated));
      showToast(`Sección renombrada a [${newName.trim()}]`);
    }
    setEditingSectionPopover(null);
  };

  // 📋 Duplicate Entire Section
  const handleDuplicateSection = (secIdx) => {
    const currentSec = visualSections[secIdx];
    if (!currentSec) return;

    const updated = JSON.parse(JSON.stringify(visualSections));
    const duplicatedLines = currentSec.lines.map((line) => ({
      id: `line_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      prefixChords: line.prefixChords
        ? line.prefixChords.map((p) => ({
            id: `p_dup_${Math.random().toString(36).substring(2, 8)}`,
            chord: p.chord,
          }))
        : [],
      words: line.words
        ? line.words.map((w) => ({
            ...w,
            id: w.id ? `w_dup_${Math.random().toString(36).substring(2, 8)}` : undefined,
          }))
        : [],
      suffixChords: line.suffixChords
        ? line.suffixChords.map((s) => ({
            id: `s_dup_${Math.random().toString(36).substring(2, 8)}`,
            chord: s.chord,
          }))
        : [],
    }));

    const newSec = {
      id: `sec_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${currentSec.name} (Copia)`,
      time: null,
      lines: duplicatedLines,
    };

    updated.splice(secIdx + 1, 0, newSec);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    setEditingSectionPopover(null);
    showToast(`Sección [${currentSec.name}] duplicada`);
  };

  // Move entire section UP
  const handleMoveSectionUp = (secIdx) => {
    if (secIdx <= 0) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    const temp = updated[secIdx];
    updated[secIdx] = updated[secIdx - 1];
    updated[secIdx - 1] = temp;

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    setEditingSectionPopover(null);
    showToast(`Sección [${temp.name}] subida`);
  };

  // Move entire section DOWN
  const handleMoveSectionDown = (secIdx) => {
    if (secIdx >= visualSections.length - 1) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    const temp = updated[secIdx];
    updated[secIdx] = updated[secIdx + 1];
    updated[secIdx + 1] = temp;

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    setEditingSectionPopover(null);
    showToast(`Sección [${temp.name}] bajada`);
  };

  // 📌 Set Section Timestamp
  const handleSetSectionTimestamp = (secIdx, timeString) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    if (updated[secIdx]) {
      updated[secIdx].time = timeString ? String(timeString).trim() : null;
      updateContentWithHistory(reconstructTextFromBlocks(updated));
      showToast(timeString ? `Timestamp @ ${timeString}s asignado` : 'Timestamp removido');
    }
  };

  // Merge section with previous
  const handleMergeWithPrevSection = (secIdx) => {
    if (secIdx <= 0) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    const prevSec = updated[secIdx - 1];
    const currentSec = updated[secIdx];
    if (!prevSec || !currentSec) return;

    prevSec.lines.push(...currentSec.lines);
    updated.splice(secIdx, 1);

    syncCompasesWithVisualSections(updated);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    setEditingSectionPopover(null);
    showToast(`Sección unida a [${prevSec.name}]`);
  };

  // Add new section (Vocal or Instrumental)
  const handleAddSection = (
    sectionName = 'Estrofa',
    atIndex = visualSections.length,
    options = {}
  ) => {
    if (!sectionName || !sectionName.trim()) return;
    const name = sectionName.trim();
    const updated = JSON.parse(JSON.stringify(visualSections));

    let initialLines = [];
    if (options.isInstrumental) {
      initialLines = [
        {
          id: `line_inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          prefixChords: [
            { id: `p_${Math.random().toString(36).substring(2, 8)}`, chord: '𝄾' },
            { id: `p_${Math.random().toString(36).substring(2, 8)}`, chord: '𝄾' },
            { id: `p_${Math.random().toString(36).substring(2, 8)}`, chord: '𝄾' },
            { id: `p_${Math.random().toString(36).substring(2, 8)}`, chord: '𝄾' },
          ],
          words: [],
          suffixChords: [],
        },
      ];
    } else {
      initialLines = [
        {
          id: `line_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          prefixChords: [],
          words: [
            {
              id: `w_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'word',
              text: 'Nueva frase...',
              chord: null,
            },
          ],
          suffixChords: [],
        },
      ];
    }

    const newSec = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      time: null,
      lines: initialLines,
    };

    if (atIndex <= 0) {
      updated.unshift(newSec);
    } else if (atIndex >= updated.length) {
      updated.push(newSec);
    } else {
      updated.splice(atIndex, 0, newSec);
    }

    updateContentWithHistory(reconstructTextFromBlocks(updated));
    setAddSectionPopover(null);
    showToast(`Sección [${name}] añadida`);
    if (onSelectSection) onSelectSection(name);
  };

  // Delete section
  const handleDeleteSection = (secIdx) => {
    const updated = visualSections.filter((_, idx) => idx !== secIdx);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    setEditingSectionPopover(null);
    showToast('Sección eliminada');
  };

  return (
    <div
      className={`flex-1 min-w-0 flex flex-col justify-between bg-[#fcf9f2] rounded-2xl md:rounded-r-none md:rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border border-stone-300 md:border-r-0 overflow-hidden paper-texture p-4 sm:p-6 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] max-h-[580px] xl:max-h-[640px] 2xl:max-h-[700px] relative z-10 ${className}`}
    >
      {/* Top Margin Paper Stripe */}
      <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-stone-900/90 text-amber-200 px-3 py-1.5 rounded-xl shadow-lg text-xs font-sans font-bold border border-amber-500/40 pointer-events-none animate-fade-in">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 space-y-2.5 overflow-hidden">
        {/* Editor Top Control Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-200 flex-wrap gap-2 flex-shrink-0">
          <EditorToolbar
            editorViewMode={editorViewMode}
            onChangeEditorViewMode={setEditorViewMode}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            canUndo={historyPast.length > 0}
            canRedo={historyFuture.length > 0}
            isExplicitInstrumental={isExplicitInstrumental}
            onOpenSyncWizard={() => setIsSyncWizardOpen(true)}
            hasOriginal={hasOriginal}
            onRestoreOriginal={onRestoreOriginal}
            onCancel={onCancel}
          />
        </div>

        {/* 🧲 Quick Chord Stamp Bar (in Visual Mode, activates stamp; in Text Mode, inserts chord at cursor) */}
        <ChordStampBar
          uniqueChords={uniqueChords}
          isInstrumental={isInstrumental && editorViewMode === 'visual'}
          activeStampChord={editorViewMode === 'visual' ? activeStampChord : null}
          setActiveStampChord={(ch) => {
            if (editorViewMode === 'text') {
              if (ch) {
                insertAtTextCursor(`[${ch}]`);
                showToast(`Insertado [${ch}]`);
              }
            } else {
              setActiveStampChord(ch);
            }
          }}
          onSelectChord={onSelectChord}
        />

        {/* MODO TEXTO: Direct ChordPro / Tag Textarea */}
        {editorViewMode === 'text' ? (
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            {/* Quick Insert Bar for Sections & Rests in Text Mode */}
            <div className="flex items-center justify-between gap-2 flex-wrap bg-stone-100/90 px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs font-sans flex-shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTextSectionMenuOpen(!isTextSectionMenuOpen);
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-amber-50 text-stone-700 rounded-md border border-stone-300 font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Tag className="w-3 h-3 text-amber-700" />
                    <span>+ Sección</span>
                    <ChevronDown className="w-3 h-3 text-stone-400" />
                  </button>

                  {isTextSectionMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 bg-white border border-stone-300 rounded-xl shadow-xl p-1.5 z-50 w-40 max-h-44 overflow-y-auto space-y-0.5 paper-texture"
                    >
                      {SECTION_TYPES.map((secName) => (
                        <button
                          key={secName}
                          type="button"
                          onClick={() => {
                            insertAtTextCursor(`\n[${secName}]\n`);
                            setIsTextSectionMenuOpen(false);
                            showToast(`Sección [${secName}] insertada`);
                          }}
                          className="w-full text-left px-2 py-1 rounded-md text-xs hover:bg-amber-100 hover:text-amber-950 transition-colors font-serif font-medium text-stone-800 cursor-pointer"
                        >
                          [{secName}]
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    insertAtTextCursor('[𝄾 2T]');
                    showToast('Silencio 𝄾 2T insertado');
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-amber-50 text-stone-700 rounded-md border border-stone-300 font-mono text-xs cursor-pointer shadow-2xs"
                  title="Insertar silencio de 2 tiempos"
                >
                  𝄾 2T
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertAtTextCursor('[𝄾 4T]');
                    showToast('Silencio 𝄾 4T insertado');
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-amber-50 text-stone-700 rounded-md border border-stone-300 font-mono text-xs cursor-pointer shadow-2xs"
                  title="Insertar silencio de 4 tiempos"
                >
                  𝄾 4T
                </button>
              </div>

              <span className="text-[11px] text-stone-500 hidden sm:inline">
                Haz clic en un acorde arriba para insertarlo en el cursor
              </span>
            </div>

            <textarea
              ref={textEditorRef}
              value={draftContent}
              onChange={(e) => updateContentWithHistory(e.target.value)}
              placeholder="Escribe la letra con secciones y acordes entre corchetes, ej:&#10;[Intro]&#10;[Am] [G] [F] [E7]&#10;&#10;[Estrofa 1]&#10;[Am]Escribe la letra [G]aquí..."
              className="w-full flex-1 p-3.5 bg-white/80 border border-stone-300 rounded-xl font-mono text-xs sm:text-sm text-stone-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 paper-texture shadow-inner overflow-y-auto"
              spellCheck={false}
            />
          </div>
        ) : isInstrumental ? (
          /* Instrumental Banner & Add Lyrics Prompt */
          <div className="p-6 bg-amber-50/80 rounded-2xl border-2 border-dashed border-amber-300 text-center space-y-3 shadow-inner my-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center shadow-sm">
              <Music2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-serif font-bold text-stone-900">
                Canción Instrumental / Sin Letra Asignada
              </h4>
              <p className="text-xs font-sans text-stone-600 max-w-sm mx-auto">
                Esta canción contiene compases rítmicos en el BeatGrid. Puedes tocarla instrumentalmente o añadirle la letra para sincronizar y acoplar los acordes.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setIsSyncWizardOpen(true)}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold font-sans shadow transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>➕ Añadir Letra a esta Canción</span>
              </button>

              <button
                type="button"
                onClick={handleMarkAsInstrumental}
                className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold font-sans shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                title="Estructurar y editar esta canción como una obra completamente instrumental"
              >
                <Music2 className="w-4 h-4 text-amber-700" />
                <span>Completamente instrumental</span>
              </button>
            </div>
          </div>
        ) : (
          /* Visual Lyrics Canvas Matching Viewer's 90° Rotated Gutter */
          <div ref={canvasScrollRef} className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 min-h-0">
            {/* Add Section at Top */}
            <div className="relative flex items-center justify-center pt-0.5 pb-0.5 select-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddSectionPopover(
                    addSectionPopover?.id === 'top' ? null : { atIndex: 0, id: 'top' }
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400 text-stone-600 hover:text-amber-900 text-xs font-sans font-semibold transition-all shadow-2xs cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Añadir sección al inicio</span>
              </button>

              {addSectionPopover?.id === 'top' && (
                <AddSectionPopover
                  atIndex={0}
                  onAddSection={handleAddSection}
                  onClose={() => setAddSectionPopover(null)}
                  positionClasses="top-8 left-1/2 -translate-x-1/2"
                />
              )}
            </div>

            {visualSections.map((sec, secIdx) => {
              const hasNextSection = secIdx < visualSections.length - 1;
              const nextSec = hasNextSection ? visualSections[secIdx + 1] : null;
              const timing = sectionTimingMap[secIdx] || {};
              const isSectionSynced = Boolean(sec.time || timing.startTime !== null);
              const isSectionActive =
                ((isPlaybackActive || currentBeatIndex >= 0) && secIdx === activeSectionIdx) ||
                Boolean(
                  activeSectionName &&
                    activeSectionIdx === -1 &&
                    sec.name.toLowerCase() === activeSectionName.toLowerCase()
                );

              return (
                <div
                  key={sec.id}
                  className={`relative group/section my-1 transition-all ${
                    isSectionActive ? 'bg-amber-100/30 rounded-xl' : ''
                  }`}
                >
                  <div className="flex items-stretch gap-3">
                    {/* 90° Rotated Section Header in Left Gutter with Duplicate / Reorder / Live Sync */}
                    <SectionGutterHeader
                      secIdx={secIdx}
                      totalSections={visualSections.length}
                      sec={sec}
                      isOpen={editingSectionPopover === sec.id}
                      onToggle={() =>
                        setEditingSectionPopover(
                          editingSectionPopover === sec.id ? null : sec.id
                        )
                      }
                      onClose={() => setEditingSectionPopover(null)}
                      onRenameSection={handleRenameSection}
                      onDuplicateSection={handleDuplicateSection}
                      onMoveSectionUp={handleMoveSectionUp}
                      onMoveSectionDown={handleMoveSectionDown}
                      onSetSectionTimestamp={handleSetSectionTimestamp}
                      currentPlaybackTime={currentPlaybackTime}
                      onMergeWithPrevSection={handleMergeWithPrevSection}
                      onDeleteSection={handleDeleteSection}
                      isSectionActive={isSectionActive}
                      onSelectSection={onSelectSection}
                    />

                    {/* Section Verse Lines & Chord Drop Slots */}
                    <div className="flex-1 min-w-0 space-y-1 py-0.5">
                      {sec.lines.map((line, lineIdx) => {
                        const isEmpty =
                          (!line.words || line.words.length === 0) &&
                          (!line.prefixChords || line.prefixChords.length === 0) &&
                          (!line.suffixChords || line.suffixChords.length === 0);

                        if (isEmpty) {
                          return (
                            <div
                              key={line.id}
                              className="h-3 flex items-center group/line relative"
                            >
                              <div className="w-full border-b border-dashed border-stone-200/50" />
                            </div>
                          );
                        }

                        const lineKey = `${secIdx}_${lineIdx}`;
                        const isLineHighlighted = highlightedLineKey === lineKey;
                        const isLineActive =
                          (isPlaybackActive || currentBeatIndex >= 0) &&
                          secIdx === activeSectionIdx &&
                          lineIdx === activeLineIdx;
                        const isChordLineActive =
                          (isPlaybackActive || currentBeatIndex >= 0) &&
                          secIdx === effChordSecIdx &&
                          lineIdx === effChordLineIdx;

                        // Compute 0-based musical chord ranks across prefixChords, words, and suffixChords
                        let runningChordRank = 0;
                        const isMusicalChord = (ch) =>
                          Boolean(ch && !IGNORED_CHORD_REGEX.test(ch) && MUSICAL_CHORD_REGEX.test(ch));

                        const prefixChordRanks = (line.prefixChords || []).map((p) =>
                          isMusicalChord(p.chord) ? runningChordRank++ : -1
                        );
                        const wordChordRanks = (line.words || []).map((w) =>
                          w.type !== 'space' && isMusicalChord(w.chord) ? runningChordRank++ : -1
                        );
                        const suffixChordRanks = (line.suffixChords || []).map((s) =>
                          isMusicalChord(s.chord) ? runningChordRank++ : -1
                        );
                        const totalChordsInLine = runningChordRank;

                        // Resolve active chord rank in this line
                        let activeRankInLine = -1;
                        if (isChordLineActive && totalChordsInLine > 0) {
                          if (activeChordRank >= 0 && activeChordRank < totalChordsInLine) {
                            activeRankInLine = activeChordRank;
                          }
                          if (activeRankInLine === -1 && isLineActive && currentPlaybackTime !== null) {
                            const lineTiming = lineTimingsMap?.[secIdx]?.[lineIdx];
                            if (
                              lineTiming?.chordTimings &&
                              lineTiming.chordTimings.length === totalChordsInLine &&
                              !lineTiming.startsWithUnchordedPhrase
                            ) {
                              for (let cIdx = 0; cIdx < lineTiming.chordTimings.length; cIdx++) {
                                const ct = lineTiming.chordTimings[cIdx];
                                const isLastChord = cIdx === lineTiming.chordTimings.length - 1;
                                if (
                                  currentPlaybackTime >= ct.startTime &&
                                  (currentPlaybackTime < ct.endTime ||
                                    (isLastChord && currentPlaybackTime < lineTiming.endTime))
                                ) {
                                  activeRankInLine = cIdx;
                                  break;
                                }
                              }
                            }
                          }
                          const lineTiming = lineTimingsMap?.[secIdx]?.[lineIdx];
                          if (
                            activeRankInLine === -1 &&
                            !lineTimingsMap &&
                            isLineActive &&
                            !lineTiming?.startsWithUnchordedPhrase
                          ) {
                            activeRankInLine = Math.min(
                              totalChordsInLine - 1,
                              Math.max(0, Math.floor(lineProgress * totalChordsInLine))
                            );
                          }
                        }

                        const totalTokensInLine =
                          (line.prefixChords?.length || 0) +
                          (line.words?.length || 0) +
                          (line.suffixChords?.length || 0);

                        return (
                          <div
                            key={line.id}
                            ref={isLineActive ? activeLineRef : null}
                            onMouseEnter={() => setHighlightedLineKey(lineKey)}
                            onMouseLeave={() => setHighlightedLineKey(null)}
                            className={`flex flex-wrap items-end my-1 leading-none group/line relative rounded-lg transition-all duration-200 ${
                              isLineActive
                                ? 'bg-amber-100/80 -mx-2 px-2 py-1 border-l-2 border-amber-600 shadow-xs'
                                : isLineHighlighted
                                ? 'bg-amber-100/50 py-0.5'
                                : 'hover:bg-amber-50/40 py-0.5'
                            }`}
                          >
                            {/* 1. Pickup / Prefix Chords Slot (ANTES de la frase) */}
                            <LinePrefixChords
                              secIdx={secIdx}
                              lineIdx={lineIdx}
                              prefixChords={line.prefixChords || []}
                              prefixChordRanks={prefixChordRanks}
                              activeChordRank={activeRankInLine}
                              isChordLineActive={isChordLineActive}
                              activeStampChord={activeStampChord}
                              onAddPrefixChord={handleAddPrefixChord}
                              onRemovePrefixChord={handleRemovePrefixChord}
                              onNudgeChord={handleNudgeChord}
                              onOpenPicker={setSelectedWordForPicker}
                              onAssignChord={handleAssignChordToWord}
                              onNavigateChord={(chordName, chordRank, pIdx) =>
                                handleNavigateToChord(
                                  sec,
                                  secIdx,
                                  lineIdx,
                                  chordName,
                                  chordRank,
                                  pIdx,
                                  totalTokensInLine
                                )
                              }
                              isSectionSynced={isSectionSynced}
                            />

                            {/* 2. Middle Words with Upper Chord Drop Slots and Syllable Splitter */}
                            {line.words && line.words.length > 0 ? (
                              line.words.map((item, wIdx) => {
                                const wChordRank = wordChordRanks[wIdx] ?? -1;
                                const isChordActive =
                                  isChordLineActive && wChordRank >= 0 && wChordRank === activeRankInLine;

                                return (
                                  <WordChordDropSlot
                                    key={item.id || Math.random()}
                                    item={item}
                                    secIdx={secIdx}
                                    lineIdx={lineIdx}
                                    wordIdx={wIdx}
                                    totalWords={line.words.length}
                                    activeDropWordId={activeDropWordId}
                                    activeStampChord={activeStampChord}
                                    onDragOver={handleDragOverWord}
                                    onDragLeave={handleDragLeaveWord}
                                    onDrop={handleDropOnWord}
                                    onAssignChord={handleAssignChordToWord}
                                    onNudgeChord={handleNudgeChord}
                                    onOpenPicker={setSelectedWordForPicker}
                                    onUpdateWordText={handleUpdateWordText}
                                    onSplitWord={handleSplitWord}
                                    onMergeWords={handleMergeWords}
                                    isSectionSynced={isSectionSynced}
                                    isLineActive={isLineActive}
                                    isChordActive={isChordActive}
                                    onNavigateChord={(chordName) =>
                                      handleNavigateToChord(
                                        sec,
                                        secIdx,
                                        lineIdx,
                                        chordName,
                                        wChordRank,
                                        (line.prefixChords?.length || 0) + wIdx,
                                        totalTokensInLine
                                      )
                                    }
                                  />
                                );
                              })
                            ) : (
                              <span className="font-mono text-xs text-amber-900/60 italic select-none py-1">
                                [Compás Instrumental]
                              </span>
                            )}

                            {/* 3. Outro / Suffix Chords Slot (DESPUÉS de la frase) */}
                            <LineSuffixChords
                              secIdx={secIdx}
                              lineIdx={lineIdx}
                              suffixChords={line.suffixChords || []}
                              suffixChordRanks={suffixChordRanks}
                              activeChordRank={activeRankInLine}
                              isChordLineActive={isChordLineActive}
                              activeStampChord={activeStampChord}
                              onAddSuffixChord={handleAddSuffixChord}
                              onRemoveSuffixChord={handleRemoveSuffixChord}
                              onNudgeChord={handleNudgeChord}
                              onOpenPicker={setSelectedWordForPicker}
                              onNavigateChord={(chordName, chordRank, sIdx) =>
                                handleNavigateToChord(
                                  sec,
                                  secIdx,
                                  lineIdx,
                                  chordName,
                                  chordRank,
                                  (line.prefixChords?.length || 0) + (line.words?.length || 0) + sIdx,
                                  totalTokensInLine
                                )
                              }
                              isSectionSynced={isSectionSynced}
                            />

                            {/* Quick Line Actions on Right Gutter */}
                            <div className="opacity-0 group-hover/line:opacity-100 transition-opacity flex items-center gap-0.5 pl-2 select-none flex-shrink-0 ml-auto">
                              <button
                                type="button"
                                onClick={() => handleAddLyricLine(secIdx, lineIdx)}
                                className="p-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                title="Añadir verso debajo"
                              >
                                <Plus className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAddInstrumentalLine(secIdx, lineIdx)}
                                className="p-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                title="Insertar compás instrumental aquí"
                              >
                                <Music2 className="w-3 h-3" />
                              </button>

                              {(lineIdx > 0 || secIdx > 0) && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLineUp(secIdx, lineIdx)}
                                  className="p-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                  title={
                                    lineIdx === 0
                                      ? `Pasar este verso a [${visualSections[secIdx - 1]?.name}]`
                                      : 'Subir este verso'
                                  }
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                              )}

                              {(lineIdx < sec.lines.length - 1 || hasNextSection) && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLineDown(secIdx, lineIdx)}
                                  className="p-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                  title={
                                    lineIdx === sec.lines.length - 1
                                      ? `Pasar este verso a [${nextSec?.name}]`
                                      : 'Bajar este verso'
                                  }
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              )}

                              {lineIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSplitSectionAtLine(secIdx, lineIdx)
                                  }
                                  className="p-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                  title="Dividir en una nueva sección a partir de aquí"
                                >
                                  <Scissors className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteLine(secIdx, lineIdx)}
                                className="p-0.5 rounded bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Eliminar esta línea"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Section Boundary Divider Bar */}
                  {hasNextSection && (
                    <SectionBoundaryDivider
                      secIdx={secIdx}
                      sec={sec}
                      nextSec={nextSec}
                      onMoveBoundaryUp={handleMoveBoundaryUp}
                      onMoveBoundaryDown={handleMoveBoundaryDown}
                      addSectionPopover={addSectionPopover}
                      setAddSectionPopover={setAddSectionPopover}
                      onAddSection={handleAddSection}
                    />
                  )}
                </div>
              );
            })}

            {/* Quick Add Section at End (Simplified to a single button) */}
            <div className="relative pt-2 pl-11 pb-2 flex items-center select-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddSectionPopover(
                    addSectionPopover?.id === 'bottom'
                      ? null
                      : { atIndex: visualSections.length, id: 'bottom' }
                  );
                }}
                className="px-3.5 py-1.5 bg-amber-100/90 hover:bg-amber-200/90 border border-amber-300 rounded-xl text-xs font-sans font-bold text-amber-950 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-amber-800" />
                <span>+ Añadir Sección</span>
              </button>

              {addSectionPopover?.id === 'bottom' && (
                <AddSectionPopover
                  atIndex={visualSections.length}
                  onAddSection={handleAddSection}
                  onClose={() => setAddSectionPopover(null)}
                  positionClasses="bottom-11 left-11"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-3 mt-2 border-t border-stone-200 flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
        <div className="text-[11px] font-sans text-stone-500 flex items-center gap-2 flex-wrap">
          <span>
            {editorViewMode === 'text' ? (
              <>
                💡 Edita directamente el texto con etiquetas <span className="font-mono font-bold text-amber-900">[Sección]</span> y <span className="font-mono font-bold text-amber-900">[Acorde]</span>.
              </>
            ) : (
              <>
                💡 <span className="font-semibold">Arrastra o estampa acordes</span>, doble clic para editar palabra, o <span className="font-semibold">✂️</span> para sílabas.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold font-sans transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold font-sans shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Arreglo'}</span>
          </button>
        </div>
      </div>

      {/* Quick Chord Picker Modal */}
      {selectedWordForPicker && (
        <QuickChordPickerModal
          selectedWord={selectedWordForPicker}
          uniqueChords={uniqueChords}
          onAssignChord={handleAssignChordToWord}
          onAddPrefixChord={handleAddPrefixChord}
          onAddSuffixChord={handleAddSuffixChord}
          onClose={() => setSelectedWordForPicker(null)}
        />
      )}

      {/* Stepped Sync Wizard Modal (Etapa 1: Pegar/Montar Letra -> Etapa 2: Sincronizar con Audio) */}
      <SteppedSyncWizardModal
        isOpen={isSyncWizardOpen}
        onClose={() => setIsSyncWizardOpen(false)}
        initialContent={draftContent}
        uniqueChords={uniqueChords}
        youtubeId={youtubeId}
        currentTime={currentPlaybackTime || 0}
        playerInstance={playerInstance}
        currentBpm={currentBpm}
        compases={compases}
        onComplete={({ draftContent: generatedText, compases: generatedCompases }) => {
          updateContentWithHistory(generatedText);
          setIsExplicitInstrumental(false);
          if (onMarkAsInstrumental) {
            onMarkAsInstrumental(generatedText, false);
          }
          if (onSaveCompases && Array.isArray(generatedCompases) && generatedCompases.length > 0) {
            onSaveCompases(generatedCompases);
          }
          showToast('Letra y acordes montados en el Editor Visual.');
        }}
      />
    </div>
  );
}
