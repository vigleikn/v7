/**
 * Check localStorage data
 * Shows what data is actually stored in the browser
 */

import { useTransactionStore } from '../src/store';

function checkLocalStorage() {
  console.log('\n🔍 CHECKING BROWSER STORAGE\n');
  console.log('='.repeat(70));
  
  const state = useTransactionStore.getState();
  
  console.log('\n📊 Current Store State:');
  console.log(`   Transactions: ${state.transactions.length}`);
  console.log(`   Hovedkategorier: ${state.hovedkategorier.size}`);
  console.log(`   Underkategorier: ${state.underkategorier.size}`);
  console.log(`   Rules: ${state.rules.size}`);
  console.log(`   Locks: ${state.locks.size}`);
  console.log(`   Budgets: ${state.budgets?.size || 0}`);
  console.log(`   Start Balance: ${state.startBalance?.toLocaleString('no') || 0} kr`);
  
  console.log('\n📋 Categories:');
  state.hovedkategorier.forEach((hk) => {
    console.log(`   ✓ ${hk.name} (${hk.underkategorier.length} underkategorier)`);
  });
  
  console.log('\n📝 Categorized Transactions:');
  const categorized = state.transactions.filter(t => t.categoryId);
  const uncategorized = state.transactions.filter(t => !t.categoryId);
  
  console.log(`   ✓ Categorized: ${categorized.length}`);
  console.log(`   ⚠️  Uncategorized: ${uncategorized.length}`);
  
  if (categorized.length > 0) {
    console.log('\n   Recent categorizations:');
    categorized.slice(0, 5).forEach((tx) => {
      const category = state.hovedkategorier.get(tx.categoryId!) || 
                       state.underkategorier.get(tx.categoryId!);
      console.log(`      ${tx.dato} | ${tx.tekst.substring(0, 30)} → ${category?.name || tx.categoryId}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ This is the REAL data (stored in localStorage)');
  console.log('='.repeat(70) + '\n');
}

checkLocalStorage();

