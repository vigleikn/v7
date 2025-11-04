/**
 * Test: Monthly Overview Calculations
 * Verifies that the 12-month overview correctly calculates balances, income, expenses
 */

import { useTransactionStore } from '../src/store';
import {
  getLast12Months,
  calculateMonthlyData,
  buildCategoryRows,
  formatMonthLabel,
} from '../services/monthlyCalculations';

function testOversikt() {
  console.log('\n🧪 TEST: Monthly Overview Calculations\n');
  console.log('='.repeat(80));

  const state = useTransactionStore.getState();
  const transactions = state.transactions;
  const hovedkategorier = Array.from(state.hovedkategorier.values());
  const underkategorier = Array.from(state.underkategorier.values());

  console.log(`\n📊 Data Source:`);
  console.log(`   Transaksjoner: ${transactions.length}`);
  console.log(`   Hovedkategorier: ${hovedkategorier.length}`);
  console.log(`   Underkategorier: ${underkategorier.length}`);

  // Test 1: Get last 12 months
  console.log(`\n✓ Test 1: Get last 12 months`);
  const months = getLast12Months();
  console.log(`   Months: ${months.join(', ')}`);
  console.log(`   Labels: ${months.map(formatMonthLabel).join(', ')}`);

  // Test 2: Calculate monthly data
  console.log(`\n✓ Test 2: Calculate monthly data`);
  const monthlyData = calculateMonthlyData(transactions, months, hovedkategorier, underkategorier);
  
  console.log(`\n   Monthly Summary (showing first 3 months):`);
  monthlyData.slice(0, 3).forEach((m) => {
    console.log(`   ${m.monthLabel.toUpperCase()} (${m.month}):`);
    console.log(`      Inntekter: ${Math.round(m.income)} kr`);
    console.log(`      Utgifter: ${Math.round(m.expenses)} kr`);
    console.log(`      Sparing: ${Math.round(m.savings)} kr`);
    console.log(`      Balanse: ${Math.round(m.balance)} kr`);
    console.log(`      Ukategorisert: ${Math.round(m.uncategorized)} kr`);
  });

  // Test 3: Build category rows
  console.log(`\n✓ Test 3: Build category rows`);
  const categoryRows = buildCategoryRows(monthlyData, hovedkategorier, underkategorier);
  
  console.log(`\n   Category Row Structure:`);
  categoryRows.forEach((row) => {
    console.log(`   - ${row.categoryName} (${row.categoryId})`);
    console.log(`     Sum: ${Math.round(row.sum)} kr, Avg: ${Math.round(row.avg)} kr`);
    
    if (row.children && row.children.length > 0) {
      row.children.forEach((child) => {
        const prefix = child.isCollapsible ? '     ▶' : '     •';
        console.log(`${prefix} ${child.categoryName} (Sum: ${Math.round(child.sum)} kr)`);
        
        if (child.children && child.children.length > 0) {
          child.children.forEach((grandchild) => {
            console.log(`       • ${grandchild.categoryName} (Sum: ${Math.round(grandchild.sum)} kr)`);
          });
        }
      });
    }
  });

  // Test 4: Verify calculations
  console.log(`\n✓ Test 4: Verify calculation logic`);
  
  const totalIncome = categoryRows.find((r) => r.categoryName === 'Inntekter');
  const totalExpenses = categoryRows.find((r) => r.categoryName === 'Utgifter');
  const totalBalance = categoryRows.find((r) => r.categoryName === 'Balanse');
  
  if (totalBalance && totalIncome && totalExpenses) {
    const calculatedBalance = totalIncome.sum - totalExpenses.sum;
    const balanceMatch = Math.abs(totalBalance.sum - calculatedBalance) < 1; // Allow for rounding
    
    console.log(`   Inntekter sum: ${Math.round(totalIncome.sum)} kr`);
    console.log(`   Utgifter sum: ${Math.round(totalExpenses.sum)} kr`);
    console.log(`   Balanse (stored): ${Math.round(totalBalance.sum)} kr`);
    console.log(`   Balanse (calculated): ${Math.round(calculatedBalance)} kr`);
    console.log(`   Match: ${balanceMatch ? '✓ PASS' : '✗ FAIL'}`);
    
    if (!balanceMatch) {
      console.log(`   ⚠️  Warning: Balance mismatch detected!`);
      console.log(`   Difference: ${Math.round(totalBalance.sum - calculatedBalance)} kr`);
    }
  }

  // Test 5: Category distribution
  console.log(`\n✓ Test 5: Category distribution`);
  const expenseRow = categoryRows.find((r) => r.categoryName === 'Utgifter');
  if (expenseRow && expenseRow.children) {
    console.log(`\n   Expense categories (${expenseRow.children.length} total):`);
    expenseRow.children
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 5)
      .forEach((cat, idx) => {
        const percentage = expenseRow.sum > 0 ? (cat.sum / expenseRow.sum * 100).toFixed(1) : '0.0';
        console.log(`   ${idx + 1}. ${cat.categoryName}: ${Math.round(cat.sum)} kr (${percentage}%)`);
      });
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All tests completed!\n');
}

// Run test
testOversikt();

