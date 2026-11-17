import type { Types } from 'mongoose';
import { VaultItemModel, type IVaultItem } from '../../models/VaultItem.js';
import { AuditLogModel } from '../../models/AuditLog.js';
import { dispatchEmailAlert } from './emailDispatcher.js';
import { dispatchWhatsappAlert } from './whatsappWebhook.js';

export interface ScheduledAlertSummary {
  vaultItemId: string;
  triggers: Array<{
    windowLabel: 'T-7D' | 'T-48H' | 'T-12H';
    triggerAtISO: string;
    channels: string[];
  }>;
}

export async function scheduleDeadlinesForItem(
  item: IVaultItem,
): Promise<ScheduledAlertSummary> {
  const candidates: Date[] = [];
  if (item.dates.returnDeadline) candidates.push(item.dates.returnDeadline);
  if (item.dates.nextRenewalDate) candidates.push(item.dates.nextRenewalDate);
  if (item.dates.warrantyExpiryDate) candidates.push(item.dates.warrantyExpiryDate);

  const now = Date.now();
  const futureDeadlines = candidates
    .filter((d) => d.getTime() > now)
    .sort((a, b) => a.getTime() - b.getTime());

  const nextTarget = futureDeadlines[0];
  const triggers: ScheduledAlertSummary['triggers'] = [];

  if (nextTarget) {
    const offsets: Array<{ label: 'T-7D' | 'T-48H' | 'T-12H'; ms: number }> = [
      { label: 'T-7D', ms: 7 * 24 * 3600 * 1000 },
      { label: 'T-48H', ms: 48 * 3600 * 1000 },
      { label: 'T-12H', ms: 12 * 3600 * 1000 },
    ];
    for (const offset of offsets) {
      const triggerAt = new Date(nextTarget.getTime() - offset.ms);
      if (triggerAt.getTime() > now - 3600 * 1000) {
        triggers.push({
          windowLabel: offset.label,
          triggerAtISO: triggerAt.toISOString(),
          channels: item.alertChannels,
        });
      }
    }
  }

  await AuditLogModel.create({
    householdId: item.householdId,
    vaultItemId: item._id,
    actorUserId: item.createdBy,
    eventType: 'REMINDER_SCHEDULED',
    metadata: {
      triggersCount: triggers.length,
      triggers,
    },
  });

  return {
    vaultItemId: item._id.toString(),
    triggers,
  };
}

export async function cancelPendingRemindersForItem(
  householdId: Types.ObjectId,
  vaultItemId: Types.ObjectId,
  actorUserId?: Types.ObjectId,
): Promise<void> {
  await AuditLogModel.create({
    householdId,
    vaultItemId,
    actorUserId,
    eventType: 'REMINDER_CANCELLED',
    metadata: {
      cancelledAt: new Date().toISOString(),
    },
  });
}

/**
 * Deterministic sweeper evaluating active items within T-7d / T-48h / T-12h trigger windows.
 */
export async function runDeadlineSweeperPass(): Promise<number> {
  const now = new Date();
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  const dueItems = await VaultItemModel.find({
    status: 'ACTIVE',
    $or: [
      { 'dates.returnDeadline': { $gte: now, $lte: sevenDaysAhead } },
      { 'dates.nextRenewalDate': { $gte: now, $lte: sevenDaysAhead } },
      { 'dates.warrantyExpiryDate': { $gte: now, $lte: sevenDaysAhead } },
    ],
  }).limit(100);

  let dispatchedCount = 0;

  for (const item of dueItems) {
    const earliest = [
      item.dates.returnDeadline,
      item.dates.nextRenewalDate,
      item.dates.warrantyExpiryDate,
    ]
      .filter((d): d is Date => Boolean(d && d.getTime() >= now.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (!earliest) continue;
    const hoursLeft = (earliest.getTime() - now.getTime()) / (1000 * 3600);
    const windowLabel: 'T-7D' | 'T-48H' | 'T-12H' =
      hoursLeft <= 12 ? 'T-12H' : hoursLeft <= 48 ? 'T-48H' : 'T-7D';

    // Deduplicate dispatch logs within 10 hours per item & window
    const recentLog = await AuditLogModel.findOne({
      vaultItemId: item._id,
      eventType: 'REMINDER_DISPATCHED',
      'metadata.windowLabel': windowLabel,
      createdAt: { $gte: new Date(now.getTime() - 10 * 3600 * 1000) },
    });

    if (recentLog) continue;

    const payload = {
      householdId: item.householdId.toString(),
      vaultItemId: item._id.toString(),
      title: item.title,
      merchantName: item.merchantName,
      windowLabel,
      deadlineDateISO: earliest.toISOString(),
      amount: item.financials.amount,
      currency: item.financials.currency,
    };

    const emailResult = item.alertChannels.includes('EMAIL')
      ? await dispatchEmailAlert(payload)
      : null;
    const waResult = item.alertChannels.includes('WHATSAPP')
      ? await dispatchWhatsappAlert(payload)
      : null;

    await AuditLogModel.create({
      householdId: item.householdId,
      vaultItemId: item._id,
      eventType: 'REMINDER_DISPATCHED',
      metadata: {
        windowLabel,
        hoursLeft: Number(hoursLeft.toFixed(1)),
        emailResult,
        waResult,
      },
    });
    dispatchedCount += 1;
  }

  return dispatchedCount;
}
