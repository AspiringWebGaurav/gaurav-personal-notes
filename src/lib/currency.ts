// src/lib/currency.ts
import { Currency } from '@/types';

export const CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

export const DEFAULT_CURRENCY: Currency['code'] = 'INR';

export function getCurrencySymbol(currencyCode: Currency['code']): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || '₹';
}

export function getCurrencyName(currencyCode: Currency['code']): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.name || 'Indian Rupee';
}

export function formatCurrency(amount: number, currencyCode: Currency['code']): string {
  const symbol = getCurrencySymbol(currencyCode);
  
  // Format with appropriate decimal places
  const formattedAmount = amount.toFixed(2);
  
  // For INR, we can add comma formatting for larger numbers
  if (currencyCode === 'INR') {
    const parts = formattedAmount.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol}${parts.join('.')}`;
  }
  
  return `${symbol}${formattedAmount}`;
}

export function getCurrencyByCode(code: Currency['code']): Currency | undefined {
  return CURRENCIES.find(c => c.code === code);
}