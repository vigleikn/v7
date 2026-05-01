import { describe, expect, it } from 'vitest';
import {
  calculateMonthlyData,
  buildCategoryRows,
  buildOverviewMonthColumns,
  MonthlyData,
} from '../services/monthlyCalculations';

const emptyMonth = (month: string): MonthlyData => ({
  month,
  monthLabel: month.slice(5),
  balance: 0,
  income: 0,
  expenses: 0,
  savings: 0,
  uncategorized: 0,
  byCategory: {},
});

describe('monthly overview layout helpers', () => {
  it('orders rows as expenses, savings, income, then balance', () => {
    const rows = buildCategoryRows(
      [emptyMonth('2026-03'), emptyMonth('2026-04')],
      [
        { id: 'cat_inntekter_default', name: 'Inntekter', underkategorier: [] },
        { id: 'sparing', name: 'Sparing', underkategorier: [] },
        { id: 'mat', name: 'Mat', underkategorier: [] },
      ],
      []
    );

    expect(rows.map((row) => row.categoryId)).toEqual([
      '__expenses',
      'sparing',
      'cat_inntekter_default',
      '__balance',
    ]);
  });

  it('reverses month columns while preserving source indexes for drill-down', () => {
    const columns = buildOverviewMonthColumns([
      emptyMonth('2026-02'),
      emptyMonth('2026-03'),
      emptyMonth('2026-04'),
    ]);

    expect(columns.map((column) => column.month)).toEqual([
      '2026-04',
      '2026-03',
      '2026-02',
    ]);
    expect(columns.map((column) => column.sourceIndex)).toEqual([2, 1, 0]);
  });

  it('counts January and February expense transactions in monthly totals', () => {
    const monthlyData = calculateMonthlyData(
      [
        {
          id: 'jan-tx',
          transactionId: 'jan-tx',
          dato: '2026-01-15',
          beløp: -1200,
          type: 'Betaling',
          tekst: 'Januar utgift',
          fraKonto: 'Felles',
          fraKontonummer: '',
          tilKonto: '',
          tilKontonummer: '',
          underkategori: '',
          categoryId: 'food',
          isLocked: false,
        },
        {
          id: 'feb-tx',
          transactionId: 'feb-tx',
          dato: '03.02.26',
          beløp: -800,
          type: 'Betaling',
          tekst: 'Februar utgift',
          fraKonto: 'Felles',
          fraKontonummer: '',
          tilKonto: '',
          tilKontonummer: '',
          underkategori: '',
          categoryId: 'food',
          isLocked: false,
        },
      ],
      ['2026-01', '2026-02'],
      [{ id: 'food', name: 'Mat', underkategorier: [] }],
      []
    );

    expect(monthlyData.map((month) => month.expenses)).toEqual([1200, 800]);
    expect(monthlyData.map((month) => month.byCategory.food)).toEqual([1200, 800]);
  });
});
