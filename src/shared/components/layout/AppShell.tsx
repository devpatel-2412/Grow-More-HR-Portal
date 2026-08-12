import { useEffect, useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { Button } from '../ui/button';
import { Logo } from '../ui/logo';
import { APP_NAME } from '../../config/brand';
import { RoleGate } from './RoleGate';
import { CommandPalette } from './CommandPalette';
import { TopHeader } from './TopHeader';
import { NAV_ITEMS, type NavItem } from '../../config/nav-items';
import { cn } from '../../utils/cn';

const SIDEBAR_COLLAPSED_KEY = 'grow-more-sidebar-collapsed';

function navLinkClasses({ isActive, collapsed }: { isActive: boolean; collapsed: boolean }) {
  return cn(
    'flex items-center gap-3 rounded-xl border-l-2 py-2 text-sm font-medium transition-colors',
    collapsed ? 'justify-center px-2' : 'pl-2.5 pr-3',
    isActive
      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
      : 'border-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
  );
}

/** Groups NAV_ITEMS by their (optional) `group` field, preserving first-seen order — display only, never affects `allow`/route gating. */
function groupNavItems(items: NavItem[]): { group: string | undefined; items: NavItem[] }[] {
  const order: (string | undefined)[] = [];
  const byGroup = new Map<string | undefined, NavItem[]>();
  for (const item of items) {
    if (!byGroup.has(item.group)) {
      byGroup.set(item.group, []);
      order.push(item.group);
    }
    byGroup.get(item.group)!.push(item);
  }
  return order.map((group) => ({ group, items: byGroup.get(group)! }));
}

export function AppShell() {
  const { user, tenant } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  });

  // Below the lg breakpoint the sidebar is an off-canvas drawer — close it whenever the route
  // changes (a nav click) so it doesn't stay open covering the page it just navigated to.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <CommandPalette />

      {mobileNavOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close mobile navigation"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden cursor-pointer"
          onClick={() => setMobileNavOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMobileNavOpen(false);
            }
          }}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] transition-[width,transform] duration-200 ease-in-out lg:static lg:z-20 lg:translate-x-0',
          collapsed && 'lg:w-19',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex shrink-0 items-center gap-3 border-b border-[var(--border)] p-6', collapsed && 'lg:justify-center lg:px-3')}>
          <Logo className="h-8 w-auto shrink-0" />
          {!collapsed && (
            <div className="min-w-0 lg:block">
              <h2 className="truncate text-sm font-extrabold tracking-tight text-[var(--foreground)]">{tenant?.name ?? APP_NAME}</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {user?.role.replace('_', ' ')} Portal
              </span>
            </div>
          )}
        </div>

        <nav className={cn('flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden px-4 py-6', collapsed && 'lg:px-3')} aria-label="Primary">
          {groupNavItems(NAV_ITEMS).map(({ group, items }) => (
            <div key={group ?? '__ungrouped'} className="space-y-1 pb-1">
              {group && (
                <div className={cn('px-2.5 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)] uppercase', collapsed && 'lg:hidden')}>
                  {group}
                </div>
              )}
              {items.map((item) => {
                const link = (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => navLinkClasses({ isActive, collapsed })}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
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
            </div>
          ))}
        </nav>

        <div className="hidden shrink-0 border-t border-[var(--border)] p-3 lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('w-full text-[var(--muted-foreground)]', collapsed ? 'justify-center px-0' : 'justify-start')}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4 focus:outline-none sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
