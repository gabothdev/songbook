import { describe, it, expect } from 'vitest';
import {
  parseLineToChordSegments,
  parseSongStructure,
  calculateSectionTimingMap,
  calculateLineTimingsMap,
  resolveActivePlaybackLocation,
} from './lyricsTimingCalculator';

describe('lyricsTimingCalculator', () => {
  describe('parseLineToChordSegments', () => {
    it('returns empty array for empty line', () => {
      expect(parseLineToChordSegments('')).toEqual([]);
      expect(parseLineToChordSegments(null)).toEqual([]);
    });

    it('returns plain text when no chord brackets exist', () => {
      const result = parseLineToChordSegments('Hello world');
      expect(result).toEqual([{ chord: null, text: 'Hello world' }]);
    });

    it('parses embedded chords over vocal words', () => {
      const line = '[C]Hello [G]world';
      const result = parseLineToChordSegments(line);
      expect(result).toHaveLength(2);
      expect(result[0].chord).toBe('C');
      expect(result[0].text.trim()).toBe('Hello');
      expect(result[1].chord).toBe('G');
      expect(result[1].text.trim()).toBe('world');
    });

    it('ignores silence markers like [𝄾] and [𝄾 (4T)]', () => {
      const line = '[𝄾] [𝄾 (4T)] [C]';
      const result = parseLineToChordSegments(line);
      expect(result).toHaveLength(1);
      expect(result[0].chord).toBe('C');
    });
  });

  describe('parseSongStructure', () => {
    it('extracts metadata tags and sections with timestamps', () => {
      const text = `
[BPM @ 120]
[Time @ 4/4]

[Intro @ 0.0]
[C]   [G]   [Am]   [F]

[Verse 1 @ 12.5]
[C]Yesterday all my [G]troubles seemed so far away
      `.trim();

      const { sections, bpm, timeSignature } = parseSongStructure(text);
      expect(bpm).toBe(120);
      expect(timeSignature).toBe('4/4');
      expect(sections).toHaveLength(2);
      expect(sections[0].name).toBe('Intro');
      expect(sections[0].time).toBe('0.0');
      expect(sections[1].name).toBe('Verse 1');
      expect(sections[1].time).toBe('12.5');
    });
  });

  describe('calculateSectionTimingMap', () => {
    it('calculates startTime and nextTime across sections', () => {
      const sections = [
        { name: 'Intro', time: '0.0', lines: [] },
        { name: 'Verse 1', time: '10.5', lines: [] },
        { name: 'Chorus', time: '01:00', lines: [] },
      ];

      const timingMap = calculateSectionTimingMap(sections);
      expect(timingMap[0]).toEqual({ startTime: 0, nextTime: 10.5 });
      expect(timingMap[1]).toEqual({ startTime: 10.5, nextTime: 60 });
      expect(timingMap[2]).toEqual({ startTime: 60, nextTime: null });
    });
  });

  describe('calculateLineTimingsMap & resolveActivePlaybackLocation', () => {
    it('accurately resolves active section, line and chord rank based on currentBeatIndex', () => {
      const sections = [
        {
          name: 'Intro',
          time: '0.0',
          lines: ['[C]   [G]'],
        },
      ];
      const compases = [
        {
          seccion: 'Intro',
          acordes: ['C', 'C', 'G', 'G'],
          beatTimes: [0, 0.5, 1.0, 1.5],
        },
      ];

      const sectionTimingMap = calculateSectionTimingMap(sections);
      const lineTimingsMap = calculateLineTimingsMap(compases, sections, sectionTimingMap, 120);

      expect(lineTimingsMap).not.toBeNull();
      expect(lineTimingsMap[0]).toHaveLength(1);
      expect(lineTimingsMap[0][0].startBeatGlobal).toBe(0);
      expect(lineTimingsMap[0][0].endBeatGlobal).toBe(3);

      // Pulse 0: first chord 'C'
      const locBeat0 = resolveActivePlaybackLocation({
        isPlaybackActive: true,
        currentBeatIndex: 0,
        currentTime: 0,
        lineTimingsMap,
        sections,
        sectionTimingMap,
        effectiveBpm: 120,
      });
      expect(locBeat0.activeSectionIdx).toBe(0);
      expect(locBeat0.activeLineIdx).toBe(0);
      expect(locBeat0.activeChordRank).toBe(0);

      // Pulse 2: second chord 'G'
      const locBeat2 = resolveActivePlaybackLocation({
        isPlaybackActive: true,
        currentBeatIndex: 2,
        currentTime: 1.0,
        lineTimingsMap,
        sections,
        sectionTimingMap,
        effectiveBpm: 120,
      });
      expect(locBeat2.activeChordRank).toBe(1);
    });
  });
});
