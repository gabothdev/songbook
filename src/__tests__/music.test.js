import { describe, it, expect } from 'vitest';
import { 
  normalizeChordName, 
  transposeChord, 
  transposeTextWithChords, 
  alignChordsWithLyrics 
} from '../utils/music.js';

describe('Music Utilities & Transposition', () => {
  describe('normalizeChordName', () => {
    it('simplifies pure major chords without altering extensions', () => {
      expect(normalizeChordName('Cmaj')).toBe('C');
      expect(normalizeChordName('Emaj/Ab')).toBe('E/Ab');
      expect(normalizeChordName('Emaj7')).toBe('Emaj7');
      expect(normalizeChordName('Amaj9')).toBe('Amaj9');
    });

    it('normalizes Chordify colons and minor nomenclature', () => {
      expect(normalizeChordName('A:min')).toBe('Am');
      expect(normalizeChordName('D:min7')).toBe('Dm7');
    });

    it('preserves rests and timing tags', () => {
      expect(normalizeChordName('𝄾')).toBe('𝄾');
      expect(normalizeChordName('Intro @ 12.5')).toBe('Intro @ 12.5');
    });
  });

  describe('transposeChord', () => {
    it('transposes single root chords correctly', () => {
      expect(transposeChord('C', 2)).toBe('D');
      expect(transposeChord('D', 2)).toBe('E');
      expect(transposeChord('E', 1)).toBe('F');
      expect(transposeChord('G', -2)).toBe('F');
      expect(transposeChord('Am', 3)).toBe('Cm');
    });

    it('transposes slash chords including bass note', () => {
      expect(transposeChord('C/E', 2)).toBe('D/F#');
      expect(transposeChord('G/B', 5)).toBe('C/E');
    });

    it('returns unchanged chord when transpose is 0', () => {
      expect(transposeChord('F#m7', 0)).toBe('F#m7');
    });
  });

  describe('transposeTextWithChords', () => {
    it('transposes chords embedded in bracketed lyrics', () => {
      const input = '[C]Quiero ver, [G]quiero entrar [Am]a tu casa';
      const output = transposeTextWithChords(input, 2);
      expect(output).toBe('[D]Quiero ver, [A]quiero entrar [Bm]a tu casa');
    });

    it('preserves section headers and timing markers untouched', () => {
      const input = '[Intro @ 15.2]\n[C]Seminare [G]en el parque\n[Coro]\n[Am]Despiértate';
      const output = transposeTextWithChords(input, 2);
      expect(output).toContain('[Intro @ 15.2]');
      expect(output).toContain('[Coro]');
      expect(output).toContain('[D]Seminare [A]en el parque');
      expect(output).toContain('[Bm]Despiértate');
    });
  });

  describe('alignChordsWithLyrics', () => {
    it('aligns 2-line chord sheets into inline chords', () => {
      const input = 'C       G\nQuiero verte hoy';
      const output = alignChordsWithLyrics(input);
      expect(output).toMatch(/\[C\]Quiero verte \[G\]hoy|\[C\]Quiero \[G\]verte hoy/);
    });
  });
});
