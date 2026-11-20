import {
  Search,
  Timer,
  Zap,
  UserCheck,
  WifiOff,
  RotateCcw,
  AlertTriangle,
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
  apiError: string | null;
  isDemoWorkspace: boolean;
  userName?: string;
}

function formatCurrencyBreakdown(byCurrency?: Record<string, number>): string | null {
  if (!byCurrency) return null;
  const entries = Object.entries(byCurrency).filter(([, amount]) => amount > 0);
  if (entries.length <= 1 && (entries.length === 0 || entries[0][0] === 'PKR')) {
    return null;
  }
  return entries.map(([cur, amt]) => formatMoney(amt, cur)).join(' + ');
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
  apiError,
  isDemoWorkspace,
  userName,
}: TopLedgerHeaderProps) {
  const metrics = dashboard?.metrics;

  const tabs: Array<{ id: LedgerTab; label: string; count: number }> = [
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

  const riskSubtext = formatCurrencyBreakdown(metrics?.moneyAtRiskByCurrency);
  const protectedSubtext = formatCurrencyBreakdown(metrics?.protectedValueByCurrency);
  const savedSubtext = formatCurrencyBreakdown(metrics?.savedByCurrency);

  return (
    <header className="border-b border-[#E6E4DD] bg-[#FFFFFF]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top Utility Row */}
        <div className="flex flex-col gap-2 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:py-3">
          {/* Left brand + workspace + status + mobile quick actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded border border-[#141413] bg-[#141413] text-xs font-bold text-[#FAF9F6] tabular-ledger">
                  CV
                </div>
                <span className="text-base font-semibold tracking-tight text-[#141413]">
                  ClaimVault
                </span>
              </div>

              <span className="hidden max-w-[170px] truncate rounded border border-[#E6E4DD] bg-[#F3F1EC] px-2 py-0.5 text-[11px] font-medium text-[#615F59] sm:inline-block lg:max-w-[180px]">
                {dashboard?.household.name ?? 'Personal Proof Ledger'}
              </span>

              {dashboard?.systemStatus && !isOfflineFallback && !apiError && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  title="View connected database, queue, and AI pipeline status"
                  className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#065F46] hover:bg-[#D1FAE5] xl:inline-flex"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#065F46]" />
                  <span className="tabular-ledger">
                    {dashboard.systemStatus.databaseMode === 'atlas' ? 'Atlas' : 'Local DB'}
                    {' · '}
                    {dashboard.systemStatus.aiMode === 'gemini-vision'
                      ? 'Gemini'
                      : dashboard.systemStatus.aiMode === 'openai-vision'
                        ? 'OpenAI'
                        : 'Local OCR'}
                  </span>
                </button>
              )}

              {isOfflineFallback ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-medium text-[#92400E]">
                  <WifiOff className="h-3 w-3" />
                  <span>Offline Cache</span>
                </span>
              ) : apiError ? (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-medium text-[#991B1B]"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>API Offline</span>
                </button>
              ) : null}
            </div>

            {/* Mobile-only Search & Account buttons aligned neatly on Row 1 */}
            <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                aria-label="Search vault and open command palette"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E6E4DD] bg-[#FAF9F6] text-[#615F59] hover:border-[#141413] hover:text-[#141413]"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenAuthModal}
                aria-label="Open household and account workspace"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E6E4DD] bg-[#FFFFFF] text-[#141413] hover:bg-[#F3F1EC]"
              >
                <UserCheck className="h-4 w-4 text-[#615F59]" />
              </button>
            </div>
          </div>

          {/* Right action cluster: Speed Demo + desktop Search & Account */}
          <div className="flex items-center gap-2">
            {/* 60s vs 20s Speed Demo Interactive Switcher */}
            <div className="flex flex-1 items-center gap-1.5 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] p-1 lg:flex-initial">
              <span className="hidden whitespace-nowrap px-1 text-[11px] font-medium text-[#615F59] 2xl:inline">
                Speed Demo:
              </span>
              <button
                type="button"
                disabled={isIngesting}
                onClick={onSimulateVisit1}
                title="Simulate 1st Visit (New Merchant)"
                className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC] disabled:opacity-50 lg:flex-initial lg:px-2.5"
              >
                <Timer className="h-3.5 w-3.5 shrink-0 text-[#92400E]" />
                <span className="sm:hidden">1st Visit</span>
                <span className="hidden sm:inline">Simulate 1st Visit</span>
              </button>
              <button
                type="button"
                disabled={isIngesting}
                onClick={onSimulateVisit2}
                title="Simulate 2nd Visit (Known Merchant: Daraz)"
                className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded border border-[#141413] bg-[#141413] px-2 text-xs font-medium text-[#FAF9F6] hover:bg-[#2A2A28] disabled:opacity-50 lg:flex-initial lg:px-2.5"
              >
                <Zap className="h-3.5 w-3.5 shrink-0 text-[#A7F3D0]" />
                <span className="sm:hidden">2nd Visit: Daraz</span>
                <span className="hidden sm:inline">Simulate 2nd Visit (Daraz)</span>
              </button>
              {isDemoWorkspace && (
                <button
                  type="button"
                  onClick={onResetDemo}
                  aria-label="Reset Demo Workspace to original 4 seeded items"
                  title="Reset Demo Workspace to original 4 seeded items"
                  className="inline-flex min-h-[34px] w-[34px] shrink-0 items-center justify-center rounded text-xs text-[#615F59] hover:bg-[#F3F1EC] hover:text-[#141413]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Search & Account buttons */}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Search vault and open command palette"
              className="hidden min-h-[36px] shrink-0 items-center gap-2 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#615F59] hover:border-[#141413] hover:text-[#141413] lg:inline-flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-[#E6E4DD] bg-[#FFFFFF] px-1 text-[10px] tabular-ledger">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={onOpenAuthModal}
              aria-label="Open household and account workspace"
              className="hidden min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#E6E4DD] bg-[#FFFFFF] px-2.5 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC] lg:inline-flex"
            >
              <UserCheck className="h-3.5 w-3.5 text-[#615F59]" />
              <span>{isDemoWorkspace ? 'Demo Account' : userName || 'Household'}</span>
            </button>
          </div>
        </div>

        {/* Tufte High-Data-Ink KPI Ledger Strip */}
        <div className="grid grid-cols-2 divide-x divide-y divide-[#E6E4DD] rounded-md border border-[#E6E4DD] bg-[#FAF9F6] sm:grid-cols-4 sm:divide-y-0">
          <div className="px-3 py-2 sm:px-3.5 sm:py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#615F59] sm:text-[11px]">
              Money at Risk (14d)
            </div>
            <div className="mt-0.5 text-base font-semibold text-[#991B1B] sm:text-lg tabular-ledger">
              {formatMoney(metrics?.moneyAtRiskNext14Days ?? 0, 'PKR')}
            </div>
            {riskSubtext && (
              <div className="truncate text-[10px] text-[#615F59] tabular-ledger" title={riskSubtext}>
                {riskSubtext}
              </div>
            )}
          </div>

          <div className="px-3 py-2 sm:px-3.5 sm:py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#615F59] sm:text-[11px]">
              Protected Asset Value
            </div>
            <div className="mt-0.5 text-base font-semibold text-[#141413] sm:text-lg tabular-ledger">
              {formatMoney(metrics?.totalProtectedAssetValue ?? 0, 'PKR')}
            </div>
            {protectedSubtext && (
              <div className="truncate text-[10px] text-[#615F59] tabular-ledger" title={protectedSubtext}>
                {protectedSubtext}
              </div>
            )}
          </div>

          <div className="px-3 py-2 sm:px-3.5 sm:py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#615F59] sm:text-[11px]">
              Saved & Recovered
            </div>
            <div className="mt-0.5 text-base font-semibold text-[#065F46] sm:text-lg tabular-ledger">
              {formatMoney(metrics?.totalMoneySavedOrRecovered ?? 0, 'PKR')}
            </div>
            {savedSubtext && (
              <div className="truncate text-[10px] text-[#615F59] tabular-ledger" title={savedSubtext}>
                {savedSubtext}
              </div>
            )}
          </div>

          <div className="px-3 py-2 sm:px-3.5 sm:py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#615F59] sm:text-[11px]">
              Visit 1 → Repeat Velocity
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5 text-base font-semibold text-[#141413] sm:text-lg tabular-ledger">
              <span>{metrics?.firstVisitAvgSeconds ?? 58}s</span>
              <span className="text-xs font-normal text-[#615F59]">→</span>
              <span className="text-[#065F46]">{metrics?.repeatVelocityAvgSeconds ?? 18}s</span>
            </div>
          </div>
        </div>

        {/* Steve Krug 3-Tab Self-Evident Navigation */}
        <nav
          aria-label="Primary ledger views"
          className="mt-2.5 flex items-center gap-4 overflow-x-auto sm:mt-3 sm:gap-6"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex min-h-[42px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-xs font-medium transition-colors sm:gap-2 sm:text-sm ${
                  active
                    ? 'border-[#141413] text-[#141413]'
                    : 'border-transparent text-[#615F59] hover:text-[#141413]'
                }`}
              >
                <span>{tab.label}</span>{' '}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-ledger ${
                    active
                      ? 'bg-[#141413] text-[#FAF9F6]'
                      : 'bg-[#F3F1EC] text-[#615F59]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
