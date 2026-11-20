import { CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import type { VaultItemDTO } from '@claimvault/shared';
import { UrgentDeadlineCard } from '../components/molecules/UrgentDeadlineCard';

interface ActionNeededViewProps {
  urgentItems: VaultItemDTO[];
  apiError?: string | null;
  onRetryConnection?: () => void;
  onInspect: (item: VaultItemDTO) => void;
  onDownloadClaimPdf: (item: VaultItemDTO) => void;
  onResolveOutcome: (item: VaultItemDTO) => void;
  onGoToVault: () => void;
}

export function ActionNeededView({
  urgentItems,
  apiError,
  onRetryConnection,
  onInspect,
  onDownloadClaimPdf,
  onResolveOutcome,
  onGoToVault,
}: ActionNeededViewProps) {
  if (urgentItems.length === 0) {
    if (apiError) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-8 text-center"
        >
          <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-[#991B1B] stroke-[1.75]" />
          <h2 className="text-sm font-semibold text-[#991B1B]">
            Unable to load active deadlines from ClaimVault API
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#991B1B]/90">
            {apiError}
          </p>
          {onRetryConnection && (
            <button
              type="button"
              onClick={onRetryConnection}
              className="mt-4 inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[#991B1B] bg-[#FFFFFF] px-4 text-xs font-semibold text-[#991B1B] hover:bg-[#FEE2E2]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-[#065F46] stroke-[1.75]" />
        <h2 className="text-sm font-semibold text-[#141413]">
          No deadlines closing in the next 14 days
        </h2>
        <p className="mt-1 text-xs text-[#615F59]">
          Active hardware warranties and recurring subscriptions are monitored automatically.
        </p>
        <button
          type="button"
          onClick={onGoToVault}
          className="mt-4 inline-flex min-h-[38px] items-center rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-3.5 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC]"
        >
          View All Protected Items
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#615F59]">
        <span>
          Sorted by shortest remaining window · T-7d, T-48h, and T-12h reminders armed
        </span>
        <span className="shrink-0 font-medium text-[#141413] tabular-ledger">
          {urgentItems.length} expiring
        </span>
      </div>

      {urgentItems.map((item) => (
        <UrgentDeadlineCard
          key={item._id}
          item={item}
          onInspect={onInspect}
          onDownloadClaimPdf={onDownloadClaimPdf}
          onResolveOutcome={onResolveOutcome}
        />
      ))}
    </div>
  );
}
