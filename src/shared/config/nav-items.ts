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
  LayoutTemplate,
  Megaphone,
  Network,
  Users2,
  BookMarked,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react';
import type { UserRole, AuthUser } from '../../modules/auth/types/auth.types';
import type { Permission } from '../permissions/permission.types';

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  /** Reserved for the handful of items with no backend permission concept at all — access is
   * hardcoded to SUPER_ADMIN server-side (`requireRole('SUPER_ADMIN')`), so there's no permission
   * string to gate on. Every other item should use `permission` instead. */
  allow?: UserRole[];
  /** The permission (or "holds any of these") required to see this module — mirrors the actual
   * backend guard on the page's underlying read/list endpoint. Omit for a link visible to every
   * authenticated staff member (Dashboard, Projects, Assets, Org Chart — their list endpoints have
   * no permission gate, just an auth check) or one gated on an org-chart fact instead of a
   * permission (a direct-manager queue link, if one is ever added here). */
  permission?: Permission | Permission[];
  /** Passed through to NavLink's `end` prop — only Dashboard needs an exact match at "/". */
  end?: boolean;
  /** Sidebar/palette display grouping only — purely presentational, never touches visibility gating. */
  group?: string;
}

/**
 * Single source of truth for the staff-facing sidebar AND the command palette (Ctrl+K) — both
 * render from this list (via `isNavItemVisible`) so they can never drift out of sync with each
 * other, and the router's `RequirePermission` groups use the identical permission per module so
 * a hidden nav item can never lead to a reachable-but-403 route.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },

  // Work
  { label: 'Attendance', path: '/attendance', icon: Clock, group: 'Work', permission: 'attendance:self' },
  { label: 'Leave', path: '/leave', icon: CalendarOff, group: 'Work', permission: 'leave:view:self' },
  { label: 'Leave Approvals', path: '/leave/approvals', icon: ClipboardCheck, group: 'Work', permission: ['leave:approve:hr', 'leave:approve:manager'] },
  {
    label: 'Regularizations',
    path: '/attendance/regularizations',
    icon: ClipboardList,
    group: 'Work',
    permission: 'attendance:regularization:approve',
  },
  { label: 'Projects', path: '/projects', icon: FolderKanban, group: 'Work' },
  { label: 'Time Tracking', path: '/time-tracking', icon: Timer, group: 'Work', permission: 'timelog:self' },
  { label: 'Work Reports', path: '/work-reports', icon: NotebookPen, group: 'Work', permission: 'workreport:submit' },
  { label: 'Report Reviews', path: '/work-reports/review', icon: ListChecks, group: 'Work', permission: 'workreport:review' },
  { label: 'My Payslips', path: '/payslips', icon: Receipt, group: 'Work', permission: 'payslip:read:self' },

  // People
  { label: 'Employees', path: '/employees', icon: Contact, group: 'People', permission: 'employee:read:tenant' },
  { label: 'Team', path: '/users', icon: Users, group: 'People', permission: 'user:read:tenant' },
  { label: 'Org Chart', path: '/organization/chart', icon: Network, group: 'People' },
  { label: 'Branches', path: '/organization/branches', icon: Building2, group: 'People', permission: 'org:manage' },
  { label: 'Teams', path: '/organization/teams', icon: Users2, group: 'People', permission: 'org:manage' },
  // No permission concept for cross-tenant company switching — hardcoded to SUPER_ADMIN server-side.
  { label: 'Companies', path: '/companies', icon: Building2, group: 'People', allow: ['SUPER_ADMIN'] },

  // Finance module stays fully functional for ADMIN — the dedicated FINANCE/ACCOUNTS account
  // types were removed, not the module itself.
  { label: 'Finance', path: '/finance', icon: FileSpreadsheet, group: 'Finance', permission: 'finance:read' },
  { label: 'Payroll', path: '/payroll', icon: Wallet, group: 'Finance', permission: 'payroll:read:tenant' },

  // Recruitment/CRM stay fully functional for whoever actually holds the permission — including
  // PROJECT_MANAGER by default, who was previously excluded from this nav despite the permission.
  { label: 'Recruitment', path: '/recruitment', icon: BriefcaseBusiness, group: 'Recruitment & CRM', permission: 'recruitment:read' },
  { label: 'Leads', path: '/crm/leads', icon: Handshake, group: 'Recruitment & CRM', permission: 'crm:read' },

  // Workplace
  { label: 'Helpdesk', path: '/helpdesk', icon: LifeBuoy, group: 'Workplace', permission: 'ticket:view:self' },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen, group: 'Workplace', permission: 'kb:read' },
  { label: 'Documents', path: '/documents', icon: FileText, group: 'Workplace', permission: 'document:view:self' },
  { label: 'Assets', path: '/assets', icon: Boxes, group: 'Workplace' },
  { label: 'Announcements', path: '/announcements', icon: Megaphone, group: 'Workplace', permission: 'announcement:read' },
  { label: 'SOP Library', path: '/sops', icon: BookMarked, group: 'Workplace', permission: 'sop:read' },
  { label: 'Templates', path: '/templates', icon: LayoutTemplate, group: 'Workplace', permission: 'template:manage' },

  // Admin
  // No permission concept for role/permission administration — hardcoded to SUPER_ADMIN server-side.
  { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, group: 'Admin', allow: ['SUPER_ADMIN'] },
  { label: 'Audit Log', path: '/audit-log', icon: ScrollText, group: 'Admin', permission: 'audit:read' },
  { label: 'Sessions', path: '/sessions', icon: MonitorSmartphone, group: 'Admin', permission: 'session:manage' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'Admin', permission: 'tenant:update' },
];

/** Shared visibility rule for both the sidebar and the command palette — see NAV_ITEMS's doc comment. */
export function isNavItemVisible(item: NavItem, user: Pick<AuthUser, 'role' | 'permissions'> | null): boolean {
  if (!user) return false;
  if (item.allow) return item.allow.includes(user.role);
  if (item.permission) {
    const required = Array.isArray(item.permission) ? item.permission : [item.permission];
    return required.some((p) => user.permissions.includes(p));
  }
  return true;
}
