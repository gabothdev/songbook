import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Music, Activity } from 'lucide-react';

export default function ImportProgressModal({ importProgress }) {
  if (!importProgress) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-6 select-none"
      >
        <motion.div
          initial={{ scale: 0.9, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-5"
        >
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
              {importProgress.source === 'Chordify' || importProgress.source?.includes('BeatGrid') ? (
                <Activity className="w-7 h-7 animate-pulse" />
              ) : (
                <Music className="w-7 h-7 animate-bounce" />
              )}
            </div>
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
              {importProgress.source === 'Chordify' || importProgress.source?.includes('BeatGrid')
                ? 'Opción 1 • BeatGrid Sincronizado'
                : importProgress.source === 'Ultimate Guitar'
                ? 'Opción 2 • Acordes y Tablatura'
                : importProgress.source === 'Cifra Club'
                ? 'Opción 3 • Variantes'
                : importProgress.source || 'Importando acordes'}
            </span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-2 truncate">
              {importProgress.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {importProgress.artist}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <motion.div
                className="bg-amber-500 h-full rounded-full"
                initial={{ width: '15%' }}
                animate={{ width: `${importProgress.percent}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80">
            {importProgress.steps?.map((st) => (
              <div
                key={st.id}
                className={`flex items-center gap-2.5 text-xs font-medium transition-all ${
                  st.done
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : st.active
                    ? 'text-amber-700 dark:text-amber-300 font-bold'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {st.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : st.active ? (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 flex-shrink-0">
                    {st.id}
                  </div>
                )}
                <span className="truncate">{st.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
