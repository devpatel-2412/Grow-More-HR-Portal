import { describe, it, expect } from 'vitest';
import { withinNextNDays } from './dashboard.repository.js';

// All dates built with the local-time constructor (new Date(y, m, d)), matching how
// withinNextNDays reads getMonth()/getDate() in local time — an ISO date-only string like
// '2026-06-10' parses as UTC midnight and would drift a day off depending on the machine's
// timezone, making the test flaky.
describe('withinNextNDays', () => {
  const now = new Date(2026, 5, 10); // June 10, 2026

  it('includes a date exactly today (0 days away)', () => {
    const rows = [{ id: 'a', date: new Date(2020, 5, 10) }];
    const result = withinNextNDays(rows, (r) => r.date, now, 7);
    expect(result).toEqual([{ id: 'a', date: rows[0].date, daysAway: 0 }]);
  });

  it('includes a date within the window and excludes one just past it', () => {
    const rows = [
      { id: 'in-range', date: new Date(2019, 5, 15) }, // 5 days away
      { id: 'out-of-range', date: new Date(2018, 5, 20) }, // 10 days away
    ];
    const result = withinNextNDays(rows, (r) => r.date, now, 7);
    expect(result.map((r) => r.id)).toEqual(['in-range']);
  });

  it('wraps into next year when the month/day has already passed this year', () => {
    // "today" is June 10; a birthday of June 5 already happened this year, so the next
    // occurrence is ~360 days away, not a negative number — and should be excluded from a 7-day window.
    const rows = [{ id: 'already-passed', date: new Date(1990, 5, 5) }];
    const result = withinNextNDays(rows, (r) => r.date, now, 7);
    expect(result).toEqual([]);
  });

  it('wraps a January date correctly when checked from late December — an "upcoming" date always looks forward, never back', () => {
    const lateDec = new Date(2026, 11, 28); // December 28, 2026
    const rows = [{ id: 'jan-2', date: new Date(1990, 0, 2) }]; // January 2 — 5 days into next year
    const result = withinNextNDays(rows, (r) => r.date, lateDec, 7);
    expect(result).toEqual([{ id: 'jan-2', date: rows[0].date, daysAway: 5 }]);
  });

  it('sorts results by how soon they occur', () => {
    const rows = [
      { id: 'in-6-days', date: new Date(2000, 5, 16) },
      { id: 'in-1-day', date: new Date(2000, 5, 11) },
    ];
    const result = withinNextNDays(rows, (r) => r.date, now, 7);
    expect(result.map((r) => r.id)).toEqual(['in-1-day', 'in-6-days']);
  });
});
