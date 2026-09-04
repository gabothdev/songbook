import React, { useState, useEffect, useRef } from 'react';
import { Play, Volume2 } from 'lucide-react';
import { loadBandoneonData, loadBandoneonSVG, findBandoneonChord } from '../../utils/loadBandoneon';
import { playBandoneonChordWithSamples, playBandoneonNoteWithSamples } from '../../utils/bandoneonSampler';
import { HandLeftIcon, HandRightIcon } from '../icons/InstrumentIcons';

/**
 * BandoneonDiagram Component for SongBook
 * Interactive vector Bandoneón diagram supporting:
 * - Left/Right hands (Mano Izquierda / Mano Derecha)
 * - Opening/Closing bellows (Fuelle Abriendo / Cerrando)
 * - Interactive button clicks with audio playback
 * - Visual chord highlighting in warm amber & vintage paper palette
 */
export default function BandoneonDiagram({
  chordName = 'C',
  hand = 'right',
  state = 'open',
  width = 320,
  height = 180,
  showNotes = true,
  onButtonClick = null,
  enableAudio = true,
  compact = true,
  onHandChange = null,
  onBellowsChange = null,
  variationIndex = 0,
  customButtons = [],
  className = '',
}) {
  const [svgContent, setSvgContent] = useState('');
  const [chordButtons, setChordButtons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const svgRef = useRef(null);

  // Load Bandoneon data and SVG
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [data, svg] = await Promise.all([
          loadBandoneonData(),
          loadBandoneonSVG(hand, state),
        ]);

        if (!isMounted) return;

        setSvgContent(svg);

        if (customButtons && customButtons.length > 0) {
          const filtered = customButtons.filter(
            (b) => (!b.hand || b.hand === hand) && (!b.state || b.state === state)
          );
          setChordButtons(filtered);
        } else if (chordName && chordName !== '𝄾' && chordName !== '𝄽') {
          const buttons = findBandoneonChord(chordName, hand, state, variationIndex);
          setChordButtons(buttons || []);
        } else {
          setChordButtons([]);
        }
      } catch (err) {
        console.error('Error cargando bandoneón:', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [chordName, hand, state, variationIndex, JSON.stringify(customButtons)]);

  // Highlight buttons on SVG DOM and bind click events
  useEffect(() => {
    if (!svgContent || !svgRef.current) return;

    const svgElement = svgRef.current;
    const circles = svgElement.querySelectorAll('circle');
    const texts = svgElement.querySelectorAll('text');

    // 1. Reset all buttons to vintage base state
    circles.forEach((circle, index) => {
      circle.style.fill = '#f5f0e6';
      circle.style.stroke = '#57463a';
      circle.style.strokeWidth = '1.5';
      circle.style.cursor = 'pointer';
      circle.style.transition = 'all 0.15s ease';

      const text = texts[index];
      if (text) {
        text.style.fill = '#44332a';
        text.style.fontWeight = 'bold';
        text.style.cursor = 'pointer';
        text.style.transition = 'all 0.15s ease';
      }
    });

    // 2. Highlight active chord buttons with amber glow
    if (chordButtons.length > 0) {
      chordButtons.forEach((button) => {
        const selector = `circle[data-col="${button.col}"][data-row="${button.row}"]`;
        const circle = svgElement.querySelector(selector);

        if (circle) {
          const index = Array.from(circles).indexOf(circle);
          const text = texts[index];

          circle.style.fill = '#b45309'; // amber-700
          circle.style.stroke = '#78350f'; // amber-900
          circle.style.strokeWidth = '2.5';
          circle.style.filter = 'drop-shadow(0 2px 4px rgba(180,83,9,0.4))';

          if (text) {
            text.style.fill = '#ffffff';
            text.style.fontWeight = '900';
          }
        }
      });
    }

    // 3. Click handler for individual note preview
    const cleanups = [];
    circles.forEach((circle, index) => {
      const text = texts[index];
      const col = circle.getAttribute('data-col');
      const row = circle.getAttribute('data-row');

      const handleClick = async (e) => {
        if (e) e.stopPropagation();
        const note = text ? text.textContent : null;
        if (note && col && row) {
          if (enableAudio) {
            playBandoneonNoteWithSamples(note, '4n', state);
          }
          if (onButtonClick) {
            onButtonClick(note, {
              hand,
              state,
              col: parseInt(col, 10),
              row: parseInt(row, 10),
            });
          }
        }
      };

      circle.addEventListener('click', handleClick);
      if (text) text.addEventListener('click', handleClick);

      cleanups.push(() => {
        circle.removeEventListener('click', handleClick);
        if (text) text.removeEventListener('click', handleClick);
      });
    });

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [svgContent, chordButtons, hand, state, enableAudio, onButtonClick]);

  const handlePlayChord = (e) => {
    if (e) e.stopPropagation();
    if (!enableAudio || chordButtons.length === 0) return;
    const notes = chordButtons.map((b) => b.note || b.openNote || b.closeNote);
    playBandoneonChordWithSamples(notes, '2n', state);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-[#faf6ee] rounded-2xl border border-stone-200 text-stone-500 font-sans text-xs">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-amber-700 mb-2"></div>
        <span>Cargando teclado de bandoneón...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-700 text-xs">
        <p className="font-bold">No se pudo cargar el bandoneón</p>
        <p className="text-[11px] opacity-80 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bandoneon-diagram flex flex-col items-center ${className}`}>
      {/* Hand & Bellows Controls */}
      <div className="flex items-center justify-between w-full gap-3 mb-3 px-1">
        {/* Hand Selector */}
        <div className="flex items-center gap-1 bg-[#ede7df] p-1 rounded-xl border border-stone-300 shadow-2xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHandChange && onHandChange('left');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer ${
              hand === 'left'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Mano Izquierda"
          >
            <HandLeftIcon className="w-3.5 h-3.5" />
            <span className="text-[10px]">Izq</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHandChange && onHandChange('right');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer ${
              hand === 'right'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Mano Derecha"
          >
            <HandRightIcon className="w-3.5 h-3.5" />
            <span className="text-[10px]">Der</span>
          </button>
        </div>

        {/* Play Chord Button */}
        {chordButtons.length > 0 && (
          <button
            type="button"
            onClick={handlePlayChord}
            className="p-2 sm:p-2.5 bg-amber-700 hover:bg-amber-600 active:scale-95 text-white rounded-full shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center"
            title="Reproducir acorde en bandoneón"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        )}

        {/* Bellows State (Abriendo / Cerrando) */}
        <div className="flex items-center gap-1 bg-[#ede7df] p-1 rounded-xl border border-stone-300 shadow-2xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBellowsChange && onBellowsChange('open');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              state === 'open'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Fuelle Abriendo (A)"
          >
            A
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBellowsChange && onBellowsChange('close');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              state === 'close'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Fuelle Cerrando (C)"
          >
            C
          </button>
        </div>
      </div>

      {/* SVG Diagram Canvas */}
      <div
        ref={svgRef}
        className="bandoneon-svg w-full flex justify-center overflow-visible select-none drop-shadow-sm"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
