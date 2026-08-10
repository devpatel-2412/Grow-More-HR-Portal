import type { UserRole } from '@prisma/client';

/**
 * Flat permission catalogue, `resource:action` shaped. Every future module adds its own
 * entries here and to ROLE_PERMISSIONS — this file is the single source of truth for
 * "who can do what", so requirePermission() never needs to change when roles gain or lose
 * capabilities.
 */
export const PERMISSIONS = {
  TENANT_CREATE: 'tenant:create',
  TENANT_READ: 'tenant:read',
  TENANT_UPDATE: 'tenant:update',
  TENANT_LIST_ALL: 'tenant:list:all',

  USER_INVITE: 'user:invite',
  USER_READ_TENANT: 'user:read:tenant',
  USER_ROLE_UPDATE: 'user:role:update',
  USER_STATUS_UPDATE: 'user:status:update',

  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_READ_TENANT: 'employee:read:tenant',
  EMPLOYEE_UPDATE: 'employee:update',
  /** Employee can read their own profile only */
  EMPLOYEE_READ_SELF: 'employee:read:self',
  /** Employee can update their own limited profile fields (phone, address, emergency contact) */
  EMPLOYEE_UPDATE_SELF: 'employee:update:self',

  ATTENDANCE_READ_TENANT: 'attendance:read:tenant',
  ATTENDANCE_REGULARIZATION_APPROVE: 'attendance:regularization:approve',
  /** Punch in/out/break and view own attendance — any authenticated staff member */
  ATTENDANCE_SELF: 'attendance:self',
  /** Employee can submit a regularization request for their own attendance */
  ATTENDANCE_REGULARIZATION_CREATE: 'attendance:regularization:create',

  LEAVE_READ_TENANT: 'leave:read:tenant',
  LEAVE_APPROVE_HR: 'leave:approve:hr',
  /** Direct managers can approve their direct reports' leave */
  LEAVE_APPROVE_MANAGER: 'leave:approve:manager',
  /** Employee can submit new leave requests */
  LEAVE_APPLY: 'leave:apply',
  /** Employee can view their own leave history */
  LEAVE_VIEW_SELF: 'leave:view:self',

  PROJECT_MANAGE: 'project:manage',
  TASK_MANAGE: 'task:manage',
  /** Employee can view tasks assigned to them */
  TASK_VIEW_ASSIGNED: 'task:view:assigned',
  /** Employee can update status and add comments on their own assigned tasks */
  TASK_UPDATE_OWN: 'task:update:own',

  WORK_REPORT_READ_TENANT: 'workreport:read:tenant',
  WORK_REPORT_REVIEW: 'workreport:review',
  /** Employee can submit their own daily work report */
  WORK_REPORT_SUBMIT: 'workreport:submit',

  TIME_LOG_READ_TENANT: 'timelog:read:tenant',
  /** Employee can read and create their own time logs */
  TIME_LOG_SELF: 'timelog:self',

  PAYROLL_MANAGE: 'payroll:manage',
  PAYROLL_READ_TENANT: 'payroll:read:tenant',
  /** Employee can download their own payslips */
  PAYSLIP_READ_SELF: 'payslip:read:self',

  RECRUITMENT_MANAGE: 'recruitment:manage',
  RECRUITMENT_READ: 'recruitment:read',

  CRM_MANAGE: 'crm:manage',
  CRM_READ: 'crm:read',

  FINANCE_MANAGE: 'finance:manage',
  FINANCE_READ: 'finance:read',

  TICKET_MANAGE: 'ticket:manage',
  TICKET_READ_TENANT: 'ticket:read:tenant',
  /** Employee can raise a new support ticket */
  TICKET_CREATE: 'ticket:create',
  /** Employee can view their own submitted tickets */
  TICKET_VIEW_SELF: 'ticket:view:self',

  KB_MANAGE: 'kb:manage',
  /** Every staff member can read knowledge base articles */
  KB_READ: 'kb:read',

  DOCUMENT_MANAGE: 'document:manage',
  /** Employee can view their own documents */
  DOCUMENT_VIEW_SELF: 'document:view:self',
  /** Employee can upload their own documents */
  DOCUMENT_UPLOAD_SELF: 'document:upload:self',

  ASSET_MANAGE: 'asset:manage',
  VISITOR_MANAGE: 'visitor:manage',
  ROOM_BOOKING_MANAGE: 'roombooking:manage',
  /** Any staff member can book a room */
  ROOM_BOOKING_CREATE: 'roombooking:create',

  TEMPLATE_MANAGE: 'template:manage',
  ANNOUNCEMENT_MANAGE: 'announcement:manage',
  /** Every staff member can read announcements */
  ANNOUNCEMENT_READ: 'announcement:read',

  ORG_MANAGE: 'org:manage',

  VENDOR_MANAGE: 'vendor:manage',
  INVENTORY_MANAGE: 'inventory:manage',
  SOP_MANAGE: 'sop:manage',
  /** Every staff member can read published SOPs */
  SOP_READ: 'sop:read',

  AUDIT_READ: 'audit:read',

  DASHBOARD_READ_TENANT: 'dashboard:read:tenant',

  /** View the tenant-wide active-sessions dashboard and force-logout a user or the whole tenant */
  SESSION_MANAGE: 'session:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/**
 * SUPER_ADMIN gets every permission unconditionally (see permission-resolver.service.ts's
 * short-circuit). For the other 5 fixed roles, this map is used only as seed data
 * (rbac-seed.util.ts copies it into that role's DB-backed Role/RolePermission rows the first time
 * a tenant is seeded) and as an emergency fallback if that DB row is ever missing — at runtime,
 * the Roles & Permissions page's live database state is what requirePermission() actually checks,
 * not this array. Kept here, not deleted, because seeding needs a sensible starting point.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: [
    PERMISSIONS.TENANT_READ,
    PERMISSIONS.TENANT_UPDATE,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.USER_READ_TENANT,
    PERMISSIONS.USER_ROLE_UPDATE,
    PERMISSIONS.USER_STATUS_UPDATE,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_READ_TENANT,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_READ_SELF,
    PERMISSIONS.EMPLOYEE_UPDATE_SELF,
    PERMISSIONS.ATTENDANCE_READ_TENANT,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE,
    PERMISSIONS.ATTENDANCE_SELF,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_CREATE,
    PERMISSIONS.LEAVE_READ_TENANT,
    PERMISSIONS.LEAVE_APPROVE_HR,
    PERMISSIONS.LEAVE_APPROVE_MANAGER,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.LEAVE_VIEW_SELF,
    PERMISSIONS.PROJECT_MANAGE,
    PERMISSIONS.TASK_MANAGE,
    PERMISSIONS.TASK_VIEW_ASSIGNED,
    PERMISSIONS.TASK_UPDATE_OWN,
    PERMISSIONS.WORK_REPORT_READ_TENANT,
    PERMISSIONS.WORK_REPORT_REVIEW,
    PERMISSIONS.WORK_REPORT_SUBMIT,
    PERMISSIONS.TIME_LOG_READ_TENANT,
    PERMISSIONS.TIME_LOG_SELF,
    PERMISSIONS.PAYROLL_MANAGE,
    PERMISSIONS.PAYROLL_READ_TENANT,
    PERMISSIONS.PAYSLIP_READ_SELF,
    PERMISSIONS.RECRUITMENT_MANAGE,
    PERMISSIONS.RECRUITMENT_READ,
    PERMISSIONS.CRM_MANAGE,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.TICKET_MANAGE,
    PERMISSIONS.TICKET_READ_TENANT,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_VIEW_SELF,
    PERMISSIONS.KB_MANAGE,
    PERMISSIONS.KB_READ,
    PERMISSIONS.DOCUMENT_MANAGE,
    PERMISSIONS.DOCUMENT_VIEW_SELF,
    PERMISSIONS.DOCUMENT_UPLOAD_SELF,
    PERMISSIONS.ASSET_MANAGE,
    PERMISSIONS.VISITOR_MANAGE,
    PERMISSIONS.ROOM_BOOKING_MANAGE,
    PERMISSIONS.ROOM_BOOKING_CREATE,
    PERMISSIONS.TEMPLATE_MANAGE,
    PERMISSIONS.ANNOUNCEMENT_MANAGE,
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.VENDOR_MANAGE,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.SOP_MANAGE,
    PERMISSIONS.SOP_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.DASHBOARD_READ_TENANT,
    PERMISSIONS.SESSION_MANAGE,
  ],
  HR_MANAGER: [
    // USER_INVITE deliberately NOT granted by default — enterprise invitation hierarchy requires
    // a SUPER_ADMIN to explicitly grant it per-tenant (via the dynamic RBAC layer) before an
    // HR_MANAGER can invite anyone. See INVITABLE_ROLES below for what they may invite once granted.
    PERMISSIONS.USER_READ_TENANT,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_READ_TENANT,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_READ_SELF,
    PERMISSIONS.EMPLOYEE_UPDATE_SELF,
    PERMISSIONS.ATTENDANCE_READ_TENANT,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE,
    PERMISSIONS.ATTENDANCE_SELF,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_CREATE,
    PERMISSIONS.LEAVE_READ_TENANT,
    PERMISSIONS.LEAVE_APPROVE_HR,
    PERMISSIONS.LEAVE_APPROVE_MANAGER,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.LEAVE_VIEW_SELF,
    PERMISSIONS.TASK_VIEW_ASSIGNED,
    PERMISSIONS.TASK_UPDATE_OWN,
    PERMISSIONS.WORK_REPORT_READ_TENANT,
    PERMISSIONS.WORK_REPORT_REVIEW,
    PERMISSIONS.WORK_REPORT_SUBMIT,
    PERMISSIONS.TIME_LOG_READ_TENANT,
    PERMISSIONS.TIME_LOG_SELF,
    PERMISSIONS.PAYROLL_MANAGE,
    PERMISSIONS.PAYROLL_READ_TENANT,
    PERMISSIONS.PAYSLIP_READ_SELF,
    PERMISSIONS.RECRUITMENT_MANAGE,
    PERMISSIONS.RECRUITMENT_READ,
    PERMISSIONS.TICKET_MANAGE,
    PERMISSIONS.TICKET_READ_TENANT,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_VIEW_SELF,
    PERMISSIONS.KB_MANAGE,
    PERMISSIONS.KB_READ,
    PERMISSIONS.DOCUMENT_MANAGE,
    PERMISSIONS.DOCUMENT_VIEW_SELF,
    PERMISSIONS.DOCUMENT_UPLOAD_SELF,
    PERMISSIONS.ASSET_MANAGE,
    PERMISSIONS.VISITOR_MANAGE,
    PERMISSIONS.ROOM_BOOKING_MANAGE,
    PERMISSIONS.ROOM_BOOKING_CREATE,
    PERMISSIONS.TEMPLATE_MANAGE,
    PERMISSIONS.ANNOUNCEMENT_MANAGE,
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.VENDOR_MANAGE,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.SOP_MANAGE,
    PERMISSIONS.SOP_READ,
    PERMISSIONS.DASHBOARD_READ_TENANT,
  ],
  PROJECT_MANAGER: [
    PERMISSIONS.EMPLOYEE_READ_TENANT,
    PERMISSIONS.EMPLOYEE_READ_SELF,
    PERMISSIONS.EMPLOYEE_UPDATE_SELF,
    PERMISSIONS.ATTENDANCE_READ_TENANT,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE,
    PERMISSIONS.ATTENDANCE_SELF,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_CREATE,
    PERMISSIONS.LEAVE_READ_TENANT,
    PERMISSIONS.LEAVE_APPROVE_MANAGER,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.LEAVE_VIEW_SELF,
    PERMISSIONS.PROJECT_MANAGE,
    PERMISSIONS.TASK_MANAGE,
    PERMISSIONS.TASK_VIEW_ASSIGNED,
    PERMISSIONS.TASK_UPDATE_OWN,
    PERMISSIONS.WORK_REPORT_READ_TENANT,
    PERMISSIONS.WORK_REPORT_REVIEW,
    PERMISSIONS.WORK_REPORT_SUBMIT,
    PERMISSIONS.TIME_LOG_READ_TENANT,
    PERMISSIONS.TIME_LOG_SELF,
    PERMISSIONS.PAYSLIP_READ_SELF,
    PERMISSIONS.RECRUITMENT_READ,
    PERMISSIONS.CRM_MANAGE,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.TICKET_READ_TENANT,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_VIEW_SELF,
    PERMISSIONS.KB_READ,
    PERMISSIONS.DOCUMENT_VIEW_SELF,
    PERMISSIONS.DOCUMENT_UPLOAD_SELF,
    PERMISSIONS.ROOM_BOOKING_CREATE,
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.SOP_READ,
    PERMISSIONS.DASHBOARD_READ_TENANT,
  ],
  EMPLOYEE: [
    // Identity — can read and self-update own profile fields only
    PERMISSIONS.EMPLOYEE_READ_SELF,
    PERMISSIONS.EMPLOYEE_UPDATE_SELF,
    // Attendance — own punch/break/view/regularization request
    PERMISSIONS.ATTENDANCE_SELF,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_CREATE,
    // Leave — apply and view own
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.LEAVE_VIEW_SELF,
    // Tasks — view assigned, update status + comment on own
    PERMISSIONS.TASK_VIEW_ASSIGNED,
    PERMISSIONS.TASK_UPDATE_OWN,
    // Work reports — submit own
    PERMISSIONS.WORK_REPORT_SUBMIT,
    // Time logs — own only
    PERMISSIONS.TIME_LOG_SELF,
    // Payslips — own only
    PERMISSIONS.PAYSLIP_READ_SELF,
    // Helpdesk — raise and view own tickets
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_VIEW_SELF,
    // Knowledge base — read-only
    PERMISSIONS.KB_READ,
    // Documents — own only
    PERMISSIONS.DOCUMENT_VIEW_SELF,
    PERMISSIONS.DOCUMENT_UPLOAD_SELF,
    // Room bookings — can book for themselves
    PERMISSIONS.ROOM_BOOKING_CREATE,
    // Announcements — read-only
    PERMISSIONS.ANNOUNCEMENT_READ,
    // SOPs — read-only
    PERMISSIONS.SOP_READ,
  ],
  // Leads a team day-to-day (task assignment, attendance/leave approval for direct reports) —
  // scoped down from PROJECT_MANAGER: no CRM, no project creation, no recruitment/finance visibility.
  TEAM_LEADER: [
    PERMISSIONS.EMPLOYEE_READ_TENANT,
    PERMISSIONS.EMPLOYEE_READ_SELF,
    PERMISSIONS.EMPLOYEE_UPDATE_SELF,
    PERMISSIONS.ATTENDANCE_READ_TENANT,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE,
    PERMISSIONS.ATTENDANCE_SELF,
    PERMISSIONS.ATTENDANCE_REGULARIZATION_CREATE,
    PERMISSIONS.LEAVE_READ_TENANT,
    PERMISSIONS.LEAVE_APPROVE_MANAGER,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.LEAVE_VIEW_SELF,
    PERMISSIONS.TASK_MANAGE,
    PERMISSIONS.TASK_VIEW_ASSIGNED,
    PERMISSIONS.TASK_UPDATE_OWN,
    PERMISSIONS.WORK_REPORT_READ_TENANT,
    PERMISSIONS.WORK_REPORT_REVIEW,
    PERMISSIONS.WORK_REPORT_SUBMIT,
    PERMISSIONS.TIME_LOG_READ_TENANT,
    PERMISSIONS.TIME_LOG_SELF,
    PERMISSIONS.PAYSLIP_READ_SELF,
    PERMISSIONS.TICKET_READ_TENANT,
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_VIEW_SELF,
    PERMISSIONS.KB_READ,
    PERMISSIONS.DOCUMENT_VIEW_SELF,
    PERMISSIONS.DOCUMENT_UPLOAD_SELF,
    PERMISSIONS.ROOM_BOOKING_CREATE,
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.SOP_READ,
    PERMISSIONS.DASHBOARD_READ_TENANT,
  ],
};

/**
 * Who each role may invite, once they hold USER_INVITE at all (see ROLE_PERMISSIONS — several of
 * these roles don't grant USER_INVITE by default, matching "only if permission is granted" from
 * the enterprise invitation hierarchy spec). Checked in UserService.invite() alongside the
 * requirePermission(USER_INVITE) route gate, so an authorized inviter still can't hand out a role
 * above their own station (e.g. ADMIN can never invite another ADMIN or a SUPER_ADMIN).
 */
export const INVITABLE_ROLES: Record<UserRole, UserRole[]> = {
  SUPER_ADMIN: Object.keys(ROLE_PERMISSIONS) as UserRole[],
  ADMIN: ['HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'],
  HR_MANAGER: ['EMPLOYEE'],
  PROJECT_MANAGER: ['EMPLOYEE'],
  TEAM_LEADER: [],
  EMPLOYEE: [],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
