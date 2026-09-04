import React from 'react';

/**
 * Modern tactile chord stamp diagram
 */
export function ChordDoodle({ name = "C", isSelected = false, className = "" }) {
  return (
    <div
      className={`
        flex flex-col items-center justify-between p-2 rounded-xl transition-all duration-200
        ${isSelected 
          ? 'bg-amber-100/90 border-2 border-amber-600 shadow-md ring-2 ring-amber-500/20' 
          : 'bg-white/80 hover:bg-white border border-stone-200 shadow-sm hover:shadow'}
        ${className}
      `}
    >
      <span className="text-base font-bold font-sans text-stone-900 tracking-tight mb-1">
        {name}
      </span>

      {/* SVG Chord Grid */}
      <svg className="w-10 h-12 text-stone-700" viewBox="0 0 36 44">
        {/* Nut (fret 0 bar) */}
        <rect x="4" y="6" width="28" height="2.5" rx="1" fill="#44403c" />

        {/* Frets */}
        <line x1="4" y1="16" x2="32" y2="16" stroke="#a8a29e" strokeWidth="1" />
        <line x1="4" y1="26" x2="32" y2="26" stroke="#a8a29e" strokeWidth="1" />
        <line x1="4" y1="36" x2="32" y2="36" stroke="#a8a29e" strokeWidth="1" />

        {/* Strings */}
        <line x1="6" y1="6" x2="6" y2="38" stroke="#78716c" strokeWidth="1" />
        <line x1="11.2" y1="6" x2="11.2" y2="38" stroke="#78716c" strokeWidth="1" />
        <line x1="16.4" y1="6" x2="16.4" y2="38" stroke="#78716c" strokeWidth="1" />
        <line x1="21.6" y1="6" x2="21.6" y2="38" stroke="#78716c" strokeWidth="1" />
        <line x1="26.8" y1="6" x2="26.8" y2="38" stroke="#78716c" strokeWidth="1" />
        <line x1="32" y1="6" x2="32" y2="38" stroke="#78716c" strokeWidth="1" />

        {/* Chord Dots */}
        {name === "C" && (
          <>
            <circle cx="11.2" cy="31" r="2.2" fill="#d97706" />
            <circle cx="16.4" cy="21" r="2.2" fill="#d97706" />
            <circle cx="26.8" cy="11" r="2.2" fill="#d97706" />
          </>
        )}
        {name === "G" && (
          <>
            <circle cx="6" cy="31" r="2.2" fill="#d97706" />
            <circle cx="11.2" cy="21" r="2.2" fill="#d97706" />
            <circle cx="32" cy="31" r="2.2" fill="#d97706" />
          </>
        )}
        {name === "Am" && (
          <>
            <circle cx="16.4" cy="21" r="2.2" fill="#d97706" />
            <circle cx="21.6" cy="21" r="2.2" fill="#d97706" />
            <circle cx="26.8" cy="11" r="2.2" fill="#d97706" />
          </>
        )}
        {name === "Em" && (
          <>
            <circle cx="11.2" cy="21" r="2.2" fill="#d97706" />
            <circle cx="16.4" cy="21" r="2.2" fill="#d97706" />
          </>
        )}
        {name === "D" && (
          <>
            <circle cx="21.6" cy="21" r="2.2" fill="#d97706" />
            <circle cx="26.8" cy="31" r="2.2" fill="#d97706" />
            <circle cx="32" cy="21" r="2.2" fill="#d97706" />
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * Washi Tape Accent
 */
export function WashiTape({ className = "", color = "bg-amber-200/70" }) {
  return (
    <div
      className={`h-4 w-20 backdrop-blur-sm shadow-sm rounded-sm ${color} ${className}`}
      style={{
        clipPath: 'polygon(2% 0%, 98% 3%, 100% 96%, 0% 100%)'
      }}
    />
  );
}

/**
 * Modern Guitar Pick Graphic
 */
export function GuitarPick({ className = "" }) {
  return (
    <div className={`relative inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${className}`}>
      <svg className="w-9 h-11 drop-shadow-md" viewBox="0 0 100 120">
        <defs>
          <linearGradient id="pickGradModern" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="60%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
        </defs>
        <path
          d="M 50 115 C 20 85, 5 60, 5 30 C 5 10, 25 5, 50 5 C 75 5, 95 10, 95 30 C 95 60, 80 85, 50 115 Z"
          fill="url(#pickGradModern)"
          stroke="#78350f"
          strokeWidth="2"
        />
        <path
          d="M 28 20 C 38 12, 62 12, 72 20"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute top-5 text-[8px] font-bold uppercase tracking-widest text-amber-50 font-sans">
        SB
      </span>
    </div>
  );
}
