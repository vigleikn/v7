/**
 * Budget Calculations Helper
 * Utilities for budgeting page (month navigation, spending aggregation, category tree)
 */

import { CategorizedTransaction, Hovedkategori, Underkategori } from '../src/store';
import { formatMonthLabel } from './monthlyCalculations';

// ============================================================================
// Types
// ============================================================================

export interface BudgetCategoryRow {
  categoryId: string;
  categoryName: string;
  level: number;
  isCollapsible: boolean;
  isEditable: boolean;
  children?: BudgetCategoryRow[];
}

// ============================================================================
// Month Helpers
// ============================================================================

export function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(yearMonth: string, offset: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return toYearMonth(date);
}

export function compareYearMonth(a: string, b: string): number {
  return a.localeCompare(b);
}

export function getMonthSequence(startMonth: string, count: number): string[] {
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    months.push(shiftMonth(startMonth, i));
  }
  return months;
}

export function formatMonthHeader(yearMonth: string): string {
  const label = formatMonthLabel(yearMonth);
  const [year] = yearMonth.split('-');
  return `${label.toUpperCase()} ${year}`;
}

// ============================================================================
// Category Tree
// ============================================================================

export function buildBudgetCategoryTree(
  hovedkategorier: Hovedkategori[],
  underkategorier: Underkategori[]
): BudgetCategoryRow[] {
  const rows: BudgetCategoryRow[] = [];

  const sortedHks = [...hovedkategorier].sort((a, b) => a.sortOrder - b.sortOrder);
  const underMap = new Map<string, Underkategori>();
  underkategorier.forEach((uk) => underMap.set(uk.id, uk));

  sortedHks.forEach((hk) => {
    // Skip "Overført" categories from budgeting view
    if (hk.id === 'overfort') {
      return;
    }

    const children: BudgetCategoryRow[] =
      hk.underkategorier
        ?.map((id) => underMap.get(id))
        .filter(Boolean)
        .map((uk) => ({
          categoryId: uk!.id,
          categoryName: uk!.name,
          level: 1,
          isCollapsible: false,
          isEditable: true,
        })) ?? [];

    const hasChildren = children.length > 0;

    rows.push({
      categoryId: hk.id,
      categoryName: hk.name,
      level: 0,
      isCollapsible: hasChildren,
      isEditable: !hasChildren,
      children: hasChildren ? children : undefined,
    });
  });

  const hasUncategorized = rows.some((row) => row.categoryId === '__uncategorized');
  if (!hasUncategorized) {
    rows.push({
      categoryId: '__uncategorized',
      categoryName: 'Ukategorisert',
      level: 0,
      isCollapsible: false,
      isEditable: true,
    });
  }

  return rows;
}

// ============================================================================
// Transaction Aggregation
// ============================================================================

export function transactionToYearMonth(dato: string): string {
  if (!dato) return '';
  if (dato.includes('.')) {
    const [day, month, year] = dato.split('.');
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}`;
  }
  return dato.substring(0, 7);
}

export function computeMonthlySpending(
  transactions: CategorizedTransaction[],
  months: string[],
  editableCategoryIds: Set<string>
): Map<string, number> {
  const result = new Map<string, number>();
  const monthSet = new Set(months);

  transactions.forEach((tx) => {
    const month = transactionToYearMonth(tx.dato);
    if (!monthSet.has(month)) return;

    let categoryId = tx.categoryId;
    if (!categoryId) {
      categoryId = '__uncategorized';
    }

    if (!editableCategoryIds.has(categoryId)) {
      return;
    }

    const key = `${categoryId}|${month}`;
    const value = result.get(key) ?? 0;
    const delta = Math.abs(tx.beløp);
    result.set(key, value + delta);
  });

  return result;
}

export function computeMonthlyNetChange(
  transactions: CategorizedTransaction[]
): Map<string, number> {
  const map = new Map<string, number>();

  transactions.forEach((tx) => {
    const month = transactionToYearMonth(tx.dato);
    const value = map.get(month) ?? 0;
    map.set(month, value + tx.beløp);
  });

  return map;
}


