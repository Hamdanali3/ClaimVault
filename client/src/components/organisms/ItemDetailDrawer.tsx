import { useEffect, useState } from 'react';
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
  Pencil,
} from 'lucide-react';
import type {
  ConfirmVaultItemInput,
  ResolveVaultItemInput,
  VaultItemDTO,
} from '@claimvault/shared';
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
  onUpdateItem: (id: string, payload: ConfirmVaultItemInput) => Promise<void>;
  onDelete: (item: VaultItemDTO) => void;
  onOpenVerifyRoute: (token: string) => void;
}

export function ItemDetailDrawer({
  item,
  onClose,
  onDownloadClaimPdf,
  onResolveOutcome,
  onUpdateItem,
  onDelete,
  onOpenVerifyRoute,
}: ItemDetailDrawerProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [copiedVerify, setCopiedVerify] = useState(false);
  const [defectNotes, setDefectNotes] = useState('');
  const [hoverPdf, setHoverPdf] = useState(false);
  const [hoverResolve, setHoverResolve] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Inline Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editCurrency, setEditCurrency] = useState('PKR');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editReturnDays, setEditReturnDays] = useState('14');
  const [editWarrantyMonths, setEditWarrantyMonths] = useState('12');

  // Reset per-item transient state whenever selected item changes
  useEffect(() => {
    setDefectNotes('');
    setConfirmingDelete(false);
    setIsEditing(false);
    setActiveField(null);
    setCopiedSerial(false);
    setCopiedVerify(false);
    if (item) {
      setEditTitle(item.title);
      setEditMerchant(item.merchantName);
      setEditAmountStr(String(item.financials.amount));
      setEditCurrency(item.financials.currency);
      setEditPurchaseDate(item.dates.purchaseDate.slice(0, 10));
      setEditOrderNumber(item.identifiers.orderNumber ?? '');
      setEditSerialNumber(item.identifiers.serialNumber ?? '');
      setEditReturnDays(String(item.returnWindowDays ?? 0));
      setEditWarrantyMonths(String(item.warrantyMonths ?? 0));
    }
  }, [item]);

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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const parsedAmount = Number.parseFloat(editAmountStr);
      const parsedReturn = Number.parseInt(editReturnDays, 10);
      const parsedWarranty = Number.parseInt(editWarrantyMonths, 10);
      await onUpdateItem(item._id, {
        title: editTitle.trim() || item.title,
        merchantName: editMerchant.trim() || item.merchantName,
        amount: Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : item.financials.amount,
        currency: editCurrency,
        purchaseDateISO: editPurchaseDate || item.dates.purchaseDate.slice(0, 10),
        orderNumber: editOrderNumber.trim() || null,
        serialNumber: editSerialNumber.trim() || null,
        returnWindowDays:
          Number.isFinite(parsedReturn) && parsedReturn >= 0 ? parsedReturn : item.returnWindowDays,
        warrantyMonths:
          Number.isFinite(parsedWarranty) && parsedWarranty >= 0
            ? parsedWarranty
            : item.warrantyMonths,
        rememberMerchantDefaults: false,
      });
      setIsEditing(false);
    } finally {
      setSavingEdit(false);
    }
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing((v) => !v)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
                  isEditing
                    ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                    : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#141413] hover:bg-[#F3F1EC]'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close item details"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E6E4DD] bg-[#FAF9F6] text-[#615F59] hover:text-[#141413]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
              {isEditing ? (
                <form
                  onSubmit={handleSaveEdit}
                  className="space-y-3 rounded-lg border border-[#141413] bg-[#FFFFFF] p-4 text-xs"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                    Edit Ledger Entry & Recalculate Deadlines
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="edit-item-title" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                        Item Title
                      </label>
                      <input
                        id="edit-item-title"
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-item-merchant" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                        Merchant
                      </label>
                      <input
                        id="edit-item-merchant"
                        type="text"
                        required
                        value={editMerchant}
                        onChange={(e) => setEditMerchant(e.target.value)}
                        className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-item-amount" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                        Amount
                      </label>
                      <input
                        id="edit-item-amount"
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={editAmountStr}
                        onChange={(e) => setEditAmountStr(e.target.value)}
                        className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] tabular-ledger focus:border-[#141413] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-item-currency" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                        Currency
                      </label>
                      <select
                        id="edit-item-currency"
                        value={editCurrency}
                        onChange={(e) => setEditCurrency(e.target.value)}
                        className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413]"
                      >
                        <option value="PKR">PKR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="edit-item-date" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                        Purchase Date
                      </label>
                      <input
                        id="edit-item-date"
                        type="date"
                        required
                        value={editPurchaseDate}
                        onChange={(e) => setEditPurchaseDate(e.target.value)}
                        className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] tabular-ledger"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="edit-item-return" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                          Return (d)
                        </label>
                        <input
                          id="edit-item-return"
                          type="number"
                          min="0"
                          max="365"
                          value={editReturnDays}
                          onChange={(e) => setEditReturnDays(e.target.value)}
                          className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] tabular-ledger"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-item-warranty" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                          Warranty (m)
                        </label>
                        <input
                          id="edit-item-warranty"
                          type="number"
                          min="0"
                          max="240"
                          value={editWarrantyMonths}
                          onChange={(e) => setEditWarrantyMonths(e.target.value)}
                          className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] tabular-ledger"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="edit-item-order" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                        Order / Invoice #
                      </label>
                      <input
                        id="edit-item-order"
                        type="text"
                        value={editOrderNumber}
                        onChange={(e) => setEditOrderNumber(e.target.value)}
                        className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] tabular-ledger"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-item-serial" className="mb-1 block text-[11px] font-medium text-[#615F59]">
                        Serial Number (S/N)
                      </label>
                      <input
                        id="edit-item-serial"
                        type="text"
                        value={editSerialNumber}
                        onChange={(e) => setEditSerialNumber(e.target.value)}
                        className="h-9 w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 text-xs text-[#141413] tabular-ledger"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="min-h-[36px] rounded border border-[#E6E4DD] px-3 text-xs text-[#615F59] hover:bg-[#F3F1EC]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded bg-[#141413] px-4 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A28] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              ) : (
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
              )}

              {/* Claim Dossier Defect Notes & PDF Export */}
              <div className="space-y-3 rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-4">
                <label
                  htmlFor="claim-defect-notes"
                  className="block text-xs font-semibold text-[#141413]"
                >
                  1-Click Warranty / Return Claim Dossier PDF
                </label>
                <textarea
                  id="claim-defect-notes"
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

              <div className="flex items-center justify-end gap-2 pt-2">
                {confirmingDelete ? (
                  <>
                    <span className="text-xs text-[#991B1B]">Permanently remove this entry?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="inline-flex min-h-[36px] items-center rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-xs font-medium text-[#615F59] hover:text-[#141413]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded bg-[#991B1B] px-3 text-xs font-semibold text-[#FFFFFF] hover:bg-[#7F1D1D]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Confirm Delete</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded px-3 text-xs text-[#991B1B] hover:bg-[#FEF2F2]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Entry</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
