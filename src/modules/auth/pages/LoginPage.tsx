import { Link } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';
import { Logo } from '../../../shared/components/ui/logo';
import { APP_NAME } from '../../../shared/config/brand';

export function LoginPage() {
  return (
    <AuthLayout>
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-brand-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-secondary/10 blur-[120px]" />

      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <Logo className="mb-3 h-12 w-12 shadow-lg shadow-(--primary)/20" />
          <CardTitle>{APP_NAME}</CardTitle>
          <CardDescription>Enterprise Operations &amp; Automation</CardDescription>
        </CardHeader>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Don't have a workspace yet?{' '}
          <Link to="/signup" className="text-[var(--primary)] hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
