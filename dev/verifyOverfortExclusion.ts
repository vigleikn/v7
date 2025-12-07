import { initializeStore } from '../services/storeIntegration';
import { useTransactionStore } from '../src/store';
import type { BudgetCategoryRow } from '../services/budgetCalculations';
import {
  buildBudgetCategoryTree,
  computeMonthlySpending,
  transactionToYearMonth,
} from '../services/budgetCalculations';
import { calculateMonthlyData, getLast12Months } from '../services/monthlyCalculations';

async function main() {
  await initializeStore();

  const state = useTransactionStore.getState();
  const transactions = state.transactions;

  const overfortTransactions = transactions.filter((tx) => tx.categoryId === 'overfort');
  console.log(`🔍 Overført transactions found: ${overfortTransactions.length}`);

  if (overfortTransactions.length === 0) {
    console.log('ℹ️ No transactions explicitly categorized as Overført. Nothing to verify.');
    return;
  }

  const monthsWithTransfers = Array.from(
    new Set(overfortTransactions.map((tx) => transactionToYearMonth(tx.dato)))
  );

  console.log('📆 Months containing Overført transactions:', monthsWithTransfers.join(', '));

  const hovedkategorier = Array.from(state.hovedkategorier.values());
  const underkategorier = Array.from(state.underkategorier.values());

  const editableCategoryIds = new Set<string>();
  const categoryTree = buildBudgetCategoryTree(hovedkategorier, underkategorier);
  const collectEditable = (row: BudgetCategoryRow) => {
    if (row.isEditable) {
      editableCategoryIds.add(row.categoryId);
    }
    row.children?.forEach(collectEditable);
  };
  categoryTree.forEach(collectEditable);

  // Always include uncategorized bucket for regression checks
  editableCategoryIds.add('__uncategorized');
  // Explicitly include overfort so any regression shows up in the map
  editableCategoryIds.add('overfort');

  const monthlySpending = computeMonthlySpending(
    transactions,
    monthsWithTransfers,
    editableCategoryIds
  );

  monthsWithTransfers.forEach((month) => {
    const overfortKey = `overfort|${month}`;
    const uncategorizedKey = `__uncategorized|${month}`;
    console.log(
      `  • ${month}: overfort=${monthlySpending.get(overfortKey) ?? 0}, ` +
        `ukategorisert=${monthlySpending.get(uncategorizedKey) ?? 0}`
    );
  });

  const monthlyData = calculateMonthlyData(transactions, getLast12Months(), hovedkategorier, underkategorier);
  monthsWithTransfers.forEach((month) => {
    const dataForMonth = monthlyData.find((m) => m.month === month);
    if (dataForMonth) {
      const totalOverfort = overfortTransactions
        .filter((tx) => transactionToYearMonth(tx.dato) === month)
        .reduce((sum, tx) => sum + tx.beløp, 0);
      console.log(
        `    Oversikt snapshot ${month}: income=${dataForMonth.income}, expenses=${dataForMonth.expenses}, ` +
          `uncategorized=${dataForMonth.uncategorized}, overførtSum=${totalOverfort}`
      );
    }
  });

  console.log('✅ Verification completed.');
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exitCode = 1;
});


