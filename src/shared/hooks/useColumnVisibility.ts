import { useState, useEffect } from 'react';

/** Persists which columns are hidden per table (keyed by `storageKey`) across reloads, scoped to this browser only. */
export function useColumnVisibility(storageKey: string, allColumnIds: string[], defaultHiddenIds: string[] = []) {
  const fullKey = `datatable:columns:${storageKey}`;

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {
      // corrupted or inaccessible storage — fall through to the default
    }
    return new Set(defaultHiddenIds);
  });

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify([...hiddenIds]));
    } catch {
      // storage unavailable (private browsing, quota) — visibility just won't persist
    }
  }, [fullKey, hiddenIds]);

  function toggle(columnId: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  }

  function isVisible(columnId: string) {
    return !hiddenIds.has(columnId);
  }

  function reset() {
    setHiddenIds(new Set(defaultHiddenIds));
  }

  return { isVisible, toggle, reset, visibleCount: allColumnIds.length - hiddenIds.size };
}
