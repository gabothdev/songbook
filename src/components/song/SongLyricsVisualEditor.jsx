import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  RotateCcw,
  Save,
  X,
  Plus,
  Music2,
  FileText,
  Zap,
  ArrowUp,
  ArrowDown,
  Scissors,
  Undo2,
  Redo2,
  MousePointerClick,
  Stamp,
  Layers,
} from 'lucide-react';
import { normalizeChordName } from '../../utils/music';
import {
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
import QuickChordPickerModal from './editor/QuickChordPickerModal';
import AddLyricsModal from './editor/AddLyricsModal';

/**
 * SongLyricsVisualEditor Component
 * Master interactive lyrics & chords arranger matching the 90° gutter notebook theme.
 * Features:
 * - Visual chord drag-and-drop & Quick Chord Stamp tool
 * - Pickup (prefix) and Outro (suffix) chord slots before and after phrases
 * - Fine syllable-level chord alignment (✂️ word split into sub-syllables)
 * - Instrumental sections and fast measures insertion with metric signatures (4/4, 2/4, 3/4, 6/8)
 * - Multi-level Undo / Redo (Ctrl+Z / Ctrl+Y)
 * - 1-Click Section Duplication & Section Reordering (Up/Down)
 * - Live Video Timestamp Sync (📌 Tap to Sync @ 45.2s)
 * - Inline Double-Click Word Text Editing
 * - Bidirectional synchronization with BeatGrid
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
  isSyncMode = true,
  onToggleSyncMode = null,
  currentPlaybackTime = null,
  activeSectionName = null,
  onSelectSection = null,
  onSelectChord = null,
  isInstrumental: initialIsInstrumental = false,
  onMarkAsInstrumental = null,
  currentBpm = 100,
  onScaleBpm = null,
  className = '',
}) {
  const [isExplicitInstrumental, setIsExplicitInstrumental] = useState(Boolean(initialIsInstrumental));

  const visualSections = useMemo(() => {
    return parseLyricsToVisualBlocks(draftContent);
  }, [draftContent]);

  // History Stacks for Undo / Redo
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  // Editor Interaction States
  const [activeDropWordId, setActiveDropWordId] = useState(null);
  const [activeStampChord, setActiveStampChord] = useState(null);
  const [isAddLyricsModalOpen, setIsAddLyricsModalOpen] = useState(false);
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
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleDismiss);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleDismiss);
    };
  }, [handleUndo, handleRedo]);

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

    if (currentSec.lines.length === 0) {
      updated.splice(secIdx, 1);
    }

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

    if (nextSec.lines.length === 0) {
      updated.splice(secIdx + 1, 1);
    }

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
      updateContentWithHistory(reconstructTextFromBlocks(updated));
      showToast(`Verso movido a [${nextSec.name}]`);
    }
  };

  // Split section at line
  const handleSplitSectionAtLine = (secIdx, lineIdx, newSectionName = 'Estrofa') => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec || lineIdx <= 0 || lineIdx >= sec.lines.length) return;

    const linesForNewSec = sec.lines.splice(lineIdx);
    const newSec = {
      id: `sec_${Date.now()}_split`,
      name: newSectionName,
      time: null,
      lines: linesForNewSec,
    };

    updated.splice(secIdx + 1, 0, newSec);
    updateContentWithHistory(reconstructTextFromBlocks(updated));
    showToast(`Nueva sección [${newSectionName}] creada`);
  };

  // Rename section
  const handleRenameSection = (secIdx, newName) => {
    if (!newName || !newName.trim()) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    if (updated[secIdx]) {
      updated[secIdx].name = newName.trim();
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
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 text-amber-950 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border border-amber-300 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
              <span>Diseñador Visual</span>
            </span>

            {/* Sync Mode Badge */}
            {onToggleSyncMode && (
              <button
                type="button"
                onClick={onToggleSyncMode}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-sans font-bold transition-colors cursor-pointer border ${
                  isSyncMode
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'
                }`}
                title="Alternar entre modo libre o sincronizado con marcas de tiempo"
              >
                <Zap
                  className={`w-3 h-3 ${
                    isSyncMode ? 'text-amber-700 fill-amber-500' : 'text-stone-400'
                  }`}
                />
                <span className="hidden sm:inline">
                  {isSyncMode ? 'Sincronizado' : 'Modo Libre'}
                </span>
              </button>
            )}

            {/* BPM Scaling Controls */}
            {onScaleBpm && (
              <div className="flex items-center bg-stone-100 border border-stone-300 rounded-lg p-0.5 text-xs font-mono shadow-2xs">
                <button
                  type="button"
                  onClick={() => onScaleBpm(0.5)}
                  className="px-1.5 py-0.5 hover:bg-stone-200 text-stone-700 font-bold rounded transition-colors cursor-pointer"
                  title="Dividir BPM a la mitad (÷2) y fusionar compases"
                >
                  ÷2
                </button>
                <span className="px-1.5 py-0.5 text-[11px] font-bold text-amber-950 font-sans border-x border-stone-200">
                  {currentBpm || 100} BPM
                </span>
                <button
                  type="button"
                  onClick={() => onScaleBpm(2)}
                  className="px-1.5 py-0.5 hover:bg-stone-200 text-stone-700 font-bold rounded transition-colors cursor-pointer"
                  title="Duplicar BPM (x2) y subdividir compases"
                >
                  x2
                </button>
              </div>
            )}

            {/* Undo / Redo Buttons */}
            <div className="flex items-center gap-0.5 bg-stone-100 border border-stone-300 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyPast.length === 0}
                className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent text-stone-700 cursor-pointer transition-colors"
                title="Deshacer (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyFuture.length === 0}
                className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent text-stone-700 cursor-pointer transition-colors"
                title="Rehacer (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExplicitInstrumental && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100/80 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-sans font-bold shadow-2xs">
                <Music2 className="w-3 h-3 text-amber-700" />
                <span className="hidden sm:inline">Instrumental</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsAddLyricsModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-sans font-bold text-amber-900 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors cursor-pointer"
              title="Añadir o pegar letra para esta canción"
            >
              <FileText className="w-3 h-3 text-amber-800" />
              <span className="hidden sm:inline">Añadir Letra</span>
            </button>

            {hasOriginal && (
              <button
                type="button"
                onClick={onRestoreOriginal}
                className="flex items-center gap-1 px-2 py-1 text-xs font-sans font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-colors cursor-pointer"
                title="Deshacer cambios y restaurar la letra original scrapeada"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Restaurar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
              title="Cerrar editor sin guardar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 🧲 Quick Chord Stamp Bar */}
        {uniqueChords.length > 0 && !isInstrumental && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs font-sans flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-amber-900 pr-1 select-none">
              <Stamp className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Modo Sello:</span>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {uniqueChords.map((ch) => {
                const isActive = activeStampChord === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      const next = isActive ? null : ch;
                      setActiveStampChord(next);
                      if (next && onSelectChord) onSelectChord(next);
                    }}
                    className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-700 text-white shadow-xs scale-105 ring-2 ring-amber-800'
                        : 'bg-white hover:bg-amber-100 text-amber-950 border border-amber-300'
                    }`}
                    title={
                      isActive
                        ? `Sello activo: [${ch}]. Haz clic en cualquier palabra, previo o final para estamparlo`
                        : `Activar sello [${ch}]`
                    }
                  >
                    [{ch}]
                  </button>
                );
              })}

              {activeStampChord && (
                <button
                  type="button"
                  onClick={() => setActiveStampChord(null)}
                  className="px-1.5 py-0.5 text-[10px] text-stone-500 hover:text-stone-800 underline cursor-pointer ml-1"
                >
                  Desactivar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Instrumental Banner & Add Lyrics Prompt */}
        {isInstrumental ? (
          <div className="p-6 bg-amber-50/80 rounded-2xl border-2 border-dashed border-amber-300 text-center space-y-3 shadow-inner my-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 mx-auto flex items-center justify-center shadow-sm">
              <Music2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-serif font-bold text-stone-900">
                Canción Instrumental / Sin Letra Asignada
              </h4>
              <p className="text-xs font-sans text-stone-600 max-w-sm mx-auto">
                Esta canción contiene compases rítmicos en el BeatGrid. Puedes tocarla instrumentalmente o añadirle la letra para acoplarle los acordes.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setIsAddLyricsModalOpen(true)}
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
          <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 min-h-0 max-h-[360px] xl:max-h-[420px] 2xl:max-h-[480px]">
            {/* Add Section at Top */}
            <div className="relative flex items-center justify-center pt-1 pb-1 select-none">
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
                  positionClasses="top-9 left-1/2 -translate-x-1/2"
                />
              )}
            </div>

            {visualSections.map((sec, secIdx) => {
              const hasNextSection = secIdx < visualSections.length - 1;
              const nextSec = hasNextSection ? visualSections[secIdx + 1] : null;
              const isSectionActive =
                activeSectionName &&
                sec.name.toLowerCase() === activeSectionName.toLowerCase();

              return (
                <div
                  key={sec.id}
                  className={`relative group/section my-2 transition-all ${
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

                        return (
                          <div
                            key={line.id}
                            onMouseEnter={() => setHighlightedLineKey(lineKey)}
                            onMouseLeave={() => setHighlightedLineKey(null)}
                            className={`flex flex-wrap items-end my-1 leading-none group/line relative py-0.5 rounded-lg transition-colors ${
                              isLineHighlighted
                                ? 'bg-amber-100/50'
                                : 'hover:bg-amber-50/40'
                            }`}
                          >
                            {/* 1. Pickup / Prefix Chords Slot (ANTES de la frase) */}
                            <LinePrefixChords
                              secIdx={secIdx}
                              lineIdx={lineIdx}
                              prefixChords={line.prefixChords || []}
                              activeStampChord={activeStampChord}
                              onAddPrefixChord={handleAddPrefixChord}
                              onRemovePrefixChord={handleRemovePrefixChord}
                              onOpenPicker={setSelectedWordForPicker}
                              onAssignChord={handleAssignChordToWord}
                              isSectionSynced={Boolean(sec.time)}
                            />

                            {/* 2. Middle Words with Upper Chord Drop Slots and Syllable Splitter */}
                            {line.words && line.words.length > 0 ? (
                              line.words.map((item, wIdx) => (
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
                                  onOpenPicker={setSelectedWordForPicker}
                                  onUpdateWordText={handleUpdateWordText}
                                  onSplitWord={handleSplitWord}
                                  onMergeWords={handleMergeWords}
                                  isSectionSynced={Boolean(sec.time)}
                                />
                              ))
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
                              activeStampChord={activeStampChord}
                              onAddSuffixChord={handleAddSuffixChord}
                              onRemoveSuffixChord={handleRemoveSuffixChord}
                              onOpenPicker={setSelectedWordForPicker}
                              isSectionSynced={Boolean(sec.time)}
                            />

                            {/* Quick Line Actions on Right Gutter */}
                            <div className="opacity-0 group-hover/line:opacity-100 transition-opacity flex items-center gap-0.5 pl-2 select-none flex-shrink-0 ml-auto">
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
                                    handleSplitSectionAtLine(secIdx, lineIdx, 'Estrofa')
                                  }
                                  className="p-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                  title="Dividir en una nueva sección a partir de aquí"
                                >
                                  <Scissors className="w-3 h-3" />
                                </button>
                              )}
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

            {/* Quick Add Section at End */}
            <div className="relative pt-3 pl-11 flex items-center gap-2 select-none flex-wrap">
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

              <button
                type="button"
                onClick={() => handleAddSection('Estrofa', visualSections.length)}
                className="px-2.5 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-xs font-sans font-semibold text-stone-700 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-amber-700" />
                <span>Estrofa</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddSection('Coro', visualSections.length)}
                className="px-2.5 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-xs font-sans font-semibold text-stone-700 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-amber-700" />
                <span>Coro</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddSection('Solo', visualSections.length, { isInstrumental: true })
                }
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-sans font-semibold text-amber-950 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Music2 className="w-3 h-3 text-amber-700" />
                <span>Solo (Inst.)</span>
              </button>

              {addSectionPopover?.id === 'bottom' && (
                <AddSectionPopover
                  atIndex={visualSections.length}
                  onAddSection={handleAddSection}
                  onClose={() => setAddSectionPopover(null)}
                  positionClasses="top-12 left-11"
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
            💡 <span className="font-semibold">Arrastra un acorde</span>, usa{' '}
            <span className="font-semibold text-amber-900">+ Previo / + Final</span> para acordes
            fuera de la frase, o <span className="font-semibold">✂️</span> para sílabas.
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

      {/* Add Lyrics Modal (For converting instrumental songs to lyric songs) */}
      <AddLyricsModal
        isOpen={isAddLyricsModalOpen}
        onClose={() => setIsAddLyricsModalOpen(false)}
        onSaveLyrics={(newLyrics) => {
          updateContentWithHistory(newLyrics);
          setIsExplicitInstrumental(false);
          if (onMarkAsInstrumental) {
            onMarkAsInstrumental(newLyrics, false);
          }
          setIsAddLyricsModalOpen(false);
          showToast('Letra agregada con éxito');
        }}
      />
    </div>
  );
}
