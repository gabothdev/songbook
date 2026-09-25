import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  X,
  Plus,
  Music,
  Tag,
  Clock,
  Sparkles,
  HelpCircle,
  Check,
  ChevronDown,
} from 'lucide-react';

const COMMON_SECTIONS = [
  'Intro',
  'Estrofa',
  'Estrofa 1',
  'Estrofa 2',
  'Pre-Coro',
  'Coro',
  'Puente',
  'Solo',
  'Interludio',
  'Outro',
  'Final',
];

/**
 * SongLyricsEditor Component
 * Professional interactive lyrics & chords editor for SongBook Pro.
 * Provides quick-insert chord chips, section headers, rhythmic rests, and live sync.
 */
export default function SongLyricsEditor({
  draftContent,
  setDraftContent,
  uniqueChords = [],
  onSave,
  onCancel,
  onRestoreOriginal,
  hasOriginal = false,
  isSaving = false,
}) {
  const textareaRef = useRef(null);
  const [customChordInput, setCustomChordInput] = useState('');
  const [isCustomChordOpen, setIsCustomChordOpen] = useState(false);
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Inserts text directly at cursor position in textarea
  const insertAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraftContent((prev) => prev + textToInsert);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = draftContent;

    const updated = current.substring(0, start) + textToInsert + current.substring(end);
    setDraftContent(updated);

    // Restore focus and move cursor after inserted string
    setTimeout(() => {
      textarea.focus();
      const newPos = start + textToInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleInsertChord = (chordName) => {
    if (!chordName) return;
    const clean = chordName.replace(/[\[\]]/g, '').trim();
    insertAtCursor('[' + clean + ']');
    showToast('Insertado [' + clean + ']');
  };

  const handleInsertCustomChord = (e) => {
    e?.preventDefault();
    if (!customChordInput.trim()) return;
    handleInsertChord(customChordInput);
    setCustomChordInput('');
    setIsCustomChordOpen(false);
  };

  const handleInsertSection = (sectionName) => {
    insertAtCursor('\n[' + sectionName + ']\n');
    setIsSectionMenuOpen(false);
    showToast('Sección [' + sectionName + '] añadida');
  };

  const handleInsertRest = (beats = 2) => {
    insertAtCursor('[𝄾 ' + beats + 'T]');
    showToast('Silencio 𝄾 ' + beats + 'T insertado');
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col justify-between bg-[#fcf9f2] rounded-2xl md:rounded-r-none md:rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border border-stone-300 md:border-r-0 overflow-hidden paper-texture p-5 sm:p-7 relative z-10 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[700px] max-h-[580px] xl:max-h-[640px] 2xl:max-h-[700px]">
      {/* Top Margin Decoration */}
      <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

      <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-hidden">
        {/* Editor Header & Title */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 text-amber-950 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border border-amber-300 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
              <span>Editor de Arreglo</span>
            </span>
            <span className="text-xs text-stone-500 font-sans hidden sm:inline">
              Escribe [Acorde] sobre las palabras
            </span>
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

        {/* Quick-Insert Toolbar */}
        <div className="bg-stone-100/90 p-2 rounded-xl border border-stone-200 space-y-2 text-xs font-sans">
          {/* Row 1: Chord Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-stone-600 mr-1 flex items-center gap-1">
              <Music className="w-3 h-3 text-amber-700" />
              <span>Acordes:</span>
            </span>

            {uniqueChords.slice(0, 8).map((chord) => (
              <button
                key={chord}
                type="button"
                onClick={() => handleInsertChord(chord)}
                className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-950 rounded-md border border-stone-300 hover:border-amber-400 font-mono font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
                title={'Insertar [' + chord + ']'}
              >
                [{chord}]
              </button>
            ))}

            {/* Custom Chord Popover Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCustomChordOpen(!isCustomChordOpen)}
                className="px-2 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md border border-stone-300 font-sans font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Otro</span>
              </button>

              {isCustomChordOpen && (
                <form
                  onSubmit={handleInsertCustomChord}
                  className="absolute left-0 top-full mt-1.5 bg-white border border-stone-300 rounded-xl shadow-xl p-2 z-50 flex items-center gap-1.5 w-44 paper-texture"
                >
                  <input
                    type="text"
                    value={customChordInput}
                    onChange={(e) => setCustomChordInput(e.target.value)}
                    placeholder="Ej: F#m7, Bdim"
                    autoFocus
                    className="flex-1 px-2 py-1 bg-stone-50 border border-stone-300 rounded-md text-xs font-mono focus:outline-none focus:border-amber-600 text-stone-900"
                  />
                  <button
                    type="submit"
                    className="p-1 bg-amber-700 hover:bg-amber-800 text-white rounded-md cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Row 2: Structure & Rests */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-stone-200/80">
            {/* Section Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSectionMenuOpen(!isSectionMenuOpen)}
                className="px-2 py-0.5 bg-white hover:bg-stone-50 text-stone-700 rounded-md border border-stone-300 font-sans font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Tag className="w-3 h-3 text-amber-700" />
                <span>+ Sección</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isSectionMenuOpen && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-stone-300 rounded-xl shadow-xl p-1.5 z-50 w-36 max-h-44 overflow-y-auto space-y-0.5 paper-texture">
                  {COMMON_SECTIONS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleInsertSection(sec)}
                      className="w-full text-left px-2 py-1 rounded-md text-xs hover:bg-amber-100 hover:text-amber-950 transition-colors font-medium text-stone-800 cursor-pointer"
                    >
                      [{sec}]
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rest Symbols */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleInsertRest(2)}
                className="px-2 py-0.5 bg-white hover:bg-stone-50 text-stone-700 rounded-md border border-stone-300 font-sans font-medium text-xs cursor-pointer"
                title="Insertar silencio de 2 tiempos"
              >
                𝄾 2T
              </button>
              <button
                type="button"
                onClick={() => handleInsertRest(4)}
                className="px-2 py-0.5 bg-white hover:bg-stone-50 text-stone-700 rounded-md border border-stone-300 font-sans font-medium text-xs cursor-pointer"
                title="Insertar silencio de 4 tiempos"
              >
                𝄾 4T
              </button>
            </div>
          </div>
        </div>

        {/* Textarea for Lyrics & Chords */}
        <div className="flex-1 min-h-[280px] sm:min-h-[340px] relative flex flex-col">
          <textarea
            ref={textareaRef}
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            placeholder="Escribe la letra aquí con acordes entre corchetes, por ejemplo:&#10;[Intro]&#10;[𝄾 2T] [Am] [E7] [Am]&#10;&#10;[Estrofa 1]&#10;[Am] Barrio plateado por la [E7] luna..."
            className="w-full flex-1 p-3.5 bg-white/70 border border-stone-300 rounded-xl font-mono text-xs sm:text-sm text-stone-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 paper-texture shadow-inner overflow-y-auto"
            spellCheck={false}
          />

          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute bottom-3 right-3 bg-stone-900/90 text-white text-[11px] font-sans px-2.5 py-1 rounded-md shadow-lg animate-fade-in pointer-events-none">
              {toastMessage}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-3 mt-3 border-t border-stone-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] font-sans text-stone-500">
          Los cambios se previsualizan en tiempo real en la página derecha.
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
    </div>
  );
}
