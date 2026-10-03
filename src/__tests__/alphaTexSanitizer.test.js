import { describe, it, expect } from 'vitest';
import { sanitizeAlphaTex } from '../utils/alphaTexSanitizer.js';

describe('AlphaTex Sanitizer (AT202 & AT001 Prevention)', () => {
  it('converts slash time signatures to AlphaTex tuple syntax \\ts (4 4)', () => {
    expect(sanitizeAlphaTex('\\ts 4/4')).toContain('\\ts (4 4)');
    expect(sanitizeAlphaTex('\\ts (4/4)')).toContain('\\ts (4 4)');
    expect(sanitizeAlphaTex('\\ts 3/4')).toContain('\\ts (3 4)');
  });

  it('inserts dot separator after header directives if missing', () => {
    const input = '\\title "Seminare"\n\\tempo 120\n\\ts (4 4)\n:4 c.3 d.3 e.3 f.3';
    const output = sanitizeAlphaTex(input);
    expect(output).toMatch(/\\ts \(4 4\)\s*\n\s*\.\s*\n:4 c\.3/);
  });

  it('normalizes durations written with slashes (/4, /8) to colon durations (:4, :8)', () => {
    const input = '/4 c.3 /8 d.3';
    const output = sanitizeAlphaTex(input);
    expect(output).toContain(':4 c.3');
    expect(output).toContain(':8 d.3');
  });

  it('formats rests like r4, r2 into AlphaTab standard :4 r, :2 r', () => {
    const input = 'r4 c.3 r2';
    const output = sanitizeAlphaTex(input);
    expect(output).toContain(':4 r');
    expect(output).toContain(':2 r');
  });

  it('fixes misplaced chord annotations {ch "..."} preceding note to prevent AT202', () => {
    const input = '{ch "Am"} :4 a.3';
    const output = sanitizeAlphaTex(input);
    expect(output).toContain(':4 a.3 {ch "Am"}');
  });
});
