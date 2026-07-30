import { logger } from '../logger.js';
import { isProduction } from '../config/env.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
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
class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    if (isProduction) {
      throw new Error(
        'No production EmailService is configured. Wire a real provider (SendGrid/SES/etc) before deploying — refusing to silently drop this email.',
      );
    }
    logger.info({ to: message.to, subject: message.subject }, '📧 [DEV EMAIL]');
    // eslint-disable-next-line no-console
    console.log(`\n--- DEV EMAIL to ${message.to} ---\nSubject: ${message.subject}\n\n${message.text}\n---\n`);
  }
}

export const emailService: EmailService = new ConsoleEmailService();
