/**
 * Zustand Store State Definitions
 * All types, interfaces, and initial state for the transaction store
 */

import {
  Category,
  CategoryRule,
  TransactionLock,
  CategorizedTransaction,
} from '../../categoryEngine';

// Re-export for convenience
export type { CategorizedTransaction };

// ============================================================================
// Types
// ============================================================================

export interface Hovedkategori extends Category {
  type: 'hovedkategori';
  underkategorier: string[]; // IDs of subcategories
  color?: string; // UI color
  icon?: string; // UI icon
  sortOrder: number;
  hideFromCategoryPage?: boolean; // Hide from category management UI
  allowSubcategories?: boolean; // Allow adding subcategories
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

export interface TransactionStoreState {
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

export interface TransactionStoreActions {
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
  addSubcategoriesBulk: (hovedkategoriId: string, names: string[]) => void;
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

export type TransactionStore = TransactionStoreState & TransactionStoreActions;

// ============================================================================
// Initial State
// ============================================================================

export const initialFilters: TransactionFilters = {
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

export const initialSelection: TransactionSelectionState = {
  selectedIds: new Set(),
  isAllSelected: false,
  selectionMode: 'none',
};

export const initialStats = {
  total: 0,
  categorized: 0,
  uncategorized: 0,
  locked: 0,
  uniqueTekstPatterns: 0,
  patternsWithRules: 0,
};

