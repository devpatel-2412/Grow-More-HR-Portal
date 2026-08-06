import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { corsOrigins, env } from './shared/config/env.js';
import { localStorageRouter } from './shared/storage/local-storage.routes.js';
import { requestLogger } from './shared/middleware/request-logger.middleware.js';
import { globalApiLimiter } from './shared/middleware/rate-limit.middleware.js';
import { notFoundHandler, errorHandler } from './shared/middleware/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { employeeRouter } from './modules/employees/employee.routes.js';
import { tenantRouter } from './modules/tenants/tenant.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { leaveRouter } from './modules/leave/leave.routes.js';
import { projectRouter, milestoneRouter } from './modules/projects/project.routes.js';
import { taskRouter } from './modules/tasks/task.routes.js';
import { workReportRouter } from './modules/workreports/workreport.routes.js';
import { timeLogRouter } from './modules/timetracking/timelog.routes.js';
import { payrollRouter } from './modules/payroll/payroll.routes.js';
import { jobPostingRouter, candidateRouter, interviewRouter } from './modules/recruitment/recruitment.routes.js';
import { leadRouter, clientRouter, crmContactRouter, crmActivityRouter } from './modules/crm/crm.routes.js';
import { financeRouter } from './modules/finance/finance.routes.js';
import { ticketRouter } from './modules/workplace/ticket.routes.js';
import { kbRouter } from './modules/workplace/kb.routes.js';
import { documentRouter } from './modules/workplace/document.routes.js';
import { assetRouter } from './modules/workplace/asset.routes.js';
import { visitorRouter } from './modules/workplace/visitor.routes.js';
import { roomBookingRouter } from './modules/workplace/roombooking.routes.js';
import { templateRouter } from './modules/hrautomation/template.routes.js';
import { verifyRouter } from './modules/hrautomation/verify.routes.js';
import { announcementRouter } from './modules/hrautomation/announcement.routes.js';
import { branchRouter } from './modules/organization/branch.routes.js';
import { teamRouter } from './modules/organization/team.routes.js';
import { checklistItemRouter } from './modules/lifecycle/checklist.routes.js';
import { vendorRouter } from './modules/inventory/vendor.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { sopRouter } from './modules/sop/sop.routes.js';
import { clientPortalRouter } from './modules/client-portal/client-portal.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { sessionRouter } from './modules/sessions/session.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(requestOrigin, callback) {
        // No Origin header (curl, same-machine health checks, server-to-server) — allow.
        // An unrecognized origin is NOT an error: CORS is a browser-enforced policy, so the
        // right server response is to simply omit the Allow-Origin header (the browser blocks
        // the read on its own if it's genuinely cross-origin). Hard-failing the request here
        // would break legitimate same-origin traffic whose Origin header text doesn't happen
        // to match this allow-list exactly.
        callback(null, !requestOrigin || corsOrigins.includes(requestOrigin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use('/api', globalApiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/employees', employeeRouter);
  app.use('/api/v1/tenants', tenantRouter);
  app.use('/api/v1/audit-logs', auditRouter);
  app.use('/api/v1/sessions', sessionRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/leave', leaveRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/milestones', milestoneRouter);
  app.use('/api/v1/tasks', taskRouter);
  app.use('/api/v1/work-reports', workReportRouter);
  app.use('/api/v1/time-logs', timeLogRouter);
  app.use('/api/v1/payroll', payrollRouter);
  app.use('/api/v1/job-postings', jobPostingRouter);
  app.use('/api/v1/candidates', candidateRouter);
  app.use('/api/v1/interviews', interviewRouter);
  app.use('/api/v1/leads', leadRouter);
  app.use('/api/v1/clients', clientRouter);
  app.use('/api/v1/client-contacts', crmContactRouter);
  app.use('/api/v1/crm-activities', crmActivityRouter);
  app.use('/api/v1/finance', financeRouter);
  app.use('/api/v1/tickets', ticketRouter);
  app.use('/api/v1/kb-articles', kbRouter);
  app.use('/api/v1/documents', documentRouter);
  app.use('/api/v1/assets', assetRouter);
  app.use('/api/v1/visitors', visitorRouter);
  app.use('/api/v1/room-bookings', roomBookingRouter);
  app.use('/api/v1/templates', templateRouter);
  app.use('/api/v1/verify', verifyRouter);
  app.use('/api/v1/announcements', announcementRouter);
  app.use('/api/v1/branches', branchRouter);
  app.use('/api/v1/teams', teamRouter);
  app.use('/api/v1/checklist-items', checklistItemRouter);
  app.use('/api/v1/vendors', vendorRouter);
  app.use('/api/v1/inventory-items', inventoryRouter);
  app.use('/api/v1/sops', sopRouter);
  app.use('/api/v1/client-portal', clientPortalRouter);

  // Only mounted when Supabase Storage isn't configured — this is the local-disk fallback's own
  // download route, so it has no reason to exist (and every reason not to) once a real provider
  // is in play. See storage.service.ts for the same condition deciding which adapter loads.
  if (!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) {
    app.use('/api/v1/local-storage', localStorageRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
