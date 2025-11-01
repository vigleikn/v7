# Integration Guide: CSV Parser + Category Engine

Complete guide for using the CSV Parser and Category Rule Engine together to import, categorize, and manage bank transactions.

## Complete Workflow

### 1. Import Transactions

```typescript
import { parseCSVFile } from './csvParser';

const parseResult = await parseCSVFile('./data/23421.csv');

console.log(`Imported: ${parseResult.uniqueCount} unique transactions`);
console.log(`Removed: ${parseResult.duplicates.length} duplicates`);
```

### 2. Initialize Category Engine

```typescript
import {
  createInitialState,
  createCategory,
  setRule,
} from './categoryEngine';
import {
  saveStateToFile,
  loadStateFromFile,
  stateFileExists,
} from './categoryEnginePersistence';

// Try to load existing state, or create new
let state;
if (await stateFileExists('./state.json')) {
  state = await loadStateFromFile('./state.json');
  console.log('Loaded existing state');
} else {
  state = createInitialState();
  console.log('Created new state');
}
```

### 3. Set Up Categories

```typescript
// Create categories if they don't exist
const categoryNames = [
  { name: 'Mat og drikke', isIncome: false },
  { name: 'Transport', isIncome: false },
  { name: 'Helse og velvære', isIncome: false },
  { name: 'Inntekter', isIncome: true },
  { name: 'Bolig', isIncome: false },
  { name: 'Media og underholdning', isIncome: false },
];

const categoryMap = new Map<string, string>();

for (const def of categoryNames) {
  const result = createCategory(state.categories, def);
  state.categories = result.categories;
  categoryMap.set(def.name, result.category.id);
}
```

### 4. Create Initial Rules

```typescript
// Create rules based on common patterns in your transactions
const initialRules = [
  { pattern: 'KIWI', category: 'Mat og drikke' },
  { pattern: 'Extra', category: 'Mat og drikke' },
  { pattern: 'Bunnpris', category: 'Mat og drikke' },
  { pattern: 'Norwegian Air', category: 'Transport' },
  { pattern: 'Widerøe', category: 'Transport' },
  { pattern: 'Vy App', category: 'Transport' },
  { pattern: 'RINGVE LEGESENTER', category: 'Helse og velvære' },
  { pattern: 'KREDITRENTER', category: 'Inntekter' },
  { pattern: 'Netflix', category: 'Media og underholdning' },
  { pattern: 'Spotify', category: 'Media og underholdning' },
];

for (const rule of initialRules) {
  const categoryId = categoryMap.get(rule.category);
  if (categoryId) {
    state.rules = setRule(state.rules, rule.pattern, categoryId);
  }
}

// Save state
await saveStateToFile(state, './state.json');
```

### 5. Apply Rules and Categorize

```typescript
import { applyRules } from './categoryEngine';

const result = applyRules(parseResult.transactions, state);

console.log(`\nCategorization Results:`);
console.log(`Total: ${result.stats.total}`);
console.log(`Categorized: ${result.stats.categorized} (${(result.stats.categorized / result.stats.total * 100).toFixed(1)}%)`);
console.log(`Uncategorized: ${result.stats.uncategorized}`);
console.log(`Locked: ${result.stats.locked}`);

const categorizedTransactions = result.categorized;
```

### 6. Review and Create Additional Rules

```typescript
import { groupByTekst, categorizeTransaction } from './categoryEngine';

// Find uncategorized patterns
const grouped = groupByTekst(categorizedTransactions);
const uncategorizedPatterns = Array.from(grouped.entries())
  .filter(([_, txns]) => !txns[0].categoryId)
  .sort((a, b) => b[1].length - a[1].length);

console.log('\nTop uncategorized patterns:');
uncategorizedPatterns.slice(0, 10).forEach(([pattern, txns]) => {
  console.log(`"${pattern}": ${txns.length} transactions`);
});

// Manually categorize a pattern
const patternToCategorize = uncategorizedPatterns[0];
if (patternToCategorize) {
  const [pattern, txns] = patternToCategorize;
  const transaction = txns[0];
  
  // Assign to a category and create rule
  const categoryId = categoryMap.get('Transport'); // Choose appropriate category
  
  const categorizeResult = categorizeTransaction(
    categorizedTransactions,
    transaction.transactionId,
    categoryId!,
    state,
    true // Create rule for this pattern
  );
  
  state = categorizeResult.state;
  console.log(`\nCreated rule for "${pattern}"`);
  console.log(`Will affect ${categorizeResult.affectedTransactions.length} transactions`);
  
  // Re-apply rules
  const updatedResult = applyRules(parseResult.transactions, state);
  categorizedTransactions = updatedResult.categorized;
  
  // Save updated state
  await saveStateToFile(state, './state.json');
}
```

### 7. Handle Exceptions with Locks

```typescript
import { lockTransaction } from './categoryEngine';

// Find a transaction that needs special handling
const specialCase = categorizedTransactions.find(
  tx => tx.tekst === 'KIWI' && tx.beløp < -500 // Large KIWI purchase
);

if (specialCase) {
  // Lock this specific transaction to a different category
  const householdCategoryId = categoryMap.get('Bolig')!;
  
  state.locks = lockTransaction(
    state.locks,
    specialCase.transactionId,
    householdCategoryId,
    'Large KIWI purchase for household items, not groceries'
  );
  
  console.log(`\nLocked transaction: ${specialCase.dato} - ${specialCase.tekst}`);
  console.log(`Amount: ${specialCase.beløp}`);
  
  // Re-apply to see the lock in effect
  const lockedResult = applyRules(parseResult.transactions, state);
  const lockedTx = lockedResult.categorized.find(
    t => t.transactionId === specialCase.transactionId
  );
  
  console.log(`New category: ${state.categories.get(lockedTx!.categoryId!)?.name}`);
  console.log(`Is locked: ${lockedTx!.isLocked}`);
  
  await saveStateToFile(state, './state.json');
}
```

### 8. Export Categorized Transactions

```typescript
// Export to CSV with category names
function exportCategorizedToCSV(
  transactions: CategorizedTransaction[],
  categories: Map<string, Category>
): string {
  const header = 'Dato;Beløp;Type;Tekst;Fra konto;Kategori;Er låst';
  
  const rows = transactions.map(t => {
    const category = t.categoryId 
      ? categories.get(t.categoryId)?.name || 'Ukjent'
      : 'Ukategorisert';
    const beløp = t.beløp.toFixed(2).replace('.', ',');
    const locked = t.isLocked ? 'Ja' : 'Nei';
    
    return `${t.dato};${beløp};${t.type};${t.tekst};${t.fraKonto};${category};${locked}`;
  });
  
  return [header, ...rows].join('\n');
}

const csvOutput = exportCategorizedToCSV(categorizedTransactions, state.categories);
await fs.writeFile('./output/categorized.csv', csvOutput, 'utf-8');
console.log('\nExported categorized transactions to ./output/categorized.csv');
```

### 9. Generate Reports

```typescript
// Monthly summary by category
function generateMonthlySummary(
  transactions: CategorizedTransaction[],
  categories: Map<string, Category>
) {
  const summary = new Map<string, { income: number; expenses: number; count: number }>();
  
  for (const tx of transactions) {
    if (!tx.categoryId) continue;
    
    const category = categories.get(tx.categoryId);
    if (!category) continue;
    
    const current = summary.get(category.name) || { income: 0, expenses: 0, count: 0 };
    
    if (tx.beløp > 0) {
      current.income += tx.beløp;
    } else {
      current.expenses += Math.abs(tx.beløp);
    }
    current.count++;
    
    summary.set(category.name, current);
  }
  
  return summary;
}

const summary = generateMonthlySummary(categorizedTransactions, state.categories);

console.log('\n=== Monthly Summary by Category ===');
Array.from(summary.entries())
  .sort((a, b) => b[1].expenses - a[1].expenses)
  .forEach(([category, data]) => {
    console.log(`\n${category}:`);
    console.log(`  Transactions: ${data.count}`);
    if (data.income > 0) {
      console.log(`  Income: ${data.income.toFixed(2)} NOK`);
    }
    if (data.expenses > 0) {
      console.log(`  Expenses: ${data.expenses.toFixed(2)} NOK`);
    }
  });
```

## Complete Example Script

```typescript
import { parseCSVFile } from './csvParser';
import {
  createInitialState,
  createCategory,
  setRule,
  applyRules,
  lockTransaction,
  groupByTekst,
  getCategorizationStats,
} from './categoryEngine';
import {
  saveStateToFile,
  loadStateFromFile,
  stateFileExists,
} from './categoryEnginePersistence';
import { promises as fs } from 'fs';

async function processTransactions() {
  // 1. Parse CSV
  console.log('📄 Parsing CSV...');
  const parseResult = await parseCSVFile('./data/23421.csv');
  console.log(`   Loaded ${parseResult.uniqueCount} transactions\n`);

  // 2. Load or create state
  console.log('⚙️  Loading state...');
  let state;
  if (await stateFileExists('./state.json')) {
    state = await loadStateFromFile('./state.json');
    console.log('   Loaded existing state\n');
  } else {
    state = createInitialState();
    
    // Create categories
    const categories = [
      { name: 'Mat og drikke', isIncome: false },
      { name: 'Transport', isIncome: false },
      { name: 'Inntekter', isIncome: true },
    ];
    
    const catMap = new Map<string, string>();
    for (const def of categories) {
      const result = createCategory(state.categories, def);
      state.categories = result.categories;
      catMap.set(def.name, result.category.id);
    }
    
    // Create initial rules
    state.rules = setRule(state.rules, 'KIWI', catMap.get('Mat og drikke')!);
    state.rules = setRule(state.rules, 'Norwegian Air', catMap.get('Transport')!);
    state.rules = setRule(state.rules, 'KREDITRENTER', catMap.get('Inntekter')!);
    
    console.log('   Created new state\n');
  }

  // 3. Apply rules
  console.log('🔄 Applying rules...');
  const result = applyRules(parseResult.transactions, state);
  console.log(`   Categorized: ${result.stats.categorized}/${result.stats.total}\n`);

  // 4. Show statistics
  const stats = getCategorizationStats(result.categorized);
  console.log('📊 Statistics:');
  console.log(`   Categorization rate: ${(stats.categorized / stats.total * 100).toFixed(1)}%`);
  console.log(`   Unique patterns: ${stats.uniqueTekstPatterns}`);
  console.log(`   Patterns with rules: ${stats.patternsWithRules}\n`);

  // 5. Save state
  await saveStateToFile(state, './state.json');
  console.log('💾 State saved\n');

  return result.categorized;
}

processTransactions().catch(console.error);
```

## Best Practices

### 1. Regular State Backups

```typescript
import { backupStateFile } from './categoryEnginePersistence';

// Before making significant changes
const backupPath = await backupStateFile('./state.json');
console.log(`Backup created: ${backupPath}`);
```

### 2. Incremental Rule Creation

Don't try to create all rules at once. Start with the most common patterns:

```typescript
const grouped = groupByTekst(transactions);
const topPatterns = Array.from(grouped.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20); // Focus on top 20 most frequent

// Create rules for these first
```

### 3. Review Before Locking

Only lock transactions when truly exceptional:

```typescript
// ✅ Good reason to lock
// Most McDonald's purchases are fast food, but this one was catering for event
lockTransaction(locks, txId, eventCategoryId, 'Catering for company event');

// ❌ Bad reason to lock
// Just create a better rule instead
lockTransaction(locks, txId, categoryId, 'I want this categorized differently');
```

### 4. Monitor Uncategorized Patterns

```typescript
// Run this regularly to find new patterns
const uncategorized = categorizedTransactions.filter(t => !t.categoryId);
const patterns = groupByTekst(uncategorized);

console.log(`Uncategorized patterns: ${patterns.size}`);
patterns.forEach((txns, pattern) => {
  if (txns.length > 2) { // Only show patterns with 3+ occurrences
    console.log(`"${pattern}": ${txns.length} transactions`);
  }
});
```

## File Organization

```
project/
├── data/
│   ├── 23421.csv                      # Input CSV files
│   └── ...
├── output/
│   ├── categorized.csv                # Exported categorized transactions
│   └── reports/
├── state.json                         # Current rule engine state
├── state.json.backup.2025-10-31...    # Automatic backups
├── csvParser.ts                       # CSV parser
├── categoryEngine.ts                  # Category engine
├── categoryEnginePersistence.ts       # Persistence layer
└── processTransactions.ts             # Your main script
```

## Common Workflows

### Import New Month's Transactions

```typescript
// 1. Parse new CSV
const newTransactions = await parseCSVFile('./data/november.csv');

// 2. Load existing state (with all your rules)
const state = await loadStateFromFile('./state.json');

// 3. Apply rules - many will auto-categorize based on existing rules
const result = applyRules(newTransactions.transactions, state);

// 4. Review and categorize new patterns
// (follow steps 6-7 from main workflow)
```

### Share Rules with Team

```typescript
import { exportRules, importRules } from './categoryEnginePersistence';

// Export your rules
await exportRules(state, './shared-rules.json');
// Share shared-rules.json with team

// Team member imports
state = await importRules('./shared-rules.json', state);
```

### Fix Miscategorized Transactions

```typescript
// Option 1: Lock specific transaction
state.locks = lockTransaction(locks, txId, correctCategoryId, 'Exception');

// Option 2: Update the rule (affects all matching transactions)
state.rules = setRule(state.rules, pattern, correctCategoryId);

// Re-apply
const updated = applyRules(transactions, state);
```

## Troubleshooting

### Rules Not Applying

Check that text normalization matches:

```typescript
import { generateTransactionId } from './categoryEngine';

// Text is normalized to lowercase and trimmed
const rule = getRule(state.rules, 'KIWI');
console.log(rule?.tekst); // Will be 'kiwi'
```

### Locked Transaction Won't Update

Locked transactions are immutable by design. To update:

```typescript
// 1. Unlock
state.locks = unlockTransaction(state.locks, txId);

// 2. Re-apply rules
const result = applyRules(transactions, state);

// 3. Optional: Lock to new category
state.locks = lockTransaction(state.locks, txId, newCategoryId);
```

### High Memory Usage

For very large transaction sets, process in batches:

```typescript
const BATCH_SIZE = 1000;
const batches = [];

for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
  const batch = transactions.slice(i, i + BATCH_SIZE);
  const result = applyRules(batch, state);
  batches.push(result.categorized);
}

const allCategorized = batches.flat();
```

## License

MIT

