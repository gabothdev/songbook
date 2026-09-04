import React, { useState, useEffect } from 'react';
import { playStrummedChord, getNotesFromFrets } from '../../utils/audioPlayer';
import { getNoteAt, getIntervalLabel, getChordRoot, CHROMATIC_INDEX } from '../../utils/musicEngine';

export const STANDARD_CHORDS = {
  C: { chordName: 'C', frets: 'x32010', fingers: '032010', position: 1, barres: [] },
  G: { chordName: 'G', frets: '320033', fingers: '210034', position: 1, barres: [] },
  Am: { chordName: 'Am', frets: 'x02210', fingers: '002310', position: 1, barres: [] },
  Em: { chordName: 'Em', frets: '022000', fingers: '023000', position: 1, barres: [] },
  D: { chordName: 'D', frets: 'xx0232', fingers: '000132', position: 1, barres: [] },
};

const NUM_STRINGS = 6;
const NUM_FRETS = 5;
const WIDTH = 140;
const HEIGHT = 180;
const MARGIN = 30;
const FRET_HEIGHT = (HEIGHT - 2 * MARGIN) / NUM_FRETS;
const STRING_SPACING = (WIDTH - 2 * MARGIN) / (NUM_STRINGS - 1);

function getStringX(stringNum) {
  // string: 1 (E agudo) a 6 (E grave)
  return MARGIN + (NUM_STRINGS - stringNum) * STRING_SPACING;
}

function getFretY(fret) {
  // fret: 0 (cejuela), 1...NUM_FRETS
  return MARGIN + fret * FRET_HEIGHT;
}

/**
 * ChordKing-Style Interactive Guitar Chord Diagram
 * Full support for sequential string vibration animation, barres with start/end finger numbers,
 * interval display mode (R, 3M, 5, 7m...), and hex frets.
 */
export default function GuitarChordDiagram({
  chord = {},
  isSelected = false,
  onClick,
  className = '',
  dotColor = '#78350f',
  dotTextColor = '#ffffff',
  nutColor = '#292524',
  fretColor = '#78716c',
  stringColor = '#78716c',
  labelColor = '#1c1917',
  showPlayOverlay = true,
  showIntervals = false,
  playTrigger = 0,
}) {
  const { chordName = '', frets = '', fingers = '', barres = [], position = 1 } = chord;
  const [vibratingStrings, setVibratingStrings] = useState(new Set());

  const fretsArr = Array.isArray(frets)
    ? [...frets]
    : typeof frets === 'string'
    ? frets.padStart(NUM_STRINGS, 'x').split('')
    : Array(NUM_STRINGS).fill('x');

  const fingersArr = Array.isArray(fingers)
    ? [...fingers]
    : typeof fingers === 'string'
    ? fingers.padStart(NUM_STRINGS, '0').split('')
    : Array(NUM_STRINGS).fill('0');

  const chordRoot = getChordRoot(chordName) || 'C';

  const triggerVibration = () => {
    const playableStrings = [];
    for (let i = 0; i < NUM_STRINGS; i++) {
      const f = fretsArr[i];
      if (f !== undefined && f !== 'x' && f !== 'X') {
        playableStrings.push(NUM_STRINGS - 1 - i);
      }
    }

    const strumDelay = 45;
    playableStrings.forEach((stringIndex, i) => {
      setTimeout(() => {
        setVibratingStrings((prev) => new Set(prev).add(stringIndex));
      }, i * strumDelay);
    });
  };

  // Trigger vibration whenever playTrigger updates
  useEffect(() => {
    if (playTrigger > 0) {
      triggerVibration();
    }
  }, [playTrigger]);

  // Trigger sequential string vibration animation and play sound
  const handleStrum = (e) => {
    if (e) e.stopPropagation();

    // 1. Play sound
    const rawFrets = typeof frets === 'string' ? frets : fretsArr.join('');
    const notes = getNotesFromFrets(rawFrets);
    playStrummedChord(notes);

    // 2. Animate vibrating strings
    triggerVibration();

    if (onClick) onClick(chord);
  };

  // Parse fret numbers and find min/max frets
  let minFret = 100;
  let maxFret = 0;

  for (let i = 0; i < fretsArr.length; i++) {
    const f = fretsArr[i];
    if (f !== 'x' && f !== 'X' && f !== '0') {
      const n = f.length > 1 ? parseInt(f, 10) : parseInt(f, 36);
      if (!isNaN(n)) {
        if (n < minFret) minFret = n;
        if (n > maxFret) maxFret = n;
      }
    }
  }

  let showNut = false;
  let diagramPosition = 1;

  if (position && position > 1) {
    diagramPosition = position;
  } else if (minFret !== 100 && maxFret > NUM_FRETS) {
    diagramPosition = minFret;
  } else {
    diagramPosition = 1;
  }

  if (maxFret <= NUM_FRETS && minFret !== 100) {
    showNut = true;
    diagramPosition = 1;
  } else if (diagramPosition <= 1) {
    showNut = true;
    diagramPosition = 1;
  } else {
    showNut = false;
  }

  // Dots
  const dots = fretsArr
    .map((f, i) => {
      if (f !== 'x' && f !== 'X' && f !== '0') {
        const fretNum = f.length > 1 ? parseInt(f, 10) : parseInt(f, 36);
        const stringNum = NUM_STRINGS - i;
        const finger = fingersArr[i] !== '0' ? fingersArr[i] : undefined;

        let label = finger;
        if (showIntervals && chordRoot) {
          const noteSemitone = getNoteAt('guitar', stringNum, fretNum);
          label = getIntervalLabel(chordRoot, noteSemitone);
        }

        return { string: stringNum, fret: fretNum, finger: label };
      }
      return null;
    })
    .filter(Boolean);

  const muted = fretsArr.map((f) => f === 'x' || f === 'X');
  const open = fretsArr.map((f) => f === '0');

  // Detect barre positions
  let finalBarres = [];
  if (Array.isArray(barres) && barres.length > 0) {
    if (typeof barres[0] === 'object') {
      finalBarres = [...barres];
    } else {
      const barreFret = parseInt(barres[0], 10) || minFret;
      finalBarres.push({ fromString: 6, toString: 1, fret: barreFret });
    }
  } else if (fingersArr.length > 0 && fretsArr.length > 0) {
    const fingerMap = {};
    for (let i = 0; i < fingersArr.length; i++) {
      const finger = fingersArr[i];
      const fret = fretsArr[i];
      if (finger && finger !== '0' && fret !== 'x' && fret !== '0') {
        if (!fingerMap[finger]) fingerMap[finger] = [];
        const fretNum = fret.length > 1 ? parseInt(fret, 10) : parseInt(fret, 36);
        fingerMap[finger].push({ string: NUM_STRINGS - i, fret: fretNum });
      }
    }
    for (const finger in fingerMap) {
      const arr = fingerMap[finger];
      if (arr.length >= 2) {
        const traste = arr[0].fret;
        if (arr.every((x) => x.fret === traste)) {
          const strings = arr.map((x) => x.string);
          finalBarres.push({
            fromString: Math.max(...strings),
            toString: Math.min(...strings),
            fret: traste,
          });
        }
      }
    }
  }

  const barrePositions = [];
  finalBarres.forEach((barre) => {
    for (let s = barre.fromString; s >= barre.toString; s--) {
      barrePositions.push(`${s}-${barre.fret}`);
    }
  });

  const filteredDots = dots.filter(
    (dot) => !barrePositions.includes(`${dot.string}-${dot.fret}`)
  );

  // Offset relative frets for diagram display
  let dotsToDraw = filteredDots;
  let barresToDraw = finalBarres;

  if (diagramPosition > 1) {
    const offset = diagramPosition - 1;
    dotsToDraw = filteredDots.map((dot) => ({
      ...dot,
      fret: dot.fret - offset,
    }));
    barresToDraw = finalBarres.map((barre) => ({
      ...barre,
      fret: barre.fret - offset,
    }));
  }

  return (
    <div
      onClick={handleStrum}
      className={`group relative flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all duration-200 cursor-pointer select-none ${className}`}
    >
      <div className="w-full aspect-[140/180] flex items-center justify-center relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-full overflow-visible"
          style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
        >
          {/* Strings with vibration animation */}
          {Array.from({ length: NUM_STRINGS }, (_, i) => {
            const stringIndex = i;
            const stringNum = i + 1;
            return (
              <line
                key={`string-${stringIndex}`}
                className={vibratingStrings.has(stringIndex) ? 'vibrating' : ''}
                onAnimationEnd={() => {
                  setVibratingStrings((prev) => {
                    const next = new Set(prev);
                    next.delete(stringIndex);
                    return next;
                  });
                }}
                x1={getStringX(stringNum)}
                y1={MARGIN}
                x2={getStringX(stringNum)}
                y2={HEIGHT - MARGIN}
                stroke={stringColor}
                strokeWidth={stringNum > 3 ? 2.2 : 1.6}
              />
            );
          })}

          {/* Frets */}
          {Array.from({ length: NUM_FRETS + 1 }, (_, i) => (
            <line
              key={`fret-${i}`}
              x1={MARGIN}
              y1={getFretY(i)}
              x2={WIDTH - MARGIN}
              y2={getFretY(i)}
              stroke={fretColor}
              strokeWidth={i === 0 && showNut ? 6 : 1.8}
            />
          ))}

          {/* Nut (Cejuela superior) */}
          {showNut && (
            <rect
              x={MARGIN - 2}
              y={getFretY(0) - 3}
              width={WIDTH - 2 * MARGIN + 4}
              height={6}
              rx={1}
              fill={nutColor}
            />
          )}

          {/* Position Text (Traste base si no es cejuela) */}
          {!showNut && diagramPosition > 1 && (
            <text
              x={MARGIN - 12}
              y={getFretY(1) - FRET_HEIGHT / 2 + 5}
              fontSize="14"
              fontWeight="900"
              fill={labelColor}
              textAnchor="end"
            >
              {diagramPosition}fr
            </text>
          )}

          {/* Muted (X) and Open (O) string markers */}
          {muted.map((isMuted, i) => {
            if (!isMuted) return null;
            const stringNum = NUM_STRINGS - i;
            const cx = getStringX(stringNum);
            const cy = MARGIN - 10;
            return (
              <g
                key={`muted-${stringNum}`}
                stroke={stringColor}
                strokeWidth={1.8}
                strokeLinecap="round"
              >
                <line x1={cx - 3.5} y1={cy - 3.5} x2={cx + 3.5} y2={cy + 3.5} />
                <line x1={cx + 3.5} y1={cy - 3.5} x2={cx - 3.5} y2={cy + 3.5} />
              </g>
            );
          })}

          {open.map((isOpen, i) => {
            if (!isOpen) return null;
            const stringNum = NUM_STRINGS - i;
            const cx = getStringX(stringNum);
            const cy = MARGIN - 10;

            let openLabel = null;
            if (showIntervals && chordRoot) {
              const noteSemitone = getNoteAt('guitar', stringNum, 0);
              openLabel = getIntervalLabel(chordRoot, noteSemitone);
            }

            if (openLabel) {
              return (
                <text
                  key={`open-label-${stringNum}`}
                  x={cx}
                  y={cy + 3}
                  fontSize="10"
                  fontWeight="900"
                  fill={stringColor}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {openLabel}
                </text>
              );
            }

            return (
              <circle
                key={`open-${stringNum}`}
                cx={cx}
                cy={cy}
                r={4}
                stroke={stringColor}
                strokeWidth={1.8}
                fill="none"
              />
            );
          })}

          {/* Barres (Cejillas redondeadas con número de dedo o intervalo) */}
          {barresToDraw.map((barre, idx) => {
            if (barre.fret < 1 || barre.fret > NUM_FRETS) return null;
            const x1 = getStringX(barre.fromString);
            const x2 = getStringX(barre.toString);
            const y = getFretY(barre.fret) - FRET_HEIGHT / 2;

            const stringsToLabel = showIntervals
              ? Array.from(
                  { length: Math.abs(barre.fromString - barre.toString) + 1 },
                  (_, k) => Math.min(barre.fromString, barre.toString) + k
                )
              : [barre.fromString, barre.toString];

            return (
              <g key={`barre-${idx}`}>
                <rect
                  x={Math.min(x1, x2) - 8}
                  y={y - 8}
                  width={Math.abs(x2 - x1) + 16}
                  height={16}
                  rx={8}
                  fill={dotColor}
                  stroke={labelColor}
                  strokeWidth={1.5}
                />
                {stringsToLabel.map((stringNum) => {
                  const idxFinger = NUM_STRINGS - stringNum;
                  let label = fingersArr[idxFinger];

                  if (showIntervals && chordRoot) {
                    const absFret = barre.fret + (diagramPosition > 1 ? diagramPosition - 1 : 0);
                    const noteSemitone = getNoteAt('guitar', stringNum, absFret);
                    label = getIntervalLabel(chordRoot, noteSemitone);
                  } else if (!label || label === '0') {
                    const validFinger = fingersArr.find((f, i) => {
                      const fretStr = fretsArr[i];
                      const fretVal = fretStr.length > 1 ? parseInt(fretStr, 10) : parseInt(fretStr, 36);
                      return fretVal === barre.fret + (diagramPosition > 1 ? diagramPosition - 1 : 0) && f !== '0';
                    });
                    label = validFinger || '1';
                  }

                  return (
                    <text
                      key={`barre-label-${idx}-${stringNum}`}
                      x={getStringX(stringNum)}
                      y={y + 0.5}
                      fontSize={showIntervals ? "9" : "10"}
                      fontWeight="900"
                      fill={dotTextColor}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {label}
                    </text>
                  );
                })}
              </g>
            );
          })}

          {/* Finger / Interval Dots */}
          {dotsToDraw.map((dot, idx) => {
            if (dot.fret < 1 || dot.fret > NUM_FRETS) return null;
            const cx = getStringX(dot.string);
            const cy = getFretY(dot.fret) - FRET_HEIGHT / 2;
            return (
              <g key={`dot-${idx}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={8.5}
                  fill={dotColor}
                  stroke={labelColor}
                  strokeWidth={1.5}
                />
                {dot.finger && (
                  <text
                    x={cx}
                    y={cy}
                    fontSize={showIntervals ? "9" : "10"}
                    fontWeight="900"
                    fill={dotTextColor}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {dot.finger}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Play Icon Hover Overlay */}
        {showPlayOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-amber-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.748 1.295 2.536 0 3.284L7.279 20.99c-1.25.72-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
