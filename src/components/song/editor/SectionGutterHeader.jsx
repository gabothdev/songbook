import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Combine,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Pin,
  Clock,
  Tag,
} from 'lucide-react';
import { SECTION_TYPES } from '../../../utils/lyricsBlocks';

/**
 * Formats seconds into MM:SS.S or SS.Ss string
 */
function formatSeconds(sec) {
  if (sec === null || sec === undefined || isNaN(sec)) return '';
  const num = parseFloat(sec);
  const minutes = Math.floor(num / 60);
  const remaining = (num % 60).toFixed(1);
  if (minutes > 0) {
    return `${minutes}:${remaining.padStart(4, '0')}s`;
  }
  return `${remaining}s`;
}

/**
 * SectionGutterHeader
 * 90° rotated section name badge in left gutter with full-screen centered modal for:
 * - Renaming section (presets or custom name)
 * - Duplicating section (1-click clone)
 * - Reordering entire section up / down
 * - Setting / Syncing live timestamp from video (@ 45.2s)
 * - Merging with previous or deleting section
 */
export default function SectionGutterHeader({
  secIdx,
  totalSections = 1,
  sec,
  isOpen,
  onToggle,
  onClose,
  onRenameSection,
  onDuplicateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onMergeWithPrevSection,
  onDeleteSection,
  currentPlaybackTime = null,
  onSetSectionTimestamp = null,
  isSectionActive = false,
  onSelectSection = null,
}) {
  const [customName, setCustomName] = useState('');
  const [customTimeInput, setCustomTimeInput] = useState(sec.time || '');

  // Synchronize input when sec.time changes
  useEffect(() => {
    setCustomTimeInput(sec.time || '');
  }, [sec.time]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customName.trim()) {
      onRenameSection(secIdx, customName.trim());
      setCustomName('');
    }
  };

  const handleApplyCustomTime = (e) => {
    e.preventDefault();
    if (onSetSectionTimestamp) {
      onSetSectionTimestamp(secIdx, customTimeInput.trim() || null);
    }
  };

  const handleSyncCurrentVideoTime = () => {
    if (currentPlaybackTime !== null && currentPlaybackTime !== undefined && onSetSectionTimestamp) {
      const formatted = currentPlaybackTime.toFixed(1);
      onSetSectionTimestamp(secIdx, formatted);
      setCustomTimeInput(formatted);
    }
  };

  return (
    <div className="w-8 flex-shrink-0 flex flex-col items-center justify-start select-none py-1 border-r border-amber-900/15 relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectSection) {
            onSelectSection(sec, secIdx);
          }
          onToggle();
        }}
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}
        className={`text-[11px] font-serif font-bold uppercase tracking-wider px-1.5 py-2 rounded-md shadow-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
          isSectionActive
            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-600 shadow-md font-black scale-105'
            : 'text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-300 hover:scale-105 active:scale-95'
        }`}
        title={`Editar sección [${sec.name}]${sec.time ? ` @ ${sec.time}s` : ''}`}
      >
        <span>{sec.name}</span>
        {sec.time && (
          <span className="text-[9px] font-mono text-amber-900/80 font-normal">
            @{sec.time}
          </span>
        )}
      </button>

      {/* Section Options Modal (Full-screen Centered Portal) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#fcf9f2] rounded-3xl border-2 border-stone-400 shadow-2xl p-6 text-left paper-texture space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto relative"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-300 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-200 text-amber-900 rounded-xl border border-amber-300 shadow-2xs">
                  <Tag className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-stone-900">
                    Opciones de Sección
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono font-bold text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      [{sec.name}]
                    </span>
                    {sec.time && (
                      <span className="text-xs font-mono text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
                        @{sec.time}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-stone-400 hover:text-stone-800 p-1.5 rounded-xl hover:bg-stone-200/70 transition-colors cursor-pointer"
                title="Cerrar modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Reorder & Duplicate Actions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-stone-600 uppercase font-bold tracking-wider">
                Estructura y Posición:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onMoveSectionUp(secIdx)}
                  disabled={secIdx === 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans text-stone-800 bg-stone-100 hover:bg-amber-100 border border-stone-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                  title="Mover esta sección antes de la anterior"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-amber-700" />
                  <span>Subir Sección</span>
                </button>

                <button
                  type="button"
                  onClick={() => onMoveSectionDown(secIdx)}
                  disabled={secIdx >= totalSections - 1}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans text-stone-800 bg-stone-100 hover:bg-amber-100 border border-stone-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                  title="Mover esta sección después de la siguiente"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                  <span>Bajar Sección</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDuplicateSection(secIdx);
                    onClose();
                  }}
                  className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-sans font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-xs cursor-pointer transition-colors active:scale-98"
                  title="Duplicar esta sección con toda su letra y acordes"
                >
                  <Copy className="w-4 h-4 text-amber-800" />
                  <span>📋 Duplicar Sección Completa</span>
                </button>
              </div>
            </div>

            {/* Timestamp Sync Section */}
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-stone-600 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Sincronización Rítmica (Video):</span>
                </span>
                {sec.time && (
                  <span className="text-xs font-mono font-bold text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">
                    @{sec.time}s
                  </span>
                )}
              </div>

              {currentPlaybackTime !== null && currentPlaybackTime !== undefined && (
                <button
                  type="button"
                  onClick={handleSyncCurrentVideoTime}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-sans font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 shadow-xs cursor-pointer transition-colors active:scale-98"
                  title={`Sincronizar inicio con el segundo actual del video (${formatSeconds(currentPlaybackTime)})`}
                >
                  <Pin className="w-4 h-4 text-amber-800 fill-amber-700" />
                  <span>📌 Marcar segundo actual ({formatSeconds(currentPlaybackTime)})</span>
                </button>
              )}

              <form onSubmit={handleApplyCustomTime} className="flex items-center gap-2">
                <input
                  type="text"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  placeholder="Segundos (ej. 45.2)..."
                  className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:border-amber-600 placeholder:text-stone-400 shadow-2xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Fijar
                </button>
                {sec.time && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSetSectionTimestamp) onSetSectionTimestamp(secIdx, null);
                      setCustomTimeInput('');
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                    title="Quitar marca de tiempo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>

            {/* Quick Section Name Presets */}
            <div className="space-y-1.5 pt-2 border-t border-stone-200">
              <span className="text-[11px] font-mono text-stone-600 uppercase font-bold tracking-wider">
                Cambiar Nombre de Sección:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {SECTION_TYPES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onRenameSection(secIdx, st)}
                    className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-serif transition-colors truncate cursor-pointer border ${
                      sec.name === st
                        ? 'bg-amber-700 text-white font-bold border-amber-800 shadow-xs'
                        : 'bg-white hover:bg-amber-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Custom Name Input */}
              <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1.5">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Otro nombre personalizado..."
                  className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-serif text-stone-900 focus:outline-none focus:border-amber-600 placeholder:text-stone-400 shadow-2xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar</span>
                </button>
              </form>
            </div>

            {/* Merge & Delete Actions */}
            <div className="pt-3 border-t border-stone-300 space-y-2">
              {secIdx > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onMergeWithPrevSection(secIdx);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-sans text-stone-800 hover:bg-amber-100 border border-stone-300 cursor-pointer transition-colors"
                >
                  <Combine className="w-4 h-4 text-amber-700" />
                  <span>Unir con la sección anterior</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onDeleteSection(secIdx);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Eliminar esta sección</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
