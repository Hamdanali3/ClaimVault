import {
  Search,
  Timer,
  Zap,
  UserCheck,
  WifiOff,
  RotateCcw,
} from 'lucide-react';
import type { DashboardResponseDTO } from '@claimvault/shared';
import type { LedgerTab } from '../../store/useVaultStore';
import { formatMoney } from '../../utils/formatters';

interface TopLedgerHeaderProps {
  dashboard: DashboardResponseDTO | null;
  activeTab: LedgerTab;
  onSelectTab: (tab: LedgerTab) => void;
  onOpenCommandPalette: () => void;
  onOpenAuthModal: () => void;
  onSimulateVisit1: () => void;
  onSimulateVisit2: () => void;
  onResetDemo: () => void;
  isIngesting: boolean;
  isOfflineFallback: boolean;
  isDemoWorkspace: boolean;
  userName?: string;
}

export function TopLedgerHeader({
  dashboard,
  activeTab,
  onSelectTab,
  onOpenCommandPalette,
  onOpenAuthModal,
  onSimulateVisit1,
  onSimulateVisit2,
  onResetDemo,
  isIngesting,
  isOfflineFallback,
  isDemoWorkspace,
  userName,
}: TopLedgerHeaderProps) {
  const metrics = dashboard?.metrics;

  const tabs: Array<{ id: LedgerTab; label: string; count?: number }> = [
    {
      id: 'ACTION_NEEDED',
      label: 'Action Needed',
      count: metrics?.urgentCount ?? 0,
    },
    {
      id: 'VAULT',
      label: 'Vault',
      count: metrics?.activeCount ?? 0,
    },
    {
      id: 'SAVED_MONEY',
      label: 'Saved Money',
      count: metrics?.resolvedCount ?? 0,
    },
  ];

  return (
    <header className="border-b border-[#E6E4DD] bg-[#FFFFFF]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top Utility Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded border border-[#141413] bg-[#141413] text-xs font-bold text-[#FAF9F6] tabular-ledger">
                CV
              </div>
              <span className="text-base font-semibold tracking-tight text-[#141413]">
                ClaimVault
              </span>
            </div>

            <span className="hidden rounded border border-[#E6E4DD] bg-[#F3F1EC] px-2 py-0.5 text-[11px] font-medium text-[#615F59] sm:inline-block">
              {dashboard?.household.name ?? 'Personal Proof Ledger'}
            </span>

            {isOfflineFallback && (
              <span className="inline-flex items-center gap-1 rounded border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-medium text-[#92400E]">
                <WifiOff className="h-3 w-3" />
                Offline Proof Cache
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 60s vs 20s Speed Demo Interactive Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] p-1">
              <span className="hidden px-1.5 text-[11px] font-medium text-[#615F59] lg:inline">
                Speed Demo:
              </span>
              <button
                type="button"
                disabled={isIngesting}
                onClick={onSimulateVisit1}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2.5 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC] disabled:opacity-50"
              >
                <Timer className="h-3.5 w-3.5 text-[#92400E]" />
                <span>Simulate 1st Visit (New Merchant)</span>
              </button>
              <button
                type="button"
                disabled={isIngesting}
                onClick={onSimulateVisit2}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded border border-[#141413] bg-[#141413] px-2.5 text-xs font-medium text-[#FAF9F6] hover:bg-[#2A2A28] disabled:opacity-50"
              >
                <Zap className="h-3.5 w-3.5 text-[#A7F3D0]" />
                <span>Simulate 2nd Visit (Known Merchant: Daraz)</span>
              </button>
              {isDemoWorkspace && (
                <button
                  type="button"
                  onClick={onResetDemo}
                  title="Reset Demo Workspace to original 4 seeded items"
                  className="inline-flex min-h-[34px] items-center gap-1 rounded px-2 text-xs text-[#615F59] hover:bg-[#F3F1EC] hover:text-[#141413]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#615F59] hover:border-[#141413] hover:text-[#141413]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="rounded border border-[#E6E4DD] bg-[#FFFFFF] px-1 text-[10px] tabular-ledger">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[#E6E4DD] bg-[#FFFFFF] px-2.5 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC]"
            >
              <UserCheck className="h-3.5 w-3.5 text-[#615F59]" />
              <span className="hidden md:inline">
                {isDemoWorkspace ? 'Demo Account' : userName || 'Household'}
              </span>
            </button>
          </div>
        </div>

        {/* Tufte High-Data-Ink KPI Ledger Strip */}
        <div className="grid grid-cols-2 divide-x divide-y divide-[#E6E4DD] rounded-md border border-[#E6E4DD] bg-[#FAF9F6] sm:grid-cols-4 sm:divide-y-0">
          <div className="px-3.5 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
              Money at Risk (14d)
            </div>
            <div className="mt-0.5 text-lg font-semibold text-[#991B1B] tabular-ledger">
              {formatMoney(metrics?.moneyAtRiskNext14Days ?? 0, 'PKR')}
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
              Protected Asset Value
            </div>
            <div className="mt-0.5 text-lg font-semibold text-[#141413] tabular-ledger">
              {formatMoney(metrics?.totalProtectedAssetValue ?? 0, 'PKR')}
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
              Saved & Recovered
            </div>
            <div className="mt-0.5 text-lg font-semibold text-[#065F46] tabular-ledger">
              {formatMoney(metrics?.totalMoneySavedOrRecovered ?? 0, 'PKR')}
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
              Visit 1 → Repeat Velocity
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5 text-lg font-semibold text-[#141413] tabular-ledger">
              <span>{metrics?.firstVisitAvgSeconds ?? 58}s</span>
              <span className="text-xs font-normal text-[#615F59]">→</span>
              <span className="text-[#065F46]">{metrics?.repeatVelocityAvgSeconds ?? 18}s</span>
            </div>
          </div>
        </div>

        {/* Steve Krug 3-Tab Self-Evident Navigation */}
        <nav
          aria-label="Primary ledger views"
          className="mt-3 flex items-center gap-6"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex min-h-[42px] items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[#141413] text-[#141413]'
                    : 'border-transparent text-[#615F59] hover:text-[#141413]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-ledger ${
                    active
                      ? 'bg-[#141413] text-[#FAF9F6]'
                      : 'bg-[#F3F1EC] text-[#615F59]'
                  }`}
                >
                  {tab.count ?? 0}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
