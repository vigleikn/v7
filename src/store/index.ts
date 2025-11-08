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
  createDefaultInntekterCategory,
  createDefaultSparingCategory,
  createDefaultOverfortCategory,
} from './actions';

// Export types for consumers
export * from './state';

// ============================================================================
// Storage Helper (Node.js fallback)
// ============================================================================

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
        stats: initialStats,
        
        // Actions
        ...createActions(set, get),
      })),
      {
        name: 'transaction-store',
        storage: {
          getItem: (name) => {
            const str = createStorage().getItem(name);
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
                parsed.state.rules = new Map(parsed.state.rules);
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
                parsed.state.startBalance = {
                  amount: typeof amount === 'number' ? amount : 0,
                  date: typeof date === 'string' ? date.slice(0, 10) : '',
                };
                if (!parsed.state.startBalance.date) {
                  parsed.state.startBalance = null;
                }
              } else {
                parsed.state.startBalance = null;
              }
            }
            
            return parsed;
          },
          setItem: (name, value) => {
            createStorage().setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            createStorage().removeItem(name);
          },
        },
        partialize: (state) => ({
          hovedkategorier: Array.from(state.hovedkategorier.entries()),
          underkategorier: Array.from(state.underkategorier.entries()),
          rules: Array.from(state.rules.entries()),
          locks: Array.from(state.locks.entries()),
          budgets: Array.from(state.budgets.entries()),
          startBalance: state.startBalance,
        }),
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

