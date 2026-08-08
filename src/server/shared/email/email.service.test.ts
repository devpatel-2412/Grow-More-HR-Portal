import { describe, it, expect, vi } from 'vitest';
import { ConsoleEmailService, GmailEmailService } from './email.service.js';

const { emailLogCreate, emailLogUpdate } = vi.hoisted(() => ({
  emailLogCreate: vi.fn().mockResolvedValue(undefined),
  emailLogUpdate: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../db/prisma.js', () => ({ prisma: { emailLog: { create: emailLogCreate, update: emailLogUpdate } } }));

function makeGmailClient(sendImpl: (...args: unknown[]) => unknown) {
  return { users: { messages: { send: vi.fn(sendImpl) } } };
}

function decodeRaw(raw: string): string {
  return Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

describe('ConsoleEmailService', () => {
  it('logs the message instead of sending it, and resolves without throwing outside production', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const service = new ConsoleEmailService();

    await expect(
      service.send({ to: 'worker@acme.com', subject: 'Hello', text: 'Body text' }),
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('worker@acme.com'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Body text'));
    logSpy.mockRestore();
  });

  it('notes attachment filenames without printing their binary content', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const service = new ConsoleEmailService();

    await service.send({
      to: 'worker@acme.com',
      subject: 'Your letter',
      text: 'See attached',
      attachments: [{ filename: 'offer.pdf', content: Buffer.from('fake pdf bytes') }],
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('offer.pdf'));
    logSpy.mockRestore();
  });
});

describe('GmailEmailService', () => {
  it('sends a base64url-encoded RFC 2822 message containing the to/subject/text/html', async () => {
    const gmailClient = makeGmailClient(() => Promise.resolve({}));
    const service = new GmailEmailService(gmailClient as never);

    await service.send({ to: 'worker@acme.com', subject: 'Your letter', text: 'See attached', html: '<p>See attached</p>' });

    expect(gmailClient.users.messages.send).toHaveBeenCalledOnce();
    const { raw } = gmailClient.users.messages.send.mock.calls[0][0].requestBody;
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('To: worker@acme.com');
    expect(decoded).toContain('Subject: Your letter');
    expect(decoded).toContain('multipart/alternative');
  });

  it('includes attachments as base64 MIME parts, distinguishing inline (cid) from regular attachments', async () => {
    const gmailClient = makeGmailClient(() => Promise.resolve({}));
    const service = new GmailEmailService(gmailClient as never);

    await service.send({
      to: 'worker@acme.com',
      subject: 'Your letter',
      text: 'See attached',
      html: '<p>See attached</p>',
      attachments: [
        { filename: 'offer.pdf', content: Buffer.from('pdf-bytes'), contentType: 'application/pdf' },
        { filename: 'logo.png', content: Buffer.from('png-bytes'), contentType: 'image/png', cid: 'logo123' },
      ],
    });

    const { raw } = gmailClient.users.messages.send.mock.calls[0][0].requestBody;
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('multipart/mixed');
    expect(decoded).toContain('multipart/related');
    expect(decoded).toContain('filename="offer.pdf"');
    expect(decoded).toContain('Content-Disposition: attachment; filename="offer.pdf"');
    expect(decoded).toContain('Content-ID: <logo123>');
    expect(decoded).toContain('Content-Disposition: inline; filename="logo.png"');
  });

  it('logs a SENT EmailLog row on success', async () => {
    emailLogCreate.mockClear();
    const gmailClient = makeGmailClient(() => Promise.resolve({}));
    const service = new GmailEmailService(gmailClient as never);

    await service.send({ to: 'worker@acme.com', subject: 'x', text: 'x', template: 'invite', tenantId: 'tenant-1' });

    expect(emailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', template: 'invite', tenantId: 'tenant-1' }) }),
    );
  });

  it('never throws on a Gmail API failure — logs FAILED instead, so the calling business action always succeeds', async () => {
    emailLogCreate.mockClear();
    const gmailClient = makeGmailClient(() => Promise.reject(Object.assign(new Error('invalid_grant'), { response: { status: 401 } })));
    const service = new GmailEmailService(gmailClient as never);

    await expect(service.send({ to: 'worker@acme.com', subject: 'x', text: 'x' })).resolves.toBeUndefined();
    expect(emailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', error: expect.stringContaining('401') }) }),
    );
  });

  it('still resolves even if writing the EmailLog itself fails — logging is best-effort, not load-bearing', async () => {
    emailLogCreate.mockClear();
    emailLogCreate.mockRejectedValueOnce(new Error('db unavailable'));
    const gmailClient = makeGmailClient(() => Promise.resolve({}));
    const service = new GmailEmailService(gmailClient as never);

    await expect(service.send({ to: 'worker@acme.com', subject: 'x', text: 'x' })).resolves.toBeUndefined();
  });

  it('retries once on a transient (429/5xx) Gmail error and succeeds if the retry works', async () => {
    emailLogCreate.mockClear();
    let calls = 0;
    const gmailClient = makeGmailClient(() => {
      calls++;
      if (calls === 1) return Promise.reject(Object.assign(new Error('rate limited'), { response: { status: 429 } }));
      return Promise.resolve({});
    });
    const service = new GmailEmailService(gmailClient as never);

    await service.send({ to: 'worker@acme.com', subject: 'x', text: 'x' });

    expect(gmailClient.users.messages.send).toHaveBeenCalledTimes(2);
    expect(emailLogCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SENT' }) }));
  });

  it('does not retry a non-transient (401/403) Gmail error', async () => {
    const gmailClient = makeGmailClient(() => Promise.reject(Object.assign(new Error('forbidden'), { response: { status: 403 } })));
    const service = new GmailEmailService(gmailClient as never);

    await service.send({ to: 'worker@acme.com', subject: 'x', text: 'x' });

    expect(gmailClient.users.messages.send).toHaveBeenCalledOnce();
  });

  describe('resend', () => {
    it('updates the existing EmailLog row to SENT on success', async () => {
      emailLogUpdate.mockClear();
      const gmailClient = makeGmailClient(() => Promise.resolve({}));
      const service = new GmailEmailService(gmailClient as never);

      await service.resend({ id: 'log-1', to: 'worker@acme.com', subject: 'x', html: null, text: 'x', retryCount: 1 });

      expect(emailLogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'log-1' }, data: expect.objectContaining({ status: 'SENT' }) }),
      );
    });

    it('updates the existing EmailLog row to FAILED (with incremented retryCount) on failure', async () => {
      emailLogUpdate.mockClear();
      const gmailClient = makeGmailClient(() => Promise.reject(new Error('still down')));
      const service = new GmailEmailService(gmailClient as never);

      await service.resend({ id: 'log-1', to: 'worker@acme.com', subject: 'x', html: null, text: 'x', retryCount: 1 });

      expect(emailLogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'log-1' }, data: expect.objectContaining({ status: 'FAILED', retryCount: { increment: 1 } }) }),
      );
    });
  });
});
