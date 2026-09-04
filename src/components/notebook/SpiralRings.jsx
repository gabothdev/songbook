import React from 'react';

/**
 * Photorealistic Twin-Loop Wire-O Notebook Binding.
 * Sized in classic compact proportions with perfectly aligned punch holes that pierce into the paper margins.
 */
export default function SpiralRings({ count = 12, className = "" }) {
  const rings = Array.from({ length: count });

  return (
    <div className={`relative flex flex-col justify-around items-center h-full py-4 select-none pointer-events-none z-20 ${className}`}>
      {rings.map((_, i) => (
        <div key={i} className="relative flex items-center justify-between w-11 h-6 my-0.5">
          {/* Left Paper Punch Hole (pierces the inner margin of left page) */}
          <div 
            className="w-2.5 h-3.5 rounded-full bg-[#181412] shadow-[inset_1px_1.5px_2px_rgba(0,0,0,0.9),0_1px_0.5px_rgba(255,255,255,0.7)] -ml-1.5 flex-shrink-0 z-10"
            title="Left punch hole"
          />

          {/* Twin-Wire Metallic Coil Loop */}
          <svg className="w-10 h-6 overflow-visible drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] z-20" viewBox="0 0 40 24" fill="none">
            <defs>
              <linearGradient id={`wireGradTop-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="25%" stopColor="#cbd5e1" />
                <stop offset="65%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              <linearGradient id={`wireGradBottom-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#94a3b8" />
                <stop offset="80%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* Wire 1 (Upper loop entering hole centers) */}
            <path
              d="M 2 8 C 2 1, 38 1, 38 8 C 38 14, 2 14, 2 8"
              stroke={`url(#wireGradTop-${i})`}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Upper specular sheen highlight */}
            <path
              d="M 6 5 C 14 2.5, 26 2.5, 34 5"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.95"
            />

            {/* Wire 2 (Lower loop entering hole centers) */}
            <path
              d="M 2 16 C 2 9, 38 9, 38 16 C 38 22, 2 22, 2 16"
              stroke={`url(#wireGradBottom-${i})`}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Lower specular sheen highlight */}
            <path
              d="M 6 13 C 14 10.5, 26 10.5, 34 13"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.95"
            />
          </svg>

          {/* Right Paper Punch Hole (pierces the inner margin of right page) */}
          <div 
            className="w-2.5 h-3.5 rounded-full bg-[#181412] shadow-[inset_1px_1.5px_2px_rgba(0,0,0,0.9),0_1px_0.5px_rgba(255,255,255,0.7)] -mr-1.5 flex-shrink-0 z-10"
            title="Right punch hole"
          />
        </div>
      ))}
    </div>
  );
}
