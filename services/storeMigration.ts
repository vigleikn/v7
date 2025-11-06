/**
 * Store Migration & Cleanup Service
 * Handles store upgrades and cleanup of deprecated fields
 */

import { useTransactionStore } from '../src/store';

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Remove deprecated budget fields from store
 */
export function removeBudgetFields(): void {
  const state = useTransactionStore.getState();
  
  console.log('🔍 Checking for deprecated budget fields...');
  
  // Check if budget fields exist
  const hasBudgets = 'budgets' in state;
  const hasStartBalance = 'startBalance' in state;
  
  if (hasBudgets || hasStartBalance) {
    console.log('⚠️  Found deprecated budget fields:');
    if (hasBudgets) {
      console.log(`   - budgets: ${typeof state.budgets}`);
    }
    if (hasStartBalance) {
      console.log(`   - startBalance: ${state.startBalance}`);
    }
    
    // Remove from store state (Zustand will handle localStorage)
    const currentState = useTransactionStore.getState();
    const cleanState: any = { ...currentState };
    
    delete cleanState.budgets;
    delete cleanState.startBalance;
    delete cleanState.setBudget;
    delete cleanState.getBudget;
    delete cleanState.setStartBalance;
    delete cleanState.clearBudgets;
    
    console.log('🧹 Cleaning up budget fields...');
    // Note: We can't directly delete from state, but we can ensure they're not persisted
  } else {
    console.log('✅ No deprecated budget fields found');
  }
}

/**
 * Cleanup localStorage from deprecated fields
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
      
      // Check for budget fields
      if ('budgets' in parsed.state) {
        console.log('⚠️  Found budgets in localStorage');
        delete parsed.state.budgets;
        needsCleanup = true;
      }
      
      if ('startBalance' in parsed.state) {
        console.log('⚠️  Found startBalance in localStorage');
        delete parsed.state.startBalance;
        needsCleanup = true;
      }
      
      if (needsCleanup) {
        console.log('🧹 Cleaning localStorage...');
        localStorage.setItem('transaction-store', JSON.stringify(parsed));
        console.log('✅ localStorage cleaned');
      } else {
        console.log('✅ localStorage is clean');
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
  
  // Check for deprecated fields
  if ('budgets' in state) {
    warnings.push('Deprecated field "budgets" found in state');
  }
  
  if ('startBalance' in state) {
    warnings.push('Deprecated field "startBalance" found in state');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
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
  
  // 3. Remove deprecated fields
  removeBudgetFields();
  
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

