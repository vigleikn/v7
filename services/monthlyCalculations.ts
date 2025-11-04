/**
 * Monthly Calculations Helper
 * Computes financial overview data for 12-month period
 */

import { CategorizedTransaction } from '../src/store/state';

export interface MonthlyData {
  month: string; // 'yyyy-MM'
  monthLabel: string; // 'nov', 'des', etc.
  balance: number;
  income: number;
  expenses: number;
  savings: number;
  uncategorized: number;
  byCategory: Record<string, number>; // categoryId -> sum
}

export interface CategoryRowData {
  categoryId: string;
  categoryName: string;
  isSubcategory: boolean;
  isCollapsible: boolean;
  isExpanded?: boolean;
  monthlyValues: number[]; // One per month
  sum: number;
  avg: number;
  variance: number;
  cv: number | null; // Coefficient of Variation (%) - null if avg = 0
  children?: CategoryRowData[];
}

const MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'mai', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'des'
];

// Number of full months to use for summary calculations (excludes current incomplete month)
const FULL_MONTHS_BACK = 11;

/**
 * Get the last 12 months from current date (including current month)
 */
export function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(yearMonth);
  }
  
  return months;
}

/**
 * Get current month in yyyy-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format month key to short label (e.g., '2024-11' -> 'nov')
 */
export function formatMonthLabel(yearMonth: string): string {
  const [, month] = yearMonth.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  return MONTH_NAMES[monthIndex] || month;
}

/**
 * Calculate monthly data for all transactions
 */
export function calculateMonthlyData(
  transactions: CategorizedTransaction[],
  months: string[],
  hovedkategorier: Array<{ id: string; name: string; underkategorier?: string[] }>,
  underkategorier: Array<{ id: string; name: string; hovedkategoriId: string }>
): MonthlyData[] {
  // Build category lookup maps
  const incomeHk = hovedkategorier.find((hk) => hk.id === 'cat_inntekter_default' || hk.name === 'Inntekter');
  const savingsHk = hovedkategorier.find((hk) => hk.id === 'sparing' || hk.name === 'Sparing');
  
  // Get all subcategory IDs for income and savings
  const incomeSubcategoryIds = new Set<string>();
  const savingsSubcategoryIds = new Set<string>();
  
  if (incomeHk) {
    incomeSubcategoryIds.add(incomeHk.id);
    incomeHk.underkategorier?.forEach((ukId) => incomeSubcategoryIds.add(ukId));
  }
  
  if (savingsHk) {
    savingsSubcategoryIds.add(savingsHk.id);
    savingsHk.underkategorier?.forEach((ukId) => savingsSubcategoryIds.add(ukId));
  }
  
  // Group transactions by month
  const transactionsByMonth = new Map<string, CategorizedTransaction[]>();
  
  transactions.forEach((tx) => {
    // Parse date (can be 'DD.MM.YYYY' or 'YYYY-MM-DD')
    let yearMonth: string;
    if (tx.dato.includes('.')) {
      const [day, month, year] = tx.dato.split('.');
      const fullYear = year.length === 2 ? `20${year}` : year;
      yearMonth = `${fullYear}-${month.padStart(2, '0')}`;
    } else {
      yearMonth = tx.dato.substring(0, 7); // 'YYYY-MM'
    }
    
    if (!transactionsByMonth.has(yearMonth)) {
      transactionsByMonth.set(yearMonth, []);
    }
    transactionsByMonth.get(yearMonth)!.push(tx);
  });
  
  // Calculate data for each month
  return months.map((month) => {
    const monthTransactions = transactionsByMonth.get(month) || [];
    
    let income = 0;
    let expenses = 0;
    let savings = 0;
    let uncategorized = 0;
    const byCategory: Record<string, number> = {};
    
    monthTransactions.forEach((tx) => {
      // Skip "Overført" transactions
      if (tx.categoryId === 'overfort') {
        return;
      }
      
      // Uncategorized
      if (!tx.categoryId) {
        if (tx.beløp < 0) {
          uncategorized += Math.abs(tx.beløp);
          expenses += Math.abs(tx.beløp);
        }
        return;
      }
      
      // Check if transaction belongs to Income category (hoofdkategori or any subcategory)
      if (incomeSubcategoryIds.has(tx.categoryId)) {
        income += tx.beløp;
        byCategory[tx.categoryId] = (byCategory[tx.categoryId] || 0) + tx.beløp;
        return;
      }
      
      // Check if transaction belongs to Savings category (separate, not counted as expense)
      // Store NET amount (sum of all transactions including refunds)
      if (savingsSubcategoryIds.has(tx.categoryId)) {
        savings -= tx.beløp; // Subtract because savings transactions are typically negative
        byCategory[tx.categoryId] = (byCategory[tx.categoryId] || 0) - tx.beløp;
        return;
      }
      
      // All other categories are expenses
      // Store NET amount (sum of all transactions including refunds)
      expenses -= tx.beløp; // Subtract because expense transactions are typically negative
      byCategory[tx.categoryId] = (byCategory[tx.categoryId] || 0) - tx.beløp;
    });
    
    const balance = income - expenses;
    
    return {
      month,
      monthLabel: formatMonthLabel(month),
      balance,
      income,
      expenses,
      savings,
      uncategorized,
      byCategory,
    };
  });
}

/**
 * Calculate sum, average, variance, and coefficient of variation for an array of values
 * @param values - Array of values to calculate stats for
 * @param excludeIndices - Optional array of indices to exclude from calculations (e.g., current month)
 */
export function calculateStats(
  values: number[],
  excludeIndices: number[] = []
): { sum: number; avg: number; variance: number; cv: number | null } {
  // Filter out excluded indices
  const filteredValues = values.filter((_, idx) => !excludeIndices.includes(idx));
  
  const sum = filteredValues.reduce((acc, val) => acc + val, 0);
  const avg = filteredValues.length > 0 ? sum / filteredValues.length : 0;
  
  // Calculate variance
  const squaredDiffs = filteredValues.map((val) => Math.pow(val - avg, 2));
  const variance = squaredDiffs.length > 0 
    ? squaredDiffs.reduce((acc, val) => acc + val, 0) / squaredDiffs.length 
    : 0;
  
  // Calculate coefficient of variation (CV)
  // CV = (standard deviation / mean) * 100
  // Return null if average is 0 (to avoid division by zero)
  const stdDev = Math.sqrt(variance);
  const cv = avg !== 0 ? (stdDev / Math.abs(avg)) * 100 : null;
  
  return { sum, avg, variance, cv };
}

/**
 * Build category row data with hierarchy
 * Summary columns (sum, avg, var) are calculated from full months only (excludes current month)
 */
export function buildCategoryRows(
  monthlyData: MonthlyData[],
  hovedkategorier: Array<{ id: string; name: string; underkategorier?: string[] }>,
  underkategorier: Array<{ id: string; name: string; hovedkategoriId: string }>
): CategoryRowData[] {
  const rows: CategoryRowData[] = [];
  
  // Find the index of the current (incomplete) month to exclude from summary calculations
  const currentMonth = getCurrentMonth();
  const currentMonthIndex = monthlyData.findIndex((m) => m.month === currentMonth);
  const excludeIndices = currentMonthIndex >= 0 ? [currentMonthIndex] : [];
  
  // 1. Balanse (top row)
  const balanceValues = monthlyData.map((m) => m.balance);
  const balanceStats = calculateStats(balanceValues, excludeIndices);
  rows.push({
    categoryId: '__balance',
    categoryName: 'Balanse',
    isSubcategory: false,
    isCollapsible: false,
    monthlyValues: balanceValues,
    ...balanceStats,
  });
  
  // 2. Inntekter (non-collapsible)
  const incomeHk = hovedkategorier.find((hk) => hk.id === 'cat_inntekter_default' || hk.name === 'Inntekter');
  if (incomeHk) {
    const incomeValues = monthlyData.map((m) => m.income);
    const incomeStats = calculateStats(incomeValues, excludeIndices);
    
    const incomeChildren: CategoryRowData[] = [];
    incomeHk.underkategorier?.forEach((ukId) => {
      const uk = underkategorier.find((u) => u.id === ukId);
      if (uk) {
        const ukValues = monthlyData.map((m) => m.byCategory[ukId] || 0);
        const ukStats = calculateStats(ukValues, excludeIndices);
        incomeChildren.push({
          categoryId: ukId,
          categoryName: uk.name,
          isSubcategory: true,
          isCollapsible: false,
          monthlyValues: ukValues,
          ...ukStats,
        });
      }
    });
    
    rows.push({
      categoryId: incomeHk.id,
      categoryName: 'Inntekter',
      isSubcategory: false,
      isCollapsible: false,
      monthlyValues: incomeValues,
      ...incomeStats,
      children: incomeChildren,
    });
  }
  
  // 3. Utgifter (collapsible groups)
  // Find all expense hovedkategorier (not inntekter, sparing, overfort)
  const expenseHks = hovedkategorier.filter(
    (hk) => hk.id !== 'cat_inntekter_default' && hk.id !== 'sparing' && hk.id !== 'overfort'
  );
  
  const expenseValues = monthlyData.map((m) => m.expenses);
  const expenseStats = calculateStats(expenseValues, excludeIndices);
  
  const expenseChildren: CategoryRowData[] = [];
  
  expenseHks.forEach((hk) => {
    // Calculate sum for this hovedkategori
    const hkValues = monthlyData.map((m) => {
      let total = 0;
      // Sum all underkategorier
      hk.underkategorier?.forEach((ukId) => {
        total += m.byCategory[ukId] || 0;
      });
      // If no underkategorier, use hovedkategori directly
      if (!hk.underkategorier || hk.underkategorier.length === 0) {
        total = m.byCategory[hk.id] || 0;
      }
      return total;
    });
    const hkStats = calculateStats(hkValues, excludeIndices);
    
    // Build children
    const hkChildren: CategoryRowData[] = [];
    hk.underkategorier?.forEach((ukId) => {
      const uk = underkategorier.find((u) => u.id === ukId);
      if (uk) {
        const ukValues = monthlyData.map((m) => m.byCategory[ukId] || 0);
        const ukStats = calculateStats(ukValues, excludeIndices);
        hkChildren.push({
          categoryId: ukId,
          categoryName: uk.name,
          isSubcategory: true,
          isCollapsible: false,
          monthlyValues: ukValues,
          ...ukStats,
        });
      }
    });
    
    expenseChildren.push({
      categoryId: hk.id,
      categoryName: hk.name,
      isSubcategory: false,
      isCollapsible: true,
      isExpanded: false, // Default collapsed
      monthlyValues: hkValues,
      ...hkStats,
      children: hkChildren.length > 0 ? hkChildren : undefined,
    });
  });
  
  // Add Ukategorisert as a separate expense category
  const uncategorizedValues = monthlyData.map((m) => m.uncategorized);
  const uncategorizedStats = calculateStats(uncategorizedValues, excludeIndices);
  
  expenseChildren.push({
    categoryId: '__uncategorized',
    categoryName: 'Ukategorisert',
    isSubcategory: false,
    isCollapsible: false, // NOT collapsible
    monthlyValues: uncategorizedValues,
    ...uncategorizedStats,
  });
  
  rows.push({
    categoryId: '__expenses',
    categoryName: 'Utgifter',
    isSubcategory: false,
    isCollapsible: false,
    monthlyValues: expenseValues,
    ...expenseStats,
    children: expenseChildren,
  });
  
  // 4. Sparing (non-collapsible)
  const savingsHk = hovedkategorier.find((hk) => hk.id === 'sparing');
  if (savingsHk) {
    const savingsValues = monthlyData.map((m) => m.savings);
    const savingsStats = calculateStats(savingsValues, excludeIndices);
    
    const savingsChildren: CategoryRowData[] = [];
    savingsHk.underkategorier?.forEach((ukId) => {
      const uk = underkategorier.find((u) => u.id === ukId);
      if (uk) {
        const ukValues = monthlyData.map((m) => m.byCategory[ukId] || 0);
        const ukStats = calculateStats(ukValues, excludeIndices);
        savingsChildren.push({
          categoryId: ukId,
          categoryName: uk.name,
          isSubcategory: true,
          isCollapsible: false,
          monthlyValues: ukValues,
          ...ukStats,
        });
      }
    });
    
    rows.push({
      categoryId: 'sparing',
      categoryName: 'Sparing',
      isSubcategory: false,
      isCollapsible: false,
      monthlyValues: savingsValues,
      ...savingsStats,
      children: savingsChildren,
    });
  }
  
  return rows;
}

