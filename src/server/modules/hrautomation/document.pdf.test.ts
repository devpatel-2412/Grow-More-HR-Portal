import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderLetterPdf, letterTitle } from './document.pdf.js';

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

describe('renderLetterPdf', () => {
  it('produces a buffer starting with the PDF magic bytes', async () => {
    const buffer = await renderLetterPdf({ ...baseInput, logoUrl: null });

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('handles a long body across multiple pages without throwing', async () => {
    const longBody = 'This is a long paragraph of letter text. '.repeat(400);
    const buffer = await renderLetterPdf({
      ...baseInput,
      logoUrl: null,
      templateType: 'LETTER_EXPERIENCE',
      bodyText: longBody,
    });

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('degrades to a text-only header instead of throwing when the logo fetch fails', async () => {
    // A mocked rejection, not a real unreachable host — real DNS-failure timing is not
    // deterministic across environments and made this test flaky.
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'));
    const buffer = await renderLetterPdf({ ...baseInput, logoUrl: 'https://logo.example.com/logo.png' });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('letterTitle', () => {
  it('maps known template types to a human title', () => {
    expect(letterTitle('LETTER_NOC')).toBe('No Objection Certificate');
    expect(letterTitle('LETTER_FNF_SETTLEMENT')).toBe('Full & Final Settlement Letter');
  });

  it('falls back to a generic title for an unrecognized type', () => {
    expect(letterTitle('SOMETHING_NEW')).toBe('Letter');
  });
});
