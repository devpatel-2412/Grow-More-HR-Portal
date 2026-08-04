import { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, PageNumber } from 'docx';
import QRCode from 'qrcode';
import { logger } from '../../shared/logger.js';
import { letterTitle, type LetterPdfInput } from './document.pdf.js';

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn({ err, url }, 'Could not fetch letterhead logo for DOCX generation — falling back to a text-only header');
    return null;
  }
}

/** Same content and authenticity affordances as renderLetterPdf (letterhead, QR verification, signature block), as an editable .docx instead of a fixed PDF. */
export async function renderLetterDocx(input: LetterPdfInput): Promise<Buffer> {
  const verifyUrl = `${input.verifyBaseUrl}/verify/${input.documentId}`;
  const [logoBuffer, qrBuffer] = await Promise.all([
    input.logoUrl ? fetchImageBuffer(input.logoUrl) : Promise.resolve(null),
    QRCode.toBuffer(verifyUrl, { margin: 1, width: 90 }),
  ]);

  const headerChildren: (TextRun | ImageRun)[] = [];
  if (logoBuffer) {
    headerChildren.push(new ImageRun({ data: logoBuffer, transformation: { width: 40, height: 40 }, type: 'png' }));
    headerChildren.push(new TextRun({ text: `  ${input.companyName}`, bold: true, size: 28 }));
  } else {
    headerChildren.push(new TextRun({ text: input.companyName, bold: true, size: 28 }));
  }

  const bodyParagraphs = input.bodyText
    .split('\n')
    .map((line) => new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 120 } }));

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({ children: [new Paragraph({ children: headerChildren })] }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new ImageRun({ data: qrBuffer, transformation: { width: 36, height: 36 }, type: 'png' }),
                  new TextRun({ text: `  Verify at ${verifyUrl}  |  Page `, size: 14, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '888888' }),
                  new TextRun({ text: ' of ', size: 14, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: letterTitle(input.templateType), bold: true, size: 26 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({ children: [new TextRun({ text: `Date: ${input.issuedDate}`, color: '555555', size: 20 })] }),
          new Paragraph({
            children: [new TextRun({ text: `Employee: ${input.employeeName} (${input.employeeCode})`, color: '555555', size: 20 })],
            spacing: { after: 300 },
          }),
          ...bodyParagraphs,
          new Paragraph({ text: '', spacing: { before: 600 } }),
          new Paragraph({ text: '_________________________' }),
          new Paragraph({ children: [new TextRun({ text: input.signatoryName, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: input.signatoryTitle, color: '555555', size: 20 })] }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
