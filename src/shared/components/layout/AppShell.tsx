import { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { LogOut, Sparkles, Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useTheme } from '../../lib/theme';
import { Button } from '../ui/button';
import { RoleGate } from './RoleGate';
import { NotificationBell } from '../../../modules/notifications/components/NotificationBell';
import { CommandPalette } from './CommandPalette';
import { NAV_ITEMS } from '../../config/nav-items';
import { cn } from '../../utils/cn';

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-[var(--muted)] text-[var(--foreground)]'
      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]',
  );

export function AppShell() {
  const { user, profile, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Below the lg breakpoint the sidebar is an off-canvas drawer — close it whenever the route
  // changes (a nav click) so it doesn't stay open covering the page it just navigated to.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  // A CLIENT login has no employee profile and none of this shell's modules apply to them —
  // they belong in the separate ClientPortalShell instead.
  if (user && user.role === 'CLIENT') {
    return <Navigate to="/portal" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <CommandPalette />

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform duration-200 ease-in-out lg:static lg:z-20 lg:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-lg">
            <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">{tenant?.name ?? 'Business OS'}</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {user?.role.replace('_', ' ')} Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const link = (
              <NavLink key={item.path} to={item.path} end={item.end} className={navLinkClasses}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
            return item.allow ? (
              <RoleGate key={item.path} allow={item.allow}>
                {link}
              </RoleGate>
            ) : (
              link
            );
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] text-xs font-bold text-[var(--foreground)]">
              {(profile?.firstName?.[0] ?? user?.email[0] ?? '?').toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="truncate text-xs font-bold text-[var(--foreground)]">
                {profile ? `${profile.firstName} ${profile.lastName}` : user?.email}
              </h4>
              <p className="truncate text-[10px] text-[var(--muted-foreground)]">{profile?.designation ?? user?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] p-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-bold text-[var(--foreground)]">{tenant?.name ?? 'Business OS'}</span>
        </div>
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-8 focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
