import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';

export function LoginPage() {
  return (
    <AuthLayout>
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-brand-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-secondary/10 blur-[120px]" />

      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle>Business OS</CardTitle>
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
