/**
 * Test: Current Month Exclusion from Summary Calculations
 * Verifies that sum/avg/var only use full months (excludes current month)
 */

import { useTransactionStore } from '../src/store';
import { CategorizedTransaction } from '../src/store/state';
import {
  getLast12Months,
  getCurrentMonth,
  calculateMonthlyData,
  buildCategoryRows,
  calculateStats,
} from '../services/monthlyCalculations';

function testCurrentMonthExclusion() {
  console.log('\n🧪 TEST: Current Month Exclusion from Summary Calculations\n');
  console.log('='.repeat(80));

  // Get current month
  const currentMonth = getCurrentMonth();
  console.log(`\n✓ Current month: ${currentMonth}`);

  // Create test transactions including current month
  const months = getLast12Months();
  console.log(`✓ Last 12 months: ${months.join(', ')}`);
  
  const currentMonthIndex = months.indexOf(currentMonth);
  console.log(`✓ Current month index in array: ${currentMonthIndex}`);

  // Create test data with known values
  const testTransactions: CategorizedTransaction[] = [];
  
  // Add 1000 kr income for each of the last 11 full months
  for (let i = 0; i < 11; i++) {
    testTransactions.push({
      id: `tx-${i}`,
      transactionId: `hash-${i}`,
      dato: `15.${months[i].split('-')[1]}.${months[i].split('-')[0].slice(-2)}`,
      beløp: 1000,
      type: 'Betaling',
      tekst: `Test income ${i}`,
      underkategori: '',
      tilKonto: 'Konto',
      tilKontonummer: '1234',
      fraKonto: '',
      fraKontonummer: '',
      categoryId: 'test-income-id',
      isLocked: false,
    });
  }
  
  // Add 5000 kr income for current month (should be excluded from summary)
  if (currentMonthIndex >= 0) {
    testTransactions.push({
      id: 'tx-current',
      transactionId: 'hash-current',
      dato: `15.${currentMonth.split('-')[1]}.${currentMonth.split('-')[0].slice(-2)}`,
      beløp: 5000,
      type: 'Betaling',
      tekst: 'Current month income',
      underkategori: '',
      tilKonto: 'Konto',
      tilKontonummer: '1234',
      fraKonto: '',
      fraKontonummer: '',
      categoryId: 'test-income-id',
      isLocked: false,
    });
  }

  // Setup test categories
  const store = useTransactionStore.getState();
  store.hovedkategorier.clear();
  store.hovedkategorier.set('cat_inntekter_default', {
    id: 'cat_inntekter_default',
    name: 'Inntekter',
    type: 'hovedkategori',
    isIncome: true,
    underkategorier: ['test-income-id'],
    sortOrder: 0,
    allowSubcategories: true,
  });

  store.underkategorier.clear();
  store.underkategorier.set('test-income-id', {
    id: 'test-income-id',
    name: 'Test Income',
    type: 'underkategori',
    hovedkategoriId: 'cat_inntekter_default',
    sortOrder: 0,
  });

  const hovedkategorier = Array.from(store.hovedkategorier.values());
  const underkategorier = Array.from(store.underkategorier.values());

  // Calculate monthly data
  const monthlyData = calculateMonthlyData(testTransactions, months, hovedkategorier, underkategorier);
  
  console.log('\n✓ Monthly income values:');
  monthlyData.forEach((m, idx) => {
    const isCurrent = m.month === currentMonth;
    const marker = isCurrent ? ' ← CURRENT MONTH' : '';
    console.log(`   ${idx}: ${m.month} = ${m.income} kr${marker}`);
  });

  // Build category rows (this applies the exclusion logic)
  const categoryRows = buildCategoryRows(monthlyData, hovedkategorier, underkategorier);
  
  // Find income row
  const incomeRow = categoryRows.find((r) => r.categoryName === 'Inntekter');
  
  if (!incomeRow) {
    console.log('\n❌ FAIL: Income row not found');
    return;
  }

  console.log('\n✓ Income Row Summary:');
  console.log(`   Monthly values: [${incomeRow.monthlyValues.join(', ')}]`);
  console.log(`   Sum: ${incomeRow.sum} kr`);
  console.log(`   Avg: ${incomeRow.avg.toFixed(2)} kr`);
  console.log(`   Variance: ${incomeRow.variance.toFixed(2)}`);

  // Expected calculations (excluding current month)
  // 11 full months × 1000 kr = 11,000 kr total
  // Current month (5000 kr) should NOT be counted
  const expectedSum = 11000;
  const expectedAvg = 1000; // 11,000 / 11
  const expectedVariance = 0; // All values are the same (1000)

  console.log('\n✓ Expected values (from 11 full months only):');
  console.log(`   Expected sum: ${expectedSum} kr (11 months × 1000 kr)`);
  console.log(`   Expected avg: ${expectedAvg} kr (11,000 / 11)`);
  console.log(`   Expected variance: ${expectedVariance} (all months equal)`);

  // Verification
  const tests = [
    { 
      name: 'Sum excludes current month', 
      pass: Math.abs(incomeRow.sum - expectedSum) < 0.01,
      actual: incomeRow.sum,
      expected: expectedSum
    },
    { 
      name: 'Average based on 11 months', 
      pass: Math.abs(incomeRow.avg - expectedAvg) < 0.01,
      actual: incomeRow.avg,
      expected: expectedAvg
    },
    { 
      name: 'Variance from 11 months', 
      pass: Math.abs(incomeRow.variance - expectedVariance) < 0.01,
      actual: incomeRow.variance,
      expected: expectedVariance
    },
    {
      name: 'Current month visible in monthlyValues',
      pass: currentMonthIndex >= 0 && incomeRow.monthlyValues[currentMonthIndex] === 5000,
      actual: currentMonthIndex >= 0 ? incomeRow.monthlyValues[currentMonthIndex] : 'N/A',
      expected: 5000
    }
  ];

  console.log('\n✓ Verification Tests:');
  let allPassed = true;
  tests.forEach((test) => {
    const status = test.pass ? '✓' : '✗';
    console.log(`   ${status} ${test.name}`);
    if (!test.pass) {
      console.log(`      Actual: ${test.actual}, Expected: ${test.expected}`);
      allPassed = false;
    }
  });

  // Test calculateStats directly with exclude indices
  console.log('\n✓ Direct calculateStats test:');
  const testValues = [1000, 1000, 1000, 5000, 1000]; // Index 3 is current month
  const withoutExclusion = calculateStats(testValues);
  const withExclusion = calculateStats(testValues, [3]);
  
  console.log(`   Without exclusion: sum=${withoutExclusion.sum}, avg=${withoutExclusion.avg.toFixed(2)}`);
  console.log(`   With exclusion [3]: sum=${withExclusion.sum}, avg=${withExclusion.avg.toFixed(2)}`);
  console.log(`   ${withExclusion.sum === 4000 && Math.abs(withExclusion.avg - 1000) < 0.01 ? '✓' : '✗'} Exclusion works correctly`);

  console.log('\n' + '='.repeat(80));
  console.log(allPassed ? '✅ PASS: Current month correctly excluded from summary calculations' : '❌ FAIL: Some checks failed');
  console.log('='.repeat(80) + '\n');
}

// Run test
testCurrentMonthExclusion();

