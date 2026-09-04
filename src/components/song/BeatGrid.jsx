import React, { useEffect, useRef, useMemo } from 'react';
import { Disc3 } from 'lucide-react';

/**
 * BeatGrid Component for SongBook
 * Visualizes the song structure in measures and beats (similar to Chordify / ChordBook).
 * Supports variable measure lengths (e.g. 2-beat intro bars, 3/4, 4/4),
 * full section 'grid' mode and horizontal scrolling 'ribbon' mode with vintage studio aesthetics.
 */
export default function BeatGrid({
  compases = [],
  currentBeatIndex = -1,
  beatsPerMeasure = 4,
  onBeatClick = null,
  mode = 'ribbon', // 'ribbon' | 'grid'
  transpose = 0,
}) {
  const activeCellRef = useRef(null);

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

  // Auto-scroll the horizontal ribbon to keep the active beat centered
  useEffect(() => {
    if (mode === 'ribbon' && activeCellRef.current) {
      activeCellRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentBeatIndex, mode]);

  // Group measures by section name for the full grid view
  const sections = useMemo(() => {
    return compases.reduce((acc, measure, index) => {
      const seccion = measure.seccion || 'Tema';
      if (!acc[seccion]) {
        acc[seccion] = [];
      }
      acc[seccion].push({ ...measure, globalIndex: index });
      return acc;
    }, {});
  }, [compases]);

  const getSectionStyles = (sectionName) => {
    const name = (sectionName || '').toLowerCase();
    if (name.includes('intro')) {
      return {
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        ribbonBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        card: 'bg-amber-50/40 border-amber-200/70',
      };
    }
    if (name.includes('estrofa') || name.includes('verso') || name.includes('verse')) {
      return {
        badge: 'bg-stone-200 text-stone-900 border-stone-300',
        ribbonBadge: 'bg-stone-700/50 text-stone-300 border-stone-600',
        card: 'bg-white/70 border-stone-200',
      };
    }
    if (name.includes('estribillo') || name.includes('chorus') || name.includes('coro')) {
      return {
        badge: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        ribbonBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        card: 'bg-emerald-50/30 border-emerald-200/70',
      };
    }
    if (name.includes('solo') || name.includes('puente') || name.includes('bridge')) {
      return {
        badge: 'bg-rose-100 text-rose-950 border-rose-300',
        ribbonBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        card: 'bg-rose-50/30 border-rose-200',
      };
    }
    return {
      badge: 'bg-stone-100 text-stone-800 border-stone-300',
      ribbonBadge: 'bg-stone-800 text-stone-300 border-stone-700',
      card: 'bg-white/60 border-stone-200',
    };
  };

  /**
   * Renders a single beat cell (time 1, 2, 3, or 4)
   */
  const renderBeatCell = (chord, beatNum, cellGlobalIndex, isRibbon = false) => {
    const isActive = cellGlobalIndex === currentBeatIndex;
    const isRest = chord === '𝄾' || chord === '𝄽' || !chord;

    // Deduplicate continuous repeated chords across consecutive beats
    const isDuplicate =
      cellGlobalIndex > 0 &&
      chord &&
      !isRest &&
      chord === flatChords[cellGlobalIndex - 1];

    const displayChord = isDuplicate ? '' : chord;

    return (
      <div
        key={cellGlobalIndex}
        ref={isActive ? activeCellRef : null}
        onClick={() => onBeatClick && onBeatClick(chord, cellGlobalIndex)}
        className={`
          relative flex-1 flex flex-col items-center justify-center cursor-pointer transition-all select-none
          ${isRibbon ? 'h-14 sm:h-16 px-1' : 'aspect-square p-1 rounded-lg'}
          ${
            isActive
              ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-white font-black scale-[1.04] shadow-lg ring-2 ring-amber-300 z-20 rounded-md'
              : isRibbon
              ? 'bg-[#fcfaf6] hover:bg-amber-50/70 text-stone-900'
              : displayChord
              ? 'bg-white hover:bg-amber-50 text-stone-900 border border-stone-200/90 shadow-xs'
              : 'bg-stone-100/70 hover:bg-stone-200/60 text-stone-400 border border-dashed border-stone-200'
          }
        `}
      >
        {/* Chord Symbol or Subtle Pulse Dot */}
        {displayChord ? (
          <span
            className={`font-sans font-black tracking-tight leading-none ${
              isActive
                ? 'text-white text-sm sm:text-base scale-105'
                : 'text-stone-900 text-xs sm:text-sm font-bold'
            }`}
          >
            {displayChord}
          </span>
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
   * Renders a measure card (variable beats, e.g. 2-beat intro bar or 4-beat bar) in Ribbon mode
   */
  const renderRibbonMeasure = (compas, mIdx) => {
    const sectionStyle = getSectionStyles(compas.seccion);
    const startGlobalBeatIndex = measureBeatOffsets[mIdx] ?? (mIdx * beatsPerMeasure);
    const numBeats = compas.acordes?.length || beatsPerMeasure;
    const isMeasureActive =
      currentBeatIndex >= startGlobalBeatIndex &&
      currentBeatIndex < startGlobalBeatIndex + numBeats;

    const widthClass =
      numBeats === 1
        ? 'w-16 sm:w-20'
        : numBeats === 2
        ? 'w-24 sm:w-28'
        : numBeats === 3
        ? 'w-36 sm:w-40'
        : 'w-44 sm:w-48';

    return (
      <div
        key={compas.id || mIdx}
        className={`
          flex-shrink-0 ${widthClass} rounded-xl overflow-hidden shadow-sm border transition-all
          ${
            isMeasureActive
              ? 'border-amber-500 shadow-md ring-1 ring-amber-400/40 bg-white'
              : 'border-stone-300/90 bg-[#faf7f2]'
          }
        `}
      >
        {/* Measure Header */}
        <div className="bg-[#ede7df] px-2 py-1 border-b border-stone-300/80 flex items-center justify-between text-[10px] select-none">
          <span className="font-mono font-black text-stone-700">
            C.{compas.id || mIdx + 1}
          </span>
          {compas.seccion && (
            <span
              className={`px-1.5 py-0.2 rounded border text-[9px] font-sans font-bold uppercase tracking-wider ${sectionStyle.badge}`}
            >
              {compas.seccion}
            </span>
          )}
        </div>

        {/* Beat Cells with Hairline Dividers */}
        <div className="flex divide-x divide-stone-200/80 bg-[#fcfaf6]">
          {compas.acordes.map((ch, bIdx) => {
            const globalBeatIdx = startGlobalBeatIndex + bIdx;
            return renderBeatCell(ch, bIdx + 1, globalBeatIdx, true);
          })}
        </div>
      </div>
    );
  };

  if (compases.length === 0) {
    return (
      <div className="py-12 text-center bg-white/60 rounded-2xl border border-dashed border-stone-300 p-6 text-stone-500 font-sans text-xs">
        <Disc3 className="w-8 h-8 mx-auto mb-2 text-stone-400 animate-spin" />
        <p className="font-bold text-stone-700">Calculando Grilla Rítmica...</p>
        <p className="text-[11px] text-stone-400 mt-1">
          La grilla se genera automáticamente con los acordes de la canción.
        </p>
      </div>
    );
  }

  // ================= HORIZONTAL RIBBON MODE =================
  if (mode === 'ribbon') {
    return (
      <div className="relative w-full">
        {/* Centered Playhead Arrow / Indicator */}
        <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-amber-600 drop-shadow-xs" />
        </div>

        {/* Ribbon Track Container */}
        <div className="w-full bg-[#201813] p-3 rounded-2xl border border-[#3e2c22] shadow-inner overflow-x-auto custom-scrollbar scroll-smooth">
          <div className="flex items-center gap-2.5 min-w-max px-2">
            {compases.map((compas, mIdx) => renderRibbonMeasure(compas, mIdx))}
          </div>
        </div>
      </div>
    );
  }

  // ================= FULL SECTION GRID MODE =================
  return (
    <div className="space-y-4 max-h-[380px] xl:max-h-[440px] overflow-y-auto pr-1">
      {Object.entries(sections).map(([sectionName, sectionMeasures]) => {
        const style = getSectionStyles(sectionName);
        return (
          <div
            key={sectionName}
            className={`p-3 rounded-2xl border shadow-xs space-y-2.5 ${style.card}`}
          >
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded-md border text-[11px] font-serif font-bold uppercase tracking-wider shadow-2xs ${style.badge}`}
              >
                {sectionName}
              </span>
              <span className="text-[10px] font-mono text-stone-400 font-semibold">
                {sectionMeasures.length} compases
              </span>
            </div>

            {/* Measures Grid inside Section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sectionMeasures.map((measure) => (
                <div
                  key={measure.globalIndex}
                  className="p-1.5 bg-white/95 rounded-xl border border-stone-200 shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-stone-400 px-0.5">
                    <span>Compás {measure.id || measure.globalIndex + 1}</span>
                    {measure.secTime !== null && measure.secTime !== undefined && (
                      <span className="text-amber-800 font-bold">{measure.secTime}s</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {measure.acordes.map((chord, bIdx) => {
                      const startBeat = measureBeatOffsets[measure.globalIndex] ?? (measure.globalIndex * beatsPerMeasure);
                      const cellGlobalIndex = startBeat + bIdx;
                      return renderBeatCell(chord, bIdx + 1, cellGlobalIndex, false);
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
