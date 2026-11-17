import { useState } from 'react';
import { FileDown, CheckCircle2, Ban, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { VaultItemDTO } from '@claimvault/shared';
import { CountdownBadge } from '../atoms/CountdownBadge';
import { TabularPrice } from '../atoms/TabularPrice';
import { HotkeyHint } from '../atoms/HotkeyHint';
import { formatShortDate } from '../../utils/formatters';

interface UrgentDeadlineCardProps {
  item: VaultItemDTO;
  onInspect: (item: VaultItemDTO) => void;
  onDownloadClaimPdf: (item: VaultItemDTO) => void;
  onResolveOutcome: (item: VaultItemDTO) => void;
}

export function UrgentDeadlineCard({
  item,
  onInspect,
  onDownloadClaimPdf,
  onResolveOutcome,
}: UrgentDeadlineCardProps) {
  const [hoverPrimary, setHoverPrimary] = useState(false);
  const [hoverSecondary, setHoverSecondary] = useState(false);

  const isCritical = item.urgencyLevel === 'CRITICAL';
  const isSubscription = item.kind === 'SUBSCRIPTION';

  const cardSurface = isCritical
    ? 'border-[#FECACA] bg-[#FFFFFF]'
    : 'border-[#FDE68A] bg-[#FFFFFF]';

  const topRibbon = isCritical
    ? 'border-b border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
    : 'border-b border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]';

  const primaryLabel = isSubscription
    ? 'Log Cancellation'
    : item.nextDeadlineType === 'RETURN'
      ? 'Mark Returned'
      : 'Claim Warranty PDF';

  const alertHeadline =
    item.nextDeadlineType === 'RETURN'
      ? `Return window for ${item.title} closes in ${Math.max(1, Math.round(item.hoursRemaining ?? 0))} hours (${item.financials.currency} ${item.financials.amount.toLocaleString()}).`
      : item.nextDeadlineType === 'RENEWAL'
        ? `Auto-renewal for ${item.title} triggers in ${Math.max(1, Math.round(item.hoursRemaining ?? 0))} hours (${item.financials.currency} ${item.financials.amount.toLocaleString()}).`
        : `Warranty coverage for ${item.title} ends on ${formatShortDate(item.dates.warrantyExpiryDate)}.`;

  return (
    <article
      className={`overflow-hidden rounded-lg border ${cardSurface} transition-colors duration-150`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs ${topRibbon}`}>
        <span className="font-medium">{alertHeadline}</span>
        <CountdownBadge item={item} />
      </div>

      <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
        <div
          onClick={() => onInspect(item)}
          className="min-w-0 flex-1 cursor-pointer space-y-1.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[#141413] hover:underline">
              {item.title}
            </h3>
            {item.aiMetadata.merchantMemoryApplied && (
              <span className="inline-flex items-center gap-1 rounded border border-[#E6E4DD] bg-[#F3F1EC] px-1.5 py-0.5 text-[11px] font-medium text-[#615F59]">
                <ShieldCheck className="h-3 w-3 text-[#065F46]" />
                Merchant Memory
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#615F59]">
            <span className="font-medium text-[#141413]">{item.merchantName}</span>
            <span>Purchased {formatShortDate(item.dates.purchaseDate)}</span>
            {item.identifiers.orderNumber && (
              <span className="tabular-ledger">Order #{item.identifiers.orderNumber}</span>
            )}
            {item.identifiers.serialNumber && (
              <span className="tabular-ledger">S/N {item.identifiers.serialNumber}</span>
            )}
          </div>
        </div>

        {/* Spatially invariant action cluster (Fitts's Law >= 44px height) */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <div className="mr-2 text-right">
            <TabularPrice
              amount={item.financials.amount}
              currency={item.financials.currency}
              className="text-base font-semibold text-[#141413]"
            />
            <div className="text-[11px] text-[#615F59] tabular-ledger">
              {item.nextDeadlineDate ? `Due ${formatShortDate(item.nextDeadlineDate)}` : 'Protected'}
            </div>
          </div>

          {!isSubscription && (
            <button
              type="button"
              onMouseEnter={() => setHoverSecondary(true)}
              onMouseLeave={() => setHoverSecondary(false)}
              onClick={() => onDownloadClaimPdf(item)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-3.5 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC] focus:outline-none focus:ring-2 focus:ring-[#141413]"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Claim PDF</span>
              <HotkeyHint shortcut="C" active={hoverSecondary} />
            </button>
          )}

          <button
            type="button"
            onMouseEnter={() => setHoverPrimary(true)}
            onMouseLeave={() => setHoverPrimary(false)}
            onClick={() =>
              isSubscription || item.nextDeadlineType === 'RETURN'
                ? onResolveOutcome(item)
                : onDownloadClaimPdf(item)
            }
            className="inline-flex min-h-[44px] min-w-[152px] items-center justify-center gap-1.5 rounded-md border border-[#141413] bg-[#141413] px-4 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A28] focus:outline-none focus:ring-2 focus:ring-[#141413]"
          >
            {isSubscription ? (
              <Ban className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>{primaryLabel}</span>
            <HotkeyHint shortcut="R" active={hoverPrimary} />
          </button>

          <button
            type="button"
            onClick={() => onInspect(item)}
            title="Inspect Receipt Proof & Details"
            className="inline-flex min-h-[44px] w-[44px] items-center justify-center rounded-md border border-[#E6E4DD] bg-[#FFFFFF] text-[#615F59] hover:bg-[#F3F1EC] hover:text-[#141413]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
