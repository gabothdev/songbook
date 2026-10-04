import { describe, it, expect } from 'vitest';
import { isInstrumentalSong, parseLyricsToVisualBlocks } from '../utils/lyricsBlocks.js';

describe('lyricsBlocks - isInstrumentalSong & Visual Blocks', () => {
  it('detects a song without lyrics as instrumental', () => {
    const text = '[Intro]\n[C] [G] [Am] [F]\n[Solo]\n[Dm] [G] [C]';
    const visualBlocks = parseLyricsToVisualBlocks(text);
    expect(isInstrumentalSong(visualBlocks)).toBe(true);
  });

  it('detects a song with lyrics as NOT instrumental', () => {
    const text = '[Intro]\n[C] [G]\n[Estrofa]\n[C]De música ligera [G]nada nos libra [Am]nada más queda';
    const visualBlocks = parseLyricsToVisualBlocks(text);
    expect(isInstrumentalSong(visualBlocks)).toBe(false);
  });

  it('respects isExplicitInstrumental = true to unlock visual canvas for editing', () => {
    const text = '[Intro]\n[C] [G] [Am] [F]';
    const visualBlocks = parseLyricsToVisualBlocks(text);
    // When isExplicitInstrumental is false, it flags that lyrics are missing
    expect(isInstrumentalSong(visualBlocks, false)).toBe(true);
    // When marked as completely instrumental, it allows full editing without blocking
    expect(isInstrumentalSong(visualBlocks, true)).toBe(false);
  });

  it('handles null or empty visual sections gracefully', () => {
    expect(isInstrumentalSong([])).toBe(true);
    expect(isInstrumentalSong(null)).toBe(true);
    expect(isInstrumentalSong([], true)).toBe(false);
  });
});
