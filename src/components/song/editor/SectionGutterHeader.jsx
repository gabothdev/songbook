import React, { useState } from 'react';
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
 * 90° rotated section name badge in left gutter with popover for:
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
}) {
  const [customName, setCustomName] = useState('');
  const [customTimeInput, setCustomTimeInput] = useState(sec.time || '');

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
          onToggle();
        }}
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}
        className="text-[11px] font-serif font-bold uppercase tracking-wider px-1.5 py-2 rounded-md shadow-xs transition-all whitespace-nowrap cursor-pointer text-amber-950 bg-amber-200/90 hover:bg-amber-300 border border-amber-300 hover:scale-105 active:scale-95 flex items-center gap-1"
        title={`Editar sección [${sec.name}]${sec.time ? ` @ ${sec.time}s` : ''}`}
      >
        <span>{sec.name}</span>
        {sec.time && (
          <span className="text-[9px] font-mono text-amber-900/80 font-normal">
            @{sec.time}
          </span>
        )}
      </button>

      {/* Section Options Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-10 top-0 w-60 bg-white rounded-2xl border-2 border-stone-300 shadow-2xl p-3 z-50 text-left paper-texture space-y-2.5 animate-fade-in select-none max-h-[480px] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="text-xs font-serif font-bold text-stone-900">
              Opciones: [{sec.name}]
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Reorder & Duplicate Actions */}
          <div className="grid grid-cols-2 gap-1 pb-1 border-b border-stone-200/80">
            <button
              type="button"
              onClick={() => onMoveSectionUp(secIdx)}
              disabled={secIdx === 0}
              className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-sans text-stone-700 bg-stone-100 hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Mover esta sección antes de la anterior"
            >
              <ArrowUp className="w-3 h-3 text-amber-700" />
              <span>Subir Sección</span>
            </button>

            <button
              type="button"
              onClick={() => onMoveSectionDown(secIdx)}
              disabled={secIdx >= totalSections - 1}
              className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-sans text-stone-700 bg-stone-100 hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Mover esta sección después de la siguiente"
            >
              <ArrowDown className="w-3 h-3 text-amber-700" />
              <span>Bajar Sección</span>
            </button>

            <button
              type="button"
              onClick={() => onDuplicateSection(secIdx)}
              className="col-span-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-sans font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-2xs cursor-pointer transition-colors"
              title="Duplicar esta sección con su letra y acordes"
            >
              <Copy className="w-3.5 h-3.5 text-amber-800" />
              <span>📋 Duplicar Sección</span>
            </button>
          </div>

          {/* Timestamp Sync Section */}
          <div className="space-y-1.5 pb-2 border-b border-stone-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>Tiempo de Inicio:</span>
              </span>
              {sec.time && (
                <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                  @{sec.time}s
                </span>
              )}
            </div>

            {currentPlaybackTime !== null && currentPlaybackTime !== undefined && (
              <button
                type="button"
                onClick={handleSyncCurrentVideoTime}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-sans font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 border border-amber-400 shadow-2xs cursor-pointer transition-colors"
                title={`Sincronizar inicio con el segundo actual del video (${formatSeconds(currentPlaybackTime)})`}
              >
                <Pin className="w-3.5 h-3.5 text-amber-800 fill-amber-700" />
                <span>📌 Marcar tiempo actual ({formatSeconds(currentPlaybackTime)})</span>
              </button>
            )}

            <form onSubmit={handleApplyCustomTime} className="flex items-center gap-1">
              <input
                type="text"
                value={customTimeInput}
                onChange={(e) => setCustomTimeInput(e.target.value)}
                placeholder="Segundos (ej. 45.2)..."
                className="flex-1 px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-mono text-stone-900 focus:outline-none focus:border-amber-600 placeholder:text-stone-400"
              />
              <button
                type="submit"
                className="p-1 px-2 bg-stone-800 hover:bg-stone-900 text-white rounded text-xs font-sans font-bold cursor-pointer"
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
                  className="p-1 text-stone-400 hover:text-rose-700 rounded cursor-pointer"
                  title="Quitar marca de tiempo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* Quick Section Name Presets */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
              Cambiar Nombre:
            </span>
            <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto pr-1">
              {SECTION_TYPES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onRenameSection(secIdx, st)}
                  className={`px-2 py-1 rounded text-left text-[11px] font-serif transition-colors truncate cursor-pointer ${
                    sec.name === st
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-stone-50 hover:bg-amber-100 text-stone-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Name Input */}
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1 pt-1">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Otro nombre..."
              className="flex-1 px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-serif text-stone-900 focus:outline-none focus:border-amber-600"
            />
            <button
              type="submit"
              className="p-1 bg-amber-700 text-white rounded cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Merge & Delete Actions */}
          <div className="pt-2 border-t border-stone-200 space-y-1">
            {secIdx > 0 && (
              <button
                type="button"
                onClick={() => onMergeWithPrevSection(secIdx)}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs font-sans text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <Combine className="w-3.5 h-3.5 text-amber-700" />
                <span>Unir con sección anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onDeleteSection(secIdx)}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs font-sans text-rose-700 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Eliminar esta sección</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
