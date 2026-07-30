// This file is a route manifest, not a component module — the lazy() route constants below are
// never hot-reloaded as components, so the fast-refresh rule does not apply here.
/* eslint-disable react/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { ProtectedRoute } from '../shared/components/layout/ProtectedRoute';
import { AppShell } from '../shared/components/layout/AppShell';
import { PageLoadingSkeleton } from '../shared/components/feedback/LoadingSkeleton';

const SignupPage = lazy(() => import('../modules/auth/pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const TwoFactorPage = lazy(() => import('../modules/auth/pages/TwoFactorPage').then((m) => ({ default: m.TwoFactorPage })));
const ForgotPasswordPage = lazy(() => import('../modules/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../modules/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('../modules/auth/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AcceptInvitePage = lazy(() => import('../modules/users/pages/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })));
const UsersPage = lazy(() => import('../modules/users/pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const EmployeesPage = lazy(() => import('../modules/employees/pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const TenantSettingsPage = lazy(() => import('../modules/tenants/pages/TenantSettingsPage').then((m) => ({ default: m.TenantSettingsPage })));
const AuditLogPage = lazy(() => import('../modules/audit/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const AttendancePage = lazy(() => import('../modules/attendance/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const RegularizationsPage = lazy(() => import('../modules/attendance/pages/RegularizationsPage').then((m) => ({ default: m.RegularizationsPage })));
const LeavePage = lazy(() => import('../modules/leave/pages/LeavePage').then((m) => ({ default: m.LeavePage })));
const LeaveApprovalsPage = lazy(() => import('../modules/leave/pages/LeaveApprovalsPage').then((m) => ({ default: m.LeaveApprovalsPage })));
const ProjectsPage = lazy(() => import('../modules/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('../modules/projects/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const WorkReportsPage = lazy(() => import('../modules/workreports/pages/WorkReportsPage').then((m) => ({ default: m.WorkReportsPage })));
const WorkReportReviewPage = lazy(() => import('../modules/workreports/pages/WorkReportReviewPage').then((m) => ({ default: m.WorkReportReviewPage })));
const TimeTrackingPage = lazy(() => import('../modules/timetracking/pages/TimeTrackingPage').then((m) => ({ default: m.TimeTrackingPage })));
const PayrollRunsPage = lazy(() => import('../modules/payroll/pages/PayrollRunsPage').then((m) => ({ default: m.PayrollRunsPage })));
const PayrollRunDetailPage = lazy(() => import('../modules/payroll/pages/PayrollRunDetailPage').then((m) => ({ default: m.PayrollRunDetailPage })));
const MyPayslipsPage = lazy(() => import('../modules/payroll/pages/MyPayslipsPage').then((m) => ({ default: m.MyPayslipsPage })));
const JobPostingsPage = lazy(() => import('../modules/recruitment/pages/JobPostingsPage').then((m) => ({ default: m.JobPostingsPage })));
const JobPostingDetailPage = lazy(() => import('../modules/recruitment/pages/JobPostingDetailPage').then((m) => ({ default: m.JobPostingDetailPage })));
const LeadsPage = lazy(() => import('../modules/crm/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const ClientsPage = lazy(() => import('../modules/crm/pages/ClientsPage').then((m) => ({ default: m.ClientsPage })));
const ClientDetailPage = lazy(() => import('../modules/crm/pages/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })));
const FinanceDocumentsPage = lazy(() => import('../modules/finance/pages/FinanceDocumentsPage').then((m) => ({ default: m.FinanceDocumentsPage })));
const FinanceDocumentDetailPage = lazy(() => import('../modules/finance/pages/FinanceDocumentDetailPage').then((m) => ({ default: m.FinanceDocumentDetailPage })));
const TicketsPage = lazy(() => import('../modules/workplace/pages/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const TicketDetailPage = lazy(() => import('../modules/workplace/pages/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })));
const KnowledgeBasePage = lazy(() => import('../modules/workplace/pages/KnowledgeBasePage').then((m) => ({ default: m.KnowledgeBasePage })));
const DocumentsPage = lazy(() => import('../modules/workplace/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const AssetsPage = lazy(() => import('../modules/workplace/pages/AssetsPage').then((m) => ({ default: m.AssetsPage })));
const VisitorsPage = lazy(() => import('../modules/workplace/pages/VisitorsPage').then((m) => ({ default: m.VisitorsPage })));
const RoomBookingsPage = lazy(() => import('../modules/workplace/pages/RoomBookingsPage').then((m) => ({ default: m.RoomBookingsPage })));
const TemplatesPage = lazy(() => import('../modules/hrautomation/pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const AnnouncementsPage = lazy(() => import('../modules/hrautomation/pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })));

function lazyRoute(element: React.ReactNode) {
  return <Suspense fallback={<PageLoadingSkeleton />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: lazyRoute(<SignupPage />) },
  { path: '/two-factor', element: lazyRoute(<TwoFactorPage />) },
  { path: '/forgot-password', element: lazyRoute(<ForgotPasswordPage />) },
  { path: '/reset-password', element: lazyRoute(<ResetPasswordPage />) },
  { path: '/invite/accept', element: lazyRoute(<AcceptInvitePage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: lazyRoute(<DashboardPage />) },
          { path: '/attendance', element: lazyRoute(<AttendancePage />) },
          { path: '/attendance/regularizations', element: lazyRoute(<RegularizationsPage />) },
          { path: '/leave', element: lazyRoute(<LeavePage />) },
          { path: '/leave/approvals', element: lazyRoute(<LeaveApprovalsPage />) },
          { path: '/projects', element: lazyRoute(<ProjectsPage />) },
          { path: '/projects/:id', element: lazyRoute(<ProjectDetailPage />) },
          { path: '/work-reports', element: lazyRoute(<WorkReportsPage />) },
          { path: '/work-reports/review', element: lazyRoute(<WorkReportReviewPage />) },
          { path: '/time-tracking', element: lazyRoute(<TimeTrackingPage />) },
          { path: '/payroll', element: lazyRoute(<PayrollRunsPage />) },
          { path: '/payroll/runs/:id', element: lazyRoute(<PayrollRunDetailPage />) },
          { path: '/payslips', element: lazyRoute(<MyPayslipsPage />) },
          { path: '/recruitment', element: lazyRoute(<JobPostingsPage />) },
          { path: '/recruitment/:id', element: lazyRoute(<JobPostingDetailPage />) },
          { path: '/crm/leads', element: lazyRoute(<LeadsPage />) },
          { path: '/crm/clients', element: lazyRoute(<ClientsPage />) },
          { path: '/crm/clients/:id', element: lazyRoute(<ClientDetailPage />) },
          { path: '/finance', element: lazyRoute(<FinanceDocumentsPage />) },
          { path: '/finance/:id', element: lazyRoute(<FinanceDocumentDetailPage />) },
          { path: '/helpdesk', element: lazyRoute(<TicketsPage />) },
          { path: '/helpdesk/:id', element: lazyRoute(<TicketDetailPage />) },
          { path: '/knowledge-base', element: lazyRoute(<KnowledgeBasePage />) },
          { path: '/documents', element: lazyRoute(<DocumentsPage />) },
          { path: '/assets', element: lazyRoute(<AssetsPage />) },
          { path: '/visitors', element: lazyRoute(<VisitorsPage />) },
          { path: '/room-bookings', element: lazyRoute(<RoomBookingsPage />) },
          { path: '/templates', element: lazyRoute(<TemplatesPage />) },
          { path: '/announcements', element: lazyRoute(<AnnouncementsPage />) },
          { path: '/users', element: lazyRoute(<UsersPage />) },
          { path: '/employees', element: lazyRoute(<EmployeesPage />) },
          { path: '/settings', element: lazyRoute(<TenantSettingsPage />) },
          { path: '/audit-log', element: lazyRoute(<AuditLogPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
