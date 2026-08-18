// This file is a route manifest, not a component module — the lazyWithRetry() route constants
// below are never hot-reloaded as components, so the fast-refresh rule does not apply here.
/* eslint-disable react/only-export-components */
import { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { lazyWithRetry } from './lazy-retry';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { ProtectedRoute } from '../shared/components/layout/ProtectedRoute';
import { AppShell } from '../shared/components/layout/AppShell';
import { RequireRole } from '../shared/components/layout/RequireRole';
import { RequirePermission } from '../shared/components/layout/RequirePermission';
import { PageLoadingSkeleton } from '../shared/components/feedback/LoadingSkeleton';
import { NotFoundPage } from '../shared/components/feedback/NotFoundPage';

const TwoFactorPage = lazyWithRetry(() => import('../modules/auth/pages/TwoFactorPage').then((m) => ({ default: m.TwoFactorPage })));
const ForgotPasswordPage = lazyWithRetry(() => import('../modules/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazyWithRetry(() => import('../modules/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazyWithRetry(() => import('../modules/auth/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AcceptInvitePage = lazyWithRetry(() => import('../modules/users/pages/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })));
const UsersPage = lazyWithRetry(() => import('../modules/users/pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const EmployeesPage = lazyWithRetry(() => import('../modules/employees/pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const EmployeeDetailPage = lazyWithRetry(() => import('../modules/employees/pages/EmployeeDetailPage').then((m) => ({ default: m.EmployeeDetailPage })));
const TenantSettingsPage = lazyWithRetry(() => import('../modules/tenants/pages/TenantSettingsPage').then((m) => ({ default: m.TenantSettingsPage })));
const SessionsPage = lazyWithRetry(() => import('../modules/sessions/pages/SessionsPage').then((m) => ({ default: m.SessionsPage })));
const AuditLogPage = lazyWithRetry(() => import('../modules/audit/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const RolesPage = lazyWithRetry(() => import('../modules/rbac/pages/RolesPage').then((m) => ({ default: m.RolesPage })));
const CompaniesPage = lazyWithRetry(() => import('../modules/tenants/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const AttendancePage = lazyWithRetry(() => import('../modules/attendance/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const RegularizationsPage = lazyWithRetry(() => import('../modules/attendance/pages/RegularizationsPage').then((m) => ({ default: m.RegularizationsPage })));
const LeavePage = lazyWithRetry(() => import('../modules/leave/pages/LeavePage').then((m) => ({ default: m.LeavePage })));
const LeaveApprovalsPage = lazyWithRetry(() => import('../modules/leave/pages/LeaveApprovalsPage').then((m) => ({ default: m.LeaveApprovalsPage })));
const ProjectsPage = lazyWithRetry(() => import('../modules/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazyWithRetry(() => import('../modules/projects/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const WorkReportsPage = lazyWithRetry(() => import('../modules/workreports/pages/WorkReportsPage').then((m) => ({ default: m.WorkReportsPage })));
const WorkReportReviewPage = lazyWithRetry(() => import('../modules/workreports/pages/WorkReportReviewPage').then((m) => ({ default: m.WorkReportReviewPage })));
const TimeTrackingPage = lazyWithRetry(() => import('../modules/timetracking/pages/TimeTrackingPage').then((m) => ({ default: m.TimeTrackingPage })));
const PayrollRunsPage = lazyWithRetry(() => import('../modules/payroll/pages/PayrollRunsPage').then((m) => ({ default: m.PayrollRunsPage })));
const PayrollRunDetailPage = lazyWithRetry(() => import('../modules/payroll/pages/PayrollRunDetailPage').then((m) => ({ default: m.PayrollRunDetailPage })));
const MyPayslipsPage = lazyWithRetry(() => import('../modules/payroll/pages/MyPayslipsPage').then((m) => ({ default: m.MyPayslipsPage })));
const JobPostingsPage = lazyWithRetry(() => import('../modules/recruitment/pages/JobPostingsPage').then((m) => ({ default: m.JobPostingsPage })));
const JobPostingDetailPage = lazyWithRetry(() => import('../modules/recruitment/pages/JobPostingDetailPage').then((m) => ({ default: m.JobPostingDetailPage })));
const LeadsPage = lazyWithRetry(() => import('../modules/crm/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const FinanceDocumentsPage = lazyWithRetry(() => import('../modules/finance/pages/FinanceDocumentsPage').then((m) => ({ default: m.FinanceDocumentsPage })));
const FinanceDocumentDetailPage = lazyWithRetry(() => import('../modules/finance/pages/FinanceDocumentDetailPage').then((m) => ({ default: m.FinanceDocumentDetailPage })));
const ProfitLossPage = lazyWithRetry(() => import('../modules/finance/pages/ProfitLossPage').then((m) => ({ default: m.ProfitLossPage })));
const TicketsPage = lazyWithRetry(() => import('../modules/workplace/pages/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const TicketDetailPage = lazyWithRetry(() => import('../modules/workplace/pages/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })));
const KnowledgeBasePage = lazyWithRetry(() => import('../modules/workplace/pages/KnowledgeBasePage').then((m) => ({ default: m.KnowledgeBasePage })));
const DocumentsPage = lazyWithRetry(() => import('../modules/workplace/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const AssetsPage = lazyWithRetry(() => import('../modules/workplace/pages/AssetsPage').then((m) => ({ default: m.AssetsPage })));
const TemplatesPage = lazyWithRetry(() => import('../modules/hrautomation/pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const AnnouncementsPage = lazyWithRetry(() => import('../modules/hrautomation/pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })));
const BranchesPage = lazyWithRetry(() => import('../modules/organization/pages/BranchesPage').then((m) => ({ default: m.BranchesPage })));
const TeamsPage = lazyWithRetry(() => import('../modules/organization/pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const OrgChartPage = lazyWithRetry(() => import('../modules/organization/pages/OrgChartPage').then((m) => ({ default: m.OrgChartPage })));
const SopsPage = lazyWithRetry(() => import('../modules/sop/pages/SopsPage').then((m) => ({ default: m.SopsPage })));
const SopDetailPage = lazyWithRetry(() => import('../modules/sop/pages/SopDetailPage').then((m) => ({ default: m.SopDetailPage })));
const VerifyDocumentPage = lazyWithRetry(() => import('../modules/hrautomation/pages/VerifyDocumentPage').then((m) => ({ default: m.VerifyDocumentPage })));

function lazyRoute(element: React.ReactNode) {
  return <Suspense fallback={<PageLoadingSkeleton />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/two-factor', element: lazyRoute(<TwoFactorPage />) },
  { path: '/forgot-password', element: lazyRoute(<ForgotPasswordPage />) },
  { path: '/reset-password', element: lazyRoute(<ResetPasswordPage />) },
  { path: '/invite/accept', element: lazyRoute(<AcceptInvitePage />) },
  { path: '/verify/:id', element: lazyRoute(<VerifyDocumentPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          // Every authenticated staff member — these pages' underlying list/read endpoints have no
          // permission gate server-side (auth only), so there's nothing to hide the nav item or
          // route behind. See router-permission mapping notes in nav-items.ts.
          { path: '/', element: lazyRoute(<DashboardPage />) },
          { path: '/projects', element: lazyRoute(<ProjectsPage />) },
          { path: '/projects/:id', element: lazyRoute(<ProjectDetailPage />) },
          { path: '/organization/chart', element: lazyRoute(<OrgChartPage />) },
          { path: '/assets', element: lazyRoute(<AssetsPage />) },

          {
            element: <RequirePermission permission="attendance:self" />,
            children: [{ path: '/attendance', element: lazyRoute(<AttendancePage />) }],
          },
          {
            element: <RequirePermission permission="leave:view:self" />,
            children: [{ path: '/leave', element: lazyRoute(<LeavePage />) }],
          },
          {
            element: <RequirePermission anyOf={['leave:approve:hr', 'leave:approve:manager']} />,
            children: [{ path: '/leave/approvals', element: lazyRoute(<LeaveApprovalsPage />) }],
          },
          {
            element: <RequirePermission permission="attendance:regularization:approve" />,
            children: [{ path: '/attendance/regularizations', element: lazyRoute(<RegularizationsPage />) }],
          },
          {
            element: <RequirePermission permission="timelog:self" />,
            children: [{ path: '/time-tracking', element: lazyRoute(<TimeTrackingPage />) }],
          },
          {
            element: <RequirePermission permission="workreport:submit" />,
            children: [{ path: '/work-reports', element: lazyRoute(<WorkReportsPage />) }],
          },
          {
            element: <RequirePermission permission="workreport:review" />,
            children: [{ path: '/work-reports/review', element: lazyRoute(<WorkReportReviewPage />) }],
          },
          {
            element: <RequirePermission permission="payslip:read:self" />,
            children: [{ path: '/payslips', element: lazyRoute(<MyPayslipsPage />) }],
          },
          {
            element: <RequirePermission permission="employee:read:tenant" />,
            children: [
              { path: '/employees', element: lazyRoute(<EmployeesPage />) },
              { path: '/employees/:id', element: lazyRoute(<EmployeeDetailPage />) },
            ],
          },
          {
            element: <RequirePermission permission="user:read:tenant" />,
            children: [{ path: '/users', element: lazyRoute(<UsersPage />) }],
          },
          {
            element: <RequirePermission permission="org:manage" />,
            children: [
              { path: '/organization/branches', element: lazyRoute(<BranchesPage />) },
              { path: '/organization/teams', element: lazyRoute(<TeamsPage />) },
            ],
          },
          {
            element: <RequirePermission permission="finance:read" />,
            children: [
              { path: '/finance', element: lazyRoute(<FinanceDocumentsPage />) },
              { path: '/finance/reports/profit-loss', element: lazyRoute(<ProfitLossPage />) },
              { path: '/finance/:id', element: lazyRoute(<FinanceDocumentDetailPage />) },
            ],
          },
          {
            element: <RequirePermission permission="payroll:read:tenant" />,
            children: [
              { path: '/payroll', element: lazyRoute(<PayrollRunsPage />) },
              { path: '/payroll/runs/:id', element: lazyRoute(<PayrollRunDetailPage />) },
            ],
          },
          {
            element: <RequirePermission permission="recruitment:read" />,
            children: [
              { path: '/recruitment', element: lazyRoute(<JobPostingsPage />) },
              { path: '/recruitment/:id', element: lazyRoute(<JobPostingDetailPage />) },
            ],
          },
          {
            element: <RequirePermission permission="crm:read" />,
            children: [{ path: '/crm/leads', element: lazyRoute(<LeadsPage />) }],
          },
          {
            element: <RequirePermission permission="ticket:view:self" />,
            children: [
              { path: '/helpdesk', element: lazyRoute(<TicketsPage />) },
              { path: '/helpdesk/:id', element: lazyRoute(<TicketDetailPage />) },
            ],
          },
          {
            element: <RequirePermission permission="kb:read" />,
            children: [{ path: '/knowledge-base', element: lazyRoute(<KnowledgeBasePage />) }],
          },
          {
            element: <RequirePermission permission="document:view:self" />,
            children: [{ path: '/documents', element: lazyRoute(<DocumentsPage />) }],
          },
          {
            element: <RequirePermission permission="announcement:read" />,
            children: [{ path: '/announcements', element: lazyRoute(<AnnouncementsPage />) }],
          },
          {
            element: <RequirePermission permission="sop:read" />,
            children: [
              { path: '/sops', element: lazyRoute(<SopsPage />) },
              { path: '/sops/:id', element: lazyRoute(<SopDetailPage />) },
            ],
          },
          {
            element: <RequirePermission permission="template:manage" />,
            children: [{ path: '/templates', element: lazyRoute(<TemplatesPage />) }],
          },
          {
            element: <RequirePermission permission="audit:read" />,
            children: [{ path: '/audit-log', element: lazyRoute(<AuditLogPage />) }],
          },
          {
            element: <RequirePermission permission="session:manage" />,
            children: [{ path: '/sessions', element: lazyRoute(<SessionsPage />) }],
          },
          {
            element: <RequirePermission permission="tenant:update" />,
            children: [{ path: '/settings', element: lazyRoute(<TenantSettingsPage />) }],
          },

          // No permission concept exists for these — access is hardcoded to SUPER_ADMIN server-side
          // (cross-tenant company switching, and deciding every other role's permissions).
          {
            element: <RequireRole allow={['SUPER_ADMIN']} />,
            children: [
              { path: '/companies', element: lazyRoute(<CompaniesPage />) },
              { path: '/roles', element: lazyRoute(<RolesPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
