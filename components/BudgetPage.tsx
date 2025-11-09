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

const formatCurrency = (value: number): string => {
  if (Number.isNaN(value)) return '–';
  return Math.round(value).toLocaleString('no');
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

  const visibleMonths = useMemo(() => getMonthSequence(startMonth, 3), [startMonth]);

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

  const overfortCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    const overfort = hovedkategorier.find((hk) => hk.id === 'overfort');
    if (overfort) {
      ids.add(overfort.id);
      overfort.underkategorier?.forEach((id) => ids.add(id));
    }
    return ids;
  }, [hovedkategorier]);

  const spendingMap = useMemo(
    () =>
      computeMonthlySpending(
        transactions,
        visibleMonths,
        new Set(editableCategoryIds)
      ),
    [transactions, visibleMonths, editableCategoryIds]
  );

  const buildRowView = useCallback(
    (row: BudgetCategoryRow): BudgetRowView => {
      if (row.children && row.children.length > 0) {
        const childViews = row.children.map(buildRowView);
        const monthly = visibleMonths.map((month, idx) => {
          const budget = childViews.reduce(
            (sum, child) => sum + child.monthly[idx].budget,
            0
          );
          const actual = childViews.reduce(
            (sum, child) => sum + child.monthly[idx].actual,
            0
          );
          const saldo = budget - actual;
          return { month, budget, actual, saldo };
        });
        return { ...row, monthly, children: childViews };
      }

      const monthly = visibleMonths.map((month) => {
        const key = `${row.categoryId}|${month}`;
        const budget = budgetMap.get(key) ?? 0;
        const actual = spendingMap.get(key) ?? 0;
        const saldo = budget - actual;
        return { month, budget, actual, saldo };
      });

      return { ...row, monthly };
    },
    [budgetMap, spendingMap, visibleMonths]
  );

  const baseRowViews = useMemo(
    () => categoryTree.map((row) => buildRowView(row)),
    [categoryTree, buildRowView]
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

      if (tx.categoryId && overfortCategoryIds.has(tx.categoryId)) {
        return total;
      }

      if (!tx.categoryId && tx.hovedkategori?.toLowerCase() === 'overført') {
        return total;
      }

      return total + tx.beløp;
    }, startBalance.amount);

    return balance;
  }, [currentMonth, overfortCategoryIds, startBalance, transactions]);

  const currentMonthSaldoDisplay =
    currentMonthBalance !== null ? formatCurrency(currentMonthBalance) : '–';

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
    const next = shiftMonth(startMonth, -3);
    if (compareYearMonth(next, earliestDataMonth) < 0) {
      setStartMonth(earliestDataMonth);
    } else {
      setStartMonth(next);
    }
  };

  const handleNext = () => {
    setStartMonth(shiftMonth(startMonth, 3));
  };

  const [draftBudgets, setDraftBudgets] = useState<Record<string, string>>({});
  const prevBudgetMapRef = useRef<Map<string, number>>(new Map());

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
    const isMain = level === 0 && row.categoryId !== '__uncategorized';

    const baseRowColor =
      row.categoryId === 'cat_inntekter_default' || row.categoryId === '__expenses_total'
        ? 'bg-blue-50'
        : level === 0
        ? 'bg-gray-100'
        : '';

    const rowClassNames = ['border-b border-gray-200', baseRowColor]
      .filter(Boolean)
      .join(' ');

    const rowBody = (
      <>
        <tr className={rowClassNames}>
          <td
            className="px-4 py-3 text-sm font-medium text-gray-800"
            style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
          >
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleCategory(row.categoryId)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
              )}
              {!hasChildren && isMain && <span className="w-4" />}
              <span>{row.categoryName}</span>
            </div>
          </td>
          {row.monthly.map((cell) => {
            const key = `${row.categoryId}|${cell.month}`;
            const isEditable = row.isEditable;
            const actualClass = 'text-gray-800';
            const saldoClass = 'text-gray-800 font-medium';

            return (
              <React.Fragment key={key}>
                <td className="px-3 py-3 text-right align-middle">
                  {isEditable ? (
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={draftBudgets[key] ?? ''}
                      onChange={(e) => handleBudgetChange(key, e.target.value)}
                      onBlur={() => handleBudgetBlur(row.categoryId, cell.month, key)}
                      onKeyDown={(e) => handleBudgetKeyDown(e, row.categoryId, cell.month, key)}
                      className="w-24 text-right"
                    />
                  ) : (
                    <span className="text-sm text-gray-700 font-medium">
                      {formatCurrency(cell.budget)}
                    </span>
                  )}
                </td>
                <td className={`px-3 py-3 text-right align-middle text-sm ${actualClass}`}>
                  {formatCurrency(cell.actual)}
                </td>
                <td className={`px-3 py-3 text-right align-middle text-sm ${saldoClass}`}>
                  {formatCurrency(cell.saldo)}
                </td>
              </React.Fragment>
            );
          })}
        </tr>

        {hasChildren && isExpanded && row.children!.map((child) => renderRow(child, level + 1))}
      </>
    );

    if (row.categoryId === '__expenses_total') {
      return (
        <React.Fragment key={row.categoryId}>
          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="px-4 py-2" />
            {visibleMonths.map((month) => (
              <React.Fragment key={`expenses-heading-${month}`}>
                <td className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                  Øremerket
                </td>
                <td className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                  Brukt
                </td>
                <td className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                  Rest
                </td>
              </React.Fragment>
            ))}
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
              <p className="text-gray-600 mt-2">
                Sett budsjett per underkategori, følg forbruk og se hvor mye som gjenstår.
              </p>
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

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-left font-semibold text-gray-700 align-middle"
                    scope="col"
                  >
                    <button
                      onClick={handlePrev}
                      disabled={!canGoBack}
                      className="mr-2 p-2 rounded border border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Forrige måned"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    Kategori
                  </th>
                  {visibleMonths.map((month, index) => (
                    <th
                      key={`month-${month}`}
                      colSpan={3}
                      className="px-3 py-3 text-center font-semibold text-gray-700 relative"
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
                  ))}
                </tr>
                <tr className="bg-gray-50 border-t border-gray-200">
                  {visibleMonths.map((month) => (
                    <React.Fragment key={`labels-${month}`}>
                      <th
                        className="px-3 py-2 text-right text-xs font-semibold text-gray-600"
                        scope="col"
                      >
                        Forventet
                      </th>
                      <th
                        className="px-3 py-2 text-right text-xs font-semibold text-gray-600"
                        scope="col"
                      >
                        Faktisk
                      </th>
                      <th
                        className="px-3 py-2 text-right text-xs font-semibold text-gray-600"
                        scope="col"
                      >
                        Mangler
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowViews.map((row) => renderRow(row))}
              </tbody>
            </table>
          </div>
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


