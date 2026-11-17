import { Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { VaultItemDTO } from '@claimvault/shared';
import { formatCountdownLabel } from '../../utils/formatters';

interface CountdownBadgeProps {
  item: Pick<
    VaultItemDTO,
    'urgencyLevel' | 'hoursRemaining' | 'nextDeadlineType' | 'status'
  >;
}

export function CountdownBadge({ item }: CountdownBadgeProps) {
  if (item.urgencyLevel === 'RESOLVED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-xs font-medium text-[#065F46]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="tabular-ledger">
          {item.status.replace(/_/g, ' ').toLowerCase()}
        </span>
      </span>
    );
  }

  const label = formatCountdownLabel(item.hoursRemaining, item.nextDeadlineType);

  if (item.urgencyLevel === 'CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-xs font-semibold text-[#991B1B]">
        <Clock className="h-3.5 w-3.5" />
        <span className="tabular-ledger">{label}</span>
      </span>
    );
  }

  if (item.urgencyLevel === 'UPCOMING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-xs font-semibold text-[#92400E]">
        <Clock className="h-3.5 w-3.5" />
        <span className="tabular-ledger">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-xs font-medium text-[#065F46]">
      <ShieldCheck className="h-3.5 w-3.5" />
      <span className="tabular-ledger">{label}</span>
    </span>
  );
}
