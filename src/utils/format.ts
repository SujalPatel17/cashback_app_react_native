import { format } from 'date-fns';

/** Equivalent of intl NumberFormat.currency(locale: 'en_IN', symbol: '₹'). */
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return inrFormatter.format(value);
}

/** ₹ + fixed 2 decimals, matching `'₹${x.toStringAsFixed(2)}'`. */
export function rupees(value: number): string {
  return `₹${value.toFixed(2)}`;
}

/** DateFormat.yMMMd() -> e.g. "Jun 30, 2026". */
export function formatYMMMd(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

/** DateFormat('dd MMM yyyy') -> e.g. "30 Jun 2026". */
export function formatDdMmmYyyy(date: Date): string {
  return format(date, 'dd MMM yyyy');
}
