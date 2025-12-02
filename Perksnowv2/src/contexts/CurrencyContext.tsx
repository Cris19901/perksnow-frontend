import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Currency, currencies, detectUserCountry, getCurrencyForCountry, convertPrice, formatPrice } from '../utils/currency';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceInUSD: number) => number;
  formatPrice: (price: number, showCode?: boolean) => string;
  formatPriceInUSD: (priceInUSD: number, showCode?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    // Try to get from localStorage
    const saved = localStorage.getItem('currency');
    if (saved) {
      const parsed = JSON.parse(saved);
      return currencies[parsed.code] || getCurrencyForCountry(detectUserCountry());
    }
    // Detect from country
    return getCurrencyForCountry(detectUserCountry());
  });

  useEffect(() => {
    // Save to localStorage whenever currency changes
    localStorage.setItem('currency', JSON.stringify({ code: currency.code }));
  }, [currency]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const convert = (priceInUSD: number): number => {
    return convertPrice(priceInUSD, currency);
  };

  const format = (price: number, showCode = false): string => {
    return formatPrice(price, currency, showCode);
  };

  const formatInUSD = (priceInUSD: number, showCode = false): string => {
    const converted = convertPrice(priceInUSD, currency);
    return formatPrice(converted, currency, showCode);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertPrice: convert,
        formatPrice: format,
        formatPriceInUSD: formatInUSD,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
