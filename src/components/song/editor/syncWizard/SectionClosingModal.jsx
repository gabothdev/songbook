import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Layers, Sparkles } from 'lucide-react';

const DEFAULT_SECTION_SUGGESTIONS = [
  'Verso 1',
  'Verso 2',
  'Pre-Coro',
  'Coro',
  'Estribillo',
  'Solo',
  'Puente',
  'Interludio',
  'Outro',
  'Final',
];

export default function SectionClosingModal({
  isOpen,
  currentSectionName = 'Intro',
  sectionToName = '',
  setSectionToName,
  currentTime = 0,
  currentSectionStartTime = 0,
  currentSectionPhrasesCount = 0,
  nextPhrasePreview = null,
  onConfirm,
  onCancel,
  formatTime,
  suggestions = DEFAULT_SECTION_SUGGESTIONS,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onCancel}
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="w-full max-w-lg bg-[#fcf9f2] rounded-3xl border-4 border-[#35251d] p-5 shadow-2xl space-y-3.5 text-left paper-texture cursor-default"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <h3 className="font-serif font-black text-sm sm:text-base text-stone-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-800" />
                <span>
                  Cerrar [{currentSectionName || 'Intro'}] y comenzar nueva sección
                </span>
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
                title="Cancelar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-sans text-stone-600 leading-relaxed">
                Se guardará{' '}
                <strong className="text-amber-900 font-serif">
                  [{currentSectionName || 'Intro'}]
                </strong>{' '}
                ({formatTime(currentSectionStartTime)} – {formatTime(currentTime)},{' '}
                {currentSectionPhrasesCount}{' '}
                {currentSectionPhrasesCount === 1 ? 'oración' : 'oraciones'}).{' '}
                <span className="font-semibold text-stone-800">
                  ¿Cómo se llama la nueva sección que empieza ahora?
                </span>
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={sectionToName}
                  onChange={(e) => setSectionToName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (e.shiftKey && nextPhrasePreview) {
                        onConfirm(sectionToName, true);
                      } else {
                        onConfirm(sectionToName, false);
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      onCancel();
                    }
                  }}
                  placeholder="Nombre de la nueva sección (ej: Verso 1, Coro, Solo)..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-serif font-bold text-stone-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                />

                {/* Sugerencias rápidas de secciones */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {suggestions.map((sug) => {
                    const isSelected = sectionToName.trim().toLowerCase() === sug.toLowerCase();
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setSectionToName(sug)}
                        className={`px-2.5 py-1 text-[11px] font-sans border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-200 text-amber-950 border-amber-400 font-bold'
                            : 'bg-white hover:bg-amber-100 text-stone-700 hover:text-amber-950 border-stone-200'
                        }`}
                      >
                        {sug}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* OPCIONES DEL MODAL: CANCELAR, INICIAR SECCIÓN, INICIAR SECCIÓN + 1ª ORACIÓN */}
            <div className="pt-3 border-t border-stone-200 flex flex-col gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onConfirm(sectionToName, false)}
                  className="py-2.5 px-3 bg-stone-900 hover:bg-black text-amber-100 rounded-xl text-xs font-sans font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-stone-800"
                  title="Cierra la sección actual y arranca la nueva sección (Enter)"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Iniciar [{sectionToName.trim() || 'Sección'}] [Enter]</span>
                </button>

                <button
                  type="button"
                  onClick={() => onConfirm(sectionToName, true)}
                  disabled={!nextPhrasePreview}
                  className="py-2.5 px-3 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-sans font-bold shadow-md cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5"
                  title="Cierra la sección actual, inicia la nueva sección y marca simultáneamente el inicio de la siguiente oración (Shift+Enter)"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                    <span>Iniciar + Marcar 1ª oración</span>
                  </div>
                  {nextPhrasePreview ? (
                    <span className="text-[10px] text-amber-200/90 font-mono font-normal truncate max-w-[210px]">
                      "{nextPhrasePreview}"
                    </span>
                  ) : (
                    <span className="text-[9px] text-stone-300 font-sans">
                      (No quedan más oraciones)
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-stone-500 hover:text-stone-800 font-sans font-bold text-xs rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar [Esc]</span>
                </button>

                <span className="text-[10px] font-sans text-stone-500">
                  Tip: pulsa{' '}
                  <kbd className="font-mono font-bold bg-stone-200 px-1 py-0.5 rounded text-[9px] text-stone-700">
                    Shift+Enter
                  </kbd>{' '}
                  si ya empezó a cantar
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

