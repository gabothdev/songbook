import React, { useState } from 'react';
import { Tag, X, Music2, Mic2 } from 'lucide-react';
import { SECTION_TYPES, INSTRUMENTAL_PRESETS } from '../../../utils/lyricsBlocks';

/**
 * AddSectionPopover
 * Reusable popover to type a custom section name or pick from standard presets,
 * with dedicated tabs for Vocal (Lyrics) and Instrumental (Solo, Interludio, etc.) sections
 * and metric time signatures.
 */
export default function AddSectionPopover({
  atIndex,
  onAddSection,
  onClose,
  positionClasses = 'top-8 left-1/2 -translate-x-1/2',
}) {
  const [tab, setTab] = useState('vocal'); // 'vocal' | 'instrumental'
  const [customName, setCustomName] = useState('');
  const [selectedTimeSig, setSelectedTimeSig] = useState('4/4');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customName.trim()) {
      onAddSection(customName.trim(), atIndex, {
        isInstrumental: tab === 'instrumental',
        timeSignature: selectedTimeSig,
      });
      setCustomName('');
    }
  };

  const handleSelectPreset = (presetName, isInst = false) => {
    onAddSection(presetName, atIndex, {
      isInstrumental: isInst,
      timeSignature: selectedTimeSig,
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 w-72 bg-white rounded-2xl border-2 border-stone-300 shadow-2xl p-3.5 text-left paper-texture space-y-3 animate-fade-in select-none ${positionClasses}`}
    >
      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
        <span className="text-xs font-serif font-bold text-stone-900 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-700" />
          <span>Añadir Sección</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Switcher: Con Letra vs Instrumental */}
      <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-sans font-bold">
        <button
          type="button"
          onClick={() => setTab('vocal')}
          className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'vocal'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Mic2 className="w-3 h-3 text-amber-700" />
          <span>Con Letra</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('instrumental')}
          className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            tab === 'instrumental'
              ? 'bg-white text-amber-950 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Music2 className="w-3 h-3 text-amber-700" />
          <span>Instrumental</span>
        </button>
      </div>

      {/* Time Signature Selector for Instrumental */}
      {tab === 'instrumental' && (
        <div className="flex items-center justify-between bg-amber-50/80 p-2 rounded-xl border border-amber-200/80 text-xs">
          <span className="font-mono text-[11px] font-bold text-amber-900">Métrica:</span>
          <div className="flex items-center gap-1">
            {['4/4', '2/4', '3/4', '6/8'].map((ts) => (
              <button
                key={ts}
                type="button"
                onClick={() => setSelectedTimeSig(ts)}
                className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
                  selectedTimeSig === ts
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {ts}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Name Input */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={
            tab === 'instrumental' ? 'Ej: Solo de Guitarra...' : 'Nombre personalizado...'
          }
          autoFocus
          className="flex-1 px-2.5 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs font-serif text-stone-900 focus:outline-none focus:border-amber-600 placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={!customName.trim()}
          className="p-1 px-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white rounded-lg text-xs font-sans font-bold cursor-pointer transition-colors"
        >
          + Crear
        </button>
      </form>

      {/* Presets Grid */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
          {tab === 'instrumental' ? 'Secciones Instrumentales:' : 'Secciones Sugeridas:'}
        </span>
        <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-0.5">
          {tab === 'instrumental'
            ? INSTRUMENTAL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p.name, true)}
                  className="px-2 py-1 rounded-lg text-left text-xs font-serif transition-colors truncate cursor-pointer bg-stone-50 hover:bg-amber-100 text-stone-800 hover:text-amber-950 border border-stone-200/70 flex items-center justify-between"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono text-[10px] text-amber-800 font-bold ml-1">
                    {selectedTimeSig}
                  </span>
                </button>
              ))
            : SECTION_TYPES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSelectPreset(st, false)}
                  className="px-2 py-1 rounded-lg text-left text-xs font-serif transition-colors truncate cursor-pointer bg-stone-50 hover:bg-amber-100 text-stone-800 hover:text-amber-950 border border-stone-200/70"
                >
                  {st}
                </button>
              ))}
        </div>
      </div>
    </div>
  );
}
