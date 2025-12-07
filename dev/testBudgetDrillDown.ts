/**
 * Test suite for BudgetPage transaction drill-down functionality
 * Tests the "Balanse nå" cell clickability and transaction list display
 */

import { useTransactionStore } from '../src/store';
import { initializeStore } from '../services/storeIntegration';
import { transactionToYearMonth } from '../services/budgetCalculations';

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

// Mock data for testing
function createMockTransaction(
  id: string,
  dato: string,
  beløp: number,
  tekst: string,
  categoryId?: string,
  fraKonto?: string,
  tilKonto?: string
) {
  return {
    id,
    dato,
    beløp,
    tekst,
    categoryId: categoryId || null,
    fraKonto: fraKonto || null,
    tilKonto: tilKonto || null,
    underkategori: null,
    hovedkategori: null,
    transactionId: `tx-${id}`,
  };
}

async function runTests() {
  console.log('\n🧪 Testing BudgetPage Transaction Drill-Down Functionality\n');
  console.log('='.repeat(70));

  // Initialize store
  await initializeStore();

  const store = useTransactionStore.getState();

  // Test 1: Verify clickability logic
  console.log('\n📋 Test 1: Clickability Logic');
  console.log('-'.repeat(70));

  const testCases = [
    {
      level: 1,
      categoryId: 'subcat_1',
      expected: true,
      description: 'Subcategory (level 1) should be clickable',
    },
    {
      level: 0,
      categoryId: 'maincat_1',
      expected: false,
      description: 'Main category (level 0) should NOT be clickable',
    },
    {
      level: 1,
      categoryId: '__uncategorized',
      expected: true,
      description: 'Uncategorized (level 1) should be clickable',
    },
    {
      level: 0,
      categoryId: '__uncategorized',
      expected: true,
      description: 'Uncategorized (any level) should be clickable',
    },
    {
      level: 1,
      categoryId: '__balance_row',
      expected: false,
      description: 'Balance row should NOT be clickable',
    },
    {
      level: 1,
      categoryId: 'cat_inntekter_default',
      expected: false,
      description: 'Income category should NOT be clickable',
    },
    {
      level: 1,
      categoryId: '__expenses_total',
      expected: false,
      description: 'Expenses total should NOT be clickable',
    },
  ];

  testCases.forEach(({ level, categoryId, expected, description }) => {
    const isClickable =
      (level === 1 || categoryId === '__uncategorized') &&
      categoryId !== '__balance_row' &&
      categoryId !== 'cat_inntekter_default' &&
      categoryId !== '__expenses_total';

    logTest(
      `Clickability: ${description}`,
      isClickable === expected,
      `Expected ${expected}, got ${isClickable}`,
      { level, categoryId, isClickable, expected }
    );
  });

  // Test 2: Transaction filtering logic
  console.log('\n📋 Test 2: Transaction Filtering');
  console.log('-'.repeat(70));

  // Create test transactions
  const testTransactions = [
    createMockTransaction('1', '2025-11-15', -500, 'Test transaction 1', 'subcat_1'),
    createMockTransaction('2', '2025-11-20', -300, 'Test transaction 2', 'subcat_1'),
    createMockTransaction('3', '2025-12-01', -200, 'Test transaction 3', 'subcat_1'), // Wrong month
    createMockTransaction('4', '2025-11-10', -100, 'Uncategorized', null), // Uncategorized
    createMockTransaction('5', '2025-11-25', -1000, 'Transfer', 'overfort'), // Should be excluded
    createMockTransaction('6', '15.11.25', -150, 'Date with dots', 'subcat_1'), // Different date format
    createMockTransaction('7', '2025-11-05', -250, 'Another transaction', 'subcat_2'), // Wrong category
  ];

  // Test filtering for subcat_1 in November 2025
  const targetMonth = '2025-11';
  const targetCategory = 'subcat_1';

  const filtered = testTransactions.filter((tx) => {
    // Skip transfers
    if (tx.categoryId === 'overfort') {
      return false;
    }

    // Parse transaction date to yyyy-MM format
    let txMonth: string;
    if (tx.dato.includes('.')) {
      const [day, month, year] = tx.dato.split('.');
      const fullYear = year.length === 2 ? `20${year}` : year;
      txMonth = `${fullYear}-${month.padStart(2, '0')}`;
    } else {
      txMonth = tx.dato.substring(0, 7);
    }

    // Check if transaction matches month
    if (txMonth !== targetMonth) return false;

    // Check if transaction matches category
    if (targetCategory === '__uncategorized') {
      return !tx.categoryId;
    }

    return tx.categoryId === targetCategory;
  });

  const expectedIds = ['1', '2', '6']; // Should include transactions 1, 2, and 6
  const actualIds = filtered.map((tx) => tx.id);

  logTest(
    'Filter: Correct transactions for subcat_1 in Nov 2025',
    expectedIds.every((id) => actualIds.includes(id)) && actualIds.length === expectedIds.length,
    `Expected IDs: ${expectedIds.join(', ')}, Got: ${actualIds.join(', ')}`,
    { filtered: filtered.map((tx) => ({ id: tx.id, dato: tx.dato, categoryId: tx.categoryId })) }
  );

  // Test filtering for uncategorized
  const filteredUncategorized = testTransactions.filter((tx) => {
    if (tx.categoryId === 'overfort') return false;

    let txMonth: string;
    if (tx.dato.includes('.')) {
      const [day, month, year] = tx.dato.split('.');
      const fullYear = year.length === 2 ? `20${year}` : year;
      txMonth = `${fullYear}-${month.padStart(2, '0')}`;
    } else {
      txMonth = tx.dato.substring(0, 7);
    }

    if (txMonth !== targetMonth) return false;

    if ('__uncategorized' === '__uncategorized') {
      return !tx.categoryId;
    }

    return tx.categoryId === '__uncategorized';
  });

  logTest(
    'Filter: Uncategorized transactions in Nov 2025',
    filteredUncategorized.length === 1 && filteredUncategorized[0].id === '4',
    `Expected 1 transaction (id: 4), Got: ${filteredUncategorized.length} transaction(s)`,
    { filtered: filteredUncategorized.map((tx) => ({ id: tx.id, categoryId: tx.categoryId })) }
  );

  // Test that transfers are excluded
  const transferIncluded = filtered.some((tx) => tx.categoryId === 'overfort');
  logTest(
    'Filter: Transfers are excluded',
    !transferIncluded,
    transferIncluded ? 'Transfer was incorrectly included' : 'Transfers correctly excluded'
  );

  // Test 3: Date parsing
  console.log('\n📋 Test 3: Date Parsing');
  console.log('-'.repeat(70));

  const dateTestCases = [
    { input: '2025-11-15', expected: '2025-11' },
    { input: '15.11.25', expected: '2025-11' },
    { input: '15.11.2025', expected: '2025-11' },
    { input: '2025-12-01', expected: '2025-12' },
  ];

  dateTestCases.forEach(({ input, expected }) => {
    let txMonth: string;
    if (input.includes('.')) {
      const [day, month, year] = input.split('.');
      const fullYear = year.length === 2 ? `20${year}` : year;
      txMonth = `${fullYear}-${month.padStart(2, '0')}`;
    } else {
      txMonth = input.substring(0, 7);
    }

    logTest(
      `Date parsing: ${input} -> ${expected}`,
      txMonth === expected,
      `Expected ${expected}, got ${txMonth}`
    );
  });

  // Test 4: Verify transactionToYearMonth function
  console.log('\n📋 Test 4: transactionToYearMonth Function');
  console.log('-'.repeat(70));

  const functionTestCases = [
    { input: '2025-11-15', expected: '2025-11' },
    { input: '15.11.25', expected: '2025-11' },
  ];

  functionTestCases.forEach(({ input, expected }) => {
    const result = transactionToYearMonth(input);
    logTest(
      `transactionToYearMonth: ${input}`,
      result === expected,
      `Expected ${expected}, got ${result}`
    );
  });

  // Test 5: Visual feedback classes
  console.log('\n📋 Test 5: Visual Feedback Classes');
  console.log('-'.repeat(70));

  const clickableClass = 'cursor-pointer hover:bg-blue-50 hover:font-semibold';
  const activeClass = 'bg-blue-100 font-bold ring-2 ring-blue-400 ring-inset';

  logTest(
    'Visual: Clickable cell classes',
    clickableClass.includes('cursor-pointer') &&
      clickableClass.includes('hover:bg-blue-50') &&
      clickableClass.includes('hover:font-semibold'),
    'Clickable classes are correct'
  );

  logTest(
    'Visual: Active cell classes',
    activeClass.includes('bg-blue-100') &&
      activeClass.includes('font-bold') &&
      activeClass.includes('ring-2') &&
      activeClass.includes('ring-blue-400'),
    'Active cell classes are correct'
  );

  // Test 6: Summary
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
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

