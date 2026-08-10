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
  /** Sidebar/palette display grouping only — purely presentational, never touches `allow`/route gating. */
  group?: string;
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

  // Work
  { label: 'Attendance', path: '/attendance', icon: Clock, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Leave', path: '/leave', icon: CalendarOff, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Leave Approvals', path: '/leave/approvals', icon: ClipboardCheck, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER'] },
  { label: 'Regularizations', path: '/attendance/regularizations', icon: ClipboardList, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER'] },
  { label: 'Projects', path: '/projects', icon: FolderKanban, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Time Tracking', path: '/time-tracking', icon: Timer, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Work Reports', path: '/work-reports', icon: NotebookPen, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Report Reviews', path: '/work-reports/review', icon: ListChecks, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER'] },
  { label: 'My Payslips', path: '/payslips', icon: Receipt, group: 'Work', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },

  // People
  { label: 'Employees', path: '/employees', icon: Contact, group: 'People', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Team', path: '/users', icon: Users, group: 'People', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Org Chart', path: '/organization/chart', icon: Network, group: 'People', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Branches', path: '/organization/branches', icon: Building2, group: 'People', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Teams', path: '/organization/teams', icon: Users2, group: 'People', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Companies', path: '/companies', icon: Building2, group: 'People', allow: ['SUPER_ADMIN'] },

  // Finance module stays fully functional for ADMIN — the dedicated FINANCE/ACCOUNTS account
  // types were removed, not the module itself.
  { label: 'Finance', path: '/finance', icon: FileSpreadsheet, group: 'Finance', allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Payroll', path: '/payroll', icon: Wallet, group: 'Finance', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },

  // Recruitment module stays fully functional for ADMIN/HR_MANAGER — the dedicated RECRUITER
  // account type was removed, not the module itself.
  { label: 'Recruitment', path: '/recruitment', icon: BriefcaseBusiness, group: 'Recruitment & CRM', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Leads', path: '/crm/leads', icon: Handshake, group: 'Recruitment & CRM', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },

  // Workplace
  { label: 'Helpdesk', path: '/helpdesk', icon: LifeBuoy, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Documents', path: '/documents', icon: FileText, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Assets', path: '/assets', icon: Boxes, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Announcements', path: '/announcements', icon: Megaphone, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'SOP Library', path: '/sops', icon: BookMarked, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] },
  { label: 'Templates', path: '/templates', icon: LayoutTemplate, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Visitors', path: '/visitors', icon: UserCheck, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Vendors', path: '/vendors', icon: Truck, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Inventory', path: '/inventory', icon: Package, group: 'Workplace', allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },

  // Admin
  // SUPER_ADMIN alone decides the other 5 fixed roles' access — see permissions.ts.
  { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, group: 'Admin', allow: ['SUPER_ADMIN'] },
  { label: 'Audit Log', path: '/audit-log', icon: ScrollText, group: 'Admin', allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Sessions', path: '/sessions', icon: MonitorSmartphone, group: 'Admin', allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'Admin', allow: ['SUPER_ADMIN', 'ADMIN'] },
];
