import { google, type gmail_v1 } from 'googleapis';
import { logger } from '../logger.js';
import { isProduction, env } from '../config/env.js';
import { prisma } from '../../db/prisma.js';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
  /** Present for an inline image referenced from the HTML body via `cid:<cid>` — absent for a regular attachment. */
  cid?: string;
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
        'No production EmailService is configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, ' +
          'GOOGLE_REDIRECT_URI, and GOOGLE_SENDER_EMAIL before deploying — refusing to silently drop this email.',
      );
    }
    logger.info({ to: message.to, subject: message.subject }, '📧 [DEV EMAIL]');
    const attachmentNote = message.attachments?.length ? `\n[${message.attachments.length} attachment(s): ${message.attachments.map((a) => a.filename).join(', ')}]` : '';
    // eslint-disable-next-line no-console
    console.log(`\n--- DEV EMAIL to ${message.to} ---\nSubject: ${message.subject}\n\n${message.text}${attachmentNote}\n---\n`);
  }
}

// --- RFC 2822 MIME message construction -------------------------------------------------------
// Gmail's API takes a fully-formed RFC 2822 message (base64url-encoded), not separate
// to/subject/body fields — there is no server-side templating on Google's end. Built by hand
// rather than pulled in as a dependency: the only external package this integration needs is
// `googleapis` itself.

const CRLF = '\r\n';

function randomBoundary(): string {
  return `b_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** RFC 2047-encodes a header value only if it contains non-ASCII characters — plain ASCII subjects (the common case) are left untouched for readability. */
function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf-8').toString('base64')}?=`;
}

function base64Chunks(buffer: Buffer): string {
  // RFC 2045 recommends wrapping encoded body lines at 76 characters.
  const b64 = buffer.toString('base64');
  return (b64.match(/.{1,76}/g) ?? []).join(CRLF);
}

function textPart(contentType: string, body: string): string {
  return [`Content-Type: ${contentType}; charset="UTF-8"`, 'Content-Transfer-Encoding: base64', '', base64Chunks(Buffer.from(body, 'utf-8'))].join(CRLF);
}

function attachmentPart(attachment: EmailAttachment): string {
  const contentType = attachment.contentType ?? 'application/octet-stream';
  const headers = [
    `Content-Type: ${contentType}; name="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    attachment.cid
      ? `Content-ID: <${attachment.cid}>`
      : undefined,
    attachment.cid
      ? `Content-Disposition: inline; filename="${attachment.filename}"`
      : `Content-Disposition: attachment; filename="${attachment.filename}"`,
  ].filter(Boolean);
  return [...headers, '', base64Chunks(attachment.content)].join(CRLF);
}

function wrapMultipart(type: 'alternative' | 'related' | 'mixed', boundary: string, parts: string[]): string {
  const body = parts.map((part) => `--${boundary}${CRLF}${part}`).join(CRLF) + `${CRLF}--${boundary}--`;
  return [`Content-Type: multipart/${type}; boundary="${boundary}"`, '', body].join(CRLF);
}

interface RawMessageInput {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

/** Builds a full RFC 2822 message and returns it base64url-encoded, ready for Gmail's `messages.send({ raw })`. */
function buildRawMimeMessage(message: RawMessageInput): string {
  const inlineImages = (message.attachments ?? []).filter((a) => a.cid);
  const regularAttachments = (message.attachments ?? []).filter((a) => !a.cid);

  let body: string;
  if (message.html) {
    const altBoundary = randomBoundary();
    body = wrapMultipart('alternative', altBoundary, [textPart('text/plain', message.text), textPart('text/html', message.html)]);
  } else {
    body = textPart('text/plain; format=flowed', message.text);
  }

  if (inlineImages.length > 0) {
    const relatedBoundary = randomBoundary();
    body = wrapMultipart('related', relatedBoundary, [body, ...inlineImages.map(attachmentPart)]);
  }

  if (regularAttachments.length > 0) {
    const mixedBoundary = randomBoundary();
    body = wrapMultipart('mixed', mixedBoundary, [body, ...regularAttachments.map(attachmentPart)]);
  }

  const headers = [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${encodeHeaderValue(message.subject)}`,
    'MIME-Version: 1.0',
  ].join(CRLF);

  const raw = `${headers}${CRLF}${body}`;
  return Buffer.from(raw, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Gmail API error classification ------------------------------------------------------------

interface GmailApiError {
  code?: number;
  response?: { status?: number };
  message?: string;
}

function gmailErrorStatus(err: unknown): number | undefined {
  const e = err as GmailApiError;
  return e?.response?.status ?? (typeof e?.code === 'number' ? e.code : undefined);
}

/** 429/5xx are worth an immediate in-process retry (rate limit, transient upstream issue). 4xx auth/permission/bad-request errors will not resolve by retrying the same request. */
function isTransientGmailError(err: unknown): boolean {
  const status = gmailErrorStatus(err);
  return status === 429 || (typeof status === 'number' && status >= 500);
}

/** A human-readable, secret-free description of a Gmail send failure — never includes the OAuth client secret, refresh token, or access token, none of which ever appear in the error object anyway since they're not part of the request payload. */
function describeGmailError(err: unknown): string {
  const status = gmailErrorStatus(err);
  const message = err instanceof Error ? err.message : String(err);
  if (status === 401) return `Gmail authentication failed (401) — the refresh token may be invalid, revoked, or expired. Re-authorize via Google OAuth and update GOOGLE_REFRESH_TOKEN. (${message})`;
  if (status === 403) return `Gmail API access denied (403) — check the OAuth scope grant and Gmail API quota. (${message})`;
  if (status === 429) return `Gmail API rate limit exceeded (429). (${message})`;
  if (typeof status === 'number' && status >= 500) return `Gmail API upstream error (${status}). (${message})`;
  return message;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRY_BACKOFF_MS = [500, 2000];

/**
 * Real delivery via the Gmail API using OAuth 2.0 (no SMTP, no App Password). The refresh token
 * is exchanged for a short-lived access token by googleapis' OAuth2Client automatically — it
 * handles the refresh transparently on every call, there is no manual token-refresh loop here.
 * Every attempt is logged to EmailLog. A delivery failure is caught here, not rethrown: the
 * calling business action (an invite, a leave approval, ...) must succeed regardless of whether
 * the notification email goes out on the first try — retryFailedEmails (jobs/scheduler.ts) picks
 * up FAILED rows later.
 */
export class GmailEmailService implements EmailService {
  private readonly gmail: gmail_v1.Gmail;
  private readonly from: string;

  constructor(gmailClient?: gmail_v1.Gmail) {
    this.from = env.GOOGLE_SENDER_EMAIL;
    if (gmailClient) {
      this.gmail = gmailClient;
      return;
    }
    const oauth2Client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async send(message: EmailMessage): Promise<void> {
    const template = message.template ?? 'generic';
    try {
      const raw = buildRawMimeMessage({ from: this.from, to: message.to, subject: message.subject, text: message.text, html: message.html, attachments: message.attachments });
      await this.sendRaw(raw);
      await this.writeLog(message, template, 'SENT', null);
    } catch (err) {
      const errorMessage = describeGmailError(err);
      logger.error({ to: message.to, template, error: errorMessage }, 'Email delivery failed — logged for retry');
      await this.writeLog(message, template, 'FAILED', errorMessage);
    }
  }

  private async sendRaw(raw: string, attempt = 1): Promise<void> {
    try {
      await this.gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    } catch (err) {
      if (attempt <= RETRY_BACKOFF_MS.length && isTransientGmailError(err)) {
        await sleep(RETRY_BACKOFF_MS[attempt - 1]);
        return this.sendRaw(raw, attempt + 1);
      }
      throw err;
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
      const raw = buildRawMimeMessage({ from: this.from, to: log.to, subject: log.subject, text: log.text, html: log.html ?? undefined });
      await this.sendRaw(raw);
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT', error: null, sentAt: new Date(), retryCount: { increment: 1 } },
      });
    } catch (err) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: describeGmailError(err), retryCount: { increment: 1 } },
      });
    }
  }
}

const googleFullyConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN && env.GOOGLE_REDIRECT_URI && env.GOOGLE_SENDER_EMAIL,
);

export const emailService: EmailService = googleFullyConfigured ? new GmailEmailService() : new ConsoleEmailService();

/** No-op when Gmail isn't configured (dev's ConsoleEmailService never writes EmailLog rows, so
 * there's nothing to retry) — safe for the scheduler to call unconditionally either way. */
export async function retryEmailLog(log: { id: string; to: string; subject: string; html: string | null; text: string; retryCount: number }): Promise<void> {
  if (emailService instanceof GmailEmailService) {
    await emailService.resend(log);
  }
}
