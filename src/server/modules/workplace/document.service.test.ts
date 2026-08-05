import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from './document.service.js';
import { NotFoundError, ConflictError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
vi.mock('../../shared/storage/storage.service.js', () => ({
  storageService: {
    upload: vi.fn().mockResolvedValue({ storageKey: 'tenant-1/general/uuid-file.pdf', fileSize: 1234 }),
    getSignedDownloadUrl: vi.fn().mockResolvedValue('https://signed.example.com/tenant-1/general/uuid-file.pdf'),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

import { storageService } from '../../shared/storage/storage.service.js';

function makeDocument(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'doc-1',
    tenantId: 'tenant-1',
    name: 'Employment contract',
    category: null,
    folderPath: '/',
    fileUrl: null,
    storageKey: 'tenant-1/general/uuid-v1.pdf',
    version: 1,
    archived: false,
    ...overrides,
  };
}

function makeFile(overrides: Partial<Record<string, unknown>> = {}) {
  return { buffer: Buffer.from('file content'), mimeType: 'application/pdf', fileName: 'contract.pdf', ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockResolvedValue(makeDocument()),
    findById: vi.fn().mockResolvedValue(makeDocument()),
    delete: vi.fn(),
    archive: vi.fn().mockResolvedValue(makeDocument({ archived: true })),
    restore: vi.fn().mockResolvedValue(makeDocument({ archived: false })),
    replaceFile: vi.fn().mockResolvedValue(makeDocument({ version: 2, storageKey: 'tenant-1/general/uuid-v2.pdf' })),
    findVersions: vi.fn().mockResolvedValue([]),
    findVersionById: vi.fn(),
    findAllStorageKeys: vi.fn().mockResolvedValue(['tenant-1/general/uuid-v1.pdf']),
    findMany: vi.fn(),
  };
  const employeeRepository = { findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }) };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new DocumentService(deps.repository as never, deps.employeeRepository as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DocumentService.upload', () => {
  it('uploads each file to storage and creates one document per file, all under the uploader\'s employee profile', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1' });
    const files = [makeFile({ fileName: 'a.pdf' }), makeFile({ fileName: 'b.pdf' })];
    const documents = await build(deps).upload('tenant-1', 'user-1', files, { folderPath: '/', isDigitallySigned: false }, {});

    expect(storageService.upload).toHaveBeenCalledTimes(2);
    expect(deps.repository.create).toHaveBeenCalledTimes(2);
    expect(deps.repository.create).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ storageKey: expect.any(String), fileSize: expect.any(Number) }),
      'emp-1',
      expect.objectContaining({ name: 'a.pdf' }),
    );
    expect(documents).toHaveLength(2);
  });

  it('still creates a document when the uploader has no employee profile (e.g. an admin without one)', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findByUserId.mockResolvedValue(null);
    await build(deps).upload('tenant-1', 'user-1', [makeFile()], { folderPath: '/', isDigitallySigned: false }, {});
    expect(deps.repository.create).toHaveBeenCalledWith('tenant-1', expect.anything(), undefined, expect.objectContaining({ uploadedBy: undefined }));
  });
});

describe('DocumentService.getDownloadUrl', () => {
  it('mints a fresh signed URL for a real upload (storageKey set)', async () => {
    const deps = makeDeps();
    const result = await build(deps).getDownloadUrl('tenant-1', 'doc-1', {});
    expect(storageService.getSignedDownloadUrl).toHaveBeenCalledWith('tenant-1/general/uuid-v1.pdf');
    expect(result.url).toBe('https://signed.example.com/tenant-1/general/uuid-file.pdf');
  });

  it('falls back to the raw external link for a legacy pasted-URL document', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ storageKey: null, fileUrl: 'https://external.example.com/policy.pdf' }));
    const result = await build(deps).getDownloadUrl('tenant-1', 'doc-1', {});
    expect(storageService.getSignedDownloadUrl).not.toHaveBeenCalled();
    expect(result.url).toBe('https://external.example.com/policy.pdf');
  });

  it('404s a document from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ tenantId: 'other' }));
    await expect(build(deps).getDownloadUrl('tenant-1', 'doc-1', {})).rejects.toThrow(NotFoundError);
  });
});

describe('DocumentService.delete', () => {
  it('deletes the DB row first, then best-effort cleans up every storage object across all versions', async () => {
    const deps = makeDeps();
    deps.repository.findAllStorageKeys.mockResolvedValue(['tenant-1/general/uuid-v1.pdf', 'tenant-1/general/uuid-v2.pdf']);
    await build(deps).delete('tenant-1', 'doc-1', {});

    expect(deps.repository.delete).toHaveBeenCalledWith('doc-1');
    expect(storageService.delete).toHaveBeenCalledWith('tenant-1/general/uuid-v1.pdf');
    expect(storageService.delete).toHaveBeenCalledWith('tenant-1/general/uuid-v2.pdf');
  });

  it('does not fail the request if a storage object was already gone', async () => {
    const deps = makeDeps();
    vi.mocked(storageService.delete).mockRejectedValueOnce(new Error('not found in bucket'));
    await expect(build(deps).delete('tenant-1', 'doc-1', {})).resolves.toBeUndefined();
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
    await expect(build(deps).replaceFile('tenant-1', 'user-1', 'doc-1', makeFile(), {})).rejects.toThrow(NotFoundError);
    expect(deps.repository.replaceFile).not.toHaveBeenCalled();
  });

  it('uploads the new file to storage, bumps the version, and records who uploaded it', async () => {
    const deps = makeDeps();
    const result = await build(deps).replaceFile('tenant-1', 'user-1', 'doc-1', makeFile(), {});
    expect(storageService.upload).toHaveBeenCalledWith('tenant-1', undefined, expect.objectContaining({ fileName: 'contract.pdf' }));
    expect(deps.repository.replaceFile).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({ storageKey: expect.any(String) }),
      'tenant-1',
      'emp-1',
    );
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

describe('DocumentService.getVersionDownloadUrl', () => {
  it('mints a signed URL scoped to that specific version\'s own storageKey', async () => {
    const deps = makeDeps();
    deps.repository.findVersionById.mockResolvedValue({
      id: 'ver-1',
      tenantId: 'tenant-1',
      documentId: 'doc-1',
      version: 1,
      storageKey: 'tenant-1/general/uuid-v1.pdf',
      fileUrl: null,
    });
    const result = await build(deps).getVersionDownloadUrl('tenant-1', 'doc-1', 'ver-1', {});
    expect(storageService.getSignedDownloadUrl).toHaveBeenCalledWith('tenant-1/general/uuid-v1.pdf');
    expect(result.fileName).toContain('v1');
  });

  it('404s a version that does not belong to the given document', async () => {
    const deps = makeDeps();
    deps.repository.findVersionById.mockResolvedValue({
      id: 'ver-1',
      tenantId: 'tenant-1',
      documentId: 'some-other-doc',
      version: 1,
      storageKey: 'x',
      fileUrl: null,
    });
    await expect(build(deps).getVersionDownloadUrl('tenant-1', 'doc-1', 'ver-1', {})).rejects.toThrow(NotFoundError);
  });
});
