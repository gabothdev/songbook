import React, { useState } from 'react';
import { X, Check, Music2 } from 'lucide-react';

/**
 * QuickChordPickerModal
 * Modal to pick a chord from the song's existing chords, pick musical rests, or type an arbitrary one
 * when clicking a '+' slot (word, prefix, suffix, or instrumental).
 */
export default function QuickChordPickerModal({
  selectedWord,
  uniqueChords = [],
  onAssignChord,
  onAddPrefixChord,
  onAddSuffixChord,
  onClose,
}) {
  const [customChordInput, setCustomChordInput] = useState('');

  if (!selectedWord) return null;

  const isPrefix = Boolean(selectedWord.isPrefix);
  const isSuffix = Boolean(selectedWord.isSuffix);

  const handleSelectChord = (chord) => {
    if (isPrefix && onAddPrefixChord) {
      onAddPrefixChord(selectedWord.secIdx, selectedWord.lineIdx, chord);
    } else if (isSuffix && onAddSuffixChord) {
      onAddSuffixChord(selectedWord.secIdx, selectedWord.lineIdx, chord);
    } else if (onAssignChord) {
      onAssignChord(
        selectedWord.secIdx,
        selectedWord.lineIdx,
        selectedWord.wordId,
        chord
      );
    }
    onClose();
  };

  const handleSubmitCustom = (e) => {
    e.preventDefault();
    if (customChordInput.trim()) {
      handleSelectChord(customChordInput.trim());
      setCustomChordInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xs bg-white rounded-2xl border border-stone-300 p-4 shadow-2xl space-y-3 paper-texture select-none">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <span className="text-xs font-bold font-sans text-stone-800 flex items-center gap-1.5">
            <Music2 className="w-3.5 h-3.5 text-amber-700" />
            <span>
              {isPrefix
                ? 'Acorde Previo (Entrada):'
                : isSuffix
                ? 'Acorde Final (Salida):'
                : 'Seleccionar Acorde:'}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of song's unique chords */}
        {uniqueChords.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
              Acordes de la canción:
            </span>
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {uniqueChords.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleSelectChord(ch)}
                  className="p-1.5 bg-stone-100 hover:bg-amber-100 text-amber-950 rounded-lg text-xs font-mono font-bold border border-stone-200 transition-colors cursor-pointer text-center"
                >
                  [{ch}]
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Musical Rests */}
        <div className="pt-1 border-t border-stone-200/60">
          <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold block mb-1">
            Silencios rítmicos:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectChord('𝄾')}
              className="flex-1 py-1 bg-stone-50 hover:bg-amber-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-mono cursor-pointer transition-colors"
              title="Silencio de compás"
            >
              𝄾 (Silencio)
            </button>
            <button
              type="button"
              onClick={() => handleSelectChord('N.C.')}
              className="flex-1 py-1 bg-stone-50 hover:bg-amber-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-mono cursor-pointer transition-colors"
              title="Sin acorde / No Chord"
            >
              N.C. (Corte)
            </button>
          </div>
        </div>

        {/* Custom Chord Input Form */}
        <form onSubmit={handleSubmitCustom} className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={customChordInput}
            onChange={(e) => setCustomChordInput(e.target.value)}
            placeholder="Otro acorde (ej: F#m7, B7/D#)..."
            autoFocus
            className="flex-1 px-2.5 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:border-amber-600 placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!customChordInput.trim()}
            className="p-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white rounded-lg cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
