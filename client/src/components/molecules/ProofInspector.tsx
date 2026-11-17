import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Copy, Check } from 'lucide-react';
import type { VaultItemDTO } from '@claimvault/shared';

interface ProofInspectorProps {
  item: VaultItemDTO;
}

export function ProofInspector({ item }: ProofInspectorProps) {
  const [open, setOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const primaryProof = item.proofFiles?.[0];
  const sha = primaryProof?.sha256Hash ?? 'Not computed';

  const copyHash = async () => {
    if (!primaryProof?.sha256Hash) return;
    await navigator.clipboard.writeText(primaryProof.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 1600);
  };

  return (
    <div className="rounded-md border border-[#E6E4DD] bg-[#FAF9F6]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[40px] w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#615F59] hover:text-[#141413]"
      >
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          <span>Proof Inspector (SHA-256 & Raw OCR)</span>
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-[#E6E4DD] bg-[#FFFFFF] p-3 text-xs">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-[#615F59]">
              <span>TAMPER-PROOF SHA-256 DIGEST</span>
              {primaryProof?.sha256Hash && (
                <button
                  type="button"
                  onClick={() => void copyHash()}
                  className="inline-flex items-center gap-1 text-[#141413] hover:underline"
                >
                  {copiedHash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedHash ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            <div className="break-all rounded border border-[#E6E4DD] bg-[#F3F1EC] p-2 text-[11px] text-[#141413] tabular-ledger">
              {sha}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded border border-[#E6E4DD] bg-[#FAF9F6] p-2">
              <div className="text-[#615F59]">Extraction Pipeline</div>
              <div className="mt-0.5 font-medium text-[#141413] tabular-ledger">
                {item.aiMetadata.extractionEngine ?? 'hybrid-v1'}
              </div>
            </div>
            <div className="rounded border border-[#E6E4DD] bg-[#FAF9F6] p-2">
              <div className="text-[#615F59]">Policy Precedence</div>
              <div className="mt-0.5 font-medium text-[#141413] tabular-ledger">
                {item.aiMetadata.policySource ?? 'FALLBACK'}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-medium text-[#615F59]">
              EXTRACTED OCR TEXT
            </div>
            <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded border border-[#E6E4DD] bg-[#FAF9F6] p-2 text-[11px] text-[#141413] tabular-ledger">
              {item.aiMetadata.rawOcrText || 'No raw text captured.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
