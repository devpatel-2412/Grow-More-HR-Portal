import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { lazyWithRetry } from './lazy-retry';

const RELOAD_FLAG_KEY = 'grow-more-chunk-reload-attempted';

function TestFallback() {
  return <div>loading…</div>;
}

describe('lazyWithRetry', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  const originalLocation = window.location;

  beforeEach(() => {
    window.sessionStorage.clear();
    reloadSpy = vi.fn();
    // jsdom's window.location.reload isn't configurable enough for vi.spyOn — replace the whole
    // location object for the duration of each test instead, restored in afterEach.
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadSpy },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
  });

  it('renders normally and clears any stale reload flag when the import succeeds', async () => {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, '1'); // left over from a previous, now-resolved deploy
    const Comp = lazyWithRetry(async () => ({ default: () => <div>Loaded fine</div> }));

    render(
      <Suspense fallback={<TestFallback />}>
        <Comp />
      </Suspense>,
    );

    expect(await screen.findByText('Loaded fine')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(RELOAD_FLAG_KEY)).toBeNull();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('reloads exactly once on the first failed import, without ever rendering an error', async () => {
    const factory = vi.fn().mockRejectedValue(new Error('Failed to fetch dynamically imported module'));
    const Comp = lazyWithRetry(factory);

    render(
      <Suspense fallback={<TestFallback />}>
        <Comp />
      </Suspense>,
    );

    await waitFor(() => expect(reloadSpy).toHaveBeenCalledOnce());
    expect(window.sessionStorage.getItem(RELOAD_FLAG_KEY)).toBe('1');
    // The reload is what actually recovers the page — until it happens, the component should
    // stay in its loading state rather than surface a thrown error.
    expect(screen.getByText('loading…')).toBeInTheDocument();
  });

  it('does not reload a second time — a failure after the flag is already set is a real error', async () => {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, '1'); // this tab already tried the one-time recovery
    const factory = vi.fn().mockRejectedValue(new Error('still failing'));
    const Comp = lazyWithRetry(factory);

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    class CatchingBoundary extends (await import('react')).Component<{ children: React.ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? <div>real error surfaced</div> : this.props.children;
      }
    }

    render(
      <CatchingBoundary>
        <Suspense fallback={<TestFallback />}>
          <Comp />
        </Suspense>
      </CatchingBoundary>,
    );

    expect(await screen.findByText('real error surfaced')).toBeInTheDocument();
    expect(reloadSpy).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
