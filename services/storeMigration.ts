/**
 * Store Migration & Cleanup Service
 * Handles store upgrades and cleanup of deprecated fields
 */

import { useTransactionStore } from '../src/store';
import { generateSoftMatchKey, normalizeDateForComparison } from '../categoryEngine';

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Ensure budget fields exist with correct structure
 */
export function ensureBudgetFields(): void {
  const state = useTransactionStore.getState();
  
  console.log('🔍 Normalizing budget fields...');
  
  // Normalize budgets map
  if (!state.budgets || !(state.budgets instanceof Map)) {
    const rawBudgets: Record<string, number> | Array<[string, number]> | undefined =
      (state as any).budgets;
    
    const normalized = new Map<string, number>();
    
    if (Array.isArray(rawBudgets)) {
      rawBudgets.forEach(([key, value]) => {
        if (typeof key === 'string' && Number.isFinite(value)) {
          normalized.set(key, Math.round(Number(value)));
        }
      });
    } else if (rawBudgets && typeof rawBudgets === 'object') {
      Object.entries(rawBudgets).forEach(([key, value]) => {
        if (Number.isFinite(value)) {
          normalized.set(key, Math.round(Number(value)));
        }
      });
    }
    
    useTransactionStore.setState({ budgets: normalized });
    console.log(`✅ Budgets normalized (${normalized.size} entries)`);
  } else {
    // Ensure numeric values
    const sanitized = new Map<string, number>();
    state.budgets.forEach((value, key) => {
      if (typeof key === 'string' && Number.isFinite(value)) {
        sanitized.set(key, Math.round(Number(value)));
      }
    });
    if (sanitized.size !== state.budgets.size) {
      useTransactionStore.setState({ budgets: sanitized });
      console.log(`✅ Budgets sanitized (${sanitized.size} entries)`);
    }
  }

  // Normalize start balance
  const rawStartBalance = (state as any).startBalance;
  if (!rawStartBalance) {
    useTransactionStore.setState({ startBalance: null });
    console.log('ℹ️  No start balance set');
    return;
  }

  const amount = Number(rawStartBalance.amount);
  const date =
    typeof rawStartBalance.date === 'string'
      ? rawStartBalance.date.slice(0, 10)
      : '';

  if (!Number.isFinite(amount) || !date) {
    useTransactionStore.setState({ startBalance: null });
    console.log('⚠️  Invalid start balance detected - resetting');
    return;
  }

  useTransactionStore.setState({
    startBalance: {
      amount: Math.round(amount),
      date,
    },
  });
  console.log(`✅ Start balance normalized (${amount} kr @ ${date})`);
}

/**
 * Cleanup / normalize localStorage for budget fields
 */
export function cleanupLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  
  console.log('🔍 Checking localStorage for deprecated fields...');
  
  try {
    const stored = localStorage.getItem('transaction-store');
    if (!stored) {
      console.log('ℹ️  No transaction-store in localStorage');
      return;
    }
    
    const parsed = JSON.parse(stored);
    
    if (parsed.state) {
      let needsCleanup = false;
      
      // Normalize budget fields
      if ('budgets' in parsed.state) {
        const rawBudgets = parsed.state.budgets;
        if (Array.isArray(rawBudgets)) {
          // Already ok
        } else if (rawBudgets && typeof rawBudgets === 'object') {
          parsed.state.budgets = Object.entries(rawBudgets);
          needsCleanup = true;
          console.log('ℹ️  Converted budgets object to entries array');
        } else {
          parsed.state.budgets = [];
          needsCleanup = true;
          console.log('ℹ️  Reset invalid budgets structure');
        }
      }

      if ('startBalance' in parsed.state) {
        const rawStartBalance = parsed.state.startBalance;
        if (
          !rawStartBalance ||
          !Number.isFinite(rawStartBalance.amount) ||
          typeof rawStartBalance.date !== 'string'
        ) {
          parsed.state.startBalance = null;
          needsCleanup = true;
          console.log('ℹ️  Reset invalid start balance in localStorage');
        } else {
          parsed.state.startBalance = {
            amount: Math.round(Number(rawStartBalance.amount)),
            date: rawStartBalance.date.slice(0, 10),
          };
        }
      }
      
      if (needsCleanup) {
        console.log('🧹 Updating localStorage with normalized fields...');
        localStorage.setItem('transaction-store', JSON.stringify(parsed));
        console.log('✅ localStorage normalized');
      } else {
        console.log('✅ localStorage budget fields already normalized');
      }
    }
  } catch (error) {
    console.error('❌ Failed to cleanup localStorage:', error);
  }
}

/**
 * Validate store state structure
 */
export function validateStoreState(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const state = useTransactionStore.getState();
  
  // Check required fields
  if (!state.transactions || !Array.isArray(state.transactions)) {
    errors.push('Missing or invalid transactions array');
  }
  
  if (!state.hovedkategorier || !(state.hovedkategorier instanceof Map)) {
    errors.push('Missing or invalid hovedkategorier Map');
  }
  
  if (!state.underkategorier || !(state.underkategorier instanceof Map)) {
    errors.push('Missing or invalid underkategorier Map');
  }
  
  if (!state.rules || !(state.rules instanceof Map)) {
    errors.push('Missing or invalid rules Map');
  }
  
  if (!state.locks || !(state.locks instanceof Map)) {
    errors.push('Missing or invalid locks Map');
  }
  
  if (!state.budgets || !(state.budgets instanceof Map)) {
    errors.push('Missing budgets map');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * One-time cleanup of legacy 2026 CSV transactions that have a bankId counterpart.
 * Transfers categoryId/isLocked from legacy to the bankId version before removal.
 * Only runs if ghost duplicates exist; records completion in localStorage.
 */
export function cleanupGhostDuplicates(): { removed: number; categoriesTransferred: number } {
  const MIGRATION_KEY = 'ghost-cleanup-v1-done';
  if (typeof window !== 'undefined' && localStorage.getItem(MIGRATION_KEY)) {
    return { removed: 0, categoriesTransferred: 0 };
  }

  const state = useTransactionStore.getState();
  const transactions = state.transactions;

  const toTimestamp = (dateStr: string): number => {
    if (!dateStr) return 0;
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const [day, month, yearRaw] = parts;
        const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
        return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
      }
    }
    if (dateStr.includes('-')) return new Date(dateStr).getTime();
    return new Date(dateStr).getTime();
  };
  const CUTOFF_2026 = new Date(2026, 0, 1).getTime();

  const pre2026Before = transactions.filter(t => toTimestamp(t.dato) < CUTOFF_2026).length;

  // Build soft-match index from bankId transactions (2026+)
  const bankIdBySoftKey = new Map<string, typeof transactions[number][]>();
  for (const t of transactions) {
    if (!t.bankId) continue;
    if (toTimestamp(t.dato) < CUTOFF_2026) continue;
    const key = generateSoftMatchKey(t);
    if (!bankIdBySoftKey.has(key)) bankIdBySoftKey.set(key, []);
    bankIdBySoftKey.get(key)!.push(t);
  }

  // Find legacy (no bankId, 2026+) ghosts that match a bankId transaction.
  // Never mutate store transaction objects (Immer/Zustand freeze) — collect updates for importTransactions.
  const ghostIds = new Set<string>();
  let categoriesTransferred = 0;
  const bankIdCategoryTransfer = new Map<string, { categoryId: string; isLocked: boolean }>();

  for (const t of transactions) {
    if (t.bankId) continue;
    if (toTimestamp(t.dato) < CUTOFF_2026) continue;

    const key = generateSoftMatchKey(t);
    const matches = bankIdBySoftKey.get(key);
    if (matches && matches.length > 0) {
      const target = matches[0];
      if (t.categoryId && !target.categoryId) {
        bankIdCategoryTransfer.set(target.id, {
          categoryId: t.categoryId,
          isLocked: Boolean(t.isLocked),
        });
        categoriesTransferred++;
      }
      ghostIds.add(t.id);
    }
  }

  if (ghostIds.size === 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
    }
    return { removed: 0, categoriesTransferred: 0 };
  }

  // Apply: remove ghosts, update bankId transactions with transferred categories
  const cleaned = transactions.filter(t => !ghostIds.has(t.id));
  // Apply transferred categories
  const bankIdUpdates = new Map<string, { categoryId?: string; isLocked?: boolean }>();
  for (const [, arr] of bankIdBySoftKey) {
    for (const t of arr) {
      if (t.categoryId) {
        bankIdUpdates.set(t.id, { categoryId: t.categoryId, isLocked: Boolean(t.isLocked) });
      }
    }
  }
  for (const [id, u] of bankIdCategoryTransfer) {
    bankIdUpdates.set(id, { categoryId: u.categoryId, isLocked: u.isLocked });
  }
  const final = cleaned.map(t =>
    bankIdUpdates.has(t.id) ? { ...t, ...bankIdUpdates.get(t.id)! } : t
  );

  const pre2026After = final.filter(t => toTimestamp(t.dato) < CUTOFF_2026).length;
  if (pre2026Before !== pre2026After) {
    console.error('SAFETY: pre-2026 count changed! Aborting ghost cleanup.');
    return { removed: 0, categoriesTransferred: 0 };
  }

  useTransactionStore.getState().importTransactions(final);

  console.log(`🧹 Ghost cleanup: removed ${ghostIds.size} duplicates, transferred ${categoriesTransferred} categories`);

  if (typeof window !== 'undefined') {
    localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
  }

  return { removed: ghostIds.size, categoriesTransferred };
}

/**
 * Run full migration and cleanup
 */
export function runStoreMigration(): void {
  console.log('\n🔄 Running store migration...\n');
  console.log('='.repeat(70));
  
  // 1. Validate current state
  const validation = validateStoreState();
  
  console.log('\n📋 Validation Results:');
  console.log(`   Valid: ${validation.valid ? '✅' : '❌'}`);
  
  if (validation.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    validation.errors.forEach((err) => console.log(`   - ${err}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    validation.warnings.forEach((warn) => console.log(`   - ${warn}`));
  }
  
  // 2. Cleanup localStorage
  console.log('\n🧹 Cleanup Phase:');
  cleanupLocalStorage();
  
  // 3. Normalize budget fields
  ensureBudgetFields();

  // 4. One-time ghost duplicate cleanup
  console.log('\n🧹 Ghost Duplicate Cleanup:');
  const ghostResult = cleanupGhostDuplicates();
  if (ghostResult.removed > 0) {
    console.log(`   Removed: ${ghostResult.removed} ghost duplicates`);
    console.log(`   Categories transferred: ${ghostResult.categoriesTransferred}`);
  } else {
    console.log('   ✅ No ghost duplicates found (or already cleaned)');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Migration complete\n');
}

/**
 * Get store statistics
 */
export function getStoreStats(): {
  transactions: number;
  kategorier: number;
  rules: number;
  locks: number;
  categorized: number;
  uncategorized: number;
  storageSize: number;
} {
  const state = useTransactionStore.getState();
  
  const categorized = state.transactions.filter((t) => t.categoryId).length;
  const uncategorized = state.transactions.length - categorized;
  
  let storageSize = 0;
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('transaction-store');
    if (stored) {
      storageSize = new Blob([stored]).size;
    }
  }
  
  return {
    transactions: state.transactions.length,
    kategorier: state.hovedkategorier.size + state.underkategorier.size,
    rules: state.rules.size,
    locks: state.locks.size,
    categorized,
    uncategorized,
    storageSize,
  };
}

/**
 * Log store statistics
 */
export function logStoreStats(): void {
  const stats = getStoreStats();
  
  console.log('\n📊 Store Statistics:');
  console.log('='.repeat(70));
  console.log(`   Transactions:  ${stats.transactions.toLocaleString('no')}`);
  console.log(`   Kategorier:    ${stats.kategorier.toLocaleString('no')}`);
  console.log(`   Rules:         ${stats.rules.toLocaleString('no')}`);
  console.log(`   Locks:         ${stats.locks.toLocaleString('no')}`);
  console.log(`   Categorized:   ${stats.categorized.toLocaleString('no')}`);
  console.log(`   Uncategorized: ${stats.uncategorized.toLocaleString('no')}`);
  console.log(`   Storage size:  ${(stats.storageSize / 1024).toFixed(2)} KB`);
  console.log('='.repeat(70) + '\n');
}

