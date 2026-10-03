import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Tag } from 'lucide-react';
import { SECTION_TYPES } from '../../../utils/lyricsBlocks';

/**
 * AddLyricsModal
 * Modal to enter or paste lyrics for instrumental / empty songs, with right-click section tagging.
 */
export default function AddLyricsModal({
  isOpen,
  onClose,
  onApplyLyrics,
}) {
  const [lyricsInput, setLyricsInput] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handleDismiss = () => setContextMenu(null);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleContextMenu = (e) => {
    e.preventDefault();
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    const posX = Math.min(e.clientX, window.innerWidth - 230);
    const posY = Math.min(e.clientY, window.innerHeight - 360);

    setContextMenu({
      x: Math.max(10, posX),
      y: Math.max(10, posY),
      start,
      end,
    });
  };

  const handleAssignSection = (sectionTag) => {
    if (!contextMenu) return;
    const { start, end } = contextMenu;
    const current = lyricsInput;
    let updated = '';

    if (start !== end && start >= 0 && end <= current.length) {
      const before = current.substring(0, start);
      const selected = current.substring(start, end).trim();
      const after = current.substring(end);

      const prefix = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const suffix = after.startsWith('\n') ? '' : '\n\n';

      updated = before + prefix + `[${sectionTag}]\n${selected}` + suffix + after;
    } else {
      const pos = start !== undefined ? start : current.length;
      const before = current.substring(0, pos);
      const after = current.substring(pos);
      const prefix = before.length === 0 || before.endsWith('\n') ? '' : '\n';
      updated = before + prefix + `[${sectionTag}]\n` + after;
    }

    setLyricsInput(updated);
    setContextMenu(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleApply = () => {
    if (!lyricsInput.trim()) return;
    onApplyLyrics(lyricsInput.trim());
    setLyricsInput('');
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="relative w-full max-w-xl bg-[#fcf9f2] rounded-3xl border-4 border-[#35251d] p-6 sm:p-7 shadow-2xl space-y-4 paper-texture z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-stone-300/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-100/90 rounded-2xl text-amber-900 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-black text-xl text-stone-900">
                  Pegar o Escribir Letra
                </h3>
                <p className="text-xs font-sans text-stone-600 mt-0.5">
                  Ingresa los versos para estructurarlos en palabras con ranuras de acordes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-amber-950 text-xs font-sans shadow-2xs">
            <div className="p-1.5 bg-amber-200/70 rounded-xl text-amber-900 flex-shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div className="leading-snug">
              <span className="font-bold text-amber-900">💡 Asignar Secciones: </span>
              Selecciona una parte o estrofa del texto y haz <strong>clic derecho</strong> sobre la selección para asignarle una sección.
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={lyricsInput}
              onChange={(e) => setLyricsInput(e.target.value)}
              onContextMenu={handleContextMenu}
              placeholder="Pega la letra completa aquí...&#10;&#10;Ejemplo:&#10;[Intro]&#10;Ahí va el capitán Beto...&#10;&#10;[Estrofa 2]&#10;Ya lleva quince años en su periplo..."
              rows={8}
              className="w-full p-4 bg-white/80 border-2 border-stone-300 rounded-2xl font-serif text-sm text-stone-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-700 shadow-inner paper-texture"
            />

            {/* Context Menu for tagging sections */}
            {contextMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  top: Math.min(contextMenu.y, 220),
                  left: Math.min(contextMenu.x, 300),
                }}
                className="absolute z-50 w-52 bg-white rounded-xl border border-stone-300 shadow-2xl p-2 space-y-1 paper-texture animate-fade-in text-left"
              >
                <div className="text-[10px] font-mono uppercase text-stone-500 font-bold px-2 py-1 border-b border-stone-200">
                  Asignar Sección:
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                  {SECTION_TYPES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleAssignSection(st)}
                      className="w-full text-left px-2 py-1 rounded text-xs font-serif text-stone-800 hover:bg-amber-100 hover:text-amber-950 transition-colors cursor-pointer"
                    >
                      [{st}]
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-300/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold font-sans transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!lyricsInput.trim()}
              className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold font-sans shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              Estructurar y Aplicar Letra
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
