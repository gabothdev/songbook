import React from 'react';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function NotebookCover() {
  const { t } = useLanguage();

  return (
    <div className="h-full flex flex-col justify-between p-8 sm:p-10 select-none relative overflow-hidden">
      {/* Brand Header */}
      <div className="z-10">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="p-2.5 bg-stone-900 text-amber-300 rounded-xl flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
            SongBook
          </h1>
        </div>
        <p className="text-sm font-sans text-stone-600">
          {t.tagline}
        </p>
      </div>

      {/* Realistic Pencil/Ink Hand-Drawn Sketch (Guitar, Bandoneon, Keyboard, Ukulele) */}
      <div className="my-auto py-2 flex flex-col items-center justify-center relative">
        <div className="relative w-full max-w-[420px] aspect-[4/3] flex items-center justify-center overflow-hidden">
          <img
            src="/instruments_sketch.jpg"
            alt="Boceto de Instrumentos Musicales"
            className="w-full h-full object-contain mix-blend-multiply opacity-85 hover:opacity-100 transition-opacity pointer-events-none filter contrast-105"
          />
        </div>
        
        {/* Subtle instrument caption */}
        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono uppercase tracking-widest text-stone-500">
          <span>Guitarra</span>
          <span>•</span>
          <span>Bandoneón</span>
          <span>•</span>
          <span>Teclado</span>
          <span>•</span>
          <span>Ukelele</span>
        </div>
      </div>

      {/* Minimal Footer Quote */}
      <div className="pt-4 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-500 font-sans z-10">
        <span className="italic">{t.quote}</span>
        <span className="font-mono text-[11px] text-stone-400">v2.0</span>
      </div>
    </div>
  );
}
