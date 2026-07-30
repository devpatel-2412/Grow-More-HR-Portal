import { describe, it, expect } from 'vitest';
import { parseDurationMs } from './duration.util.js';

describe('duration.util', () => {
  it.each([
    ['15m', 15 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
    ['30s', 30 * 1000],
    ['2h', 2 * 60 * 60 * 1000],
  ])('parses "%s" to %i ms', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('throws on an invalid duration string', () => {
    expect(() => parseDurationMs('banana')).toThrow();
    expect(() => parseDurationMs('15')).toThrow();
    expect(() => parseDurationMs('15x')).toThrow();
  });
});
