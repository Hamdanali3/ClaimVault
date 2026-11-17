import type { NextFunction, Request, Response } from 'express';
import { VaultItemModel } from '../models/VaultItem.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serializePublicCertificate } from './serializer.js';

export async function verifyPublicCertificate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = String(req.params.token ?? '').trim();
    if (!token) {
      throw new AppError('Verification token required', 400, 'MISSING_TOKEN');
    }

    const item = await VaultItemModel.findOne({ publicVerificationToken: token });
    if (!item) {
      throw new AppError(
        'Resale verification certificate not found or revoked',
        404,
        'CERTIFICATE_NOT_FOUND',
      );
    }

    await AuditLogModel.create({
      householdId: item.householdId,
      vaultItemId: item._id,
      eventType: 'VERIFY_CERTIFICATE_VIEWED',
      metadata: { token },
    });

    res.json({ certificate: serializePublicCertificate(item) });
  } catch (err) {
    next(err);
  }
}
