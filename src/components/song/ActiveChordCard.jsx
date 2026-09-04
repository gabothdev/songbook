import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import GuitarChordDiagram, { STANDARD_CHORDS } from '../guitar/GuitarChordDiagram';
import BandoneonDiagram from '../bandoneon/BandoneonDiagram';
import ChordEditorModal from '../guitar/ChordEditorModal';
import { useInstrument } from '../../context/InstrumentContext';
import { CHORD_DATABASE } from '../../data/sampleSongs';
import { lookupChord } from '../../services/persistenceApi';

// In-memory cache for SQLite chord lookups
const chordCache = new Map();

/**
 * ChordKing-Inspired ActiveChordCard Component
 * Displays a large, high-visibility guitar/bandoneon chord diagram with vibrating strings animation,
 * hover edit pencil, interval inspection mode, and warm notebook colors.
 */
export default function ActiveChordCard({
  chordName = 'C',
  nextChordName = null,
  beatsUntilNext = null,
  selectedVariantIndex = 0,
  onVariantChange = null,
  onChordSelect = null,
}) {
  const { instrument } = useInstrument();
  const [chordData, setChordData] = useState(null);
  const [variantIndex, setVariantIndex] = useState(selectedVariantIndex || 0);
  const [bandoneonHand, setBandoneonHand] = useState('right');
  const [bandoneonState, setBandoneonState] = useState('open');
  const [playTrigger, setPlayTrigger] = useState(0);
  const [showIntervals, setShowIntervals] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const cleanName = (chordName || 'C').trim();

  // Sync variant index when prop or chord name changes
  useEffect(() => {
    setVariantIndex(selectedVariantIndex || 0);
  }, [selectedVariantIndex, cleanName, instrument]);

  // Fetch chord positions from SQLite database or fallback
  useEffect(() => {
    if (!cleanName || cleanName === '𝄾' || cleanName === '𝄽') return;

    const cacheKey = `${instrument}_${cleanName}`;
    if (chordCache.has(cacheKey)) {
      setChordData(chordCache.get(cacheKey));
      return;
    }

    let isMounted = true;

    lookupChord(cleanName, instrument)
      .then((data) => {
        if (!isMounted) return;

        if (data && data.positions && Array.isArray(data.positions) && data.positions.length > 0) {
          const result = {
            chordName: data.chordName || cleanName,
            positions: data.positions.map((p) => ({
              chordName: cleanName,
              frets: Array.isArray(p.frets) ? p.frets.map((f) => (f === -1 ? 'x' : String(f))).join('') : p.frets || 'x32010',
              fingers: Array.isArray(p.fingers) ? p.fingers.join('') : p.fingers || '032010',
              position: p.baseFret || p.position || 1,
              barres: p.barres || [],
            })),
          };
          chordCache.set(cacheKey, result);
          setChordData(result);
        } else {
          const fallbackDef = CHORD_DATABASE[cleanName] || STANDARD_CHORDS[cleanName] || {
            chordName: cleanName,
            frets: 'x32010',
            fingers: '032010',
            position: 1,
            barres: [],
          };
          const fallbackResult = {
            chordName: cleanName,
            positions: [fallbackDef],
          };
          chordCache.set(cacheKey, fallbackResult);
          setChordData(fallbackResult);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallbackDef = CHORD_DATABASE[cleanName] || {
          chordName: cleanName,
          frets: 'x32010',
          fingers: '032010',
          position: 1,
          barres: [],
        };
        setChordData({
          chordName: cleanName,
          positions: [fallbackDef],
        });
      });

    return () => {
      isMounted = false;
    };
  }, [cleanName]);

  const activePosition =
    chordData?.positions?.[variantIndex] ||
    chordData?.positions?.[0] ||
    CHORD_DATABASE[cleanName] || {
      chordName: cleanName,
      frets: 'x32010',
      fingers: '032010',
      position: 1,
      barres: [],
    };

  const totalVariants = chordData?.positions?.length || 1;

  const handlePlayActiveChord = () => {
    setPlayTrigger((prev) => prev + 1);
  };

  const handlePrevVariant = () => {
    const newIdx = variantIndex > 0 ? variantIndex - 1 : totalVariants - 1;
    setVariantIndex(newIdx);
    onVariantChange?.(cleanName, newIdx);
  };

  const handleNextVariant = () => {
    const newIdx = variantIndex < totalVariants - 1 ? variantIndex + 1 : 0;
    setVariantIndex(newIdx);
    onVariantChange?.(cleanName, newIdx);
  };

  const handleSaveCustomChord = (newChordData) => {
    const updatedPositions = [newChordData, ...(chordData?.positions || [])];
    const newResult = {
      chordName: cleanName,
      positions: updatedPositions,
    };
    chordCache.set(cleanName, newResult);
    setChordData(newResult);
    setVariantIndex(0); // Select new variation immediately
  };

  return (
    <>
      <div className="w-full bg-white/95 rounded-3xl border border-stone-300 shadow-sm p-4 sm:p-6 paper-texture flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* ================= CHORD DIAGRAM (GUITAR OR BANDONEON) ================= */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative group/diag">
            {instrument === 'bandoneon' ? (
              <BandoneonDiagram
                chordName={cleanName}
                hand={bandoneonHand}
                state={bandoneonState}
                onHandChange={setBandoneonHand}
                onBellowsChange={setBandoneonState}
                variationIndex={variantIndex}
                className="w-64 sm:w-72"
              />
            ) : (
              <GuitarChordDiagram
                chord={{ ...activePosition, chordName: cleanName }}
                isSelected={true}
                playTrigger={playTrigger}
                showIntervals={showIntervals}
                dotColor="#78350f"
                dotTextColor="#ffffff"
                labelColor="#1c1917"
                fretColor="#78716c"
                stringColor="#78716c"
                nutColor="#292524"
                className="w-48 sm:w-56 h-auto drop-shadow-sm hover:scale-[1.02]"
              />
            )}

            {/* Hover Edit Pencil Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditorOpen(true);
              }}
              className={`absolute ${
                instrument === 'bandoneon' ? 'bottom-0 right-0' : 'top-2 right-2'
              } p-2 bg-white/90 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-xl border border-stone-300 shadow-md opacity-0 group-hover/diag:opacity-100 transition-all duration-200 cursor-pointer z-30 transform hover:scale-110`}
              title="Editar o agregar nueva versión de este acorde"
            >
              <Pencil className="w-4 h-4 text-amber-800" />
            </button>
          </div>

          {/* Controls below diagram: Variants & Interval Toggle (For Guitar) */}
          {instrument === 'guitar' && (
            <div className="flex flex-col items-center gap-1.5 mt-2">
              {totalVariants > 1 && (
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-600">
                  <button
                    type="button"
                    onClick={handlePrevVariant}
                    className="p-1 rounded-lg hover:bg-stone-200 text-stone-700 cursor-pointer transition-colors"
                    title="Posición anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>
                    Var. {variantIndex + 1} de {totalVariants}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextVariant}
                    className="p-1 rounded-lg hover:bg-stone-200 text-stone-700 cursor-pointer transition-colors"
                    title="Siguiente posición"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Intervals Toggle Button */}
              <button
                type="button"
                onClick={() => setShowIntervals(!showIntervals)}
                className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 hover:text-amber-900 bg-stone-100/80 hover:bg-amber-50 px-2.5 py-0.5 rounded-lg border border-stone-200 transition-all cursor-pointer"
              >
                {showIntervals ? 'Dedos (1-4)' : 'Intervalos (R, 3M, 5)'}
              </button>
            </div>
          )}
        </div>

        {/* ================= CHORD NAME & CONTROLS ================= */}
        <div className="flex-1 flex flex-col items-center sm:items-start justify-center text-center sm:text-left space-y-4">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-700 block mb-1">
              Acorde Sonando
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h3 className="text-5xl sm:text-6xl font-serif font-black text-stone-900 tracking-tight">
                {cleanName}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="p-1.5 rounded-xl hover:bg-amber-100 text-stone-400 hover:text-amber-800 transition-colors cursor-pointer"
                title="Personalizar acorde"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            {activePosition.position > 1 && (
              <span className="inline-block mt-1 font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
                Traste base: {activePosition.position}
              </span>
            )}
          </div>

          {/* Sound Button */}
          <button
            type="button"
            onClick={handlePlayActiveChord}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-600 active:scale-95 text-white rounded-2xl text-sm font-bold font-sans transition-all cursor-pointer shadow-md"
          >
            <Volume2 className="w-4 h-4" />
            <span>Oír Acorde</span>
          </button>

          {/* Next Chord Pill */}
          {nextChordName && (
            <div className="flex items-center gap-2 pt-2 border-t border-stone-200/80 w-full justify-center sm:justify-start">
              <span className="text-xs font-sans text-stone-500 font-medium">Siguiente:</span>
              <span className="px-2.5 py-1 bg-amber-100/90 text-amber-950 border border-amber-300 font-serif font-bold text-sm rounded-lg shadow-2xs flex items-center gap-1.5">
                <span>{nextChordName}</span>
                {beatsUntilNext !== null && beatsUntilNext > 0 && (
                  <span className="text-[10px] font-mono text-amber-800 font-semibold">
                    (en {beatsUntilNext}t)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* ================= CHORD EDITOR MODAL ================= */}
      {isEditorOpen && (
        <ChordEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          instrument={instrument}
          initialChordName={cleanName}
          initialFrets={activePosition.frets}
          initialFingers={activePosition.fingers}
          initialPosition={activePosition.position}
          onSaveChord={handleSaveCustomChord}
        />
      )}
    </>
  );
}
