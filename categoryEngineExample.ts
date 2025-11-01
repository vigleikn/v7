/**
 * Example usage of the Category Rule Engine
 * Demonstrates categorization, rules, and locking
 */

import { parseCSVFile } from './csvParser';
import {
  createInitialState,
  createCategory,
  setRule,
  applyRules,
  lockTransaction,
  unlockTransaction,
  categorizeTransaction,
  getCategorizationStats,
  groupByTekst,
  listCategories,
  listRules,
  listLocks,
  generateTransactionId,
  CategorizedTransaction,
  RuleEngineState,
} from './categoryEngine';

async function main() {
  console.log('=== Category Rule Engine Demo ===\n');

  // Step 1: Parse transactions from CSV
  console.log('📄 Step 1: Loading transactions from CSV...');
  const parseResult = await parseCSVFile('./data/23421.csv');
  console.log(`   Loaded ${parseResult.uniqueCount} unique transactions\n`);

  // Step 2: Initialize the rule engine state
  console.log('⚙️  Step 2: Initializing rule engine...');
  let state: RuleEngineState = createInitialState();

  // Step 3: Create some categories
  console.log('📁 Step 3: Creating categories...');
  
  const categoryDefinitions = [
    { name: 'Mat og drikke', isIncome: false },
    { name: 'Transport', isIncome: false },
    { name: 'Helse', isIncome: false },
    { name: 'Inntekter', isIncome: true }, // Locked category
    { name: 'Bolig', isIncome: false },
    { name: 'Ukategorisert', isIncome: false },
  ];

  const categoryMap = new Map<string, string>(); // name -> id

  for (const def of categoryDefinitions) {
    const result = createCategory(state.categories, def);
    state.categories = result.categories;
    categoryMap.set(def.name, result.category.id);
    console.log(`   ✓ Created: ${def.name} (${result.category.id})${def.isIncome ? ' [LOCKED]' : ''}`);
  }
  console.log();

  // Step 4: Create some rules
  console.log('📋 Step 4: Creating category rules...');
  
  const rules = [
    { tekst: 'KIWI', category: 'Mat og drikke' },
    { tekst: 'Extra', category: 'Mat og drikke' },
    { tekst: 'Bunnpris', category: 'Mat og drikke' },
    { tekst: 'Coop Mega', category: 'Mat og drikke' },
    { tekst: '7171 SLUPPENVEI', category: 'Mat og drikke' },
    { tekst: 'Norwegian Air', category: 'Transport' },
    { tekst: 'Widerøe', category: 'Transport' },
    { tekst: 'Vy App / Web', category: 'Transport' },
    { tekst: 'RINGVE LEGESENTER', category: 'Helse' },
    { tekst: 'KREDITRENTER', category: 'Inntekter' },
  ];

  for (const rule of rules) {
    const categoryId = categoryMap.get(rule.category);
    if (categoryId) {
      state.rules = setRule(state.rules, rule.tekst, categoryId);
      console.log(`   ✓ Rule: "${rule.tekst}" → ${rule.category}`);
    }
  }
  console.log();

  // Step 5: Apply rules to transactions
  console.log('🔄 Step 5: Applying rules to transactions...');
  const applyResult = applyRules(parseResult.transactions, state);
  console.log(`   Total transactions: ${applyResult.stats.total}`);
  console.log(`   Categorized: ${applyResult.stats.categorized}`);
  console.log(`   Uncategorized: ${applyResult.stats.uncategorized}`);
  console.log(`   Rules applied: ${applyResult.stats.rulesApplied}`);
  console.log(`   Locked: ${applyResult.stats.locked}\n`);

  let transactions = applyResult.categorized;

  // Step 6: Show some categorized transactions
  console.log('📊 Step 6: Sample categorized transactions...');
  const categorizedSample = transactions.filter(t => t.categoryId).slice(0, 5);
  categorizedSample.forEach((t, i) => {
    const category = state.categories.get(t.categoryId!);
    console.log(`   ${i + 1}. ${t.dato} - ${t.tekst}`);
    console.log(`      Amount: ${t.beløp.toFixed(2)} NOK`);
    console.log(`      Category: ${category?.name || 'Unknown'}`);
    console.log(`      Locked: ${t.isLocked ? 'Yes' : 'No'}`);
  });
  console.log();

  // Step 7: Group transactions by tekst to see patterns
  console.log('🔍 Step 7: Analyzing transaction patterns...');
  const grouped = groupByTekst(transactions);
  const topPatterns = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  console.log('   Top 10 most frequent transaction texts:');
  topPatterns.forEach(([tekst, txns], i) => {
    const categorized = txns.filter(t => t.categoryId).length;
    const category = txns[0].categoryId 
      ? state.categories.get(txns[0].categoryId)?.name 
      : 'Uncategorized';
    console.log(`   ${i + 1}. "${tekst}" (${txns.length} transactions)`);
    console.log(`      Category: ${category} | Categorized: ${categorized}/${txns.length}`);
  });
  console.log();

  // Step 8: Lock a specific transaction as an exception
  console.log('🔒 Step 8: Creating exceptions (locking transactions)...');
  
  // Find a KIWI transaction and lock it to a different category
  const kiwiTransactions = transactions.filter(t => 
    t.tekst.toLowerCase().includes('kiwi') && t.categoryId
  );
  
  if (kiwiTransactions.length > 0) {
    const txToLock = kiwiTransactions[0];
    const boligCategoryId = categoryMap.get('Bolig')!;
    
    console.log(`   Locking transaction: ${txToLock.dato} - ${txToLock.tekst}`);
    console.log(`   Original category: Mat og drikke`);
    console.log(`   Locked to: Bolig (as exception)\n`);
    
    state.locks = lockTransaction(
      state.locks,
      txToLock.transactionId,
      boligCategoryId,
      'This specific KIWI purchase was for home supplies, not food'
    );

    // Re-apply rules to see the lock in action
    const reapplyResult = applyRules(parseResult.transactions, state);
    transactions = reapplyResult.categorized;
    
    console.log(`   After locking:`);
    console.log(`   Locked transactions: ${reapplyResult.stats.locked}`);
    
    const lockedTx = transactions.find(t => t.transactionId === txToLock.transactionId);
    if (lockedTx) {
      const lockedCategory = state.categories.get(lockedTx.categoryId!);
      console.log(`   Locked transaction now shows: ${lockedCategory?.name}`);
      console.log(`   Is locked: ${lockedTx.isLocked}\n`);
    }
  }

  // Step 9: Categorize a new transaction and auto-create rule
  console.log('✨ Step 9: Categorizing uncategorized transaction...');
  
  const uncategorized = transactions.filter(t => !t.categoryId);
  if (uncategorized.length > 0) {
    const txToCategorize = uncategorized[0];
    const transportCategoryId = categoryMap.get('Transport')!;
    
    console.log(`   Transaction: ${txToCategorize.tekst}`);
    console.log(`   Assigning to: Transport`);
    
    try {
      const result = categorizeTransaction(
        transactions,
        txToCategorize.transactionId,
        transportCategoryId,
        state,
        true // Create rule
      );
      
      state = result.state;
      
      console.log(`   ✓ Rule created for: "${txToCategorize.tekst}"`);
      console.log(`   This will affect ${result.affectedTransactions.length} transaction(s)\n`);
      
      // Re-apply rules with the new rule
      const finalResult = applyRules(parseResult.transactions, state);
      transactions = finalResult.categorized;
    } catch (error) {
      console.log(`   ✗ Error: ${error}\n`);
    }
  }

  // Step 10: Show final statistics
  console.log('📈 Step 10: Final categorization statistics...');
  const finalStats = getCategorizationStats(transactions);
  console.log(`   Total transactions: ${finalStats.total}`);
  console.log(`   Categorized: ${finalStats.categorized} (${(finalStats.categorized / finalStats.total * 100).toFixed(1)}%)`);
  console.log(`   Uncategorized: ${finalStats.uncategorized} (${(finalStats.uncategorized / finalStats.total * 100).toFixed(1)}%)`);
  console.log(`   Locked (exceptions): ${finalStats.locked}`);
  console.log(`   Unique text patterns: ${finalStats.uniqueTekstPatterns}`);
  console.log(`   Patterns with rules: ${finalStats.patternsWithRules}\n`);

  // Step 11: Show all rules
  console.log('📜 Step 11: All active rules...');
  const allRules = listRules(state.rules);
  allRules.forEach((rule, i) => {
    const category = state.categories.get(rule.categoryId);
    console.log(`   ${i + 1}. "${rule.tekst}" → ${category?.name || 'Unknown'}`);
  });
  console.log();

  // Step 12: Show all locks/exceptions
  console.log('🔐 Step 12: All locked transactions (exceptions)...');
  const allLocks = listLocks(state.locks);
  if (allLocks.length > 0) {
    allLocks.forEach((lock, i) => {
      const tx = transactions.find(t => t.transactionId === lock.transactionId);
      const category = state.categories.get(lock.categoryId);
      console.log(`   ${i + 1}. Transaction: ${tx?.tekst || 'Unknown'}`);
      console.log(`      Locked to: ${category?.name || 'Unknown'}`);
      if (lock.reason) {
        console.log(`      Reason: ${lock.reason}`);
      }
    });
  } else {
    console.log('   No locked transactions');
  }
  console.log();

  // Step 13: Demonstrate persistence (how to save/load state)
  console.log('💾 Step 13: State persistence example...');
  const stateForPersistence = {
    rules: Array.from(state.rules.entries()),
    locks: Array.from(state.locks.entries()),
    categories: Array.from(state.categories.entries()),
  };
  console.log('   State can be serialized to JSON for persistence:');
  console.log(`   - ${stateForPersistence.rules.length} rules`);
  console.log(`   - ${stateForPersistence.locks.length} locks`);
  console.log(`   - ${stateForPersistence.categories.length} categories`);
  console.log('\n   Example JSON structure:');
  console.log(JSON.stringify({
    rules: stateForPersistence.rules.slice(0, 2),
    locks: stateForPersistence.locks.slice(0, 1),
    categories: stateForPersistence.categories.slice(0, 2),
  }, null, 2));
  console.log();

  console.log('✅ Demo complete!\n');
}

// Run the example
main().catch(console.error);

