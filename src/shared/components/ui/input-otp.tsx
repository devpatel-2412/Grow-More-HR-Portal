import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { cn } from '../../utils/cn';

export const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(
  ({ className, containerClassName, ...props }, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn('flex items-center gap-2 has-[:disabled]:opacity-50', containerClassName)}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  ),
);
InputOTP.displayName = 'InputOTP';

export function InputOTPGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />;
}

export function InputOTPSlot({ index, className, ...props }: React.ComponentPropsWithoutRef<'div'> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];
  const { char, hasFakeCaret, isActive } = slot ?? { char: null, hasFakeCaret: false, isActive: false };

  return (
    <div
      className={cn(
        'relative flex h-12 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--input)] text-lg font-semibold text-[var(--foreground)] transition-all',
        isActive && 'z-10 border-[var(--primary)] ring-1 ring-[var(--primary)]',
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-pulse bg-[var(--foreground)]" />
        </div>
      )}
    </div>
  );
}
