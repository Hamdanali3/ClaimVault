import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import type { IVaultItem } from '../../models/VaultItem.js';
import { readProofBuffer } from '../../config/storage.js';
import { env } from '../../config/env.js';

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toISOString().slice(0, 10);
}

function fmtMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export async function buildClaimDossierPdf(
  item: IVaultItem,
  defectNotes?: string,
): Promise<Buffer> {
  let embeddedPng: Buffer | null = null;
  const primaryProof = item.proofFiles?.[0];
  if (primaryProof?.fileUrl && !primaryProof.mimeType.includes('pdf')) {
    try {
      const proofData = await readProofBuffer(primaryProof.fileUrl);
      if (proofData && !proofData.mimeType.includes('pdf')) {
        embeddedPng = await sharp(proofData.buffer)
          .resize({ width: 900, height: 1100, fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer();
      }
    } catch {
      embeddedPng = null;
    }
  }

  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 44,
      info: {
        Title: `ClaimVault Claim Dossier — ${item.title}`,
        Author: 'ClaimVault Proof Ledger',
        Subject: `Warranty / Return Claim Packet for ${item.merchantName}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Swiss Ledger Top Bar
    doc
      .rect(44, 42, doc.page.width - 88, 56)
      .fillColor('#FAF9F6')
      .fill()
      .strokeColor('#E6E4DD')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#141413')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('CLAIMVAULT', 58, 55)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#615F59')
      .text('VERIFIED PURCHASE, RETURN & WARRANTY CLAIM DOSSIER', 58, 74);

    doc
      .font('Courier')
      .fontSize(9)
      .fillColor('#141413')
      .text(`DOSSIER REF: CV-${item._id.toString().slice(-8).toUpperCase()}`, 340, 56, {
        align: 'right',
        width: doc.page.width - 400,
      })
      .fillColor('#615F59')
      .text(`ISSUED UTC: ${new Date().toISOString().slice(0, 19)}Z`, 340, 72, {
        align: 'right',
        width: doc.page.width - 400,
      });

    // Item Title & Financial Summary
    let y = 118;
    doc
      .fillColor('#141413')
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(item.title, 44, y, { width: doc.page.width - 88 });
    y = doc.y + 4;
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#615F59')
      .text(`${item.merchantName}  ·  ${item.category}  ·  Status: ${item.status}`, 44, y);

    y = doc.y + 18;
    // Key-Value Ledger Grid
    const col1X = 44;
    const col2X = 305;
    const boxWidth = doc.page.width - 88;
    doc
      .rect(44, y, boxWidth, 134)
      .fillColor('#FFFFFF')
      .fill()
      .strokeColor('#E6E4DD')
      .stroke();

    const rows: Array<[string, string, string, string]> = [
      [
        'PURCHASE AMOUNT',
        fmtMoney(item.financials.amount, item.financials.currency),
        'PURCHASE DATE',
        fmtDate(item.dates.purchaseDate),
      ],
      [
        'ORDER / INVOICE #',
        item.identifiers.orderNumber ?? 'Not Listed',
        'RETURN WINDOW DEADLINE',
        fmtDate(item.dates.returnDeadline),
      ],
      [
        'SERIAL NUMBER (S/N)',
        item.identifiers.serialNumber ?? 'Not Listed',
        'WARRANTY EXPIRY DATE',
        fmtDate(item.dates.warrantyExpiryDate),
      ],
      [
        'MODEL / IMEI',
        item.identifiers.modelCode ?? item.identifiers.imei ?? 'Not Listed',
        'POLICY SOURCE',
        item.aiMetadata.policySource ?? 'VERIFIED',
      ],
    ];

    let rowY = y + 12;
    for (const [lLabel, lVal, rLabel, rVal] of rows) {
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#615F59')
        .text(lLabel, col1X + 12, rowY)
        .text(rLabel, col2X + 12, rowY);

      doc
        .font('Courier-Bold')
        .fontSize(10)
        .fillColor('#141413')
        .text(lVal, col1X + 12, rowY + 10, { width: 235 })
        .text(rVal, col2X + 12, rowY + 10, { width: 225 });

      rowY += 31;
    }

    y += 148;

    // Claim / Defect Statement
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#141413')
      .text('CLAIM / RETURN REQUEST STATEMENT', 44, y);
    y += 15;
    const notesText =
      defectNotes?.trim() ||
      item.outcome.resolutionNotes ||
      `Formal request for warranty service or eligible return inspection for "${item.title}" purchased from ${item.merchantName} on ${fmtDate(item.dates.purchaseDate)} under ${item.aiMetadata.policyNotes || 'applicable merchant terms'}.`;

    doc
      .rect(44, y, boxWidth, 54)
      .fillColor('#F3F1EC')
      .fill()
      .strokeColor('#E6E4DD')
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor('#141413')
      .text(notesText, 56, y + 10, { width: boxWidth - 24 });

    y += 70;

    // Cryptographic Proof Integrity Block
    doc
      .rect(44, y, boxWidth, 64)
      .fillColor('#ECFDF5')
      .fill()
      .strokeColor('#A7F3D0')
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#065F46')
      .text('CRYPTOGRAPHIC PROOF INTEGRITY (TAMPER-PROOF SHA-256)', 56, y + 10);
    doc
      .font('Courier')
      .fontSize(8.5)
      .fillColor('#141413')
      .text(
        `SHA-256: ${primaryProof?.sha256Hash ?? 'NO-FILE-HASH-ATTACHED'}`,
        56,
        y + 24,
      )
      .text(
        `Verify Online: ${env.CLIENT_URL}/verify/${item.publicVerificationToken ?? 'unavailable'}`,
        56,
        y + 39,
      );

    y += 82;

    // Embedded Receipt Image
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#141413')
      .text('ATTACHED ORIGINAL PROOF ARTIFACT', 44, y);
    y += 16;

    if (embeddedPng) {
      const maxImgHeight = doc.page.height - y - 54;
      doc.image(embeddedPng, 44, y, {
        fit: [boxWidth, Math.max(180, maxImgHeight)],
        align: 'center',
      });
    } else {
      doc
        .rect(44, y, boxWidth, 90)
        .strokeColor('#E6E4DD')
        .stroke()
        .font('Courier')
        .fontSize(9)
        .fillColor('#615F59')
        .text(
          primaryProof
            ? `Original PDF Proof Stored: ${primaryProof.fileUrl}\nSHA-256: ${primaryProof.sha256Hash}`
            : 'No image attachment uploaded — digital order metadata recorded.',
          56,
          y + 20,
          { width: boxWidth - 24 },
        );
    }

    doc.end();
  });
}
