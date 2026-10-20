/**
 * guitarFingering.js
 * Automatic finger position calculator for guitar chords in SongBook.
 *
 * Algorithm Rules:
 * 1. Finger 1 (index) goes to the fret closest to the nut (lowest fret number).
 *    If tied, prioritizes the lowest (thickest/most grave) string.
 * 2. Barre (cejilla) with Finger 1 is recognized when:
 *    - 2 or more strings share the minimum fret (F_min) OR total pressed strings > 4.
 *    - For chords with <= 4 pressed strings, the strings at F_min must be contiguous.
 *    - No open strings ('0') between the barre strings.
 *    - No open strings ('0') below the barre towards the 1st string (e.g., Em 022000 does not barre).
 * 3. Subsequent fingers (2, 3, 4) are assigned in order:
 *    - Priority 1: Fret closest to the nut (fret ascending).
 *    - Priority 2: Lowest/thickest string (stringIndex ascending: 6ª to 1ª).
 * 4. Pressed notes exceeding finger 4 are assigned '0' (libre).
 * 5. Open strings ('0') and muted strings ('x') always have finger '0'.
 */

/**
 * Calculates guitar fingering (strings 6 to 1) based on fret positions.
 *
 * @param {Array<string|number>|string} fretsInput - 6-element array or string (e.g. 'x32010', ['x','10','12',...])
 * @returns {Array<string>} Array of 6 finger characters ['0'..'4'] for strings 6 to 1
 */
export function calculateGuitarFingers(fretsInput) {
  const resultFingers = ['0', '0', '0', '0', '0', '0'];

  // Normalize to 6-element array
  const fretsArr = Array.isArray(fretsInput)
    ? [...fretsInput]
    : typeof fretsInput === 'string'
    ? fretsInput.padStart(6, 'x').split('')
    : Array(6).fill('x');

  // Parse each string: -1 for mute/empty, 0 for open, >0 for fret number
  const parsedFrets = fretsArr.slice(0, 6).map((f) => {
    if (f === null || f === undefined || f === '') return -1;
    const s = String(f).trim().toLowerCase();
    if (s === 'x') return -1;
    if (s === '0') return 0;
    const num = s.length > 1 ? parseInt(s, 10) : parseInt(s, 36);
    return isNaN(num) || num <= 0 ? -1 : num;
  });

  // Collect all pressed strings (fret > 0)
  const pressed = [];
  parsedFrets.forEach((fret, i) => {
    if (fret > 0) {
      pressed.push({ stringIndex: i, stringNum: 6 - i, fret });
    }
  });

  if (pressed.length === 0) {
    return resultFingers;
  }

  // Find minimum fret among pressed notes
  const minFret = Math.min(...pressed.map((p) => p.fret));
  const stringsAtMinFret = pressed.filter((p) => p.fret === minFret);

  let isBarre = false;
  const barreStringIndices = new Set();

  const hasMultipleAtMin = stringsAtMinFret.length >= 2;
  const isContiguousAtMin = hasMultipleAtMin && stringsAtMinFret.every((item, idx, arr) => {
    if (idx === 0) return true;
    return item.stringIndex === arr[idx - 1].stringIndex + 1;
  });

  // Barre candidate: if > 4 pressed strings (mandatory due to human hand limit)
  // or if contiguous strings share minFret
  const candidateBarre = pressed.length > 4 ? hasMultipleAtMin : isContiguousAtMin;

  if (candidateBarre) {
    const minStringIndex = Math.min(...stringsAtMinFret.map((p) => p.stringIndex));
    const maxStringIndex = Math.max(...stringsAtMinFret.map((p) => p.stringIndex));

    // Condition 1: No open strings between the barre's extreme strings
    let openStringBetween = false;
    for (let i = minStringIndex; i <= maxStringIndex; i++) {
      if (parsedFrets[i] === 0) {
        openStringBetween = true;
        break;
      }
    }

    // Condition 2: No open strings below the barre's lowest string towards the 1st string
    let openStringBelow = false;
    for (let i = maxStringIndex; i <= 5; i++) {
      if (parsedFrets[i] === 0) {
        openStringBelow = true;
        break;
      }
    }

    if (!openStringBetween && !openStringBelow) {
      isBarre = true;
      stringsAtMinFret.forEach((p) => {
        barreStringIndices.add(p.stringIndex);
        resultFingers[p.stringIndex] = '1';
      });
    }
  }

  // Next finger starts at 2 if barre was placed, else 1
  let nextFinger = isBarre ? 2 : 1;
  const remaining = pressed.filter((p) => !barreStringIndices.has(p.stringIndex));

  // Sort remaining notes:
  // 1. Fret closest to nut (ascending)
  // 2. Thickest / lowest string (stringIndex ascending: 6ª to 1ª)
  remaining.sort((a, b) => {
    if (a.fret !== b.fret) {
      return a.fret - b.fret;
    }
    return a.stringIndex - b.stringIndex;
  });

  // Assign sequential fingers
  for (const item of remaining) {
    if (nextFinger <= 4) {
      resultFingers[item.stringIndex] = String(nextFinger);
      nextFinger++;
    } else {
      resultFingers[item.stringIndex] = '0';
    }
  }

  return resultFingers;
}
