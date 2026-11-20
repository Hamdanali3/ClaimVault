import { useRef, useState } from 'react';
import { Upload, ClipboardPaste, FileText, ChevronDown } from 'lucide-react';
import type { IngestionStage } from '../../store/useVaultStore';
import { StagePill } from '../atoms/StagePill';
import { HotkeyHint } from '../atoms/HotkeyHint';

interface GlobalDropzoneProps {
  onUploadFile: (file: File) => void;
  onSubmitText: (text: string) => void;
  onTrySampleReceipt: () => void;
  ingestionStage: IngestionStage;
  isIngesting: boolean;
  aiMode?: 'gemini-vision' | 'openai-vision' | 'local-hybrid';
  inputTriggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function GlobalDropzone({
  onUploadFile,
  onSubmitText,
  onTrySampleReceipt,
  ingestionStage,
  isIngesting,
  aiMode = 'local-hybrid',
  inputTriggerRef,
}: GlobalDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pasteExpanded, setPasteExpanded] = useState(false);
  const [pasteDraft, setPasteDraft] = useState('');
  const [hoverUpload, setHoverUpload] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  const submitManualText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteDraft.trim()) return;
    onSubmitText(pasteDraft.trim());
    setPasteDraft('');
    setPasteExpanded(false);
  };

  return (
    <section
      aria-label="Receipt capture dropzone"
      className="rounded-lg border border-[#E6E4DD] bg-[#FFFFFF] p-4"
    >
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-medium text-[#141413]">
            Drop a receipt photo, PDF, or paste an order message
            <span className="hidden sm:inline">
              {' ('}
              <kbd className="rounded border border-[#E6E4DD] bg-[#F3F1EC] px-1.5 py-0.5 text-[11px] tabular-ledger">
                Ctrl+V
              </kbd>
              {')'}
            </span>
            .
          </div>
          <p className="text-xs text-[#615F59]">
            {isIngesting
              ? 'Reading store name, serial number, and return dates...'
              : aiMode === 'gemini-vision'
                ? 'Receipts are SHA-256 hashed, parsed via Gemini Vision, and matched against Merchant Memory in under 5ms.'
                : aiMode === 'openai-vision'
                  ? 'Receipts are SHA-256 hashed, parsed via OpenAI Vision, and matched against Merchant Memory in under 5ms.'
                  : 'Receipts are SHA-256 hashed and matched against your Merchant Memory in under 5ms.'}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-nowrap sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            ref={inputTriggerRef}
            type="button"
            disabled={isIngesting}
            onMouseEnter={() => setHoverUpload(true)}
            onMouseLeave={() => setHoverUpload(false)}
            onClick={() => fileInputRef.current?.click()}
            className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[#141413] bg-[#141413] px-4 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A28] disabled:opacity-50 sm:col-span-1"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>Upload Receipt / PDF</span>
            <HotkeyHint shortcut="N" active={hoverUpload} />
          </button>

          <button
            type="button"
            disabled={isIngesting}
            onClick={() => setPasteExpanded((v) => !v)}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-3 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC] disabled:opacity-50"
          >
            <ClipboardPaste className="h-3.5 w-3.5 shrink-0" />
            <span>Paste Order Text</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                pasteExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <button
            type="button"
            disabled={isIngesting}
            onClick={onTrySampleReceipt}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-xs font-medium text-[#615F59] hover:bg-[#F3F1EC] hover:text-[#141413] disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Try Sample Receipt</span>
          </button>
        </div>
      </div>

      {(isIngesting || ingestionStage === 'DATES_VERIFIED') && (
        <div className="mt-3">
          <StagePill currentStage={ingestionStage} />
        </div>
      )}

      {pasteExpanded && (
        <form onSubmit={submitManualText} className="mt-3 space-y-2 border-t border-[#E6E4DD] pt-3">
          <label htmlFor="paste-order-textarea" className="sr-only">
            Order or receipt text
          </label>
          <textarea
            id="paste-order-textarea"
            rows={4}
            value={pasteDraft}
            onChange={(e) => setPasteDraft(e.target.value)}
            placeholder="Paste WhatsApp order confirmation, Daraz SMS, or email invoice snippet..."
            className="w-full rounded-md border border-[#E6E4DD] bg-[#FAF9F6] p-3 text-xs text-[#141413] placeholder:text-[#615F59] focus:border-[#141413] focus:outline-none tabular-ledger"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPasteExpanded(false)}
              className="min-h-[36px] rounded px-3 text-xs text-[#615F59] hover:bg-[#F3F1EC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!pasteDraft.trim() || isIngesting}
              className="min-h-[38px] rounded-md border border-[#141413] bg-[#141413] px-4 text-xs font-semibold text-[#FAF9F6] hover:bg-[#2A2A28] disabled:opacity-50"
            >
              Extract & Verify Dates
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
