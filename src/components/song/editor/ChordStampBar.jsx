import React from 'react';
import { Stamp } from 'lucide-react';

export default function ChordStampBar({
  uniqueChords = [],
  isInstrumental = false,
  activeStampChord = null,
  setActiveStampChord,
  onSelectChord,
}) {
  if (uniqueChords.length === 0 || isInstrumental) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs font-sans flex-shrink-0 flex-wrap">
      <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-amber-900 pr-1 select-none">
        <Stamp className="w-3.5 h-3.5 text-amber-700" />
        <span className="hidden sm:inline">Modo Sello:</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {uniqueChords.map((ch) => {
          const isActive = activeStampChord === ch;
          return (
            <button
              key={ch}
              type="button"
              onClick={() => {
                const next = isActive ? null : ch;
                setActiveStampChord(next);
                if (next && onSelectChord) onSelectChord(next);
              }}
              className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-700 text-white shadow-xs scale-105 ring-2 ring-amber-800'
                  : 'bg-white hover:bg-amber-100 text-amber-950 border border-amber-300'
              }`}
              title={
                isActive
                  ? `Sello activo: [${ch}]. Haz clic en cualquier palabra, previo o final para estamparlo`
                  : `Activar sello [${ch}]`
              }
            >
              [{ch}]
            </button>
          );
        })}
      </div>
    </div>
  );
}
