import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentVersionHistoryDialog } from './DocumentVersionHistoryDialog';
import { useDocumentVersions } from '../hooks/useWorkplace';
import type { DocumentRecord } from '../types/workplace.types';

vi.mock('../hooks/useWorkplace');
const mockUseDocumentVersions = vi.mocked(useDocumentVersions);

function makeDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'doc-1',
    tenantId: 'tenant-1',
    name: 'Handbook.pdf',
    category: 'HR',
    folderPath: '/hr',
    fileUrl: 'https://files.example.com/handbook-v2.pdf',
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

  it('lists versions newest first with uploader and an Open link', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: [
        { id: 'v2', version: 2, fileUrl: 'https://files.example.com/handbook-v2.pdf', createdAt: '2026-02-01T00:00:00.000Z', uploadedBy: { firstName: 'Ada', lastName: 'Admin' } },
        { id: 'v1', version: 1, fileUrl: 'https://files.example.com/handbook-v1.pdf', createdAt: '2026-01-01T00:00:00.000Z', uploadedBy: null },
      ],
      isLoading: false,
    } as never);
    render(<DocumentVersionHistoryDialog document={makeDocument()} onOpenChange={vi.fn()} />);

    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText(/Ada Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Unknown uploader/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open' })).toHaveLength(2);
  });
});
