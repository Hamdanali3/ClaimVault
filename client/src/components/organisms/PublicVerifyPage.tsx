import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Copy,
  Check,
  Printer,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import type { PublicCertificateDTO } from '@claimvault/shared';
import { fetchPublicCertificate } from '../../services/api';
import { formatMoney, formatShortDate } from '../../utils/formatters';

interface PublicVerifyPageProps {
  token: string;
  onBackToVault: () => void;
}

export function PublicVerifyPage({ token, onBackToVault }: PublicVerifyPageProps) {
  const [cert, setCert] = useState<PublicCertificateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    kind: 'NOT_FOUND' | 'SERVER_ERROR';
    message: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const loadCertificate = useCallback(() => {
    setLoading(true);
    setErrorState(null);
    fetchPublicCertificate(token)
      .then((data) => {
        setCert(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 400) {
          setErrorState({
            kind: 'NOT_FOUND',
            message: 'Certificate not found, revoked, or verification link expired.',
          });
        } else {
          setErrorState({
            kind: 'SERVER_ERROR',
            message:
              'Verification service is temporarily unavailable. Check database connectivity and try again.',
          });
        }
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    loadCertificate();
  }, [loadCertificate]);

  const copySha256 = async () => {
    if (!cert?.proofIntegrity.sha256Hash) return;
    await navigator.clipboard.writeText(cert.proofIntegrity.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onBackToVault}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-[#615F59] hover:text-[#141413]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to ClaimVault Ledger</span>
          </button>

          {cert && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC]"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Certificate</span>
            </button>
          )}
        </div>

        {errorState ? (
          <div
            role="alert"
            className={`rounded-lg border p-6 text-sm ${
              errorState.kind === 'SERVER_ERROR'
                ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-3">
                <div>
                  <div className="font-semibold">
                    {errorState.kind === 'SERVER_ERROR'
                      ? 'Verification Service Unavailable'
                      : 'Certificate Not Found'}
                  </div>
                  <p className="mt-0.5 text-xs opacity-90">{errorState.message}</p>
                </div>
                {errorState.kind === 'SERVER_ERROR' && (
                  <button
                    type="button"
                    onClick={loadCertificate}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[#92400E] bg-[#FFFFFF] px-3 text-xs font-semibold text-[#92400E] hover:bg-[#FEF3C7]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry Verification</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : loading || !cert ? (
          <div className="rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-6 text-xs text-[#615F59]">
            Verifying cryptographic proof certificate...
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#A7F3D0] bg-[#ECFDF5] px-5 py-4 text-[#065F46]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Verified Resale Trust Certificate
                  </div>
                  <div className="text-[11px]">
                    Original purchase proof verified via ClaimVault SHA-256 Registry
                  </div>
                </div>
              </div>
              <span className="rounded border border-[#A7F3D0] bg-[#FFFFFF] px-2 py-0.5 text-[11px] font-semibold tabular-ledger">
                {cert.warrantyStatus}
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <h1 className="text-xl font-semibold text-[#141413]">{cert.title}</h1>
                <p className="mt-0.5 text-xs text-[#615F59]">
                  Authorized Seller: {cert.merchantName} · Category: {cert.category}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] p-3.5 text-xs">
                <div>
                  <div className="text-[11px] uppercase text-[#615F59]">Original Purchase</div>
                  <div className="mt-0.5 font-semibold text-[#141413] tabular-ledger">
                    {formatShortDate(cert.purchaseDate)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-[#615F59]">Original Invoice Value</div>
                  <div className="mt-0.5 font-semibold text-[#141413] tabular-ledger">
                    {formatMoney(cert.originalAmount, cert.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-[#615F59]">Warranty Expiry</div>
                  <div className="mt-0.5 font-semibold text-[#065F46] tabular-ledger">
                    {formatShortDate(cert.warrantyExpiryDate)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-[#615F59]">Remaining Coverage</div>
                  <div className="mt-0.5 font-semibold text-[#065F46] tabular-ledger">
                    {cert.warrantyRemainingDays !== null
                      ? `${cert.warrantyRemainingDays} days remaining`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-[#615F59]">Masked Serial #</div>
                  <div className="mt-0.5 font-medium text-[#141413] tabular-ledger">
                    {cert.identifiers.serialLast4 ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-[#615F59]">Model Code</div>
                  <div className="mt-0.5 font-medium text-[#141413] tabular-ledger">
                    {cert.identifiers.modelCode ?? '—'}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[#E6E4DD] bg-[#F3F1EC] p-3 text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[#141413]">
                    <Lock className="h-3.5 w-3.5 text-[#065F46]" />
                    <span>Cryptographic SHA-256 Receipt Proof</span>
                  </div>
                  {cert.proofIntegrity.sha256Hash && (
                    <button
                      type="button"
                      onClick={() => void copySha256()}
                      className="inline-flex items-center gap-1 rounded border border-[#E6E4DD] bg-[#FFFFFF] px-2 py-0.5 text-[11px] font-medium text-[#141413] hover:bg-[#FAF9F6] print:hidden"
                    >
                      {copiedHash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                    </button>
                  )}
                </div>
                <div className="break-all text-[11px] text-[#615F59] tabular-ledger">
                  {cert.proofIntegrity.sha256Hash ?? 'No file digest'}
                </div>
                <div className="mt-1.5 text-[11px] text-[#615F59]">
                  Private buyer identity, payment method, and home address are strictly redacted from public certificates.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
