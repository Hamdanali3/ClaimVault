import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { MerchantProfileModel } from '../models/MerchantProfile.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serializeMerchantProfile } from './serializer.js';

const UpdateMerchantSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  defaultReturnWindowDays: z.number().int().min(0).max(365).optional(),
  defaultWarrantyMonths: z.number().int().min(0).max(240).optional(),
  defaultCurrency: z.string().min(3).max(5).optional(),
  defaultBillingCycle: z.enum(['NONE', 'MONTHLY', 'YEARLY']).optional(),
});

export async function listMerchantProfiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const profiles = await MerchantProfileModel.find({ householdId: req.auth.householdId })
      .sort({ usageCount: -1, lastUsedAt: -1 })
      .exec();
    res.json({ merchantProfiles: profiles.map(serializeMerchantProfile) });
  } catch (err) {
    next(err);
  }
}

export async function updateMerchantProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const input = UpdateMerchantSchema.parse(req.body);
    const profile = await MerchantProfileModel.findOneAndUpdate(
      { _id: req.params.id, householdId: req.auth.householdId },
      { $set: input },
      { new: true },
    );
    if (!profile) throw new AppError('Merchant profile not found', 404, 'NOT_FOUND');
    res.json({ merchantProfile: serializeMerchantProfile(profile) });
  } catch (err) {
    next(err);
  }
}
