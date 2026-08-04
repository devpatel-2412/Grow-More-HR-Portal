import { describe, it, expect, vi } from 'vitest';
import { TemplateService } from './template.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { emailService } from '../../shared/email/email.service.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
vi.mock('../../shared/email/email.service.js', () => ({ emailService: { send: vi.fn().mockResolvedValue(undefined) } }));

function makeTemplate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tpl-1',
    tenantId: 'tenant-1',
    type: 'LETTER_OFFER',
    bodyTemplate: 'Dear {{firstName}}, welcome to {{companyName}}.',
    layoutFields: null,
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockResolvedValue(makeTemplate()),
    findById: vi.fn().mockResolvedValue(makeTemplate()),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  };
  const documentRepository = {
    create: vi.fn().mockResolvedValue({ id: 'doc-1' }),
    findMany: vi.fn(),
    findById: vi.fn().mockResolvedValue({
      id: 'doc-1',
      tenantId: 'tenant-1',
      renderedContent: 'Dear Wanda, welcome to Acme Inc.',
      variablesJson: { companyName: 'Acme Inc' },
      createdAt: new Date('2026-01-01'),
      template: { type: 'LETTER_OFFER' },
      employee: { firstName: 'Wanda', lastName: 'Worker', employeeId: 'EMP-001', user: { email: 'wanda@acme.com' } },
    }),
  };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue({
      id: 'emp-1',
      tenantId: 'tenant-1',
      firstName: 'Wanda',
      lastName: 'Worker',
      employeeId: 'EMP-001',
      department: 'Engineering',
      designation: 'Engineer',
      dateOfJoining: new Date('2020-01-01'),
    }),
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-2' }),
  };
  const tenantRepository = { findById: vi.fn().mockResolvedValue({ id: 'tenant-1', name: 'Acme Inc' }) };
  return { repository, documentRepository, employeeRepository, tenantRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new TemplateService(deps.repository as never, deps.documentRepository as never, deps.employeeRepository as never, deps.tenantRepository as never);
}

describe('TemplateService.generate', () => {
  it('404s an employee from another tenant', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue({ id: 'emp-1', tenantId: 'other' });
    await expect(build(deps).generate('tenant-1', 'user-1', 'tpl-1', { employeeId: 'emp-1' }, {})).rejects.toThrow(
      NotFoundError,
    );
  });

  it('renders a letter body with the real employee and tenant data', async () => {
    const deps = makeDeps();
    await build(deps).generate('tenant-1', 'user-1', 'tpl-1', { employeeId: 'emp-1' }, {});

    const created = deps.documentRepository.create.mock.calls[0][0];
    expect(created.renderedContent).toBe('Dear Wanda, welcome to Acme Inc.');
    expect(created.variablesJson).toMatchObject({ firstName: 'Wanda', companyName: 'Acme Inc' });
  });

  it('renders poster layout fields as resolved text, not the raw variable key', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(
      makeTemplate({
        type: 'POSTER_WELCOME',
        bodyTemplate: null,
        layoutFields: [{ id: 'f1', variableKey: 'firstName', x: 10, y: 20 }],
      }),
    );

    await build(deps).generate('tenant-1', 'user-1', 'tpl-1', { employeeId: 'emp-1' }, {});

    const created = deps.documentRepository.create.mock.calls[0][0];
    const rendered = JSON.parse(created.renderedContent);
    expect(rendered).toEqual([{ id: 'f1', variableKey: 'firstName', x: 10, y: 20, text: 'Wanda' }]);
  });

  it('404s a template from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTemplate({ tenantId: 'other' }));
    await expect(build(deps).generate('tenant-1', 'user-1', 'tpl-1', { employeeId: 'emp-1' }, {})).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('TemplateService.getGeneratedDocumentPdf', () => {
  it('404s a document from another tenant', async () => {
    const deps = makeDeps();
    deps.documentRepository.findById.mockResolvedValue({
      id: 'doc-1',
      tenantId: 'other',
      template: { type: 'LETTER_OFFER' },
    });
    await expect(build(deps).getGeneratedDocumentPdf('tenant-1', 'doc-1')).rejects.toThrow(NotFoundError);
  });

  it('refuses to export a poster document as a PDF', async () => {
    const deps = makeDeps();
    deps.documentRepository.findById.mockResolvedValue({
      id: 'doc-1',
      tenantId: 'tenant-1',
      template: { type: 'POSTER_WELCOME' },
    });
    await expect(build(deps).getGeneratedDocumentPdf('tenant-1', 'doc-1')).rejects.toThrow(ConflictError);
  });

  it('renders a real PDF buffer for a letter document', async () => {
    const deps = makeDeps();
    const { buffer, filename } = await build(deps).getGeneratedDocumentPdf('tenant-1', 'doc-1');
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(filename).toBe('letter_offer-EMP-001.pdf');
  });
});

describe('TemplateService.getGeneratedDocumentDocx', () => {
  it('renders a real DOCX buffer (a zip archive, starting with the PK signature) for a letter document', async () => {
    const deps = makeDeps();
    const { buffer, filename } = await build(deps).getGeneratedDocumentDocx('tenant-1', 'doc-1');
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(filename).toBe('letter_offer-EMP-001.docx');
  });

  it('refuses to export a poster document as a DOCX', async () => {
    const deps = makeDeps();
    deps.documentRepository.findById.mockResolvedValue({
      id: 'doc-1',
      tenantId: 'tenant-1',
      template: { type: 'POSTER_WELCOME' },
    });
    await expect(build(deps).getGeneratedDocumentDocx('tenant-1', 'doc-1')).rejects.toThrow(ConflictError);
  });
});

describe('TemplateService.verifyDocument', () => {
  it('404s a document that does not exist', async () => {
    const deps = makeDeps();
    deps.documentRepository.findById.mockResolvedValue(null);
    await expect(build(deps).verifyDocument('doc-missing')).rejects.toThrow(NotFoundError);
  });

  it('returns only non-sensitive authenticity fields — no salary, no contact details', async () => {
    const deps = makeDeps();
    const result = await build(deps).verifyDocument('doc-1');
    expect(result).toEqual({
      valid: true,
      documentType: 'Offer Letter',
      employeeName: 'Wanda Worker',
      companyName: 'Acme Inc',
      issuedDate: '2026-01-01',
    });
  });

  it('works for poster documents too, unlike the letter-only PDF/DOCX/email paths', async () => {
    const deps = makeDeps();
    deps.documentRepository.findById.mockResolvedValue({
      id: 'doc-1',
      tenantId: 'tenant-1',
      createdAt: new Date('2026-01-01'),
      template: { type: 'POSTER_WELCOME' },
      employee: { firstName: 'Wanda', lastName: 'Worker' },
    });
    const result = await build(deps).verifyDocument('doc-1');
    expect(result.valid).toBe(true);
    expect(result.documentType).toBe('Letter'); // no title mapped for POSTER_* — falls back to the generic label
  });
});

describe('TemplateService.emailGeneratedDocument', () => {
  it('404s a document from another tenant', async () => {
    const deps = makeDeps();
    deps.documentRepository.findById.mockResolvedValue({
      id: 'doc-1',
      tenantId: 'other',
      template: { type: 'LETTER_OFFER' },
    });
    await expect(build(deps).emailGeneratedDocument('tenant-1', 'doc-1', {})).rejects.toThrow(NotFoundError);
  });

  it('refuses to email a poster document', async () => {
    const deps = makeDeps();
    deps.documentRepository.findById.mockResolvedValue({
      id: 'doc-1',
      tenantId: 'tenant-1',
      template: { type: 'POSTER_WELCOME' },
    });
    await expect(build(deps).emailGeneratedDocument('tenant-1', 'doc-1', {})).rejects.toThrow(ConflictError);
  });

  it("sends the letter's PDF to the employee's registered email", async () => {
    const deps = makeDeps();
    const result = await build(deps).emailGeneratedDocument('tenant-1', 'doc-1', {});

    expect(emailService.send).toHaveBeenCalledOnce();
    const [message] = vi.mocked(emailService.send).mock.calls[0];
    expect(message.to).toBe('wanda@acme.com');
    expect(message.subject).toBe('Your Offer Letter');
    expect(message.text).toBe('Dear Wanda, welcome to Acme Inc.');
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments![0].filename).toBe('letter_offer-EMP-001.pdf');
    expect(message.attachments![0].content.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(result).toEqual({ to: 'wanda@acme.com' });
  });
});
