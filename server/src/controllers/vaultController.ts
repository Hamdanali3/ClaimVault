import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  ConfirmVaultItemSchema,
  ResolveVaultItemSchema,
  normalizeMerchantName,
  type DashboardResponseDTO,
} from '@claimvault/shared';
import { VaultItemModel } from '../models/VaultItem.js';
import { MerchantProfileModel } from '../models/MerchantProfile.js';
import { HouseholdModel } from '../models/Household.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { AppError } from '../middlewares/errorHandler.js';
import { runWithOptionalTransaction } from '../config/db.js';
import { addDaysUTC, addMonthsUTC } from '../services/ai/policyResolver.js';
import {
  cancelPendingRemindersForItem,
  scheduleDeadlinesForItem,
} from '../services/notifications/deadlineScheduler.js';
import {
  convertToDisplayPkr,
  serializeMerchantProfile,
  serializeVaultItem,
} from './serializer.js';
import { ensureDemoWorkspaceSeeded } from '../seed/demoSeeder.js';

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const householdObjId = new mongoose.Types.ObjectId(req.auth.householdId);
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 3600 * 1000);

    // Single-roundtrip MongoDB $facet aggregation pipeline
    const [facetResult] = await VaultItemModel.aggregate([
      { $match: { householdId: householdObjId } },
      {
        $facet: {
          urgentItems: [
            {
              $match: {
                status: 'ACTIVE',
                $or: [
                  { 'dates.returnDeadline': { $gte: now, $lte: in14Days } },
                  { 'dates.nextRenewalDate': { $gte: now, $lte: in14Days } },
                  { 'dates.warrantyExpiryDate': { $gte: now, $lte: in14Days } },
                ],
              },
            },
            {
              $addFields: {
                earliestDeadline: {
                  $min: [
                    {
                      $cond: [
                        {
                          $and: [
                            { $ne: ['$dates.returnDeadline', null] },
                            { $gte: ['$dates.returnDeadline', now] },
                          ],
                        },
                        '$dates.returnDeadline',
                        new Date('2099-12-31T00:00:00Z'),
                      ],
                    },
                    {
                      $cond: [
                        {
                          $and: [
                            { $ne: ['$dates.nextRenewalDate', null] },
                            { $gte: ['$dates.nextRenewalDate', now] },
                          ],
                        },
                        '$dates.nextRenewalDate',
                        new Date('2099-12-31T00:00:00Z'),
                      ],
                    },
                    {
                      $cond: [
                        {
                          $and: [
                            { $ne: ['$dates.warrantyExpiryDate', null] },
                            { $gte: ['$dates.warrantyExpiryDate', now] },
                          ],
                        },
                        '$dates.warrantyExpiryDate',
                        new Date('2099-12-31T00:00:00Z'),
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { earliestDeadline: 1 } },
            { $limit: 50 },
          ],
          allActiveItems: [
            { $match: { status: { $in: ['ACTIVE', 'RETURN_INITIATED'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 200 },
          ],
          resolvedItems: [
            {
              $match: {
                status: {
                  $in: [
                    'RETURNED_REFUNDED',
                    'WARRANTY_CLAIMED',
                    'SUBSCRIPTION_CANCELLED',
                    'EXPIRED',
                  ],
                },
              },
            },
            { $sort: { 'outcome.resolvedAt': -1, updatedAt: -1 } },
            { $limit: 200 },
          ],
          velocityStats: [
            { $match: { captureDurationSeconds: { $exists: true, $ne: null } } },
            {
              $group: {
                _id: '$aiMetadata.merchantMemoryApplied',
                avgDuration: { $avg: '$captureDurationSeconds' },
              },
            },
          ],
        },
      },
    ]);

    const [merchantProfiles, household] = await Promise.all([
      MerchantProfileModel.find({ householdId: req.auth.householdId })
        .sort({ usageCount: -1, lastUsedAt: -1 })
        .exec(),
      HouseholdModel.findById(req.auth.householdId).lean(),
    ]);

    const urgentSerialized = (facetResult?.urgentItems ?? []).map(serializeVaultItem);
    const activeSerialized = (facetResult?.allActiveItems ?? []).map(serializeVaultItem);
    const resolvedSerialized = (facetResult?.resolvedItems ?? []).map(serializeVaultItem);

    const moneyAtRiskByCurrency: Record<string, number> = {};
    let moneyAtRiskNext14Days = 0;
    for (const item of urgentSerialized) {
      const cur = item.financials.currency;
      moneyAtRiskByCurrency[cur] = (moneyAtRiskByCurrency[cur] ?? 0) + item.financials.amount;
      moneyAtRiskNext14Days += convertToDisplayPkr(item.financials.amount, cur);
    }

    const protectedValueByCurrency: Record<string, number> = {};
    let totalProtectedAssetValue = 0;
    for (const item of activeSerialized) {
      const cur = item.financials.currency;
      protectedValueByCurrency[cur] =
        (protectedValueByCurrency[cur] ?? 0) + item.financials.amount;
      totalProtectedAssetValue += convertToDisplayPkr(item.financials.amount, cur);
    }

    const savedByCurrency: Record<string, number> = {};
    let totalMoneySavedOrRecovered = 0;
    for (const item of resolvedSerialized) {
      const saved = item.outcome.moneySavedOrRecovered || 0;
      const cur = item.financials.currency;
      savedByCurrency[cur] = (savedByCurrency[cur] ?? 0) + saved;
      totalMoneySavedOrRecovered += convertToDisplayPkr(saved, cur);
    }

    const velocityRows = (facetResult?.velocityStats ?? []) as Array<{
      _id: boolean;
      avgDuration: number;
    }>;
    const repeatRow = velocityRows.find((r) => r._id === true);
    const firstRow = velocityRows.find((r) => r._id === false);

    const payload: DashboardResponseDTO = {
      urgentItems: urgentSerialized,
      allActiveItems: activeSerialized,
      resolvedItems: resolvedSerialized,
      merchantProfiles: merchantProfiles.map(serializeMerchantProfile),
      metrics: {
        moneyAtRiskNext14Days,
        moneyAtRiskByCurrency,
        totalProtectedAssetValue,
        protectedValueByCurrency,
        totalMoneySavedOrRecovered,
        savedByCurrency,
        repeatVelocityAvgSeconds: Math.round(repeatRow?.avgDuration ?? 18),
        firstVisitAvgSeconds: Math.round(firstRow?.avgDuration ?? 58),
        activeCount: activeSerialized.length,
        urgentCount: urgentSerialized.length,
        resolvedCount: resolvedSerialized.length,
      },
      household: {
        _id: household?._id.toString() ?? req.auth.householdId,
        name: household?.name ?? 'ClaimVault Household',
        planTier: household?.planTier ?? 'PRO_HOUSEHOLD',
        inboundForwardingAlias:
          household?.inboundForwardingAlias ?? 'vault@claimvault.app',
        defaultCurrency: household?.defaultCurrency ?? 'PKR',
        memberCount: household?.members.length ?? 1,
      },
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function listVaultItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;

    const filter: Record<string, unknown> = {
      householdId: req.auth.householdId,
    };
    if (status) filter.status = status;
    if (kind) filter.kind = kind;

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: regex },
        { merchantName: regex },
        { 'identifiers.serialNumber': regex },
        { 'identifiers.orderNumber': regex },
        { 'aiMetadata.rawOcrText': regex },
      ];
    }

    const items = await VaultItemModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(150)
      .exec();

    res.json({ items: items.map(serializeVaultItem) });
  } catch (err) {
    next(err);
  }
}

export async function getVaultItemById(
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
    res.json({ item: serializeVaultItem(item) });
  } catch (err) {
    next(err);
  }
}

export async function confirmVaultItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const input = ConfirmVaultItemSchema.parse(req.body);
    const householdId = req.auth.householdId;
    const userId = req.auth.userId;

    const result = await runWithOptionalTransaction(async (session) => {
      const item = await VaultItemModel.findOne({
        _id: req.params.id,
        householdId,
      }).session(session);

      if (!item) {
        throw new AppError('Vault item not found', 404, 'NOT_FOUND');
      }

      if (input.title !== undefined) item.title = input.title;
      if (input.merchantName !== undefined) {
        item.merchantName = input.merchantName;
        item.normalizedMerchantName =
          normalizeMerchantName(input.merchantName) || item.normalizedMerchantName;
      }
      if (input.kind !== undefined) item.kind = input.kind;
      if (input.category !== undefined) item.category = input.category;
      if (input.amount !== undefined) item.financials.amount = input.amount;
      if (input.currency !== undefined) item.financials.currency = input.currency;
      if (input.paymentMethod !== undefined) {
        item.financials.paymentMethod = input.paymentMethod;
      }
      if (input.orderNumber !== undefined) item.identifiers.orderNumber = input.orderNumber;
      if (input.serialNumber !== undefined) item.identifiers.serialNumber = input.serialNumber;
      if (input.imei !== undefined) item.identifiers.imei = input.imei;
      if (input.modelCode !== undefined) item.identifiers.modelCode = input.modelCode;
      if (input.alertChannels !== undefined) item.alertChannels = input.alertChannels;

      if (input.returnWindowDays !== undefined) {
        item.returnWindowDays = input.returnWindowDays;
      }
      if (input.warrantyMonths !== undefined) {
        item.warrantyMonths = input.warrantyMonths;
      }
      if (input.billingCycle !== undefined) {
        item.billingCycle = input.billingCycle;
      }
      if (input.purchaseDateISO) {
        item.dates.purchaseDate = new Date(`${input.purchaseDateISO}T12:00:00.000Z`);
      }

      // Recompute deterministic deadlines after edits
      const baseDate = item.dates.purchaseDate;
      item.dates.returnDeadline =
        item.returnWindowDays > 0 ? addDaysUTC(baseDate, item.returnWindowDays) : null;
      item.dates.warrantyExpiryDate =
        item.warrantyMonths > 0 ? addMonthsUTC(baseDate, item.warrantyMonths) : null;
      if (item.billingCycle === 'MONTHLY') {
        item.dates.nextRenewalDate = addMonthsUTC(baseDate, 1);
        item.dates.cancelByDate = addDaysUTC(item.dates.nextRenewalDate, -2);
      } else if (item.billingCycle === 'YEARLY') {
        item.dates.nextRenewalDate = addMonthsUTC(baseDate, 12);
        item.dates.cancelByDate = addDaysUTC(item.dates.nextRenewalDate, -3);
      } else {
        item.dates.nextRenewalDate = null;
        item.dates.cancelByDate = null;
      }

      // Mark human-confirmed fields at 1.0 confidence
      item.aiMetadata = {
        ...item.aiMetadata,
        overallConfidence: 1.0,
        fieldConfidence: {
          ...item.aiMetadata.fieldConfidence,
          merchantName: 1.0,
          title: 1.0,
          purchasePrice: 1.0,
          purchaseDateISO: 1.0,
        },
      };
      item.markModified('aiMetadata');

      if (input.captureDurationSeconds !== undefined) {
        item.captureDurationSeconds = input.captureDurationSeconds;
      }

      await item.save({ session });

      let merchantProfile = null;
      if (input.rememberMerchantDefaults) {
        merchantProfile = await MerchantProfileModel.findOneAndUpdate(
          {
            householdId,
            normalizedMerchantName: item.normalizedMerchantName,
          },
          {
            $set: {
              displayName: item.merchantName,
              defaultCategory: item.category,
              defaultCurrency: item.financials.currency,
              defaultReturnWindowDays: item.returnWindowDays,
              defaultWarrantyMonths: item.warrantyMonths,
              defaultBillingCycle: item.billingCycle,
              preferredAlertChannels: item.alertChannels,
              lastUsedAt: new Date(),
            },
            $inc: { usageCount: 1 },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            session,
          },
        );
      }

      return { item, merchantProfile };
    });

    await scheduleDeadlinesForItem(result.item);
    await AuditLogModel.create({
      householdId,
      vaultItemId: result.item._id,
      actorUserId: userId,
      eventType: 'ITEM_CONFIRMED',
      metadata: {
        rememberMerchantDefaults: input.rememberMerchantDefaults,
        normalizedMerchantName: result.item.normalizedMerchantName,
      },
    });

    res.json({
      item: serializeVaultItem(result.item),
      merchantProfile: result.merchantProfile
        ? serializeMerchantProfile(result.merchantProfile)
        : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function resolveVaultItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const input = ResolveVaultItemSchema.parse(req.body);

    const item = await VaultItemModel.findOne({
      _id: req.params.id,
      householdId: req.auth.householdId,
    });
    if (!item) throw new AppError('Vault item not found', 404, 'NOT_FOUND');

    const savedAmount =
      input.moneySavedOrRecovered !== undefined
        ? input.moneySavedOrRecovered
        : item.financials.amount;

    item.status = input.status;
    item.outcome = {
      moneySavedOrRecovered: input.status === 'RETURN_INITIATED' ? 0 : savedAmount,
      resolvedAt: input.status === 'RETURN_INITIATED' ? null : new Date(),
      resolutionNotes:
        input.resolutionNotes ?? `Marked as ${input.status.replace(/_/g, ' ').toLowerCase()}`,
    };
    await item.save();

    if (input.status !== 'RETURN_INITIATED') {
      await cancelPendingRemindersForItem(
        item.householdId,
        item._id,
        new mongoose.Types.ObjectId(req.auth.userId),
      );
    }

    await AuditLogModel.create({
      householdId: item.householdId,
      vaultItemId: item._id,
      actorUserId: req.auth.userId,
      eventType: 'ITEM_RESOLVED',
      metadata: {
        status: item.status,
        moneySavedOrRecovered: item.outcome.moneySavedOrRecovered,
      },
    });

    res.json({ item: serializeVaultItem(item) });
  } catch (err) {
    next(err);
  }
}

export async function restoreVaultItem(
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

    item.status = 'ACTIVE';
    item.outcome = {
      moneySavedOrRecovered: 0,
      resolvedAt: null,
      resolutionNotes: null,
    };
    await item.save();
    await scheduleDeadlinesForItem(item);

    await AuditLogModel.create({
      householdId: item.householdId,
      vaultItemId: item._id,
      actorUserId: req.auth.userId,
      eventType: 'ITEM_RESTORED',
      metadata: { restoredAt: new Date().toISOString() },
    });

    res.json({ item: serializeVaultItem(item) });
  } catch (err) {
    next(err);
  }
}

export async function deleteVaultItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const deleted = await VaultItemModel.findOneAndDelete({
      _id: req.params.id,
      householdId: req.auth.householdId,
    });
    if (!deleted) throw new AppError('Vault item not found', 404, 'NOT_FOUND');
    res.json({ ok: true, deletedId: req.params.id });
  } catch (err) {
    next(err);
  }
}

export async function resetDemoWorkspace(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth?.isDemoWorkspace) {
      throw new AppError(
        'Reset is only available in the interactive demo workspace',
        403,
        'FORBIDDEN',
      );
    }
    const result = await ensureDemoWorkspaceSeeded(true);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const logs = await AuditLogModel.find({ householdId: req.auth.householdId })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}
