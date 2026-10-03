import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Disc3, Plus, Music2 } from 'lucide-react';

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
  currentTime = null,
}) {
  const activeCellRef = useRef(null);
  const ribbonScrollRef = useRef(null);
  const [activeDropCellIdx, setActiveDropCellIdx] = useState(null);

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

  // Auto-scroll the horizontal ribbon to keep the active beat centered using localized scroll
  useEffect(() => {
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
    const isActive = cellGlobalIndex === currentBeatIndex;
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

    return (
      <div
        key={cellGlobalIndex}
        ref={isActive ? activeCellRef : null}
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onBeatClick && onBeatClick(chord, cellGlobalIndex, measure)}
        className={`
          relative flex-1 flex flex-col items-center justify-center transition-all select-none
          ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400' : 'cursor-pointer'}
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
          isDraggable
            ? `Arrastra [${displayChord}] hacia la letra en la página izquierda`
            : isSynced
            ? `Compás sincronizado @ ${measure?.secTime}s`
            : isEditMode
            ? 'Clic para cambiar o suelta un acorde aquí'
            : undefined
        }
      >
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
          <span className="font-mono font-black text-stone-700 text-[10px]">
            C.{compas.id || mIdx + 1}
          </span>
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
        {/* Ribbon Horizontal Track */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-[#1a120c] p-2.5 sm:p-3 border-2 border-amber-950/60 shadow-2xl">
          {/* Fixed Center Playhead Needle Indicator */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.8)]">
            <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-amber-400 rotate-45 rounded-xs shadow-md" />
            <div className="absolute -bottom-1 -left-1.5 w-3.5 h-3.5 bg-amber-400 rotate-45 rounded-xs shadow-md" />
          </div>

          {/* Left / Right Ambient Vignettes */}
          <div className="absolute top-0 bottom-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-[#1a120c] to-transparent z-20 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#1a120c] to-transparent z-20 pointer-events-none" />

          {/* Scrollable Ribbon Track */}
          <div
            ref={ribbonScrollRef}
            className="flex items-center gap-3 overflow-x-auto py-2 px-[50%] scrollbar-none scroll-smooth"
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
      {sectionGroups.map((group, gIdx) => {
        const style = getSectionStyles(group.name);
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
                    onClick={() => onAddMeasure(group.name, 4)}
                    className="px-2 py-0.5 bg-white hover:bg-stone-100 text-stone-700 rounded border border-stone-300 text-[10px] font-bold font-sans cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                    title="Añadir un compás a esta sección"
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
                    <span>Compás {measure.id || measure.globalIndex + 1}</span>
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
