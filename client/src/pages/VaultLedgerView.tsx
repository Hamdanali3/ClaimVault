import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import type { MerchantProfileDTO, VaultItemDTO, VaultItemKind } from '@claimvault/shared';
import { VaultItemRow } from '../components/molecules/VaultItemRow';

interface VaultLedgerViewProps {
  items: VaultItemDTO[];
  merchantProfiles: MerchantProfileDTO[];
  onSelectItem: (item: VaultItemDTO) => void;
}

export function VaultLedgerView({
  items,
  merchantProfiles,
  onSelectItem,
}: VaultLedgerViewProps) {
  const [filterKind, setFilterKind] = useState<'ALL' | VaultItemKind>('ALL');
  const [search, setSearch] = useState('');

  const filtered = items.filter((item) => {
    if (filterKind !== 'ALL' && item.kind !== filterKind) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.merchantName.toLowerCase().includes(q) ||
      (item.identifiers.serialNumber?.toLowerCase().includes(q) ?? false) ||
      (item.identifiers.orderNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E4DD] bg-[#F3F1EC] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'All Protected' },
                { id: 'PHYSICAL_ASSET', label: 'Hardware & Retail' },
                { id: 'SUBSCRIPTION', label: 'Subscriptions' },
                { id: 'UTILITY_BILL', label: 'Bills' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterKind(opt.id)}
                className={`min-h-[32px] rounded px-2.5 text-xs font-medium transition-colors ${
                  filterKind === opt.id
                    ? 'bg-[#141413] text-[#FAF9F6]'
                    : 'bg-[#FFFFFF] text-[#615F59] hover:text-[#141413]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#615F59]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by item, merchant, serial #..."
              className="h-8 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] pl-8 pr-3 text-xs text-[#141413] placeholder:text-[#615F59] focus:border-[#141413] focus:outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#615F59]">
            No matching items in the Vault ledger. Drop a receipt above or press Ctrl+V to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E6E4DD] bg-[#FAF9F6] text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
                  <th className="px-4 py-2.5">Item & Proof Identifiers</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Purchased</th>
                  <th className="px-4 py-2.5">Next Window</th>
                  <th className="px-4 py-2.5 text-right">Value</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <VaultItemRow key={item._id} item={item} onSelect={onSelectItem} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Merchant Fingerprint Memory Table */}
      <div className="overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]">
        <div className="flex items-center justify-between border-b border-[#E6E4DD] bg-[#F3F1EC] px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#141413]">
            <ShieldCheck className="h-4 w-4 text-[#065F46]" />
            <span>Learned Merchant Memory (Powers 20-Second Repeat Capture)</span>
          </div>
          <span className="text-[11px] text-[#615F59] tabular-ledger">
            {merchantProfiles.length} merchants learned
          </span>
        </div>

        {merchantProfiles.length === 0 ? (
          <div className="p-5 text-xs text-[#615F59]">
            Confirm a receipt from any store once to auto-apply its return & warranty policy on future uploads.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E6E4DD] bg-[#FAF9F6] text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
                  <th className="px-4 py-2">Merchant</th>
                  <th className="px-4 py-2">Return Window</th>
                  <th className="px-4 py-2">Warranty</th>
                  <th className="px-4 py-2">Default Currency</th>
                  <th className="px-4 py-2 text-right">Uploads Matched</th>
                </tr>
              </thead>
              <tbody>
                {merchantProfiles.map((m) => (
                  <tr key={m._id} className="border-b border-[#E6E4DD] last:border-b-0">
                    <td className="px-4 py-2.5 font-medium text-[#141413]">
                      {m.displayName}
                    </td>
                    <td className="px-4 py-2.5 tabular-ledger">
                      {m.defaultReturnWindowDays} days
                    </td>
                    <td className="px-4 py-2.5 tabular-ledger">
                      {m.defaultWarrantyMonths} months
                    </td>
                    <td className="px-4 py-2.5 tabular-ledger">{m.defaultCurrency}</td>
                    <td className="px-4 py-2.5 text-right tabular-ledger">
                      {m.usageCount}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
