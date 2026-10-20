import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Disc3, Plus, Music2, Sliders, X, Minus, Edit3 } from 'lucide-react';

/**
 * BeatGrid Component for SongBook
 * Visualizes the song structure in measures and beats.
 * Groups measures into visual section blocks with unified headers,
 * supporting bidirectional chord drag-and-drop, measure addition with time signatures (4/4, 2/4, 3/4, 6/8),
 * full section 'grid' mode and horizontal scrolling 'ribbon' mode.
 */
export default function BeatGrid({
  compases = [],
  currentBeatIndex = -1,
  beatsPerMeasure = 4,
  onBeatClick = null,
  mode = 'ribbon', // 'ribbon' | 'grid'
  transpose = 0,
  isEditMode = false,
  onUpdateChord = null,
  onAddMeasure = null,
  onSetTimestamp = null,
  onChangeMeasureLength = null,
  currentTime = null,
  activeStampChord = null,
  uniqueChords = [],
}) {
  const activeCellRef = useRef(null);
  const ribbonScrollRef = useRef(null);
  const [activeDropCellIdx, setActiveDropCellIdx] = useState(null);
  const [editingMeasure, setEditingMeasure] = useState(null); // { measureIdx, compas }
  const [editingBeatCell, setEditingBeatCell] = useState(null); // { cellGlobalIndex, currentChord, beatNum, measure }
  const [customBeatChordInput, setCustomBeatChordInput] = useState('');
  const [measureScope, setMeasureScope] = useState('single'); // 'single' | 'section' | 'from_here' | 'all'

  // Scrubber drag state & refs for fixed center needle
  const isDraggingMarkerRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const lastScrubbedBeatRef = useRef(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [scrubbingBeatIndex, setScrubbingBeatIndex] = useState(null);

  const flatChords = useMemo(() => {
    return compases.flatMap((m) => m.acordes);
  }, [compases]);

  // Calculate cumulative beat offsets per measure for variable measure lengths
  const measureBeatOffsets = useMemo(() => {
    let count = 0;
    return compases.map((m) => {
      const start = count;
      count += m.acordes?.length || beatsPerMeasure;
      return start;
    });
  }, [compases, beatsPerMeasure]);

  // Find beat currently under the stationary center needle
  const findBeatUnderNeedle = useCallback(() => {
    if (!ribbonScrollRef.current) return null;
    const container = ribbonScrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const needleX = containerRect.left + containerRect.width / 2;
    const needleY = containerRect.top + containerRect.height / 2;

    if (typeof document.elementsFromPoint === 'function') {
      const elements = document.elementsFromPoint(needleX, needleY);
      for (const el of elements) {
        const beatEl = el.closest('[data-beat-index]');
        if (beatEl && container.contains(beatEl)) {
          const beatIdx = parseInt(beatEl.getAttribute('data-beat-index'), 10);
          const chord = beatEl.getAttribute('data-chord') || '';
          return { beatIdx, chord };
        }
      }
    }

    const beatEls = container.querySelectorAll('[data-beat-index]');
    let closest = null;
    let minDistance = Infinity;

    beatEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const cellCenter = rect.left + rect.width / 2;
      const dist = Math.abs(cellCenter - needleX);
      if (dist < minDistance) {
        minDistance = dist;
        closest = {
          beatIdx: parseInt(el.getAttribute('data-beat-index'), 10),
          chord: el.getAttribute('data-chord') || '',
        };
      }
    });

    return closest;
  }, []);

  const rafIdRef = useRef(null);

  const handleMarkerPointerDown = useCallback((e) => {
    if (!ribbonScrollRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    isDraggingMarkerRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = ribbonScrollRef.current.scrollLeft;
    lastScrubbedBeatRef.current = currentBeatIndex;

    // Disable CSS smooth scrolling for instant 1:1 hardware drag
    ribbonScrollRef.current.style.scrollBehavior = 'auto';

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    setIsDraggingMarker(true);
    setScrubbingBeatIndex(currentBeatIndex);
  }, [currentBeatIndex]);

  const handleMarkerPointerMove = useCallback((e) => {
    if (!isDraggingMarkerRef.current || !ribbonScrollRef.current) return;
    e.preventDefault();

    const clientX = e.clientX;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

    rafIdRef.current = requestAnimationFrame(() => {
      if (!ribbonScrollRef.current || !isDraggingMarkerRef.current) return;
      const deltaX = clientX - dragStartXRef.current;
      const maxScroll = ribbonScrollRef.current.scrollWidth - ribbonScrollRef.current.clientWidth;
      const newScrollLeft = Math.max(0, Math.min(maxScroll, dragStartScrollRef.current + deltaX));

      ribbonScrollRef.current.scrollLeft = newScrollLeft;

      // Find beat under needle to update real-time visual highlight
      const beatInfo = findBeatUnderNeedle();
      if (beatInfo && beatInfo.beatIdx !== lastScrubbedBeatRef.current) {
        lastScrubbedBeatRef.current = beatInfo.beatIdx;
        setScrubbingBeatIndex(beatInfo.beatIdx);
      }
    });
  }, [findBeatUnderNeedle]);

  const handleMarkerPointerUp = useCallback((e) => {
    if (!isDraggingMarkerRef.current) return;
    isDraggingMarkerRef.current = false;
    setIsDraggingMarker(false);

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    // Restore smooth scrolling behavior
    if (ribbonScrollRef.current) {
      ribbonScrollRef.current.style.scrollBehavior = '';
    }

    const beatInfo = findBeatUnderNeedle();
    if (beatInfo) {
      const measure = compases.find((_, mIdx) => {
        const start = measureBeatOffsets[mIdx] ?? mIdx * beatsPerMeasure;
        const len = compases[mIdx]?.acordes?.length || beatsPerMeasure;
        return beatInfo.beatIdx >= start && beatInfo.beatIdx < start + len;
      });

      // Sound the chord on release and seek playback once
      if (onBeatClick) {
        onBeatClick(beatInfo.chord, beatInfo.beatIdx, measure, true);
      }
    }

    setScrubbingBeatIndex(null);
  }, [compases, measureBeatOffsets, beatsPerMeasure, onBeatClick, findBeatUnderNeedle]);

  // Auto-scroll the horizontal ribbon to keep the active beat centered using localized scroll
  useEffect(() => {
    if (isDraggingMarkerRef.current) return;
    if (mode === 'ribbon' && activeCellRef.current && ribbonScrollRef.current) {
      const container = ribbonScrollRef.current;
      const cell = activeCellRef.current;
      const cellRect = cell.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const targetScrollLeft =
        container.scrollLeft +
        (cellRect.left - containerRect.left) -
        container.offsetWidth / 2 +
        cell.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' });
    }
  }, [currentBeatIndex, mode]);

  // Group consecutive measures by section for both Ribbon and Grid views
  const sectionGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    compases.forEach((compas, index) => {
      const seccion = compas.seccion || 'Tema';
      if (!currentGroup || currentGroup.name !== seccion) {
        currentGroup = {
          name: seccion,
          measures: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.measures.push({ ...compas, globalIndex: index });
    });

    return groups;
  }, [compases]);

  const getSectionStyles = (sectionName) => {
    const name = (sectionName || '').toLowerCase();
    if (name.includes('intro')) {
      return {
        badge: 'bg-amber-200 text-amber-950 border-amber-400 font-bold',
        ribbonContainer: 'bg-[#2d2218]/90 border-amber-700/50',
        card: 'bg-amber-50/40 border-amber-200/70',
      };
    }
    if (name.includes('estrofa') || name.includes('verso') || name.includes('verse')) {
      return {
        badge: 'bg-stone-200 text-stone-900 border-stone-300 font-bold',
        ribbonContainer: 'bg-[#251f1c]/90 border-stone-600/50',
        card: 'bg-white/70 border-stone-200',
      };
    }
    if (name.includes('estribillo') || name.includes('chorus') || name.includes('coro')) {
      return {
        badge: 'bg-emerald-200 text-emerald-950 border-emerald-400 font-bold',
        ribbonContainer: 'bg-[#1b2b20]/90 border-emerald-700/50',
        card: 'bg-emerald-50/30 border-emerald-200/70',
      };
    }
    if (
      name.includes('solo') ||
      name.includes('puente') ||
      name.includes('bridge') ||
      name.includes('interlude') ||
      name.includes('interludio')
    ) {
      return {
        badge: 'bg-rose-200 text-rose-950 border-rose-400 font-bold',
        ribbonContainer: 'bg-[#2b1b1f]/90 border-rose-700/50',
        card: 'bg-rose-50/30 border-rose-200',
      };
    }
    if (name.includes('outro') || name.includes('final') || name.includes('coda')) {
      return {
        badge: 'bg-purple-200 text-purple-950 border-purple-400 font-bold',
        ribbonContainer: 'bg-[#241a2a]/90 border-purple-700/50',
        card: 'bg-purple-50/30 border-purple-200',
      };
    }
    return {
      badge: 'bg-stone-100 text-stone-800 border-stone-300 font-bold',
      ribbonContainer: 'bg-[#241e1a]/90 border-stone-700/50',
      card: 'bg-white/60 border-stone-200',
    };
  };

  /**
   * Renders a single beat cell (time 1, 2, 3, or 4)
   */
  const renderBeatCell = (chord, beatNum, cellGlobalIndex, isRibbon = false, measure = null) => {
    const activeIndex =
      isDraggingMarker && scrubbingBeatIndex !== null ? scrubbingBeatIndex : currentBeatIndex;
    const isActive = cellGlobalIndex === activeIndex;
    const isRest = chord === '𝄾' || chord === '𝄽' || !chord;
    const isSynced = measure?.secTime !== null && measure?.secTime !== undefined;

    // Deduplicate continuous repeated chords across consecutive beats
    const isDuplicate =
      cellGlobalIndex > 0 &&
      chord &&
      !isRest &&
      chord === flatChords[cellGlobalIndex - 1];

    const displayChord = isDuplicate ? '' : chord;
    const isDraggable = isEditMode && displayChord && !isRest;
    const isHoveredDrop = activeDropCellIdx === cellGlobalIndex;

    const handleDragStart = (e) => {
      if (!isDraggable) return;
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'copy';
      const payload = {
        chord: displayChord,
        beatIndex: cellGlobalIndex,
        secTime: measure?.secTime ?? null,
        seccion: measure?.seccion ?? '',
      };
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.setData('text/plain', displayChord);
    };

    const handleDragOver = (e) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (activeDropCellIdx !== cellGlobalIndex) {
        setActiveDropCellIdx(cellGlobalIndex);
      }
    };

    const handleDragLeave = () => {
      if (activeDropCellIdx === cellGlobalIndex) {
        setActiveDropCellIdx(null);
      }
    };

    const handleDrop = (e) => {
      if (!isEditMode || !onUpdateChord) return;
      e.preventDefault();
      e.stopPropagation();
      setActiveDropCellIdx(null);

      try {
        const dataStr = e.dataTransfer.getData('application/json');
        if (dataStr) {
          const data = JSON.parse(dataStr);
          if (data.chord) {
            onUpdateChord(cellGlobalIndex, data.chord);
            return;
          }
        }
      } catch (err) {}
      const textChord = e.dataTransfer.getData('text/plain');
      if (textChord && textChord.trim()) {
        onUpdateChord(cellGlobalIndex, textChord.trim());
      }
    };

    const openBeatChordModal = (e) => {
      if (e) e.stopPropagation();
      if (!isEditMode || !onUpdateChord) return;
      setEditingBeatCell({
        cellGlobalIndex,
        currentChord: chord || '',
        beatNum,
        measure,
      });
      setCustomBeatChordInput(chord && chord !== '𝄾' && chord !== '𝄽' ? chord : '');
    };

    const handleCellClick = () => {
      if (isEditMode && activeStampChord && onUpdateChord) {
        onUpdateChord(cellGlobalIndex, activeStampChord);
        if (onBeatClick) onBeatClick(activeStampChord, cellGlobalIndex, measure, true);
        return;
      }
      if (onBeatClick) onBeatClick(chord, cellGlobalIndex, measure);
    };

    return (
      <div
        key={cellGlobalIndex}
        ref={isActive ? activeCellRef : null}
        data-beat-index={cellGlobalIndex}
        data-chord={chord || ''}
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleCellClick}
        onDoubleClick={openBeatChordModal}
        className={`
          group/beat relative flex-1 flex flex-col items-center justify-center transition-all select-none
          ${isEditMode && activeStampChord ? 'cursor-crosshair hover:ring-2 hover:ring-amber-500' : isDraggable ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400' : 'cursor-pointer'}
          ${isRibbon ? 'h-14 sm:h-16 px-1' : 'aspect-square p-1 rounded-lg'}
          ${
            isActive
              ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-white font-black scale-[1.04] shadow-lg ring-2 ring-amber-300 z-20 rounded-md'
              : isHoveredDrop
              ? 'bg-amber-300 border-2 border-dashed border-amber-800 scale-105'
              : isRibbon
              ? 'bg-[#fcfaf6] hover:bg-amber-50/70 text-stone-900'
              : displayChord
              ? isSynced
                ? 'bg-white hover:bg-amber-50 text-stone-900 border border-amber-300/80 shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-dashed border-stone-300'
              : 'bg-stone-100/70 hover:bg-stone-200/60 text-stone-400 border border-dashed border-stone-200'
          }
        `}
        title={
          isEditMode && activeStampChord
            ? `Clic para estampar [${activeStampChord}] en este pulso`
            : isEditMode
            ? `Clic para ir al pulso • Doble clic para cambiar acorde${isDraggable ? ` • Arrastra [${displayChord}] hacia la letra` : ''}`
            : isSynced
            ? `Compás sincronizado @ ${measure?.secTime}s`
            : undefined
        }
      >
        {/* Subtle hover edit button in Edit Mode when not stamping */}
        {isEditMode && onUpdateChord && !activeStampChord && (
          <button
            type="button"
            onClick={openBeatChordModal}
            className="opacity-0 group-hover/beat:opacity-100 transition-opacity absolute top-0.5 right-0.5 p-0.5 rounded bg-stone-200/80 hover:bg-amber-200 text-stone-600 hover:text-amber-950 z-10 cursor-pointer"
            title="Cambiar acorde de este pulso"
          >
            <Edit3 className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Chord Symbol or Subtle Pulse Dot */}
        {displayChord ? (
          <div className="relative flex items-center justify-center">
            <span
              className={`font-sans font-black tracking-tight leading-none ${
                isActive
                  ? 'text-white text-sm sm:text-base scale-105'
                  : 'text-stone-900 text-xs sm:text-sm font-bold'
              }`}
            >
              {displayChord}
            </span>
            {isSynced && !isActive && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-1 -right-2 shadow-2xs flex-shrink-0"
                title="Sincronizado"
              />
            )}
          </div>
        ) : (
          !isRest && (
            <span
              className={`text-xs select-none ${
                isActive ? 'text-amber-200 scale-150' : 'text-stone-300 font-bold'
              }`}
            >
              •
            </span>
          )
        )}

        {/* Pulse Subdivision Number (1, 2, 3, 4) */}
        <span
          className={`text-[9px] font-mono font-bold absolute bottom-1 ${
            isActive ? 'text-amber-100 font-extrabold' : 'text-stone-400/75'
          }`}
        >
          {beatNum}
        </span>
      </div>
    );
  };

  /**
   * Renders a measure card in Ribbon mode
   */
  const renderRibbonMeasure = (compas, mIdx) => {
    const startGlobalBeatIndex = measureBeatOffsets[mIdx] ?? mIdx * beatsPerMeasure;
    const numBeats = compas.acordes?.length || beatsPerMeasure;
    const isMeasureActive =
      currentBeatIndex >= startGlobalBeatIndex &&
      currentBeatIndex < startGlobalBeatIndex + numBeats;
    const isSynced = compas.secTime !== undefined && compas.secTime !== null;

    const widthClass =
      numBeats === 1
        ? 'w-14 sm:w-16'
        : numBeats === 2
        ? 'w-22 sm:w-26'
        : numBeats === 3
        ? 'w-32 sm:w-36'
        : numBeats === 6
        ? 'w-56 sm:w-60'
        : 'w-40 sm:w-44';

    return (
      <div
        key={compas.id || mIdx}
        className={`
          flex-shrink-0 ${widthClass} rounded-xl overflow-hidden shadow-xs border transition-all
          ${
            isMeasureActive
              ? 'border-amber-500 shadow-md ring-2 ring-amber-400/60 bg-white scale-[1.02]'
              : isSynced
              ? 'border-amber-300/80 bg-[#faf7f2]'
              : 'border-stone-300/60 bg-[#faf7f2]'
          }
        `}
      >
        {/* Compact Measure Header */}
        <div className="bg-[#ede7df] px-2 py-0.5 border-b border-stone-300/70 flex items-center justify-between text-[10px] select-none">
          {isEditMode && onChangeMeasureLength ? (
            <button
              type="button"
              onClick={() => setEditingMeasure({ measureIdx: mIdx, compas })}
              className="font-mono font-black text-stone-700 hover:text-amber-900 hover:bg-amber-100/80 rounded px-1 -mx-1 text-[10px] cursor-pointer flex items-center gap-1 transition-colors"
              title="Clic para cambiar métrica / pulsos del compás (Ripple Shift)"
            >
              <span>C.{compas.id || mIdx + 1}</span>
              <Sliders className="w-2.5 h-2.5 text-stone-400 hover:text-amber-700" />
            </button>
          ) : (
            <span className="font-mono font-black text-stone-700 text-[10px]">
              C.{compas.id || mIdx + 1}
            </span>
          )}
          {isSynced ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-900 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-300 shadow-2xs"
              title={`Compás sincronizado con video @ ${compas.secTime}s`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>@{compas.secTime}s</span>
            </span>
          ) : (
            <span className="text-[9px] font-mono text-stone-400" title="Compás relativo (sin timestamp)">
              --
            </span>
          )}
        </div>

        {/* Pulse Subdivision Row */}
        <div className="flex items-center divide-x divide-stone-200/80">
          {compas.acordes.map((chord, bIdx) => {
            const cellGlobalIndex = startGlobalBeatIndex + bIdx;
            return renderBeatCell(chord, bIdx + 1, cellGlobalIndex, true, compas);
          })}
        </div>
      </div>
    );
  };

  // Cerrar el modal con tecla Escape
  useEffect(() => {
    if (!editingMeasure && !editingBeatCell) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setEditingMeasure(null);
        setEditingBeatCell(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingMeasure, editingBeatCell]);

  /**
   * Modal para cambiar el acorde de un pulso específico de la BeatGrid
   */
  const renderBeatChordModal = () => {
    if (!editingBeatCell) return null;
    if (typeof document === 'undefined' || !document.body) return null;

    const applyChordToBeat = (newChord) => {
      if (onUpdateChord) {
        onUpdateChord(editingBeatCell.cellGlobalIndex, newChord);
      }
      setEditingBeatCell(null);
    };

    const availableChords = Array.from(
      new Set([...(uniqueChords || []), ...(flatChords || []).filter((c) => c && c !== '𝄾' && c !== '𝄽')])
    );

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
        onClick={() => setEditingBeatCell(null)}
      >
        <div
          className="relative w-full max-w-xs bg-[#fcfaf6] rounded-2xl border-2 border-stone-300 shadow-2xl p-4.5 space-y-3.5 paper-texture animate-in fade-in zoom-in-95 duration-150 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <Music2 className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-stone-900 font-sans">
                  Editar Pulso #{editingBeatCell.beatNum}
                </h4>
                <p className="text-[10px] text-stone-500 font-mono">
                  {editingBeatCell.measure?.seccion || 'Tema'} • Compás #{editingBeatCell.measure?.id || 1}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingBeatCell(null)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Song Chords Quick Grid */}
          {availableChords.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Acordes de la canción
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {availableChords.map((c) => {
                  const isCurrent = editingBeatCell.currentChord === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyChordToBeat(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white hover:bg-amber-50 text-stone-800 border-stone-200'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Chord Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customBeatChordInput.trim()) {
                applyChordToBeat(customBeatChordInput.trim());
              }
            }}
            className="space-y-1.5 pt-1 border-t border-stone-200/60"
          >
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Otro acorde personalizado
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customBeatChordInput}
                onChange={(e) => setCustomBeatChordInput(e.target.value)}
                placeholder="Ej: F#m7, Bbmaj7..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-800 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!customBeatChordInput.trim()}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors"
              >
                Aplicar
              </button>
            </div>
          </form>

          {/* Silence / Clear Beat Action */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60">
            <button
              type="button"
              onClick={() => applyChordToBeat('𝄾')}
              className="w-full py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-[11px] font-bold font-sans cursor-pointer transition-colors"
            >
              𝄾 Marcar como Silencio / Vaciar pulso
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  /**
   * Modal / Popover para cambiar la métrica y duración del compás, sección o canción completa
   */
  const renderMeasureModal = () => {
    if (!editingMeasure) return null;
    if (typeof document === 'undefined' || !document.body) return null;
    const currentLen = editingMeasure.compas.acordes?.length || 4;
    const sectionName = editingMeasure.compas.seccion || 'Tema';

    const scopeOptions = [
      { id: 'single', label: 'Solo este compás', desc: 'Ajusta este compás con Ripple Shift' },
      { id: 'section', label: `Sección (${sectionName})`, desc: 'Cambia métrica de esta sección' },
      { id: 'from_here', label: 'Desde aquí al final', desc: 'Reagrupa desde este compás en adelante' },
      { id: 'all', label: 'Toda la canción', desc: 'Reagrupa toda la canción en esta métrica' },
    ];

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
        onClick={() => setEditingMeasure(null)}
      >
        <div
          className="relative w-full max-w-xs bg-[#fcfaf6] rounded-2xl border-2 border-stone-300 shadow-2xl p-4.5 space-y-3.5 paper-texture animate-in fade-in zoom-in-95 duration-150 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <Sliders className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-stone-900 font-sans">
                  Compás #{editingMeasure.compas.id || editingMeasure.measureIdx + 1}
                </h4>
                <p className="text-[10px] text-stone-500 font-mono">
                  {sectionName} • {currentLen} tiempos
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingMeasure(null)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alcance del cambio de métrica */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Aplicar a
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {scopeOptions.map((opt) => {
                const isSelected = measureScope === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMeasureScope(opt.id)}
                    title={opt.desc}
                    className={`px-2 py-1.5 rounded-lg text-left border text-[10px] font-sans font-bold transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-amber-800 text-amber-50 border-amber-900 shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200/70 border-stone-200 text-stone-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metric Presets */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Seleccionar Métrica
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { len: 4, label: '4/4', sub: '4 tiempos' },
                { len: 3, label: '3/4', sub: '3 tiempos' },
                { len: 2, label: '2/4', sub: '2 tiempos' },
                { len: 6, label: '6/8', sub: '6 tiempos' },
              ].map((preset) => {
                const isCurrent = currentLen === preset.len && measureScope === 'single';
                return (
                  <button
                    key={preset.len}
                    type="button"
                    onClick={() => {
                      if (onChangeMeasureLength) {
                        onChangeMeasureLength(editingMeasure.measureIdx, preset.len, measureScope);
                      }
                      setEditingMeasure(null);
                    }}
                    className={`p-2 rounded-xl text-left border text-xs font-sans font-bold transition-all flex flex-col justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-300'
                        : 'bg-white hover:bg-amber-50/60 border-stone-200 text-stone-800'
                    }`}
                  >
                    <span className="font-mono text-xs font-black">{preset.label}</span>
                    <span className="text-[9px] font-normal text-stone-500">{preset.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine Adjustment +/- 1 tiempo */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
            <span className="text-[10px] font-sans font-semibold text-stone-600">
              Ajuste fino:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (currentLen > 1 && onChangeMeasureLength) {
                    onChangeMeasureLength(editingMeasure.measureIdx, currentLen - 1, measureScope);
                  }
                  setEditingMeasure(null);
                }}
                disabled={currentLen <= 1}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Minus className="w-3 h-3 text-stone-500" />
                <span>-1 T</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onChangeMeasureLength) {
                    onChangeMeasureLength(editingMeasure.measureIdx, currentLen + 1, measureScope);
                  }
                  setEditingMeasure(null);
                }}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3 h-3 text-amber-700" />
                <span>+1 T</span>
              </button>
            </div>
          </div>

          {/* Scope / Ripple Shift info card */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2 flex items-start gap-2">
            <span className="text-amber-600 text-xs mt-0.5">⚡</span>
            <p className="text-[10px] text-amber-900 leading-tight">
              {measureScope === 'all' && (
                <>
                  <strong>Toda la canción:</strong> Reagrupa todos los pulsos en la métrica elegida conservando tiempos del video y secciones.
                </>
              )}
              {measureScope === 'section' && (
                <>
                  <strong>Por sección:</strong> Reagrupa solo <em>{sectionName}</em> en esta métrica sin alterar las demás secciones.
                </>
              )}
              {measureScope === 'from_here' && (
                <>
                  <strong>Desde aquí:</strong> Reagrupa desde el compás #{editingMeasure.measureIdx + 1} hasta el final de la canción.
                </>
              )}
              {measureScope === 'single' && (
                <>
                  <strong>Ripple Shift:</strong> Cambia solo este compás y desplaza los pulsos hacia adelante manteniendo sincronizado el video.
                </>
              )}
            </p>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (!compases || compases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-stone-100/60 rounded-2xl border-2 border-dashed border-stone-300 text-stone-500 text-center space-y-2">
        <Disc3 className="w-8 h-8 text-stone-400 animate-spin-slow" />
        <span className="text-xs font-sans font-bold">Sin compases rítmicos generados</span>
        <span className="text-[11px] text-stone-400 max-w-xs">
          La grilla se genera automáticamente a partir de los acordes de la letra o sincronizaciones de YouTube.
        </span>
      </div>
    );
  }

  // ================= HORIZONTAL SCROLLING RIBBON MODE =================
  if (mode === 'ribbon') {
    return (
      <div className="space-y-2 w-full">
        {renderMeasureModal()}
        {renderBeatChordModal()}
        {/* Ribbon Horizontal Track */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-[#1a120c] p-2.5 sm:p-3 border-2 border-amber-950/60 shadow-2xl">
          {/* Fixed Center Playhead Needle Indicator with Interactive Drag Scrubber */}
          <div
            onPointerDown={handleMarkerPointerDown}
            onPointerMove={handleMarkerPointerMove}
            onPointerUp={handleMarkerPointerUp}
            onPointerCancel={handleMarkerPointerUp}
            className={`
              absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-12 z-30
              flex flex-col items-center justify-between
              cursor-ew-resize select-none touch-none group
              ${isDraggingMarker ? 'cursor-grabbing' : ''}
            `}
            title="Arrastra para avanzar o retroceder compases"
            aria-label="Marcador rítmico: arrastra para avanzar o retroceder"
          >
            {/* Top Diamond Handle */}
            <div
              className={`
                w-4 h-4 -mt-1 bg-amber-400 rotate-45 rounded-xs shadow-md
                transition-transform duration-150
                group-hover:scale-125 group-hover:bg-amber-300 group-hover:shadow-[0_0_10px_rgba(251,191,36,1)]
                ${isDraggingMarker ? 'scale-125 bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)]' : ''}
              `}
            />

            {/* Vertical Golden Needle Line */}
            <div
              className={`
                w-0.5 flex-1 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]
                transition-all duration-150
                group-hover:w-1 group-hover:bg-amber-300 group-hover:shadow-[0_0_12px_rgba(251,191,36,1)]
                ${isDraggingMarker ? 'w-1 bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,1)]' : ''}
              `}
            />

            {/* Bottom Diamond Handle */}
            <div
              className={`
                w-4 h-4 -mb-1 bg-amber-400 rotate-45 rounded-xs shadow-md
                transition-transform duration-150
                group-hover:scale-125 group-hover:bg-amber-300 group-hover:shadow-[0_0_10px_rgba(251,191,36,1)]
                ${isDraggingMarker ? 'scale-125 bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)]' : ''}
              `}
            />
          </div>

          {/* Left / Right Ambient Vignettes */}
          <div className="absolute top-0 bottom-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-[#1a120c] to-transparent z-20 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#1a120c] to-transparent z-20 pointer-events-none" />

          {/* Scrollable Ribbon Track */}
          <div
            ref={ribbonScrollRef}
            className={`flex items-center gap-3 overflow-x-auto py-2 px-[50%] scrollbar-none ${
              isDraggingMarker ? 'scroll-auto' : 'scroll-smooth'
            }`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {sectionGroups.map((group, gIdx) => {
              const style = getSectionStyles(group.name);
              return (
                <div
                  key={`${group.name}_${gIdx}`}
                  className={`flex flex-col gap-1.5 flex-shrink-0 p-2 rounded-2xl border shadow-inner ${style.ribbonContainer}`}
                >
                  {/* Unified Section Header Banner */}
                  <div className="flex items-center justify-between px-1.5 py-0.5 select-none">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-serif font-bold uppercase tracking-wider shadow-2xs ${style.badge}`}
                    >
                      {group.name}
                    </span>
                    <span className="text-[9px] font-mono text-stone-400">
                      {group.measures.length} {group.measures.length === 1 ? 'compás' : 'compases'}
                    </span>
                  </div>

                  {/* Measures row for this section */}
                  <div className="flex items-center gap-2 flex-1">
                    {group.measures.map((measure) =>
                      renderRibbonMeasure(measure, measure.globalIndex)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ================= FULL SECTION GRID MODE =================
  return (
    <div className="space-y-4 max-h-[380px] xl:max-h-[440px] overflow-y-auto pr-1">
      {renderMeasureModal()}
      {renderBeatChordModal()}
      {sectionGroups.map((group, gIdx) => {
        const style = getSectionStyles(group.name);
        const sectionDefaultBeats =
          group.measures[group.measures.length - 1]?.acordes?.length || beatsPerMeasure || 4;
        return (
          <div
            key={`${group.name}_${gIdx}`}
            className={`p-3 rounded-2xl border shadow-xs space-y-2.5 ${style.card}`}
          >
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded-md border text-[11px] font-serif font-bold uppercase tracking-wider shadow-2xs ${style.badge}`}
              >
                {group.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-stone-400 font-semibold">
                  {group.measures.length} {group.measures.length === 1 ? 'compás' : 'compases'}
                </span>
                {isEditMode && onAddMeasure && (
                  <button
                    type="button"
                    onClick={() => onAddMeasure(group.name, sectionDefaultBeats)}
                    className="px-2 py-0.5 bg-white hover:bg-stone-100 text-stone-700 rounded border border-stone-300 text-[10px] font-bold font-sans cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                    title={`Añadir un compás de ${sectionDefaultBeats} tiempos a esta sección`}
                  >
                    <Plus className="w-3 h-3 text-amber-700" />
                    <span>Compás</span>
                  </button>
                )}
              </div>
            </div>

            {/* Measures Grid inside Section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {group.measures.map((measure) => (
                <div
                  key={measure.globalIndex}
                  className="p-1.5 bg-white/95 rounded-xl border border-stone-200 shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-stone-400 px-0.5">
                    {isEditMode && onChangeMeasureLength ? (
                      <button
                        type="button"
                        onClick={() => setEditingMeasure({ measureIdx: measure.globalIndex, compas: measure })}
                        className="font-mono font-black text-stone-700 hover:text-amber-900 hover:bg-amber-100/80 rounded px-1 -mx-1 text-[9px] cursor-pointer flex items-center gap-1 transition-colors"
                        title="Clic para cambiar métrica / pulsos del compás (Ripple Shift)"
                      >
                        <span>Compás {measure.id || measure.globalIndex + 1}</span>
                        <Sliders className="w-2.5 h-2.5 text-stone-400 hover:text-amber-700" />
                      </button>
                    ) : (
                      <span>Compás {measure.id || measure.globalIndex + 1}</span>
                    )}
                    {measure.secTime !== null && measure.secTime !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-900 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-300 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>@{measure.secTime}s</span>
                      </span>
                    ) : isEditMode && onSetTimestamp && currentTime !== null ? (
                      <button
                        type="button"
                        onClick={() => onSetTimestamp(measure.globalIndex, currentTime)}
                        className="text-amber-700 hover:text-amber-900 font-bold text-[9px] underline cursor-pointer"
                        title="Marcar tiempo actual del video en este compás"
                      >
                        ⏱️ Tap
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    {measure.acordes.map((chord, bIdx) => {
                      const startBeat =
                        measureBeatOffsets[measure.globalIndex] ??
                        measure.globalIndex * beatsPerMeasure;
                      const cellGlobalIndex = startBeat + bIdx;
                      return renderBeatCell(chord, bIdx + 1, cellGlobalIndex, false, measure);
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
