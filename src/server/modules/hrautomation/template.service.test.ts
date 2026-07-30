import { describe, it, expect, vi } from 'vitest';
import { TemplateService } from './template.service.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

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
  const documentRepository = { create: vi.fn().mockResolvedValue({ id: 'doc-1' }), findMany: vi.fn() };
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
