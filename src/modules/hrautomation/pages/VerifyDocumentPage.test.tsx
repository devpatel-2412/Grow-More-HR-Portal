import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VerifyDocumentPage } from './VerifyDocumentPage';
import { verifyApi } from '../api/hrautomation.api';
import { ApiError } from '../../../shared/lib/api-client';
import { ThemeProvider } from '../../../shared/lib/theme';

vi.mock('../api/hrautomation.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/hrautomation.api')>();
  return { ...actual, verifyApi: { verifyDocument: vi.fn() } };
});
const mockVerifyDocument = vi.mocked(verifyApi.verifyDocument);

function renderAt(documentId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[`/verify/${documentId}`]}>
          <Routes>
            <Route path="/verify/:id" element={<VerifyDocumentPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('VerifyDocumentPage', () => {
  it('shows the genuine-document result for a valid id', async () => {
    mockVerifyDocument.mockResolvedValue({
      valid: true,
      documentType: 'Experience Letter',
      employeeName: 'Wanda Worker',
      companyName: 'Acme Inc',
      issuedDate: '2026-01-01',
    });
    renderAt('doc-1');

    expect(await screen.findByText('Genuine document')).toBeInTheDocument();
    expect(screen.getByText('Wanda Worker')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(mockVerifyDocument).toHaveBeenCalledWith('doc-1');
  });

  it('shows a not-found message for a document id that does not exist', async () => {
    mockVerifyDocument.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Document not found'));
    renderAt('doc-missing');

    expect(await screen.findByText('Document not found')).toBeInTheDocument();
    expect(screen.getByText(/does not match any document/i)).toBeInTheDocument();
  });

  it('shows a generic failure message for a non-404 error, distinct from not-found', async () => {
    mockVerifyDocument.mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'boom'));
    renderAt('doc-1');

    expect(await screen.findByText('Could not verify this document')).toBeInTheDocument();
  });
});
