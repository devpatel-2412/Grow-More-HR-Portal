import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { logger } from '../../shared/logger.js';

const TEMPLATE_TYPE_TITLES: Record<string, string> = {
  LETTER_OFFER: 'Offer Letter',
  LETTER_APPOINTMENT: 'Appointment Letter',
  LETTER_JOINING: 'Joining Letter',
  LETTER_CONFIRMATION: 'Confirmation Letter',
  LETTER_PROMOTION: 'Promotion Letter',
  LETTER_SALARY_REVISION: 'Salary Revision Letter',
  LETTER_EXPERIENCE: 'Experience Letter',
  LETTER_RELIEVING: 'Relieving Letter',
  LETTER_WARNING: 'Warning Letter',
  LETTER_APPRECIATION: 'Appreciation Letter',
  LETTER_INTERNSHIP_CERTIFICATE: 'Internship Certificate',
  LETTER_SALARY_CERTIFICATE: 'Salary Certificate',
  LETTER_NOC: 'No Objection Certificate',
  LETTER_FNF_SETTLEMENT: 'Full & Final Settlement Letter',
};

export function letterTitle(templateType: string): string {
  return TEMPLATE_TYPE_TITLES[templateType] ?? 'Letter';
}

export interface LetterPdfInput {
  companyName: string;
  logoUrl?: string | null;
  templateType: string;
  bodyText: string;
  employeeName: string;
  employeeCode: string;
  issuedDate: string;
  /** Absolute URL (no trailing slash) a QR code will point at as `${verifyBaseUrl}/verify/${documentId}`. */
  verifyBaseUrl: string;
  documentId: string;
  signatoryName: string;
  signatoryTitle: string;
}

/** Best-effort remote image fetch — a broken/unreachable logo URL degrades to a text-only letterhead, it never fails the whole PDF. */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn({ err, url }, 'Could not fetch letterhead logo for PDF generation — falling back to text-only header');
    return null;
  }
}

const PAGE_MARGIN = { top: 130, bottom: 90, left: 60, right: 60 };

/**
 * Renders a formal HR letter with a repeating letterhead/footer, a QR-verifiable authenticity
 * link, and a signature block. pdfkit buffers all pages (`bufferPages: true`) so the header,
 * footer, and watermark can be drawn on every page in a second pass once the body's real page
 * count is known — page 1 through however many pages a long body actually spans.
 */
export async function renderLetterPdf(input: LetterPdfInput): Promise<Buffer> {
  const verifyUrl = `${input.verifyBaseUrl}/verify/${input.documentId}`;
  const [logoBuffer, qrBuffer] = await Promise.all([
    input.logoUrl ? fetchImageBuffer(input.logoUrl) : Promise.resolve(null),
    QRCode.toBuffer(verifyUrl, { margin: 1, width: 90 }),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN.left, bufferPages: true });
    doc.page.margins = PAGE_MARGIN;
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Body content — pdfkit paginates automatically as this flows past the page bottom. ---
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text(letterTitle(input.templateType), { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(10).font('Helvetica').fillColor('#555555');
    doc.text(`Date: ${input.issuedDate}`);
    doc.text(`Employee: ${input.employeeName} (${input.employeeCode})`);
    doc.moveDown(1.5);

    doc.fillColor('#000000').fontSize(11).font('Helvetica');
    doc.text(input.bodyText, { align: 'left', lineGap: 4 });

    doc.moveDown(3);
    if (doc.y > doc.page.height - PAGE_MARGIN.bottom - 90) doc.addPage();
    doc.text('_________________________');
    doc.font('Helvetica-Bold').text(input.signatoryName);
    doc.font('Helvetica').fontSize(10).fillColor('#555555').text(input.signatoryTitle);

    // --- Letterhead, footer, and watermark on every page, drawn once the true page count is known. ---
    const pageRange = doc.bufferedPageRange();
    for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
      doc.switchToPage(i);
      drawHeader(doc, input.companyName, logoBuffer);
      drawWatermark(doc, input.companyName);
      drawFooter(doc, qrBuffer, verifyUrl, i - pageRange.start + 1, pageRange.count);
    }

    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, companyName: string, logoBuffer: Buffer | null): void {
  const top = 30;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, PAGE_MARGIN.left, top, { fit: [50, 50] });
    } catch (err) {
      logger.warn({ err }, 'Fetched logo was not a decodable image — skipping it in the PDF header');
    }
  }
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text(companyName, logoBuffer ? PAGE_MARGIN.left + 60 : PAGE_MARGIN.left, top + 10, { width: 400 });
  doc
    .moveTo(PAGE_MARGIN.left, top + 60)
    .lineTo(doc.page.width - PAGE_MARGIN.right, top + 60)
    .strokeColor('#dddddd')
    .stroke();
}

function drawFooter(doc: PDFKit.PDFDocument, qrBuffer: Buffer, verifyUrl: string, pageNumber: number, totalPages: number): void {
  const bottom = doc.page.height - PAGE_MARGIN.bottom + 15;
  doc.image(qrBuffer, PAGE_MARGIN.left, bottom, { fit: [45, 45] });
  doc
    .fontSize(7)
    .font('Helvetica')
    .fillColor('#888888')
    .text('Digitally issued — scan to verify authenticity', PAGE_MARGIN.left + 55, bottom + 4, { width: 250 })
    .text(verifyUrl, PAGE_MARGIN.left + 55, bottom + 16, { width: 250 });
  doc
    .fontSize(8)
    .fillColor('#888888')
    .text(`Page ${pageNumber} of ${totalPages}`, PAGE_MARGIN.left, bottom + 4, {
      width: doc.page.width - PAGE_MARGIN.left - PAGE_MARGIN.right,
      align: 'right',
    });
}

function drawWatermark(doc: PDFKit.PDFDocument, companyName: string): void {
  doc.save();
  doc
    .rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
    .fontSize(60)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .opacity(0.05)
    .text(companyName.toUpperCase(), 0, doc.page.height / 2 - 30, { width: doc.page.width, align: 'center' });
  doc.restore();
  doc.opacity(1);
}
