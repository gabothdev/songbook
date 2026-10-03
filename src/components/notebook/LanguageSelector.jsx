import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Reusable Language Selector (ES / EN)
 * Styled with tactile dark/amber aesthetics to match the notebook and desk surface.
 */
export default function LanguageSelector({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`flex items-center bg-stone-900/90 backdrop-blur-md p-0.5 sm:p-1 rounded-xl border border-stone-700/70 shadow-md select-none ${className}`}
      role="group"
      aria-label="Selector de idioma"
    >
      <button
        type="button"
        onClick={() => setLang('es')}
        className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
          lang === 'es'
            ? 'bg-amber-600 text-white shadow-sm font-bold'
            : 'text-stone-400 hover:text-stone-200'
        }`}
        title="Español"
      >
        <span>🇪🇸</span>
        <span className="text-[11px] font-mono">ES</span>
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
          lang === 'en'
            ? 'bg-amber-600 text-white shadow-sm font-bold'
            : 'text-stone-400 hover:text-stone-200'
        }`}
        title="English"
      >
        <span>🇺🇸</span>
        <span className="text-[11px] font-mono">EN</span>
      </button>
    </div>
  );
}
