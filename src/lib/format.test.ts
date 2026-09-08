import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatMoneyCompact,
  formatDate,
  parseMoney,
  propertyTypeLabel,
} from './format';

/**
 * The API returns money in MAJOR units (naira, not kobo). These tests pin that
 * contract: a unit mistake here would silently show every price 100x wrong.
 */
describe('formatMoney', () => {
  it('renders naira amounts without a second division', () => {
    expect(formatMoney(4_500_000)).toBe('\u20A64,500,000');
  });

  it('does not treat the API value as kobo', () => {
    // A yearly rent of ₦900,000 must not be displayed as ₦9,000.
    expect(formatMoney(900_000)).toBe('\u20A6900,000');
  });

  it('formats other currencies', () => {
    expect(formatMoney(1_500, 'USD')).toBe('$1,500');
  });

  it('handles null and undefined', () => {
    expect(formatMoney(null)).toBe('\u2014');
    expect(formatMoney(undefined)).toBe('\u2014');
  });

  it('can show decimals when asked', () => {
    expect(formatMoney(1_500.5, 'NGN', { withDecimals: true })).toBe('\u20A61,500.50');
  });
});

describe('formatMoneyCompact', () => {
  it('abbreviates millions', () => {
    expect(formatMoneyCompact(4_500_000)).toBe('\u20A64.5M');
  });

  it('abbreviates thousands', () => {
    expect(formatMoneyCompact(900_000)).toBe('\u20A6900K');
  });

  it('leaves small amounts alone', () => {
    expect(formatMoneyCompact(750)).toBe('\u20A6750');
  });
});

describe('parseMoney', () => {
  it('strips separators and symbols', () => {
    expect(parseMoney('1,500,000')).toBe(1_500_000);
    expect(parseMoney('\u20A64,500,000')).toBe(4_500_000);
  });

  it('returns undefined for empty input', () => {
    expect(parseMoney('')).toBeUndefined();
    expect(parseMoney('abc')).toBeUndefined();
  });
});

describe('propertyTypeLabel', () => {
  it('humanises known types', () => {
    expect(propertyTypeLabel('apartment')).toBe('Apartment');
  });

  it('falls back to capitalisation', () => {
    expect(propertyTypeLabel('duplex')).toBe('Duplex');
  });
});

describe('formatDate', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-09-08T00:00:00Z')).toMatch(/8 Sept? 2026/);
  });

  it('renders a placeholder for missing dates', () => {
    expect(formatDate(null)).toBe('\u2014');
    expect(formatDate('not-a-date')).toBe('\u2014');
  });
});
