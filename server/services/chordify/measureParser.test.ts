import { describe, it, expect } from 'vitest';
import {
  normalizeChord,
  buildRawLyricSegments,
  sanitizeLyricLineSegments,
  parseChordifyMeasuresAndLyrics,
} from './measureParser.js';

describe('measureParser (Chordify)', () => {
  describe('normalizeChord', () => {
    it('normalizes colon notations and major triads correctly', () => {
      expect(normalizeChord('E:min')).toBe('Em');
      expect(normalizeChord('C:maj')).toBe('C');
      expect(normalizeChord('G:maj7')).toBe('Gmaj7');
      expect(normalizeChord('A:major')).toBe('A');
      expect(normalizeChord('E:maj/Ab')).toBe('E/Ab');
    });

    it('replaces N and none with rest symbol 𝄾', () => {
      expect(normalizeChord('N')).toBe('𝄾');
      expect(normalizeChord('none')).toBe('𝄾');
      expect(normalizeChord(null)).toBe('𝄾');
      expect(normalizeChord('')).toBe('𝄾');
    });
  });

  describe('sanitizeLyricLineSegments', () => {
    it('extracts leading instrumental chords that appear over multiple spaces', () => {
      const rawSegments = [
        { chord: 'Dm', text: '   ' },
        { chord: 'C', text: 'Yesterday all my troubles...' },
      ];

      const result = sanitizeLyricLineSegments(rawSegments, { isFirstContentOfSection: false });
      expect(result.leadingInstrumentalChords).toEqual(['Dm']);
      expect(result.bodyLines[0].text).toContain('[C]Yesterday');
    });

    it('extracts trailing instrumental chords at the end of a line', () => {
      const rawSegments = [
        { chord: 'C', text: 'So far away   ' },
        { chord: 'Am', text: '   ' },
        { chord: 'F', text: '   ' },
      ];

      const result = sanitizeLyricLineSegments(rawSegments);
      expect(result.trailingInstrumentalChords).toEqual(['Am', 'F']);
    });
  });

  describe('parseChordifyMeasuresAndLyrics', () => {
    it('groups beats into 4/4 measures, drops pre-roll silences, and detects tempo and key', () => {
      // 4 beats of silence, then 4 beats of C, then 4 beats of G
      const chordsStr = [
        '1;N;0.0;0.5',
        '2;N;0.5;1.0',
        '3;N;1.0;1.5',
        '4;N;1.5;2.0',
        '1;C:maj;2.0;2.5',
        '2;C:maj;2.5;3.0',
        '3;C:maj;3.0;3.5',
        '4;C:maj;3.5;4.0',
        '1;G:maj;4.0;4.5',
        '2;G:maj;4.5;5.0',
        '3;G:maj;5.0;5.5',
        '4;G:maj;5.5;6.0',
      ].join('\n');

      const mockChordsData = {
        title: 'Test Song',
        artist: 'Test Artist',
        chords: {
          value: {
            chords: chordsStr,
            barLength: 4,
            chordInfo: {
              derivedBpm: 120,
              derivedKey: 'C:maj',
            },
          },
        },
      };

      const result = parseChordifyMeasuresAndLyrics(mockChordsData);
      expect(result.songTitle).toBe('Test Song');
      expect(result.songArtist).toBe('Test Artist');
      expect(result.bpm).toBe(120);
      expect(result.normalizedKey).toBe('C');
      expect(result.compases).toHaveLength(2); // Pre-roll 4 beats of silence dropped!
      expect(result.compases[0].acordes).toEqual(['C', 'C', 'C', 'C']);
      expect(result.compases[1].acordes).toEqual(['G', 'G', 'G', 'G']);
      expect(result.compases[0].beatTimes[0]).toBe(2.0);
    });
  });
});
