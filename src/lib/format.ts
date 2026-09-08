/**
 * Display formatting for money.
 *
 * MONEY CONTRACT (important): the API exposes monetary amounts in MAJOR units
 * — naira, not kobo. The database stores integers in minor units and every DTO
 * divides by 100 on the way out, so a yearly rent of ₦4,500,000 arrives as
 * `4500000`. Do not divide again here.
 *
 * Amounts are only ever formatted (never used in arithmetic) on the client, so
 * no float precision can leak into anything a user is charged.
 */

const SYMBOLS: Record<string, string> = {
  NGN: '\u20A6',
  USD: '$',
  GBP: '\u00A3',
  EUR: '\u20AC',
  GHS: 'GH\u20B5',
  KES: 'KSh',
  ZAR: 'R',
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

/** e.g. 4_500_000 -> "₦4,500,000" */
export function formatMoney(amount: number | null | undefined, currency = 'NGN', options?: { withDecimals?: boolean }): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `${currencySymbol(currency)}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: options?.withDecimals ? 2 : 0,
    maximumFractionDigits: options?.withDecimals ? 2 : 0,
  })}`;
}

/** Compact form for dense views: 4_500_000 -> "₦4.5M". */
export function formatMoneyCompact(amount: number | null | undefined, currency = 'NGN'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const symbol = currencySymbol(currency);

  if (amount >= 1_000_000_000) return `${symbol}${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `${symbol}${Math.round(amount / 1_000)}K`;
  return `${symbol}${amount.toLocaleString('en-NG')}`;
}

/** Parses a user-typed amount ("1,500,000") into a plain number of naira. */
export function parseMoney(input: string): number | undefined {
  const cleaned = input.replace(/[^\d.]/g, '');
  if (!cleaned) return undefined;
  const value = Number.parseFloat(cleaned);
  return Number.isNaN(value) ? undefined : value;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartment',
  house: 'House',
  condo: 'Condo',
  townhouse: 'Townhouse',
  studio: 'Studio',
  room: 'Room',
  duplex: 'Duplex',
  bungalow: 'Bungalow',
  commercial: 'Commercial',
  land: 'Land',
};

export function propertyTypeLabel(type: string): string {
  return PROPERTY_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
