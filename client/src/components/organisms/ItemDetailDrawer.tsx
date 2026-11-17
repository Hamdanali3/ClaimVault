import { useState } from 'react';
import { Drawer } from 'vaul';
import {
  X,
  FileDown,
  CheckCircle2,
  Ban,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import type { ResolveVaultItemInput, VaultItemDTO } from '@claimvault/shared';
import { BoundingBoxOverlay } from '../molecules/BoundingBoxOverlay';
import { ProofInspector } from '../molecules/ProofInspector';
import { CountdownBadge } from '../atoms/CountdownBadge';
import { TabularPrice } from '../atoms/TabularPrice';
import { HotkeyHint } from '../atoms/HotkeyHint';
import { formatShortDate } from '../../utils/formatters';

interface ItemDetailDrawerProps {
  item: VaultItemDTO | null;
  onClose: () => void;
  onDownloadClaimPdf: (item: VaultItemDTO, defectNotes?: string) => void;
  onResolveOutcome: (item: VaultItemDTO, status: ResolveVaultItemInput['status']) => void;
  onDelete: (item: VaultItemDTO) => void;
  onOpenVerifyRoute: (token: string) => void;
}

export function ItemDetailDrawer({
  item,
  onClose,
  onDownloadClaimPdf,
  onResolveOutcome,
  onDelete,
  onOpenVerifyRoute,
}: ItemDetailDrawerProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [copiedVerify, setCopiedVerify] = useState(false);
  const [defectNotes, setDefectNotes] = useState('');
  const [hoverPdf, setHoverPdf] = useState(false);
  const [hoverResolve, setHoverResolve] = useState(false);

  if (!item) return null;

  const isSubscription = item.kind === 'SUBSCRIPTION';
  const isResolved = item.urgencyLevel === 'RESOLVED';

  const copySerial = async () => {
    if (!item.identifiers.serialNumber) return;
    await navigator.clipboard.writeText(item.identifiers.serialNumber);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 1600);
  };

  const copyVerifyLink = async () => {
    if (!item.publicVerificationToken) return;
    const url = `${window.location.origin}/verify/${item.publicVerificationToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedVerify(true);
    setTimeout(() => setCopiedVerify(false), 1800);
  };

  return (
    <Drawer.Root open={Boolean(item)} onOpenChange={(o) => !o && onClose()} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[#141413]/30" />
        <Drawer.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col border-l border-[#E6E4DD] bg-[#FAF9F6] shadow-xl outline-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[#E6E4DD] bg-[#FFFFFF] px-5 py-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Drawer.Title className="text-lg font-semibold text-[#141413]">
                  {item.title}
                </Drawer.Title>
                <CountdownBadge item={item} />
              </div>
              <Drawer.Description className="text-xs text-[#615F59]">
                {item.merchantName} · {item.category} · {item.aiMetadata.policyNotes}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E6E4DD] bg-[#FAF9F6] text-[#615F59] hover:text-[#141413]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-12">
            {/* Left Side: Bret Victor Receipt Proof Viewer */}
            <div className="space-y-3 lg:col-span-5">
              <BoundingBoxOverlay
                fileUrl={item.proofFiles?.[0]?.fileUrl}
                mimeType={item.proofFiles?.[0]?.mimeType}
                boundingBoxes={item.aiMetadata.boundingBoxes}
                activeField={activeField}
              />
              <ProofInspector item={item} />
            </div>

            {/* Right Side: Interactive Swiss Ledger Certificate & Actions */}
            <div className="space-y-4 lg:col-span-7">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-4">
                <div
                  onMouseEnter={() => setActiveField('merchantName')}
                  onMouseLeave={() => setActiveField(null)}
                  className="cursor-default rounded p-1.5 hover:bg-[#FAF9F6]"
                >
                  <div className="text-[11px] font-medium uppercase text-[#615F59]">
                    Merchant
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-[#141413]">
                    {item.merchantName}
                  </div>
                </div>

                <div
                  onMouseEnter={() => setActiveField('purchasePrice')}
                  onMouseLeave={() => setActiveField(null)}
                  className="cursor-default rounded p-1.5 hover:bg-[#FAF9F6]"
                >
                  <div className="text-[11px] font-medium uppercase text-[#615F59]">
                    Protected Value
                  </div>
                  <div className="mt-0.5">
                    <TabularPrice
                      amount={item.financials.amount}
                      currency={item.financials.currency}
                      className="text-sm font-semibold text-[#141413]"
                    />
                  </div>
                </div>

                <div
                  onMouseEnter={() => setActiveField('purchaseDateISO')}
                  onMouseLeave={() => setActiveField(null)}
                  className="cursor-default rounded p-1.5 hover:bg-[#FAF9F6]"
                >
                  <div className="text-[11px] font-medium uppercase text-[#615F59]">
                    Purchase Date
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-[#141413] tabular-ledger">
                    {formatShortDate(item.dates.purchaseDate)}
                  </div>
                </div>

                <div className="rounded p-1.5">
                  <div className="text-[11px] font-medium uppercase text-[#615F59]">
                    {isSubscription ? 'Next Auto-Renewal' : 'Return Deadline'}
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-[#141413] tabular-ledger">
                    {isSubscription
                      ? formatShortDate(item.dates.nextRenewalDate)
                      : formatShortDate(item.dates.returnDeadline)}
                  </div>
                </div>

                <div
                  onMouseEnter={() => setActiveField('orderNumber')}
                  onMouseLeave={() => setActiveField(null)}
                  className="cursor-default rounded p-1.5 hover:bg-[#FAF9F6]"
                >
                  <div className="text-[11px] font-medium uppercase text-[#615F59]">
                    Order / Invoice #
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-[#141413] tabular-ledger">
                    {item.identifiers.orderNumber ?? '—'}
                  </div>
                </div>

                <div
                  onMouseEnter={() => setActiveField('serialNumber')}
                  onMouseLeave={() => setActiveField(null)}
                  className="cursor-default rounded p-1.5 hover:bg-[#FAF9F6]"
                >
                  <div className="flex items-center justify-between text-[11px] font-medium uppercase text-[#615F59]">
                    <span>Serial Number</span>
                    {item.identifiers.serialNumber && (
                      <button
                        type="button"
                        onClick={() => void copySerial()}
                        className="inline-flex items-center gap-1 text-[#141413] hover:underline"
                      >
                        {copiedSerial ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedSerial ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-[#141413] tabular-ledger">
                    {item.identifiers.serialNumber ?? '—'}
                  </div>
                </div>

                {!isSubscription && (
                  <div className="col-span-2 border-t border-[#E6E4DD] px-1.5 pt-3">
                    <div className="text-[11px] font-medium uppercase text-[#615F59]">
                      Official Warranty Coverage End Date
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-[#065F46] tabular-ledger">
                      {formatShortDate(item.dates.warrantyExpiryDate)}
                    </div>
                  </div>
                )}
              </div>

              {/* Claim Dossier Defect Notes & PDF Export */}
              <div className="rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-4 space-y-3">
                <div className="text-xs font-semibold text-[#141413]">
                  1-Click Warranty / Return Claim Dossier PDF
                </div>
                <textarea
                  rows={2}
                  value={defectNotes}
                  onChange={(e) => setDefectNotes(e.target.value)}
                  placeholder="Optional defect or return reason to embed on the standardized claim PDF..."
                  className="w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] p-2.5 text-xs text-[#141413] placeholder:text-[#615F59] focus:border-[#141413] focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onMouseEnter={() => setHoverPdf(true)}
                    onMouseLeave={() => setHoverPdf(false)}
                    onClick={() => onDownloadClaimPdf(item, defectNotes)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#141413] bg-[#141413] px-4 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A28]"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>Download Warranty Claim PDF</span>
                    <HotkeyHint shortcut="C" active={hoverPdf} />
                  </button>

                  {!isResolved && (
                    <button
                      type="button"
                      onMouseEnter={() => setHoverResolve(true)}
                      onMouseLeave={() => setHoverResolve(false)}
                      onClick={() =>
                        onResolveOutcome(
                          item,
                          isSubscription
                            ? 'SUBSCRIPTION_CANCELLED'
                            : item.nextDeadlineType === 'RETURN'
                              ? 'RETURNED_REFUNDED'
                              : 'WARRANTY_CLAIMED',
                        )
                      }
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-4 text-xs font-semibold text-[#141413] hover:bg-[#F3F1EC]"
                    >
                      {isSubscription ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-[#065F46]" />
                      )}
                      <span>
                        {isSubscription
                          ? 'Log Cancellation'
                          : item.nextDeadlineType === 'RETURN'
                            ? 'Mark Returned & Refunded'
                            : 'Mark Warranty Claimed'}
                      </span>
                      <HotkeyHint shortcut="R" active={hoverResolve} />
                    </button>
                  )}
                </div>
              </div>

              {/* Public Resale Trust Certificate */}
              {item.publicVerificationToken && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-3.5 text-xs">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#065F46]" />
                    <div>
                      <div className="font-semibold text-[#065F46]">
                        Verifiable Second-Hand Resale Trust Certificate Ready
                      </div>
                      <div className="text-[#065F46]/90">
                        Buyers on OLX or Marketplace can verify original purchase date, remaining warranty & SHA-256 proof without seeing your personal info.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyVerifyLink()}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded border border-[#A7F3D0] bg-[#FFFFFF] px-2.5 font-medium text-[#065F46] hover:bg-[#FAF9F6]"
                    >
                      {copiedVerify ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedVerify ? 'Link Copied' : 'Copy Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenVerifyRoute(item.publicVerificationToken!)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded border border-[#065F46] bg-[#065F46] px-2.5 font-medium text-[#FFFFFF] hover:bg-[#054e3a]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded px-3 text-xs text-[#991B1B] hover:bg-[#FEF2F2]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Entry</span>
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
