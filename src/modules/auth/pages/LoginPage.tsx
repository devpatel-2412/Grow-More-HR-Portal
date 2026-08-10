import { LoginForm } from '../components/LoginForm';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';
import { Logo } from '../../../shared/components/ui/logo';
import { APP_NAME } from '../../../shared/config/brand';

export function LoginPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <Logo className="mb-3 h-12 w-12 shadow-lg shadow-(--primary)/20" />
          <CardTitle>{APP_NAME}</CardTitle>
          <CardDescription>Enterprise Operations &amp; Automation</CardDescription>
        </CardHeader>
        <LoginForm />
      </Card>
    </AuthLayout>
  );
}
