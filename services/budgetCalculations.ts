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

    const row: BudgetCategoryRow = {
      categoryId: hk.id,
      categoryName: hk.name,
      level: 0,
      isCollapsible: hasChildren,
      isEditable: !hasChildren,
      children: hasChildren ? children : undefined,
    };

    rows.push(row);
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
  editableCategoryIds: Set<string>,
  hovedkategorier?: Hovedkategori[],
  underkategorier?: Underkategori[]
): Map<string, number> {
  const result = new Map<string, number>();
  const monthSet = new Set(months);

  // Build category lookup maps (similar to monthlyCalculations.ts)
  const incomeSubcategoryIds = new Set<string>();
  const savingsSubcategoryIds = new Set<string>();

  if (hovedkategorier && underkategorier) {
    const incomeHk = hovedkategorier.find(
      (hk) => hk.id === 'cat_inntekter_default' || hk.name === 'Inntekter'
    );
    const savingsHk = hovedkategorier.find(
      (hk) => hk.id === 'sparing' || hk.name === 'Sparing'
    );

    if (incomeHk) {
      incomeSubcategoryIds.add(incomeHk.id);
      incomeHk.underkategorier?.forEach((ukId) => incomeSubcategoryIds.add(ukId));
    }

    if (savingsHk) {
      savingsSubcategoryIds.add(savingsHk.id);
      savingsHk.underkategorier?.forEach((ukId) => savingsSubcategoryIds.add(ukId));
    }
  }

  transactions.forEach((tx) => {
    const month = transactionToYearMonth(tx.dato);
    if (!monthSet.has(month)) return;

    if (tx.categoryId === 'overfort') {
      return;
    }

    let categoryId = tx.categoryId;
    if (!categoryId) {
      categoryId = '__uncategorized';
    }

    if (!editableCategoryIds.has(categoryId)) {
      return;
    }

    const key = `${categoryId}|${month}`;
    const value = result.get(key) ?? 0;

    // Use same balance logic as OversiktPage (monthlyCalculations.ts)
    // For income: add tx.beløp directly (positive amounts increase income)
    // For expenses and savings: subtract tx.beløp (negative amounts become positive, positive amounts become negative)
    // This means: expense -1000 becomes +1000, refund +200 becomes -200, net = 800
    let delta: number;
    if (hovedkategorier && incomeSubcategoryIds.has(categoryId)) {
      // Income: add directly
      delta = tx.beløp;
    } else {
      // Expenses and savings: subtract (net balance logic)
      delta = -tx.beløp;
    }

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


