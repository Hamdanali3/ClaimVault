import { useMemo, useState } from 'react';
import {
  Search,
  ShieldCheck,
  Download,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MerchantProfileDTO, VaultItemDTO, VaultItemKind } from '@claimvault/shared';
import { VaultItemRow } from '../components/molecules/VaultItemRow';
import { CountdownBadge } from '../components/atoms/CountdownBadge';
import { TabularPrice } from '../components/atoms/TabularPrice';
import { formatShortDate } from '../utils/formatters';

interface VaultLedgerViewProps {
  items: VaultItemDTO[];
  merchantProfiles: MerchantProfileDTO[];
  onSelectItem: (item: VaultItemDTO) => void;
  onUpdateMerchantPolicy: (
    id: string,
    payload: {
      defaultReturnWindowDays?: number;
      defaultWarrantyMonths?: number;
      defaultCurrency?: string;
    },
  ) => Promise<void>;
  onDeleteMerchantPolicy: (id: string, displayName: string) => Promise<void>;
}

type SortMode = 'DEADLINE' | 'VALUE_DESC' | 'NEWEST';

function escapeCsvCell(val: string | number | null | undefined): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function VaultLedgerView({
  items,
  merchantProfiles,
  onSelectItem,
  onUpdateMerchantPolicy,
  onDeleteMerchantPolicy,
}: VaultLedgerViewProps) {
  const [filterKind, setFilterKind] = useState<'ALL' | VaultItemKind>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('DEADLINE');

  // Inline merchant editing state
  const [editingMerchantId, setEditingMerchantId] = useState<string | null>(null);
  const [editReturnDays, setEditReturnDays] = useState('14');
  const [editWarrantyMonths, setEditWarrantyMonths] = useState('12');
  const [editCurrency, setEditCurrency] = useState('PKR');
  const [savingMerchant, setSavingMerchant] = useState(false);

  const filteredAndSorted = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filterKind !== 'ALL' && item.kind !== filterKind) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.merchantName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.identifiers.serialNumber?.toLowerCase().includes(q) ?? false) ||
        (item.identifiers.orderNumber?.toLowerCase().includes(q) ?? false)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'VALUE_DESC') {
        return b.financials.amount - a.financials.amount;
      }
      if (sortBy === 'NEWEST') {
        return (
          new Date(b.dates.purchaseDate).getTime() - new Date(a.dates.purchaseDate).getTime()
        );
      }
      // DEADLINE (nearest remaining hours first)
      const ha = a.hoursRemaining ?? Number.POSITIVE_INFINITY;
      const hb = b.hoursRemaining ?? Number.POSITIVE_INFINITY;
      return ha - hb;
    });
  }, [items, filterKind, search, sortBy]);

  const handleExportCsv = () => {
    if (filteredAndSorted.length === 0) {
      toast('No vault items to export.');
      return;
    }
    const headers = [
      'Title',
      'Merchant',
      'Category',
      'Type',
      'Amount',
      'Currency',
      'Purchase Date',
      'Return Deadline',
      'Warranty Expiry',
      'Next Renewal',
      'Order #',
      'Serial #',
      'Status',
      'SHA-256 Proof',
    ];
    const rows = filteredAndSorted.map((item) => [
      item.title,
      item.merchantName,
      item.category,
      item.kind,
      item.financials.amount,
      item.financials.currency,
      item.dates.purchaseDate.slice(0, 10),
      item.dates.returnDeadline?.slice(0, 10) ?? '',
      item.dates.warrantyExpiryDate?.slice(0, 10) ?? '',
      item.dates.nextRenewalDate?.slice(0, 10) ?? '',
      item.identifiers.orderNumber ?? '',
      item.identifiers.serialNumber ?? '',
      item.status,
      item.proofFiles?.[0]?.sha256Hash ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map(escapeCsvCell).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claimvault-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success(`Exported ${filteredAndSorted.length} ledger rows to CSV.`);
  };

  const beginEditMerchant = (m: MerchantProfileDTO) => {
    setEditingMerchantId(m._id);
    setEditReturnDays(String(m.defaultReturnWindowDays));
    setEditWarrantyMonths(String(m.defaultWarrantyMonths));
    setEditCurrency(m.defaultCurrency);
  };

  const saveEditMerchant = async (id: string) => {
    setSavingMerchant(true);
    try {
      await onUpdateMerchantPolicy(id, {
        defaultReturnWindowDays: Math.max(0, Math.min(365, Number.parseInt(editReturnDays, 10) || 0)),
        defaultWarrantyMonths: Math.max(0, Math.min(240, Number.parseInt(editWarrantyMonths, 10) || 0)),
        defaultCurrency: editCurrency,
      });
      setEditingMerchantId(null);
    } finally {
      setSavingMerchant(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]">
        <div className="flex flex-col gap-2.5 border-b border-[#E6E4DD] bg-[#F3F1EC] px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:flex-initial sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#615F59]" />
              <label htmlFor="vault-ledger-search" className="sr-only">
                Filter vault items
              </label>
              <input
                id="vault-ledger-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by item, merchant, serial #..."
                className="h-8 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] pl-8 pr-3 text-xs text-[#141413] placeholder:text-[#615F59] focus:border-[#141413] focus:outline-none"
              />
            </div>

            <label htmlFor="vault-sort-select" className="sr-only">
              Sort vault items
            </label>
            <select
              id="vault-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              className="h-8 rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
            >
              <option value="DEADLINE">Sort: Nearest Window</option>
              <option value="VALUE_DESC">Sort: Highest Value</option>
              <option value="NEWEST">Sort: Newest Purchase</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2.5 text-xs font-medium text-[#141413] hover:bg-[#FAF9F6]"
            >
              <Download className="h-3.5 w-3.5 text-[#615F59]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#615F59]">
            No matching items in the Vault ledger. Drop a receipt above or paste an order message to add one.
          </div>
        ) : (
          <>
            {/* Mobile Zero-Overflow Card List */}
            <div className="divide-y divide-[#E6E4DD] md:hidden">
              {filteredAndSorted.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="flex w-full items-start justify-between gap-3 p-3.5 text-left hover:bg-[#FAF9F6]"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[#E6E4DD] bg-[#F3F1EC] text-[#615F59]">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#141413]">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#615F59]">
                          {item.merchantName} · {formatShortDate(item.dates.purchaseDate)}
                        </div>
                      </div>
                    </div>

                    {(item.identifiers.orderNumber || item.identifiers.serialNumber) && (
                      <div className="flex flex-wrap gap-2 pl-9 text-[11px] text-[#615F59] tabular-ledger">
                        {item.identifiers.orderNumber && <span>#{item.identifiers.orderNumber}</span>}
                        {item.identifiers.serialNumber && (
                          <span>S/N {item.identifiers.serialNumber}</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pl-9 pt-0.5">
                      <CountdownBadge item={item} />
                      <TabularPrice
                        amount={item.financials.amount}
                        currency={item.financials.currency}
                        className="text-xs font-semibold text-[#141413]"
                      />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#615F59]" />
                </button>
              ))}
            </div>

            {/* Desktop Swiss Ledger Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E6E4DD] bg-[#FAF9F6] text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
                    <th className="px-4 py-2.5">Item & Proof Identifiers</th>
                    <th className="px-4 py-2.5">Purchased</th>
                    <th className="px-4 py-2.5">Next Window</th>
                    <th className="px-4 py-2.5 text-right">Value</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((item) => (
                    <VaultItemRow key={item._id} item={item} onSelect={onSelectItem} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Merchant Fingerprint Memory Table + Inline Policy Editor */}
      <div className="overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E4DD] bg-[#F3F1EC] px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#141413]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#065F46]" />
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
          <>
            {/* Mobile Zero-Overflow Merchant Cards */}
            <div className="divide-y divide-[#E6E4DD] md:hidden">
              {merchantProfiles.map((m) => {
                const isEditing = editingMerchantId === m._id;
                return (
                  <div key={m._id} className="space-y-2 p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#141413]">{m.displayName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded border border-[#E6E4DD] bg-[#FAF9F6] px-1.5 py-0.5 text-[11px] text-[#615F59] tabular-ledger">
                          {m.usageCount}× matched
                        </span>
                        {!isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => beginEditMerchant(m)}
                              aria-label={`Edit policy for ${m.displayName}`}
                              className="rounded border border-[#E6E4DD] p-1 text-[#615F59] hover:text-[#141413]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteMerchantPolicy(m._id, m.displayName)}
                              aria-label={`Delete policy for ${m.displayName}`}
                              className="rounded border border-[#E6E4DD] p-1 text-[#991B1B] hover:bg-[#FEF2F2]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] p-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] uppercase text-[#615F59]">Return (d)</label>
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={editReturnDays}
                              onChange={(e) => setEditReturnDays(e.target.value)}
                              className="mt-0.5 h-8 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2 text-xs tabular-ledger"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-[#615F59]">Warranty (m)</label>
                            <input
                              type="number"
                              min="0"
                              max="240"
                              value={editWarrantyMonths}
                              onChange={(e) => setEditWarrantyMonths(e.target.value)}
                              className="mt-0.5 h-8 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2 text-xs tabular-ledger"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-[#615F59]">Currency</label>
                            <select
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value)}
                              className="mt-0.5 h-8 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-1.5 text-xs tabular-ledger"
                            >
                              <option value="PKR">PKR</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="AED">AED</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingMerchantId(null)}
                            className="rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2.5 py-1 text-xs text-[#615F59]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingMerchant}
                            onClick={() => void saveEditMerchant(m._id)}
                            className="rounded bg-[#141413] px-2.5 py-1 text-xs font-medium text-[#FAF9F6]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#615F59] tabular-ledger">
                        <span>Return: {m.defaultReturnWindowDays}d</span>
                        <span>Warranty: {m.defaultWarrantyMonths}m</span>
                        <span>Currency: {m.defaultCurrency}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E6E4DD] bg-[#FAF9F6] text-[11px] font-medium uppercase tracking-wider text-[#615F59]">
                    <th className="px-4 py-2">Merchant</th>
                    <th className="px-4 py-2">Return Window</th>
                    <th className="px-4 py-2">Warranty</th>
                    <th className="px-4 py-2">Default Currency</th>
                    <th className="px-4 py-2 text-right">Uploads Matched</th>
                    <th className="px-4 py-2 text-right">Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {merchantProfiles.map((m) => {
                    const isEditing = editingMerchantId === m._id;
                    return (
                      <tr key={m._id} className="border-b border-[#E6E4DD] last:border-b-0">
                        <td className="px-4 py-2.5 font-medium text-[#141413]">
                          {m.displayName}
                        </td>
                        <td className="px-4 py-2.5 tabular-ledger">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={editReturnDays}
                              onChange={(e) => setEditReturnDays(e.target.value)}
                              aria-label={`Return window days for ${m.displayName}`}
                              className="h-7 w-16 rounded border border-[#141413] bg-[#FAF9F6] px-2 text-xs tabular-ledger"
                            />
                          ) : (
                            `${m.defaultReturnWindowDays} days`
                          )}
                        </td>
                        <td className="px-4 py-2.5 tabular-ledger">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="240"
                              value={editWarrantyMonths}
                              onChange={(e) => setEditWarrantyMonths(e.target.value)}
                              aria-label={`Warranty months for ${m.displayName}`}
                              className="h-7 w-16 rounded border border-[#141413] bg-[#FAF9F6] px-2 text-xs tabular-ledger"
                            />
                          ) : (
                            `${m.defaultWarrantyMonths} months`
                          )}
                        </td>
                        <td className="px-4 py-2.5 tabular-ledger">
                          {isEditing ? (
                            <select
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value)}
                              aria-label={`Default currency for ${m.displayName}`}
                              className="h-7 rounded border border-[#141413] bg-[#FAF9F6] px-1.5 text-xs tabular-ledger"
                            >
                              <option value="PKR">PKR</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="AED">AED</option>
                            </select>
                          ) : (
                            m.defaultCurrency
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-ledger">
                          {m.usageCount}×
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={savingMerchant}
                                onClick={() => void saveEditMerchant(m._id)}
                                aria-label="Save merchant policy"
                                className="rounded bg-[#141413] p-1.5 text-[#FAF9F6] hover:bg-[#2A2A28]"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMerchantId(null)}
                                aria-label="Cancel merchant policy edit"
                                className="rounded border border-[#E6E4DD] p-1.5 text-[#615F59] hover:text-[#141413]"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => beginEditMerchant(m)}
                                aria-label={`Edit policy for ${m.displayName}`}
                                title="Edit Merchant Policy"
                                className="rounded border border-[#E6E4DD] p-1.5 text-[#615F59] hover:bg-[#F3F1EC] hover:text-[#141413]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void onDeleteMerchantPolicy(m._id, m.displayName)}
                                aria-label={`Delete policy for ${m.displayName}`}
                                title="Delete Learned Policy"
                                className="rounded border border-[#E6E4DD] p-1.5 text-[#991B1B] hover:bg-[#FEF2F2]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
