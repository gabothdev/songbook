import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Scissors, Link2 } from 'lucide-react';

/**
 * WordChordDropSlot
 * Renders an individual word, syllable, or whitespace with pixel-perfect visual match
 * to SongLyricsRenderer:
 * - Clean chord badge positioned directly above word.
 * - Zero layout shift when chords are added or hovered.
 * - Syllable split (✂️) and merge (🔗) tools only appear on word hover.
 * - Inline double-click word editing.
 */
export default function WordChordDropSlot({
  item,
  secIdx,
  lineIdx,
  wordIdx,
  totalWords = 0,
  activeDropWordId,
  activeStampChord,
  onDragOver,
  onDragLeave,
  onDrop,
  onAssignChord,
  onOpenPicker,
  onUpdateWordText,
  onSplitWord,
  onMergeWords,
  isHighlighted = false,
  isSectionSynced = false,
}) {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(item.text || '');
  const [isSplitMenuOpen, setIsSplitMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const splitMenuRef = useRef(null);

  useEffect(() => {
    setEditText(item.text || '');
  }, [item.text]);

  useEffect(() => {
    if (isEditingText && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingText]);

  useEffect(() => {
    if (!isSplitMenuOpen) return;
    const handleClickOutside = (e) => {
      if (splitMenuRef.current && !splitMenuRef.current.contains(e.target)) {
        setIsSplitMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSplitMenuOpen]);

  // Whitespace tokens
  if (item.type === 'space') {
    return (
      <div key={item.id || Math.random()} className="inline-flex flex-col items-start justify-end flex-shrink-0">
        <div className="h-5 flex items-center mb-0.5">
          <span className="invisible text-xs py-0.5 select-none">.</span>
        </div>
        <div className="font-sans text-sm whitespace-pre leading-snug select-none text-stone-900">
          {item.text}
        </div>
      </div>
    );
  }

  const isHoveredDrop = activeDropWordId === item.id;
  const wordText = item.text || '';
  const canSplit = wordText.trim().length >= 2;

  const handleSlotClick = () => {
    if (activeStampChord) {
      onAssignChord(secIdx, lineIdx, item.id, activeStampChord);
    } else {
      onOpenPicker({ secIdx, lineIdx, wordId: item.id });
    }
  };

  const handleWordClick = () => {
    if (activeStampChord) {
      onAssignChord(secIdx, lineIdx, item.id, activeStampChord);
    }
  };

  const handleCommitEdit = () => {
    setIsEditingText(false);
    if (editText.trim() && editText !== item.text && onUpdateWordText) {
      onUpdateWordText(secIdx, lineIdx, item.id, editText.trim());
    } else {
      setEditText(item.text || '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      setIsEditingText(false);
      setEditText(item.text || '');
    }
  };

  const handleDragStartChord = (e) => {
    if (!item.chord) return;
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    const payload = {
      chord: item.chord,
      sourceWordId: item.id,
      sourceSecIdx: secIdx,
      sourceLineIdx: lineIdx,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', item.chord);
  };

  return (
    <div
      key={item.id}
      className={`inline-flex flex-col items-start justify-end flex-shrink-0 relative group/word ${
        isHighlighted ? 'ring-2 ring-amber-400 bg-amber-100/50 rounded' : ''
      }`}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, secIdx, lineIdx, item.id)}
    >
      {/* Top Row: Clean Chord Badge (matching SongLyricsRenderer exactly) */}
      <div className="h-5 flex items-center mb-0.5 relative z-10">
        {item.chord ? (
          <div
            draggable
            onDragStart={handleDragStartChord}
            className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-1.5 py-0.5 rounded shadow-xs select-none cursor-grab active:cursor-grabbing transition-transform hover:scale-105 group/chord ${
              activeStampChord ? 'cursor-copy ring-2 ring-amber-500' : ''
            } ${
              isSectionSynced
                ? 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-400/80'
                : 'text-stone-700 bg-stone-100 hover:bg-amber-100 border border-dashed border-stone-300 hover:border-amber-400'
            }`}
            onClick={activeStampChord ? handleSlotClick : undefined}
            title={
              activeStampChord
                ? `Clic para estampar [${activeStampChord}]`
                : isSectionSynced
                ? `Acorde [${item.chord}] sincronizado con timestamp. Arrastra para mover o clic en la cruz para quitar.`
                : `Acorde [${item.chord}] sin timestamp (modo libre). Arrastra para mover o clic en la cruz para quitar.`
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
                onAssignChord(secIdx, lineIdx, item.id, null);
              }}
              className="opacity-0 group-hover/chord:opacity-100 hover:text-rose-700 cursor-pointer ml-0.5 p-0.2"
              title="Quitar acorde"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSlotClick}
            className={`h-4 min-w-[18px] px-0.5 rounded flex items-center justify-center transition-all cursor-pointer ${
              isHoveredDrop
                ? 'bg-amber-300 border-2 border-dashed border-amber-700 scale-110 shadow-sm'
                : activeStampChord
                ? 'opacity-80 group-hover/word:opacity-100 bg-amber-100/80 border border-dashed border-amber-400 text-amber-900 scale-105'
                : 'opacity-0 group-hover/word:opacity-100 border border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100/70 text-amber-800'
            }`}
            title={
              activeStampChord
                ? `Estampar acorde [${activeStampChord}]`
                : 'Asignar acorde a esta palabra o sílaba'
            }
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Bottom Row: Word / Syllable Text or Inline Text Editor */}
      <div className="relative flex items-center">
        {isEditingText ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleCommitEdit}
            onKeyDown={handleKeyDown}
            className="font-sans text-sm leading-snug px-1 py-0 bg-white border border-amber-600 rounded shadow-inner text-stone-900 focus:outline-none min-w-[30px]"
            style={{ width: `${Math.max(30, editText.length * 8 + 10)}px` }}
          />
        ) : (
          <div className="flex items-center">
            <span
              onDoubleClick={() => setIsEditingText(true)}
              onClick={handleWordClick}
              className={`font-sans text-sm whitespace-pre leading-snug text-stone-900 font-medium rounded transition-colors cursor-text select-text ${
                isHoveredDrop ? 'bg-amber-200 font-bold' : ''
              } ${
                activeStampChord ? 'hover:bg-amber-100 cursor-copy' : 'hover:bg-stone-200/40'
              }`}
              title="Doble clic para editar texto. Clic para colocar acorde."
            >
              {wordText}
            </span>

            {/* Syllable merge tool (🔗) on hover */}
            {item.isSyllable && onMergeWords && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMergeWords(secIdx, lineIdx, item.id);
                }}
                className="opacity-0 group-hover/word:opacity-100 text-stone-400 hover:text-amber-800 p-0.5 cursor-pointer"
                title="Unir con la siguiente sílaba"
              >
                <Link2 className="w-2.5 h-2.5" />
              </button>
            )}

            {/* Syllable split tool (✂️) on hover for words >= 2 chars */}
            {canSplit && !item.isSyllable && onSplitWord && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSplitMenuOpen(!isSplitMenuOpen);
                }}
                className="opacity-0 group-hover/word:opacity-100 text-stone-400 hover:text-amber-800 p-0.5 cursor-pointer transition-opacity"
                title="Dividir en sílabas"
              >
                <Scissors className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        {/* Syllable Splitter Popover */}
        {isSplitMenuOpen && canSplit && (
          <div
            ref={splitMenuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl border border-stone-300 shadow-xl p-2 paper-texture min-w-[140px] text-left select-none animate-fade-in"
          >
            <div className="text-[10px] font-mono font-bold uppercase text-stone-500 mb-1 flex items-center justify-between border-b border-stone-200 pb-1">
              <span>Dividir sílaba:</span>
              <button
                type="button"
                onClick={() => setIsSplitMenuOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 flex-wrap py-1">
              {Array.from(wordText).map((char, charIdx) => {
                const isLast = charIdx === wordText.length - 1;
                return (
                  <React.Fragment key={charIdx}>
                    <span className="font-sans font-bold text-xs text-stone-800 px-0.5">
                      {char}
                    </span>
                    {!isLast && (
                      <button
                        type="button"
                        onClick={() => {
                          onSplitWord(secIdx, lineIdx, item.id, charIdx + 1);
                          setIsSplitMenuOpen(false);
                        }}
                        className="w-3.5 h-3.5 rounded-full bg-amber-100 hover:bg-amber-400 text-amber-900 border border-amber-300 flex items-center justify-center text-[9px] font-mono cursor-pointer transition-all hover:scale-125"
                        title={`Dividir aquí: "${wordText.slice(0, charIdx + 1)}" | "${wordText.slice(charIdx + 1)}"`}
                      >
                        •
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
