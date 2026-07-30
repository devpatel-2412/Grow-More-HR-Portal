import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Coffee } from 'lucide-react';
import { usePunchToday } from '../hooks/usePunchToday';
import { usePunchIn, usePunchOut, useBreakStart, useBreakEnd } from '../hooks/usePunchActions';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

function getGpsCoordinates(): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(`${position.coords.latitude},${position.coords.longitude}`),
      () => resolve(undefined), // permission denied / unavailable — punch-in must not be blocked by this
      { timeout: 3000 },
    );
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function useCountdown(targetIso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  if (!targetIso) return null;
  const diffMs = new Date(targetIso).getTime() - now;
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hrs = Math.floor(abs / (1000 * 60 * 60));
  const mins = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  return { hrs, mins, overdue };
}

export function PunchWidget() {
  const { data: today, isLoading } = usePunchToday();
  const punchIn = usePunchIn();
  const punchOut = usePunchOut();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();

  const countdown = useCountdown(today?.checkOut ? undefined : today?.liveRequiredLogoutTime);

  async function handlePunchIn() {
    try {
      const gpsCoordinates = await getGpsCoordinates();
      await punchIn.mutateAsync({ gpsCoordinates, deviceType: 'web' });
      toast.success('Punched in for the day.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to punch in.');
    }
  }

  async function handlePunchOut() {
    try {
      await punchOut.mutateAsync();
      toast.success('Punched out. Have a good evening!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to punch out.');
    }
  }

  async function handleBreakStart() {
    try {
      await breakStart.mutateAsync();
      toast.success('Break started.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to start break.');
    }
  }

  async function handleBreakEnd() {
    try {
      await breakEnd.mutateAsync();
      toast.success('Break ended.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to end break.');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!today) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-[var(--muted-foreground)]">You haven't punched in today.</p>
        <Button onClick={handlePunchIn} loading={punchIn.isPending} className="w-full">
          <Clock className="h-4 w-4" />
          Punch in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--muted-foreground)]">Punched in:</span>
        <span className="font-bold text-[var(--foreground)]">{formatTime(today.checkIn)}</span>
      </div>
      {today.lateMinutes > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--muted-foreground)]">Late by:</span>
          <span className="font-bold text-amber-500">{today.lateMinutes} min</span>
        </div>
      )}

      {today.checkOut ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-center text-xs text-[var(--foreground)]">
          Punched out at {formatTime(today.checkOut)} — day complete.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
            <span className="text-[var(--muted-foreground)]">Required logout:</span>
            <span className="font-bold text-[var(--primary)]">{formatTime(today.liveRequiredLogoutTime)}</span>
          </div>
          {countdown && (
            <div className="text-center">
              <span className="text-2xl font-extrabold text-[var(--foreground)]">
                {countdown.overdue ? '+' : ''}
                {countdown.hrs}h {countdown.mins}m
              </span>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                {countdown.overdue ? 'past required logout' : 'remaining'}
              </p>
            </div>
          )}
          {today.liveOverBreakMinutes > 0 && (
            <p className="text-center text-[10px] text-amber-500">
              {today.liveOverBreakMinutes} min over the allowed break time
            </p>
          )}

          {today.onBreak ? (
            <Button variant="outline" onClick={handleBreakEnd} loading={breakEnd.isPending} className="w-full">
              <Coffee className="h-4 w-4" />
              End break
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleBreakStart} loading={breakStart.isPending}>
                <Coffee className="h-4 w-4" />
                Start break
              </Button>
              <Button variant="destructive" onClick={handlePunchOut} loading={punchOut.isPending}>
                Punch out
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
