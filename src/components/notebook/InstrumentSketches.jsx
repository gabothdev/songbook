import React from 'react';

/**
 * Hand-drawn artistic sketch of instruments: Acoustic Guitar, Bandoneon, Keyboard and Ukulele
 * Styled with warm ink transparency to look like pencil/ink illustrations sketched directly on the paper.
 */
export default function InstrumentSketches({ className = "" }) {
  return (
    <div className={`relative w-full flex items-center justify-center pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 520 280"
        className="w-full h-auto text-stone-700/80 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sketchInk" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#443a34" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#292524" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#574c43" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* ================= 1. GUITARRA ACÚSTICA (Izquierda / Centro) ================= */}
        <g stroke="url(#sketchInk)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {/* Cuerpo de la guitarra (forma de 8 con curvas elegantes) */}
          <path d="M 120 180 C 105 140, 60 145, 60 190 C 60 235, 100 260, 145 260 C 190 260, 215 230, 215 190 C 215 150, 185 140, 165 125 C 150 115, 155 85, 140 70 C 125 55, 105 60, 95 80 C 85 100, 100 115, 120 130 Z" opacity="0.85" />
          {/* Roseta / Boca de la guitarra */}
          <circle cx="138" cy="150" r="18" strokeWidth="1.4" opacity="0.9" />
          <circle cx="138" cy="150" r="14" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
          {/* Puente */}
          <rect x="122" y="215" width="34" height="6" rx="2" strokeWidth="1.3" opacity="0.8" />
          <line x1="126" y1="218" x2="152" y2="218" strokeWidth="0.9" />
          {/* Mástil */}
          <path d="M 128 75 L 128 -5 L 146 -5 L 146 75" strokeWidth="1.4" opacity="0.8" />
          {/* Trastes */}
          <line x1="128" y1="15" x2="146" y2="15" strokeWidth="0.9" opacity="0.5" />
          <line x1="128" y1="30" x2="146" y2="30" strokeWidth="0.9" opacity="0.5" />
          <line x1="128" y1="45" x2="146" y2="45" strokeWidth="0.9" opacity="0.5" />
          <line x1="128" y1="60" x2="146" y2="60" strokeWidth="0.9" opacity="0.5" />
          {/* Cuerdas vibrantes */}
          <line x1="131" y1="-5" x2="131" y2="215" strokeWidth="0.7" opacity="0.6" />
          <line x1="134" y1="-5" x2="134" y2="215" strokeWidth="0.7" opacity="0.6" />
          <line x1="137" y1="-5" x2="137" y2="215" strokeWidth="0.7" opacity="0.6" />
          <line x1="140" y1="-5" x2="140" y2="215" strokeWidth="0.7" opacity="0.6" />
          <line x1="143" y1="-5" x2="143" y2="215" strokeWidth="0.7" opacity="0.6" />
        </g>

        {/* ================= 2. BANDONEÓN (Centro / Derecha) ================= */}
        <g stroke="url(#sketchInk)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(180, 50)">
          {/* Caja lateral izquierda de madera */}
          <path d="M 30 50 L 30 150 L 65 160 L 65 40 Z" strokeWidth="1.6" opacity="0.9" />
          {/* Botones / Teclado del bandoneón izquierdo */}
          <circle cx="45" cy="70" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="52" cy="82" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="42" cy="94" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="50" cy="106" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="44" cy="118" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="52" cy="130" r="2.5" fill="#443a34" opacity="0.7" />

          {/* Pliegues del fuelle (Fuelle de tango en zigzag característico) */}
          <path d="M 65 40 L 80 32 L 95 40 L 110 32 L 125 40 L 140 32 L 155 40" strokeWidth="1.4" opacity="0.85" />
          <path d="M 65 160 L 80 168 L 95 160 L 110 168 L 125 160 L 140 168 L 155 160" strokeWidth="1.4" opacity="0.85" />
          {/* Líneas verticales de los pliegues */}
          <line x1="80" y1="32" x2="80" y2="168" strokeWidth="1.1" strokeDasharray="5 3" opacity="0.6" />
          <line x1="95" y1="40" x2="95" y2="160" strokeWidth="1.2" opacity="0.7" />
          <line x1="110" y1="32" x2="110" y2="168" strokeWidth="1.1" strokeDasharray="5 3" opacity="0.6" />
          <line x1="125" y1="40" x2="125" y2="160" strokeWidth="1.2" opacity="0.7" />
          <line x1="140" y1="32" x2="140" y2="168" strokeWidth="1.1" strokeDasharray="5 3" opacity="0.6" />

          {/* Caja lateral derecha */}
          <path d="M 155 40 L 190 50 L 190 150 L 155 160 Z" strokeWidth="1.6" opacity="0.9" />
          {/* Botones derechos */}
          <circle cx="170" cy="72" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="178" cy="85" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="168" cy="98" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="176" cy="110" r="2.5" fill="#443a34" opacity="0.7" />
          <circle cx="170" cy="124" r="2.5" fill="#443a34" opacity="0.7" />
          {/* Lira / Calado decorativo */}
          <path d="M 165 60 C 175 58, 175 64, 182 62" strokeWidth="1" opacity="0.5" />
        </g>

        {/* ================= 3. TECLADO / PIANO (Fondo / Base) ================= */}
        <g stroke="url(#sketchInk)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(40, 200)">
          {/* Marco del teclado curvado en perspectiva */}
          <path d="M 160 30 L 460 10 L 465 50 L 165 70 Z" strokeWidth="1.5" opacity="0.8" />
          
          {/* Teclas blancas */}
          {Array.from({ length: 18 }).map((_, i) => {
            const x1 = 160 + i * 16.5;
            const y1 = 30 - i * 1.1;
            const x2 = 165 + i * 16.5;
            const y2 = 70 - i * 1.1;
            return (
              <line key={`key-w-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1" opacity="0.5" />
            );
          })}

          {/* Teclas negras (patrón de 2 y 3) */}
          {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15].map((kIdx) => {
            const bx = 168 + kIdx * 16.5;
            const by = 28 - kIdx * 1.1;
            return (
              <path
                key={`key-b-${kIdx}`}
                d={`M ${bx} ${by} L ${bx + 9} ${by - 0.6} L ${bx + 11} ${by + 24} L ${bx + 2} ${by + 25} Z`}
                fill="#443a34"
                opacity="0.85"
              />
            );
          })}
        </g>

        {/* ================= 4. UKELELE (Derecha) ================= */}
        <g stroke="url(#sketchInk)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(370, 20)">
          {/* Cuerpo pequeño y redondeado */}
          <path d="M 60 130 C 50 100, 20 105, 20 135 C 20 170, 45 190, 75 190 C 105 190, 125 170, 125 135 C 125 105, 105 100, 90 85 C 80 75, 85 55, 75 45 C 65 35, 50 38, 45 50 C 38 65, 48 75, 60 90 Z" opacity="0.8" />
          {/* Boca del ukelele */}
          <circle cx="72" cy="108" r="12" strokeWidth="1.2" opacity="0.8" />
          {/* Puente */}
          <rect x="60" y="155" width="26" height="5" rx="1.5" strokeWidth="1.2" opacity="0.8" />
          {/* Mástil corto de 4 cuerdas */}
          <path d="M 64 50 L 64 -5 L 78 -5 L 78 50" strokeWidth="1.3" opacity="0.8" />
          {/* Clavijero */}
          <circle cx="58" cy="-2" r="2" opacity="0.7" />
          <circle cx="58" cy="12" r="2" opacity="0.7" />
          <circle cx="84" cy="-2" r="2" opacity="0.7" />
          <circle cx="84" cy="12" r="2" opacity="0.7" />
          {/* 4 Cuerdas */}
          <line x1="66" y1="-5" x2="66" y2="155" strokeWidth="0.7" opacity="0.6" />
          <line x1="69" y1="-5" x2="69" y2="155" strokeWidth="0.7" opacity="0.6" />
          <line x1="72" y1="-5" x2="72" y2="155" strokeWidth="0.7" opacity="0.6" />
          <line x1="75" y1="-5" x2="75" y2="155" strokeWidth="0.7" opacity="0.6" />
        </g>

        {/* Sutiles notas musicales flotando entre los instrumentos */}
        <g fill="#443a34" opacity="0.4" transform="translate(180, 20)">
          <path d="M 40 40 L 40 25 L 55 20 L 55 35 Z M 40 40 A 4 3 0 1 1 34 38 A 4 3 0 0 1 40 40 M 55 35 A 4 3 0 1 1 49 33 A 4 3 0 0 1 55 35" />
          <path d="M 120 15 L 120 30 A 3 2.5 0 1 1 115 28" />
        </g>
      </svg>
    </div>
  );
}
