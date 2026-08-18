import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useHasPermission } from '../hooks/useHasPermission';
import { authApi } from '../api/auth.api';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { TwoFactorSettings } from '../components/TwoFactorSettings';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { LoginHistoryPanel } from '../components/LoginHistoryPanel';
import { ProfilePictureUpload } from '../components/ProfilePictureUpload';
import { PunchWidget } from '../../attendance/components/PunchWidget';
import { AdminKpiDashboard } from '../../dashboard/components/AdminKpiDashboard';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function DashboardPage() {
  const { user, profile, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const now = useClock();

  async function handleLogoutAllDevices() {
    setLoggingOutAll(true);
    try {
      await authApi.logoutAll();
      toast.success('Logged out of all devices.');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to log out of all devices.');
    } finally {
      setLoggingOutAll(false);
    }
  }

  const showAdminDashboard = useHasPermission('dashboard:read:tenant');

  return (
    <div className={showAdminDashboard ? 'mx-auto max-w-6xl space-y-6' : 'mx-auto max-w-4xl space-y-6'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Welcome back{profile ? `, ${profile.firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{tenant?.name}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-right shadow-[var(--shadow-card)]">
          <p className="text-xs text-[var(--muted-foreground)]">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-lg font-bold tabular-nums text-[var(--foreground)]">
            {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {showAdminDashboard && <AdminKpiDashboard />}

      {/* items-start: the "Account" card (avatar + fields + change-password + sessions +
          recent sign-ins) is naturally much taller than "Today"/"Two-factor authentication" —
          without this, CSS Grid's default align-items:stretch forces every card in the row to
          match the tallest one, leaving the shorter cards mostly empty space. */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        {profile && (
          <Card>
            <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Today</h3>
            <PunchWidget />
          </Card>
        )}

        <Card>
          <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Account</h3>

          <div className="mb-4 border-b border-[var(--border)] pb-4">
            <ProfilePictureUpload />
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-[var(--muted-foreground)]">Email</dt>
              <dd className="font-semibold text-[var(--foreground)]">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted-foreground)]">Role</dt>
              <dd className="font-semibold text-[var(--foreground)]">{user?.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted-foreground)]">Status</dt>
              <dd className="font-semibold text-[var(--foreground)]">{user?.status}</dd>
            </div>
            {profile && (
              <div className="flex justify-between">
                <dt className="text-[var(--muted-foreground)]">Employee ID</dt>
                <dd className="font-semibold text-[var(--foreground)]">{profile.employeeId}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Change password</h4>
            <ChangePasswordForm />
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Sessions</h4>
            <p className="mb-2 text-xs text-[var(--muted-foreground)]">Sign out of this account everywhere it's currently logged in.</p>
            <Button variant="outline" size="sm" onClick={handleLogoutAllDevices} loading={loggingOutAll}>
              Log out all devices
            </Button>
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Recent sign-ins</h4>
            <LoginHistoryPanel />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Two-factor authentication</h3>
          <TwoFactorSettings />
        </Card>
      </div>
    </div>
  );
}
