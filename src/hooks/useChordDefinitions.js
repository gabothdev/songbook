import { useState, useEffect, useCallback } from 'react';
import { lookupChord } from '../services/persistenceApi';
import { CHORD_DATABASE } from '../data/sampleSongs';

/**
 * useChordDefinitions Hook
 * Dynamically resolves, fetches from SQLite and caches chord diagram definitions and user variants.
 */
export function useChordDefinitions({
  uniqueChords = [],
  selectedVariants = {},
  instrument = 'guitar',
  handleVariantChange = null,
}) {
  const [chordDefinitions, setChordDefinitions] = useState({});

  useEffect(() => {
    if (!uniqueChords || uniqueChords.length === 0) return;

    const missingChords = uniqueChords.filter(
      (ch) => ch && ch !== '𝄾' && ch !== '𝄽' && !chordDefinitions[ch]
    );

    if (missingChords.length === 0) return;

    missingChords.forEach((chordName) => {
      lookupChord(chordName, instrument || 'guitar').then((data) => {
        if (data && data.positions && Array.isArray(data.positions) && data.positions.length > 0) {
          const vIdx = selectedVariants[chordName] || 0;
          const pos = data.positions[vIdx] || data.positions[0];
          setChordDefinitions((prev) => ({
            ...prev,
            [chordName]: {
              chordName,
              frets: Array.isArray(pos.frets)
                ? pos.frets.map((f) => (f === -1 ? 'x' : String(f))).join('')
                : pos.frets || 'x32010',
              fingers: Array.isArray(pos.fingers) ? pos.fingers.join('') : pos.fingers || '032010',
              position: pos.baseFret || pos.position || 1,
              barres: pos.barres || [],
              allPositions: data.positions,
              variantIndex: vIdx,
            },
          }));
        } else {
          const fallback = CHORD_DATABASE[chordName] || {
            chordName,
            frets: 'x32010',
            fingers: '032010',
            position: 1,
            barres: [],
          };
          setChordDefinitions((prev) => ({
            ...prev,
            [chordName]: fallback,
          }));
        }
      });
    });
  }, [uniqueChords, chordDefinitions, selectedVariants, instrument]);

  const onVariantChangeHandler = useCallback(
    (chordName, newVariantIndex) => {
      if (!handleVariantChange) return;
      handleVariantChange(chordName, newVariantIndex, (clean, vIdx) => {
        setChordDefinitions((prev) => {
          const existing = prev[clean];
          if (existing && existing.allPositions && existing.allPositions[vIdx]) {
            const pos = existing.allPositions[vIdx];
            return {
              ...prev,
              [clean]: {
                ...existing,
                frets: Array.isArray(pos.frets)
                  ? pos.frets.map((f) => (f === -1 ? 'x' : String(f))).join('')
                  : pos.frets || 'x32010',
                fingers: Array.isArray(pos.fingers)
                  ? pos.fingers.join('')
                  : pos.fingers || '032010',
                position: pos.baseFret || pos.position || 1,
                barres: pos.barres || [],
                variantIndex: vIdx,
              },
            };
          }
          return prev;
        });
      });
    },
    [handleVariantChange]
  );

  return {
    chordDefinitions,
    setChordDefinitions,
    onVariantChangeHandler,
  };
}

export default useChordDefinitions;
