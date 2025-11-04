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

export const OversiktPage: React.FC<OversiktPageProps> = ({ onNavigate }) => {
  const [activePage] = useState('oversikt');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

    return (
      <React.Fragment key={row.categoryId}>
        <tr className={`border-b border-gray-200 ${bgColor} hover:bg-gray-50 transition-colors`}>
          {/* Category Name */}
          <td 
            className={`px-4 py-3 ${textColor} ${fontWeight}`}
            style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
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
            
            return (
              <td 
                key={idx} 
                className={`px-3 py-3 text-right tabular-nums ${cellColor || textColor}`}
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

          {/* Variance */}
          <td className={`px-3 py-3 text-right tabular-nums text-gray-600 text-sm`}>
            {formatAmount(Math.sqrt(row.variance))}
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
                    Stdavvik
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => renderRow(row))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">Balanse:</span> Inntekter - Utgifter (ekskludert Sparing og Overført)
            </p>
            <p>
              <span className="font-semibold">Stdavvik:</span> Standardavvik viser variasjon i utgifter per måned
            </p>
            <p className="text-xs text-gray-500 mt-2">
              💡 Klikk på ►/▼ for å utvide/kollapse kategorier under Utgifter
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OversiktPage;

