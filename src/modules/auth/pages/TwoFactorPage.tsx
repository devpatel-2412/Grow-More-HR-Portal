import { useLocation, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { TwoFactorVerifyForm } from '../components/TwoFactorVerifyForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';

export function TwoFactorPage() {
  const location = useLocation();
  const challengeToken = (location.state as { challengeToken?: string } | null)?.challengeToken;

  if (!challengeToken) {
    // Direct navigation without a login attempt first — nothing to verify.
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-(--primary) shadow-lg shadow-(--primary)/20">
            <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Two-factor verification</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
        </CardHeader>
        <TwoFactorVerifyForm challengeToken={challengeToken} />
      </Card>
    </AuthLayout>
  );
}
