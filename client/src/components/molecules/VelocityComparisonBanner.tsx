import { Zap, X } from 'lucide-react';
import type { VelocityComparison } from '../../store/useVaultStore';

interface VelocityComparisonBannerProps {
  banner: VelocityComparison | null;
  onDismiss: () => void;
}

export function VelocityComparisonBanner({
  banner,
  onDismiss,
}: VelocityComparisonBannerProps) {
  if (!banner) return null;
  const pct = Math.round(
    ((banner.visit1Seconds - banner.visit2Seconds) / banner.visit1Seconds) * 100,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-xs text-[#065F46]">
      <div className="flex flex-wrap items-center gap-2">
        <Zap className="h-4 w-4 shrink-0" />
        <span className="font-semibold">
          Repeat Merchant Velocity ({banner.merchantName}):
        </span>
        <span className="tabular-ledger font-semibold">
          {banner.visit1Seconds}s (Visit 1) → {banner.visit2Seconds}s (Visit 2+)
        </span>
        <span>
          — {pct}% faster via Merchant Fingerprint Memory & 1-Click Auto-Save.
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss speed comparison"
        className="rounded p-1 hover:bg-[#A7F3D0]/40"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
