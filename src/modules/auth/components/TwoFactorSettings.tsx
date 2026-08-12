import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from '../api/auth.api';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { PasswordInput } from '../../../shared/components/ui/password-input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';

export function TwoFactorSettings() {
  const queryClient = useQueryClient();
  const [enrollment, setEnrollment] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const enrollMutation = useMutation({ mutationFn: authApi.beginTwoFactorEnrollment });
  const enableMutation = useMutation({ mutationFn: authApi.enableTwoFactor });
  const disableMutation = useMutation({
    mutationFn: () => authApi.disableTwoFactor(disablePassword, disableCode),
  });

  async function handleBeginEnrollment() {
    setError(null);
    try {
      const result = await enrollMutation.mutateAsync();
      setEnrollment(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start enrollment.');
    }
  }

  async function handleEnable() {
    setError(null);
    try {
      const result = await enableMutation.mutateAsync(code);
      setRecoveryCodes(result.recoveryCodes);
      setEnrollment(null);
      toast.success('Two-factor authentication enabled.');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
    }
  }

  async function handleDisable() {
    setError(null);
    try {
      await disableMutation.mutateAsync();
      toast.success('Two-factor authentication disabled.');
      setDisablePassword('');
      setDisableCode('');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disable two-factor authentication.');
    }
  }

  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--foreground)]">
          Save these recovery codes somewhere safe. Each can be used once if you lose access to your authenticator app.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 font-mono text-xs">
          {recoveryCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <Button variant="outline" onClick={() => setRecoveryCodes(null)}>
          Done
        </Button>
      </div>
    );
  }

  if (enrollment) {
    return (
      <div className="space-y-4">
        <InlineFormError message={error ?? undefined} />
        <img src={enrollment.qrCodeDataUrl} alt="Two-factor QR code" className="h-40 w-40 rounded-lg border border-[var(--border)]" />
        <p className="text-xs text-[var(--muted-foreground)]">
          Or enter this code manually: <code className="font-mono">{enrollment.secret}</code>
        </p>
        <div>
          <Label htmlFor="enable-code">Enter the 6-digit code to confirm</Label>
          <Input id="enable-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
        </div>
        <Button onClick={handleEnable} loading={enableMutation.isPending}>
          Confirm and enable
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InlineFormError message={error ?? undefined} />
      <Button onClick={handleBeginEnrollment} loading={enrollMutation.isPending}>
        Set up two-factor authentication
      </Button>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="mb-2 text-xs text-[var(--muted-foreground)]">Already enabled? Disable it here (requires password + a valid code).</p>
        <div className="grid grid-cols-2 gap-2">
          <PasswordInput
            placeholder="Current password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
          />
          <Input placeholder="6-digit code" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} maxLength={6} />
        </div>
        <Button variant="destructive" size="sm" className="mt-2" onClick={handleDisable} loading={disableMutation.isPending}>
          Disable two-factor authentication
        </Button>
      </div>
    </div>
  );
}
