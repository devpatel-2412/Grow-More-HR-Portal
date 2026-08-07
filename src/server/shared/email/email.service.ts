import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../logger.js';
import { isProduction, env } from '../config/env.js';
import { prisma } from '../../db/prisma.js';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body — every real template provides one; plain-text-only callers (rare) omit it. */
  html?: string;
  attachments?: EmailAttachment[];
  /** Short identifier for EmailLog, e.g. 'invite', 'password_reset', 'leave_approved'. Defaults to 'generic'. */
  template?: string;
  /** For EmailLog attribution — omit for recipients with no tenant-scoped account (e.g. a recruitment candidate). */
  tenantId?: string | null;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Dev-only implementation: logs the email instead of sending it. This is intentionally not a
 * silent no-op — it prints the content so local flows (invites, password resets) are testable
 * end-to-end, and it throws in production so an unconfigured mail provider fails loudly
 * instead of silently dropping security-critical emails. Never writes EmailLog — it isn't a real
 * delivery mechanism, so there's nothing meaningful to log for retry.
 */
export class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    if (isProduction) {
      throw new Error(
        'No production EmailService is configured. Set SMTP_HOST (and friends) before deploying — refusing to silently drop this email.',
      );
    }
    logger.info({ to: message.to, subject: message.subject }, '📧 [DEV EMAIL]');
    const attachmentNote = message.attachments?.length ? `\n[${message.attachments.length} attachment(s): ${message.attachments.map((a) => a.filename).join(', ')}]` : '';
    // eslint-disable-next-line no-console
    console.log(`\n--- DEV EMAIL to ${message.to} ---\nSubject: ${message.subject}\n\n${message.text}${attachmentNote}\n---\n`);
  }
}

/**
 * Real delivery via any standard SMTP provider (Gmail, Microsoft 365, SendGrid, Mailgun, SES,
 * Resend, Brevo, or a corporate relay — they all speak SMTP). Every attempt is logged to
 * EmailLog. A delivery failure is caught here, not rethrown: the calling business action (an
 * invite, a leave approval, ...) must succeed regardless of whether the notification email goes
 * out on the first try — retryFailedEmails (jobs/scheduler.ts) picks up FAILED rows later.
 */
export class SmtpEmailService implements EmailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(transporter?: Transporter) {
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      });
    this.from = env.SMTP_FROM || env.SMTP_USER;
  }

  async send(message: EmailMessage): Promise<void> {
    const template = message.template ?? 'generic';
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      });
      await this.writeLog(message, template, 'SENT', null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ err, to: message.to, template }, 'Email delivery failed — logged for retry');
      await this.writeLog(message, template, 'FAILED', errorMessage);
    }
  }

  private async writeLog(message: EmailMessage, template: string, status: 'SENT' | 'FAILED', error: string | null): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          tenantId: message.tenantId ?? undefined,
          to: message.to,
          subject: message.subject,
          template,
          html: message.html,
          text: message.text,
          status,
          error,
          sentAt: status === 'SENT' ? new Date() : null,
        },
      });
    } catch (logErr) {
      // The log write is best-effort observability, not a system of record for delivery itself —
      // never let a logging failure mask (or throw over) the real send outcome above.
      logger.error({ err: logErr }, 'Failed to write EmailLog entry');
    }
  }

  /**
   * Re-attempts a previously FAILED EmailLog row in place — unlike send(), this updates the
   * existing row's status/retryCount rather than appending a new one, so a capped retryCount
   * genuinely caps retries instead of resetting to 0 on every new log row.
   */
  async resend(log: { id: string; to: string; subject: string; html: string | null; text: string; retryCount: number }): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to: log.to, subject: log.subject, text: log.text, html: log.html ?? undefined });
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT', error: null, sentAt: new Date(), retryCount: { increment: 1 } },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: errorMessage, retryCount: { increment: 1 } },
      });
    }
  }
}

export const emailService: EmailService = env.SMTP_HOST ? new SmtpEmailService() : new ConsoleEmailService();

/** No-op when SMTP isn't configured (dev's ConsoleEmailService never writes EmailLog rows, so
 * there's nothing to retry) — safe for the scheduler to call unconditionally either way. */
export async function retryEmailLog(log: { id: string; to: string; subject: string; html: string | null; text: string; retryCount: number }): Promise<void> {
  if (emailService instanceof SmtpEmailService) {
    await emailService.resend(log);
  }
}
