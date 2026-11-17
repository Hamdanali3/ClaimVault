import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Check, ShieldCheck, X, Trash2 } from 'lucide-react';
import type {
  AlertChannel,
  BillingCycle,
  ConfirmVaultItemInput,
  IngestExtractResponseDTO,
  VaultItemKind,
} from '@claimvault/shared';
import { BoundingBoxOverlay } from '../molecules/BoundingBoxOverlay';
import { ConfidencePill } from '../atoms/ConfidencePill';

interface MixedInitiativeDrawerProps {
  review: IngestExtractResponseDTO | null;
  onClose: () => void;
  onConfirm: (id: string, input: ConfirmVaultItemInput) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}

export function MixedInitiativeDrawer({
  review,
  onClose,
  onConfirm,
  onDiscard,
}: MixedInitiativeDrawerProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [kind, setKind] = useState<VaultItemKind>('PHYSICAL_ASSET');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('PKR');
  const [purchaseDateISO, setPurchaseDateISO] = useState('');
  const [returnWindowDays, setReturnWindowDays] = useState(14);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('NONE');
  const [orderNumber, setOrderNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [alertChannels, setAlertChannels] = useState<AlertChannel[]>(['IN_APP', 'EMAIL']);
  const [rememberMerchantDefaults, setRememberMerchantDefaults] = useState(true);

  useEffect(() => {
    if (!review) return;
    const item = review.item;
    setTitle(item.title);
    setMerchantName(item.merchantName);
    setKind(item.kind);
    setAmount(item.financials.amount);
    setCurrency(item.financials.currency);
    setPurchaseDateISO(item.dates.purchaseDate.slice(0, 10));
    setReturnWindowDays(item.returnWindowDays ?? 14);
    setWarrantyMonths(item.warrantyMonths ?? 12);
    setBillingCycle(item.billingCycle ?? 'NONE');
    setOrderNumber(item.identifiers.orderNumber ?? '');
    setSerialNumber(item.identifiers.serialNumber ?? '');
    setAlertChannels(item.alertChannels ?? ['IN_APP', 'EMAIL']);
    setRememberMerchantDefaults(true);

    if (review.lowConfidenceFields.length > 0) {
      setActiveField(review.lowConfidenceFields[0]);
    } else {
      setActiveField(null);
    }
  }, [review]);

  if (!review) return null;

  const item = review.item;
  const conf = item.aiMetadata.fieldConfidence;
  const isDateLow = (conf.purchaseDateISO ?? 1) < 0.9;
  const isPriceLow = (conf.purchasePrice ?? 1) < 0.9;

  const toggleChannel = (ch: AlertChannel) => {
    setAlertChannels((prev) =>
      prev.includes(ch)
        ? prev.length > 1
          ? prev.filter((c) => c !== ch)
          : prev
        : [...prev, ch],
    );
  };

  const applyQuickDate = (daysAgo: number) => {
    const d = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
    setPurchaseDateISO(d.toISOString().slice(0, 10));
    setActiveField('purchaseDateISO');
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(item._id, {
        title,
        merchantName,
        kind,
        amount: Number(amount),
        currency,
        purchaseDateISO,
        returnWindowDays: Number(returnWindowDays),
        warrantyMonths: Number(warrantyMonths),
        billingCycle,
        orderNumber: orderNumber.trim() || null,
        serialNumber: serialNumber.trim() || null,
        alertChannels,
        rememberMerchantDefaults,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    setSaving(true);
    try {
      await onDiscard(item._id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const primaryBtnText = review.merchantMemoryMatched
    ? `Save to Vault (${returnWindowDays}d Return · ${warrantyMonths}m Warranty)`
    : 'Confirm & Save to Vault';

  return (
    <Drawer.Root open={Boolean(review)} onOpenChange={(o) => !o && onClose()} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[#141413]/30" />
        <Drawer.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col border-l border-[#E6E4DD] bg-[#FAF9F6] shadow-xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-[#E6E4DD] bg-[#FFFFFF] px-5 py-3.5">
            <div>
              <Drawer.Title className="text-base font-semibold text-[#141413]">
                {review.merchantMemoryMatched
                  ? 'Express Merchant Review'
                  : 'Verify Extracted Receipt Details'}
              </Drawer.Title>
              <Drawer.Description className="text-xs text-[#615F59]">
                {review.lowConfidenceFields.length > 0
                  ? 'Check highlighted amber fields — thermal ink was faded on the receipt.'
                  : review.policyResolution.policyNotes}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E6E4DD] bg-[#FAF9F6] text-[#615F59] hover:text-[#141413]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={handleConfirm}
            className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-12"
          >
            {/* Left Side: Bret Victor Receipt Proof Viewer */}
            <div className="lg:col-span-5">
              <BoundingBoxOverlay
                fileUrl={item.proofFiles?.[0]?.fileUrl}
                mimeType={item.proofFiles?.[0]?.mimeType}
                boundingBoxes={item.aiMetadata.boundingBoxes}
                activeField={activeField}
                lowConfidenceFields={review.lowConfidenceFields}
              />
            </div>

            {/* Right Side: Mixed-Initiative Structured Verification */}
            <div className="space-y-4 lg:col-span-7">
              {review.merchantMemoryMatched && (
                <div className="flex items-center gap-2 rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-xs text-[#065F46]">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>
                    Merchant Memory matched <strong>{merchantName}</strong> — return, warranty, and alert defaults pre-applied.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  onMouseEnter={() => setActiveField('merchantName')}
                  onFocus={() => setActiveField('merchantName')}
                  className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-medium uppercase text-[#615F59]">
                      Merchant
                    </label>
                    <ConfidencePill score={conf.merchantName ?? 0.95} />
                  </div>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-[#141413] focus:outline-none"
                  />
                </div>

                <div
                  onMouseEnter={() => setActiveField('purchaseDateISO')}
                  onFocus={() => setActiveField('purchaseDateISO')}
                  className={`rounded-md border p-3 ${
                    isDateLow
                      ? 'border-[#FDE68A] bg-[#FFFBEB] ring-1 ring-[#FDE68A]'
                      : 'border-[#E6E4DD] bg-[#FFFFFF]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-medium uppercase text-[#615F59]">
                      Purchase Date
                    </label>
                    <ConfidencePill score={conf.purchaseDateISO ?? 0.95} />
                  </div>
                  <input
                    type="date"
                    required
                    autoFocus={isDateLow}
                    value={purchaseDateISO}
                    onChange={(e) => setPurchaseDateISO(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-[#141413] focus:outline-none tabular-ledger"
                  />
                  {isDateLow && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-[#92400E]">
                        Check purchase date — thermal ink was faded on the receipt:
                      </span>
                      <div className="flex gap-1">
                        {[
                          { label: 'Today', days: 0 },
                          { label: 'Yesterday', days: 1 },
                          { label: '12 days ago', days: 12 },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => applyQuickDate(chip.days)}
                            className="rounded border border-[#FDE68A] bg-[#FFFFFF] px-2 py-0.5 text-[11px] font-medium text-[#92400E] hover:bg-[#FEF3C7]"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                onMouseEnter={() => setActiveField('title')}
                onFocus={() => setActiveField('title')}
                className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase text-[#615F59]">
                    Item / Plan Description
                  </label>
                  <ConfidencePill score={conf.title ?? 0.95} />
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#141413] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div
                  onMouseEnter={() => setActiveField('purchasePrice')}
                  onFocus={() => setActiveField('purchasePrice')}
                  className={`rounded-md border p-3 ${
                    isPriceLow
                      ? 'border-[#FDE68A] bg-[#FFFBEB]'
                      : 'border-[#E6E4DD] bg-[#FFFFFF]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-medium uppercase text-[#615F59]">
                      Amount
                    </label>
                    <ConfidencePill score={conf.purchasePrice ?? 0.95} />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold text-[#141413] focus:outline-none tabular-ledger"
                  />
                </div>

                <div className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3">
                  <label className="mb-1 block text-[11px] font-medium uppercase text-[#615F59]">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-[#141413] focus:outline-none tabular-ledger"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AED">AED</option>
                  </select>
                </div>

                <div className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3">
                  <label className="mb-1 block text-[11px] font-medium uppercase text-[#615F59]">
                    Ledger Type
                  </label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as VaultItemKind)}
                    className="w-full bg-transparent text-sm font-medium text-[#141413] focus:outline-none"
                  >
                    <option value="PHYSICAL_ASSET">Physical Asset</option>
                    <option value="SUBSCRIPTION">Subscription / Trial</option>
                    <option value="UTILITY_BILL">Utility Bill</option>
                  </select>
                </div>
              </div>

              {/* Policy Terms (1-tap chips + numeric controls) */}
              <div className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3">
                <div className="mb-2 text-[11px] font-medium uppercase text-[#615F59]">
                  Return Window, Warranty & Renewal Terms
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs text-[#615F59]">Return Window (Days)</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      {[0, 7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setReturnWindowDays(d)}
                          className={`min-h-[32px] rounded border px-2 text-xs tabular-ledger ${
                            returnWindowDays === d
                              ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                              : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#141413]'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#615F59]">Warranty (Months)</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      {[0, 12, 18, 24].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWarrantyMonths(m)}
                          className={`min-h-[32px] rounded border px-2 text-xs tabular-ledger ${
                            warrantyMonths === m
                              ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                              : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#141413]'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#615F59]">Billing Cycle</label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                      className="mt-1 min-h-[32px] w-full rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2 text-xs text-[#141413]"
                    >
                      <option value="NONE">One-Time Purchase</option>
                      <option value="MONTHLY">Monthly Renewal</option>
                      <option value="YEARLY">Yearly Renewal</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  onMouseEnter={() => setActiveField('orderNumber')}
                  onFocus={() => setActiveField('orderNumber')}
                  className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3"
                >
                  <label className="mb-1 block text-[11px] font-medium uppercase text-[#615F59]">
                    Order / Invoice #
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-transparent text-xs font-medium text-[#141413] focus:outline-none tabular-ledger"
                  />
                </div>

                <div
                  onMouseEnter={() => setActiveField('serialNumber')}
                  onFocus={() => setActiveField('serialNumber')}
                  className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3"
                >
                  <label className="mb-1 block text-[11px] font-medium uppercase text-[#615F59]">
                    Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-transparent text-xs font-medium text-[#141413] focus:outline-none tabular-ledger"
                  />
                </div>
              </div>

              {/* Alert Channels + Merchant Memory Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium uppercase text-[#615F59]">
                    Alerts (T-7d, T-48h, T-12h):
                  </span>
                  {(['IN_APP', 'EMAIL', 'WHATSAPP'] as AlertChannel[]).map((ch) => {
                    const selected = alertChannels.includes(ch);
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className={`rounded border px-2 py-1 text-[11px] font-medium ${
                          selected
                            ? 'border-[#141413] bg-[#141413] text-[#FAF9F6]'
                            : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#615F59]'
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#141413]">
                  <input
                    type="checkbox"
                    checked={rememberMerchantDefaults}
                    onChange={(e) => setRememberMerchantDefaults(e.target.checked)}
                    className="h-4 w-4 accent-[#141413]"
                  />
                  <span>Remember policy for {merchantName || 'this store'}</span>
                </label>
              </div>
            </div>

            {/* Spatially Invariant Footer */}
            <div className="col-span-full flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E4DD] pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDiscard()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[#E6E4DD] bg-[#FFFFFF] px-4 text-xs font-medium text-[#991B1B] hover:bg-[#FEF2F2]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Discard Capture</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#141413] bg-[#141413] px-5 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A28] disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{saving ? 'Saving...' : primaryBtnText}</span>
              </button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
