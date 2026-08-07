import type { Request, Response } from 'express';
import type { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { emailService } from '../../shared/email/email.service.js';
import {
  inviteEmailTemplate,
  passwordResetEmailTemplate,
  welcomeEmailTemplate,
  interviewScheduledEmailTemplate,
  notificationEmailTemplate,
  type RenderedEmail,
} from '../../shared/email/email.templates.js';
import { env } from '../../shared/config/env.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { emailTemplateTypeSchema, sendTestEmailSchema, listEmailLogsQuerySchema } from './email-admin.validators.js';

type TemplateType = z.infer<typeof emailTemplateTypeSchema>['type'];

/** Sample data for previewing/test-sending each template without needing a real invite/candidate/etc. record. */
function renderSample(type: TemplateType): RenderedEmail {
  switch (type) {
    case 'invite':
      return inviteEmailTemplate({ tenantName: 'Acme Inc', role: 'EMPLOYEE', inviteLink: `${env.APP_URL}/invite/accept?token=sample`, expiresInDays: 7 });
    case 'password_reset':
      return passwordResetEmailTemplate({ resetLink: `${env.APP_URL}/reset-password?token=sample`, validForMinutes: 60 });
    case 'welcome':
      return welcomeEmailTemplate({ firstName: 'Ada', tenantName: 'Acme Inc', loginLink: `${env.APP_URL}/login` });
    case 'interview_scheduled':
      return interviewScheduledEmailTemplate({
        candidateName: 'Sam Candidate',
        jobTitle: 'Software Engineer',
        tenantName: 'Acme Inc',
        scheduledAt: new Date(Date.now() + 3 * 86_400_000),
        mode: 'VIDEO',
      });
    case 'notification':
      return notificationEmailTemplate({ title: 'Sample notification', body: 'This is what a notification email looks like.', link: '/dashboard', appUrl: env.APP_URL });
  }
}

export async function previewEmailTemplate(req: Request, res: Response): Promise<void> {
  const { type } = req.params as unknown as z.infer<typeof emailTemplateTypeSchema>;
  const rendered = renderSample(type);
  sendOk(res, rendered);
}

export async function sendTestEmail(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof sendTestEmailSchema>;
  const { subject, html, text } = renderSample(body.type);
  await emailService.send({ to: body.to, subject: `[Test] ${subject}`, html, text, template: `test_${body.type}`, tenantId: req.user!.tenantId });
  sendCreated(res, { to: body.to, type: body.type });
}

export async function listEmailLogs(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listEmailLogsQuerySchema>;
  const where = { tenantId: req.user!.tenantId, status: query.status };
  const [rows, total] = await Promise.all([
    prisma.emailLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.emailLog.count({ where }),
  ]);
  sendPaginated(res, rows, buildPaginationMeta(query.page, query.limit, total));
}
