/**
 * Oversikt 12 mnd Page
 * Overview and statistics for the last 12 months
 */

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useTransactionStore } from '../src/store';
import {
  getLast12Months,
  calculateMonthlyData,
  buildCategoryRows,
  CategoryRowData,
} from '../services/monthlyCalculations';

interface OversiktPageProps {
  onNavigate?: (page: string) => void;
}

interface ActiveCell {
  categoryId: string;
  monthIndex: number;
  categoryName: string;
  monthLabel: string;
}

export const OversiktPage: React.FC<OversiktPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('oversikt');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);

  const transactions = useTransactionStore((state) => state.transactions);
  const hovedkategorier = useTransactionStore((state) => 
    Array.from(state.hovedkategorier.values())
  );
  const underkategorier = useTransactionStore((state) => 
    Array.from(state.underkategorier.values())
  );

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Calculate monthly data
  const { months, monthlyData, categoryRows } = useMemo(() => {
    const months = getLast12Months();
    const monthlyData = calculateMonthlyData(transactions, months, hovedkategorier, underkategorier);
    const categoryRows = buildCategoryRows(monthlyData, hovedkategorier, underkategorier);
    
    return { months, monthlyData, categoryRows };
  }, [transactions, hovedkategorier, underkategorier]);

  // Toggle category expansion
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

  // Handle cell click for drill-down
  const handleCellClick = (
    categoryId: string,
    monthIndex: number,
    categoryName: string,
    monthLabel: string,
    isClickable: boolean
  ) => {
    if (!isClickable) return;

    // Toggle: if same cell clicked, close it
    if (
      activeCell &&
      activeCell.categoryId === categoryId &&
      activeCell.monthIndex === monthIndex
    ) {
      setActiveCell(null);
    } else {
      setActiveCell({ categoryId, monthIndex, categoryName, monthLabel });
    }
  };

  // Get transactions for active cell
  const activeCellTransactions = useMemo(() => {
    if (!activeCell) return [];

    const targetMonth = months[activeCell.monthIndex];
    const categoryId = activeCell.categoryId;

    return transactions.filter((tx) => {
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
  }, [activeCell, transactions, months]);

  // Format number (round to nearest integer, no decimals)
  const formatAmount = (value: number): string => {
    return Math.round(value).toLocaleString('no');
  };

  // Render a row
  const renderRow = (row: CategoryRowData, level: number = 0) => {
    const isExpanded = expandedCategories.has(row.categoryId);
    const hasChildren = row.children && row.children.length > 0;
    const isBalanceRow = row.categoryId === '__balance';
    const isMainCategory = level === 0 && !isBalanceRow;
    const isExpenseGroup = level === 1; // All level 1 items (under Utgifter)
    
    // Determine if cells in this row are clickable (drill-down)
    // Only subcategories and leaf categories can show transactions
    const isCellClickable = !isBalanceRow && !isMainCategory && !row.isCollapsible;

    // Color scheme
    let bgColor = '';
    let textColor = 'text-gray-900';
    let fontWeight = '';
    
    if (isBalanceRow) {
      bgColor = 'bg-blue-50';
      fontWeight = 'font-bold';
      textColor = 'text-blue-900';
    } else if (isMainCategory) {
      bgColor = 'bg-gray-100';
      fontWeight = 'font-semibold';
    } else if (isExpenseGroup) {
      bgColor = 'bg-gray-50'; // Light gray for all expense categories (collapsible or not)
    }

    // Handle row click for collapsible rows
    const handleRowClick = () => {
      if (row.isCollapsible && hasChildren) {
        toggleCategory(row.categoryId);
      }
    };

    return (
      <React.Fragment key={row.categoryId}>
        <tr 
          className={`border-b border-gray-200 ${bgColor} hover:bg-gray-50 transition-colors ${
            row.isCollapsible ? 'cursor-pointer' : ''
          }`}
          onClick={handleRowClick}
        >
          {/* Category Name */}
          <td 
            className={`px-4 py-3 ${textColor} ${fontWeight}`}
            style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking chevron
          >
            <div className="flex items-center gap-2">
              {row.isCollapsible && hasChildren && (
                <button
                  onClick={() => toggleCategory(row.categoryId)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {!row.isCollapsible && hasChildren && level === 0 && (
                <span className="w-4"></span>
              )}
              <span className={row.categoryId === '__balance' ? 'underline' : ''}>
                {row.categoryName}
              </span>
            </div>
          </td>

          {/* Monthly values */}
          {row.monthlyValues.map((value, idx) => {
            let cellColor = '';
            if (isBalanceRow) {
              cellColor = value >= 0 ? 'text-green-700' : 'text-red-700';
            }
            
            const isActive = 
              activeCell?.categoryId === row.categoryId && 
              activeCell?.monthIndex === idx;
            
            return (
              <td 
                key={idx} 
                className={`px-3 py-3 text-right tabular-nums ${cellColor || textColor} ${
                  isCellClickable 
                    ? 'cursor-pointer hover:bg-blue-50 hover:font-semibold' 
                    : ''
                } ${
                  isActive ? 'bg-blue-100 font-bold ring-2 ring-blue-400 ring-inset' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCellClick(
                    row.categoryId,
                    idx,
                    row.categoryName,
                    monthlyData[idx].monthLabel,
                    isCellClickable
                  );
                }}
              >
                {formatAmount(value)}
              </td>
            );
          })}

          {/* Sum */}
          <td className={`px-3 py-3 text-right tabular-nums ${fontWeight} ${textColor} bg-gray-50`}>
            {formatAmount(row.sum)}
          </td>

          {/* Avg */}
          <td className={`px-3 py-3 text-right tabular-nums ${textColor}`}>
            {formatAmount(row.avg)}
          </td>

          {/* Coefficient of Variation (CV) */}
          <td className={`px-3 py-3 text-right tabular-nums text-gray-600 text-sm`}>
            {row.cv !== null ? `${row.cv.toFixed(1)} %` : '–'}
          </td>
        </tr>

        {/* Render children if expanded or non-collapsible */}
        {hasChildren && (!row.isCollapsible || isExpanded) && row.children!.map((child) => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Oversikt 12 mnd</h1>
            <p className="text-gray-600 mt-2">
              Økonomisk oversikt og statistikk for de siste 12 månedene
            </p>
          </div>

          {/* Overview Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Kategori
                  </th>
                  {monthlyData.map((m) => (
                    <th 
                      key={m.month} 
                      className="px-3 py-3 text-right font-semibold text-gray-700"
                    >
                      {m.monthLabel}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-gray-50">
                    Sum
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">
                    Snitt
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">
                    Variasjon (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => renderRow(row))}
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

          {/* Legend */}
          <div className="mt-6 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">Balanse:</span> Inntekter - Utgifter (ekskludert Sparing og Overført)
            </p>
            <p>
              <span className="font-semibold">Sum/Snitt/Variasjon:</span> Beregnet fra de siste 11 fullførte månedene (ekskluderer inneværende ufullstendige måned)
            </p>
            <p>
              <span className="font-semibold">Variasjon (%):</span> Koeffisient av variasjon (CV) = standardavvik / gjennomsnitt × 100. Viser relativ variasjon uavhengig av beløpsstørrelse.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              💡 Klikk på ►/▼ for å utvide/kollapse kategorier under Utgifter • Klikk på tall i tabellen for å se transaksjoner
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OversiktPage;

