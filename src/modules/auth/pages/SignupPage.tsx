import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { SignupForm } from '../components/SignupForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';

export function SignupPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Create your workspace</CardTitle>
          <CardDescription>Set up Business OS for your organization</CardDescription>
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
