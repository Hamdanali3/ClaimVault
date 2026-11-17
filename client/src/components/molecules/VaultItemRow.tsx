import { FileText, ChevronRight } from 'lucide-react';
import type { VaultItemDTO } from '@claimvault/shared';
import { CountdownBadge } from '../atoms/CountdownBadge';
import { TabularPrice } from '../atoms/TabularPrice';
import { formatShortDate } from '../../utils/formatters';

interface VaultItemRowProps {
  item: VaultItemDTO;
  onSelect: (item: VaultItemDTO) => void;
}

export function VaultItemRow({ item, onSelect }: VaultItemRowProps) {
  return (
    <tr
      onClick={() => onSelect(item)}
      className="cursor-pointer border-b border-[#E6E4DD] bg-[#FFFFFF] transition-colors hover:bg-[#FAF9F6]"
    >
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#E6E4DD] bg-[#F3F1EC] text-[#615F59]">
            <FileText className="h-4 w-4 stroke-[1.5]" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#141413]">
              {item.title}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#615F59]">
              <span>{item.merchantName}</span>
              <span>·</span>
              <span>{item.category}</span>
              {item.identifiers.serialNumber && (
                <>
                  <span>·</span>
                  <span className="tabular-ledger">S/N {item.identifiers.serialNumber}</span>
                </>
              )}
              {item.identifiers.orderNumber && (
                <>
                  <span>·</span>
                  <span className="tabular-ledger">#{item.identifiers.orderNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="hidden px-4 py-3.5 text-xs text-[#615F59] md:table-cell tabular-ledger">
        {formatShortDate(item.dates.purchaseDate)}
      </td>

      <td className="px-4 py-3.5">
        <CountdownBadge item={item} />
      </td>

      <td className="px-4 py-3.5 text-right">
        <TabularPrice
          amount={item.financials.amount}
          currency={item.financials.currency}
          className="text-sm font-semibold text-[#141413]"
        />
      </td>

      <td className="w-10 px-3 py-3.5 text-right text-[#615F59]">
        <ChevronRight className="inline h-4 w-4" />
      </td>
    </tr>
  );
}
