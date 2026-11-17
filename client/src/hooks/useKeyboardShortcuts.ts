import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleCommandPalette: () => void;
  onNewReceiptFocus: () => void;
  onExportClaimPdf?: () => void;
  onMarkReturned?: () => void;
}

export function useKeyboardShortcuts({
  onToggleCommandPalette,
  onNewReceiptFocus,
  onExportClaimPdf,
  onMarkReturned,
}: ShortcutHandlers): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleCommandPalette();
        return;
      }

      if (isEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        onToggleCommandPalette();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewReceiptFocus();
      } else if (e.key.toLowerCase() === 'c' && onExportClaimPdf) {
        e.preventDefault();
        onExportClaimPdf();
      } else if (e.key.toLowerCase() === 'r' && onMarkReturned) {
        e.preventDefault();
        onMarkReturned();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExportClaimPdf, onMarkReturned, onNewReceiptFocus, onToggleCommandPalette]);
}
