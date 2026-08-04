import { describe, it, expect, vi } from 'vitest';
import { ConsoleEmailService, SmtpEmailService } from './email.service.js';

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
      attachments: [{ filename: 'offer.pdf', content: Buffer.from('x'), contentType: 'application/pdf' }],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'worker@acme.com',
        subject: 'Your letter',
        text: 'See attached',
        attachments: [{ filename: 'offer.pdf', content: Buffer.from('x'), contentType: 'application/pdf' }],
      }),
    );
  });

  it('propagates a transporter failure rather than swallowing it', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP connection refused'));
    const service = new SmtpEmailService({ sendMail } as never);

    await expect(service.send({ to: 'worker@acme.com', subject: 'x', text: 'x' })).rejects.toThrow('SMTP connection refused');
  });
});
