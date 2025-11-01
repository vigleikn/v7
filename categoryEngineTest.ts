/**
 * Tests for the Category Rule Engine
 */

import {
  createInitialState,
  createCategory,
  setRule,
  deleteRule,
  applyRules,
  lockTransaction,
  unlockTransaction,
  isTransactionLocked,
  categorizeTransaction,
  getCategorizationStats,
  generateTransactionId,
  groupByTekst,
  updateCategory,
  deleteCategory,
  CategorizedTransaction,
  Transaction,
} from './categoryEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

function testCategoryEngine() {
  console.log('=== Running Category Engine Tests ===\n');

  // Test 1: Initialize state
  console.log('Test 1: Initialize state');
  let state = createInitialState();
  assert(state.rules.size === 0, 'Initial state should have no rules');
  assert(state.locks.size === 0, 'Initial state should have no locks');
  assert(state.categories.size === 0, 'Initial state should have no categories');
  console.log();

  // Test 2: Create categories
  console.log('Test 2: Create categories');
  const catResult1 = createCategory(state.categories, { name: 'Food', isIncome: false });
  state.categories = catResult1.categories;
  const foodCategoryId = catResult1.category.id;

  const catResult2 = createCategory(state.categories, { name: 'Income', isIncome: true });
  state.categories = catResult2.categories;
  const incomeCategoryId = catResult2.category.id;

  assert(state.categories.size === 2, 'Should have 2 categories');
  assert(catResult1.category.name === 'Food', 'Category name should be Food');
  assert(catResult2.category.isIncome === true, 'Income category should be marked as income');
  console.log();

  // Test 3: Update and delete categories
  console.log('Test 3: Update and delete categories');
  const updated = updateCategory(state.categories, foodCategoryId, { name: 'Food & Drinks' });
  assert(updated !== null, 'Should be able to update regular category');
  if (updated) {
    state.categories = updated;
    assert(state.categories.get(foodCategoryId)?.name === 'Food & Drinks', 'Category name should be updated');
  }

  const cannotUpdateIncome = updateCategory(state.categories, incomeCategoryId, { name: 'Revenue' });
  assert(cannotUpdateIncome === null, 'Should NOT be able to update income category');

  const cannotDeleteIncome = deleteCategory(state.categories, incomeCategoryId);
  assert(cannotDeleteIncome === null, 'Should NOT be able to delete income category');
  console.log();

  // Test 4: Create rules
  console.log('Test 4: Create rules');
  state.rules = setRule(state.rules, 'KIWI', foodCategoryId);
  state.rules = setRule(state.rules, 'Extra', foodCategoryId);
  state.rules = setRule(state.rules, 'Salary', incomeCategoryId);

  assert(state.rules.size === 3, 'Should have 3 rules');
  assert(state.rules.get('kiwi')?.categoryId === foodCategoryId, 'KIWI rule should map to Food category');
  console.log();

  // Test 5: Create test transactions
  console.log('Test 5: Create and categorize test transactions');
  const testTransactions: Transaction[] = [
    {
      dato: '2025-01-01',
      beløp: -100.50,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Main',
      fraKontonummer: '123',
      type: 'Payment',
      tekst: 'KIWI',
      underkategori: '',
    },
    {
      dato: '2025-01-02',
      beløp: -200.00,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Main',
      fraKontonummer: '123',
      type: 'Payment',
      tekst: 'KIWI',
      underkategori: '',
    },
    {
      dato: '2025-01-03',
      beløp: -50.00,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Main',
      fraKontonummer: '123',
      type: 'Payment',
      tekst: 'Extra',
      underkategori: '',
    },
    {
      dato: '2025-01-04',
      beløp: 5000.00,
      tilKonto: 'Main',
      tilKontonummer: '123',
      fraKonto: '',
      fraKontonummer: '',
      type: 'Transfer',
      tekst: 'Salary',
      underkategori: '',
    },
    {
      dato: '2025-01-05',
      beløp: -75.00,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Main',
      fraKontonummer: '123',
      type: 'Payment',
      tekst: 'Unknown Store',
      underkategori: '',
    },
  ];

  const applyResult = applyRules(testTransactions, state);
  let transactions = applyResult.categorized;

  assert(applyResult.stats.total === 5, 'Should have 5 transactions');
  assert(applyResult.stats.categorized === 4, 'Should have 4 categorized transactions');
  assert(applyResult.stats.uncategorized === 1, 'Should have 1 uncategorized transaction');
  assert(applyResult.stats.rulesApplied === 4, 'Should have applied 4 rules');
  console.log();

  // Test 6: Lock a transaction
  console.log('Test 6: Lock a transaction');
  const kiwiTransaction = transactions.find(t => t.tekst === 'KIWI')!;
  const txId = kiwiTransaction.transactionId;

  state.locks = lockTransaction(state.locks, txId, incomeCategoryId, 'Test lock');
  assert(isTransactionLocked(state.locks, txId), 'Transaction should be locked');

  // Re-apply rules - locked transaction should keep locked category
  const reapplyResult = applyRules(testTransactions, state);
  transactions = reapplyResult.categorized;

  const lockedTx = transactions.find(t => t.transactionId === txId)!;
  assert(lockedTx.isLocked === true, 'Transaction should be marked as locked');
  assert(lockedTx.categoryId === incomeCategoryId, 'Locked transaction should have income category');
  assert(reapplyResult.stats.locked === 1, 'Should have 1 locked transaction');
  console.log();

  // Test 7: Unlock transaction
  console.log('Test 7: Unlock transaction');
  state.locks = unlockTransaction(state.locks, txId);
  assert(!isTransactionLocked(state.locks, txId), 'Transaction should be unlocked');

  const afterUnlock = applyRules(testTransactions, state);
  const unlockedTx = afterUnlock.categorized.find(t => t.transactionId === txId)!;
  assert(unlockedTx.categoryId === foodCategoryId, 'Unlocked transaction should revert to rule category');
  assert(unlockedTx.isLocked === false, 'Transaction should not be marked as locked');
  console.log();

  // Test 8: Categorize transaction and create rule
  console.log('Test 8: Categorize transaction and create rule');
  const uncategorizedTx = transactions.find(t => !t.categoryId)!;
  const uncatTxId = uncategorizedTx.transactionId;

  const categorizeResult = categorizeTransaction(
    transactions,
    uncatTxId,
    foodCategoryId,
    state,
    true
  );

  state = categorizeResult.state;
  assert(state.rules.has('unknown store'), 'Should have created a rule for Unknown Store');
  assert(categorizeResult.affectedTransactions.length === 1, 'Should affect 1 transaction');
  console.log();

  // Test 9: Cannot categorize locked transaction
  console.log('Test 9: Cannot categorize locked transaction');
  state.locks = lockTransaction(state.locks, txId, incomeCategoryId);
  const reapplyWithLock = applyRules(testTransactions, state);
  const txsWithLock = reapplyWithLock.categorized;

  let errorThrown = false;
  try {
    categorizeTransaction(txsWithLock, txId, foodCategoryId, state, true);
  } catch (error) {
    errorThrown = true;
  }
  assert(errorThrown, 'Should throw error when trying to categorize locked transaction');
  console.log();

  // Test 10: Delete rule
  console.log('Test 10: Delete rule');
  const ruleCountBefore = state.rules.size;
  state.rules = deleteRule(state.rules, 'Extra');
  assert(state.rules.size === ruleCountBefore - 1, 'Should have one less rule');
  assert(!state.rules.has('extra'), 'Extra rule should be deleted');
  console.log();

  // Test 11: Group transactions by tekst
  console.log('Test 11: Group transactions by tekst');
  const groups = groupByTekst(transactions);
  assert(groups.has('kiwi'), 'Should have KIWI group');
  assert(groups.get('kiwi')?.length === 2, 'KIWI group should have 2 transactions');
  console.log();

  // Test 12: Get categorization stats
  console.log('Test 12: Get categorization stats');
  const stats = getCategorizationStats(transactions);
  assert(stats.total === 5, 'Stats should show 5 total transactions');
  assert(stats.uniqueTekstPatterns === 4, 'Should have 4 unique text patterns');
  console.log();

  // Test 13: Transaction ID generation consistency
  console.log('Test 13: Transaction ID generation');
  const tx1: Transaction = {
    dato: '2025-01-01',
    beløp: -100,
    tilKonto: 'A',
    tilKontonummer: '1',
    fraKonto: 'B',
    fraKontonummer: '2',
    type: 'Payment',
    tekst: 'Test',
    underkategori: '',
  };
  const tx2: Transaction = { ...tx1 };
  
  const id1 = generateTransactionId(tx1);
  const id2 = generateTransactionId(tx2);
  assert(id1 === id2, 'Identical transactions should have same ID');

  const tx3: Transaction = { ...tx1, beløp: -200 };
  const id3 = generateTransactionId(tx3);
  assert(id1 !== id3, 'Different transactions should have different IDs');
  console.log();

  console.log('=== All Tests Passed! ✅ ===\n');
}

// Run tests
try {
  testCategoryEngine();
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}

