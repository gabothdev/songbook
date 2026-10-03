import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

/**
 * Visor de archivo histórico de partituras escaneadas (TodoTango).
 */
export default function TangoArchiveViewer({
  effectiveScore,
  activePageIndex = 0,
  setActivePageIndex,
  tangoZoom = 100,
  setTangoZoom,
  onDigitizePage,
}) {
  if (!effectiveScore || !effectiveScore.pages || effectiveScore.pages.length === 0) {
    return null;
  }

  const currentPageUrl = effectiveScore.pages[activePageIndex];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Cabecera Editorial Tango */}
      <div className="text-center pb-5 mb-4 border-b border-stone-300/80 w-full px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-2">
          <div className="text-left w-full sm:w-auto">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
              {effectiveScore.title}
            </h1>
            <p className="font-serif italic text-base text-rose-900 mt-0.5">
              Música: {effectiveScore.composer} {effectiveScore.lyricist ? `• Letra: ${effectiveScore.lyricist}` : ''}
            </p>
          </div>

          {/* Botón Acción OMR: Digitalizar con IA (Oculto temporalmente) */}
          {/* onDigitizePage && (
            <button
              type="button"
              onClick={() => onDigitizePage({
                score: effectiveScore,
                pageUrl: currentPageUrl,
                pageIndex: activePageIndex
              })}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-800 to-amber-700 hover:from-rose-700 hover:to-amber-600 text-amber-100 rounded-xl text-xs font-bold font-sans shadow-md hover:shadow-lg transition-all cursor-pointer flex-shrink-0 border border-amber-500/30"
              title="Abrir en el Estudio de Digitalización Split-View para transcribir y corregir con sonido interactivo"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Digitalizar Partitura (Split-View)</span>
            </button>
          ) */}
        </div>

        <div className="flex items-center justify-center gap-3 text-xs text-stone-600 mt-2 font-mono">
          <span className="bg-stone-200/80 px-2 py-0.5 rounded font-semibold text-stone-800">
            {effectiveScore.rhythm || 'Tango'}
          </span>
          {effectiveScore.year && <span>Año {effectiveScore.year}</span>}
          <span>• Edición de Piano & Bandoneón</span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-500 font-sans">
            Página {activePageIndex + 1} de {effectiveScore.pages.length}
          </span>
        </div>
      </div>

      {/* Controles de Zoom Rápido flotantes */}
      <div className="w-full flex items-center justify-end gap-1 mb-2 px-2">
        <div className="flex items-center gap-1 bg-white/90 border border-stone-300 rounded-xl px-2 py-1 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setTangoZoom(Math.max(60, tangoZoom - 15))}
            className="p-1 text-stone-600 hover:text-stone-900 transition cursor-pointer"
            title="Reducir"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-stone-600 px-1 font-bold">
            {tangoZoom}%
          </span>
          <button
            type="button"
            onClick={() => setTangoZoom(Math.min(200, tangoZoom + 15))}
            className="p-1 text-stone-600 hover:text-stone-900 transition cursor-pointer"
            title="Aumentar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTangoZoom(100)}
            className="p-1 text-stone-400 hover:text-stone-700 transition cursor-pointer text-[10px] font-mono ml-0.5"
            title="Restablecer al 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hoja de Partitura Escaneada con Sombra Vintage */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-stone-300 p-2 sm:p-4 mb-6 max-w-full overflow-hidden flex flex-col items-center paper-texture">
        <div 
          style={{ transform: `scale(${tangoZoom / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 ease-out"
        >
          <img
            src={currentPageUrl}
            alt={`${effectiveScore.title} - Página ${activePageIndex + 1}`}
            className="max-w-full h-auto rounded-lg shadow-sm border border-stone-200"
          />
        </div>
      </div>

      {/* Barra de Navegación de Páginas */}
      {effectiveScore.pages.length > 1 && (
        <div className="flex items-center justify-center gap-3 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-stone-300 sticky bottom-4 z-30">
          <button
            type="button"
            onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
            disabled={activePageIndex === 0}
            className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 disabled:opacity-40 transition cursor-pointer"
            title="Página Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-stone-700" />
          </button>

          <div className="flex items-center gap-1.5">
            {effectiveScore.pages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePageIndex(idx)}
                className={`w-7 h-7 rounded-full text-xs font-mono font-bold transition cursor-pointer ${
                  activePageIndex === idx
                    ? 'bg-rose-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActivePageIndex(Math.min(effectiveScore.pages.length - 1, activePageIndex + 1))}
            disabled={activePageIndex === effectiveScore.pages.length - 1}
            className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 disabled:opacity-40 transition cursor-pointer"
            title="Página Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-stone-700" />
          </button>
        </div>
      )}
    </div>
  );
}
