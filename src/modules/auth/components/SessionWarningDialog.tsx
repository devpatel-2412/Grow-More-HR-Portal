import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';

interface SessionWarningDialogProps {
  open: boolean;
  secondsRemaining: number;
  onContinue: () => void;
  onLogoutNow: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Deliberately not built on the shared DialogContent — this warning must not be dismissible by
 * clicking outside or pressing Escape (it protects an unattended screen), so it needs direct
 * control over the Radix primitives instead of the shared wrapper's default close-anywhere behavior.
 */
export function SessionWarningDialog({ open, secondsRemaining, onContinue, onLogoutNow }: SessionWarningDialogProps) {
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          className="surface-overlay fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 focus:outline-none"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/15 text-[var(--warning)]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-lg font-bold text-[var(--foreground)]">
                Your session is about to expire
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-[var(--muted-foreground)]">
                You've been inactive for a while. For your security, you'll be signed out in{' '}
                <span className="font-semibold tabular-nums text-[var(--foreground)]">{formatCountdown(secondsRemaining)}</span>{' '}
                due to inactivity.
              </DialogPrimitive.Description>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onLogoutNow}>
              Logout Now
            </Button>
            <Button onClick={onContinue}>Continue Session</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
