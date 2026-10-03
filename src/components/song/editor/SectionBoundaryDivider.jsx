import React from 'react';
import { ArrowUp, ArrowDown, Plus } from 'lucide-react';
import AddSectionPopover from './AddSectionPopover';

/**
 * SectionBoundaryDivider
 * Boundary resizing controls (contract/expand section) and inline section insertion.
 */
export default function SectionBoundaryDivider({
  secIdx,
  sec,
  nextSec,
  onMoveBoundaryUp,
  onMoveBoundaryDown,
  addSectionPopover,
  setAddSectionPopover,
  onAddSection,
}) {
  const popoverId = `between_${secIdx}`;
  const isPopoverOpen = addSectionPopover?.id === popoverId;

  return (
    <div className="my-2.5 pl-11 pr-2 flex items-center justify-between gap-2 select-none group/boundary relative">
      <div className="h-px bg-amber-900/15 flex-1 group-hover/boundary:bg-amber-500/50 transition-colors" />

      {/* Boundary Resizing Controls & Add Section Button */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-100 group-hover/boundary:bg-amber-100 border border-stone-200 group-hover/boundary:border-amber-300 transition-all text-[10px] font-mono text-stone-600 shadow-2xs">
        <button
          type="button"
          onClick={() => onMoveBoundaryUp(secIdx)}
          disabled={sec.lines.length === 0}
          className="hover:text-amber-900 hover:bg-amber-200/60 p-0.5 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title={`Mover límite hacia arriba (contraer [${sec.name}])`}
        >
          <ArrowUp className="w-3 h-3" />
        </button>

        <span className="px-0.5 font-semibold text-stone-700">
          ↕ Límite
        </span>

        <button
          type="button"
          onClick={() => onMoveBoundaryDown(secIdx)}
          disabled={!nextSec || nextSec.lines.length === 0}
          className="hover:text-amber-900 hover:bg-amber-200/60 p-0.5 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title={`Mover límite hacia abajo (expandir [${sec.name}])`}
        >
          <ArrowDown className="w-3 h-3" />
        </button>

        <span className="text-stone-300 select-none">|</span>

        {/* Add section between trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAddSectionPopover(
              isPopoverOpen ? null : { atIndex: secIdx + 1, id: popoverId }
            );
          }}
          className="hover:text-amber-950 hover:bg-amber-200/80 px-1 py-0.5 rounded cursor-pointer flex items-center gap-1 font-sans text-amber-900 font-bold transition-colors"
          title="Insertar una nueva sección aquí"
        >
          <Plus className="w-3 h-3 text-amber-700" />
          <span>+ Sección</span>
        </button>
      </div>

      <div className="h-px bg-amber-900/15 flex-1 group-hover/boundary:bg-amber-500/50 transition-colors" />

      {isPopoverOpen && (
        <AddSectionPopover
          atIndex={secIdx + 1}
          onAddSection={onAddSection}
          onClose={() => setAddSectionPopover(null)}
          positionClasses="top-8 left-1/2 -translate-x-1/2"
        />
      )}
    </div>
  );
}
