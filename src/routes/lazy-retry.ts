import { lazy, type ComponentType } from 'react';

const RELOAD_FLAG_KEY = 'grow-more-chunk-reload-attempted';

/**
 * Wraps React.lazy() so a failed dynamic import — "Failed to fetch dynamically imported module",
 * the error a browser gets when it requests a chunk whose hash belonged to a now-superseded
 * deployment (every new production deploy regenerates every chunk's content hash, and the old
 * files stop being served) — triggers exactly one full page reload to pick up the current
 * deployment's index.html and chunk manifest, instead of surfacing a dead "Unexpected Application
 * Error" screen with no way forward.
 *
 * One sessionStorage flag (not one per route) is enough: whichever chunk happens to fail first,
 * a reload fixes every route at once — a new deployment regenerates every hash together, so the
 * *cause* is never route-specific even though the symptom shows up on whichever route the user
 * happened to navigate to. That same flag is what stops this from looping forever: a genuine,
 * non-staleness failure (a real network outage, an actually broken chunk) still fails after the
 * one retry and is allowed to surface as a real error, exactly as before this wrapper existed.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      const loaded = await factory();
      // A successful load means this deployment's chunks are all reachable — clear the flag so a
      // *future* deployment (later in the same tab's lifetime) gets its own fresh one-time retry.
      window.sessionStorage.removeItem(RELOAD_FLAG_KEY);
      return loaded;
    } catch (error) {
      if (window.sessionStorage.getItem(RELOAD_FLAG_KEY) === '1') {
        throw error;
      }
      window.sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
      window.location.reload();
      // location.reload() starts a navigation but doesn't halt this script — return a promise
      // that never resolves so React never tries to render anything from the still-rejected
      // import while that navigation is in flight. The reload itself is the actual recovery.
      return new Promise<{ default: T }>(() => {});
    }
  });
}
