import { useEffect, useState } from 'react';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import type { PublicCertificateDTO } from '@claimvault/shared';
import { fetchPublicCertificate } from '../../services/api';
import { formatMoney, formatShortDate } from '../../utils/formatters';

interface PublicVerifyPageProps {
  token: string;
  onBackToVault: () => void;
}

export function PublicVerifyPage({ token, onBackToVault }: PublicVerifyPageProps) {
  const [cert, setCert] = useState<PublicCertificateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicCertificate(token)
      .then(setCert)
      .catch(() => setError('Certificate not found or link expired.'));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBackToVault}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#615F59] hover:text-[#141413]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to ClaimVault Ledger</span>
        </button>

        {error ? (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-6 text-sm text-[#991B1B]">
            {error}
          </div>
        ) : !cert ? (
          <div className="rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-6 text-xs text-[#615F59]">
            Verifying cryptographic proof certificate...
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]">
            <div className="flex items-center justify-between border-b border-[#A7F3D0] bg-[#ECFDF5] px-5 py-4 text-[#065F46]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
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
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-[#141413]">
                  <Lock className="h-3.5 w-3.5 text-[#065F46]" />
                  <span>Cryptographic SHA-256 Receipt Proof</span>
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
