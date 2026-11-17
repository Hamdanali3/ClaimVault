import { useEffect, useState } from 'react';

interface HotkeyHintProps {
  shortcut: string;
  active: boolean;
}

/**
 * Reveals single-key hotkey badge softly after 400ms hover delay
 * (Cockburn/Scarr/Gutwin novice-to-expert organic discovery).
 */
export function HotkeyHint({ shortcut, active }: HotkeyHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  return (
    <kbd className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-[#E6E4DD] bg-[#F3F1EC] px-1 text-[10px] font-medium text-[#615F59] tabular-ledger">
      {shortcut}
    </kbd>
  );
}
