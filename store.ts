/**
 * Zustand Store for Transaction Management
 * Manages categories, transactions, rules, and exceptions
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Immer MapSet support for Map and Set
enableMapSet();

import {
  RuleEngineState,
  Category,
  CategoryRule,
  TransactionLock,
  CategorizedTransaction,
  createCategory as engineCreateCategory,
  updateCategory as engineUpdateCategory,
  deleteCategory as engineDeleteCategory,
  setRule,
  deleteRule,
  lockTransaction,
  unlockTransaction,
  applyRules,
  categorizeTransaction,
  generateTransactionId,
  getCategorizationStats,
} from './categoryEngine';

// ============================================================================
// Types
// ============================================================================

export interface Hovedkategori extends Category {
  type: 'hovedkategori';
  underkategorier: string[]; // IDs of subcategories
  color?: string; // UI color
  icon?: string; // UI icon
  sortOrder: number;
}

export interface Underkategori extends Category {
  type: 'underkategori';
  hovedkategoriId: string; // Parent category ID
  sortOrder: number;
}

export type AppCategory = Hovedkategori | Underkategori;

export interface TransactionFilters {
  search: string;
  dateFrom?: string;
  dateTo?: string;
  categoryIds: string[];
  amountMin?: number;
  amountMax?: number;
  types: string[];
  showOnlyUncategorized: boolean;
  showOnlyLocked: boolean;
}

export interface BulkUpdatePayload {
  transactionIds: string[];
  categoryId: string;
  createRule?: boolean;
  lockTransactions?: boolean;
  lockReason?: string;
}

export interface TransactionSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  selectionMode: 'none' | 'partial' | 'all';
}

// ============================================================================
// Store State Interface
// ============================================================================

interface TransactionStoreState {
  // Categories
  hovedkategorier: Map<string, Hovedkategori>;
  underkategorier: Map<string, Underkategori>;
  
  // Transactions
  transactions: CategorizedTransaction[];
  filteredTransactions: CategorizedTransaction[];
  
  // Rule Engine State
  rules: Map<string, CategoryRule>;
  locks: Map<string, TransactionLock>;
  
  // UI State
  filters: TransactionFilters;
  selection: TransactionSelectionState;
  isLoading: boolean;
  error: string | null;
  
  // Derived state
  stats: {
    total: number;
    categorized: number;
    uncategorized: number;
    locked: number;
    uniqueTekstPatterns: number;
    patternsWithRules: number;
  };
}

// ============================================================================
// Store Actions Interface
// ============================================================================

interface TransactionStoreActions {
  // Category Management - Hovedkategorier
  createHovedkategori: (
    name: string,
    options?: { color?: string; icon?: string; isIncome?: boolean }
  ) => void;
  updateHovedkategori: (id: string, updates: Partial<Hovedkategori>) => void;
  deleteHovedkategori: (id: string) => void;
  reorderHovedkategorier: (ids: string[]) => void;
  
  // Category Management - Underkategorier
  createUnderkategori: (name: string, hovedkategoriId: string) => void;
  updateUnderkategori: (id: string, updates: Partial<Underkategori>) => void;
  deleteUnderkategori: (id: string) => void;
  moveUnderkategori: (underkategoriId: string, newHovedkategoriId: string) => void;
  reorderUnderkategorier: (hovedkategoriId: string, underkategoriIds: string[]) => void;
  
  // Transaction Management
  importTransactions: (transactions: CategorizedTransaction[]) => void;
  categorizeTransactionAction: (
    transactionId: string,
    categoryId: string,
    createRule?: boolean
  ) => void;
  bulkCategorize: (payload: BulkUpdatePayload) => void;
  
  // Rule Management
  createRule: (tekst: string, categoryId: string) => void;
  deleteRuleAction: (tekst: string) => void;
  
  // Lock Management
  lockTransactionAction: (
    transactionId: string,
    categoryId: string,
    reason?: string
  ) => void;
  unlockTransactionAction: (transactionId: string) => void;
  
  // Filter Management
  setFilters: (filters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  
  // Selection Management
  selectTransaction: (id: string) => void;
  deselectTransaction: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;
  
  // Utility Actions
  applyRulesToAll: () => void;
  refreshStats: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Selectors (derived state)
  getHovedkategoriWithUnderkategorier: (id: string) => {
    hovedkategori: Hovedkategori;
    underkategorier: Underkategori[];
  } | null;
  getAllCategoriesFlat: () => AppCategory[];
  getSelectedTransactions: () => CategorizedTransaction[];
  getUncategorizedCount: () => number;
}

type TransactionStore = TransactionStoreState & TransactionStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialFilters: TransactionFilters = {
  search: '',
  dateFrom: undefined,
  dateTo: undefined,
  categoryIds: [],
  amountMin: undefined,
  amountMax: undefined,
  types: [],
  showOnlyUncategorized: false,
  showOnlyLocked: false,
};

const initialSelection: TransactionSelectionState = {
  selectedIds: new Set(),
  isAllSelected: false,
  selectionMode: 'none',
};

const initialStats = {
  total: 0,
  categorized: 0,
  uncategorized: 0,
  locked: 0,
  uniqueTekstPatterns: 0,
  patternsWithRules: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

function applyFiltersToTransactions(
  transactions: CategorizedTransaction[],
  filters: TransactionFilters
): CategorizedTransaction[] {
  return transactions.filter(tx => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matches =
        tx.tekst.toLowerCase().includes(searchLower) ||
        tx.fraKonto.toLowerCase().includes(searchLower) ||
        tx.tilKonto.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    
    // Date filters
    if (filters.dateFrom && tx.dato < filters.dateFrom) return false;
    if (filters.dateTo && tx.dato > filters.dateTo) return false;
    
    // Category filter
    if (filters.categoryIds.length > 0) {
      if (!tx.categoryId || !filters.categoryIds.includes(tx.categoryId)) {
        return false;
      }
    }
    
    // Amount filters
    if (filters.amountMin !== undefined && tx.beløp < filters.amountMin) return false;
    if (filters.amountMax !== undefined && tx.beløp > filters.amountMax) return false;
    
    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(tx.type)) {
      return false;
    }
    
    // Uncategorized filter
    if (filters.showOnlyUncategorized && tx.categoryId) return false;
    
    // Locked filter
    if (filters.showOnlyLocked && !tx.isLocked) return false;
    
    return true;
  });
}

function createDefaultInntekterCategory(): Hovedkategori {
  return {
    id: 'cat_inntekter_default',
    name: 'Inntekter',
    type: 'hovedkategori',
    isIncome: true,
    underkategorier: [],
    color: '#10b981', // Green
    icon: '💰',
    sortOrder: 0,
  };
}

// ============================================================================
// Zustand Store
// ============================================================================

// Custom storage for Node.js environment (fallback to in-memory)
const createStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  // In-memory storage for Node.js
  const storage = new Map<string, string>();
  return {
    getItem: (name: string) => storage.get(name) ?? null,
    setItem: (name: string, value: string) => storage.set(name, value),
    removeItem: (name: string) => storage.delete(name),
  };
};

export const useTransactionStore = create<TransactionStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        hovedkategorier: new Map([
          ['cat_inntekter_default', createDefaultInntekterCategory()],
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
        
        // ====================================================================
        // Hovedkategori Actions
        // ====================================================================
        
        createHovedkategori: (name, options = {}) => {
          set(state => {
            const hovedkategorier = new Map(state.hovedkategorier);
            const engineResult = engineCreateCategory(
              hovedkategorier as any,
              {
                name,
                isIncome: options.isIncome || false,
              }
            );
            
            const hovedkategori: Hovedkategori = {
              ...engineResult.category,
              type: 'hovedkategori',
              underkategorier: [],
              color: options.color,
              icon: options.icon,
              sortOrder: hovedkategorier.size,
            };
            
            state.hovedkategorier.set(hovedkategori.id, hovedkategori);
          });
        },
        
        updateHovedkategori: (id, updates) => {
          set(state => {
            const kategori = state.hovedkategorier.get(id);
            if (!kategori || kategori.isIncome) return; // Cannot update income categories
            
            state.hovedkategorier.set(id, { ...kategori, ...updates });
          });
        },
        
        deleteHovedkategori: (id) => {
          set(state => {
            const kategori = state.hovedkategorier.get(id);
            if (!kategori || kategori.isIncome) return; // Cannot delete income categories
            
            // Delete all underkategorier
            kategori.underkategorier.forEach(underId => {
              state.underkategorier.delete(underId);
            });
            
            state.hovedkategorier.delete(id);
          });
        },
        
        reorderHovedkategorier: (ids) => {
          set(state => {
            ids.forEach((id, index) => {
              const kategori = state.hovedkategorier.get(id);
              if (kategori) {
                state.hovedkategorier.set(id, { ...kategori, sortOrder: index });
              }
            });
          });
        },
        
        // ====================================================================
        // Underkategori Actions
        // ====================================================================
        
        createUnderkategori: (name, hovedkategoriId) => {
          set(state => {
            const hovedkategori = state.hovedkategorier.get(hovedkategoriId);
            if (!hovedkategori) return;
            
            const underkategorier = new Map(state.underkategorier);
            const engineResult = engineCreateCategory(
              underkategorier as any,
              {
                name,
                parentId: hovedkategoriId,
              }
            );
            
            const underkategori: Underkategori = {
              ...engineResult.category,
              type: 'underkategori',
              hovedkategoriId,
              sortOrder: hovedkategori.underkategorier.length,
            };
            
            state.underkategorier.set(underkategori.id, underkategori);
            state.hovedkategorier.get(hovedkategoriId)!.underkategorier.push(
              underkategori.id
            );
          });
        },
        
        updateUnderkategori: (id, updates) => {
          set(state => {
            const kategori = state.underkategorier.get(id);
            if (!kategori) return;
            
            state.underkategorier.set(id, { ...kategori, ...updates });
          });
        },
        
        deleteUnderkategori: (id) => {
          set(state => {
            const underkategori = state.underkategorier.get(id);
            if (!underkategori) return;
            
            // Remove from hovedkategori's list
            const hovedkategori = state.hovedkategorier.get(
              underkategori.hovedkategoriId
            );
            if (hovedkategori) {
              hovedkategori.underkategorier = hovedkategori.underkategorier.filter(
                uid => uid !== id
              );
            }
            
            state.underkategorier.delete(id);
          });
        },
        
        moveUnderkategori: (underkategoriId, newHovedkategoriId) => {
          set(state => {
            const underkategori = state.underkategorier.get(underkategoriId);
            if (!underkategori) return;
            
            const oldHovedkategori = state.hovedkategorier.get(
              underkategori.hovedkategoriId
            );
            const newHovedkategori = state.hovedkategorier.get(newHovedkategoriId);
            
            if (!oldHovedkategori || !newHovedkategori) return;
            
            // Remove from old hovedkategori
            oldHovedkategori.underkategorier = oldHovedkategori.underkategorier.filter(
              id => id !== underkategoriId
            );
            
            // Add to new hovedkategori
            newHovedkategori.underkategorier.push(underkategoriId);
            
            // Update underkategori's parent
            underkategori.hovedkategoriId = newHovedkategoriId;
            underkategori.sortOrder = newHovedkategori.underkategorier.length - 1;
          });
        },
        
        reorderUnderkategorier: (hovedkategoriId, underkategoriIds) => {
          set(state => {
            const hovedkategori = state.hovedkategorier.get(hovedkategoriId);
            if (!hovedkategori) return;
            
            hovedkategori.underkategorier = underkategoriIds;
            underkategoriIds.forEach((id, index) => {
              const underkategori = state.underkategorier.get(id);
              if (underkategori) {
                underkategori.sortOrder = index;
              }
            });
          });
        },
        
        // ====================================================================
        // Transaction Actions
        // ====================================================================
        
        importTransactions: (transactions) => {
          set(state => {
            state.transactions = transactions;
            state.filteredTransactions = applyFiltersToTransactions(
              transactions,
              state.filters
            );
            state.stats = getCategorizationStats(transactions);
          });
        },
        
        categorizeTransactionAction: (transactionId, categoryId, createRule = false) => {
          set(state => {
            const engineState: RuleEngineState = {
              rules: state.rules,
              locks: state.locks,
              categories: new Map([
                ...Array.from(state.hovedkategorier.entries()),
                ...Array.from(state.underkategorier.entries()),
              ]) as any,
            };
            
            try {
              const result = categorizeTransaction(
                state.transactions,
                transactionId,
                categoryId,
                engineState,
                createRule
              );
              
              state.rules = result.state.rules;
              
              // Re-apply rules to get updated transactions
              const applyResult = applyRules(
                state.transactions.map(t => ({
                  dato: t.dato,
                  beløp: t.beløp,
                  tilKonto: t.tilKonto,
                  tilKontonummer: t.tilKontonummer,
                  fraKonto: t.fraKonto,
                  fraKontonummer: t.fraKontonummer,
                  type: t.type,
                  tekst: t.tekst,
                  underkategori: t.underkategori,
                })),
                result.state
              );
              
              state.transactions = applyResult.categorized;
              state.filteredTransactions = applyFiltersToTransactions(
                applyResult.categorized,
                state.filters
              );
              state.stats = getCategorizationStats(applyResult.categorized);
            } catch (error) {
              state.error = error instanceof Error ? error.message : 'Categorization failed';
            }
          });
        },
        
        bulkCategorize: (payload) => {
          set(state => {
            const { transactionIds, categoryId, createRule, lockTransactions, lockReason } = payload;
            
            transactionIds.forEach(txId => {
              const tx = state.transactions.find(t => t.transactionId === txId);
              if (!tx) return;
              
              if (lockTransactions) {
                state.locks = lockTransaction(state.locks, txId, categoryId, lockReason);
              } else if (createRule) {
                state.rules = setRule(state.rules, tx.tekst, categoryId);
              }
            });
            
            // Re-apply rules
            const engineState: RuleEngineState = {
              rules: state.rules,
              locks: state.locks,
              categories: new Map([
                ...Array.from(state.hovedkategorier.entries()),
                ...Array.from(state.underkategorier.entries()),
              ]) as any,
            };
            
            const applyResult = applyRules(
              state.transactions.map(t => ({
                dato: t.dato,
                beløp: t.beløp,
                tilKonto: t.tilKonto,
                tilKontonummer: t.tilKontonummer,
                fraKonto: t.fraKonto,
                fraKontonummer: t.fraKontonummer,
                type: t.type,
                tekst: t.tekst,
                underkategori: t.underkategori,
              })),
              engineState
            );
            
            state.transactions = applyResult.categorized;
            state.filteredTransactions = applyFiltersToTransactions(
              applyResult.categorized,
              state.filters
            );
            state.stats = getCategorizationStats(applyResult.categorized);
            
            // Clear selection after bulk update
            state.selection = initialSelection;
          });
        },
        
        // ====================================================================
        // Rule Actions
        // ====================================================================
        
        createRule: (tekst, categoryId) => {
          set(state => {
            state.rules = setRule(state.rules, tekst, categoryId);
            
            // Re-apply rules to transactions
            get().applyRulesToAll();
          });
        },
        
        deleteRuleAction: (tekst) => {
          set(state => {
            state.rules = deleteRule(state.rules, tekst);
            
            // Re-apply rules to transactions
            get().applyRulesToAll();
          });
        },
        
        // ====================================================================
        // Lock Actions
        // ====================================================================
        
        lockTransactionAction: (transactionId, categoryId, reason) => {
          set(state => {
            state.locks = lockTransaction(state.locks, transactionId, categoryId, reason);
            
            // Re-apply rules to transactions
            get().applyRulesToAll();
          });
        },
        
        unlockTransactionAction: (transactionId) => {
          set(state => {
            state.locks = unlockTransaction(state.locks, transactionId);
            
            // Re-apply rules to transactions
            get().applyRulesToAll();
          });
        },
        
        // ====================================================================
        // Filter Actions
        // ====================================================================
        
        setFilters: (filters) => {
          set(state => {
            state.filters = { ...state.filters, ...filters };
            state.filteredTransactions = applyFiltersToTransactions(
              state.transactions,
              state.filters
            );
          });
        },
        
        clearFilters: () => {
          set(state => {
            state.filters = initialFilters;
            state.filteredTransactions = state.transactions;
          });
        },
        
        // ====================================================================
        // Selection Actions
        // ====================================================================
        
        selectTransaction: (id) => {
          set(state => {
            state.selection.selectedIds.add(id);
            state.selection.selectionMode =
              state.selection.selectedIds.size === state.filteredTransactions.length
                ? 'all'
                : 'partial';
          });
        },
        
        deselectTransaction: (id) => {
          set(state => {
            state.selection.selectedIds.delete(id);
            state.selection.selectionMode =
              state.selection.selectedIds.size === 0 ? 'none' : 'partial';
          });
        },
        
        selectAll: () => {
          set(state => {
            state.selection.selectedIds = new Set(
              state.filteredTransactions.map(t => t.transactionId)
            );
            state.selection.isAllSelected = true;
            state.selection.selectionMode = 'all';
          });
        },
        
        deselectAll: () => {
          set(state => {
            state.selection = initialSelection;
          });
        },
        
        toggleSelection: (id) => {
          set(state => {
            if (state.selection.selectedIds.has(id)) {
              state.selection.selectedIds.delete(id);
            } else {
              state.selection.selectedIds.add(id);
            }
            
            const selectedCount = state.selection.selectedIds.size;
            state.selection.selectionMode =
              selectedCount === 0
                ? 'none'
                : selectedCount === state.filteredTransactions.length
                ? 'all'
                : 'partial';
          });
        },
        
        // ====================================================================
        // Utility Actions
        // ====================================================================
        
        applyRulesToAll: () => {
          set(state => {
            const engineState: RuleEngineState = {
              rules: state.rules,
              locks: state.locks,
              categories: new Map([
                ...Array.from(state.hovedkategorier.entries()),
                ...Array.from(state.underkategorier.entries()),
              ]) as any,
            };
            
            const applyResult = applyRules(
              state.transactions.map(t => ({
                dato: t.dato,
                beløp: t.beløp,
                tilKonto: t.tilKonto,
                tilKontonummer: t.tilKontonummer,
                fraKonto: t.fraKonto,
                fraKontonummer: t.fraKontonummer,
                type: t.type,
                tekst: t.tekst,
                underkategori: t.underkategori,
              })),
              engineState
            );
            
            state.transactions = applyResult.categorized;
            state.filteredTransactions = applyFiltersToTransactions(
              applyResult.categorized,
              state.filters
            );
            state.stats = getCategorizationStats(applyResult.categorized);
          });
        },
        
        refreshStats: () => {
          set(state => {
            state.stats = getCategorizationStats(state.transactions);
          });
        },
        
        setLoading: (loading) => {
          set(state => {
            state.isLoading = loading;
          });
        },
        
        setError: (error) => {
          set(state => {
            state.error = error;
          });
        },
        
        reset: () => {
          set({
            hovedkategorier: new Map([
              ['cat_inntekter_default', createDefaultInntekterCategory()],
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
          });
        },
        
        // ====================================================================
        // Selectors
        // ====================================================================
        
        getHovedkategoriWithUnderkategorier: (id) => {
          const state = get();
          const hovedkategori = state.hovedkategorier.get(id);
          if (!hovedkategori) return null;
          
          const underkategorier = hovedkategori.underkategorier
            .map(underId => state.underkategorier.get(underId))
            .filter(Boolean) as Underkategori[];
          
          return { hovedkategori, underkategorier };
        },
        
        getAllCategoriesFlat: () => {
          const state = get();
          const categories: AppCategory[] = [
            ...Array.from(state.hovedkategorier.values()),
            ...Array.from(state.underkategorier.values()),
          ];
          return categories.sort((a, b) => a.sortOrder - b.sortOrder);
        },
        
        getSelectedTransactions: () => {
          const state = get();
          return state.filteredTransactions.filter(t =>
            state.selection.selectedIds.has(t.transactionId)
          );
        },
        
        getUncategorizedCount: () => {
          const state = get();
          return state.transactions.filter(t => !t.categoryId).length;
        },
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
        }),
      }
    ),
    { name: 'TransactionStore' }
  )
);

// ============================================================================
// Selectors (for use with useTransactionStore)
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

