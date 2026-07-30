import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './shared/config/env.js';
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
import { announcementRouter } from './modules/hrautomation/announcement.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
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
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/employees', employeeRouter);
  app.use('/api/v1/tenants', tenantRouter);
  app.use('/api/v1/audit-logs', auditRouter);
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
  app.use('/api/v1/announcements', announcementRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
