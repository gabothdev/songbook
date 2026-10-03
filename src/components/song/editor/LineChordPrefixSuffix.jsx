import React from 'react';
import { Plus, X } from 'lucide-react';

/**
 * LinePrefixChords
 * Renders pickup / intro chords before the lyric phrase in a clean column format
 * matching the visualizer, without displacing text horizontally.
 */
export function LinePrefixChords({
  secIdx,
  lineIdx,
  prefixChords = [],
  activeStampChord,
  onAddPrefixChord,
  onRemovePrefixChord,
  onOpenPicker,
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
      {prefixChords.map((item) => (
        <div
          key={item.id}
          className="inline-flex flex-col items-start justify-end flex-shrink-0 mr-1.5 group/chord"
        >
          {/* Top Row: Clean Chord Badge */}
          <div className="h-5 flex items-center mb-0.5">
            <div
              draggable
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
              className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-1.5 py-0.5 rounded shadow-xs cursor-grab active:cursor-grabbing transition-transform hover:scale-105 ${
                isSectionSynced
                  ? 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400/80'
                  : 'text-stone-700 bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400'
              }`}
              title={
                isSectionSynced
                  ? `Acorde previo [${item.chord}] sincronizado con timestamp. Arrastra para mover o clic en la cruz para quitar.`
                  : `Acorde previo [${item.chord}] sin timestamp (modo libre). Arrastra para mover o clic en la cruz para quitar.`
              }
            >
              <span>{item.chord}</span>
              {isSectionSynced && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-2xs flex-shrink-0"
                  title="Sincronizado"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePrefixChord(secIdx, lineIdx, item.id);
                }}
                className="opacity-0 group-hover/chord:opacity-100 hover:text-rose-700 cursor-pointer ml-0.5 p-0.2"
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
      ))}

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
  activeStampChord,
  onAddSuffixChord,
  onRemoveSuffixChord,
  onOpenPicker,
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
      {suffixChords.map((item) => (
        <div
          key={item.id}
          className="inline-flex flex-col items-start justify-end flex-shrink-0 mr-1.5 group/chord"
        >
          {/* Top Row: Clean Chord Badge */}
          <div className="h-5 flex items-center mb-0.5">
            <div
              draggable
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
              className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-1.5 py-0.5 rounded shadow-xs cursor-grab active:cursor-grabbing transition-transform hover:scale-105 ${
                isSectionSynced
                  ? 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400/80'
                  : 'text-stone-700 bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400'
              }`}
              title={
                isSectionSynced
                  ? `Acorde final [${item.chord}] sincronizado con timestamp. Arrastra para mover o clic en la cruz para quitar.`
                  : `Acorde final [${item.chord}] sin timestamp (modo libre). Arrastra para mover o clic en la cruz para quitar.`
              }
            >
              <span>{item.chord}</span>
              {isSectionSynced && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-2xs flex-shrink-0"
                  title="Sincronizado"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSuffixChord(secIdx, lineIdx, item.id);
                }}
                className="opacity-0 group-hover/chord:opacity-100 hover:text-rose-700 cursor-pointer ml-0.5 p-0.2"
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
      ))}
    </div>
  );
}
