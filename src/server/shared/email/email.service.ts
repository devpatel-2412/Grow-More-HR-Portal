import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../logger.js';
import { isProduction, env } from '../config/env.js';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Dev-only implementation: logs the email instead of sending it. This is intentionally not a
 * silent no-op — it prints the content so local flows (invites, password resets) are testable
 * end-to-end, and it throws in production so an unconfigured mail provider fails loudly
 * instead of silently dropping security-critical emails.
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

/** Real delivery via any standard SMTP provider (SES, SendGrid, Postmark, a corporate relay, etc. all speak SMTP). */
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
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      attachments: message.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    });
  }
}

export const emailService: EmailService = env.SMTP_HOST ? new SmtpEmailService() : new ConsoleEmailService();
