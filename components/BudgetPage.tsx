/**
 * Budsjett-side
 * Lar bruker planlegge budsjett per underkategori og følge forbruk/saldo
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  PiggyBank,
} from 'lucide-react';
import { shallow } from 'zustand/shallow';
import { Sidebar } from './Sidebar';
import { useTransactionStore } from '../src/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './ui/alert-dialog';
import {
  buildBudgetCategoryTree,
  BudgetCategoryRow,
  compareYearMonth,
  computeMonthlySpending,
  formatMonthHeader,
  getMonthSequence,
  shiftMonth,
  toYearMonth,
  transactionToYearMonth,
} from '../services/budgetCalculations';
import { evaluateBudgetRisk, BudgetRiskLevel } from '../services/budgetRisk';

interface BudgetPageProps {
  onNavigate?: (page: string) => void;
}

interface BudgetCell {
  month: string;
  budget: number;
  actual: number;
  saldo: number;
}

interface BudgetRowView extends BudgetCategoryRow {
  monthly: BudgetCell[];
  children?: BudgetRowView[];
}

interface ActiveCell {
  categoryId: string;
  month: string;
  categoryName: string;
  monthLabel: string;
}

const formatCurrency = (value: number): string => {
  if (Number.isNaN(value)) return '–';
  return Math.round(value).toLocaleString('no');
};

const getDaysInMonth = (monthString: string): number => {
  const [year, month] = monthString.split('-').map(Number);
  // month is 1-indexed (1-12), Date uses 0-indexed months (0-11)
  // new Date(year, month, 0) gives last day of (month-1) in 0-indexed
  // For month=11 (November in 1-indexed), new Date(2025, 11, 0) gives last day of November = 30
  return new Date(year, month, 0).getDate();
};

const getMonthFromDate = (date: string): string => date.slice(0, 7);

const normalizeDateKey = (date: string): string | null => {
  if (!date) return null;
  const trimmed = date.trim();
  if (!trimmed) return null;

  if (trimmed.includes('.')) {
    const [day, month, yearRaw] = trimmed.split('.');
    if (!day || !month || !yearRaw) return null;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw.padStart(4, '0');
    return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  }

  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (!year || !month || !day) return null;
    return `${year.padStart(4, '0')}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  }

  if (parts.length === 2) {
    const [year, month] = parts;
    if (!year || !month) return null;
    return `${year.padStart(4, '0')}${month.padStart(2, '0')}01`;
  }

  return null;
};

const getMonthStartKey = (month: string): string | null => normalizeDateKey(`${month}-01`);

export const BudgetPage: React.FC<BudgetPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('budsjett');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [startBalanceModalOpen, setStartBalanceModalOpen] = useState(false);
  const [startBalanceDraft, setStartBalanceDraft] = useState<{ amount: string; date: string }>({
    amount: '',
    date: '',
  });

  const transactions = useTransactionStore((state) => state.transactions);
  const hovedkategorier = useTransactionStore((state) =>
    Array.from(state.hovedkategorier.values())
  );
  const underkategorier = useTransactionStore((state) =>
    Array.from(state.underkategorier.values())
  );
  const budgetEntries = useTransactionStore(
    (state) => Array.from(state.budgets.entries()),
    shallow
  );
  const startBalance = useTransactionStore((state) => state.startBalance);
  const currentMonth = toYearMonth(new Date());
  const setBudget = useTransactionStore((state) => state.setBudget);
  const setStartBalance = useTransactionStore((state) => state.setStartBalance);

  const budgetMap = useMemo(() => new Map(budgetEntries), [budgetEntries]);

  const startBalanceMonth = startBalance ? getMonthFromDate(startBalance.date) : null;

  const initialMonth = startBalanceMonth ?? toYearMonth(new Date());
  const [startMonth, setStartMonth] = useState(initialMonth);

  useEffect(() => {
    if (startBalanceMonth) {
      setStartMonth((prev) =>
        compareYearMonth(prev, startBalanceMonth) < 0 ? startBalanceMonth : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startBalanceMonth]);

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const visibleMonths = useMemo(() => getMonthSequence(startMonth, 4), [startMonth]);

  const categoryTree = useMemo(
    () => buildBudgetCategoryTree(hovedkategorier, underkategorier),
    [hovedkategorier, underkategorier]
  );

  const editableCategoryIds = useMemo(() => {
    const ids: string[] = [];
    const traverse = (row: BudgetCategoryRow) => {
      if (row.isEditable) {
        ids.push(row.categoryId);
      }
      row.children?.forEach(traverse);
    };
    categoryTree.forEach(traverse);
    return ids;
  }, [categoryTree]);

  // Build set of income subcategory IDs (including the main income category)
  const incomeCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    const incomeHk = hovedkategorier.find(
      (hk) => hk.id === 'cat_inntekter_default' || hk.name === 'Inntekter'
    );
    if (incomeHk) {
      ids.add(incomeHk.id);
      incomeHk.underkategorier?.forEach((ukId) => ids.add(ukId));
    }
    return ids;
  }, [hovedkategorier]);

  const spendingMap = useMemo(
    () =>
      computeMonthlySpending(
        transactions,
        visibleMonths,
        new Set(editableCategoryIds),
        hovedkategorier,
        underkategorier
      ),
    [transactions, visibleMonths, editableCategoryIds, hovedkategorier, underkategorier]
  );

  const buildRowView = useCallback(
    (row: BudgetCategoryRow): BudgetRowView => {
      const { children, ...rest } = row;
      const isIncomeCategory = incomeCategoryIds.has(row.categoryId);

      if (children && children.length > 0) {
        const childViews = children.map(buildRowView);
        const monthly = visibleMonths.map((month, idx) => {
          const budget = childViews.reduce(
            (sum, child) => sum + child.monthly[idx].budget,
            0
          );
          const actual = childViews.reduce(
            (sum, child) => sum + child.monthly[idx].actual,
            0
          );
          // For income: actual - budget (positive when income exceeds budget)
          // For expenses: budget - actual (positive when under budget)
          const saldo = isIncomeCategory ? actual - budget : budget - actual;
          return { month, budget, actual, saldo };
        });
        return { ...rest, monthly, children: childViews };
      }

      const monthly = visibleMonths.map((month) => {
        const key = `${row.categoryId}|${month}`;
        const budget = budgetMap.get(key) ?? 0;
        const actual = spendingMap.get(key) ?? 0;
        // For income: actual - budget (positive when income exceeds budget)
        // For expenses: budget - actual (positive when under budget)
        const saldo = isIncomeCategory ? actual - budget : budget - actual;
        return { month, budget, actual, saldo };
      });

      return { ...rest, monthly };
    },
    [budgetMap, spendingMap, visibleMonths, incomeCategoryIds]
  );

  const baseRowViews = useMemo(
    () => categoryTree.map((row) => buildRowView(row)),
    [categoryTree, buildRowView]
  );

  const incomeRowView = useMemo(
    () => baseRowViews.find((row) => row.categoryId === 'cat_inntekter_default') ?? null,
    [baseRowViews]
  );

  const expensesRowView = useMemo((): BudgetRowView | null => {
    const expenseRows = baseRowViews.filter(
      (row) => row.categoryId !== 'cat_inntekter_default'
    );

    if (expenseRows.length === 0) {
      return null;
    }

    const monthly = visibleMonths.map((month, idx) => {
      const budget = expenseRows.reduce(
        (sum, row) => sum + row.monthly[idx].budget,
        0
      );
      const actual = expenseRows.reduce(
        (sum, row) => sum + row.monthly[idx].actual,
        0
      );
      const saldo = budget - actual;
      return { month, budget, actual, saldo };
    });

    return {
      categoryId: '__expenses_total',
      categoryName: 'Utgifter',
      level: 0,
      isCollapsible: false,
      isEditable: false,
      monthly,
    };
  }, [baseRowViews, visibleMonths]);

  const rowViews = useMemo(() => {
    if (!expensesRowView) {
      return baseRowViews;
    }

    const rows = [...baseRowViews];
    const incomeIndex = rows.findIndex((row) => row.categoryId === 'cat_inntekter_default');
    const insertIndex = incomeIndex >= 0 ? incomeIndex + 1 : 0;
    rows.splice(insertIndex, 0, expensesRowView);
    return rows;
  }, [baseRowViews, expensesRowView]);

  const balanceRowView = useMemo((): BudgetRowView | null => {
    if (!incomeRowView) return null;

    const expenseMonthly = expensesRowView?.monthly ?? [];

    const monthly = visibleMonths.map((month, idx) => {
      const incomeBudget = incomeRowView.monthly[idx]?.budget ?? 0;
      const incomeActual = incomeRowView.monthly[idx]?.actual ?? 0;
      const incomeSaldo = incomeRowView.monthly[idx]?.saldo ?? 0;

      const expenseBudget = expenseMonthly[idx]?.budget ?? 0;
      const expenseActual = expenseMonthly[idx]?.actual ?? 0;
      const expenseSaldo = expenseMonthly[idx]?.saldo ?? 0;

      return {
        month,
        budget: incomeBudget - expenseBudget,
        actual: incomeActual - expenseActual,
        saldo: incomeSaldo - expenseSaldo,
      };
    });

    return {
      categoryId: '__balance_row',
      categoryName: 'Balanse',
      level: 0,
      isCollapsible: false,
      isEditable: false,
      monthly,
    };
  }, [expensesRowView, incomeRowView, visibleMonths]);

  const finalRowViews = useMemo(() => {
    if (!balanceRowView) {
      return rowViews;
    }
    return [balanceRowView, ...rowViews];
  }, [balanceRowView, rowViews]);

  const currentMonthBalance = useMemo(() => {
    if (!startBalance) {
      return null;
    }

    const startKey = normalizeDateKey(startBalance.date);
    if (!startKey) {
      return null;
    }

    const monthStartKey = getMonthStartKey(currentMonth);
    const nextMonthKey = getMonthStartKey(shiftMonth(currentMonth, 1));

    if (!monthStartKey || !nextMonthKey) {
      return null;
    }

    const balance = transactions.reduce((total, tx) => {
      const txKey = normalizeDateKey(tx.dato);
      if (!txKey) {
        return total;
      }

      if (txKey < startKey || txKey < monthStartKey || txKey >= nextMonthKey) {
        return total;
      }

      if (tx.categoryId === 'overfort') {
        return total;
      }

      return total + tx.beløp;
    }, startBalance.amount);

    return balance;
  }, [currentMonth, startBalance, transactions]);

  const currentMonthSaldoDisplay =
    currentMonthBalance !== null ? formatCurrency(currentMonthBalance) : '–';

  // Filter transactions for active cell
  const activeCellTransactions = useMemo(() => {
    if (!activeCell) return [];

    const targetMonth = activeCell.month;
    const categoryId = activeCell.categoryId;

    return transactions.filter((tx) => {
      // Skip transfers
      if (tx.categoryId === 'overfort') {
        return false;
      }

      // Parse transaction date to yyyy-MM format
      let txMonth: string;
      if (tx.dato.includes('.')) {
        const [day, month, year] = tx.dato.split('.');
        const fullYear = year.length === 2 ? `20${year}` : year;
        txMonth = `${fullYear}-${month.padStart(2, '0')}`;
      } else {
        txMonth = tx.dato.substring(0, 7);
      }

      // Check if transaction matches month
      if (txMonth !== targetMonth) return false;

      // Check if transaction matches category
      if (categoryId === '__uncategorized') {
        return !tx.categoryId;
      }

      return tx.categoryId === categoryId;
    });
  }, [activeCell, transactions]);

  const riskColorByLevel: Record<BudgetRiskLevel, string> = {
    'Low': 'text-green-600',
    'Medium': 'text-amber-600',
    'High': 'text-orange-600',
    'Very High': 'text-red-600',
  };

  const riskLevelLabels: Record<BudgetRiskLevel, string> = {
    'Low': 'Lav',
    'Medium': 'Middels',
    'High': 'Høy',
    'Very High': 'Svært høy',
  };

  const riskDescriptions: Record<BudgetRiskLevel, string> = {
    'Low': 'Budsjett følger planen.',
    'Medium': 'Hold øye med inntekter og forbruk.',
    'High': 'Risiko for budsjettoverskridelse – vurder tiltak.',
    'Very High': 'Øyeblikkelig oppfølging anbefales.',
  };

  const currentMonthIndex = visibleMonths.indexOf(currentMonth);

  const budgetRisk = useMemo(() => {
    if (!incomeRowView || !expensesRowView) return null;
    if (currentMonthIndex === -1) return null;

    const incomeMonth = incomeRowView.monthly[currentMonthIndex];
    const expenseMonth = expensesRowView.monthly[currentMonthIndex];

    if (!incomeMonth || !expenseMonth) return null;

    return evaluateBudgetRisk({
      plannedIncome: incomeMonth.budget,
      actualIncome: incomeMonth.actual,
      plannedSpending: expenseMonth.budget,
      actualSpending: expenseMonth.actual,
      today: new Date(),
    });
  }, [incomeRowView, expensesRowView, currentMonthIndex]);

  const earliestDataMonth = useMemo(() => {
    const months: string[] = [];
    if (startBalanceMonth) {
      months.push(startBalanceMonth);
    }
    transactions.forEach((tx) => {
      const month = transactionToYearMonth(tx.dato);
      if (month) months.push(month);
    });
    budgetEntries.forEach(([key]) => {
      const [, month] = key.split('|');
      if (month) months.push(month);
    });

    if (months.length === 0) {
      return startBalanceMonth ?? startMonth;
    }

    return months.reduce((min, month) =>
      compareYearMonth(month, min) < 0 ? month : min
    );
  }, [budgetEntries, startBalanceMonth, startMonth, transactions]);

  const canGoBack = useMemo(() => {
    if (!earliestDataMonth) return false;
    return compareYearMonth(startMonth, earliestDataMonth) > 0;
  }, [earliestDataMonth, startMonth]);

  const handlePrev = () => {
    if (!earliestDataMonth) return;
    const next = shiftMonth(startMonth, -4);
    if (compareYearMonth(next, earliestDataMonth) < 0) {
      setStartMonth(earliestDataMonth);
    } else {
      setStartMonth(next);
    }
  };

  const handleNext = () => {
    setStartMonth(shiftMonth(startMonth, 4));
  };

  const [draftBudgets, setDraftBudgets] = useState<Record<string, string>>({});
  const [activeEditingKey, setActiveEditingKey] = useState<string | null>(null);
  const prevBudgetMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setActiveEditingKey(null);
  }, [visibleMonths]);

  const budgetKeys = useMemo(() => {
    const keys: string[] = [];
    editableCategoryIds.forEach((categoryId) => {
      visibleMonths.forEach((month) => {
        keys.push(`${categoryId}|${month}`);
      });
    });
    return keys;
  }, [editableCategoryIds, visibleMonths]);

  useEffect(() => {
    // Only update if budgetMap values actually changed
    let hasChanges = false;
    const prev = prevBudgetMapRef.current;
    
    // Check if any budget values changed
    for (const key of budgetKeys) {
      const newVal = budgetMap.get(key);
      const oldVal = prev.get(key);
      if (newVal !== oldVal) {
        hasChanges = true;
        break;
      }
    }
    
    // Also check if keys changed (new categories/months)
    if (!hasChanges && prev.size !== budgetMap.size) {
      hasChanges = true;
    }
    
    if (hasChanges) {
      const next: Record<string, string> = {};
      budgetKeys.forEach((key) => {
        const value = budgetMap.get(key);
        next[key] = value !== undefined ? Math.round(value).toString() : '';
      });
      setDraftBudgets(next);
      prevBudgetMapRef.current = new Map(budgetMap);
    }
  }, [budgetKeys, budgetMap]);

  const handleBudgetChange = (key: string, value: string) => {
    const formatted = value.replace(/[^\d,-]/g, '');
    setDraftBudgets((prev) => ({
      ...prev,
      [key]: formatted,
    }));
  };

  const handleBudgetBlur = (categoryId: string, month: string, key: string) => {
    const raw = draftBudgets[key]?.trim() ?? '';
    if (raw === '') {
      setBudget(categoryId, month, 0);
      return;
    }

    const normalized = raw.replace(/\s/g, '').replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setDraftBudgets((prev) => ({
        ...prev,
        [key]: budgetMap.has(key) ? Math.round(budgetMap.get(key)!).toString() : '',
      }));
      return;
    }

    setBudget(categoryId, month, parsed);
  };

  const handleBudgetKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    categoryId: string,
    month: string,
    key: string
  ) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      const value = budgetMap.get(key);
      setDraftBudgets((prev) => ({
        ...prev,
        [key]: value !== undefined ? Math.round(value).toString() : '',
      }));
      event.currentTarget.blur();
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const openStartBalanceModal = () => {
    setStartBalanceDraft({
      amount: startBalance ? startBalance.amount.toString() : '',
      date: startBalance?.date ?? `${visibleMonths[0]}-01`,
    });
    setStartBalanceModalOpen(true);
  };

  const handleStartBalanceSave = () => {
    const amount = Number(
      startBalanceDraft.amount.trim().replace(/\s/g, '').replace(',', '.')
    );
    const date = startBalanceDraft.date;

    if (!date) {
      return;
    }

    if (!Number.isFinite(amount)) {
      return;
    }

    setStartBalance({
      amount: Math.round(amount),
      date,
    });
    setStartBalanceModalOpen(false);
  };

  const handleStartBalanceClear = () => {
    setStartBalance(null);
    setStartBalanceModalOpen(false);
  };

  const renderRow = (row: BudgetRowView, level = 0): React.ReactNode => {
    const isExpanded = expandedCategories.has(row.categoryId);
    const hasChildren = !!row.children && row.children.length > 0;
    const isMain = level === 0 && row.categoryId !== '__expenses_total' && row.categoryId !== '__balance_row';

    const baseRowColor =
      row.categoryId === '__balance_row'
        ? 'bg-blue-100 text-gray-900'
        : row.categoryId === 'cat_inntekter_default' || row.categoryId === '__expenses_total'
        ? 'bg-blue-50'
        : level === 0
        ? 'bg-gray-100'
        : '';

    const rowClassNames = ['border-b border-gray-200', baseRowColor]
      .filter(Boolean)
      .join(' ');

    const rowBody = (
      <>
        <tr
          className={`${rowClassNames} ${hasChildren ? 'cursor-pointer' : ''} h-[45px]`}
          onClick={() => {
            if (hasChildren) {
              toggleCategory(row.categoryId);
            }
          }}
        >
          <td
            className="px-4 py-1 text-sm font-medium text-gray-800"
            style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
          >
            <div className="flex items-center">
              {hasChildren && (
                <span className="text-gray-600 mr-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </span>
              )}
              {!hasChildren && isMain && <span className="w-4 mr-2" />}
              <span>{row.categoryName}</span>
            </div>
          </td>
          {row.monthly.map((cell, cellIndex) => {
            const key = `${row.categoryId}|${cell.month}`;
            const isEditable = row.isEditable;
            const isCurrentMonth = cell.month === currentMonth;
            const actualClass = 'text-gray-800';
            const isIncomeCategory = incomeCategoryIds.has(row.categoryId);
            // For income: green when positive (actual > budget), gray otherwise
            // For expenses: gray (positive means under budget, negative means over budget)
            const saldoClass = isIncomeCategory && cell.saldo > 0 
              ? 'text-green-600 font-medium' 
              : 'text-gray-800 font-medium';
            const currentMonthBg = isCurrentMonth ? 'bg-blue-50/50' : '';
            const isFirstColumnInMonth = cellIndex % 3 === 0;
            const monthIndex = Math.floor(cellIndex / 3);
            const monthSpacing = isFirstColumnInMonth && monthIndex > 0 ? 'ml-4' : '';

            // Determine if "Balanse nå" cell is clickable
            // Only subcategories (level === 1) and "Ukategorisert" (__uncategorized)
            const isCellClickable = 
              (level === 1 || row.categoryId === '__uncategorized') &&
              row.categoryId !== '__balance_row' &&
              row.categoryId !== 'cat_inntekter_default' &&
              row.categoryId !== '__expenses_total';

            // Check if this cell is active
            const isActive = 
              activeCell?.categoryId === row.categoryId && 
              activeCell?.month === cell.month;

            return (
              <React.Fragment key={key}>
                <td className={`px-2 py-1 text-right align-middle min-w-[5rem] w-[7rem] ${currentMonthBg} ${monthSpacing}`}>
                  <div className="w-full text-right overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    {isEditable ? (
                      activeEditingKey === key ? (
                        <Input
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={draftBudgets[key] ?? ''}
                          onChange={(e) => handleBudgetChange(key, e.target.value)}
                          onBlur={() => {
                            handleBudgetBlur(row.categoryId, cell.month, key);
                            setActiveEditingKey(null);
                          }}
                          onKeyDown={(e) => handleBudgetKeyDown(e, row.categoryId, cell.month, key)}
                          className="!w-full text-right"
                          style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveEditingKey(key);
                          }}
                          className="w-full text-right block text-sm text-gray-700 font-medium px-2 py-2 rounded-md border border-transparent hover:border-gray-300 transition-colors"
                        >
                          {formatCurrency(cell.budget)}
                        </button>
                      )
                    ) : (
                      <span className="block text-sm text-gray-700 font-medium">
                        {formatCurrency(cell.budget)}
                      </span>
                    )}
                  </div>
                </td>
                <td 
                  className={`px-2 py-1 text-right align-middle text-sm min-w-[5rem] ${actualClass} ${currentMonthBg} relative ${
                    isCellClickable 
                      ? 'cursor-pointer hover:bg-blue-50 hover:font-semibold' 
                      : ''
                  } ${
                    isActive ? 'bg-blue-100 font-bold ring-2 ring-blue-400 ring-inset' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCellClickable) return;

                    // Toggle: if same cell clicked, close it
                    if (
                      activeCell &&
                      activeCell.categoryId === row.categoryId &&
                      activeCell.month === cell.month
                    ) {
                      setActiveCell(null);
                    } else {
                      setActiveCell({
                        categoryId: row.categoryId,
                        month: cell.month,
                        categoryName: row.categoryName,
                        monthLabel: formatMonthHeader(cell.month),
                      });
                    }
                  }}
                >
                  {formatCurrency(cell.actual)}
                  {cell.budget > 0 && 
                   row.categoryId !== '__balance_row' && 
                   row.categoryId !== 'cat_inntekter_default' && (
                    <>
                      {/* Background track */}
                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-200" />
                      {(() => {
                        const progress = Math.min((cell.actual / cell.budget) * 100, 100);
                        const daysInMonth = getDaysInMonth(cell.month);
                        const today = new Date();
                        const currentYear = today.getFullYear();
                        const currentMonth = today.getMonth() + 1;
                        const monthYear = cell.month.split('-').map(Number);
                        const isCurrentMonth = monthYear[0] === currentYear && monthYear[1] === currentMonth;
                        const todayProgress = isCurrentMonth ? (today.getDate() / daysInMonth) * 100 : null;
                        
                        // Determine color: green if progress hasn't reached today marker, red if it has
                        const progressColor = todayProgress !== null && progress >= todayProgress ? 'bg-red-500' : 'bg-green-500';
                        // Marker color: white if progress has passed, black otherwise
                        const markerColor = todayProgress !== null && progress >= todayProgress ? 'bg-white' : 'bg-black';
                        
                        return (
                          <>
                            {/* Progress bar based on actual / budget */}
                            <div
                              className={`absolute bottom-0 left-0 h-[2px] ${progressColor}`}
                              style={{ width: `${progress}%` }}
                            />
                            {/* Today marker */}
                            {isCurrentMonth && todayProgress !== null && (
                              <div
                                className={`absolute bottom-0 w-[2px] h-[2px] ${markerColor}`}
                                style={{
                                  left: `${todayProgress}%`,
                                  transform: 'translateX(-1px)',
                                }}
                              />
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </td>
                <td className={`px-2 py-1 text-right align-middle text-sm min-w-[5rem] ${saldoClass} ${currentMonthBg}`}>
                  {isIncomeCategory && cell.saldo > 0 
                    ? `+${formatCurrency(cell.saldo)}` 
                    : formatCurrency(cell.saldo)}
                </td>
              </React.Fragment>
            );
          })}
        </tr>

        {hasChildren && isExpanded && row.children!.map((child) => renderRow(child, level + 1))}
      </>
    );

    if (row.categoryId === '__balance_row') {
      return (
        <React.Fragment key={row.categoryId}>
          {rowBody}
          <tr className="bg-gray-50 border-b border-gray-200 h-[45px]">
            <td className="px-4 py-1" />
            {visibleMonths.map((month, monthIndex) => {
              const isCurrentMonth = month === currentMonth;
              const monthSpacing = monthIndex > 0 ? 'ml-4' : '';
              return (
                <React.Fragment key={`balance-subheader-${month}`}>
                  <td className={`px-2 py-1 text-right text-xs font-semibold text-gray-600 min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''} ${monthSpacing}`}>
                    Forventet
                  </td>
                  <td className={`px-2 py-1 text-right text-xs font-semibold text-gray-600 min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''}`}>
                    Faktisk
                  </td>
                  <td className={`px-2 py-1 text-right text-xs font-semibold text-gray-600 min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''}`}>
                    Differanse
                  </td>
                </React.Fragment>
              );
            })}
          </tr>
        </React.Fragment>
      );
    }

    if (row.categoryId === '__expenses_total') {
      return (
        <React.Fragment key={row.categoryId}>
          <tr className="bg-gray-50 border-t border-gray-200 h-[45px]">
            <td className="px-4 py-1" />
            {visibleMonths.map((month, monthIndex) => {
              const isCurrentMonth = month === currentMonth;
              const monthSpacing = monthIndex > 0 ? 'ml-4' : '';
              return (
                <React.Fragment key={`expenses-heading-${month}`}>
                  <td className={`px-2 py-1 text-right text-xs font-semibold text-gray-600 min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''} ${monthSpacing}`}>
                    Øremerket
                  </td>
                  <td className={`px-2 py-1 text-right text-xs font-semibold text-gray-600 min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''}`}>
                    Brukt
                  </td>
                  <td className={`px-2 py-1 text-right text-xs font-semibold text-gray-600 min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''}`}>
                    Rest
                  </td>
                </React.Fragment>
              );
            })}
          </tr>
          {rowBody}
        </React.Fragment>
      );
    }

    return <React.Fragment key={row.categoryId}>{rowBody}</React.Fragment>;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Budsjett</h1>
            </div>
            <div className="flex items-center gap-6">
              {currentMonthBalance !== null && (
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Saldo {formatMonthHeader(currentMonth)}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentMonthSaldoDisplay}
                  </p>
                </div>
              )}
              {budgetRisk && (
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Risiko {formatMonthHeader(currentMonth)}
                  </p>
                  <p className={`text-2xl font-bold ${riskColorByLevel[budgetRisk.riskLevel]}`}>
                    {riskLevelLabels[budgetRisk.riskLevel]}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={openStartBalanceModal}
                title={
                  startBalance
                    ? `Startbalanse: ${formatCurrency(startBalance.amount)} kr`
                    : 'Sett startbalanse'
                }
                aria-label="Sett startbalanse"
              >
                <PiggyBank className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left font-semibold text-gray-700 align-middle"
                    scope="col"
                  >
                    <button
                      onClick={handlePrev}
                      disabled={!canGoBack}
                      className="p-2 rounded border border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Forrige måned"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </th>
                  {visibleMonths.map((month, index) => {
                    const isCurrentMonth = month === currentMonth;
                    return (
                      <th
                        key={`month-${month}`}
                        colSpan={3}
                        className={`px-3 py-3 text-center font-semibold text-gray-700 relative ${isCurrentMonth ? 'bg-blue-50/50 border-l-2 border-r-2 border-blue-200' : ''}`}
                        scope="colgroup"
                      >
                        <span>{formatMonthHeader(month)}</span>
                        {index === visibleMonths.length - 1 && (
                          <button
                            onClick={handleNext}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded border border-gray-300 text-gray-600 hover:text-gray-800"
                            aria-label="Neste måned"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-white border-t border-gray-200 h-[45px]">
                  <th className="px-4 py-1 text-xs font-semibold text-gray-500 text-left">
                    
                  </th>
                  {visibleMonths.map((month, monthIndex) => {
                    const isCurrentMonth = month === currentMonth;
                    const monthSpacing = monthIndex > 0 ? 'ml-4' : '';
                    return (
                      <React.Fragment key={`summary-${month}`}>
                        <th className={`px-2 py-1 text-xs font-semibold text-gray-500 text-right min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''} ${monthSpacing}`}>
                          Til øremerking
                        </th>
                        <th className={`px-2 py-1 text-xs font-semibold text-gray-500 text-right min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''}`}>
                          Balanse nå
                        </th>
                        <th className={`px-2 py-1 text-xs font-semibold text-gray-500 text-right min-w-[5rem] ${isCurrentMonth ? 'bg-blue-50/50' : ''}`}>
                          Risiko
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {finalRowViews.map((row) => renderRow(row))}
              </tbody>
            </table>
          </div>

          {/* Transaction Detail List */}
          {activeCell && activeCellTransactions.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-blue-200">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-900">
                  {activeCell.categoryName} - {activeCell.monthLabel.toUpperCase()}
                  <span className="ml-2 text-sm font-normal text-blue-700">
                    ({activeCellTransactions.length} transaksjon{activeCellTransactions.length !== 1 ? 'er' : ''})
                  </span>
                </h3>
                <button
                  onClick={() => setActiveCell(null)}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  ✕ Lukk
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Dato</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Tekst</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">Beløp</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Fra konto</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Til konto</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Underkategori</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCellTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{tx.dato}</td>
                        <td className="px-4 py-2">{tx.tekst}</td>
                        <td className={`px-4 py-2 text-right font-semibold whitespace-nowrap ${
                          tx.beløp >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.round(tx.beløp).toLocaleString('no')}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{tx.fraKonto || '-'}</td>
                        <td className="px-4 py-2 text-gray-600">{tx.tilKonto || '-'}</td>
                        <td className="px-4 py-2 text-gray-600 italic">{tx.underkategori || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                <span className="font-semibold">Total: </span>
                <span className={`font-bold ${
                  activeCellTransactions.reduce((sum, tx) => sum + tx.beløp, 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {Math.round(activeCellTransactions.reduce((sum, tx) => sum + tx.beløp, 0)).toLocaleString('no')} kr
                </span>
              </div>
            </div>
          )}

          {/* Empty state when cell clicked but no transactions */}
          {activeCell && activeCellTransactions.length === 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-gray-500">
                Ingen transaksjoner funnet for <span className="font-semibold">{activeCell.categoryName}</span> i <span className="font-semibold">{activeCell.monthLabel}</span>
              </p>
              <button
                onClick={() => setActiveCell(null)}
                className="mt-3 text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Lukk
              </button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={startBalanceModalOpen} onOpenChange={setStartBalanceModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sett startbalanse</AlertDialogTitle>
            <AlertDialogDescription>
              Angi hvor mye som sto på konto ved start og hvilken dato balansen gjelder fra.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Beløp (kr)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                value={startBalanceDraft.amount}
                onChange={(e) =>
                  setStartBalanceDraft((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="f.eks. 100000"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Dato</label>
              <Input
                type="date"
                value={startBalanceDraft.date}
                onChange={(e) =>
                  setStartBalanceDraft((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStartBalanceModalOpen(false)}>
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStartBalanceClear}>
              Nullstill
            </AlertDialogAction>
            <AlertDialogAction onClick={handleStartBalanceSave}>
              Lagre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetPage;


