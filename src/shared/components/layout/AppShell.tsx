import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Contact, Settings, ScrollText, LogOut, Sparkles, Sun, Moon, Clock, ClipboardList, CalendarOff, ClipboardCheck, FolderKanban, Timer, NotebookPen, ListChecks, Receipt, Wallet, BriefcaseBusiness, Handshake, Building2, FileSpreadsheet, LifeBuoy, BookOpen, FileText, Boxes, UserCheck, DoorOpen, LayoutTemplate, Megaphone } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { useTheme } from '../../lib/theme';
import { Button } from '../ui/button';
import { RoleGate } from './RoleGate';
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

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <aside className="relative z-20 flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
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

        <nav className="flex-1 space-y-1 px-4 py-6" aria-label="Primary">
          <NavLink to="/" end className={navLinkClasses}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>

          <RoleGate allow={['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']}>
            <NavLink to="/attendance" className={navLinkClasses}>
              <Clock className="h-4 w-4" />
              Attendance
            </NavLink>
            <NavLink to="/leave" className={navLinkClasses}>
              <CalendarOff className="h-4 w-4" />
              Leave
            </NavLink>
            {/* Visible to everyone, not role-gated — being someone's manager is an org-chart
                fact (EmployeeProfile.managerId), not tied to a UserRole. The queue is simply
                empty for anyone with nothing to review; the server enforces the real boundary. */}
            <NavLink to="/leave/approvals" className={navLinkClasses}>
              <ClipboardCheck className="h-4 w-4" />
              Leave Approvals
            </NavLink>
            <NavLink to="/projects" className={navLinkClasses}>
              <FolderKanban className="h-4 w-4" />
              Projects
            </NavLink>
            <NavLink to="/time-tracking" className={navLinkClasses}>
              <Timer className="h-4 w-4" />
              Time Tracking
            </NavLink>
            <NavLink to="/work-reports" className={navLinkClasses}>
              <NotebookPen className="h-4 w-4" />
              Work Reports
            </NavLink>
            {/* Not role-gated for the same reason as Leave Approvals: being someone's manager is
                an org-chart fact, not a UserRole. The queue is empty for anyone with no reports. */}
            <NavLink to="/work-reports/review" className={navLinkClasses}>
              <ListChecks className="h-4 w-4" />
              Report Reviews
            </NavLink>
            <NavLink to="/payslips" className={navLinkClasses}>
              <Receipt className="h-4 w-4" />
              My Payslips
            </NavLink>
            <NavLink to="/employees" className={navLinkClasses}>
              <Contact className="h-4 w-4" />
              Employees
            </NavLink>
            <NavLink to="/helpdesk" className={navLinkClasses}>
              <LifeBuoy className="h-4 w-4" />
              Helpdesk
            </NavLink>
            <NavLink to="/knowledge-base" className={navLinkClasses}>
              <BookOpen className="h-4 w-4" />
              Knowledge Base
            </NavLink>
            <NavLink to="/documents" className={navLinkClasses}>
              <FileText className="h-4 w-4" />
              Documents
            </NavLink>
            <NavLink to="/assets" className={navLinkClasses}>
              <Boxes className="h-4 w-4" />
              Assets
            </NavLink>
            <NavLink to="/room-bookings" className={navLinkClasses}>
              <DoorOpen className="h-4 w-4" />
              Room Bookings
            </NavLink>
            <NavLink to="/announcements" className={navLinkClasses}>
              <Megaphone className="h-4 w-4" />
              Announcements
            </NavLink>
          </RoleGate>

          <RoleGate allow={['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER']}>
            <NavLink to="/attendance/regularizations" className={navLinkClasses}>
              <ClipboardList className="h-4 w-4" />
              Regularizations
            </NavLink>
          </RoleGate>

          {/* Finance is ADMIN/SUPER_ADMIN only — financial records are more restricted than
              general HR data, so this is deliberately narrower than the block below it. */}
          <RoleGate allow={['SUPER_ADMIN', 'ADMIN']}>
            <NavLink to="/finance" className={navLinkClasses}>
              <FileSpreadsheet className="h-4 w-4" />
              Finance
            </NavLink>
          </RoleGate>

          <RoleGate allow={['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']}>
            <NavLink to="/templates" className={navLinkClasses}>
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </NavLink>
            <NavLink to="/visitors" className={navLinkClasses}>
              <UserCheck className="h-4 w-4" />
              Visitors
            </NavLink>
            <NavLink to="/recruitment" className={navLinkClasses}>
              <BriefcaseBusiness className="h-4 w-4" />
              Recruitment
            </NavLink>
            <NavLink to="/crm/leads" className={navLinkClasses}>
              <Handshake className="h-4 w-4" />
              Leads
            </NavLink>
            <NavLink to="/crm/clients" className={navLinkClasses}>
              <Building2 className="h-4 w-4" />
              Clients
            </NavLink>
            <NavLink to="/payroll" className={navLinkClasses}>
              <Wallet className="h-4 w-4" />
              Payroll
            </NavLink>
            <NavLink to="/users" className={navLinkClasses}>
              <Users className="h-4 w-4" />
              Team
            </NavLink>
          </RoleGate>

          <RoleGate allow={['SUPER_ADMIN', 'ADMIN']}>
            <NavLink to="/audit-log" className={navLinkClasses}>
              <ScrollText className="h-4 w-4" />
              Audit Log
            </NavLink>
            <NavLink to="/settings" className={navLinkClasses}>
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
          </RoleGate>
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
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
