/**
 * Budget export for the phone PWA.
 * Produces a single JSON file: categories + per-category sums + optional per-month breakdown.
 */

import type { CategorizedTransaction } from './categoryEngine';
import type { Hovedkategori, Underkategori } from './src/store/state';

export interface BudgetExportCategory {
  id: string;
  name: string;
  type: 'hovedkategori' | 'underkategori';
  parentId?: string;
  sortOrder: number;
  color?: string;
  icon?: string;
}

export interface BudgetExportPayload {
  meta: {
    exportedAt: string;
    period?: string;
  };
  categories: BudgetExportCategory[];
  byCategory: { categoryId: string; sum: number }[];
  byMonthByCategory: Record<string, Record<string, number>>;
  /** Budsjett per måned per kategori: byMonthBudget[year-month][categoryId] = beløp */
  byMonthBudget: Record<string, Record<string, number>>;
}

/**
 * Parse transaction date to year-month string (YYYY-MM).
 * Supports: dd.mm.yy, dd.mm.yyyy, yyyy-mm-dd, yyyy-mm.
 */
function toYearMonth(dato: string): string {
  if (!dato || typeof dato !== 'string') return '';
  const trimmed = dato.trim();
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length >= 3) {
      const [, month, yearRaw] = parts;
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      const m = month.padStart(2, '0');
      return `${year}-${m}`;
    }
    return '';
  }
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length >= 2) {
      const [y, m] = parts;
      const month = (m || '').padStart(2, '0');
      return `${y}-${month}`;
    }
  }
  return '';
}

/**
 * Build export payload from current store state (transactions + categories + budgets).
 */
export function buildBudgetExport(
  transactions: CategorizedTransaction[],
  hovedkategorier: Map<string, Hovedkategori>,
  underkategorier: Map<string, Underkategori>,
  budgets: Map<string, number>
): BudgetExportPayload {
  const categories: BudgetExportCategory[] = [];
  const byCategory = new Map<string, number>();
  const byMonthByCategory: Record<string, Record<string, number>> = {};

  // Serialize categories (order: hovedkategorier by sortOrder, then underkategorier under each)
  const hovedList = Array.from(hovedkategorier.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  for (const h of hovedList) {
    categories.push({
      id: h.id,
      name: h.name,
      type: 'hovedkategori',
      sortOrder: h.sortOrder,
      color: h.color,
      icon: h.icon,
    });
    for (const ukId of h.underkategorier) {
      const uk = underkategorier.get(ukId);
      if (uk) {
        categories.push({
          id: uk.id,
          name: uk.name,
          type: 'underkategori',
          parentId: uk.hovedkategoriId,
          sortOrder: uk.sortOrder,
        });
      }
    }
  }

  // Sum by category (only categorized transactions)
  for (const tx of transactions) {
    if (!tx.categoryId) continue;
    const sum = byCategory.get(tx.categoryId) ?? 0;
    byCategory.set(tx.categoryId, sum + tx.beløp);

    const ym = toYearMonth(tx.dato);
    if (ym) {
      if (!byMonthByCategory[ym]) byMonthByCategory[ym] = {};
      const prev = byMonthByCategory[ym][tx.categoryId] ?? 0;
      byMonthByCategory[ym][tx.categoryId] = prev + tx.beløp;
    }
  }

  const byCategoryList = Array.from(byCategory.entries()).map(([categoryId, sum]) => ({
    categoryId,
    sum,
  }));

  // byMonthBudget from budgets Map (key = "categoryId|YYYY-MM")
  const byMonthBudget: Record<string, Record<string, number>> = {};
  if (budgets && budgets.size > 0) {
    budgets.forEach((amount, key) => {
      const i = key.indexOf('|');
      if (i === -1) return;
      const categoryId = key.slice(0, i);
      let month = key.slice(i + 1).trim();
      if (month.length >= 7) month = month.slice(0, 7);
      if (month.length === 6 && month.indexOf('-') === -1) {
        month = `${month.slice(0, 4)}-${month.slice(4, 6)}`;
      }
      if (!byMonthBudget[month]) byMonthBudget[month] = {};
      byMonthBudget[month][categoryId] = amount;
    });
  }

  return {
    meta: {
      exportedAt: new Date().toISOString(),
    },
    categories,
    byCategory: byCategoryList,
    byMonthByCategory,
    byMonthBudget,
  };
}
