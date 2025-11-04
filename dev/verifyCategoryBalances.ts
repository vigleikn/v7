/**
 * Test: Category Balance Consistency Check
 * Verifies that each category shows correct NET balance (sum of all transactions including refunds)
 */

import { useTransactionStore } from '../src/store';
import { CategorizedTransaction } from '../src/store/state';
import {
  getLast12Months,
  calculateMonthlyData,
  buildCategoryRows,
} from '../services/monthlyCalculations';

function setupTestDataWithRefunds() {
  const store = useTransactionStore.getState();

  // Clear data
  store.hovedkategorier.clear();
  store.underkategorier.clear();

  // Setup categories
  store.hovedkategorier.set('cat_inntekter_default', {
    id: 'cat_inntekter_default',
    name: 'Inntekter',
    type: 'hovedkategori',
    isIncome: true,
    underkategorier: [],
    sortOrder: 0,
    allowSubcategories: true,
  });

  store.hovedkategorier.set('mat', {
    id: 'mat',
    name: 'Mat',
    type: 'hovedkategori',
    isIncome: false,
    underkategorier: ['dagligvarer'],
    sortOrder: 1,
  });

  store.underkategorier.set('dagligvarer', {
    id: 'dagligvarer',
    name: 'Dagligvarer',
    type: 'underkategori',
    hovedkategoriId: 'mat',
    sortOrder: 0,
  });

  // Create transactions with refunds
  const testTransactions: CategorizedTransaction[] = [
    // October 2025 - Regular expense
    {
      id: 'tx-1',
      transactionId: 'hash-1',
      dato: '05.10.25',
      beløp: -1000,
      type: 'Betaling',
      tekst: 'Rema 1000',
      underkategori: 'Dagligvarer',
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Konto',
      fraKontonummer: '1234',
      categoryId: 'dagligvarer',
      isLocked: false,
    },
    // October 2025 - Another expense
    {
      id: 'tx-2',
      transactionId: 'hash-2',
      dato: '10.10.25',
      beløp: -500,
      type: 'Betaling',
      tekst: 'Kiwi',
      underkategori: 'Dagligvarer',
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Konto',
      fraKontonummer: '1234',
      categoryId: 'dagligvarer',
      isLocked: false,
    },
    // October 2025 - REFUND (positive value)
    {
      id: 'tx-3',
      transactionId: 'hash-3',
      dato: '15.10.25',
      beløp: 200, // POSITIVE (refund)
      type: 'Betaling',
      tekst: 'Rema 1000 refusjon',
      underkategori: 'Dagligvarer',
      tilKonto: 'Konto',
      tilKontonummer: '1234',
      fraKonto: '',
      fraKontonummer: '',
      categoryId: 'dagligvarer',
      isLocked: false,
    },
  ];

  return testTransactions;
}

function verifyCategoryBalances() {
  console.log('\n🧪 TEST: Category Balance Consistency Check\n');
  console.log('='.repeat(80));

  const testTransactions = setupTestDataWithRefunds();
  const store = useTransactionStore.getState();
  const hovedkategorier = Array.from(store.hovedkategorier.values());
  const underkategorier = Array.from(store.underkategorier.values());

  console.log('\n✓ Test scenario: Dagligvarer in October 2025');
  console.log('   Transactions:');
  console.log('   - Rema 1000: -1000 kr');
  console.log('   - Kiwi: -500 kr');
  console.log('   - Rema 1000 refusjon: +200 kr (REFUND)');
  console.log('   Expected NET: -1000 + (-500) + 200 = -1300 kr');
  console.log('   Should display as: 1300 kr (absolute value for expenses)\n');

  // Calculate monthly data
  const months = getLast12Months();
  const monthlyData = calculateMonthlyData(testTransactions, months, hovedkategorier, underkategorier);

  // Find October 2025
  const octIndex = months.findIndex((m) => m === '2025-10');
  const octData = monthlyData[octIndex];

  console.log('✓ Actual calculation from calculateMonthlyData:');
  console.log(`   Month: ${octData.month}`);
  console.log(`   byCategory['dagligvarer']: ${octData.byCategory['dagligvarer'] || 0} kr`);

  // Manual calculation (what it SHOULD be)
  const manualSum = testTransactions
    .filter((tx) => {
      let txMonth: string;
      if (tx.dato.includes('.')) {
        const [day, month, year] = tx.dato.split('.');
        const fullYear = year.length === 2 ? `20${year}` : year;
        txMonth = `${fullYear}-${month.padStart(2, '0')}`;
      } else {
        txMonth = tx.dato.substring(0, 7);
      }
      return txMonth === '2025-10' && tx.categoryId === 'dagligvarer';
    })
    .reduce((sum, tx) => sum + tx.beløp, 0);

  console.log(`   Manual calculation (sum of all tx.beløp): ${manualSum} kr`);
  console.log(`   Expected NET display: ${Math.abs(manualSum)} kr`);

  // Build category rows
  const categoryRows = buildCategoryRows(monthlyData, hovedkategorier, underkategorier);
  const utgifterRow = categoryRows.find((r) => r.categoryName === 'Utgifter');
  const matRow = utgifterRow?.children?.find((c) => c.categoryName === 'Mat');
  const dagligvarerRow = matRow?.children?.find((c) => c.categoryName === 'Dagligvarer');

  if (dagligvarerRow) {
    const displayedValue = dagligvarerRow.monthlyValues[octIndex];
    console.log(`   Displayed in table: ${displayedValue} kr`);
    
    const expectedNET = Math.abs(manualSum); // Should be 1300
    const actualNET = displayedValue;
    const diff = Math.abs(expectedNET - actualNET);
    
    console.log('\n✓ Verification:');
    console.log(`   Expected NET: ${expectedNET} kr`);
    console.log(`   Actual displayed: ${actualNET} kr`);
    console.log(`   Difference: ${diff} kr`);
    
    const passed = diff < 0.01;
    console.log(`   ${passed ? '✓' : '✗'} Balance matches (diff < 0.01)`);
    
    if (!passed) {
      console.log('\n⚠️  ISSUE DETECTED:');
      console.log('   The current implementation uses Math.abs() which prevents refunds from reducing expenses.');
      console.log('   Refunds (positive values) should REDUCE the net expense shown.');
      console.log(`   Current logic: expenses += Math.abs(tx.beløp) → adds ${Math.abs(200)} instead of subtracting`);
      console.log(`   Correct logic: expenses -= tx.beløp (for negative tx) → net is sum of all`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(passed ? '✅ PASS: Category balances are correct' : '❌ FAIL: Refunds not handled correctly');
    console.log('='.repeat(80) + '\n');
    
    return passed;
  } else {
    console.log('\n❌ FAIL: Could not find Dagligvarer row in category structure');
    return false;
  }
}

// Additional test: Check multiple categories
function verifyAllCategoryBalances() {
  console.log('\n🔍 COMPREHENSIVE CHECK: All Category Balances\n');
  console.log('='.repeat(80));

  const store = useTransactionStore.getState();
  const transactions = store.transactions;
  const hovedkategorier = Array.from(store.hovedkategorier.values());
  const underkategorier = Array.from(store.underkategorier.values());

  if (transactions.length === 0) {
    console.log('\n⚠️  No transactions in store - skipping comprehensive check');
    console.log('   (This test requires real transaction data)');
    return true;
  }

  const months = getLast12Months();
  const monthlyData = calculateMonthlyData(transactions, months, hovedkategorier, underkategorier);
  const categoryRows = buildCategoryRows(monthlyData, hovedkategorier, underkategorier);

  console.log(`\n✓ Checking ${transactions.length} transactions across ${months.length} months`);
  console.log(`✓ Validating ${categoryRows.length} main category rows\n`);

  let issuesFound = 0;
  let checksPerformed = 0;

  // Helper to recursively check all rows
  const checkRow = (row: any, level: number = 0) => {
    const indent = '  '.repeat(level);
    
    // Skip aggregate rows (balance, main categories with children)
    if (row.categoryId === '__balance' || row.categoryId === '__expenses') {
      return;
    }

    // Only check leaf categories (those that can have direct transactions)
    const isLeafCategory = !row.isCollapsible;
    
    if (isLeafCategory && row.categoryId !== '__uncategorized') {
      months.forEach((month, monthIdx) => {
        // Calculate expected sum from actual transactions
        const expectedSum = transactions
          .filter((tx) => {
            // Parse transaction date
            let txMonth: string;
            if (tx.dato.includes('.')) {
              const [day, monthNum, year] = tx.dato.split('.');
              const fullYear = year.length === 2 ? `20${year}` : year;
              txMonth = `${fullYear}-${monthNum.padStart(2, '0')}`;
            } else {
              txMonth = tx.dato.substring(0, 7);
            }
            return txMonth === month && tx.categoryId === row.categoryId;
          })
          .reduce((sum, tx) => sum + tx.beløp, 0);

        const displayedValue = row.monthlyValues[monthIdx];
        
        // For expenses and savings, we show absolute value
        // But the calculation should be NET (including refunds)
        const expectedDisplay = Math.abs(expectedSum);
        const diff = Math.abs(expectedDisplay - displayedValue);

        checksPerformed++;

        if (diff > 0.01 && displayedValue !== 0) {
          issuesFound++;
          console.log(`${indent}⚠️  ${row.categoryName} - ${monthlyData[monthIdx].monthLabel}:`);
          console.log(`${indent}   Expected: ${expectedDisplay.toFixed(2)} kr (from ${expectedSum.toFixed(2)} kr NET)`);
          console.log(`${indent}   Displayed: ${displayedValue} kr`);
          console.log(`${indent}   Diff: ${diff.toFixed(2)} kr`);
        }
      });
    }

    // Recursively check children
    if (row.children) {
      row.children.forEach((child: any) => checkRow(child, level + 1));
    }
  };

  categoryRows.forEach((row) => checkRow(row));

  console.log(`\n✓ Performed ${checksPerformed} balance checks`);
  console.log(`   Issues found: ${issuesFound}`);

  console.log('\n' + '='.repeat(80));
  if (issuesFound === 0) {
    console.log('✅ PASS: All category balances are consistent');
  } else {
    console.log(`❌ FAIL: Found ${issuesFound} inconsistencies`);
    console.log('\nRecommendation: Update calculateMonthlyData to use NET sum (not Math.abs)');
  }
  console.log('='.repeat(80) + '\n');

  return issuesFound === 0;
}

// Run tests
console.log('\n' + '═'.repeat(80));
console.log('🔬 CATEGORY BALANCE VERIFICATION SUITE');
console.log('═'.repeat(80));

const test1 = verifyCategoryBalances();
const test2 = verifyAllCategoryBalances();

console.log('═'.repeat(80));
console.log(`\n📊 FINAL RESULT: ${test1 && test2 ? '✅ ALL CHECKS PASSED' : '❌ ISSUES DETECTED'}\n`);
console.log('═'.repeat(80) + '\n');

