import {
  findBuiltinMerchantRule,
  normalizeMerchantName,
  type AlertChannel,
  type BillingCycle,
  type ExtractionResult,
  type PolicyResolution,
  type PolicyResolutionSource,
} from '@claimvault/shared';
import type { IMerchantProfile } from '../../models/MerchantProfile.js';

export function addDaysUTC(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/**
 * Leap-year safe month addition (clamps Feb 29 -> Feb 28 in non-leap years, Jan 31 -> Feb 28/29).
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function resolvePolicyAndDates(params: {
  extraction: ExtractionResult;
  merchantProfile: IMerchantProfile | null;
  rawText?: string;
}): {
  policy: PolicyResolution;
  resolvedCategory: string;
  resolvedCurrency: string;
  dates: {
    purchaseDate: Date;
    returnDeadline: Date | null;
    warrantyExpiryDate: Date | null;
    nextRenewalDate: Date | null;
    cancelByDate: Date | null;
  };
} {
  const { extraction, merchantProfile, rawText } = params;
  const normalized = normalizeMerchantName(extraction.merchantName);
  const kbRule = findBuiltinMerchantRule(normalized, rawText);

  let source: PolicyResolutionSource = 'FALLBACK_DEFAULT';
  let returnWindowDays = 14;
  let warrantyMonths = extraction.kind === 'PHYSICAL_ASSET' ? 12 : 0;
  let billingCycle: BillingCycle = extraction.billingCycle;
  let preferredAlertChannels: AlertChannel[] = ['IN_APP', 'EMAIL'];
  let policyNotes = 'Standard 14-day return & 12-month electronics baseline';
  let resolvedCategory = extraction.category;
  let resolvedCurrency = extraction.currency;

  // Priority 1: Household's Historical MerchantProfile Memory (powers 20-second repeat workflow)
  if (merchantProfile) {
    source = 'MERCHANT_MEMORY';
    returnWindowDays = merchantProfile.defaultReturnWindowDays;
    warrantyMonths = merchantProfile.defaultWarrantyMonths;
    billingCycle = merchantProfile.defaultBillingCycle;
    preferredAlertChannels = merchantProfile.preferredAlertChannels;
    resolvedCategory = merchantProfile.defaultCategory || extraction.category;
    resolvedCurrency = merchantProfile.defaultCurrency || extraction.currency;
    policyNotes = `Auto-applied from Merchant Memory (${merchantProfile.usageCount} prior receipt${merchantProfile.usageCount === 1 ? '' : 's'} at ${merchantProfile.displayName})`;
  } else if (
    // Priority 2: Explicit Policy Printed on Receipt
    extraction.explicitReturnDaysOnReceipt !== null ||
    extraction.explicitWarrantyMonthsOnReceipt !== null
  ) {
    source = 'RECEIPT_EXPLICIT';
    returnWindowDays =
      extraction.explicitReturnDaysOnReceipt ?? (kbRule?.returnWindowDays ?? 14);
    warrantyMonths =
      extraction.explicitWarrantyMonthsOnReceipt ??
      (kbRule?.warrantyMonths ?? (extraction.kind === 'PHYSICAL_ASSET' ? 12 : 0));
    if (kbRule && billingCycle === 'NONE') {
      billingCycle = kbRule.billingCycle;
    }
    policyNotes = 'Extracted directly from policy terms printed on receipt';
  } else if (kbRule) {
    // Priority 3: Built-in 100+ Merchant Knowledge Base
    source = 'MERCHANT_KB';
    returnWindowDays = kbRule.returnWindowDays;
    warrantyMonths = kbRule.warrantyMonths;
    billingCycle = kbRule.billingCycle;
    resolvedCategory = kbRule.category;
    resolvedCurrency = extraction.currency || kbRule.defaultCurrency;
    policyNotes = kbRule.policySummary;
  } else if (extraction.kind !== 'PHYSICAL_ASSET') {
    returnWindowDays = 0;
    warrantyMonths = 0;
    billingCycle = extraction.billingCycle === 'NONE' ? 'MONTHLY' : extraction.billingCycle;
    policyNotes = 'Recurring subscription / utility cycle alert';
  }

  // Compute deterministic UTC deadline timestamps (end-of-day 23:59:59 UTC on purchase date baseline)
  const purchaseDate = new Date(`${extraction.purchaseDateISO}T12:00:00.000Z`);
  const validPurchaseDate = Number.isNaN(purchaseDate.getTime()) ? new Date() : purchaseDate;

  const returnDeadline =
    returnWindowDays > 0 ? addDaysUTC(validPurchaseDate, returnWindowDays) : null;
  const warrantyExpiryDate =
    warrantyMonths > 0 ? addMonthsUTC(validPurchaseDate, warrantyMonths) : null;

  let nextRenewalDate: Date | null = null;
  let cancelByDate: Date | null = null;
  if (billingCycle === 'MONTHLY') {
    nextRenewalDate = addMonthsUTC(validPurchaseDate, 1);
    cancelByDate = addDaysUTC(nextRenewalDate, -2);
  } else if (billingCycle === 'YEARLY') {
    nextRenewalDate = addMonthsUTC(validPurchaseDate, 12);
    cancelByDate = addDaysUTC(nextRenewalDate, -3);
  }

  return {
    policy: {
      source,
      returnWindowDays,
      warrantyMonths,
      billingCycle,
      preferredAlertChannels,
      policyNotes,
      returnDeadlineISO: returnDeadline ? returnDeadline.toISOString() : null,
      warrantyExpiryDateISO: warrantyExpiryDate ? warrantyExpiryDate.toISOString() : null,
      nextRenewalDateISO: nextRenewalDate ? nextRenewalDate.toISOString() : null,
      cancelByDateISO: cancelByDate ? cancelByDate.toISOString() : null,
    },
    resolvedCategory,
    resolvedCurrency,
    dates: {
      purchaseDate: validPurchaseDate,
      returnDeadline,
      warrantyExpiryDate,
      nextRenewalDate,
      cancelByDate,
    },
  };
}
