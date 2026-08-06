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

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/**
 * Default role → permission matrix. SUPER_ADMIN gets every permission unconditionally.
 * This static map is deliberately swappable: a later per-tenant custom-role table can
 * replace the lookup inside requirePermission() without changing any call site.
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
    PERMISSIONS.USER_INVITE,
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
  CLIENT: [],
  RECRUITER: [PERMISSIONS.RECRUITMENT_MANAGE, PERMISSIONS.RECRUITMENT_READ],
  FINANCE: [PERMISSIONS.FINANCE_MANAGE, PERMISSIONS.FINANCE_READ],
  // No candidate-facing surface exists yet — see the UserRole.CANDIDATE comment in schema.prisma.
  CANDIDATE: [],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
