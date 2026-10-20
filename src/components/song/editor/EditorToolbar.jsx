import React from 'react';
import {
  Undo2,
  Redo2,
  Music2,
  Wand2,
  RotateCcw,
  X,
  LayoutGrid,
  Code2,
} from 'lucide-react';

export default function EditorToolbar({
  editorViewMode = 'visual',
  onChangeEditorViewMode,
  handleUndo,
  handleRedo,
  canUndo = false,
  canRedo = false,
  isExplicitInstrumental = false,
  onOpenSyncWizard,
  hasOriginal = false,
  onRestoreOriginal,
  onCancel,
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Visual / Text Editor Mode Switcher */}
        {onChangeEditorViewMode && (
          <div className="flex items-center bg-stone-200/80 border border-stone-300 rounded-lg p-0.5 text-xs font-sans shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeEditorViewMode('visual')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                editorViewMode === 'visual'
                  ? 'bg-amber-200 text-amber-950 shadow-2xs border border-amber-300/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Modo Diseño Visual (bloques, acordes arrastrables y sílabas)"
            >
              <LayoutGrid className="w-3 h-3 text-amber-800" />
              <span>Diseño Visual</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeEditorViewMode('text')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                editorViewMode === 'text'
                  ? 'bg-amber-200 text-amber-950 shadow-2xs border border-amber-300/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Modo Texto (edición rápida de letra y etiquetas [Acorde])"
            >
              <Code2 className="w-3 h-3 text-amber-800" />
              <span>Modo Texto</span>
            </button>
          </div>
        )}

        {/* Undo / Redo Buttons */}
        <div className="flex items-center gap-0.5 bg-stone-100 border border-stone-300 rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent text-stone-700 cursor-pointer transition-colors"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent text-stone-700 cursor-pointer transition-colors"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isExplicitInstrumental && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100/80 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-sans font-bold shadow-2xs">
            <Music2 className="w-3 h-3 text-amber-700" />
            <span className="hidden sm:inline">Instrumental</span>
          </span>
        )}

        {onOpenSyncWizard && (
          <button
            type="button"
            onClick={onOpenSyncWizard}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-lg border border-amber-400 transition-colors cursor-pointer shadow-xs"
            title="Añadir o editar letra y sincronizar compases paso a paso con el video"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-800" />
            <span className="hidden sm:inline">Sincronizar Guiado</span>
          </button>
        )}

        {hasOriginal && onRestoreOriginal && (
          <button
            type="button"
            onClick={onRestoreOriginal}
            className="flex items-center gap-1 px-2 py-1 text-xs font-sans font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition-colors cursor-pointer"
            title="Deshacer cambios y restaurar la letra original scrapeada"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
            title="Cerrar editor sin guardar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

