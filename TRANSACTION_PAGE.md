# Transaction Page - Documentation

Complete React component for viewing, filtering, and categorizing transactions.

## Overview

The `TransactionPage` component provides a full-featured interface for managing transactions with:
- ✅ Compact table view with all transaction details
- ✅ Advanced filtering (search, date range, type, category)
- ✅ Bulk categorization with rule creation
- ✅ Exception handling (locked transactions)
- ✅ Inline category dropdowns
- ✅ Visual indicators for locked transactions (🔒)

## Components

### Main Component

**`TransactionPage.tsx`** - Complete transaction management interface

### Subcomponents

**`TransactionFilterBar`** - Filter controls above the table
- Text search
- Date range (from/to)
- Type filter (radio/select)
- Category filter

**`BulkActionBar`** - Bulk operations when transactions are selected
- Category dropdown
- "Unntak" checkbox for locking
- Apply/Cancel buttons
- Warning message when exceptions are selected

**`TransactionRow`** - Individual transaction row
- Checkbox for selection
- All transaction fields
- Inline category dropdown
- Lock indicator (🔒) for exceptions

## Table Columns

| Column | Description | Format |
|--------|-------------|--------|
| **Checkbox** | Selection | Checkbox |
| **Dato** | Date | YYYY-MM-DD |
| **Beløp** | Amount | Integer (no decimals), color-coded (green=income, red=expense) |
| **Type** | Transaction type | Text (Betaling, Overføring, etc.) |
| **Tekst** | Description | Truncated text |
| **Konto** | From/To account combined | Account name |
| **Underkategori** | From CSV | Read-only, italic |
| **Kategori** | Category assignment | Dropdown with 🔒 if locked |

## Features

### 1. **Filtering**

```tsx
// Five filter controls
- Text search → searches in tekst, fraKonto, tilKonto
- Date from → filters >= date
- Date to → filters <= date
- Type → filters by transaction type
- Category → filters by assigned category or "Ukategorisert"
```

**Clear Filters Button**: Automatically appears when filters are active

### 2. **Selection**

- **Select individual**: Click checkbox on any row
- **Select all**: Click checkbox in table header
- **Visual feedback**: Selected rows have blue background

### 3. **Categorization**

#### Single Transaction
```tsx
// Click dropdown in Kategori column
1. Select category from dropdown
2. Confirmation dialog: "Create rule for all with same text?"
3. Transaction is categorized
4. If rule created, all matching transactions are categorized
```

#### Bulk Categorization
```tsx
// When one or more transactions selected
1. Bulk Action Bar appears
2. Select category from dropdown
3. Optional: Check "Unntak" to lock transactions
4. Click "Kategoriser"
5. All selected transactions are categorized
```

### 4. **Exceptions (Locked Transactions)**

**What are exceptions?**
- Transactions locked to a specific category
- Overrides automatic rules
- Marked with 🔒 icon
- Cannot be auto-categorized

**How to create:**
1. Select transaction(s)
2. Choose category in Bulk Action Bar
3. Check **"Unntak (lås transaksjoner)"**
4. Click "Kategoriser"

**Visual indicators:**
- 🔒 icon next to category dropdown
- Dropdown is disabled
- Yellow warning in Bulk Action Bar

### 5. **Statistics**

Displayed in header:
```
X transaksjoner totalt • Y kategorisert • Z ukategorisert
```

Footer shows filtered count:
```
Viser X av Y transaksjoner • Z valgt
```

## Integration with Zustand Store

### State Used

```typescript
const transactions = useTransactionStore(state => state.transactions);
const stats = useTransactionStore(state => state.stats);
const selection = useTransactionStore(state => state.selection);
```

### Actions Used

```typescript
// Selection
selectTransaction(id)
deselectTransaction(id)
selectAll()
deselectAll()

// Categorization
categorizeTransactionAction(transactionId, categoryId, createRule)
bulkCategorize({ transactionIds, categoryId, createRule, lockTransactions, lockReason })
```

## Usage

### Basic

```tsx
import { TransactionPage } from './components/TransactionPage';

function App() {
  return <TransactionPage />;
}
```

### With Navigation

```tsx
import { TransactionPage } from './components/TransactionPage';

function App() {
  const handleNavigate = (page: string) => {
    // Handle navigation
  };

  return <TransactionPage onNavigate={handleNavigate} />;
}
```

## Workflow Examples

### Example 1: Filter and Categorize

1. Type "KIWI" in search box
2. See all KIWI transactions
3. Select all (checkbox in header)
4. Choose "Mat og drikke → Dagligvarer" in bulk dropdown
5. Click "Kategoriser"
6. Confirm rule creation
7. ✅ All KIWI transactions now categorized!

### Example 2: Create Exception

1. Search for "KIWI" 
2. Find one specific purchase that was NOT groceries
3. Select just that transaction
4. Choose different category (e.g., "Husholdning")
5. Check **"Unntak"** checkbox
6. Click "Kategoriser"
7. ✅ That transaction is now locked 🔒 and won't be affected by KIWI rule

### Example 3: Filter by Uncategorized

1. Select "Ukategorisert" in Category filter
2. See all transactions without categories
3. Look for patterns (same Tekst)
4. Categorize similar ones together

## UI Components Used

### ShadCN Components
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- `Card`, `CardHeader`, `CardContent`
- `Button` (variants: default, outline, ghost)
- `Input` (text, date)
- `Select` (dropdowns)
- `Checkbox`

### Custom Components
- `Sidebar` (shared navigation)
- `TransactionFilterBar`
- `BulkActionBar`
- `TransactionRow`

## Styling

### Color Coding

```css
Amount colors:
- Positive (income): text-green-600
- Negative (expense): text-red-600

Selection:
- Selected row: bg-muted (light blue)
- Hover: hover:bg-muted/50

Bulk Action Bar:
- Background: bg-blue-50
- Border: border-blue-200
- Text: text-blue-900

Exception Warning:
- Background: bg-amber-50
- Border: border-amber-200
- Text: text-amber-700
```

### Responsive

- Grid layout for filters: `grid-cols-1 md:grid-cols-2 lg:grid-cols-5`
- Table is scrollable on small screens
- Max width container: `max-w-7xl`

## Performance

### Optimizations

1. **Memoized filtered transactions** - useMemo prevents unnecessary recalculations
2. **Zustand selectors** - Only re-render when needed
3. **Controlled inputs** - Local state for filters
4. **Efficient mapping** - Category lists built once with useMemo

## Sample Data

The demo includes 10 sample transactions:
- 3x KIWI purchases
- 1x REMA 1000
- 1x Interest payment (income)
- 1x Netflix
- 1x Spotify  
- 1x Norwegian Air
- 1x Rent payment
- 1x Gas station

## Tips

### Best Practices

1. **Create rules for common patterns**
   - Select all transactions with same Tekst
   - Bulk categorize with "create rule"
   - Future transactions auto-categorized

2. **Use exceptions sparingly**
   - Only for truly unique cases
   - Provides flexibility without breaking rules

3. **Filter before bulk actions**
   - Use search and filters to find related transactions
   - Select all matching
   - Apply category

4. **Regular categorization**
   - Filter by "Ukategorisert"
   - Look for patterns
   - Create rules for repeated merchants

## Keyboard Shortcuts

- **Enter** - Submit in filter inputs
- **Escape** - Clear focus

## Accessibility

- ✅ Semantic HTML (table, thead, tbody)
- ✅ Proper labels on inputs
- ✅ Keyboard navigation
- ✅ Visual feedback for interactions
- ✅ Color coding with text labels (not color-only)

## Production Ready

✅ Full TypeScript support  
✅ No linter errors  
✅ Modular components  
✅ Error handling  
✅ Zustand integration  
✅ Responsive design  
✅ Performance optimized  
✅ Accessible  

## License

MIT

