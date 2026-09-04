import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Music, Check, Sparkles } from 'lucide-react';
import GuitarChordDiagram from './GuitarChordDiagram';
import { getNoteAt, CHROMATIC_INDEX } from '../../utils/musicEngine';
import { getAllChordSuggestions } from '../../utils/chordNormalization';
import { saveCustomChord } from '../../services/persistenceApi';

const GUITAR_OPEN_NOTES = [4, 9, 2, 7, 11, 4]; // E2, A2, D3, G3, B3, E4 semitones from C

function getNoteAtFret(stringIndex, fretStr) {
  if (!fretStr || fretStr.toLowerCase() === 'x') return '-';
  const fretNum = fretStr.length > 1 ? parseInt(fretStr, 10) : parseInt(fretStr, 36);
  if (isNaN(fretNum)) return '-';
  const openNote = GUITAR_OPEN_NOTES[stringIndex];
  const noteIndex = (openNote + fretNum) % 12;
  return CHROMATIC_INDEX[noteIndex];
}

/**
 * ChordEditorModal Component for SongBook
 * Interactive modal to create and edit custom guitar chord positions with live SVG preview,
 * interval inspection mode, and automatic chord name recognition enabled by default.
 */
export default function ChordEditorModal({
  isOpen = false,
  onClose,
  instrument = 'guitar',
  initialChordName = 'C',
  initialFrets = 'x32010',
  initialFingers = '032010',
  initialPosition = 1,
  onSaveChord,
}) {
  const [chordName, setChordName] = useState(initialChordName);
  const [frets, setFrets] = useState(['x', '3', '2', '0', '1', '0']);
  const [fingers, setFingers] = useState(['0', '3', '2', '0', '1', '0']);
  const [basePosition, setBasePosition] = useState(initialPosition || 1);
  const [isAutoName, setIsAutoName] = useState(true); // Siempre empieza activado
  const [showIntervals, setShowIntervals] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Initialize data when opened - Auto-detection always enabled by default
  useEffect(() => {
    if (isOpen) {
      setChordName(initialChordName || 'C');
      setIsAutoName(true); // Siempre empieza activado por defecto

      const fretsArr = typeof initialFrets === 'string'
        ? initialFrets.padStart(6, 'x').split('')
        : Array.isArray(initialFrets)
        ? [...initialFrets]
        : ['x', '3', '2', '0', '1', '0'];

      const fingersArr = typeof initialFingers === 'string'
        ? initialFingers.padStart(6, '0').split('')
        : Array.isArray(initialFingers)
        ? [...initialFingers]
        : ['0', '3', '2', '0', '1', '0'];

      setFrets(fretsArr);
      setFingers(fingersArr);
      setBasePosition(initialPosition || 1);
    }
  }, [isOpen, initialChordName, initialFrets, initialFingers, initialPosition]);

  // Real-time automatic chord name detection & suggestions calculation
  useEffect(() => {
    if (!isOpen) return;

    const detectedNotes = frets
      .map((f, i) => getNoteAtFret(i, f))
      .filter((n) => n && n !== '-');

    if (detectedNotes.length >= 2) {
      const allSugs = getAllChordSuggestions(detectedNotes);
      setSuggestions(allSugs);

      if (isAutoName) {
        if (allSugs.length > 0) {
          if (allSugs[0] !== chordName) setChordName(allSugs[0]);
        } else if (chordName !== 'No reconocido') {
          setChordName('No reconocido');
        }
      }
    } else {
      setSuggestions([]);
      if (isAutoName) {
        if (detectedNotes.length > 0 && chordName !== 'Incompleto') {
          setChordName('Incompleto');
        } else if (detectedNotes.length === 0 && chordName !== '') {
          setChordName('');
        }
      }
    }
  }, [frets, isAutoName, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentFretsStr = frets.map((f) => (f === '' ? 'x' : f)).join('');
  const currentFingersStr = fingers.map((f) => (f === '' ? '0' : f)).join('');

  const handleFretChange = (index, val) => {
    const clean = val.replace(/[^0-9xa-fA-F]/g, '');
    const next = [...frets];
    next[index] = clean === '' ? '' : clean.charAt(clean.length - 1);
    setFrets(next);
  };

  const handleFingerChange = (index, val) => {
    const clean = val.replace(/[^0-4]/g, '');
    const next = [...fingers];
    next[index] = clean === '' ? '0' : clean.charAt(clean.length - 1);
    setFingers(next);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const chordPayload = {
      chordName: chordName.trim() || 'Custom',
      frets: currentFretsStr,
      fingers: currentFingersStr,
      position: basePosition || 1,
      barres: [],
    };

    try {
      const res = await saveCustomChord({
        instrument,
        chordName: chordPayload.chordName,
        data: [chordPayload],
      });

      if (res) {
        setToastMsg('¡Variación guardada con éxito!');
        if (onSaveChord) {
          onSaveChord(chordPayload);
        }
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setToastMsg('Guardado localmente en esta sesión');
        if (onSaveChord) {
          onSaveChord(chordPayload);
        }
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      console.warn('Error saving chord:', err);
      setToastMsg('Guardado localmente');
      if (onSaveChord) {
        onSaveChord(chordPayload);
      }
      setTimeout(() => {
        onClose();
      }, 800);
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-white rounded-3xl border border-stone-300 shadow-2xl overflow-hidden paper-texture flex flex-col relative z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-[#f8f5ee]">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-900 rounded-xl border border-amber-300 shadow-xs">
                <Music className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif font-black text-lg text-stone-900">
                  Editor de Acorde Personalizado
                </h3>
                <p className="text-[11px] font-sans text-stone-500">
                  Autodetección armónica e inspección de intervalos
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: 2 Columns */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Left Column: Live Preview & Intervals Toggle */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#fbf9f4] rounded-2xl border border-stone-200 shadow-inner">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 mb-2">
                Vista Previa en Tiempo Real
              </span>

              <GuitarChordDiagram
                chord={{
                  chordName,
                  frets: currentFretsStr,
                  fingers: currentFingersStr,
                  position: basePosition,
                }}
                isSelected={true}
                showPlayOverlay={true}
                showIntervals={showIntervals}
                className="w-40 sm:w-44 h-auto drop-shadow-sm"
              />

              {/* Intervals / Fingers Toggle Button */}
              <button
                type="button"
                onClick={() => setShowIntervals(!showIntervals)}
                className="mt-3 text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 hover:text-amber-900 bg-white hover:bg-amber-50 px-3 py-1 rounded-xl border border-stone-300 shadow-2xs transition-all cursor-pointer"
              >
                {showIntervals ? '← Ver Dedos (1-4)' : 'Ver Intervalos (R, 3M, 5) →'}
              </button>
            </div>

            {/* Right Column: Fretboard Inputs & Suggestions */}
            <div className="space-y-4">
              {/* Chord Name Input with Auto-detection indicator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Nombre del Acorde
                  </label>
                  {isAutoName ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                      <Sparkles className="w-3 h-3 text-amber-700" />
                      Auto-detectado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAutoName(true)}
                      className="text-[10px] font-mono text-amber-800 hover:underline cursor-pointer font-semibold"
                    >
                      Reanudar auto-detección
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={chordName}
                  onChange={(e) => {
                    setChordName(e.target.value);
                    setIsAutoName(false); // Solo se desactiva si el usuario escribe manualmente su propio nombre
                  }}
                  placeholder="ej. B, F#m, C7..."
                  className={`w-full px-3 py-2 bg-white border rounded-xl font-serif font-black text-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs ${
                    isAutoName ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-stone-300'
                  }`}
                />

                {/* Alternate Suggestions Pills */}
                {suggestions.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-sans font-semibold text-stone-400">
                      Opciones:
                    </span>
                    {suggestions.slice(0, 4).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setChordName(sug);
                          setIsAutoName(false);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-serif font-bold transition-all border cursor-pointer ${
                          sug === chordName
                            ? 'bg-amber-700 text-white border-amber-800 shadow-2xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Base Fret (Traste Base) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Traste Base del Diagrama
                </label>
                <input
                  type="number"
                  min="1"
                  max="19"
                  value={basePosition}
                  onChange={(e) => setBasePosition(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 px-3 py-1.5 bg-white border border-stone-300 rounded-xl font-mono font-bold text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              {/* Frets per string (6 to 1) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1.5">
                  Trastes (6ª a 1ª cuerda)
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {frets.map((f, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-mono text-stone-400 font-bold">
                        {6 - i}ª
                      </span>
                      <input
                        type="text"
                        value={f}
                        onChange={(e) => handleFretChange(i, e.target.value)}
                        placeholder="x"
                        className="w-full text-center py-1.5 bg-white border border-stone-300 rounded-lg font-mono font-bold text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                      />
                      <span className="text-[10px] font-mono font-bold text-amber-900">
                        {getNoteAtFret(i, f)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fingers per string (0-4) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1.5">
                  Dedos (1=Índice, 2=Medio, 3=Anular, 4=Meñique, 0=Libre)
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {fingers.map((fg, i) => (
                    <input
                      key={i}
                      type="text"
                      value={fg}
                      onChange={(e) => handleFingerChange(i, e.target.value)}
                      placeholder="0"
                      className="w-full text-center py-1 bg-white border border-stone-200 rounded-lg font-mono font-semibold text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-stone-200 bg-[#f8f5ee] flex items-center justify-between">
            <div>
              {toastMsg && (
                <span className="text-xs font-sans font-bold text-emerald-800 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {toastMsg}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold font-sans transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-700 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Variación'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
