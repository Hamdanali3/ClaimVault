import { useEffect } from 'react';

interface GlobalClipboardPasteOptions {
  onPasteText: (text: string) => void;
  onDropOrPasteFile: (file: File) => void;
  onDragStateChange?: (dragging: boolean) => void;
  disabled?: boolean;
}

export function useGlobalClipboardPaste({
  onPasteText,
  onDropOrPasteFile,
  onDragStateChange,
  disabled = false,
}: GlobalClipboardPasteOptions): void {
  useEffect(() => {
    if (disabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Let normal form inputs handle their own paste unless it's an image file
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length > 0) {
        e.preventDefault();
        onDropOrPasteFile(files[0]);
        return;
      }

      if (isEditable) return;

      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text && text.length >= 8) {
        e.preventDefault();
        onPasteText(text);
      }
    };

    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragCounter += 1;
      onDragStateChange?.(true);
    };

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) onDragStateChange?.(false);
    };

    const handleDrop = (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      dragCounter = 0;
      onDragStateChange?.(false);
      onDropOrPasteFile(files[0]);
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [disabled, onDragStateChange, onDropOrPasteFile, onPasteText]);
}
