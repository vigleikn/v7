export type QuickDatePeriod =
  | 'current-month'
  | 'previous-month'
  | 'last-3-months'
  | 'last-12-months'
  | 'year-to-date';

export const QUICK_DATE_PERIODS: Array<{ id: QuickDatePeriod; label: string }> = [
  { id: 'current-month', label: 'Denne måneden' },
  { id: 'previous-month', label: 'Forrige måned' },
  { id: 'last-3-months', label: 'Siste 3 mnd' },
  { id: 'last-12-months', label: 'Siste 12 mnd' },
  { id: 'year-to-date', label: 'I år' },
];

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const firstDayOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const lastDayOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export function getQuickDateRange(
  period: QuickDatePeriod,
  today = new Date()
): { dateFrom: string; dateTo: string } {
  if (period === 'current-month') {
    return {
      dateFrom: toIsoDate(firstDayOfMonth(today)),
      dateTo: toIsoDate(lastDayOfMonth(today)),
    };
  }

  if (period === 'previous-month') {
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return {
      dateFrom: toIsoDate(firstDayOfMonth(previousMonth)),
      dateTo: toIsoDate(lastDayOfMonth(previousMonth)),
    };
  }

  if (period === 'last-3-months') {
    return {
      dateFrom: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      dateTo: toIsoDate(today),
    };
  }

  if (period === 'last-12-months') {
    return {
      dateFrom: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 11, 1)),
      dateTo: toIsoDate(today),
    };
  }

  return {
    dateFrom: `${today.getFullYear()}-01-01`,
    dateTo: toIsoDate(today),
  };
}
