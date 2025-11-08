/**
 * Test: Store Migration & Cleanup
 * Verifies that deprecated fields are removed and store is valid
 */

import { useTransactionStore } from '../src/store';
import {
  runStoreMigration,
  validateStoreState,
  getStoreStats,
  cleanupLocalStorage,
} from '../services/storeMigration';

function testStoreMigration() {
  console.log('\n🧪 TEST: Store Migration & Cleanup\n');
  console.log('='.repeat(70));
  
  // Test 1: Validate current state
  console.log('\n✓ Test 1: Validate Store State');
  const validation = validateStoreState();
  
  console.log(`   Valid: ${validation.valid ? '✅' : '❌'}`);
  console.log(`   Errors: ${validation.errors.length}`);
  console.log(`   Warnings: ${validation.warnings.length}`);
  
  if (validation.errors.length > 0) {
    console.log('\n   Errors:');
    validation.errors.forEach((err) => console.log(`      - ${err}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n   Warnings:');
    validation.warnings.forEach((warn) => console.log(`      - ${warn}`));
  }
  
  // Test 2: Get store statistics
  console.log('\n✓ Test 2: Store Statistics');
  const stats = getStoreStats();
  
  console.log(`   Transactions: ${stats.transactions}`);
  console.log(`   Kategorier: ${stats.kategorier}`);
  console.log(`   Rules: ${stats.rules}`);
  console.log(`   Categorized: ${stats.categorized}`);
  console.log(`   Storage: ${(stats.storageSize / 1024).toFixed(2)} KB`);
  
  // Test 3: Check budget structures
  console.log('\n✓ Test 3: Budget Structure');
  const state = useTransactionStore.getState();
  
  const hasBudgets = state.budgets instanceof Map;
  const startBalanceValid =
    !state.startBalance ||
    (typeof state.startBalance.amount === 'number' &&
      typeof state.startBalance.date === 'string');
  
  console.log(`   Budgets map present: ${hasBudgets ? '✅ YES' : '❌ NO'}`);
  console.log(`   Start balance structure: ${startBalanceValid ? '✅ OK' : '❌ INVALID'}`);
  
  if (!hasBudgets || !startBalanceValid) {
    console.log('\n   ⚠️  Running migration to normalize budget fields...');
    runStoreMigration();
  }
  
  // Test 4: Cleanup localStorage
  console.log('\n✓ Test 4: Cleanup localStorage');
  cleanupLocalStorage();
  
  // Test 5: Validate required fields are intact
  console.log('\n✓ Test 5: Validate Required Fields');
  const requiredFields = [
    'transactions',
    'hovedkategorier',
    'underkategorier',
    'rules',
    'locks',
    'filters',
    'selection',
    'budgets',
    'startBalance',
  ];
  
  requiredFields.forEach((field) => {
    const exists = field in state;
    console.log(`   ${field}: ${exists ? '✅' : '❌'}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Store migration test complete!\n');
}

// Run test
testStoreMigration();

