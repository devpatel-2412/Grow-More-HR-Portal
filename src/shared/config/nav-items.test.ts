import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from './nav-items';

describe('NAV_ITEMS', () => {
  it('has no duplicate paths — a duplicate would make the sidebar and command palette both ambiguous', () => {
    const paths = NAV_ITEMS.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('every item that restricts visibility lists at least one role', () => {
    for (const item of NAV_ITEMS) {
      if (item.allow) expect(item.allow.length).toBeGreaterThan(0);
    }
  });

  it('Dashboard is the only item without a role restriction (visible to every staff login)', () => {
    const unrestricted = NAV_ITEMS.filter((item) => !item.allow);
    expect(unrestricted.map((item) => item.label)).toEqual(['Dashboard']);
  });
});
