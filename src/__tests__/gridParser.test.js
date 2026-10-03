import { describe, it, expect } from 'vitest';
import { parseSongTextToGrid, formatCompasesToText } from '../utils/gridParser.js';

describe('BeatGrid Parser (parseSongTextToGrid)', () => {
  it('parses chord-only lines into individual measures', () => {
    const text = '[Intro]\n[C] [G] [Am] [F]';
    const grid = parseSongTextToGrid(text, 4);

    expect(grid).toHaveLength(4);
    expect(grid[0].acordes[0]).toBe('C');
    expect(grid[1].acordes[0]).toBe('G');
    expect(grid[2].acordes[0]).toBe('Am');
    expect(grid[3].acordes[0]).toBe('F');
    expect(grid[0].seccion).toBe('Intro');
  });

  it('parses multi-chord measures when measures are grouped by spaces or bars', () => {
    const text = '[Tema]\n[C] [G]   [Am] [F]';
    const grid = parseSongTextToGrid(text, 4);

    expect(grid).toHaveLength(2);
    // Compás 1: C en pulso 1 (índice 0) y G en pulso 3 (índice 2)
    expect(grid[0].acordes[0]).toBe('C');
    expect(grid[0].acordes[2]).toBe('G');
    // Compás 2: Am en pulso 1 (índice 0) y F en pulso 3 (índice 2)
    expect(grid[1].acordes[0]).toBe('Am');
    expect(grid[1].acordes[2]).toBe('F');
  });

  it('captures section timestamp in first measure of the section', () => {
    const text = '[Coro @ 42.5]\n[C] [G]';
    const grid = parseSongTextToGrid(text, 4);

    expect(grid[0].secTime).toBe(42.5);
    expect(grid[0].seccion).toBe('Coro');
    expect(grid[1].secTime).toBeNull(); // subsequent measure shouldn't duplicate timestamp
  });

  it('handles empty or invalid text safely', () => {
    expect(parseSongTextToGrid('')).toEqual([]);
    expect(parseSongTextToGrid(null)).toEqual([]);
  });
});

describe('formatCompasesToText', () => {
  it('preserves all chord changes across beats in each measure', () => {
    const compases = [
      { id: 1, seccion: 'Tema', acordes: ['C', 'C', 'G', 'G'] },
      { id: 2, seccion: 'Tema', acordes: ['Am', 'Am', 'F', 'F'] },
    ];
    const text = formatCompasesToText(compases);
    expect(text).toContain('[Tema]');
    expect(text).toContain('[C] [G]');
    expect(text).toContain('[Am] [F]');
  });

  it('preserves syncopated or rest-starting chords', () => {
    const compases = [
      { id: 1, seccion: 'Intro', acordes: ['𝄾', 'Gm', 'Gm', 'D#'] }
    ];
    const text = formatCompasesToText(compases);
    expect(text).toContain('[Gm]');
    expect(text).toContain('[D#]');
  });
});
