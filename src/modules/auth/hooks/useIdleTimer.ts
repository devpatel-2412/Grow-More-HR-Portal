import { useCallback, useEffect, useRef, useState } from 'react';
import { registerActivitySignal } from '../../../shared/lib/api-client';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;
// Activity listeners (mousemove/scroll especially) fire far more often than the timer needs to
// be rescheduled — this caps how often a burst of them actually resets the underlying timeout.
const ACTIVITY_THROTTLE_MS = 1000;

interface UseIdleTimerOptions {
  enabled: boolean;
  /** null means "Never Expire" — the timer never fires. */
  timeoutMinutes: number | null;
  warningMinutes: number;
  onTimeout: () => void;
}

interface UseIdleTimerResult {
  isWarning: boolean;
  secondsRemaining: number;
  /** Dismisses an active warning and restarts the countdown — also what "Continue Session" calls. */
  reset: () => void;
}

export function useIdleTimer({ enabled, timeoutMinutes, warningMinutes, onTimeout }: UseIdleTimerOptions): UseIdleTimerResult {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearAllTimers = useCallback(() => {
    clearTimeout(warnTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    clearInterval(tickIntervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setIsWarning(false);
    clearAllTimers();
    if (!enabled || timeoutMinutes == null) return;

    const timeoutMs = timeoutMinutes * 60_000;
    const warningMs = Math.min(warningMinutes * 60_000, timeoutMs);
    const warnAfterMs = timeoutMs - warningMs;

    warnTimerRef.current = setTimeout(() => {
      const expiresAt = Date.now() + warningMs;
      setIsWarning(true);
      setSecondsRemaining(Math.ceil(warningMs / 1000));
      tickIntervalRef.current = setInterval(() => {
        setSecondsRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      }, 1000);
    }, warnAfterMs);

    logoutTimerRef.current = setTimeout(() => {
      clearAllTimers();
      onTimeoutRef.current();
    }, timeoutMs);
  }, [enabled, timeoutMinutes, warningMinutes, clearAllTimers]);

  useEffect(() => {
    reset();
    return clearAllTimers;
  }, [reset, clearAllTimers]);

  useEffect(() => {
    if (!enabled) return;

    let throttled = false;
    function handleActivity() {
      if (throttled) return;
      throttled = true;
      setTimeout(() => {
        throttled = false;
      }, ACTIVITY_THROTTLE_MS);
      reset();
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    registerActivitySignal(handleActivity);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      registerActivitySignal(null);
    };
  }, [enabled, reset]);

  return { isWarning, secondsRemaining, reset };
}
