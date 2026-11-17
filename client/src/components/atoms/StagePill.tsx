import { Check, Loader2 } from 'lucide-react';
import type { IngestionStage } from '../../store/useVaultStore';

interface StagePillProps {
  currentStage: IngestionStage;
}

const STAGES: Array<{ key: Exclude<IngestionStage, 'IDLE'>; label: string }> = [
  { key: 'HASHING', label: 'Hashing File' },
  { key: 'READING', label: 'Reading Receipt' },
  { key: 'DATES_VERIFIED', label: 'Dates Verified' },
];

export function StagePill({ currentStage }: StagePillProps) {
  if (currentStage === 'IDLE') return null;
  const activeIdx = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border border-[#E6E4DD] bg-[#FFFFFF] px-3 py-2 text-xs"
      role="status"
      aria-live="polite"
    >
      {STAGES.map((stage, idx) => {
        const completed = idx < activeIdx || currentStage === 'DATES_VERIFIED';
        const isCurrent = idx === activeIdx && currentStage !== 'DATES_VERIFIED';
        return (
          <div key={stage.key} className="flex items-center gap-1.5">
            {completed ? (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ECFDF5] text-[#065F46]">
                <Check className="h-2.5 w-2.5 stroke-[2.5]" />
              </span>
            ) : isCurrent ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#141413]" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-[#E6E4DD]" />
            )}
            <span
              className={
                completed || isCurrent
                  ? 'font-medium text-[#141413]'
                  : 'text-[#615F59]'
              }
            >
              {stage.label}
            </span>
            {idx < STAGES.length - 1 && (
              <span className="mx-1 text-[#D6D3CB]">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
