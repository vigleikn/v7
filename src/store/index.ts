/**
 * Zustand Store Index
 * Creates and exports the transaction store
 */

import { create } from 'zustand';
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
// Create Store
// ============================================================================

export const useTransactionStore = create<TransactionStore>()(
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
    filters: initialFilters,
    selection: initialSelection,
    isLoading: false,
    error: null,
    stats: initialStats,
    
    // Actions
    ...createActions(set, get),
  }))
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

