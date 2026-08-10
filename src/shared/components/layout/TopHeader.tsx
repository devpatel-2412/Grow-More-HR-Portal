import { useNavigate } from 'react-router-dom';
import { Search, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/theme-toggle';
import { Avatar } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { NotificationBell } from '../../../modules/notifications/components/NotificationBell';
import { openCommandPalette } from './CommandPalette';

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
}

interface TopHeaderProps {
  onOpenMobileNav: () => void;
}

/** Persistent top bar for both mobile and desktop — search trigger, notifications, theme, profile. */
export function TopHeader({ onOpenMobileNav }: TopHeaderProps) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 lg:px-6">
      <Button variant="ghost" size="icon" onClick={onOpenMobileNav} aria-label="Open navigation menu" className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      <button
        type="button"
        onClick={openCommandPalette}
        className="flex max-w-sm flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-left text-sm text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)]"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">Search&hellip;</span>
        <kbd className="hidden shrink-0 rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 text-[10px] sm:block">
          {isMac() ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ml-1 rounded-full transition hover:opacity-80" aria-label="Account menu">
              <Avatar name={profile ? `${profile.firstName} ${profile.lastName}` : (user?.email ?? '?')} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="normal-case">
              <p className="text-xs font-bold text-[var(--foreground)]">
                {profile ? `${profile.firstName} ${profile.lastName}` : user?.email}
              </p>
              <p className="mt-0.5 font-normal text-[var(--muted-foreground)]">{profile?.designation ?? user?.role.replace('_', ' ')}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-[var(--destructive)]">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
