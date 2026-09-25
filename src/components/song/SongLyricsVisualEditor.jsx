import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RotateCcw,
  Save,
  X,
  Plus,
  Tag,
  Trash2,
  Music2,
  FileText,
  ChevronDown,
  Check,
  Zap,
  ArrowUp,
  ArrowDown,
  Scissors,
  GripVertical,
  Edit3,
  Combine,
} from 'lucide-react';
import { normalizeChordName, alignChordsWithLyrics } from '../../utils/music';

const SECTION_TYPES = [
  'Intro',
  'Estrofa 1',
  'Estrofa 2',
  'Estrofa 3',
  'Pre-Coro',
  'Coro',
  'Puente',
  'Solo',
  'Interludio',
  'Outro',
  'Final',
  'Parte A',
  'Parte B',
  'Instrumental',
  'Acapella',
  'Coda',
];

/**
 * Parses raw text with [Section] and [Chord] tags into structured visual blocks
 */
function parseLyricsToVisualBlocks(rawText) {
  if (!rawText || !rawText.trim()) return [];

  // Harmonically align multi-line chord tabs into inline chord words
  const alignedText = alignChordsWithLyrics(rawText);
  const lines = alignedText.split('\n');
  const sections = [];
  let currentSection = {
    id: `sec_${Date.now()}_0`,
    name: 'Intro',
    time: null,
    lines: [],
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    // Check for Section Header: [Intro @ 12.5], [Verse 1], [Parte A], [Coro], etc.
    const headerMatch = trimmed.match(/^\[\s*([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_/]+?)(?:\s*@\s*([0-9:.]+))?\s*\]$/);
    const innerName = headerMatch ? headerMatch[1].trim() : '';
    const isSection =
      headerMatch &&
      (headerMatch[2] !== undefined ||
       /^(intro|verse|verso|estrofa|prechorus|pre-chorus|precoro|pre-coro|chorus|coro|estribillo|bridge|puente|solo|outro|final|coda|hook|interlude|interludio|part|parte|seccion|sección|tema|acapella|instrumental|bloque|bpm|beats|time)/i.test(innerName) ||
       !/^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add|\d|M|\/|[A-G][b#]?)*$/i.test(innerName));

    if (isSection) {
      if (currentSection.lines.length > 0 || currentSection.name !== 'Intro') {
        sections.push(currentSection);
      }
      currentSection = {
        id: `sec_${Date.now()}_${lineIdx}_${Math.random().toString(36).substring(2, 6)}`,
        name: innerName,
        time: headerMatch[2] ? headerMatch[2].trim() : null,
        lines: [],
      };
      return;
    }

    // Parse words and attached chords in this line
    const parsedWords = [];
    const parts = line.split(/(\[[^\]]+\])/g);
    let pendingChord = null;

    parts.forEach((part) => {
      if (!part) return;
      if (part.startsWith('[') && part.endsWith(']')) {
        const chord = part.slice(1, -1).trim();
        if (/^(?:BPM|Beats|Time)/i.test(chord)) return;

        if (pendingChord) {
          parsedWords.push({
            id: `w_${Math.random().toString(36).substring(2, 8)}`,
            type: 'word',
            text: ' ',
            chord: pendingChord,
          });
        }
        pendingChord = normalizeChordName(chord);
      } else {
        const wordsInPart = part.split(/(\s+)/);
        wordsInPart.forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) {
            parsedWords.push({ type: 'space', text: w });
          } else {
            parsedWords.push({
              id: `w_${Math.random().toString(36).substring(2, 8)}`,
              type: 'word',
              text: w,
              chord: pendingChord,
            });
            pendingChord = null;
          }
        });
      }
    });

    if (pendingChord) {
      parsedWords.push({
        id: `w_${Math.random().toString(36).substring(2, 8)}`,
        type: 'word',
        text: ' ',
        chord: pendingChord,
      });
    }

    if (parsedWords.length > 0) {
      currentSection.lines.push({
        id: `line_${lineIdx}_${Math.random().toString(36).substring(2, 6)}`,
        words: parsedWords,
      });
    }
  });

  if (currentSection.lines.length > 0 || sections.length === 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Reconstructs raw text from visual sections and words
 */
function reconstructTextFromBlocks(sections) {
  let output = '';
  sections.forEach((sec) => {
    const validLines = sec.lines.filter((line) => line && line.words && line.words.length > 0);
    if (validLines.length === 0 && sec.name === 'Intro') {
      return;
    }

    const timeStr = sec.time ? ` @ ${sec.time}` : '';
    output += `[${sec.name}${timeStr}]\n`;

    validLines.forEach((line) => {
      let lineStr = '';

      line.words.forEach((item) => {
        if (item.type === 'space') {
          lineStr += item.text;
        } else if (item.type === 'word') {
          if (item.chord) {
            lineStr += `[${item.chord}]${item.text}`;
          } else {
            lineStr += item.text;
          }
        }
      });

      if (lineStr.trim()) {
        output += lineStr.trimEnd() + '\n';
      }
    });

    output += '\n';
  });

  return output.trim();
}

/**
 * SongLyricsVisualEditor Component
 * Unified visual builder matching SongLyricsRenderer's 90° gutter design,
 * with dynamic boundary resizing to expand/contract sections and drag-drop chords.
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
  className = '',
}) {
  const visualSections = useMemo(() => {
    return parseLyricsToVisualBlocks(draftContent);
  }, [draftContent]);

  const [activeDropWordId, setActiveDropWordId] = useState(null);
  const [isAddLyricsModalOpen, setIsAddLyricsModalOpen] = useState(false);
  const [newLyricsInput, setNewLyricsInput] = useState('');
  const [selectedWordForPicker, setSelectedWordForPicker] = useState(null);
  const [customChordInput, setCustomChordInput] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [editingSectionPopover, setEditingSectionPopover] = useState(null); // sec.id
  const [popoverCustomName, setPopoverCustomName] = useState('');
  const [addSectionPopover, setAddSectionPopover] = useState(null); // { atIndex: number, id: string }
  const [newSectionCustomName, setNewSectionCustomName] = useState('');

  const lyricsTextareaRef = useRef(null);

  // Close context menu & popover on external click or escape
  useEffect(() => {
    const handleDismiss = () => {
      setContextMenu(null);
      setEditingSectionPopover(null);
      setAddSectionPopover(null);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setEditingSectionPopover(null);
        setAddSectionPopover(null);
      }
    };
    window.addEventListener('click', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleTextareaContextMenu = (e) => {
    e.preventDefault();
    const el = lyricsTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    const posX = Math.min(e.clientX, window.innerWidth - 230);
    const posY = Math.min(e.clientY, window.innerHeight - 360);

    setCustomSectionInput('');
    setContextMenu({
      x: Math.max(10, posX),
      y: Math.max(10, posY),
      start,
      end,
    });
  };

  const handleAssignSectionFromContext = (sectionTag) => {
    if (!contextMenu) return;
    const { start, end } = contextMenu;
    const current = newLyricsInput;
    let updated = '';

    if (start !== end && start >= 0 && end <= current.length) {
      const before = current.substring(0, start);
      const selected = current.substring(start, end).trim();
      const after = current.substring(end);

      const prefix = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const suffix = after.startsWith('\n') ? '' : '\n\n';

      updated = before + prefix + `${sectionTag}\n${selected}` + suffix + after;
    } else {
      const pos = start !== undefined ? start : current.length;
      const before = current.substring(0, pos);
      const after = current.substring(pos);
      const prefix = before.length === 0 || before.endsWith('\n') ? '' : '\n';
      updated = before + prefix + `${sectionTag}\n` + after;
    }

    setNewLyricsInput(updated);
    setContextMenu(null);
    if (lyricsTextareaRef.current) {
      lyricsTextareaRef.current.focus();
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Check if the song has almost no words (Instrumental or pure chords)
  const isInstrumental = useMemo(() => {
    let wordCount = 0;
    visualSections.forEach((sec) => {
      sec.lines.forEach((line) => {
        line.words.forEach((w) => {
          if (w.type === 'word' && w.text.trim() && w.text !== ' ') {
            wordCount++;
          }
        });
      });
    });
    return wordCount <= 3;
  }, [visualSections]);

  // Updates a specific word's chord
  const handleAssignChordToWord = (secIdx, lineIdx, wordId, chordName) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const sec = updated[secIdx];
    if (!sec) return;
    const line = sec.lines[lineIdx];
    if (!line) return;
    const word = line.words.find((w) => w.id === wordId);
    if (word) {
      word.chord = chordName ? normalizeChordName(chordName) : null;
    }
    const newContent = reconstructTextFromBlocks(updated);
    setDraftContent(newContent);
    if (chordName) {
      showToast(`Acorde [${chordName}] acoplado`);
    }
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

  // Drop chord from BeatGrid onto word
  const handleDropOnWord = (e, secIdx, lineIdx, wordId) => {
    e.preventDefault();
    setActiveDropWordId(null);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.chord) {
          handleAssignChordToWord(secIdx, lineIdx, wordId, data.chord);
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

  // Move line to previous section
  const handleMoveLineToPrevSection = (secIdx, lineIdx) => {
    if (secIdx <= 0) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    const prevSec = updated[secIdx - 1];
    if (!currentSec || !prevSec) return;

    const [movedLine] = currentSec.lines.splice(lineIdx, 1);
    if (!movedLine) return;

    prevSec.lines.push(movedLine);

    if (currentSec.lines.length === 0) {
      updated.splice(secIdx, 1);
    }

    setDraftContent(reconstructTextFromBlocks(updated));
    showToast(`Verso movido a [${prevSec.name}]`);
  };

  // Move line to next section
  const handleMoveLineToNextSection = (secIdx, lineIdx) => {
    if (secIdx >= visualSections.length - 1) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    const nextSec = updated[secIdx + 1];
    if (!currentSec || !nextSec) return;

    const [movedLine] = currentSec.lines.splice(lineIdx, 1);
    if (!movedLine) return;

    nextSec.lines.unshift(movedLine);

    if (currentSec.lines.length === 0) {
      updated.splice(secIdx, 1);
    }

    setDraftContent(reconstructTextFromBlocks(updated));
    showToast(`Verso movido a [${nextSec.name}]`);
  };

  // Move boundary UP: contract current section by moving its last verse to the next section
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

    setDraftContent(reconstructTextFromBlocks(updated));
    showToast(`Límite subido: verso cedido a [${nextSec.name}]`);
  };

  // Move boundary DOWN: expand current section by absorbing the first verse of the next section
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

    setDraftContent(reconstructTextFromBlocks(updated));
    showToast(`Límite bajado: verso añadido a [${currentSec.name}]`);
  };

  // Move individual line UP (within section or to previous section)
  const handleMoveLineUp = (secIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    if (!currentSec) return;

    if (lineIdx > 0) {
      const temp = currentSec.lines[lineIdx];
      currentSec.lines[lineIdx] = currentSec.lines[lineIdx - 1];
      currentSec.lines[lineIdx - 1] = temp;
      setDraftContent(reconstructTextFromBlocks(updated));
      showToast('Verso movido hacia arriba');
    } else if (secIdx > 0) {
      const prevSec = updated[secIdx - 1];
      const [movedLine] = currentSec.lines.splice(lineIdx, 1);
      prevSec.lines.push(movedLine);
      if (currentSec.lines.length === 0) {
        updated.splice(secIdx, 1);
      }
      setDraftContent(reconstructTextFromBlocks(updated));
      showToast(`Verso movido a [${prevSec.name}]`);
    }
  };

  // Move individual line DOWN (within section or to next section)
  const handleMoveLineDown = (secIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(visualSections));
    const currentSec = updated[secIdx];
    if (!currentSec) return;

    if (lineIdx < currentSec.lines.length - 1) {
      const temp = currentSec.lines[lineIdx];
      currentSec.lines[lineIdx] = currentSec.lines[lineIdx + 1];
      currentSec.lines[lineIdx + 1] = temp;
      setDraftContent(reconstructTextFromBlocks(updated));
      showToast('Verso movido hacia abajo');
    } else if (secIdx < updated.length - 1) {
      const nextSec = updated[secIdx + 1];
      const [movedLine] = currentSec.lines.splice(lineIdx, 1);
      nextSec.lines.unshift(movedLine);
      if (currentSec.lines.length === 0) {
        updated.splice(secIdx, 1);
      }
      setDraftContent(reconstructTextFromBlocks(updated));
      showToast(`Verso movido a [${nextSec.name}]`);
    }
  };

  // Split section at specific line
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
    setDraftContent(reconstructTextFromBlocks(updated));
    showToast(`Nueva sección [${newSectionName}] creada`);
  };

  // Rename section
  const handleRenameSection = (secIdx, newName) => {
    if (!newName || !newName.trim()) return;
    const updated = JSON.parse(JSON.stringify(visualSections));
    if (updated[secIdx]) {
      updated[secIdx].name = newName.trim();
      setDraftContent(reconstructTextFromBlocks(updated));
      showToast(`Sección renombrada a [${newName.trim()}]`);
    }
    setEditingSectionPopover(null);
    setPopoverCustomName('');
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

    setDraftContent(reconstructTextFromBlocks(updated));
    setEditingSectionPopover(null);
    showToast(`Sección unida a [${prevSec.name}]`);
  };

  // Add new section at a specific index
  const handleAddSection = (sectionName = 'Estrofa', atIndex = visualSections.length) => {
    if (!sectionName || !sectionName.trim()) return;
    const name = sectionName.trim();
    const updated = JSON.parse(JSON.stringify(visualSections));
    const newSec = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      time: null,
      lines: [
        {
          id: `line_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          words: [
            {
              id: `w_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'word',
              text: 'Nueva frase...',
              chord: null,
            },
          ],
        },
      ],
    };

    if (atIndex <= 0) {
      updated.unshift(newSec);
    } else if (atIndex >= updated.length) {
      updated.push(newSec);
    } else {
      updated.splice(atIndex, 0, newSec);
    }

    setDraftContent(reconstructTextFromBlocks(updated));
    setAddSectionPopover(null);
    setNewSectionCustomName('');
    showToast(`Sección [${name}] añadida`);
  };

  // Reusable popover to pick or type a new section name
  const renderAddSectionPopover = (atIndex, popoverId, positionClasses = 'top-8 left-1/2 -translate-x-1/2') => {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute z-50 w-64 bg-white rounded-2xl border-2 border-stone-300 shadow-2xl p-3 text-left paper-texture space-y-2.5 animate-fade-in select-none ${positionClasses}`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
          <span className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-700" />
            <span>Nueva Sección</span>
          </span>
          <button
            type="button"
            onClick={() => setAddSectionPopover(null)}
            className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Custom Name Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newSectionCustomName.trim()) {
              handleAddSection(newSectionCustomName, atIndex);
            }
          }}
          className="flex items-center gap-1"
        >
          <input
            type="text"
            value={newSectionCustomName}
            onChange={(e) => setNewSectionCustomName(e.target.value)}
            placeholder="Nombre personalizado..."
            autoFocus
            className="flex-1 px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-serif text-stone-900 focus:outline-none focus:border-amber-600 placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!newSectionCustomName.trim()}
            className="p-1 px-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white rounded text-xs font-sans font-bold cursor-pointer transition-colors"
          >
            + Crear
          </button>
        </form>

        {/* Suggested Presets Grid */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
            O elegir sugerida:
          </span>
          <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-1">
            {SECTION_TYPES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleAddSection(st, atIndex)}
                className="px-2 py-1 rounded text-left text-[11px] font-serif transition-colors truncate cursor-pointer bg-stone-50 hover:bg-amber-100 text-stone-800 hover:text-amber-900 border border-stone-200/60"
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Delete section
  const handleDeleteSection = (secIdx) => {
    const updated = visualSections.filter((_, idx) => idx !== secIdx);
    setDraftContent(reconstructTextFromBlocks(updated));
    setEditingSectionPopover(null);
    showToast('Sección eliminada');
  };

  return (
    <div className={`flex-1 min-w-0 flex flex-col justify-between bg-[#fcf9f2] rounded-2xl md:rounded-r-none md:rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border border-stone-300 md:border-r-0 overflow-hidden paper-texture p-5 sm:p-7 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] max-h-[580px] xl:max-h-[640px] 2xl:max-h-[700px] relative z-10 ${className}`}>
      {/* Top Margin Paper Stripe */}
      <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

      <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-hidden">
        {/* Editor Top Control Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-200 flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 text-amber-950 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border border-amber-300 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
              <span>Diseñador Visual de Letra</span>
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
                <Zap className={`w-3 h-3 ${isSyncMode ? 'text-amber-700 fill-amber-500' : 'text-stone-400'}`} />
                <span>{isSyncMode ? 'Sincronizado' : 'Modo Libre'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasOriginal && (
              <button
                type="button"
                onClick={onRestoreOriginal}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-colors cursor-pointer"
                title="Deshacer cambios y restaurar la letra original scrapeada"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar</span>
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
                Esta canción contiene únicamente compases rítmicos en el BeatGrid. Puedes tocarla instrumentalmente o añadirle la letra para acoplarle los acordes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddLyricsModalOpen(true)}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold font-sans shadow transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>➕ Añadir Letra a esta Canción</span>
            </button>
          </div>
        ) : (
          /* Visual Lyrics Canvas Matching Viewer's 90° Rotated Gutter */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 min-h-0 max-h-[380px] xl:max-h-[440px] 2xl:max-h-[500px]">
            {/* Add Section at Top */}
            <div className="relative flex items-center justify-center pt-1 pb-1 select-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddSectionPopover(
                    addSectionPopover?.id === 'top' ? null : { atIndex: 0, id: 'top' }
                  );
                  setNewSectionCustomName('');
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400 text-stone-600 hover:text-amber-900 text-xs font-sans font-semibold transition-all shadow-2xs cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Añadir sección al inicio</span>
              </button>

              {addSectionPopover?.id === 'top' &&
                renderAddSectionPopover(0, 'top', 'top-9 left-1/2 -translate-x-1/2')}
            </div>

            {visualSections.map((sec, secIdx) => {
              const hasNextSection = secIdx < visualSections.length - 1;
              const nextSec = hasNextSection ? visualSections[secIdx + 1] : null;

              return (
                <div key={sec.id} className="relative group/section">
                  <div className="flex items-stretch gap-3">
                    {/* 90° Rotated Section Header in Left Gutter */}
                    <div className="w-8 flex-shrink-0 flex flex-col items-center justify-start select-none py-1 border-r border-amber-900/15 relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSectionPopover(editingSectionPopover === sec.id ? null : sec.id);
                        }}
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                        }}
                        className="text-[11px] font-serif font-bold uppercase tracking-wider px-1.5 py-2 rounded-md shadow-xs transition-all whitespace-nowrap cursor-pointer text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-300 hover:scale-105 active:scale-95"
                        title={`Editar sección [${sec.name}]`}
                      >
                        {sec.name}
                      </button>

                      {/* Section Options Popover */}
                      {editingSectionPopover === sec.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-10 top-0 w-56 bg-white rounded-2xl border-2 border-stone-300 shadow-2xl p-3 z-50 text-left paper-texture space-y-2.5 animate-fade-in select-none"
                        >
                          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                            <span className="text-xs font-serif font-bold text-stone-900">
                              Opciones de Sección
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingSectionPopover(null)}
                              className="text-stone-400 hover:text-stone-700 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Section Name Presets */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
                              Cambiar Nombre:
                            </span>
                            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1">
                              {SECTION_TYPES.map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleRenameSection(secIdx, st)}
                                  className={`px-2 py-1 rounded text-left text-[11px] font-serif transition-colors truncate cursor-pointer ${
                                    sec.name === st
                                      ? 'bg-amber-600 text-white font-bold'
                                      : 'bg-stone-50 hover:bg-amber-100 text-stone-800'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Custom Name Input */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (popoverCustomName.trim()) {
                                handleRenameSection(secIdx, popoverCustomName);
                              }
                            }}
                            className="flex items-center gap-1 pt-1"
                          >
                            <input
                              type="text"
                              value={popoverCustomName}
                              onChange={(e) => setPopoverCustomName(e.target.value)}
                              placeholder="Otro nombre..."
                              className="flex-1 px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-serif text-stone-900 focus:outline-none focus:border-amber-600"
                            />
                            <button
                              type="submit"
                              className="p-1 bg-amber-700 text-white rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </form>

                          {/* Merge & Delete Actions */}
                          <div className="pt-2 border-t border-stone-200 space-y-1">
                            {secIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMergeWithPrevSection(secIdx)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs font-sans text-stone-700 hover:bg-stone-100 cursor-pointer"
                              >
                                <Combine className="w-3.5 h-3.5 text-amber-700" />
                                <span>Unir con sección anterior</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteSection(secIdx)}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs font-sans text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Eliminar esta sección</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section Verse Lines & Magnetic Chord Drop Slots */}
                    <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                      {sec.lines.map((line, lineIdx) => {
                        const isEmpty = line.words.length === 0;

                        if (isEmpty) {
                          return (
                            <div
                              key={line.id}
                              className="h-3.5 flex items-center group/line relative"
                            >
                              <div className="w-full border-b border-dashed border-stone-200/60" />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={line.id}
                            className="flex items-end flex-wrap gap-y-2 group/line relative py-0.5 rounded-lg transition-colors hover:bg-amber-50/50"
                          >
                            {/* Words with Magnetic Upper Chord Drop Slots */}
                            <div className="flex items-end flex-wrap flex-1 min-w-0">
                              {line.words.map((item) => {
                                if (item.type === 'space') {
                                  return (
                                    <span key={Math.random()} className="w-1.5 inline-block">
                                      &nbsp;
                                    </span>
                                  );
                                }

                                const isHoveredDrop = activeDropWordId === item.id;

                                return (
                                  <div
                                    key={item.id}
                                    className="inline-flex flex-col items-start justify-end relative group/word flex-shrink-0"
                                    onDragOver={(e) => handleDragOverWord(e, item.id)}
                                    onDragLeave={handleDragLeaveWord}
                                    onDrop={(e) => handleDropOnWord(e, secIdx, lineIdx, item.id)}
                                  >
                                    {/* Chord Slot positioned precisely OVER the word */}
                                    <div className="h-5 flex items-center mb-0.5">
                                      {item.chord ? (
                                        <div
                                          className="inline-flex items-center gap-0.5 bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded border border-amber-400 font-mono font-bold text-xs shadow-xs transition-transform hover:scale-105 select-none"
                                          title={`Acorde [${item.chord}]. Clic para quitar.`}
                                        >
                                          <span>{item.chord}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAssignChordToWord(secIdx, lineIdx, item.id, null);
                                            }}
                                            className="p-0.5 hover:text-rose-700 cursor-pointer ml-0.5"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedWordForPicker({ secIdx, lineIdx, wordId: item.id })}
                                          className={`h-4 min-w-[20px] px-1 rounded flex items-center justify-center transition-all cursor-pointer ${
                                            isHoveredDrop
                                              ? 'bg-amber-300 border-2 border-dashed border-amber-700 scale-110 shadow-sm'
                                              : 'opacity-0 group-hover/word:opacity-100 border border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/70 text-amber-800'
                                          }`}
                                          title="Asignar acorde a esta palabra"
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Word / Syllable Text */}
                                    <span
                                      className={`font-serif text-sm leading-snug px-0.5 rounded transition-colors text-stone-900 ${
                                        isHoveredDrop ? 'bg-amber-200 font-bold' : ''
                                      }`}
                                    >
                                      {item.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Quick Line Actions on Right Gutter */}
                            <div className="opacity-0 group-hover/line:opacity-100 transition-opacity flex items-center gap-1 pl-2 select-none flex-shrink-0">
                              {(lineIdx > 0 || secIdx > 0) && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLineUp(secIdx, lineIdx)}
                                  className="p-1 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                  title={lineIdx === 0 ? `Pasar este verso a [${visualSections[secIdx - 1]?.name}]` : 'Subir este verso'}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                              )}

                              {(lineIdx < sec.lines.length - 1 || hasNextSection) && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLineDown(secIdx, lineIdx)}
                                  className="p-1 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
                                  title={lineIdx === sec.lines.length - 1 ? `Pasar este verso a [${nextSec?.name}]` : 'Bajar este verso'}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              )}

                              {lineIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSplitSectionAtLine(secIdx, lineIdx, 'Estrofa')}
                                  className="p-1 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer"
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

                  {/* Interactive Section Boundary Divider Bar (Between this section and next) */}
                  {hasNextSection && (
                    <div className="my-2.5 pl-11 pr-2 flex items-center justify-between gap-2 select-none group/boundary relative">
                      <div className="h-px bg-amber-900/15 flex-1 group-hover/boundary:bg-amber-500/50 transition-colors" />

                      {/* Boundary Resizing Controls & Add Section Button */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-100 group-hover/boundary:bg-amber-100 border border-stone-200 group-hover/boundary:border-amber-300 transition-all text-[10px] font-mono text-stone-600 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleMoveBoundaryUp(secIdx)}
                          disabled={sec.lines.length === 0}
                          className="hover:text-amber-900 hover:bg-amber-200/60 p-0.5 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={`Mover límite hacia arriba (contraer [${sec.name}])`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>

                        <span className="px-0.5 font-semibold text-stone-700">
                          ↕ Límite
                        </span>

                        <button
                          type="button"
                          onClick={() => handleMoveBoundaryDown(secIdx)}
                          disabled={!nextSec || nextSec.lines.length === 0}
                          className="hover:text-amber-900 hover:bg-amber-200/60 p-0.5 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={`Mover límite hacia abajo (expandir [${sec.name}])`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>

                        <span className="text-stone-300 select-none">|</span>

                        {/* Add section between trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddSectionPopover(
                              addSectionPopover?.id === `between_${secIdx}`
                                ? null
                                : { atIndex: secIdx + 1, id: `between_${secIdx}` }
                            );
                            setNewSectionCustomName('');
                          }}
                          className="hover:text-amber-950 hover:bg-amber-200/80 px-1 py-0.5 rounded cursor-pointer flex items-center gap-1 font-sans text-amber-900 font-bold transition-colors"
                          title="Insertar una nueva sección aquí"
                        >
                          <Plus className="w-3 h-3 text-amber-700" />
                          <span>+ Sección</span>
                        </button>
                      </div>

                      <div className="h-px bg-amber-900/15 flex-1 group-hover/boundary:bg-amber-500/50 transition-colors" />

                      {addSectionPopover?.id === `between_${secIdx}` &&
                        renderAddSectionPopover(
                          secIdx + 1,
                          `between_${secIdx}`,
                          'top-8 left-1/2 -translate-x-1/2'
                        )}
                    </div>
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
                  setNewSectionCustomName('');
                }}
                className="px-3.5 py-1.5 bg-amber-100/90 hover:bg-amber-200/90 border border-amber-300 rounded-xl text-xs font-sans font-bold text-amber-950 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-amber-800" />
                <span>+ Añadir Sección al Final</span>
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
                onClick={() => handleAddSection('Puente', visualSections.length)}
                className="px-2.5 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-xs font-sans font-semibold text-stone-700 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-amber-700" />
                <span>Puente</span>
              </button>

              {addSectionPopover?.id === 'bottom' &&
                renderAddSectionPopover(
                  visualSections.length,
                  'bottom',
                  'top-12 left-11'
                )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-3 mt-3 border-t border-stone-200 flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
        <div className="text-[11px] font-sans text-stone-500">
          💡 <span className="font-semibold">Arrastra un acorde</span> desde el BeatGrid derecho y suéltalo sobre una palabra.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold font-sans transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold font-sans shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Arreglo'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-16 right-5 bg-stone-900/90 text-white text-[11px] font-sans px-3 py-1.5 rounded-xl shadow-xl animate-fade-in pointer-events-none z-50">
          {toastMessage}
        </div>
      )}

      {/* Quick Chord Picker Modal for Word Click */}
      {selectedWordForPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white rounded-2xl border border-stone-300 p-4 shadow-2xl space-y-3 paper-texture">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-bold font-sans text-stone-800">Seleccionar Acorde:</span>
              <button
                type="button"
                onClick={() => setSelectedWordForPicker(null)}
                className="text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {uniqueChords.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    handleAssignChordToWord(
                      selectedWordForPicker.secIdx,
                      selectedWordForPicker.lineIdx,
                      selectedWordForPicker.wordId,
                      ch
                    );
                    setSelectedWordForPicker(null);
                  }}
                  className="p-1.5 bg-stone-100 hover:bg-amber-100 text-amber-950 rounded-lg text-xs font-mono font-bold border border-stone-200 transition-colors"
                >
                  [{ch}]
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customChordInput.trim()) {
                  handleAssignChordToWord(
                    selectedWordForPicker.secIdx,
                    selectedWordForPicker.lineIdx,
                    selectedWordForPicker.wordId,
                    customChordInput.trim()
                  );
                  setCustomChordInput('');
                  setSelectedWordForPicker(null);
                }
              }}
              className="flex items-center gap-1.5 pt-1"
            >
              <input
                type="text"
                value={customChordInput}
                onChange={(e) => setCustomChordInput(e.target.value)}
                placeholder="Otro (ej: F#m7)..."
                className="flex-1 px-2.5 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:border-amber-600"
              />
              <button
                type="submit"
                className="p-1.5 bg-amber-700 text-white rounded-lg cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Lyrics to Instrumental Song */}
      {isAddLyricsModalOpen && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddLyricsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="relative w-full max-w-xl bg-[#fcf9f2] rounded-3xl border-4 border-[#35251d] p-6 sm:p-7 shadow-2xl space-y-4 paper-texture z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-300/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-100/90 rounded-2xl text-amber-900 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-xl text-stone-900">
                      Pegar o Escribir Letra
                    </h3>
                    <p className="text-xs font-sans text-stone-600 mt-0.5">
                      Ingresa los versos para estructurarlos en palabras con ranuras de acordes
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddLyricsModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-amber-950 text-xs font-sans shadow-2xs">
                <div className="p-1.5 bg-amber-200/70 rounded-xl text-amber-900 flex-shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="leading-snug">
                  <span className="font-bold text-amber-900">💡 Asignar Secciones: </span>
                  Selecciona una parte o estrofa del texto y haz <strong>clic derecho</strong> sobre la selección para asignarle una sección.
                </div>
              </div>

              <div className="relative">
                <textarea
                  ref={lyricsTextareaRef}
                  value={newLyricsInput}
                  onChange={(e) => setNewLyricsInput(e.target.value)}
                  onContextMenu={handleTextareaContextMenu}
                  placeholder="Pega la letra completa aquí...&#10;&#10;Ejemplo:&#10;[Intro]&#10;Ahí va el capitán Beto...&#10;&#10;[Estrofa 2]&#10;Ya lleva quince años en su periplo..."
                  rows={8}
                  className="w-full p-4 bg-white/80 border-2 border-stone-300 rounded-2xl font-serif text-sm text-stone-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-700 shadow-inner paper-texture"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-300/80">
                <button
                  type="button"
                  onClick={() => setIsAddLyricsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold font-sans transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyAddedLyrics}
                  disabled={!newLyricsInput.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold font-sans shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  Estructurar y Aplicar Letra
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
