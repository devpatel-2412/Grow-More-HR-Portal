import { describe, it, expect, vi } from 'vitest';
import { ConsoleEmailService, SmtpEmailService } from './email.service.js';

const { emailLogCreate } = vi.hoisted(() => ({ emailLogCreate: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../db/prisma.js', () => ({ prisma: { emailLog: { create: emailLogCreate } } }));

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

describe('SmtpEmailService', () => {
  it('forwards the message to the transporter, mapping attachments and using the configured from address', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new SmtpEmailService({ sendMail } as never);

    await service.send({
      to: 'worker@acme.com',
      subject: 'Your letter',
      text: 'See attached',
      html: '<p>See attached</p>',
      attachments: [{ filename: 'offer.pdf', content: Buffer.from('x'), contentType: 'application/pdf' }],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'worker@acme.com',
        subject: 'Your letter',
        text: 'See attached',
        html: '<p>See attached</p>',
        attachments: [{ filename: 'offer.pdf', content: Buffer.from('x'), contentType: 'application/pdf' }],
      }),
    );
  });

  it('logs a SENT EmailLog row on success', async () => {
    emailLogCreate.mockClear();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new SmtpEmailService({ sendMail } as never);

    await service.send({ to: 'worker@acme.com', subject: 'x', text: 'x', template: 'invite', tenantId: 'tenant-1' });

    expect(emailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', template: 'invite', tenantId: 'tenant-1' }) }),
    );
  });

  it('never throws on a transporter failure — logs FAILED instead, so the calling business action always succeeds', async () => {
    emailLogCreate.mockClear();
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP connection refused'));
    const service = new SmtpEmailService({ sendMail } as never);

    await expect(service.send({ to: 'worker@acme.com', subject: 'x', text: 'x' })).resolves.toBeUndefined();
    expect(emailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', error: 'SMTP connection refused' }) }),
    );
  });

  it('still resolves even if writing the EmailLog itself fails — logging is best-effort, not load-bearing', async () => {
    emailLogCreate.mockClear();
    emailLogCreate.mockRejectedValueOnce(new Error('db unavailable'));
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new SmtpEmailService({ sendMail } as never);

    await expect(service.send({ to: 'worker@acme.com', subject: 'x', text: 'x' })).resolves.toBeUndefined();
  });
});
