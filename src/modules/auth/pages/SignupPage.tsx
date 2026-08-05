import { Link } from 'react-router-dom';
import { SignupForm } from '../components/SignupForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';
import { Logo } from '../../../shared/components/ui/logo';
import { APP_NAME } from '../../../shared/config/brand';

export function SignupPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <Logo className="mb-3 h-12 w-12 shadow-lg shadow-(--primary)/20" />
          <CardTitle className="text-2xl">Create your workspace</CardTitle>
          <CardDescription>Set up {APP_NAME} for your organization</CardDescription>
        </CardHeader>
        <SignupForm />
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Already have a workspace?{' '}
          <Link to="/login" className="text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
