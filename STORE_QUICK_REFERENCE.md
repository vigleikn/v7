# Zustand Store - Quick Reference

## Setup

```bash
npm install zustand immer
```

## Basic Usage

```tsx
import { useTransactionStore } from './store';

function MyComponent() {
  // Get state
  const transactions = useTransactionStore(state => state.filteredTransactions);
  const stats = useTransactionStore(state => state.stats);
  
  // Get actions
  const createCategory = useTransactionStore(state => state.createHovedkategori);
  
  return <div>Total: {stats.total}</div>;
}
```

## Common Actions

### Categories

```typescript
// Create hovedkategori
createHovedkategori('Mat og drikke', {
  color: '#10b981',
  icon: '🍕',
});

// Create underkategori
createUnderkategori('Restaurant', 'hovedkategori_id');

// Move underkategori (drag & drop)
moveUnderkategori('under_id', 'new_hovedkategori_id');

// Reorder
reorderHovedkategorier(['cat_1', 'cat_3', 'cat_2']);
```

### Transactions

```typescript
// Import
importTransactions(transactions);

// Categorize single
categorizeTransactionAction('tx_id', 'cat_id', true);

// Bulk categorize
bulkCategorize({
  transactionIds: ['tx_1', 'tx_2'],
  categoryId: 'cat_123',
  createRule: true,
});
```

### Filters

```typescript
// Set filters
setFilters({
  search: 'KIWI',
  dateFrom: '2025-01-01',
  showOnlyUncategorized: true,
});

// Clear
clearFilters();
```

### Selection

```typescript
// Select/deselect
selectTransaction('tx_id');
deselectAll();
selectAll();
```

### Rules & Locks

```typescript
// Create rule
createRule('KIWI', 'food_category_id');

// Lock transaction (exception)
lockTransactionAction('tx_id', 'cat_id', 'Special case');

// Unlock
unlockTransactionAction('tx_id');
```

## Selectors

```typescript
import {
  selectHovedkategorier,
  selectFilteredTransactions,
  selectStats,
  selectSelectedTransactions,
} from './store';

const kategorier = useTransactionStore(selectHovedkategorier);
const transactions = useTransactionStore(selectFilteredTransactions);
const stats = useTransactionStore(selectStats);
const selected = useTransactionStore(selectSelectedTransactions);
```

## State Structure

```typescript
{
  // Categories
  hovedkategorier: Map<string, Hovedkategori>
  underkategorier: Map<string, Underkategori>
  
  // Transactions
  transactions: CategorizedTransaction[]
  filteredTransactions: CategorizedTransaction[] // Auto-filtered
  
  // Rules & Locks
  rules: Map<string, CategoryRule>
  locks: Map<string, TransactionLock>
  
  // UI
  filters: TransactionFilters
  selection: TransactionSelectionState
  isLoading: boolean
  error: string | null
  
  // Derived
  stats: {
    total: number
    categorized: number
    uncategorized: number
    locked: number
    uniqueTekstPatterns: number
    patternsWithRules: number
  }
}
```

## React Components

### Category Dropdown

```tsx
function CategoryDropdown({ transactionId }: { transactionId: string }) {
  const categories = useTransactionStore(state => state.getAllCategoriesFlat());
  const categorize = useTransactionStore(state => state.categorizeTransactionAction);

  return (
    <select onChange={e => categorize(transactionId, e.target.value, false)}>
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
  );
}
```

### Filter Input

```tsx
function SearchFilter() {
  const setFilters = useTransactionStore(state => state.setFilters);
  
  return (
    <input
      type="text"
      placeholder="Søk..."
      onChange={e => setFilters({ search: e.target.value })}
    />
  );
}
```

### Stats Display

```tsx
function StatsBar() {
  const stats = useTransactionStore(selectStats);
  
  return (
    <div>
      <span>Total: {stats.total}</span>
      <span>Kategorisert: {stats.categorized}</span>
      <span>Ukategorisert: {stats.uncategorized}</span>
    </div>
  );
}
```

### Bulk Actions

```tsx
function BulkActions() {
  const selected = useTransactionStore(selectSelectedTransactions);
  const bulkCategorize = useTransactionStore(state => state.bulkCategorize);
  const deselectAll = useTransactionStore(state => state.deselectAll);

  if (selected.length === 0) return null;

  return (
    <div>
      <span>{selected.length} valgt</span>
      <button onClick={() => bulkCategorize({
        transactionIds: selected.map(t => t.transactionId),
        categoryId: 'cat_123',
        createRule: true,
      })}>
        Kategoriser
      </button>
      <button onClick={deselectAll}>Avbryt</button>
    </div>
  );
}
```

## Custom Hooks

```typescript
// useCategories.ts
export function useCategories() {
  const hovedkategorier = useTransactionStore(selectHovedkategorier);
  const createHovedkategori = useTransactionStore(
    state => state.createHovedkategori
  );
  return { hovedkategorier, createHovedkategori };
}

// Usage
function CategoryManager() {
  const { hovedkategorier, createHovedkategori } = useCategories();
  // ...
}
```

## Auto-Categorization Flow

1. **Import transactions** → `importTransactions()`
2. **Rules are applied automatically** → Updates `filteredTransactions` and `stats`
3. **Create new rules** → `createRule()` → Auto re-applies to all transactions
4. **Lock exceptions** → `lockTransactionAction()` → Takes priority over rules

## Drag & Drop Example

```tsx
// With react-beautiful-dnd
function CategoryList() {
  const kategorier = useTransactionStore(selectHovedkategorier);
  const reorder = useTransactionStore(state => state.reorderHovedkategorier);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(kategorier);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    
    reorder(items.map(item => item.id));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="categories">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {kategorier.map((kat, index) => (
              <Draggable key={kat.id} draggableId={kat.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    {kat.icon} {kat.name}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

## Testing

```typescript
import { useTransactionStore } from './store';

describe('Store', () => {
  beforeEach(() => {
    useTransactionStore.getState().reset();
  });

  it('should create category', () => {
    const { createHovedkategori, hovedkategorier } = 
      useTransactionStore.getState();
    
    createHovedkategori('Test');
    expect(Array.from(hovedkategorier.values())).toHaveLength(2);
  });
});
```

## Persistence

Automatically persists to localStorage:
- Hovedkategorier
- Underkategorier
- Rules
- Locks

Transactions are NOT persisted (load from CSV each time).

## DevTools

1. Install Redux DevTools Extension
2. Open Chrome DevTools
3. Click "Redux" tab
4. See all state changes and time-travel debug

## Performance Tips

```tsx
// ✅ Good - Selector prevents unnecessary re-renders
const stats = useTransactionStore(selectStats);

// ❌ Bad - Re-renders on any state change
const stats = useTransactionStore(state => state).stats;
```

## Complete Example

```tsx
import {
  useTransactionStore,
  selectHovedkategorier,
  selectFilteredTransactions,
  selectStats,
} from './store';

function App() {
  const kategorier = useTransactionStore(selectHovedkategorier);
  const transactions = useTransactionStore(selectFilteredTransactions);
  const stats = useTransactionStore(selectStats);
  
  const createCategory = useTransactionStore(state => state.createHovedkategori);
  const setFilters = useTransactionStore(state => state.setFilters);
  const categorize = useTransactionStore(state => state.categorizeTransactionAction);

  return (
    <div>
      {/* Categories */}
      <div>
        <h2>Kategorier ({kategorier.length})</h2>
        <button onClick={() => createCategory('New', { icon: '📁' })}>
          + Ny
        </button>
        {kategorier.map(kat => (
          <div key={kat.id}>{kat.icon} {kat.name}</div>
        ))}
      </div>

      {/* Filters */}
      <div>
        <input
          type="text"
          placeholder="Søk..."
          onChange={e => setFilters({ search: e.target.value })}
        />
      </div>

      {/* Stats */}
      <div>
        <span>Total: {stats.total}</span>
        <span>Kategorisert: {stats.categorized}</span>
      </div>

      {/* Transactions */}
      <table>
        {transactions.map(tx => (
          <tr key={tx.transactionId}>
            <td>{tx.dato}</td>
            <td>{tx.tekst}</td>
            <td>{tx.beløp}</td>
            <td>
              <CategoryDropdown
                transactionId={tx.transactionId}
                currentCategoryId={tx.categoryId}
              />
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

For complete documentation, see [STORE.md](./STORE.md)

