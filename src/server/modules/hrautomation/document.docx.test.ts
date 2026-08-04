import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderLetterDocx } from './document.docx.js';

const baseInput = {
  companyName: 'Acme Inc',
  templateType: 'LETTER_OFFER',
  bodyText: 'Dear Wanda, welcome aboard.',
  employeeName: 'Wanda Worker',
  employeeCode: 'EMP-001',
  issuedDate: '2026-01-01',
  verifyBaseUrl: 'https://app.example.com',
  documentId: 'doc-1',
  signatoryName: 'Ada Admin',
  signatoryTitle: 'HR Manager',
};

describe('renderLetterDocx', () => {
  it('produces a real DOCX buffer — a zip archive starting with the PK signature', async () => {
    const buffer = await renderLetterDocx({ ...baseInput, logoUrl: null });
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('degrades to a text-only header instead of throwing when the logo fetch fails', async () => {
    // A mocked rejection, not a real unreachable host — real DNS-failure timing is not
    // deterministic across environments and made this test flaky.
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'));
    const buffer = await renderLetterDocx({ ...baseInput, logoUrl: 'https://logo.example.com/logo.png' });
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('handles a multi-line body without throwing', async () => {
    const longBody = Array.from({ length: 50 }, (_, i) => `Line ${i} of the letter body.`).join('\n');
    const buffer = await renderLetterDocx({ ...baseInput, logoUrl: null, bodyText: longBody });
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
