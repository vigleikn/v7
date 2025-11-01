# Category Rule Engine

A functional, type-safe rule engine for automatically categorizing bank transactions based on transaction text patterns, with support for locked exceptions.

## Features

✅ **Rule-Based Categorization** - All transactions with the same "Tekst" field get the same category  
✅ **Exception Handling** - Lock specific transactions to prevent automatic categorization  
✅ **Batch Application** - When categorizing a transaction, automatically apply to all matching uncategorized ones  
✅ **Pure Functions** - Immutable state management, no side effects  
✅ **Type Safety** - Full TypeScript support with strict typing  
✅ **Persistence** - Save/load rules and state to/from JSON files  
✅ **Category Management** - Create, update, delete categories with protection for income categories  

## Architecture

### Pure Functional Design

The engine is built using pure functions that:
- Never mutate input data
- Always return new state objects
- Have no side effects
- Are easily testable and predictable

### Core Concepts

1. **Categories** - Organizational buckets for transactions (e.g., "Food", "Transport")
2. **Rules** - Mappings from transaction text patterns to categories
3. **Locks** - Exceptions that prevent automatic categorization for specific transactions
4. **State** - Immutable container holding all rules, locks, and categories

## Usage

### Basic Setup

```typescript
import {
  createInitialState,
  createCategory,
  setRule,
  applyRules,
  RuleEngineState,
} from './categoryEngine';

// Initialize empty state
let state: RuleEngineState = createInitialState();

// Create a category
const { categories, category } = createCategory(state.categories, {
  name: 'Mat og drikke',
  isIncome: false,
});
state.categories = categories;

// Create a rule
state.rules = setRule(state.rules, 'KIWI', category.id);

// Apply rules to transactions
const result = applyRules(transactions, state);
console.log(`Categorized ${result.stats.categorized} transactions`);
```

### Creating and Managing Categories

```typescript
import { createCategory, updateCategory, deleteCategory } from './categoryEngine';

// Create a category
const { categories: newCats, category } = createCategory(state.categories, {
  name: 'Transport',
  isIncome: false,
});
state.categories = newCats;

// Update a category (returns null if it's an income category)
const updated = updateCategory(state.categories, category.id, {
  name: 'Transport & Travel',
});
if (updated) {
  state.categories = updated;
}

// Delete a category (returns null if it's an income category)
const afterDelete = deleteCategory(state.categories, category.id);
if (afterDelete) {
  state.categories = afterDelete;
}

// Income categories are protected
const incomeResult = createCategory(state.categories, {
  name: 'Inntekter',
  isIncome: true, // Cannot be updated or deleted
});
```

### Creating Rules

```typescript
import { setRule, deleteRule, getRule, listRules } from './categoryEngine';

// Create or update a rule
state.rules = setRule(state.rules, 'KIWI', foodCategoryId);
state.rules = setRule(state.rules, 'Extra', foodCategoryId);

// Get a specific rule
const rule = getRule(state.rules, 'KIWI');
console.log(rule?.categoryId);

// List all rules
const allRules = listRules(state.rules);
console.log(`Total rules: ${allRules.length}`);

// Delete a rule
state.rules = deleteRule(state.rules, 'KIWI');
```

### Applying Rules to Transactions

```typescript
import { applyRules } from './categoryEngine';

const result = applyRules(transactions, state);

console.log(`Total: ${result.stats.total}`);
console.log(`Categorized: ${result.stats.categorized}`);
console.log(`Uncategorized: ${result.stats.uncategorized}`);
console.log(`Locked: ${result.stats.locked}`);
console.log(`Rules applied: ${result.stats.rulesApplied}`);

// Access categorized transactions
result.categorized.forEach(tx => {
  console.log(`${tx.tekst}: ${tx.categoryId} (locked: ${tx.isLocked})`);
});
```

### Locking Transactions (Exceptions)

```typescript
import {
  lockTransaction,
  unlockTransaction,
  isTransactionLocked,
  getTransactionLock,
} from './categoryEngine';

// Lock a transaction to a specific category
state.locks = lockTransaction(
  state.locks,
  transaction.transactionId,
  specialCategoryId,
  'This specific purchase was for home supplies, not food'
);

// Check if locked
if (isTransactionLocked(state.locks, transaction.transactionId)) {
  console.log('Transaction is locked');
}

// Get lock details
const lock = getTransactionLock(state.locks, transaction.transactionId);
console.log(`Locked to: ${lock?.categoryId}`);
console.log(`Reason: ${lock?.reason}`);

// Unlock
state.locks = unlockTransaction(state.locks, transaction.transactionId);
```

### Categorizing with Auto-Rule Creation

```typescript
import { categorizeTransaction } from './categoryEngine';

// Categorize a transaction and create a rule for its text pattern
const result = categorizeTransaction(
  categorizedTransactions,
  transaction.transactionId,
  categoryId,
  state,
  true // Create rule
);

// Updated state with new rule
state = result.state;

// List of transactions that will be affected by this rule
console.log(`Will categorize ${result.affectedTransactions.length} matching transactions`);

// Re-apply rules to see changes
const updated = applyRules(originalTransactions, state);
```

### Persistence

```typescript
import {
  saveStateToFile,
  loadStateFromFile,
  stateFileExists,
  backupStateFile,
  exportRules,
  exportCategories,
} from './categoryEnginePersistence';

// Save complete state
await saveStateToFile(state, './state.json');

// Load state
if (await stateFileExists('./state.json')) {
  state = await loadStateFromFile('./state.json');
}

// Create backup before making changes
const backupPath = await backupStateFile('./state.json');
console.log(`Backup created: ${backupPath}`);

// Export only rules
await exportRules(state, './rules.json');

// Export only categories
await exportCategories(state, './categories.json');

// Get metadata without loading full file
const metadata = await getStateMetadata('./state.json');
console.log(`Rules: ${metadata.ruleCount}, Categories: ${metadata.categoryCount}`);
```

## Rule Application Logic

The engine applies rules in the following order:

1. **Locked transactions** - If a transaction is locked, it keeps its locked category (highest priority)
2. **Rule matching** - If a rule exists for the transaction's text, apply that category
3. **Uncategorized** - If no rule exists and not locked, transaction remains uncategorized

### Example Flow

```typescript
// Transaction with text "KIWI"
const transaction = { tekst: 'KIWI', /* ... */ };

// Scenario 1: No rule, not locked → Uncategorized
applyRules([transaction], state); // categoryId: undefined

// Scenario 2: Rule exists → Categorized
state.rules = setRule(state.rules, 'KIWI', foodCategoryId);
applyRules([transaction], state); // categoryId: foodCategoryId

// Scenario 3: Locked (exception) → Locked category takes precedence
state.locks = lockTransaction(state.locks, txId, transportCategoryId);
applyRules([transaction], state); // categoryId: transportCategoryId, isLocked: true
```

## Data Structures

### RuleEngineState

```typescript
interface RuleEngineState {
  rules: Map<string, CategoryRule>;      // Text pattern → Rule
  locks: Map<string, TransactionLock>;   // Transaction ID → Lock
  categories: Map<string, Category>;     // Category ID → Category
}
```

### CategoryRule

```typescript
interface CategoryRule {
  tekst: string;        // Normalized text pattern
  categoryId: string;   // Category to apply
  createdAt: Date;      // When rule was created
  updatedAt: Date;      // Last update
}
```

### TransactionLock

```typescript
interface TransactionLock {
  transactionId: string;  // Unique transaction identifier
  categoryId: string;     // Locked category
  lockedAt: Date;         // When locked
  reason?: string;        // Optional explanation
}
```

### Category

```typescript
interface Category {
  id: string;          // Unique identifier
  name: string;        // Display name
  parentId?: string;   // For subcategories
  isIncome?: boolean;  // If true, category is protected
}
```

## Utility Functions

### Group Transactions by Text

```typescript
import { groupByTekst } from './categoryEngine';

const groups = groupByTekst(categorizedTransactions);

groups.forEach((transactions, tekst) => {
  console.log(`"${tekst}": ${transactions.length} transactions`);
});
```

### Get Statistics

```typescript
import { getCategorizationStats } from './categoryEngine';

const stats = getCategorizationStats(categorizedTransactions);
console.log(`Categorization rate: ${(stats.categorized / stats.total * 100).toFixed(1)}%`);
console.log(`Unique patterns: ${stats.uniqueTekstPatterns}`);
console.log(`Patterns with rules: ${stats.patternsWithRules}`);
```

## Running Examples and Tests

```bash
# Run the comprehensive example
npm run category:example

# Run the test suite
npm run category:test
```

## Best Practices

### 1. Always Use Pure Functions

```typescript
// ✅ Good - Returns new state
state.rules = setRule(state.rules, 'KIWI', categoryId);

// ❌ Bad - Mutates state directly
state.rules.set('kiwi', rule);
```

### 2. Lock Transactions Sparingly

Locks are exceptions. Use them only when a specific transaction needs different treatment than the general rule.

```typescript
// Most KIWI purchases are food
state.rules = setRule(state.rules, 'KIWI', foodCategoryId);

// But this one specific KIWI purchase was for cleaning supplies
state.locks = lockTransaction(
  state.locks,
  transaction.transactionId,
  householdCategoryId,
  'Cleaning supplies purchase'
);
```

### 3. Create Rules from Patterns

When you notice multiple transactions with the same text that should be categorized the same way, create a rule:

```typescript
const grouped = groupByTekst(transactions);

grouped.forEach((txns, tekst) => {
  if (txns.length > 1 && !getRule(state.rules, tekst)) {
    console.log(`Consider creating a rule for "${tekst}" (${txns.length} occurrences)`);
  }
});
```

### 4. Protect Income Categories

Always mark income categories with `isIncome: true` to prevent accidental deletion or modification:

```typescript
const { categories, category } = createCategory(state.categories, {
  name: 'Inntekter',
  isIncome: true, // Protected from deletion/updates
});
```

### 5. Persist State Regularly

Save state after significant changes:

```typescript
// After bulk rule creation
for (const rule of rulesToCreate) {
  state.rules = setRule(state.rules, rule.tekst, rule.categoryId);
}
await saveStateToFile(state, './state.json');
```

## Integration with CSV Parser

```typescript
import { parseCSVFile } from './csvParser';
import { applyRules, createInitialState } from './categoryEngine';

// Parse transactions
const parseResult = await parseCSVFile('./data/transactions.csv');

// Apply categorization rules
const state = await loadStateFromFile('./state.json');
const categorized = applyRules(parseResult.transactions, state);

// Work with categorized transactions
categorized.categorized.forEach(tx => {
  const category = state.categories.get(tx.categoryId);
  console.log(`${tx.tekst} → ${category?.name || 'Uncategorized'}`);
});
```

## File Structure

```
.
├── categoryEngine.ts              # Core engine (pure functions)
├── categoryEnginePersistence.ts   # Persistence layer
├── categoryEngineExample.ts       # Comprehensive example
├── categoryEngineTest.ts          # Test suite
└── CATEGORY_ENGINE.md            # This documentation
```

## License

MIT

