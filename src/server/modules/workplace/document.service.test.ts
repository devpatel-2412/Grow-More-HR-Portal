import { describe, it, expect, vi } from 'vitest';
import { DocumentService } from './document.service.js';
import { NotFoundError, ConflictError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeDocument(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'doc-1',
    tenantId: 'tenant-1',
    name: 'Employment contract',
    folderPath: '/',
    fileUrl: 'https://files.example.com/v1.pdf',
    version: 1,
    archived: false,
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockResolvedValue(makeDocument()),
    findById: vi.fn().mockResolvedValue(makeDocument()),
    delete: vi.fn(),
    archive: vi.fn().mockResolvedValue(makeDocument({ archived: true })),
    restore: vi.fn().mockResolvedValue(makeDocument({ archived: false })),
    replaceFile: vi.fn().mockResolvedValue(makeDocument({ version: 2, fileUrl: 'https://files.example.com/v2.pdf' })),
    findVersions: vi.fn().mockResolvedValue([]),
    findMany: vi.fn(),
  };
  const employeeRepository = { findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }) };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new DocumentService(deps.repository as never, deps.employeeRepository as never);
}

describe('DocumentService.upload', () => {
  it('creates the document via the uploader\'s employee profile', async () => {
    const deps = makeDeps();
    await build(deps).upload('tenant-1', 'user-1', { name: 'Contract', folderPath: '/', fileUrl: 'https://x/y.pdf', isDigitallySigned: false }, {});
    expect(deps.repository.create).toHaveBeenCalledWith('tenant-1', 'https://x/y.pdf', 'emp-1', expect.objectContaining({ name: 'Contract' }));
  });
});

describe('DocumentService.archive / restore', () => {
  it('404s a document from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ tenantId: 'other' }));
    await expect(build(deps).archive('tenant-1', 'doc-1', {})).rejects.toThrow(NotFoundError);
  });

  it('refuses to archive an already-archived document', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ archived: true }));
    await expect(build(deps).archive('tenant-1', 'doc-1', {})).rejects.toThrow(ConflictError);
  });

  it('archives an active document', async () => {
    const deps = makeDeps();
    const result = await build(deps).archive('tenant-1', 'doc-1', {});
    expect(deps.repository.archive).toHaveBeenCalledWith('doc-1');
    expect(result.archived).toBe(true);
  });

  it('refuses to restore a document that is not archived', async () => {
    const deps = makeDeps();
    await expect(build(deps).restore('tenant-1', 'doc-1', {})).rejects.toThrow(ConflictError);
  });

  it('restores an archived document', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ archived: true }));
    const result = await build(deps).restore('tenant-1', 'doc-1', {});
    expect(deps.repository.restore).toHaveBeenCalledWith('doc-1');
    expect(result.archived).toBe(false);
  });
});

describe('DocumentService.replaceFile', () => {
  it('404s a document from another tenant before touching the file', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ tenantId: 'other' }));
    await expect(build(deps).replaceFile('tenant-1', 'user-1', 'doc-1', { fileUrl: 'https://x/v2.pdf' }, {})).rejects.toThrow(
      NotFoundError,
    );
    expect(deps.repository.replaceFile).not.toHaveBeenCalled();
  });

  it('bumps the version and records who uploaded it', async () => {
    const deps = makeDeps();
    const result = await build(deps).replaceFile('tenant-1', 'user-1', 'doc-1', { fileUrl: 'https://x/v2.pdf' }, {});
    expect(deps.repository.replaceFile).toHaveBeenCalledWith('doc-1', 'https://x/v2.pdf', 'tenant-1', 'emp-1');
    expect(result.version).toBe(2);
  });
});

describe('DocumentService.listVersions', () => {
  it('404s before listing versions of a document from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ tenantId: 'other' }));
    await expect(build(deps).listVersions('tenant-1', 'doc-1')).rejects.toThrow(NotFoundError);
  });
});
