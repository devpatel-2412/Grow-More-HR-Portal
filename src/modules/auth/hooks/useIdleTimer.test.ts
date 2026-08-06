import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimer } from './useIdleTimer';

describe('useIdleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing while disabled', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimer({ enabled: false, timeoutMinutes: 1, warningMinutes: 1, onTimeout }));

    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('never fires when timeoutMinutes is null ("Never Expire")', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimer({ enabled: true, timeoutMinutes: null, warningMinutes: 2, onTimeout }));

    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60_000);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('enters the warning phase warningMinutes before the timeout, then fires onTimeout at the full timeout', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleTimer({ enabled: true, timeoutMinutes: 5, warningMinutes: 2, onTimeout }));

    expect(result.current.isWarning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3 * 60_000); // 5 - 2 = 3 minutes until the warning phase begins
    });
    expect(result.current.isWarning).toBe(true);
    expect(result.current.secondsRemaining).toBeGreaterThan(0);
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2 * 60_000); // the remaining 2-minute warning window
    });
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it('ticks secondsRemaining down once every second during the warning phase', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleTimer({ enabled: true, timeoutMinutes: 5, warningMinutes: 2, onTimeout }));

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });
    const first = result.current.secondsRemaining;

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsRemaining).toBe(first - 1);
  });

  it('reset() dismisses an active warning and restarts the full countdown', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleTimer({ enabled: true, timeoutMinutes: 5, warningMinutes: 2, onTimeout }));

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });
    expect(result.current.isWarning).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.isWarning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4 * 60_000); // would have fired the original timeout, but not the fresh one
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('DOM activity (e.g. a mousedown) resets the timer', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimer({ enabled: true, timeoutMinutes: 5, warningMinutes: 2, onTimeout }));

    act(() => {
      vi.advanceTimersByTime(4 * 60_000); // close to the 5-minute timeout
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousedown'));
    });
    act(() => {
      vi.advanceTimersByTime(4 * 60_000); // would have fired without the reset above
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('stops listening and stops the timer on unmount', () => {
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() => useIdleTimer({ enabled: true, timeoutMinutes: 1, warningMinutes: 1, onTimeout }));

    unmount();

    act(() => {
      vi.advanceTimersByTime(10 * 60_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
