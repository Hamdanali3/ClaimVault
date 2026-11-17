export function formatMoney(amount: number, currency = 'PKR'): string {
  const isWhole = Math.abs(amount - Math.round(amount)) < 0.005;
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'USD' && !isWhole ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCountdownLabel(
  hoursRemaining: number | null | undefined,
  deadlineType: 'RETURN' | 'RENEWAL' | 'WARRANTY' | null | undefined,
): string {
  if (hoursRemaining === null || hoursRemaining === undefined) {
    return 'Protected';
  }
  const prefix =
    deadlineType === 'RETURN'
      ? 'Return closes in '
      : deadlineType === 'RENEWAL'
        ? 'Renews in '
        : 'Warranty ends in ';

  if (hoursRemaining <= 0) return `${prefix}0h`;
  if (hoursRemaining < 72) return `${prefix}${Math.round(hoursRemaining)}h`;
  const days = Math.round(hoursRemaining / 24);
  return `${prefix}${days}d`;
}
