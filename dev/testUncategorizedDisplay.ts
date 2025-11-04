/**
 * Test: Ukategorisert Display in Overview
 * Verifies that uncategorized transactions appear under Utgifter
 */

import { useTransactionStore } from '../src/store';
import {
  getLast12Months,
  calculateMonthlyData,
  buildCategoryRows,
} from '../services/monthlyCalculations';

function testUncategorizedDisplay() {
  console.log('\n🧪 TEST: Ukategorisert Display in Overview\n');
  console.log('='.repeat(80));

  const store = useTransactionStore.getState();
  const transactions = store.transactions;
  const hovedkategorier = Array.from(store.hovedkategorier.values());
  const underkategorier = Array.from(store.underkategorier.values());

  const months = getLast12Months();
  const monthlyData = calculateMonthlyData(transactions, months, hovedkategorier, underkategorier);
  const categoryRows = buildCategoryRows(monthlyData, hovedkategorier, underkategorier);

  // Find Utgifter row
  const utgifterRow = categoryRows.find((r) => r.categoryName === 'Utgifter');

  if (!utgifterRow || !utgifterRow.children) {
    console.log('❌ FAIL: Utgifter row not found or has no children');
    return;
  }

  console.log(`\n✓ Utgifter row found with ${utgifterRow.children.length} children:\n`);

  // List all children
  utgifterRow.children.forEach((child, idx) => {
    const collapsibleIcon = child.isCollapsible ? '▶' : ' ';
    const childrenInfo = child.children ? ` (${child.children.length} underkategorier)` : '';
    console.log(`   ${idx + 1}. ${collapsibleIcon} ${child.categoryName}${childrenInfo}`);
    console.log(`      - Collapsible: ${child.isCollapsible}`);
    console.log(`      - Sum: ${Math.round(child.sum)} kr`);
    console.log(`      - Avg: ${Math.round(child.avg)} kr`);
  });

  // Find Ukategorisert specifically
  const ukategorisertRow = utgifterRow.children.find((c) => c.categoryName === 'Ukategorisert');

  if (!ukategorisertRow) {
    console.log('\n❌ FAIL: Ukategorisert row not found under Utgifter');
    return;
  }

  console.log('\n✓ Ukategorisert row found:');
  console.log(`   - CategoryId: ${ukategorisertRow.categoryId}`);
  console.log(`   - Name: ${ukategorisertRow.categoryName}`);
  console.log(`   - Is Collapsible: ${ukategorisertRow.isCollapsible}`);
  console.log(`   - Is Subcategory: ${ukategorisertRow.isSubcategory}`);
  console.log(`   - Sum: ${Math.round(ukategorisertRow.sum)} kr`);
  console.log(`   - Average: ${Math.round(ukategorisertRow.avg)} kr`);
  console.log(`   - Has Children: ${ukategorisertRow.children ? 'Yes' : 'No'}`);

  // Verify properties
  const tests = [
    { name: 'Is NOT collapsible', pass: !ukategorisertRow.isCollapsible },
    { name: 'Has no children', pass: !ukategorisertRow.children },
    { name: 'CategoryId is __uncategorized', pass: ukategorisertRow.categoryId === '__uncategorized' },
    { name: 'Appears under Utgifter', pass: true }, // Already verified
  ];

  console.log('\n✓ Property Checks:');
  let allPassed = true;
  tests.forEach((test) => {
    const status = test.pass ? '✓' : '✗';
    console.log(`   ${status} ${test.name}`);
    if (!test.pass) allPassed = false;
  });

  console.log('\n' + '='.repeat(80));
  console.log(allPassed ? '✅ PASS: Ukategorisert displays correctly' : '❌ FAIL: Some checks failed');
  console.log('='.repeat(80) + '\n');
}

// Run test
testUncategorizedDisplay();

