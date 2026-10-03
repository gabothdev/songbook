import React from 'react';
import { Sparkles, Crown, Radio, Layers, Play } from 'lucide-react';

export default function ScoreResultsList({
  query,
  scoreResults = [],
  isPro,
  onOpenUpgradeModal,
  onSelectScore
}) {
  if (!isPro) {
    return (
      <div className="py-14 text-center bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-amber-500/30 p-6 flex flex-col items-center gap-3">
        <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full">
          <Sparkles className="w-7 h-7" />
        </div>
        <h4 className="font-serif font-bold text-slate-800 dark:text-white text-sm sm:text-base">
          Partituras y Tablaturas Interactivas (Función Pro)
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          El acceso a Songsterr, partituras interactivas multitrack con tablatura y plicas rítmicas, y el archivo histórico de Tango TodoTango está reservado para miembros <strong>SongBook Pro</strong>.
        </p>
        <button
          type="button"
          onClick={onOpenUpgradeModal}
          className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold font-sans shadow-md cursor-pointer transition-all flex items-center gap-1.5"
        >
          <Crown className="w-4 h-4" />
          <span>Desbloquear SongBook Pro</span>
        </button>
      </div>
    );
  }

  if (scoreResults.length > 0) {
    return (
      <div className="space-y-2.5">
        {scoreResults.map((score, idx) => {
          const isTango = score._source === 'todotango' || score.type === 'tango_archive';
          return (
            <div
              key={`score_${score.id || score.songId || idx}`}
              onClick={() => onSelectScore(score)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-850 ${
                isTango 
                  ? 'border-rose-200 dark:border-rose-900/50 hover:border-rose-400' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-400'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  {isTango ? (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold border border-rose-200">
                      🎻 TodoTango Archivo
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                      🎸 Songsterr
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-serif italic">
                    {score.rhythm || 'Partitura & Tablatura'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                  {score.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {score.artist || score.composer}
                </p>
                {score.recordings?.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold font-sans">
                    <Radio className="w-2.5 h-2.5" />
                    <span>Audio histórico disponible</span>
                  </div>
                )}
                {score.tracks?.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                    <Layers className="w-2.5 h-2.5" />
                    <span>{score.tracks.length} pistas instrumentales</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                className={`p-2.5 rounded-xl text-white transition shadow-xs flex-shrink-0 ${
                  isTango ? 'bg-rose-800 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-500'
                }`}
                title="Cargar en el Atril"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (query) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500 select-none">
        <p className="text-sm font-semibold">No se encontraron partituras para "{query}"</p>
        <p className="text-xs mt-1">Prueba con tangos clásicos (Piazzolla, Gardel) o bandas internacionales.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-16 text-slate-400 dark:text-slate-500 select-none border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
      <p className="text-xs font-semibold">Busca en los catálogos de Songsterr y TodoTango.</p>
      <p className="text-[10px] mt-1 uppercase tracking-wider font-extrabold text-amber-500/70">
        Tablaturas interactivas • Partituras de Tango • Grabaciones de época
      </p>
    </div>
  );
}
