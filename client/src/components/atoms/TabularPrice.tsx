import { formatMoney } from '../../utils/formatters';

interface TabularPriceProps {
  amount: number;
  currency: string;
  className?: string;
}

export function TabularPrice({ amount, currency, className = '' }: TabularPriceProps) {
  return (
    <span className={`tabular-ledger tracking-tight ${className}`}>
      {formatMoney(amount, currency)}
    </span>
  );
}
