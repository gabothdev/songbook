import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Check } from 'lucide-react';

export default function LyricsCorrectionModal({
  isOpen,
  tempLyrics,
  setTempLyrics,
  onSave,
  onClose,
  currentPhraseIndex = 0,
  totalPhrases = 0,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="w-full max-w-xl bg-[#fcf9f2] rounded-3xl border-4 border-[#35251d] p-5 shadow-2xl flex flex-col max-h-[85vh] paper-texture space-y-3 text-left"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm sm:text-base text-stone-900">
                    Corregir Letra durante la Sincronización
                  </h3>
                  <p className="text-[11px] font-sans text-stone-500">
                    {currentPhraseIndex} de {totalPhrases} oraciones sincronizadas hasta ahora (pausado)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-sans text-stone-600">
              Agrega o separa oraciones si faltó texto. Cada salto de línea corresponde a una oración para el teleprompter.
            </p>

            <textarea
              value={tempLyrics}
              onChange={(e) => setTempLyrics(e.target.value)}
              placeholder="Escribe o edita la letra..."
              rows={10}
              className="flex-1 w-full p-3.5 bg-white border border-stone-300 focus:border-amber-500 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400/20 text-stone-900 font-serif text-sm leading-relaxed resize-none shadow-2xs custom-scrollbar"
            />

            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-stone-600 hover:text-stone-900 font-sans font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onSave(tempLyrics)}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-sans font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar Cambios</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
