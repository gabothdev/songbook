import {
  CHROMATIC_INDEX,
  normalizeNote,
  getNoteSemitone,
  getIntervalLabel as musicEngineGetIntervalLabel
} from './musicEngine';

/**
 * Unified Chord Identification and Normalization System
 */

export function normalizeChordName(chordName) {
  if (!chordName || typeof chordName !== 'string') return '';
  let normalized = chordName.trim();
  if (normalized === '𝄾' || normalized === '𝄽') return normalized;

  // Clean Chordify colons
  normalized = normalized
    .replace(/:min/gi, 'm')
    .replace(/:maj(?=\/|$)/gi, '')
    .replace(/:maj/gi, 'maj')
    .replace(/:/g, '');

  const hasSlash = normalized.includes('/');
  let chordPart = normalized;
  let bassPart = '';

  if (hasSlash) {
    const parts = normalized.split('/');
    chordPart = parts[0];
    bassPart = parts[1];
  }

  // Simplify pure major chords (Emaj -> E, Emaj/Ab -> E/Ab) while preserving Emaj7, Emaj9
  chordPart = chordPart.replace(/^([A-G][b#]?)maj(?!\d)$/i, '$1');
  chordPart = chordPart.replace(/^([A-G][b#]?)major(?!\d)$/i, '$1');
  chordPart = chordPart.replace(/^([A-G][b#]?)min(?!\d)$/i, '$1m');
  chordPart = chordPart.replace(/^([A-G][b#]?)minor(?!\d)$/i, '$1m');

  chordPart = chordPart.replace(/\s+/g, '');
  chordPart = chordPart.replace(/♯/g, '#').replace(/♭/g, 'b');

  if (bassPart) {
    bassPart = bassPart.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\s+/g, '');
    return `${chordPart}/${bassPart}`;
  }
  return chordPart;
}

export const NOTES = CHROMATIC_INDEX;

export const intervalMap = {
  '': [0, 4, 7], 'm': [0, 3, 7], '5': [0, 7], 'aug': [0, 4, 8], 'dim': [0, 3, 6],
  '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], 'mmaj7': [0, 3, 7, 11],
  'dim7': [0, 3, 6, 9], 'm7b5': [0, 3, 6, 10], 'aug7': [0, 4, 8, 10],
  '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], '9': [0, 4, 7, 10, 2], 'maj9': [0, 4, 7, 11, 2],
  'm9': [0, 3, 7, 10, 2], 'add9': [0, 4, 7, 2], 'madd9': [0, 3, 7, 2],
  'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '7sus4': [0, 5, 7, 10], 'maj7sus4': [0, 5, 7, 11]
};

export function getAllChordSuggestions(noteNames) {
  if (!noteNames || noteNames.length === 0) return [];

  const uniqueNotes = [...new Set(noteNames.map(normalizeNote))];
  if (uniqueNotes.length < 2) return [];

  const bassNote = noteNames[0];
  const bassSemitone = getNoteSemitone(bassNote);
  const matches = [];

  for (const root of NOTES) {
    const rootIndex = NOTES.indexOf(root);
    const intervals = uniqueNotes.map(n => (NOTES.indexOf(n) - rootIndex + 12) % 12).sort((a, b) => a - b);
    const intervalsStr = JSON.stringify(intervals);

    for (const [suffix, structure] of Object.entries(intervalMap)) {
      const uniqueStructure = [...new Set(structure.map(i => i % 12))].sort((a, b) => a - b);
      
      // 1. Exact match
      if (intervalsStr === JSON.stringify(uniqueStructure)) {
        matches.push({ root, suffix, isExact: true });
      }

      // 2. Omitted-fifth match (only if structure has a fifth '7')
      if (uniqueStructure.includes(7)) {
        const structureWithoutFifth = uniqueStructure.filter(i => i !== 7);
        if (intervalsStr === JSON.stringify(structureWithoutFifth)) {
          matches.push({ root, suffix, isExact: false });
        }
      }
    }
  }

  // Calculate score for each match
  const scoredMatches = matches.map(m => {
    let score = m.isExact ? 100 : 0;
    const rootSemitone = getNoteSemitone(m.root);
    
    // Add bonus if root is the lowest sounding note (bass)
    if (rootSemitone === bassSemitone) {
      score += 50;
    }
    
    // Slight penalty for complex chords if a simpler one matches
    if (m.suffix.length > 2) score -= 5;
    
    let displayName = `${m.root}${m.suffix}`;
    // Add slash chord notation if bass note is different from root
    if (rootSemitone !== bassSemitone && bassNote) {
      displayName += `/${bassNote}`;
    }

    return {
      displayName,
      score,
      isExact: m.isExact
    };
  });

  // Sort by score descending
  scoredMatches.sort((a, b) => b.score - a.score);

  // Return unique suggestions
  const result = [];
  const seen = new Set();
  for (const item of scoredMatches) {
    if (!seen.has(item.displayName)) {
      seen.add(item.displayName);
      result.push(item.displayName);
    }
  }

  return result;
}

export function getNotesFromIntervals(root, intervals) {
  const rootIndex = getNoteSemitone(root);
  if (rootIndex === -1) return [];
  return intervals.map((i) => NOTES[(rootIndex + i) % 12]);
}

export function getUniversalChordNotes(chordName) {
  if (!chordName) return [];
  let normalized = normalizeChordName(chordName);
  const rootMatch = normalized.match(/^[A-G][#b]?/);
  if (!rootMatch) return [];
  const root = rootMatch[0];
  let suffix = normalized.substring(root.length);
  if (suffix === 'minor') suffix = 'm';
  if (suffix === 'major') suffix = '';
  const intervals = intervalMap[suffix];
  if (!intervals) return !suffix ? getNotesFromIntervals(root, [0, 4, 7]) : [];
  return getNotesFromIntervals(root, intervals);
}

export function getChordInfo(chordName) {
  const norm = normalizeChordName(chordName);
  const notes = getUniversalChordNotes(chordName);
  const root = norm.match(/^[A-G][#b]?/)?.[0] || '';
  const type = norm.replace(/^[A-G][#b]?/, '') || 'major';
  return { original: chordName, normalized: norm, root, type, notes, noteCount: notes.length };
}
