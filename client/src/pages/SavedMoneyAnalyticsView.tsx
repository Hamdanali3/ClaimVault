import { RotateCcw, FileDown } from 'lucide-react';
import type { VaultItemDTO } from '@claimvault/shared';
import { TabularPrice } from '../components/atoms/TabularPrice';
import { CountdownBadge } from '../components/atoms/CountdownBadge';
import { formatMoney, formatShortDate } from '../utils/formatters';

interface SavedMoneyAnalyticsViewProps {
  resolvedItems: VaultItemDTO[];
  totalSavedPkr: number;
  firstVisitAvgSeconds: number;
  repeatVelocityAvgSeconds: number;
  onSelectItem: (item: VaultItemDTO) => void;
  onRestoreItem: (item: VaultItemDTO) => void;
  onDownloadClaimPdf: (item: VaultItemDTO) => void;
}

export function SavedMoneyAnalyticsView({
  resolvedItems,
  totalSavedPkr,
  firstVisitAvgSeconds,
  repeatVelocityAvgSeconds,
  onSelectItem,
  onRestoreItem,
  onDownloadClaimPdf,
}: SavedMoneyAnalyticsViewProps) {
  const reductionPct = Math.round(
    ((firstVisitAvgSeconds - repeatVelocityAvgSeconds) /
      Math.max(1, firstVisitAvgSeconds)) *
      100,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#065F46]">
            Total Financial Leakage Prevented
          </div>
          <div className="mt-1 text-2xl font-semibold text-[#065F46] tabular-ledger">
            {formatMoney(totalSavedPkr, 'PKR')}
          </div>
          <p className="mt-1 text-xs text-[#065F46]/90">
            Recovered via timely return windows, warranty claims, and cancelled auto-renewals.
          </p>
        </div>

        <div className="rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#615F59]">
            Adaptive Task Compression (Power Law of Practice)
          </div>
          <div className="mt-1 flex items-baseline gap-2 text-2xl font-semibold text-[#141413] tabular-ledger">
            <span>{firstVisitAvgSeconds}s</span>
            <span className="text-sm font-normal text-[#615F59]">→</span>
            <span className="text-[#065F46]">{repeatVelocityAvgSeconds}s</span>
            <span className="ml-1 rounded border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 py-0.5 text-xs font-medium text-[#065F46]">
              {reductionPct}% faster
            </span>
          </div>
          <p className="mt-1 text-xs text-[#615F59]">
            Measured transition from Visit 1 guided verification to Visit 2+ Merchant Memory express commit.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]">
        <div className="border-b border-[#E6E4DD] bg-[#F3F1EC] px-4 py-2.5 text-xs font-semibold text-[#141413]">
          Resolved Claims, Returns & Cancelled Subscriptions
        </div>

        {resolvedItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#615F59]">
            No resolved claims or cancelled trials yet. Mark an item returned or claimed to record savings here.
          </div>
        ) : (
          <div className="divide-y divide-[#E6E4DD]">
            {resolvedItems.map((item) => (
              <div
                key={item._id}
                className="flex flex-col justify-between gap-3 p-4 hover:bg-[#FAF9F6] sm:flex-row sm:items-center"
              >
                <div
                  onClick={() => onSelectItem(item)}
                  className="min-w-0 flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#141413] hover:underline">
                      {item.title}
                    </span>
                    <CountdownBadge item={item} />
                  </div>
                  <div className="text-xs text-[#615F59]">
                    {item.merchantName} · Resolved{' '}
                    {formatShortDate(item.outcome.resolvedAt ?? item.updatedAt)}
                    {item.outcome.resolutionNotes && ` · ${item.outcome.resolutionNotes}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TabularPrice
                    amount={item.outcome.moneySavedOrRecovered || item.financials.amount}
                    currency={item.financials.currency}
                    className="mr-2 text-sm font-semibold text-[#065F46]"
                  />
                  <button
                    type="button"
                    onClick={() => onDownloadClaimPdf(item)}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2.5 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC]"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRestoreItem(item)}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs font-medium text-[#615F59] hover:text-[#141413]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
