import type { BoundingBox } from '@claimvault/shared';
import { FileText } from 'lucide-react';

interface BoundingBoxOverlayProps {
  fileUrl?: string;
  mimeType?: string;
  boundingBoxes: Record<string, BoundingBox>;
  activeField: string | null;
  lowConfidenceFields?: string[];
  fieldLabels?: Record<string, string>;
}

const DEFAULT_LABELS: Record<string, string> = {
  merchantName: 'Merchant',
  title: 'Item Title',
  purchasePrice: 'Amount',
  purchaseDateISO: 'Purchase Date',
  orderNumber: 'Order #',
  serialNumber: 'Serial #',
};

export function BoundingBoxOverlay({
  fileUrl,
  mimeType,
  boundingBoxes,
  activeField,
  lowConfidenceFields = [],
  fieldLabels = DEFAULT_LABELS,
}: BoundingBoxOverlayProps) {
  const isPdf = mimeType?.includes('pdf');
  const entries = Object.entries(boundingBoxes);

  if (!fileUrl) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-[#E6E4DD] bg-[#F3F1EC] p-6 text-center text-xs text-[#615F59]">
        <FileText className="mb-2 h-6 w-6 stroke-[1.5]" />
        <p>No visual receipt image attached to this entry.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#E6E4DD] bg-[#F3F1EC] p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-[#615F59]">
        <span>ORIGINAL RECEIPT PROOF</span>
        <span>
          {activeField
            ? `Inspecting: ${fieldLabels[activeField] ?? activeField}`
            : 'Hover any field to highlight region'}
        </span>
      </div>

      {isPdf ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded border border-[#E6E4DD] bg-[#FFFFFF] p-6 text-center">
          <FileText className="h-8 w-8 text-[#141413] stroke-[1.5]" />
          <p className="text-xs font-medium text-[#141413]">
            PDF Invoice Archive Stored
          </p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center rounded border border-[#E6E4DD] bg-[#FAF9F6] px-3 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC]"
          >
            Open Original PDF
          </a>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded border border-[#E6E4DD] bg-[#FFFFFF]">
          <img
            src={fileUrl}
            alt="Original receipt proof"
            className="block h-auto w-full select-none object-contain"
          />

          {entries.map(([key, [x1, y1, x2, y2]]) => {
            const isHovered = activeField === key;
            const isLow = lowConfidenceFields.includes(key);
            if (!isHovered && !isLow) return null;

            const left = `${x1 * 100}%`;
            const top = `${y1 * 100}%`;
            const width = `${Math.max(4, (x2 - x1) * 100)}%`;
            const height = `${Math.max(3, (y2 - y1) * 100)}%`;

            return (
              <div
                key={key}
                style={{ left, top, width, height }}
                className={`pointer-events-none absolute rounded-sm transition-all duration-150 ${
                  isHovered
                    ? isLow
                      ? 'border-2 border-[#92400E] bg-[#FFFBEB]/40'
                      : 'border-2 border-[#065F46] bg-[#ECFDF5]/40'
                    : 'border border-dashed border-[#92400E]/70 bg-[#FFFBEB]/25'
                }`}
              >
                <span
                  className={`absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-xs ${
                    isLow
                      ? 'bg-[#92400E] text-[#FFFFFF]'
                      : 'bg-[#065F46] text-[#FFFFFF]'
                  }`}
                >
                  {fieldLabels[key] ?? key}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
