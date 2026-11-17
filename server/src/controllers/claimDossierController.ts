import type { NextFunction, Request, Response } from 'express';
import { VaultItemModel } from '../models/VaultItem.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { AppError } from '../middlewares/errorHandler.js';
import { buildClaimDossierPdf } from '../services/pdf/claimPacketBuilder.js';

export async function downloadClaimDossierPdf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const item = await VaultItemModel.findOne({
      _id: req.params.id,
      householdId: req.auth.householdId,
    });
    if (!item) throw new AppError('Vault item not found', 404, 'NOT_FOUND');

    const defectNotes =
      typeof req.query.defect === 'string' ? req.query.defect : undefined;
    const pdfBuffer = await buildClaimDossierPdf(item, defectNotes);

    await AuditLogModel.create({
      householdId: item.householdId,
      vaultItemId: item._id,
      actorUserId: req.auth.userId,
      eventType: 'CLAIM_PDF_EXPORTED',
      metadata: { bytes: pdfBuffer.byteLength },
    });

    const safeFileName = `${item.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)}-claim-dossier.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.byteLength.toString());
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
