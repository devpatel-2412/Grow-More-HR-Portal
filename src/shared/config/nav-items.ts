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
  DoorOpen,
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
 * render from this list so they can never drift out of sync with each other. This does not
 * cover the CLIENT-role portal shell, which has its own tiny fixed nav (see ClientPortalShell).
 *
 * The `allow` list here is the nav-visibility gate, mirrored by (but not generated from) the
 * `RequireRole` route guards in router.tsx — a route must always be gated in both places, since
 * this list only controls what's visible in the UI, not what the server/router actually allows.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },

  { label: 'Attendance', path: '/attendance', icon: Clock, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Leave', path: '/leave', icon: CalendarOff, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Leave Approvals', path: '/leave/approvals', icon: ClipboardCheck, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'RECRUITER', 'FINANCE'] },
  { label: 'Projects', path: '/projects', icon: FolderKanban, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Time Tracking', path: '/time-tracking', icon: Timer, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Work Reports', path: '/work-reports', icon: NotebookPen, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Report Reviews', path: '/work-reports/review', icon: ListChecks, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'RECRUITER', 'FINANCE'] },
  { label: 'My Payslips', path: '/payslips', icon: Receipt, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Employees', path: '/employees', icon: Contact, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Helpdesk', path: '/helpdesk', icon: LifeBuoy, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Documents', path: '/documents', icon: FileText, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Assets', path: '/assets', icon: Boxes, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Room Bookings', path: '/room-bookings', icon: DoorOpen, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Announcements', path: '/announcements', icon: Megaphone, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'Org Chart', path: '/organization/chart', icon: Network, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },
  { label: 'SOP Library', path: '/sops', icon: BookMarked, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE'] },

  { label: 'Regularizations', path: '/attendance/regularizations', icon: ClipboardList, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'] },

  // Finance is ADMIN/SUPER_ADMIN/FINANCE — financial records are more restricted than general HR data.
  { label: 'Finance', path: '/finance', icon: FileSpreadsheet, allow: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] },

  // Scoped separately from the HR-manager block below: RECRUITER should see only Recruitment.
  { label: 'Recruitment', path: '/recruitment', icon: BriefcaseBusiness, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'RECRUITER'] },

  { label: 'Templates', path: '/templates', icon: LayoutTemplate, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Visitors', path: '/visitors', icon: UserCheck, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Leads', path: '/crm/leads', icon: Handshake, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Clients', path: '/crm/clients', icon: Building2, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Payroll', path: '/payroll', icon: Wallet, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Team', path: '/users', icon: Users, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Branches', path: '/organization/branches', icon: Building2, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Teams', path: '/organization/teams', icon: Users2, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Vendors', path: '/vendors', icon: Truck, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },
  { label: 'Inventory', path: '/inventory', icon: Package, allow: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'] },

  { label: 'Companies', path: '/companies', icon: Building2, allow: ['SUPER_ADMIN'] },
  { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Audit Log', path: '/audit-log', icon: ScrollText, allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Sessions', path: '/sessions', icon: MonitorSmartphone, allow: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Settings', path: '/settings', icon: Settings, allow: ['SUPER_ADMIN', 'ADMIN'] },
];
