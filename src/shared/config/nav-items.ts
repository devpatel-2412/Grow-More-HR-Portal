import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Users,
  Contact,
  Settings,
  ScrollText,
  Clock,
  ClipboardList,
  CalendarOff,
  ClipboardCheck,
  FolderKanban,
  Timer,
  NotebookPen,
  ListChecks,
  Receipt,
  Wallet,
  BriefcaseBusiness,
  Handshake,
  Building2,
  FileSpreadsheet,
  LifeBuoy,
  BookOpen,
  FileText,
  Boxes,
  UserCheck,
  LayoutTemplate,
  Megaphone,
  Network,
  Users2,
  Truck,
  Package,
  BookMarked,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react';
import type { UserRole } from '../../modules/auth/types/auth.types';

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  /** Omit for a link visible to every staff role (Dashboard, and the two "manager queue" links
   * that are gated server-side on an org-chart fact — EmployeeProfile.managerId — not a UserRole). */
  allow?: UserRole[];
  /** Passed through to NavLink's `end` prop — only Dashboard needs an exact match at "/". */
  end?: boolean;
}

/**
 * Single source of truth for the staff-facing sidebar AND the command palette (Ctrl+K) — both
 * render from this list so they can never drift out of sync with each other.
 *
 * The `allow` list here is the nav-visibility gate, mirrored by (but not generated from) the
 * `RequireRole` route guards in router.tsx — a route must always be gated in both places, since
 * this list only controls what's visible in the UI, not what the server/router actually allows.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },

  { label: 'Attendance', path: '/attendance', icon: Clock, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Leave', path: '/leave', icon: CalendarOff, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Leave Approvals', path: '/leave/approvals', icon: ClipboardCheck, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER'] },
  { label: 'Projects', path: '/projects', icon: FolderKanban, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Time Tracking', path: '/time-tracking', icon: Timer, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Work Reports', path: '/work-reports', icon: NotebookPen, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Report Reviews', path: '/work-reports/review', icon: ListChecks, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER'] },
  { label: 'My Payslips', path: '/payslips', icon: Receipt, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Employees', path: '/employees', icon: Contact, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Helpdesk', path: '/helpdesk', icon: LifeBuoy, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Documents', path: '/documents', icon: FileText, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Assets', path: '/assets', icon: Boxes, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Announcements', path: '/announcements', icon: Megaphone, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Org Chart', path: '/organization/chart', icon: Network, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'SOP Library', path: '/sops', icon: BookMarked, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },

  { label: 'Regularizations', path: '/attendance/regularizations', icon: ClipboardList, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER'] },

  // Finance module stays fully functional for ADMIN — the dedicated FINANCE/ACCOUNTS account
  // types were removed, not the module itself.
  { label: 'Finance', path: '/finance', icon: FileSpreadsheet, allow: ['SUPER_ADMIN', 'ADMIN'] },

  // Recruitment module stays fully functional for ADMIN/HR_MANAGER — the dedicated RECRUITER
  // account type was removed, not the module itself.
  { label: 'Recruitment', path: '/recruitment', icon: BriefcaseBusiness, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },

  { label: 'Templates', path: '/templates', icon: LayoutTemplate, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Visitors', path: '/visitors', icon: UserCheck, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Leads', path: '/crm/leads', icon: Handshake, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Payroll', path: '/payroll', icon: Wallet, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Team', path: '/users', icon: Users, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Branches', path: '/organization/branches', icon: Building2, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Teams', path: '/organization/teams', icon: Users2, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Vendors', path: '/vendors', icon: Truck, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Inventory', path: '/inventory', icon: Package, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },

  { label: 'Companies', path: '/companies', icon: Building2, allow: ['SUPER_ADMIN'] },
  // SUPER_ADMIN alone decides the other 5 fixed roles' access — see permissions.ts.
  { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, allow: ['SUPER_ADMIN'] },
  { label: 'Audit Log', path: '/audit-log', icon: ScrollText, allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Sessions', path: '/sessions', icon: MonitorSmartphone, allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Settings', path: '/settings', icon: Settings, allow: ['SUPER_ADMIN', 'ADMIN'] },
];
