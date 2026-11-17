import { Check, AlertTriangle } from 'lucide-react';

interface ConfidencePillProps {
  score: number;
  label?: string;
}

export function ConfidencePill({ score, label }: ConfidencePillProps) {
  const pct = Math.round(score * 100);
  const isVerified = score >= 0.9;

  if (isVerified) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 py-0.5 text-[11px] font-medium text-[#065F46]"
        title={`Field verification confidence: ${pct}%`}
      >
        <Check className="h-3 w-3 stroke-[2.25]" />
        <span className="tabular-ledger">{label ?? `${pct}%`}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-[#FDE68A] bg-[#FFFBEB] px-1.5 py-0.5 text-[11px] font-medium text-[#92400E]"
      title={`Thermal ink faded — check this field (${pct}%)`}
    >
      <AlertTriangle className="h-3 w-3 stroke-[2]" />
      <span className="tabular-ledger">{label ?? `Check (${pct}%)`}</span>
    </span>
  );
}
