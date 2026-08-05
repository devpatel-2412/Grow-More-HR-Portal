import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentVersionHistoryDialog } from './DocumentVersionHistoryDialog';
import { useDocumentVersions, useDownloadDocumentVersion } from '../hooks/useWorkplace';
import type { DocumentRecord } from '../types/workplace.types';

vi.mock('../hooks/useWorkplace');
const mockUseDocumentVersions = vi.mocked(useDocumentVersions);
const mockUseDownloadDocumentVersion = vi.mocked(useDownloadDocumentVersion);

function makeDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'doc-1',
    tenantId: 'tenant-1',
    name: 'Handbook.pdf',
    category: 'HR',
    folderPath: '/hr',
    fileUrl: null,
    storageKey: 'tenant-1/hr/uuid-handbook.pdf',
    fileSize: 2048,
    mimeType: 'application/pdf',
    relatedEntityType: null,
    relatedEntityId: null,
    version: 2,
    expiresAt: null,
    isDigitallySigned: false,
    archived: false,
    archivedAt: null,
    uploadedById: 'emp-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('DocumentVersionHistoryDialog', () => {
  beforeEach(() => {
    mockUseDownloadDocumentVersion.mockReturnValue({ mutateAsync: vi.fn() } as never);
  });

  it('renders nothing (dialog closed) when no document is given', () => {
    mockUseDocumentVersions.mockReturnValue({ data: undefined, isLoading: false } as never);
    render(<DocumentVersionHistoryDialog document={undefined} onOpenChange={vi.fn()} />);
    expect(screen.queryByText(/version history/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when a document has no recorded versions', () => {
    mockUseDocumentVersions.mockReturnValue({ data: [], isLoading: false } as never);
    render(<DocumentVersionHistoryDialog document={makeDocument()} onOpenChange={vi.fn()} />);
    expect(screen.getByText('No version history')).toBeInTheDocument();
  });

  it('lists versions newest first with uploader and a Download button', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: [
        { id: 'v2', version: 2, fileUrl: null, storageKey: 'tenant-1/hr/uuid-v2.pdf', fileSize: 2048, mimeType: 'application/pdf', createdAt: '2026-02-01T00:00:00.000Z', uploadedBy: { firstName: 'Ada', lastName: 'Admin' } },
        { id: 'v1', version: 1, fileUrl: null, storageKey: 'tenant-1/hr/uuid-v1.pdf', fileSize: 1900, mimeType: 'application/pdf', createdAt: '2026-01-01T00:00:00.000Z', uploadedBy: null },
      ],
      isLoading: false,
    } as never);
    render(<DocumentVersionHistoryDialog document={makeDocument()} onOpenChange={vi.fn()} />);

    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText(/Ada Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Unknown uploader/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2);
  });

  it('requests a fresh signed URL for the specific version clicked, not the document\'s current file', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ url: 'https://signed.example.com/v1', fileName: 'Handbook (v1)' });
    mockUseDownloadDocumentVersion.mockReturnValue({ mutateAsync } as never);
    mockUseDocumentVersions.mockReturnValue({
      data: [
        { id: 'v1', version: 1, fileUrl: null, storageKey: 'tenant-1/hr/uuid-v1.pdf', fileSize: 1900, mimeType: 'application/pdf', createdAt: '2026-01-01T00:00:00.000Z', uploadedBy: null },
      ],
      isLoading: false,
    } as never);
    const user = userEvent.setup();
    render(<DocumentVersionHistoryDialog document={makeDocument()} onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: 'doc-1', versionId: 'v1' });
  });
});
