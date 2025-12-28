/**
 * HomePage - Dashboard with expense category tiles
 * Shows 16 expense subcategories for current month as responsive tiles
 */

import React, { useMemo, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useTransactionStore } from '../src/store';
import {
  computeMonthlySpending,
  toYearMonth,
  transactionToYearMonth,
  formatMonthHeader,
} from '../services/budgetCalculations';

interface HomePageProps {
  onNavigate?: (page: string) => void;
}

interface CategoryTile {
  categoryId: string;
  categoryName: string;
  icon: string;
  actual: number;
  budget: number;
  exceeded: number; // actual - budget (positive means over budget)
}

interface ActiveTile {
  categoryId: string;
  categoryName: string;
}

const formatCurrency = (value: number): string => {
  if (Number.isNaN(value)) return '–';
  return Math.round(value).toLocaleString('no');
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [activePage] = useState('hjem');
  const [showAll, setShowAll] = useState(false);
  const [activeTile, setActiveTile] = useState<ActiveTile | null>(null);

  const transactions = useTransactionStore((state) => state.transactions);
  const hovedkategorier = useTransactionStore((state) =>
    Array.from(state.hovedkategorier.values())
  );
  const underkategorier = useTransactionStore((state) =>
    Array.from(state.underkategorier.values())
  );
  const budgetEntries = useTransactionStore((state) =>
    Array.from(state.budgets.entries())
  );

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const currentMonth = toYearMonth(new Date());
  const budgetMap = useMemo(() => new Map(budgetEntries), [budgetEntries]);

  // Get all expense subcategory IDs (exclude income, savings, overfort)
  const expenseSubcategories = useMemo(() => {
    const excludedHks = new Set(['cat_inntekter_default', 'sparing', 'overfort']);
    const result: Array<{ id: string; name: string; icon: string; hovedkategoriId: string }> = [];

    hovedkategorier.forEach((hk) => {
      if (excludedHks.has(hk.id)) return;

      // Get subcategories for this hovedkategori
      const subs = hk.underkategorier
        ?.map((ukId) => underkategorier.find((uk) => uk.id === ukId))
        .filter(Boolean) ?? [];

      subs.forEach((uk) => {
        if (uk) {
          result.push({
            id: uk.id,
            name: uk.name,
            icon: hk.icon || '📁', // Use hovedkategori icon
            hovedkategoriId: hk.id,
          });
        }
      });

      // If no subcategories, include the hovedkategori itself if it's editable
      if (subs.length === 0) {
        result.push({
          id: hk.id,
          name: hk.name,
          icon: hk.icon || '📁',
          hovedkategoriId: hk.id,
        });
      }
    });

    return result;
  }, [hovedkategorier, underkategorier]);

  // Compute spending for current month
  const spendingMap = useMemo(() => {
    const editableIds = new Set(expenseSubcategories.map((s) => s.id));
    editableIds.add('__uncategorized');
    return computeMonthlySpending(
      transactions,
      [currentMonth],
      editableIds,
      hovedkategorier,
      underkategorier
    );
  }, [transactions, currentMonth, expenseSubcategories, hovedkategorier, underkategorier]);

  // Build tiles with actual, budget, and exceeded
  const tiles = useMemo((): CategoryTile[] => {
    const result: CategoryTile[] = [];

    expenseSubcategories.forEach((sub) => {
      const key = `${sub.id}|${currentMonth}`;
      const actual = spendingMap.get(key) ?? 0;
      const budget = budgetMap.get(key) ?? 0;
      const exceeded = actual - budget;

      result.push({
        categoryId: sub.id,
        categoryName: sub.name,
        icon: sub.icon,
        actual,
        budget,
        exceeded,
      });
    });

    // Add uncategorized
    const uncategorizedKey = `__uncategorized|${currentMonth}`;
    const uncategorizedActual = spendingMap.get(uncategorizedKey) ?? 0;
    if (uncategorizedActual > 0) {
      result.push({
        categoryId: '__uncategorized',
        categoryName: 'Ukategorisert',
        icon: '❓',
        actual: uncategorizedActual,
        budget: 0,
        exceeded: uncategorizedActual,
      });
    }

    // Sort: most exceeded first (highest exceeded value at top)
    // Then by actual spending descending
    result.sort((a, b) => {
      // Primary: exceeded (positive means over budget)
      if (b.exceeded !== a.exceeded) {
        return b.exceeded - a.exceeded;
      }
      // Secondary: actual spending
      return b.actual - a.actual;
    });

    return result;
  }, [expenseSubcategories, spendingMap, budgetMap, currentMonth]);

  // Calculate how many tiles fit in 3 rows
  // With 220px tiles + gap, we estimate ~5-6 tiles per row on desktop
  // Show first 15 tiles (3 rows × 5 tiles) by default
  const visibleTiles = showAll ? tiles : tiles.slice(0, 15);
  const hasMoreTiles = tiles.length > 15;

  // Filter transactions for active tile
  const activeTileTransactions = useMemo(() => {
    if (!activeTile) return [];

    return transactions.filter((tx) => {
      // Skip transfers
      if (tx.categoryId === 'overfort') return false;

      // Parse transaction date
      const txMonth = transactionToYearMonth(tx.dato);
      if (txMonth !== currentMonth) return false;

      // Match category
      if (activeTile.categoryId === '__uncategorized') {
        return !tx.categoryId;
      }

      return tx.categoryId === activeTile.categoryId;
    });
  }, [activeTile, transactions, currentMonth]);

  // Progress bar helpers
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  const daysInMonth = getDaysInMonth(currentYear, currentMonthNum);
  const todayProgress = (today.getDate() / daysInMonth) * 100;

  const handleTileClick = (tile: CategoryTile) => {
    if (activeTile?.categoryId === tile.categoryId) {
      setActiveTile(null);
    } else {
      setActiveTile({
        categoryId: tile.categoryId,
        categoryName: tile.categoryName,
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Forbruk {formatMonthHeader(currentMonth)}</h1>
            <p className="text-gray-600 mt-2">
              Oversikt over utgiftskategorier denne måneden
            </p>
          </div>

          {/* Tiles Grid */}
          <div className="flex flex-wrap gap-4">
            {visibleTiles.map((tile) => {
              const progress = tile.budget > 0 ? Math.min((tile.actual / tile.budget) * 100, 100) : 0;
              // Red only when actual >= budget, green otherwise
              const isOverBudget = tile.budget > 0 && tile.actual >= tile.budget;
              const progressColor = isOverBudget ? 'bg-red-500' : 'bg-green-500';
              // Marker color: white if progress has passed today marker, black otherwise
              const markerColor = progress >= todayProgress ? 'bg-white' : 'bg-black';
              const isActive = activeTile?.categoryId === tile.categoryId;

              return (
                <div
                  key={tile.categoryId}
                  onClick={() => handleTileClick(tile)}
                  className={`
                    w-[220px] bg-white rounded-lg shadow-sm border cursor-pointer
                    transition-all hover:shadow-md hover:border-blue-300
                    ${isActive ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
                  `}
                >
                  <div className="p-4">
                    {/* Icon and Name */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{tile.icon}</span>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {tile.categoryName}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="text-2xl font-bold text-gray-900 mb-3">
                      {formatCurrency(tile.actual)}
                    </div>

                    {/* Progress bar */}
                    {tile.budget > 0 && (
                      <div className="relative h-[4px] bg-gray-200 rounded-full overflow-hidden">
                        {/* Progress fill */}
                        <div
                          className={`absolute left-0 top-0 h-full ${progressColor} rounded-full`}
                          style={{ width: `${progress}%` }}
                        />
                        {/* Today marker */}
                        <div
                          className={`absolute top-0 w-[2px] h-full ${markerColor}`}
                          style={{
                            left: `${todayProgress}%`,
                            transform: 'translateX(-1px)',
                          }}
                        />
                      </div>
                    )}

                    {/* Budget info */}
                    {tile.budget > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        av {formatCurrency(tile.budget)} budsjettert
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more/less link */}
          {hasMoreTiles && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                {showAll ? '▲ Vis færre' : `▼ Vis alle ${tiles.length} kategorier`}
              </button>
            </div>
          )}

          {/* Transaction list for active tile */}
          {activeTile && activeTileTransactions.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-blue-200">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-900">
                  {activeTile.categoryName}
                  <span className="ml-2 text-sm font-normal text-blue-700">
                    ({activeTileTransactions.length} transaksjon{activeTileTransactions.length !== 1 ? 'er' : ''})
                  </span>
                </h3>
                <button
                  onClick={() => setActiveTile(null)}
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
                    </tr>
                  </thead>
                  <tbody>
                    {activeTileTransactions.map((tx) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                <span className="font-semibold">Total: </span>
                <span className={`font-bold ${
                  activeTileTransactions.reduce((sum, tx) => sum + tx.beløp, 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {Math.round(activeTileTransactions.reduce((sum, tx) => sum + tx.beløp, 0)).toLocaleString('no')} kr
                </span>
              </div>
            </div>
          )}

          {/* Empty state for active tile */}
          {activeTile && activeTileTransactions.length === 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-gray-500">
                Ingen transaksjoner funnet for <span className="font-semibold">{activeTile.categoryName}</span>
              </p>
              <button
                onClick={() => setActiveTile(null)}
                className="mt-3 text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Lukk
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;

