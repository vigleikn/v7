

# Zustand Store Documentation

Complete state management solution for the transaction management system using Zustand with TypeScript.

## Overview

The store manages:
- **Hovedkategorier** (main categories) and **underkategorier** (subcategories)
- **Transactions** with filtering, selection, and bulk operations
- **Category rules** for auto-categorization
- **Exceptions** (locked transactions)

## Features

✅ **Type-safe** - Full TypeScript support with strict typing  
✅ **Immutable updates** - Using Immer middleware  
✅ **Persistence** - Automatic state persistence with localStorage  
✅ **DevTools** - Redux DevTools integration  
✅ **Derived state** - Automatic stats and filtering  
✅ **Selectors** - Optimized re-renders  

## Installation

```bash
npm install zustand immer
```

## Basic Usage

```typescript
import { useTransactionStore } from './src/store';

function MyComponent() {
  // Select specific state
  const transactions = useTransactionStore(state => state.filteredTransactions);
  const stats = useTransactionStore(state => state.stats);
  
  // Select actions
  const createCategory = useTransactionStore(state => state.createHovedkategori);
  const setFilters = useTransactionStore(state => state.setFilters);
  
  // Use in component
  return (
    <div>
      <h2>Transactions: {stats.total}</h2>
      <button onClick={() => createCategory('New Category')}>
        Add Category
      </button>
    </div>
  );
}
```

## Store Structure

### State

```typescript
interface TransactionStoreState {
  // Categories
  hovedkategorier: Map<string, Hovedkategori>;
  underkategorier: Map<string, Underkategori>;
  
  // Transactions
  transactions: CategorizedTransaction[];
  filteredTransactions: CategorizedTransaction[];
  
  // Rule Engine
  rules: Map<string, CategoryRule>;
  locks: Map<string, TransactionLock>;
  
  // UI State
  filters: TransactionFilters;
  selection: TransactionSelectionState;
  isLoading: boolean;
  error: string | null;
  
  // Derived State
  stats: CategorizationStats;
}
```

### Category Types

```typescript
interface Hovedkategori {
  id: string;
  name: string;
  type: 'hovedkategori';
  underkategorier: string[]; // IDs of subcategories
  color?: string;
  icon?: string;
  sortOrder: number;
  isIncome?: boolean; // Protected from deletion
}

interface Underkategori {
  id: string;
  name: string;
  type: 'underkategori';
  hovedkategoriId: string; // Parent ID
  sortOrder: number;
}
```

## Actions

### Category Management

#### Hovedkategorier

```typescript
// Create
createHovedkategori('Mat og drikke', {
  color: '#10b981',
  icon: '🍕',
  isIncome: false,
});

// Update
updateHovedkategori('cat_123', {
  name: 'Food & Drinks',
  color: '#3b82f6',
});

// Delete (not allowed for income categories)
deleteHovedkategori('cat_123');

// Reorder (drag & drop)
reorderHovedkategorier(['cat_1', 'cat_3', 'cat_2']);
```

#### Underkategorier

```typescript
// Create
createUnderkategori('Restaurant', 'hovedkategori_id');

// Update
updateUnderkategori('under_123', { name: 'Fast Food' });

// Delete
deleteUnderkategori('under_123');

// Move between hovedkategorier (drag & drop)
moveUnderkategori('under_123', 'new_hovedkategori_id');

// Reorder within hovedkategori
reorderUnderkategorier('hovedkategori_id', ['under_1', 'under_3', 'under_2']);
```

### Transaction Management

```typescript
// Import transactions
importTransactions(categorizedTransactions);

// Categorize single transaction
categorizeTransactionAction(
  'transaction_id',
  'category_id',
  true // Create rule for all with same text
);

// Bulk categorize
bulkCategorize({
  transactionIds: ['tx_1', 'tx_2', 'tx_3'],
  categoryId: 'cat_123',
  createRule: true,
  lockTransactions: false,
  lockReason: 'Bulk update',
});
```

### Rule Management

```typescript
// Create rule
createRule('KIWI', 'food_category_id');

// Delete rule
deleteRuleAction('KIWI');

// Apply all rules to all transactions
applyRulesToAll();
```

### Lock Management (Exceptions)

```typescript
// Lock transaction
lockTransactionAction(
  'transaction_id',
  'category_id',
  'This specific purchase was for cleaning supplies'
);

// Unlock transaction
unlockTransactionAction('transaction_id');
```

### Filter Management

```typescript
// Set filters
setFilters({
  search: 'KIWI',
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31',
  categoryIds: ['cat_123'],
  showOnlyUncategorized: true,
});

// Clear all filters
clearFilters();
```

### Selection Management

```typescript
// Select/deselect
selectTransaction('tx_123');
deselectTransaction('tx_123');
toggleSelection('tx_123');

// Select/deselect all
selectAll();
deselectAll();
```

## Selectors

Use selectors for optimized re-renders:

```typescript
import {
  selectHovedkategorier,
  selectFilteredTransactions,
  selectStats,
  selectSelectedTransactions,
  selectRules,
  selectLocks,
} from './src/store';

// In component
const hovedkategorier = useTransactionStore(selectHovedkategorier);
const transactions = useTransactionStore(selectFilteredTransactions);
const stats = useTransactionStore(selectStats);
```

### Available Selectors

- `selectHovedkategorier` - Sorted list of hovedkategorier
- `selectUnderkategorier` - All underkategorier
- `selectFilteredTransactions` - Transactions after filters applied
- `selectStats` - Categorization statistics
- `selectRules` - Active rules
- `selectLocks` - Locked transactions
- `selectSelectedTransactions` - Currently selected transactions
- `selectFilters` - Current filter state
- `selectSelectionMode` - Selection mode ('none' | 'partial' | 'all')
- `selectIsLoading` - Loading state
- `selectError` - Error state

## Custom Hooks

Create custom hooks for common patterns:

```typescript
// useCategories.ts
export function useCategories() {
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const createHovedkategori = useTransactionStore(
    state => state.createHovedkategori
  );
  const createUnderkategori = useTransactionStore(
    state => state.createUnderkategori
  );

  return {
    hovedkategorier,
    createHovedkategori,
    createUnderkategori,
  };
}

// Usage
function CategoryManager() {
  const { hovedkategorier, createHovedkategori } = useCategories();
  // ...
}
```

## Derived State

The store automatically maintains derived state:

### Statistics

```typescript
const stats = useTransactionStore(state => state.stats);

console.log(stats.total); // Total transactions
console.log(stats.categorized); // How many have categories
console.log(stats.uncategorized); // How many don't
console.log(stats.locked); // How many are locked
console.log(stats.uniqueTekstPatterns); // Unique text patterns
console.log(stats.patternsWithRules); // Patterns with rules
```

### Filtered Transactions

Filters are automatically applied:

```typescript
// Set filter
setFilters({ search: 'KIWI' });

// Filtered transactions update automatically
const filtered = useTransactionStore(state => state.filteredTransactions);
```

## Advanced Usage

### Computed Selectors

```typescript
// Get hovedkategori with its underkategorier
const getDetails = useTransactionStore(
  state => state.getHovedkategoriWithUnderkategorier
);

const details = getDetails('cat_123');
console.log(details.hovedkategori);
console.log(details.underkategorier);

// Get all categories flattened
const getAllCategories = useTransactionStore(
  state => state.getAllCategoriesFlat
);

const allCategories = getAllCategories();
```

### Transaction Selection

```typescript
const getSelected = useTransactionStore(
  state => state.getSelectedTransactions
);

const selected = getSelected();
console.log(`${selected.length} transactions selected`);
```

### Uncategorized Count

```typescript
const getUncategorized = useTransactionStore(
  state => state.getUncategorizedCount
);

const count = getUncategorized();
```

## Persistence

The store automatically persists:
- Hovedkategorier
- Underkategorier
- Rules
- Locks

This data is saved to localStorage and restored on app reload.

**Note:** Transactions are NOT persisted (they should be loaded from CSV).

### Custom Persistence

```typescript
// Disable persistence
export const useTransactionStore = create<TransactionStore>()(
  devtools(
    immer((set, get) => ({
      // ... store definition
    }))
  )
  // Remove persist middleware
);
```

## React Component Examples

### Category List with Drag & Drop

```tsx
import { useTransactionStore, selectHovedkategorier } from './src/store';

function CategoryList() {
  const kategorier = useTransactionStore(selectHovedkategorier);
  const reorder = useTransactionStore(state => state.reorderHovedkategorier);

  return (
    <div>
      {kategorier.map(kat => (
        <div key={kat.id} style={{ color: kat.color }}>
          {kat.icon} {kat.name}
        </div>
      ))}
    </div>
  );
}
```

### Transaction Table with Filters

```tsx
import {
  useTransactionStore,
  selectFilteredTransactions,
  selectStats,
} from './src/store';

function TransactionTable() {
  const transactions = useTransactionStore(selectFilteredTransactions);
  const stats = useTransactionStore(selectStats);
  const setFilters = useTransactionStore(state => state.setFilters);

  return (
    <div>
      <input
        type="text"
        placeholder="Søk..."
        onChange={e => setFilters({ search: e.target.value })}
      />

      <p>
        Viser {transactions.length} av {stats.total} transaksjoner
      </p>

      <table>
        {transactions.map(tx => (
          <tr key={tx.transactionId}>
            <td>{tx.dato}</td>
            <td>{tx.tekst}</td>
            <td>{tx.beløp}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

### Category Dropdown

```tsx
function CategoryDropdown({ transactionId }: { transactionId: string }) {
  const categories = useTransactionStore(state => state.getAllCategoriesFlat());
  const categorize = useTransactionStore(state => state.categorizeTransactionAction);

  const handleChange = (categoryId: string) => {
    const createRule = confirm('Create rule for all with same text?');
    categorize(transactionId, categoryId, createRule);
  };

  return (
    <select onChange={e => handleChange(e.target.value)}>
      <option>Select category...</option>
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>
          {cat.type === 'underkategori' ? '  └─ ' : ''}
          {cat.name}
        </option>
      ))}
    </select>
  );
}
```

### Bulk Actions

```tsx
function BulkActions() {
  const selected = useTransactionStore(state => state.getSelectedTransactions());
  const bulkCategorize = useTransactionStore(state => state.bulkCategorize);
  const deselectAll = useTransactionStore(state => state.deselectAll);

  if (selected.length === 0) return null;

  const handleBulk = (categoryId: string) => {
    bulkCategorize({
      transactionIds: selected.map(t => t.transactionId),
      categoryId,
      createRule: true,
    });
  };

  return (
    <div>
      <p>{selected.length} selected</p>
      <button onClick={() => handleBulk('cat_123')}>
        Categorize all
      </button>
      <button onClick={deselectAll}>Cancel</button>
    </div>
  );
}
```

## Best Practices

### 1. Use Selectors for Performance

```tsx
// ✅ Good - Only re-renders when transactions change
const transactions = useTransactionStore(selectFilteredTransactions);

// ❌ Bad - Re-renders on any state change
const transactions = useTransactionStore(state => state).filteredTransactions;
```

### 2. Batch Related State Updates

The store uses Immer, so updates are batched automatically:

```typescript
// This is one update, components re-render once
bulkCategorize({
  transactionIds: ['tx_1', 'tx_2', 'tx_3'],
  categoryId: 'cat_123',
});
```

### 3. Use Custom Hooks

Create domain-specific hooks:

```typescript
function useTransactionFilters() {
  const filters = useTransactionStore(state => state.filters);
  const setFilters = useTransactionStore(state => state.setFilters);
  const clearFilters = useTransactionStore(state => state.clearFilters);
  
  return { filters, setFilters, clearFilters };
}
```

### 4. Leverage Derived State

Don't compute in components:

```tsx
// ✅ Good - Use derived state
const stats = useTransactionStore(selectStats);
<p>Categorized: {stats.categorized}</p>

// ❌ Bad - Compute in component
const transactions = useTransactionStore(selectFilteredTransactions);
const categorized = transactions.filter(t => t.categoryId).length;
```

### 5. Handle Loading and Errors

```tsx
function TransactionList() {
  const isLoading = useTransactionStore(selectIsLoading);
  const error = useTransactionStore(selectError);
  const transactions = useTransactionStore(selectFilteredTransactions);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return <Table data={transactions} />;
}
```

## Testing

```typescript
import { useTransactionStore } from './src/store';

describe('TransactionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useTransactionStore.getState().reset();
  });

  it('should create hovedkategori', () => {
    const { createHovedkategori, hovedkategorier } = useTransactionStore.getState();
    
    createHovedkategori('Test Category');
    
    const categories = Array.from(hovedkategorier.values());
    expect(categories).toHaveLength(2); // Including default Inntekter
    expect(categories.find(c => c.name === 'Test Category')).toBeDefined();
  });

  it('should filter transactions', () => {
    const { setFilters, filteredTransactions } = useTransactionStore.getState();
    
    setFilters({ search: 'KIWI' });
    
    expect(filteredTransactions.every(t => 
      t.tekst.toLowerCase().includes('kiwi')
    )).toBe(true);
  });
});
```

## Migration from Category Engine

If you're migrating from the standalone category engine:

```typescript
// Old way
import { createInitialState, setRule, applyRules } from './categoryEngine';

let state = createInitialState();
state.rules = setRule(state.rules, 'KIWI', categoryId);
const result = applyRules(transactions, state);

// New way with Zustand
import { useTransactionStore } from './src/store';

const createRule = useTransactionStore(state => state.createRule);
const applyRulesToAll = useTransactionStore(state => state.applyRulesToAll);

createRule('KIWI', categoryId);
applyRulesToAll();
```

## Performance Optimization

### Shallow Selectors

```typescript
// For primitive values
const total = useTransactionStore(state => state.stats.total, shallow);

// For objects, use selectors
const stats = useTransactionStore(selectStats);
```

### Memoized Selectors

```typescript
const selectCategoryCount = (state: TransactionStore) =>
  state.hovedkategorier.size + state.underkategorier.size;

const count = useTransactionStore(selectCategoryCount);
```

## Debugging

Use Redux DevTools:

1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
2. Open DevTools
3. Navigate to "Redux" tab
4. See all state changes and time-travel debug

## License

MIT

