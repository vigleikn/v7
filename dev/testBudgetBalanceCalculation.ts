/**
 * Test for BudgetPage balance calculation fix
 * Verifies that "Balanse nå" uses same logic as OversiktPage
 */

import { useTransactionStore } from '../src/store';
import { initializeStore } from '../services/storeIntegration';
import { computeMonthlySpending } from '../services/budgetCalculations';
import { CategorizedTransaction, Hovedkategori, Underkategori } from '../src/store';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(test: string, passed: boolean, message: string, details?: any) {
  results.push({ test, passed, message, details });
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${test}: ${message}`);
  if (details && !passed) {
    console.log('   Details:', details);
  }
}

function createMockTransaction(
  id: string,
  dato: string,
  beløp: number,
  tekst: string,
  categoryId?: string
): CategorizedTransaction {
  return {
    id,
    dato,
    beløp,
    tekst,
    categoryId: categoryId || null,
    fraKonto: null,
    tilKonto: null,
    underkategori: null,
    hovedkategori: null,
    transactionId: `tx-${id}`,
  };
}

function createMockCategories(): { hovedkategorier: Hovedkategori[]; underkategorier: Underkategori[] } {
  const hovedkategorier: Hovedkategori[] = [
    {
      id: 'cat_inntekter_default',
      name: 'Inntekter',
      sortOrder: 1,
      underkategorier: [],
    },
    {
      id: 'test_expense',
      name: 'Test Utgift',
      sortOrder: 2,
      underkategorier: ['test_subcat_1'],
    },
  ];

  const underkategorier: Underkategori[] = [
    {
      id: 'test_subcat_1',
      name: 'Test Subkategori',
      hovedkategoriId: 'test_expense',
    },
  ];

  return { hovedkategorier, underkategorier };
}

async function runTests() {
  console.log('\n🧪 Testing BudgetPage Balance Calculation Fix\n');
  console.log('='.repeat(70));

  // Initialize store
  await initializeStore();

  const { hovedkategorier, underkategorier } = createMockCategories();

  // Test 1: Expense with refund (net balance)
  console.log('\n📋 Test 1: Expense with Refund (Net Balance)');
  console.log('-'.repeat(70));

  const testTransactions = [
    createMockTransaction('1', '2025-11-15', -1000, 'Purchase', 'test_subcat_1'),
    createMockTransaction('2', '2025-11-20', +200, 'Refund', 'test_subcat_1'),
  ];

  const months = ['2025-11'];
  const editableCategoryIds = new Set(['test_subcat_1']);

  const spendingMap = computeMonthlySpending(
    testTransactions,
    months,
    editableCategoryIds,
    hovedkategorier,
    underkategorier
  );

  const key = 'test_subcat_1|2025-11';
  const actual = spendingMap.get(key) ?? 0;
  const expected = 800; // -(-1000) - (+200) = 1000 - 200 = 800

  logTest(
    'Net balance: -1000 + 200 = 800',
    actual === expected,
    `Expected ${expected}, got ${actual}`,
    {
      transactions: testTransactions.map((tx) => ({ beløp: tx.beløp, categoryId: tx.categoryId })),
      actual,
      expected,
    }
  );

  // Test 2: Multiple expenses and refunds
  console.log('\n📋 Test 2: Multiple Expenses and Refunds');
  console.log('-'.repeat(70));

  const testTransactions2 = [
    createMockTransaction('1', '2025-11-10', -500, 'Purchase 1', 'test_subcat_1'),
    createMockTransaction('2', '2025-11-15', -300, 'Purchase 2', 'test_subcat_1'),
    createMockTransaction('3', '2025-11-20', +100, 'Refund 1', 'test_subcat_1'),
    createMockTransaction('4', '2025-11-25', +50, 'Refund 2', 'test_subcat_1'),
  ];

  const spendingMap2 = computeMonthlySpending(
    testTransactions2,
    months,
    editableCategoryIds,
    hovedkategorier,
    underkategorier
  );

  const actual2 = spendingMap2.get(key) ?? 0;
  // Expected: -(-500) - (-300) - (+100) - (+50) = 500 + 300 - 100 - 50 = 650
  const expected2 = 650;

  logTest(
    'Multiple transactions: -500 -300 +100 +50 = 650',
    actual2 === expected2,
    `Expected ${expected2}, got ${actual2}`,
    {
      transactions: testTransactions2.map((tx) => ({ beløp: tx.beløp })),
      actual: actual2,
      expected: expected2,
    }
  );

  // Test 3: Income category (should add directly)
  console.log('\n📋 Test 3: Income Category Logic');
  console.log('-'.repeat(70));

  const incomeTransactions = [
    createMockTransaction('1', '2025-11-15', +5000, 'Salary', 'cat_inntekter_default'),
    createMockTransaction('2', '2025-11-20', -200, 'Deduction', 'cat_inntekter_default'),
  ];

  const incomeEditableIds = new Set(['cat_inntekter_default']);
  const spendingMap3 = computeMonthlySpending(
    incomeTransactions,
    months,
    incomeEditableIds,
    hovedkategorier,
    underkategorier
  );

  const incomeKey = 'cat_inntekter_default|2025-11';
  const actual3 = spendingMap3.get(incomeKey) ?? 0;
  // For income: add directly, so +5000 + (-200) = 4800
  const expected3 = 4800;

  logTest(
    'Income: +5000 + (-200) = 4800',
    actual3 === expected3,
    `Expected ${expected3}, got ${actual3}`,
    {
      transactions: incomeTransactions.map((tx) => ({ beløp: tx.beløp })),
      actual: actual3,
      expected: expected3,
    }
  );

  // Test 4: Uncategorized
  console.log('\n📋 Test 4: Uncategorized Transactions');
  console.log('-'.repeat(70));

  const uncategorizedTransactions = [
    createMockTransaction('1', '2025-11-15', -100, 'Uncategorized expense', null),
    createMockTransaction('2', '2025-11-20', +20, 'Uncategorized refund', null),
  ];

  const uncategorizedEditableIds = new Set(['__uncategorized']);
  const spendingMap4 = computeMonthlySpending(
    uncategorizedTransactions,
    months,
    uncategorizedEditableIds,
    hovedkategorier,
    underkategorier
  );

  const uncategorizedKey = '__uncategorized|2025-11';
  const actual4 = spendingMap4.get(uncategorizedKey) ?? 0;
  // For expenses (uncategorized): subtract, so -(-100) - (+20) = 100 - 20 = 80
  const expected4 = 80;

  logTest(
    'Uncategorized: -100 + 20 = 80',
    actual4 === expected4,
    `Expected ${expected4}, got ${actual4}`,
    {
      transactions: uncategorizedTransactions.map((tx) => ({ beløp: tx.beløp, categoryId: tx.categoryId })),
      actual: actual4,
      expected: expected4,
    }
  );

  // Test 5: Transfers excluded
  console.log('\n📋 Test 5: Transfers Excluded');
  console.log('-'.repeat(70));

  const transactionsWithTransfer = [
    createMockTransaction('1', '2025-11-15', -1000, 'Expense', 'test_subcat_1'),
    createMockTransaction('2', '2025-11-20', -50000, 'Transfer', 'overfort'),
  ];

  const spendingMap5 = computeMonthlySpending(
    transactionsWithTransfer,
    months,
    editableCategoryIds,
    hovedkategorier,
    underkategorier
  );

  const actual5 = spendingMap5.get(key) ?? 0;
  // Should only include the expense, not the transfer
  const expected5 = 1000; // -(-1000) = 1000

  logTest(
    'Transfers excluded: only -1000 counted = 1000',
    actual5 === expected5,
    `Expected ${expected5}, got ${actual5}`,
    {
      transactions: transactionsWithTransfer.map((tx) => ({ beløp: tx.beløp, categoryId: tx.categoryId })),
      actual: actual5,
      expected: expected5,
    }
  );

  // Summary
  console.log('\n📋 Test Summary');
  console.log('='.repeat(70));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.test}: ${r.message}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    console.log('\n✅ Balance calculation now matches OversiktPage logic!');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

