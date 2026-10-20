import { describe, it, expect } from 'vitest';
import { getEnharmonicEquivalents, arePositionsEquivalent } from './chordService.js';

describe('chordService logic', () => {
  describe('getEnharmonicEquivalents', () => {
    it('returns empty array when chord is empty', () => {
      expect(getEnharmonicEquivalents('')).toEqual([]);
    });

    it('returns flat and sharp equivalents for Bb', () => {
      const equivalents = getEnharmonicEquivalents('Bb');
      expect(equivalents).toContain('Bb');
      expect(equivalents).toContain('A#');
    });

    it('returns sharp and flat equivalents for C#m', () => {
      const equivalents = getEnharmonicEquivalents('C#m');
      expect(equivalents).toContain('C#m');
      expect(equivalents).toContain('Dbm');
    });

    it('handles slash chords properly (e.g. F/A#)', () => {
      const equivalents = getEnharmonicEquivalents('F/A#');
      expect(equivalents).toContain('F/A#');
      expect(equivalents).toContain('F/Bb');
    });
  });

  describe('arePositionsEquivalent', () => {
    it('detects equal chord fingering positions', () => {
      const posA = { frets: 'x02210', position: 1 };
      const posB = { frets: 'X02210', position: 1 };
      expect(arePositionsEquivalent(posA, posB)).toBe(true);
    });

    it('detects different base positions', () => {
      const posA = { frets: 'x02210', position: 1 };
      const posB = { frets: 'x02210', position: 5 };
      expect(arePositionsEquivalent(posA, posB)).toBe(false);
    });

    it('detects different frets', () => {
      const posA = { frets: 'x02210', position: 1 };
      const posB = { frets: 'x02220', position: 1 };
      expect(arePositionsEquivalent(posA, posB)).toBe(false);
    });
  });
});
