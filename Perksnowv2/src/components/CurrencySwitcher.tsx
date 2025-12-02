import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useCurrency } from '../contexts/CurrencyContext';
import { currencies } from '../utils/currency';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currency.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Currency</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-auto">
          {Object.values(currencies).map((curr) => (
            <DropdownMenuItem
              key={curr.code}
              onClick={() => setCurrency(curr)}
              className={currency.code === curr.code ? 'bg-accent' : ''}
            >
              <div className="flex items-center justify-between w-full">
                <span>
                  {curr.symbol} {curr.name}
                </span>
                <span className="text-xs text-gray-500">{curr.code}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
