import { describe, expect, it } from 'vitest';
import { getQuickDateRange } from '../services/datePeriods';

describe('getQuickDateRange', () => {
  const today = new Date(2026, 3, 30);

  it('returns current month range', () => {
    expect(getQuickDateRange('current-month', today)).toEqual({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });
  });

  it('returns previous month range', () => {
    expect(getQuickDateRange('previous-month', today)).toEqual({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    });
  });

  it('returns last 3 months including today', () => {
    expect(getQuickDateRange('last-3-months', today)).toEqual({
      dateFrom: '2026-02-01',
      dateTo: '2026-04-30',
    });
  });

  it('returns current year to date', () => {
    expect(getQuickDateRange('year-to-date', today)).toEqual({
      dateFrom: '2026-01-01',
      dateTo: '2026-04-30',
    });
  });
});
