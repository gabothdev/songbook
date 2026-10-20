import React from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * LinePrefixChords
 * Renders pickup / intro chords before the lyric phrase in a clean column format
 * matching the visualizer, without displacing text horizontally.
 */
export function LinePrefixChords({
  secIdx,
  lineIdx,
  prefixChords = [],
  prefixChordRanks = [],
  activeChordRank = -1,
  isChordLineActive = false,
  activeStampChord,
  onAddPrefixChord,
  onRemovePrefixChord,
  onNudgeChord = null,
  onOpenPicker,
  onNavigateChord = null,
  isSectionSynced = false,
}) {
  const handleSlotClick = () => {
    if (activeStampChord) {
      onAddPrefixChord(secIdx, lineIdx, activeStampChord);
    } else {
      onOpenPicker({ secIdx, lineIdx, isPrefix: true });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.chord) {
          onAddPrefixChord(secIdx, lineIdx, data.chord, data);
          return;
        }
      }
    } catch (err) {}
    const textChord = e.dataTransfer.getData('text/plain');
    if (textChord && textChord.trim()) {
      onAddPrefixChord(secIdx, lineIdx, textChord.trim());
    }
  };

  return (
    <div className="inline-flex items-end flex-shrink-0 mr-1.5 select-none">
      {/* Existing prefix chords rendered as vertical column (chord top, indent bottom) */}
      {prefixChords.map((item, pIdx) => {
        const chordRank = prefixChordRanks[pIdx] ?? -1;
        const isChordActive = isChordLineActive && chordRank >= 0 && chordRank === activeChordRank;

        return (
          <div
            key={item.id}
            className="inline-flex flex-col items-start justify-end flex-shrink-0 mr-1.5 group/chord"
          >
            {/* Top Row: Clean Chord Badge */}
            <div className="h-5 flex items-center mb-0.5">
              <div
                draggable
                onClick={() => {
                  if (!activeStampChord && onNavigateChord) {
                    onNavigateChord(item.chord, chordRank, pIdx);
                  }
                }}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({
                      chord: item.chord,
                      sourcePrefixId: item.id,
                      sourceSecIdx: secIdx,
                      sourceLineIdx: lineIdx,
                    })
                  );
                  e.dataTransfer.setData('text/plain', item.chord);
                }}
                className={`inline-flex items-center gap-0.5 font-mono font-bold text-xs px-1.5 py-0.5 rounded shadow-xs cursor-pointer active:cursor-grabbing transition-all hover:scale-105 hover:z-20 ${
                  isChordActive
                    ? 'bg-amber-500 text-amber-950 ring-2 ring-amber-600 shadow-md scale-110 z-10 font-black'
                    : isSectionSynced
                    ? 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400/80'
                    : 'text-stone-700 bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400'
                }`}
                title={`Clic para ir al pulso de [${item.chord}] en BeatGrid y video • Arrastra o usa ◀ ▶ para mover`}
              >
                {onNudgeChord && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNudgeChord(secIdx, lineIdx, 'prefix', pIdx, -1);
                    }}
                    className="hidden group-hover/chord:inline-flex items-center justify-center hover:text-amber-900 hover:bg-amber-400/50 rounded px-0.5 cursor-pointer"
                    title="Correr acorde a la izquierda (◀)"
                  >
                    <ChevronLeft className="w-2.5 h-2.5" />
                  </button>
                )}
                <span>{item.chord}</span>
                {isSectionSynced && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-2xs flex-shrink-0"
                    title="Sincronizado"
                  />
                )}
                {onNudgeChord && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNudgeChord(secIdx, lineIdx, 'prefix', pIdx, 1);
                    }}
                    className="hidden group-hover/chord:inline-flex items-center justify-center hover:text-amber-900 hover:bg-amber-400/50 rounded px-0.5 cursor-pointer"
                    title="Correr acorde hacia la letra (▶)"
                  >
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePrefixChord(secIdx, lineIdx, item.id);
                  }}
                  className="hidden group-hover/chord:inline-flex items-center justify-center hover:text-rose-700 cursor-pointer ml-0.5 p-0.2"
                  title="Quitar acorde previo"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            {/* Bottom Row: Invisible spacer keeping exact baseline alignment */}
            <div className="font-sans text-sm whitespace-pre leading-snug invisible select-none">
              {item.chord.length > 3 ? '   ' : '  '}
            </div>
          </div>
        );
      })}

      {/* Discrete Hover-Only Drop / Add Slot for Prefix Chords */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="inline-flex flex-col items-start justify-end flex-shrink-0 mr-1"
      >
        <div className="h-5 flex items-center mb-0.5">
          <button
            type="button"
            onClick={handleSlotClick}
            className={`h-4 min-w-[20px] px-1 rounded flex items-center justify-center transition-all cursor-pointer ${
              activeStampChord
                ? 'opacity-80 group-hover/line:opacity-100 bg-amber-100/80 border border-dashed border-amber-400 text-amber-900 scale-105'
                : 'opacity-0 group-hover/line:opacity-100 border border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/70 text-amber-800'
            }`}
            title={
              activeStampChord
                ? `Estampar [${activeStampChord}] antes de la frase`
                : 'Añadir acorde antes de que empiece la frase'
            }
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="font-sans text-sm whitespace-pre leading-snug invisible select-none">
          &nbsp;
        </div>
      </div>
    </div>
  );
}

/**
 * LineSuffixChords
 * Renders suffix / outro chords after the lyric phrase in a clean column format.
 */
export function LineSuffixChords({
  secIdx,
  lineIdx,
  suffixChords = [],
  suffixChordRanks = [],
  activeChordRank = -1,
  isChordLineActive = false,
  activeStampChord,
  onAddSuffixChord,
  onRemoveSuffixChord,
  onNudgeChord = null,
  onOpenPicker,
  onNavigateChord = null,
  isSectionSynced = false,
}) {
  const handleSlotClick = () => {
    if (activeStampChord) {
      onAddSuffixChord(secIdx, lineIdx, activeStampChord);
    } else {
      onOpenPicker({ secIdx, lineIdx, isSuffix: true });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.chord) {
          onAddSuffixChord(secIdx, lineIdx, data.chord, data);
          return;
        }
      }
    } catch (err) {}
    const textChord = e.dataTransfer.getData('text/plain');
    if (textChord && textChord.trim()) {
      onAddSuffixChord(secIdx, lineIdx, textChord.trim());
    }
  };

  return (
    <div className="inline-flex items-end flex-shrink-0 ml-1.5 select-none">
      {/* Discrete Hover-Only Drop / Add Slot for Suffix Chords */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="inline-flex flex-col items-start justify-end flex-shrink-0 mr-1"
      >
        <div className="h-5 flex items-center mb-0.5">
          <button
            type="button"
            onClick={handleSlotClick}
            className={`h-4 min-w-[20px] px-1 rounded flex items-center justify-center transition-all cursor-pointer ${
              activeStampChord
                ? 'opacity-80 group-hover/line:opacity-100 bg-amber-100/80 border border-dashed border-amber-400 text-amber-900 scale-105'
                : 'opacity-0 group-hover/line:opacity-100 border border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/70 text-amber-800'
            }`}
            title={
              activeStampChord
                ? `Estampar [${activeStampChord}] al final de la frase`
                : 'Añadir acorde al final de la frase'
            }
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="font-sans text-sm whitespace-pre leading-snug invisible select-none">
          &nbsp;
        </div>
      </div>

      {/* Existing suffix chords */}
      {suffixChords.map((item, sIdx) => {
        const chordRank = suffixChordRanks[sIdx] ?? -1;
        const isChordActive = isChordLineActive && chordRank >= 0 && chordRank === activeChordRank;

        return (
          <div
            key={item.id}
            className="inline-flex flex-col items-start justify-end flex-shrink-0 mr-1.5 group/chord"
          >
            {/* Top Row: Clean Chord Badge */}
            <div className="h-5 flex items-center mb-0.5">
              <div
                draggable
                onClick={() => {
                  if (!activeStampChord && onNavigateChord) {
                    onNavigateChord(item.chord, chordRank, sIdx);
                  }
                }}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({
                      chord: item.chord,
                      sourceSuffixId: item.id,
                      sourceSecIdx: secIdx,
                      sourceLineIdx: lineIdx,
                    })
                  );
                  e.dataTransfer.setData('text/plain', item.chord);
                }}
                className={`inline-flex items-center gap-0.5 font-mono font-bold text-xs px-1.5 py-0.5 rounded shadow-xs cursor-pointer active:cursor-grabbing transition-all hover:scale-105 hover:z-20 ${
                  isChordActive
                    ? 'bg-amber-500 text-amber-950 ring-2 ring-amber-600 shadow-md scale-110 z-10 font-black'
                    : isSectionSynced
                    ? 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400/80'
                    : 'text-stone-700 bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400'
                }`}
                title={`Clic para ir al pulso de [${item.chord}] en BeatGrid y video • Arrastra o usa ◀ ▶ para mover`}
              >
                {onNudgeChord && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNudgeChord(secIdx, lineIdx, 'suffix', sIdx, -1);
                    }}
                    className="hidden group-hover/chord:inline-flex items-center justify-center hover:text-amber-900 hover:bg-amber-400/50 rounded px-0.5 cursor-pointer"
                    title="Correr acorde hacia la última palabra (◀)"
                  >
                    <ChevronLeft className="w-2.5 h-2.5" />
                  </button>
                )}
                <span>{item.chord}</span>
                {isSectionSynced && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-2xs flex-shrink-0"
                    title="Sincronizado"
                  />
                )}
                {onNudgeChord && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNudgeChord(secIdx, lineIdx, 'suffix', sIdx, 1);
                    }}
                    className="hidden group-hover/chord:inline-flex items-center justify-center hover:text-amber-900 hover:bg-amber-400/50 rounded px-0.5 cursor-pointer"
                    title="Correr acorde a la derecha (▶)"
                  >
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSuffixChord(secIdx, lineIdx, item.id);
                  }}
                  className="hidden group-hover/chord:inline-flex items-center justify-center hover:text-rose-700 cursor-pointer ml-0.5 p-0.2"
                  title="Quitar acorde final"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            {/* Bottom Row: Invisible spacer */}
            <div className="font-sans text-sm whitespace-pre leading-snug invisible select-none">
              {item.chord.length > 3 ? '   ' : '  '}
            </div>
          </div>
        );
      })}
    </div>
  );
}
