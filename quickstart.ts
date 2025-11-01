/**
 * Quick Start Example - CSV Parser + Category Engine
 * This demonstrates the complete workflow from CSV import to categorization
 */

import { parseCSVFile } from './csvParser';
import {
  createInitialState,
  createCategory,
  setRule,
  applyRules,
  getCategorizationStats,
  listRules,
  groupByTekst,
  RuleEngineState,
} from './categoryEngine';

async function quickStart() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Transaction CSV Parser + Category Engine          ║');
  console.log('║   Quick Start Example                                ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ============================================================================
  // STEP 1: Import transactions from CSV
  // ============================================================================
  
  console.log('📄 STEP 1: Importing transactions from CSV...\n');
  
  const parseResult = await parseCSVFile('./data/23421.csv');
  
  console.log(`   ✓ Successfully parsed CSV file`);
  console.log(`   • Total transactions found: ${parseResult.originalCount}`);
  console.log(`   • Unique transactions: ${parseResult.uniqueCount}`);
  console.log(`   • Duplicates removed: ${parseResult.duplicates.length}`);
  console.log();

  // ============================================================================
  // STEP 2: Initialize the Category Rule Engine
  // ============================================================================
  
  console.log('⚙️  STEP 2: Initializing Category Rule Engine...\n');
  
  let state: RuleEngineState = createInitialState();
  console.log(`   ✓ Rule engine initialized`);
  console.log();

  // ============================================================================
  // STEP 3: Create categories
  // ============================================================================
  
  console.log('📁 STEP 3: Creating categories...\n');
  
  const categoryDefinitions = [
    { name: 'Mat og drikke', isIncome: false },
    { name: 'Transport', isIncome: false },
    { name: 'Helse og velvære', isIncome: false },
    { name: 'Inntekter', isIncome: true },
    { name: 'Bolig', isIncome: false },
    { name: 'Media', isIncome: false },
    { name: 'Ukategorisert', isIncome: false },
  ];

  const categoryMap = new Map<string, string>();

  for (const def of categoryDefinitions) {
    const result = createCategory(state.categories, def);
    state.categories = result.categories;
    categoryMap.set(def.name, result.category.id);
    
    const lock = def.isIncome ? ' 🔒' : '';
    console.log(`   ✓ ${def.name}${lock}`);
  }
  console.log();

  // ============================================================================
  // STEP 4: Create categorization rules
  // ============================================================================
  
  console.log('📋 STEP 4: Creating categorization rules...\n');
  
  const rules = [
    // Food & Drinks
    { pattern: 'KIWI', category: 'Mat og drikke' },
    { pattern: 'Extra', category: 'Mat og drikke' },
    { pattern: 'Bunnpris', category: 'Mat og drikke' },
    { pattern: 'Coop Mega', category: 'Mat og drikke' },
    { pattern: '7171 SLUPPENVEI', category: 'Mat og drikke' },
    { pattern: 'McDonald\'s', category: 'Mat og drikke' },
    
    // Transport
    { pattern: 'Norwegian Air', category: 'Transport' },
    { pattern: 'Widerøe', category: 'Transport' },
    { pattern: 'Vy App / Web', category: 'Transport' },
    { pattern: 'EasyPark', category: 'Transport' },
    { pattern: 'Ryde', category: 'Transport' },
    { pattern: 'Dott', category: 'Transport' },
    
    // Health
    { pattern: 'RINGVE LEGESENTER', category: 'Helse og velvære' },
    
    // Income
    { pattern: 'KREDITRENTER', category: 'Inntekter' },
    
    // Housing
    { pattern: 'TOBB/Klare Finans', category: 'Bolig' },
    
    // Media
    { pattern: 'Netflix', category: 'Media' },
    { pattern: 'Spotify', category: 'Media' },
    { pattern: 'Viaplay', category: 'Media' },
    { pattern: 'Apple', category: 'Media' },
  ];

  for (const rule of rules) {
    const categoryId = categoryMap.get(rule.category);
    if (categoryId) {
      state.rules = setRule(state.rules, rule.pattern, categoryId);
      console.log(`   ✓ "${rule.pattern}" → ${rule.category}`);
    }
  }
  console.log();

  // ============================================================================
  // STEP 5: Apply rules to transactions
  // ============================================================================
  
  console.log('🔄 STEP 5: Applying rules to transactions...\n');
  
  const applyResult = applyRules(parseResult.transactions, state);
  
  console.log(`   ✓ Rules applied successfully`);
  console.log(`   • Total transactions: ${applyResult.stats.total}`);
  console.log(`   • Categorized: ${applyResult.stats.categorized} (${(applyResult.stats.categorized / applyResult.stats.total * 100).toFixed(1)}%)`);
  console.log(`   • Uncategorized: ${applyResult.stats.uncategorized}`);
  console.log(`   • Rules matched: ${applyResult.stats.rulesApplied}`);
  console.log();

  const categorizedTransactions = applyResult.categorized;

  // ============================================================================
  // STEP 6: Show sample categorized transactions
  // ============================================================================
  
  console.log('📊 STEP 6: Sample categorized transactions...\n');
  
  const samples = categorizedTransactions
    .filter(t => t.categoryId)
    .slice(0, 10);

  samples.forEach((tx, i) => {
    const category = state.categories.get(tx.categoryId!);
    const amount = tx.beløp.toFixed(2).padStart(10);
    console.log(`   ${(i + 1).toString().padStart(2)}. ${tx.dato} | ${amount} NOK | ${category?.name?.padEnd(20)} | ${tx.tekst}`);
  });
  console.log();

  // ============================================================================
  // STEP 7: Analyze categorization coverage
  // ============================================================================
  
  console.log('🔍 STEP 7: Categorization coverage analysis...\n');
  
  const stats = getCategorizationStats(categorizedTransactions);
  
  console.log(`   📈 Overall Statistics:`);
  console.log(`   • Total transactions: ${stats.total}`);
  console.log(`   • Categorized: ${stats.categorized} (${(stats.categorized / stats.total * 100).toFixed(1)}%)`);
  console.log(`   • Uncategorized: ${stats.uncategorized}`);
  console.log(`   • Unique text patterns: ${stats.uniqueTekstPatterns}`);
  console.log(`   • Patterns with rules: ${stats.patternsWithRules}`);
  console.log();

  // ============================================================================
  // STEP 8: Show category breakdown
  // ============================================================================
  
  console.log('💰 STEP 8: Financial breakdown by category...\n');
  
  const breakdown = new Map<string, { count: number; income: number; expenses: number }>();

  for (const tx of categorizedTransactions) {
    if (!tx.categoryId) continue;
    
    const category = state.categories.get(tx.categoryId);
    if (!category) continue;
    
    const current = breakdown.get(category.name) || { count: 0, income: 0, expenses: 0 };
    current.count++;
    
    if (tx.beløp > 0) {
      current.income += tx.beløp;
    } else {
      current.expenses += Math.abs(tx.beløp);
    }
    
    breakdown.set(category.name, current);
  }

  const sortedBreakdown = Array.from(breakdown.entries())
    .sort((a, b) => (b[1].income + b[1].expenses) - (a[1].income + a[1].expenses));

  sortedBreakdown.forEach(([category, data]) => {
    console.log(`   ${category}:`);
    console.log(`   • Transactions: ${data.count}`);
    if (data.income > 0) {
      console.log(`   • Income: ${data.income.toFixed(2).padStart(12)} NOK`);
    }
    if (data.expenses > 0) {
      console.log(`   • Expenses: ${data.expenses.toFixed(2).padStart(12)} NOK`);
    }
    console.log();
  });

  // ============================================================================
  // STEP 9: Show top uncategorized patterns
  // ============================================================================
  
  console.log('❓ STEP 9: Top uncategorized transaction patterns...\n');
  
  const uncategorized = categorizedTransactions.filter(t => !t.categoryId);
  const uncategorizedGroups = groupByTekst(uncategorized);
  
  const topUncategorized = Array.from(uncategorizedGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  if (topUncategorized.length > 0) {
    console.log(`   Found ${uncategorizedGroups.size} uncategorized patterns. Top 10:\n`);
    topUncategorized.forEach(([pattern, txns], i) => {
      const totalAmount = txns.reduce((sum, t) => sum + Math.abs(t.beløp), 0);
      console.log(`   ${(i + 1).toString().padStart(2)}. "${pattern}"`);
      console.log(`       • Occurrences: ${txns.length}`);
      console.log(`       • Total amount: ${totalAmount.toFixed(2)} NOK`);
      console.log(`       • Sample: ${txns[0].dato} - ${txns[0].beløp.toFixed(2)} NOK`);
      console.log();
    });
    
    console.log(`   💡 Tip: Create rules for these patterns to improve categorization!`);
  } else {
    console.log(`   ✨ All transactions are categorized!`);
  }
  console.log();

  // ============================================================================
  // STEP 10: Summary
  // ============================================================================
  
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Summary                                            ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  const totalIncome = categorizedTransactions
    .filter(t => t.beløp > 0)
    .reduce((sum, t) => sum + t.beløp, 0);
  
  const totalExpenses = categorizedTransactions
    .filter(t => t.beløp < 0)
    .reduce((sum, t) => sum + Math.abs(t.beløp), 0);
  
  const net = totalIncome - totalExpenses;

  console.log(`   📊 Transactions: ${parseResult.uniqueCount} imported, ${stats.categorized} categorized`);
  console.log(`   📋 Rules: ${listRules(state.rules).length} active rules`);
  console.log(`   📁 Categories: ${state.categories.size} categories`);
  console.log();
  console.log(`   💵 Financial Summary:`);
  console.log(`   • Total Income:    ${totalIncome.toFixed(2).padStart(12)} NOK`);
  console.log(`   • Total Expenses:  ${totalExpenses.toFixed(2).padStart(12)} NOK`);
  console.log(`   • Net:             ${net.toFixed(2).padStart(12)} NOK`);
  console.log();
  console.log(`   ✅ Quick start complete!\n`);
  
  // ============================================================================
  // Next Steps
  // ============================================================================
  
  console.log('📚 Next Steps:\n');
  console.log('   1. Review uncategorized patterns and create rules');
  console.log('   2. Lock exceptions using lockTransaction()');
  console.log('   3. Save state with: saveStateToFile(state, "./state.json")');
  console.log('   4. Export categorized transactions to CSV');
  console.log();
  console.log('   For more details, see:');
  console.log('   • README.md - CSV Parser documentation');
  console.log('   • CATEGORY_ENGINE.md - Category Engine documentation');
  console.log('   • INTEGRATION_GUIDE.md - Complete integration guide');
  console.log();
}

// Run the quick start
quickStart().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

