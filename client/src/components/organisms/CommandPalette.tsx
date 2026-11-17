import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import {
  Search,
  FileDown,
  Copy,
  FileText,
  Zap,
  Timer,
  Layers,
} from 'lucide-react';
import type { DashboardResponseDTO, VaultItemDTO } from '@claimvault/shared';
import type { LedgerTab } from '../../store/useVaultStore';
import { formatMoney } from '../../utils/formatters';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard: DashboardResponseDTO | null;
  onSelectItem: (item: VaultItemDTO) => void;
  onDownloadClaimPdf: (item: VaultItemDTO) => void;
  onCopySerial: (serial: string) => void;
  onSwitchTab: (tab: LedgerTab) => void;
  onSimulateVisit1: () => void;
  onSimulateVisit2: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  dashboard,
  onSelectItem,
  onDownloadClaimPdf,
  onCopySerial,
  onSwitchTab,
  onSimulateVisit1,
  onSimulateVisit2,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  const allItems: VaultItemDTO[] = [];
  if (dashboard) {
    const map = new Map<string, VaultItemDTO>();
    for (const i of [...dashboard.allActiveItems, ...dashboard.resolvedItems]) {
      map.set(i._id, i);
    }
    allItems.push(...map.values());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#141413]/35 px-4 pt-24"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] shadow-2xl"
      >
        <Command label="ClaimVault Command Palette" className="w-full">
          <div className="flex items-center border-b border-[#E6E4DD] px-3.5">
            <Search className="mr-2.5 h-4 w-4 text-[#615F59]" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Jump to receipt, serial #, merchant, or action..."
              className="h-12 w-full bg-transparent text-sm text-[#141413] placeholder:text-[#615F59] focus:outline-none"
            />
            <kbd className="rounded border border-[#E6E4DD] bg-[#F3F1EC] px-1.5 py-0.5 text-[10px] text-[#615F59] tabular-ledger">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-xs">
            <Command.Empty className="py-8 text-center text-xs text-[#615F59]">
              No matching receipts or commands found.
            </Command.Empty>

            <Command.Group
              heading="Vault Receipts & Assets"
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#615F59]"
            >
              {allItems.map((item) => (
                <Command.Item
                  key={item._id}
                  value={`${item.title} ${item.merchantName} ${item.identifiers.serialNumber ?? ''} ${item.identifiers.orderNumber ?? ''}`}
                  onSelect={() => {
                    onSelectItem(item);
                    onOpenChange(false);
                  }}
                  className="mt-1 flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#615F59]" />
                    <div className="truncate">
                      <span className="font-medium">{item.title}</span>
                      <span className="ml-2 text-[#615F59]">{item.merchantName}</span>
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 text-[#615F59] tabular-ledger">
                    {formatMoney(item.financials.amount, item.financials.currency)}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Quick Claim Exports & Serials"
              className="mt-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#615F59]"
            >
              {allItems.slice(0, 4).map((item) => (
                <Command.Item
                  key={`pdf-${item._id}`}
                  value={`export pdf claim dossier ${item.title} ${item.merchantName}`}
                  onSelect={() => {
                    onDownloadClaimPdf(item);
                    onOpenChange(false);
                  }}
                  className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
                >
                  <FileDown className="h-3.5 w-3.5 text-[#615F59]" />
                  <span>Download Claim PDF: {item.title}</span>
                </Command.Item>
              ))}

              {allItems
                .filter((i) => i.identifiers.serialNumber)
                .map((item) => (
                  <Command.Item
                    key={`sn-${item._id}`}
                    value={`copy serial ${item.title} ${item.identifiers.serialNumber}`}
                    onSelect={() => {
                      onCopySerial(item.identifiers.serialNumber!);
                      onOpenChange(false);
                    }}
                    className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
                  >
                    <Copy className="h-3.5 w-3.5 text-[#615F59]" />
                    <span>
                      Copy Serial # ({item.identifiers.serialNumber}) — {item.title}
                    </span>
                  </Command.Item>
                ))}
            </Command.Group>

            <Command.Group
              heading="Navigation & Speed Demos"
              className="mt-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#615F59]"
            >
              <Command.Item
                value="tab action needed expiring"
                onSelect={() => {
                  onSwitchTab('ACTION_NEEDED');
                  onOpenChange(false);
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
              >
                <Layers className="h-3.5 w-3.5 text-[#615F59]" />
                <span>Go to Action Needed</span>
              </Command.Item>
              <Command.Item
                value="tab vault all assets"
                onSelect={() => {
                  onSwitchTab('VAULT');
                  onOpenChange(false);
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
              >
                <Layers className="h-3.5 w-3.5 text-[#615F59]" />
                <span>Go to Vault Ledger</span>
              </Command.Item>
              <Command.Item
                value="tab saved money recovered"
                onSelect={() => {
                  onSwitchTab('SAVED_MONEY');
                  onOpenChange(false);
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
              >
                <Layers className="h-3.5 w-3.5 text-[#615F59]" />
                <span>Go to Saved Money</span>
              </Command.Item>
              <Command.Item
                value="simulate 1st visit new merchant speed demo"
                onSelect={() => {
                  onOpenChange(false);
                  onSimulateVisit1();
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
              >
                <Timer className="h-3.5 w-3.5 text-[#92400E]" />
                <span>Simulate 1st Visit (New Merchant · ~60s Flow)</span>
              </Command.Item>
              <Command.Item
                value="simulate 2nd visit daraz known merchant speed demo"
                onSelect={() => {
                  onOpenChange(false);
                  onSimulateVisit2();
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#141413] aria-selected:bg-[#F3F1EC]"
              >
                <Zap className="h-3.5 w-3.5 text-[#065F46]" />
                <span>Simulate 2nd Visit (Known Merchant: Daraz · ~20s Flow)</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
