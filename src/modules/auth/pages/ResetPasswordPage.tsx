import { useSearchParams, Navigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-lg shadow-indigo-500/20">
            <KeyRound className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>Choose a strong password you haven't used before</CardDescription>
        </CardHeader>
        <PasswordResetForm token={token} />
      </Card>
    </AuthLayout>
  );
}
