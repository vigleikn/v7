/**
 * Zustand Store Actions
 * All state mutation functions for the transaction store
 */

import {
  RuleEngineState,
  Category,
  CategoryRule,
  TransactionLock,
  CategorizedTransaction,
  createCategory as engineCreateCategory,
  setRule,
  deleteRule,
  lockTransaction,
  unlockTransaction,
  applyRules,
  categorizeTransaction,
  getCategorizationStats,
} from '../../categoryEngine';

import {
  Hovedkategori,
  Underkategori,
  AppCategory,
  TransactionFilters,
  BulkUpdatePayload,
  TransactionStoreState,
  TransactionStoreActions,
  StartBalanceState,
  initialFilters,
  initialSelection,
  initialStats,
} from './state';

// ============================================================================
// Helper Functions
// ============================================================================

export function applyFiltersToTransactions(
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

export function createDefaultInntekterCategory(): Hovedkategori {
  return {
    id: 'cat_inntekter_default',
    name: 'Inntekter',
    type: 'hovedkategori',
    isIncome: true,
    underkategorier: [],
    color: '#10b981',
    icon: '💰',
    sortOrder: 0,
    allowSubcategories: true,
  };
}

export function createDefaultSparingCategory(): Hovedkategori {
  return {
    id: 'sparing',
    name: 'Sparing',
    type: 'hovedkategori',
    isIncome: true,
    underkategorier: [],
    color: '#3b82f6',
    icon: '💎',
    sortOrder: 1,
    allowSubcategories: true,
  };
}

export function createDefaultOverfortCategory(): Hovedkategori {
  return {
    id: 'overfort',
    name: 'Overført',
    type: 'hovedkategori',
    isIncome: true,
    underkategorier: [],
    color: '#8b5cf6',
    icon: '↔️',
    sortOrder: 2,
    hideFromCategoryPage: true,
    allowSubcategories: false,
  };
}

// ============================================================================
// Actions Creator Function
// ============================================================================

export function createActions(
  set: any,
  get: any
): TransactionStoreActions {
  return {
    // ====================================================================
    // Hovedkategori Actions
    // ====================================================================
    
    createHovedkategori: (name, options = {}) => {
      set((state: TransactionStoreState) => {
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
      set((state: TransactionStoreState) => {
        const kategori = state.hovedkategorier.get(id);
        if (!kategori || kategori.isIncome) return; // Cannot update income categories
        
        state.hovedkategorier.set(id, { ...kategori, ...updates });
      });
    },
    
    deleteHovedkategori: (id) => {
      set((state: TransactionStoreState) => {
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
      set((state: TransactionStoreState) => {
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
      set((state: TransactionStoreState) => {
        const hovedkategori = state.hovedkategorier.get(hovedkategoriId);
        if (!hovedkategori) return;
        if (hovedkategori.allowSubcategories === false) return;
        
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
    
    addSubcategoriesBulk: (hovedkategoriId, names) => {
      set((state: TransactionStoreState) => {
        const hovedkategori = state.hovedkategorier.get(hovedkategoriId);
        if (!hovedkategori) return;
        if (hovedkategori.allowSubcategories === false) return;
        
        // Get existing subcategory names (case-insensitive)
        const existingNames = new Set(
          Array.from(state.underkategorier.values())
            .filter(sub => sub.hovedkategoriId === hovedkategoriId)
            .map(sub => sub.name.toLowerCase())
        );
        
        // Filter and deduplicate names
        const validNames: string[] = [];
        const seen = new Set<string>();
        
        names.forEach(name => {
          const trimmed = name.trim();
          
          // Skip empty or whitespace-only
          if (!trimmed) return;
          
          const lowerName = trimmed.toLowerCase();
          
          // Skip if already exists or is duplicate in input
          if (existingNames.has(lowerName) || seen.has(lowerName)) return;
          
          seen.add(lowerName);
          validNames.push(trimmed);
        });
        
        // Create all valid subcategories
        validNames.forEach((name, index) => {
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
            sortOrder: hovedkategori.underkategorier.length + index,
          };
          
          state.underkategorier.set(underkategori.id, underkategori);
          state.hovedkategorier.get(hovedkategoriId)!.underkategorier.push(
            underkategori.id
          );
        });
      });
    },
    
    updateUnderkategori: (id, updates) => {
      set((state: TransactionStoreState) => {
        const kategori = state.underkategorier.get(id);
        if (!kategori) return;
        
        state.underkategorier.set(id, { ...kategori, ...updates });
      });
    },
    
    deleteUnderkategori: (id) => {
      set((state: TransactionStoreState) => {
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
      set((state: TransactionStoreState) => {
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
      set((state: TransactionStoreState) => {
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
      set((state: TransactionStoreState) => {
        state.transactions = transactions;
        state.filteredTransactions = applyFiltersToTransactions(
          transactions,
          state.filters
        );
        state.stats = getCategorizationStats(transactions);
      });
    },
    
    categorizeTransactionAction: (transactionId, categoryId, createRule = false) => {
      set((state: TransactionStoreState) => {
        // Validation: Check if categoryId is a hovedkategori with subcategories
        const hovedkategori = state.hovedkategorier.get(categoryId);
        if (hovedkategori && hovedkategori.underkategorier.length > 0) {
          state.error = 'Kan ikke tilordne hovedkategori med underkategorier. Velg en underkategori.';
          console.error('❌ Validation failed: Cannot assign hovedkategori with subcategories');
          return;
        }
        
        const allCategories = new Map<string, Category>();
        state.hovedkategorier.forEach((cat, id) => allCategories.set(id, cat));
        state.underkategorier.forEach((cat, id) => allCategories.set(id, cat));
        
        const engineState: RuleEngineState = {
          rules: state.rules,
          locks: state.locks,
          categories: allCategories,
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
          
          // Preserve id field when merging results
          state.transactions = state.transactions.map((original, index) => ({
            ...applyResult.categorized[index],
            id: original.id, // Preserve UUID
          }));
          state.filteredTransactions = applyFiltersToTransactions(
            state.transactions,
            state.filters
          );
          state.stats = getCategorizationStats(state.transactions);
        } catch (error) {
          state.error = error instanceof Error ? error.message : 'Categorization failed';
        }
      });
    },
    
    bulkCategorize: (payload) => {
      set((state: TransactionStoreState) => {
        const { transactionIds, categoryId, createRule, lockTransactions, lockReason } = payload;
        
        // Validation: Check if categoryId is a hovedkategori with subcategories
        if (categoryId !== '__uncategorized') {
          const hovedkategori = state.hovedkategorier.get(categoryId);
          if (hovedkategori && hovedkategori.underkategorier.length > 0) {
            state.error = 'Kan ikke tilordne hovedkategori med underkategorier. Velg en underkategori.';
            console.error('❌ Bulk validation failed: Cannot assign hovedkategori with subcategories');
            return;
          }
        }
        
        // transactionIds now contains UUIDs (id field), find transactions by id
        transactionIds.forEach(id => {
          const tx = state.transactions.find(t => t.id === id);
          if (!tx) return;
          
          // Handle uncategorize
          if (categoryId === '__uncategorized') {
            state.locks = unlockTransaction(state.locks, tx.transactionId);
            return;
          }
          
          if (lockTransactions) {
            state.locks = lockTransaction(state.locks, tx.transactionId, categoryId, lockReason);
          } else if (createRule) {
            state.rules = setRule(state.rules, tx.tekst, categoryId);
          }
        });
        
        // Re-apply rules
        const allCategories = new Map<string, Category>();
        state.hovedkategorier.forEach((cat, id) => allCategories.set(id, cat));
        state.underkategorier.forEach((cat, id) => allCategories.set(id, cat));
        
        const engineState: RuleEngineState = {
          rules: state.rules,
          locks: state.locks,
          categories: allCategories,
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
        
        // Preserve id field when merging results
        state.transactions = state.transactions.map((original, index) => ({
          ...applyResult.categorized[index],
          id: original.id, // Preserve UUID
        }));
        state.filteredTransactions = applyFiltersToTransactions(
          state.transactions,
          state.filters
        );
        state.stats = getCategorizationStats(state.transactions);
        
        // Clear selection after bulk update
        state.selection = initialSelection;
      });
    },
    
    // ====================================================================
    // Rule Actions
    // ====================================================================
    
    createRule: (tekst, categoryId) => {
      set((state: TransactionStoreState) => {
        state.rules = setRule(state.rules, tekst, categoryId);
        
        // Re-apply rules to transactions
        get().applyRulesToAll();
      });
    },
    
    deleteRuleAction: (tekst) => {
      set((state: TransactionStoreState) => {
        state.rules = deleteRule(state.rules, tekst);
        
        // Re-apply rules to transactions
        get().applyRulesToAll();
      });
    },
    
    // ====================================================================
    // Lock Actions
    // ====================================================================
    
    lockTransactionAction: (transactionId, categoryId, reason) => {
      set((state: TransactionStoreState) => {
        state.locks = lockTransaction(state.locks, transactionId, categoryId, reason);
        
        // Re-apply rules to transactions
        get().applyRulesToAll();
      });
    },
    
    unlockTransactionAction: (transactionId) => {
      set((state: TransactionStoreState) => {
        state.locks = unlockTransaction(state.locks, transactionId);
        
        // Re-apply rules to transactions
        get().applyRulesToAll();
      });
    },
    
    // ====================================================================
    // Filter Actions
    // ====================================================================
    
    setFilters: (filters) => {
      set((state: TransactionStoreState) => {
        state.filters = { ...state.filters, ...filters };
        state.filteredTransactions = applyFiltersToTransactions(
          state.transactions,
          state.filters
        );
      });
    },
    
    clearFilters: () => {
      set((state: TransactionStoreState) => {
        state.filters = initialFilters;
        state.filteredTransactions = state.transactions;
      });
    },
    
    // ====================================================================
    // Selection Actions
    // ====================================================================
    
    selectTransaction: (id) => {
      set((state: TransactionStoreState) => {
        state.selection.selectedIds.add(id);
        state.selection.selectionMode =
          state.selection.selectedIds.size === state.filteredTransactions.length
            ? 'all'
            : 'partial';
      });
    },
    
    deselectTransaction: (id) => {
      set((state: TransactionStoreState) => {
        state.selection.selectedIds.delete(id);
        state.selection.selectionMode =
          state.selection.selectedIds.size === 0 ? 'none' : 'partial';
      });
    },
    
    selectAll: () => {
      set((state: TransactionStoreState) => {
        state.selection.selectedIds = new Set(
          state.filteredTransactions.map(t => t.id)
        );
        state.selection.isAllSelected = true;
        state.selection.selectionMode = 'all';
      });
    },
    
    deselectAll: () => {
      set((state: TransactionStoreState) => {
        state.selection = initialSelection;
      });
    },
    
    toggleSelection: (id) => {
      set((state: TransactionStoreState) => {
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
      set((state: TransactionStoreState) => {
        const allCategories = new Map<string, Category>();
        state.hovedkategorier.forEach((cat, id) => allCategories.set(id, cat));
        state.underkategorier.forEach((cat, id) => allCategories.set(id, cat));
        
        const engineState: RuleEngineState = {
          rules: state.rules,
          locks: state.locks,
          categories: allCategories,
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
        
        // Preserve id field when merging results
        state.transactions = state.transactions.map((original, index) => ({
          ...applyResult.categorized[index],
          id: original.id, // Preserve UUID
        }));
        state.filteredTransactions = applyFiltersToTransactions(
          state.transactions,
          state.filters
        );
        state.stats = getCategorizationStats(state.transactions);
      });
    },
    
    refreshStats: () => {
      set((state: TransactionStoreState) => {
        state.stats = getCategorizationStats(state.transactions);
      });
    },
    
    fixInvalidCategorizations: () => {
      set((state: TransactionStoreState) => {
        let fixedCount = 0;
        
        state.transactions.forEach(tx => {
          if (!tx.categoryId) return; // Skip uncategorized
          
          const hovedkategori = state.hovedkategorier.get(tx.categoryId);
          
          // Check if transaction is assigned to a hovedkategori with subcategories
          if (hovedkategori && hovedkategori.underkategorier.length > 0) {
            // Invalid! Set to uncategorized and unlock
            tx.categoryId = undefined;
            tx.isLocked = false;
            state.locks = unlockTransaction(state.locks, tx.transactionId);
            fixedCount++;
            
            console.log(`🔧 Fixed invalid categorization: ${tx.transactionId} was assigned to "${hovedkategori.name}" (has subcategories)`);
          }
        });
        
        if (fixedCount > 0) {
          console.log(`✅ Fixed ${fixedCount} invalid categorizations`);
          
          // Refresh filtered transactions and stats
          state.filteredTransactions = applyFiltersToTransactions(
            state.transactions,
            state.filters
          );
          state.stats = getCategorizationStats(state.transactions);
        } else {
          console.log('✅ No invalid categorizations found');
        }
      });
    },
    
    setLoading: (loading) => {
      set((state: TransactionStoreState) => {
        state.isLoading = loading;
      });
    },
    
    setError: (error) => {
      set((state: TransactionStoreState) => {
        state.error = error;
      });
    },
    
    reset: () => {
      set({
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
      });
    },

    // ====================================================================
    // Budget Actions
    // ====================================================================

    setBudget: (categoryId, month, amount) => {
      if (!categoryId || !month) return;

      const normalizedMonth = month.slice(0, 7);
      const key = `${categoryId}|${normalizedMonth}`;

      set((state: TransactionStoreState) => {
        if (!state.budgets) {
          state.budgets = new Map();
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          state.budgets.delete(key);
        } else {
          state.budgets.set(key, Math.round(amount));
        }
      });
    },

    getBudget: (categoryId, month) => {
      const state = get();
      if (!state.budgets) return 0;

      const normalizedMonth = month.slice(0, 7);
      const key = `${categoryId}|${normalizedMonth}`;
      const value = state.budgets.get(key);

      return value ?? 0;
    },

    clearBudget: (categoryId) => {
      set((state: TransactionStoreState) => {
        if (!state.budgets) {
          state.budgets = new Map();
          return;
        }

        if (!categoryId) {
          state.budgets.clear();
          return;
        }

        const prefix = `${categoryId}|`;
        Array.from(state.budgets.keys()).forEach((key) => {
          if (key.startsWith(prefix)) {
            state.budgets.delete(key);
          }
        });
      });
    },

    setStartBalance: (payload) => {
      set((state: TransactionStoreState) => {
        state.startBalance = payload
          ? {
              amount: Math.round(payload.amount),
              date: payload.date.slice(0, 10),
            }
          : null;
      });
    },

    getStartBalance: () => {
      const state = get();
      return state.startBalance ? { ...state.startBalance } : null;
    },
    
    // ====================================================================
    // Selectors
    // ====================================================================
    
    getHovedkategoriWithUnderkategorier: (id) => {
      const state = get();
      const hovedkategori = state.hovedkategorier.get(id);
      if (!hovedkategori) return null;
      
      const underkategorier = hovedkategori.underkategorier
        .map((underId: string) => state.underkategorier.get(underId))
        .filter(Boolean) as Underkategori[];
      
      return { hovedkategori, underkategorier };
    },
    
    getAllCategoriesFlat: (): AppCategory[] => {
      const state = get();
      const hovedkat: Hovedkategori[] = Array.from(state.hovedkategorier.values());
      const underkat: Underkategori[] = Array.from(state.underkategorier.values());
      const categories: AppCategory[] = [...hovedkat, ...underkat];
      return categories.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    
    getSelectedTransactions: () => {
      const state = get();
      return state.filteredTransactions.filter((t: CategorizedTransaction) =>
        state.selection.selectedIds.has(t.id)
      );
    },
    
    getUncategorizedCount: () => {
      const state = get();
      return state.transactions.filter((t: CategorizedTransaction) => !t.categoryId).length;
    },
  };
}

