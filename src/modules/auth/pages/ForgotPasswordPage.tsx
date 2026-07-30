import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { PasswordResetRequestForm } from '../components/PasswordResetRequestForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-lg shadow-indigo-500/20">
            <KeyRound className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>We'll email you a link to reset it</CardDescription>
        </CardHeader>
        <PasswordResetRequestForm />
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          <Link to="/login" className="text-[var(--primary)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
