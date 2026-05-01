/**
 * Zustand Store Index
 * Creates and exports the transaction store with full middleware support
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Immer MapSet support for Map and Set
enableMapSet();

import {
  TransactionStore,
  initialFilters,
  initialSelection,
  initialStats,
} from './state';

import {
  createActions,
  applyFiltersToTransactions,
  createDefaultInntekterCategory,
  createDefaultSparingCategory,
  createDefaultOverfortCategory,
} from './actions';
import { getCategorizationStats, migrateRulesMapFromPersist } from '../../categoryEngine';

// Export types for consumers
export * from './state';

// ============================================================================
// Storage Helper (Node.js fallback)
// ============================================================================

const normalizePersistedDateToIso = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  // YYYY-MM-DD or YYYY-MM
  if (trimmed.includes('-')) {
    const [year, month, day] = trimmed.split('-');
    if (!year || !month) return '';
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${(day || '01').padStart(2, '0')}`;
  }

  // DD.MM.YYYY / DD.MM.YY
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length === 3) {
      const [day, month, yearRaw] = parts;
      if (!day || !month || !yearRaw) return '';
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw.padStart(4, '0');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return '';
};

// Custom storage for Node.js environment (fallback to in-memory)
const createStorage = () => {
  if (typeof globalThis !== 'undefined' && (globalThis as any).window?.localStorage) {
    return (globalThis as any).window.localStorage;
  }
  // In-memory storage for Node.js
  const storage = new Map<string, string>();
  return {
    getItem: (name: string) => storage.get(name) ?? null,
    setItem: (name: string, value: string) => storage.set(name, value),
    removeItem: (name: string) => storage.delete(name),
  };
};

// ============================================================================
// Create Store
// ============================================================================

export const useTransactionStore = create<TransactionStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        hovedkategorier: new Map([
          ['cat_inntekter_default', createDefaultInntekterCategory()],
          ['sparing', createDefaultSparingCategory()],
          ['overfort', createDefaultOverfortCategory()],
        ]),
        underkategorier: new Map(),
        transactions: [],
        filteredTransactions: [],
        rules: new Map(),
        locks: new Map(),
        budgets: new Map(),
        startBalance: null,
        filters: initialFilters,
        selection: initialSelection,
        isLoading: false,
        error: null,
        redactSensitive: false,
        stats: initialStats,
        
        // Actions
        ...createActions(set, get),
        setRedactSensitive: (value: boolean) => set({ redactSensitive: value }),
      })),
      {
        name: 'transaction-store',
        storage: {
          getItem: (name) => {
            const storage = createStorage();
            try {
              const str = storage.getItem(name);
              if (!str) return null;

              const parsed = JSON.parse(str);

              // Reconstruct Maps from arrays
              if (parsed.state) {
                if (parsed.state.hovedkategorier && Array.isArray(parsed.state.hovedkategorier)) {
                  parsed.state.hovedkategorier = new Map(parsed.state.hovedkategorier);
                }
                if (parsed.state.underkategorier && Array.isArray(parsed.state.underkategorier)) {
                  parsed.state.underkategorier = new Map(parsed.state.underkategorier);
                }
                if (parsed.state.rules && Array.isArray(parsed.state.rules)) {
                  parsed.state.rules = migrateRulesMapFromPersist(
                    new Map(parsed.state.rules)
                  );
                }
                if (parsed.state.locks && Array.isArray(parsed.state.locks)) {
                  parsed.state.locks = new Map(parsed.state.locks);
                }
                if (parsed.state.budgets && Array.isArray(parsed.state.budgets)) {
                  parsed.state.budgets = new Map(parsed.state.budgets);
                } else if (!parsed.state.budgets) {
                  parsed.state.budgets = new Map();
                }
                if (parsed.state.startBalance) {
                  const { amount, date } = parsed.state.startBalance;
                  const normalizedDate = normalizePersistedDateToIso(date);
                  parsed.state.startBalance = {
                    amount: typeof amount === 'number' ? amount : 0,
                    date: normalizedDate,
                  };
                  if (!parsed.state.startBalance.date) {
                    parsed.state.startBalance = null;
                  }
                } else {
                  parsed.state.startBalance = null;
                }
              }

              return parsed;
            } catch (err) {
              console.warn(
                `[TransactionStore] Ignoring corrupt persisted state for "${name}":`,
                err instanceof Error ? err.message : err
              );
              try {
                storage.removeItem(name);
              } catch {
                // ignore secondary failures (e.g. quota / private mode)
              }
              return null;
            }
          },
          setItem: (name, value) => {
            createStorage().setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            createStorage().removeItem(name);
          },
        },
        partialize: (state): any => ({
          hovedkategorier: Array.from(state.hovedkategorier.entries()),
          underkategorier: Array.from(state.underkategorier.entries()),
          transactions: state.transactions,
          rules: Array.from(state.rules.entries()),
          locks: Array.from(state.locks.entries()),
          budgets: Array.from(state.budgets.entries()),
          startBalance: state.startBalance,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error || !state) return;
          state.filteredTransactions = applyFiltersToTransactions(
            state.transactions,
            state.filters
          );
          state.stats = getCategorizationStats(state.transactions);
        },
      }
    ),
    { name: 'TransactionStore' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectHovedkategorier = (state: TransactionStore) =>
  Array.from(state.hovedkategorier.values()).sort((a, b) => a.sortOrder - b.sortOrder);

export const selectUnderkategorier = (state: TransactionStore) =>
  Array.from(state.underkategorier.values());

export const selectFilteredTransactions = (state: TransactionStore) =>
  state.filteredTransactions;

export const selectStats = (state: TransactionStore) => state.stats;

export const selectRules = (state: TransactionStore) =>
  Array.from(state.rules.values());

export const selectLocks = (state: TransactionStore) =>
  Array.from(state.locks.values());

export const selectSelectedTransactions = (state: TransactionStore) =>
  state.getSelectedTransactions();

export const selectFilters = (state: TransactionStore) => state.filters;

export const selectSelectionMode = (state: TransactionStore) =>
  state.selection.selectionMode;

export const selectIsLoading = (state: TransactionStore) => state.isLoading;

export const selectError = (state: TransactionStore) => state.error;

