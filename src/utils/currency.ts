export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Exchange rate relative to USD
}

export const currencies: Record<string, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 149.50 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', rate: 1.36 },
  AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', rate: 1.53 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rate: 0.88 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.24 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.12 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rate: 1520.00 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', rate: 18.50 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 5.02 },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', rate: 17.15 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', rate: 1320.00 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rate: 1.34 },
};

// Country to currency mapping
export const countryToCurrency: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  EU: 'EUR',
  JP: 'JPY',
  CA: 'CAD',
  AU: 'AUD',
  CH: 'CHF',
  CN: 'CNY',
  IN: 'INR',
  NG: 'NGN',
  ZA: 'ZAR',
  BR: 'BRL',
  MX: 'MXN',
  KR: 'KRW',
  SG: 'SGD',
};

// Mock function to detect user's country (in production, use geolocation API)
export function detectUserCountry(): string {
  // Try to get from browser language
  const language = navigator.language;
  if (language.includes('en-US')) return 'US';
  if (language.includes('en-GB')) return 'GB';
  if (language.includes('ja')) return 'JP';
  if (language.includes('zh')) return 'CN';
  if (language.includes('hi')) return 'IN';
  if (language.includes('es-MX')) return 'MX';
  if (language.includes('pt-BR')) return 'BR';
  if (language.includes('ko')) return 'KR';
  
  // Default to US
  return 'US';
}

export function getCurrencyForCountry(countryCode: string): Currency {
  const currencyCode = countryToCurrency[countryCode] || 'USD';
  return currencies[currencyCode];
}

export function convertPrice(priceInUSD: number, targetCurrency: Currency): number {
  return priceInUSD * targetCurrency.rate;
}

export function formatPrice(price: number, currency: Currency, showCode = false): string {
  const formattedNumber = price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  if (showCode) {
    return `${currency.symbol}${formattedNumber} ${currency.code}`;
  }
  
  return `${currency.symbol}${formattedNumber}`;
}
