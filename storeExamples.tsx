/**
 * Example React components using the Zustand store
 */

import React from 'react';
import {
  useTransactionStore,
  selectHovedkategorier,
  selectFilteredTransactions,
  selectStats,
  selectSelectedTransactions,
} from './store';

// ============================================================================
// Example 1: Hovedkategori List with Drag & Drop
// ============================================================================

export const HovedkategoriList: React.FC = () => {
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const createHovedkategori = useTransactionStore(state => state.createHovedkategori);
  const deleteHovedkategori = useTransactionStore(state => state.deleteHovedkategori);
  const reorderHovedkategorier = useTransactionStore(state => state.reorderHovedkategorier);

  const handleCreate = () => {
    const name = prompt('Enter category name:');
    if (name) {
      createHovedkategori(name, { color: '#3b82f6', icon: '📁' });
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(hovedkategorier);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderHovedkategorier(items.map(item => item.id));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Kategorier</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          + Ny kategori
        </button>
      </div>

      <div className="space-y-2">
        {hovedkategorier.map(kategori => (
          <HovedkategoriCard
            key={kategori.id}
            kategori={kategori}
            onDelete={() => deleteHovedkategori(kategori.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Example 2: Hovedkategori Card with Underkategorier
// ============================================================================

interface HovedkategoriCardProps {
  kategori: any;
  onDelete: () => void;
}

const HovedkategoriCard: React.FC<HovedkategoriCardProps> = ({ kategori, onDelete }) => {
  const getDetails = useTransactionStore(state => state.getHovedkategoriWithUnderkategorier);
  const createUnderkategori = useTransactionStore(state => state.createUnderkategori);
  const deleteUnderkategori = useTransactionStore(state => state.deleteUnderkategori);
  const moveUnderkategori = useTransactionStore(state => state.moveUnderkategori);

  const details = getDetails(kategori.id);

  const handleCreateSubcategory = () => {
    const name = prompt('Enter subcategory name:');
    if (name) {
      createUnderkategori(name, kategori.id);
    }
  };

  return (
    <div
      className="border rounded-lg p-4"
      style={{ borderColor: kategori.color }}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{kategori.icon}</span>
          <h3 className="font-semibold">{kategori.name}</h3>
          {kategori.isIncome && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Låst
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreateSubcategory}
            className="text-blue-500 hover:text-blue-700"
          >
            +
          </button>
          {!kategori.isIncome && (
            <>
              <button className="text-gray-500 hover:text-gray-700">✏️</button>
              <button
                onClick={onDelete}
                className="text-red-500 hover:text-red-700"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      {details && details.underkategorier.length > 0 && (
        <div className="mt-4 ml-6 space-y-2">
          {details.underkategorier.map(under => (
            <div
              key={under.id}
              className="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <span>{under.name}</span>
              <div className="flex gap-2">
                <button className="text-gray-500 hover:text-gray-700 text-sm">
                  ✏️
                </button>
                <button
                  onClick={() => deleteUnderkategori(under.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 3: Transaction Table with Filters and Bulk Actions
// ============================================================================

export const TransactionTable: React.FC = () => {
  const transactions = useTransactionStore(selectFilteredTransactions);
  const stats = useTransactionStore(selectStats);
  const filters = useTransactionStore(state => state.filters);
  const setFilters = useTransactionStore(state => state.setFilters);
  const clearFilters = useTransactionStore(state => state.clearFilters);
  const selectAll = useTransactionStore(state => state.selectAll);
  const deselectAll = useTransactionStore(state => state.deselectAll);
  const toggleSelection = useTransactionStore(state => state.toggleSelection);
  const selection = useTransactionStore(state => state.selection);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  const handleToggleUncategorized = () => {
    setFilters({ showOnlyUncategorized: !filters.showOnlyUncategorized });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Søk..."
          value={filters.search}
          onChange={handleSearchChange}
          className="px-4 py-2 border rounded-lg flex-1"
        />

        <input
          type="date"
          value={filters.dateFrom || ''}
          onChange={e => setFilters({ dateFrom: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        />

        <input
          type="date"
          value={filters.dateTo || ''}
          onChange={e => setFilters({ dateTo: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showOnlyUncategorized}
            onChange={handleToggleUncategorized}
          />
          Kun ukategoriserte
        </label>

        <button
          onClick={clearFilters}
          className="px-4 py-2 border rounded-lg hover:bg-gray-100"
        >
          Nullstill
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <StatCard label="Totalt" value={stats.total} />
        <StatCard label="Kategoriserte" value={stats.categorized} />
        <StatCard label="Ukategoriserte" value={stats.uncategorized} />
        <StatCard label="Låst" value={stats.locked} />
      </div>

      {/* Selection Actions */}
      {selection.selectionMode !== 'none' && (
        <BulkActionsBar selectedCount={selection.selectedIds.size} />
      )}

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">
              <input
                type="checkbox"
                checked={selection.isAllSelected}
                onChange={() =>
                  selection.isAllSelected ? deselectAll() : selectAll()
                }
              />
            </th>
            <th className="p-2 text-left">Dato</th>
            <th className="p-2 text-left">Tekst</th>
            <th className="p-2 text-right">Beløp</th>
            <th className="p-2 text-left">Kategori</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <TransactionRow
              key={tx.transactionId}
              transaction={tx}
              isSelected={selection.selectedIds.has(tx.transactionId)}
              onToggleSelect={() => toggleSelection(tx.transactionId)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// Example 4: Transaction Row with Category Dropdown
// ============================================================================

interface TransactionRowProps {
  transaction: any;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  isSelected,
  onToggleSelect,
}) => {
  const getAllCategories = useTransactionStore(state => state.getAllCategoriesFlat);
  const categorizeTransaction = useTransactionStore(
    state => state.categorizeTransactionAction
  );
  const lockTransaction = useTransactionStore(state => state.lockTransactionAction);
  const unlockTransaction = useTransactionStore(state => state.unlockTransactionAction);

  const categories = getAllCategories();

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    if (categoryId) {
      const createRule = confirm(
        'Vil du lage en regel for alle transaksjoner med samme tekst?'
      );
      categorizeTransaction(transaction.transactionId, categoryId, createRule);
    }
  };

  const handleLockToggle = () => {
    if (transaction.isLocked) {
      unlockTransaction(transaction.transactionId);
    } else if (transaction.categoryId) {
      const reason = prompt('Begrunnelse for låsing (valgfritt):');
      lockTransaction(transaction.transactionId, transaction.categoryId, reason || undefined);
    }
  };

  return (
    <tr className={isSelected ? 'bg-blue-50' : ''}>
      <td className="p-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
        />
      </td>
      <td className="p-2">{transaction.dato}</td>
      <td className="p-2">{transaction.tekst}</td>
      <td className="p-2 text-right">
        {transaction.beløp.toFixed(2)} NOK
      </td>
      <td className="p-2">
        <select
          value={transaction.categoryId || ''}
          onChange={handleCategoryChange}
          disabled={transaction.isLocked}
          className="w-full px-2 py-1 border rounded"
        >
          <option value="">Velg kategori...</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.type === 'underkategori' ? '  └─ ' : ''}
              {cat.name}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        {transaction.isLocked && (
          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            🔒 Låst
            <button
              onClick={handleLockToggle}
              className="text-yellow-600 hover:text-yellow-800"
            >
              ✕
            </button>
          </span>
        )}
        {!transaction.isLocked && transaction.categoryId && (
          <button
            onClick={handleLockToggle}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            🔓 Lås
          </button>
        )}
      </td>
    </tr>
  );
};

// ============================================================================
// Example 5: Bulk Actions Bar
// ============================================================================

interface BulkActionsBarProps {
  selectedCount: number;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ selectedCount }) => {
  const selectedTransactions = useTransactionStore(selectSelectedTransactions);
  const bulkCategorize = useTransactionStore(state => state.bulkCategorize);
  const deselectAll = useTransactionStore(state => state.deselectAll);
  const getAllCategories = useTransactionStore(state => state.getAllCategoriesFlat);

  const categories = getAllCategories();

  const handleBulkCategorize = () => {
    const categoryId = prompt('Velg kategori ID:');
    if (!categoryId) return;

    const createRule = confirm('Lag regel for alle med samme tekst?');
    const lockTransactions = confirm('Lås disse transaksjonene?');

    bulkCategorize({
      transactionIds: selectedTransactions.map(t => t.transactionId),
      categoryId,
      createRule,
      lockTransactions,
      lockReason: lockTransactions ? 'Bulk update' : undefined,
    });
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-blue-100 rounded-lg">
      <span className="font-semibold">{selectedCount} valgt</span>

      <select className="px-4 py-2 border rounded-lg bg-white">
        <option value="">Velg bulk-handling...</option>
        <option value="categorize">Kategoriser</option>
        <option value="lock">Lås</option>
        <option value="unlock">Lås opp</option>
      </select>

      <button
        onClick={handleBulkCategorize}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Kategoriser valgte
      </button>

      <button
        onClick={deselectAll}
        className="px-4 py-2 border rounded-lg hover:bg-gray-100"
      >
        Avbryt
      </button>
    </div>
  );
};

// ============================================================================
// Example 6: Stats Card
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value }) => (
  <div className="flex-1 p-4 border rounded-lg">
    <div className="text-sm text-gray-600">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

// ============================================================================
// Example 7: CSV Import Component
// ============================================================================

export const CSVImport: React.FC = () => {
  const importTransactions = useTransactionStore(state => state.importTransactions);
  const applyRulesToAll = useTransactionStore(state => state.applyRulesToAll);
  const setLoading = useTransactionStore(state => state.setLoading);
  const setError = useTransactionStore(state => state.setError);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const { parseCSV } = await import('./csvParser');
      const result = parseCSV(text);

      // Import with initial categorization
      importTransactions(result.transactions.map(t => ({
        ...t,
        transactionId: '', // Will be generated
        categoryId: undefined,
        isLocked: false,
      })));

      // Apply existing rules
      applyRulesToAll();

      alert(`Importert ${result.uniqueCount} transaksjoner (${result.duplicates.length} duplikater fjernet)`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed rounded-lg">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
        id="csv-upload"
      />
      <label
        htmlFor="csv-upload"
        className="block text-center cursor-pointer py-8"
      >
        <div className="text-4xl mb-2">📄</div>
        <div className="text-lg font-semibold">Importer CSV</div>
        <div className="text-sm text-gray-500">Klikk for å velge fil</div>
      </label>
    </div>
  );
};

// ============================================================================
// Example 8: Using Store with Custom Hooks
// ============================================================================

// Custom hook for category operations
export function useCategories() {
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const createHovedkategori = useTransactionStore(state => state.createHovedkategori);
  const createUnderkategori = useTransactionStore(state => state.createUnderkategori);
  const moveUnderkategori = useTransactionStore(state => state.moveUnderkategori);

  return {
    hovedkategorier,
    createHovedkategori,
    createUnderkategori,
    moveUnderkategori,
  };
}

// Custom hook for transaction filtering
export function useTransactionFilters() {
  const filters = useTransactionStore(state => state.filters);
  const setFilters = useTransactionStore(state => state.setFilters);
  const clearFilters = useTransactionStore(state => state.clearFilters);
  const filteredTransactions = useTransactionStore(selectFilteredTransactions);

  return {
    filters,
    setFilters,
    clearFilters,
    transactions: filteredTransactions,
  };
}

// Custom hook for bulk operations
export function useBulkOperations() {
  const selectedTransactions = useTransactionStore(selectSelectedTransactions);
  const bulkCategorize = useTransactionStore(state => state.bulkCategorize);
  const selectAll = useTransactionStore(state => state.selectAll);
  const deselectAll = useTransactionStore(state => state.deselectAll);

  return {
    selectedTransactions,
    bulkCategorize,
    selectAll,
    deselectAll,
    selectedCount: selectedTransactions.length,
  };
}

