# Transaction Management System

> **🤖 For AI/Cursor Context:**  
> Personal finance tool for Norwegian bank CSV transactions. **Tech:** TypeScript, React, Zustand, Vite, Tailwind, shadcn/ui. **Core Pattern:** Pure functional category engine + Zustand store + persistent storage. **Critical:** System categories (isIncome: true) are protected, CSV imports ALL rows (duplicates checked only vs store), filters sync to store via useEffect. Transaction IDs generated from `date|amount|type|text|from|to`. Primary text color: #002050B.

---

A complete TypeScript system for parsing Norwegian bank transaction CSV files and automatically categorizing them using a rule-based engine.

## Features

### CSV Parser
- ✅ Parses Norwegian CSV format (semicolon-separated, comma as decimal separator)
- ✅ Automatic duplicate detection based on transaction fingerprinting
- ✅ Type-safe TypeScript interfaces
- ✅ Support for all required transaction fields
- ✅ Norwegian number format handling (1.234,56 → 1234.56)
- ✅ Handles empty lines gracefully
- ✅ Export functionality to CSV format

### Category Rule Engine
- ✅ Rule-based automatic categorization
- ✅ All transactions with same text get same category
- ✅ Exception handling via transaction locking
- ✅ Bulk categorization with one rule
- ✅ Pure functional design (immutable state)
- ✅ Category management with protected income categories
- ✅ Persistent state (save/load to JSON)

### Zustand Store (React State Management)
- ✅ Type-safe React state management
- ✅ Hovedkategorier and underkategorier management
- ✅ Drag & drop support for category reordering
- ✅ Transaction filtering, selection, and bulk operations
- ✅ Automatic derived state (stats, filtered transactions)
- ✅ Redux DevTools integration
- ✅ LocalStorage persistence

### React Components (ShadCN UI)
- ✅ Complete category management page
- ✅ Transaction table with filtering and bulk operations
- ✅ CSV import from browser (drag & drop file selection)
- ✅ Duplicate detection on import
- ✅ Auto-categorization on import
- ✅ Sidebar navigation with active states
- ✅ Category cards with inline editing
- ✅ Protected system categories ("Inntekter")
- ✅ Confirmation dialogs with transaction warnings
- ✅ Modular, reusable components
- ✅ Full Tailwind CSS styling
- ✅ Production-ready code

### Local Persistence
- ✅ JSON file storage (Node.js)
- ✅ localStorage support (Browser)
- ✅ Auto-save on changes (debounced)
- ✅ Backup and restore
- ✅ Import/export single file
- ✅ Storage statistics
- ✅ Automatic initialization on startup

## Installation

```bash
npm install
```

## Quick Start

### Try the Live Demo (Recommended)

Start the interactive web interface:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser. You can:
- View and filter transactions in a table
- Categorize transactions with dropdowns
- Create categories and subcategories  
- Use bulk operations
- Create exceptions (locked transactions)
- All changes auto-save to localStorage!

### Run CLI Examples

Run the complete example showing CSV parsing and categorization:

```bash
npm start
```

This will:
1. Parse transactions from CSV
2. Create categories and rules
3. Automatically categorize transactions
4. Show categorization statistics
5. Display financial breakdown by category
6. Identify uncategorized patterns

### Test Persistence

```bash
npm run persistence:demo
```

Demonstrates:
- Loading and saving data to JSON files
- Auto-save on changes
- Creating backups
- Storage statistics

## Usage

### Basic Usage

```typescript
import { parseCSVFile } from './csvParser';
import { useTransactionStore } from './store';
import { generateTransactionId } from './categoryEngine';

const result = await parseCSVFile('./data/23421.csv');

console.log(`Total transactions: ${result.originalCount}`);

// Convert to categorized transactions
const newTransactions = result.transactions.map(tx => ({
  ...tx,
  transactionId: generateTransactionId(tx),
  categoryId: undefined,
  isLocked: false,
}));

// Check for duplicates against store
const store = useTransactionStore.getState();
const existingIds = new Set(store.transactions.map(t => t.transactionId));
const uniqueTransactions = newTransactions.filter(tx => !existingIds.has(tx.transactionId));
const duplicates = newTransactions.length - uniqueTransactions.length;

console.log(`New transactions: ${uniqueTransactions.length}`);
console.log(`Duplicates (vs store): ${duplicates}`);

// Import only unique transactions
store.importTransactions([...store.transactions, ...uniqueTransactions]);
```

### Parse from String

```typescript
import { parseCSV } from './csvParser';

const csvContent = `Dato;Beløp;...
2025-10-01;-235,00;...`;

const result = parseCSV(csvContent);
```

### Export to CSV

```typescript
import { exportToCSV } from './csvParser';

const csvString = exportToCSV(result.transactions);
```

## CSV Format

The parser expects the following columns (semicolon-separated):

### Required Columns
- `Dato` - Transaction date (YYYY-MM-DD)
- `Beløp` - Amount (Norwegian format: -1.234,56)
- `Til konto` - To account name
- `Til kontonummer` - To account number
- `Fra konto` - From account name
- `Fra kontonummer` - From account number
- `Type` - Transaction type (Betaling, Overføring, etc.)
- `Tekst` - Transaction description
- `Underkategori` - Subcategory (not used for categorization per spec)

### Optional Columns
- `Originalt Beløp` - Original amount
- `Original Valuta` - Original currency
- `KID` - Customer identification number
- `Hovedkategori` - Main category

## Transaction Interface

```typescript
interface Transaction {
  dato: string;
  beløp: number;
  tilKonto: string;
  tilKontonummer: string;
  fraKonto: string;
  fraKontonummer: string;
  type: string;
  tekst: string;
  underkategori: string;
  // Optional fields
  originaltBeløp?: number;
  originalValuta?: string;
  kid?: string;
  hovedkategori?: string;
}
```

## Duplicate Detection

Duplicates are detected by generating a unique hash for each transaction based on:
- Date (`dato`)
- Amount (`beløp`)
- Type (`type`)
- Description (`tekst`)
- From account (`fraKonto`)
- To account (`tilKonto`)

**Important:** The CSV parser imports ALL rows from the file without internal duplicate checking. Duplicate detection only happens when importing to the Zustand store - transactions are compared against existing `store.transactions`. This allows legitimate duplicate transactions (e.g., two purchases at the same store on the same day) to be imported correctly.

### Category Engine Usage

```typescript
import { parseCSVFile } from './csvParser';
import {
  createInitialState,
  createCategory,
  setRule,
  applyRules,
  lockTransaction,
} from './categoryEngine';

// Parse CSV
const parseResult = await parseCSVFile('./data/23421.csv');

// Initialize engine
let state = createInitialState();

// Create category
const { categories, category } = createCategory(state.categories, {
  name: 'Mat og drikke',
  isIncome: false,
});
state.categories = categories;

// Create rule
state.rules = setRule(state.rules, 'KIWI', category.id);

// Apply rules
const result = applyRules(parseResult.transactions, state);
console.log(`Categorized: ${result.stats.categorized}/${result.stats.total}`);

// Lock a specific transaction as exception
state.locks = lockTransaction(
  state.locks,
  transaction.transactionId,
  specialCategoryId,
  'This is a special case'
);
```

## Running Examples and Tests

### Quick start (recommended)
```bash
npm start
```

### CSV parser example
```bash
npm run example
```

### CSV parser tests
```bash
npm run test
```

### Category engine example
```bash
npm run category:example
```

### Category engine tests
```bash
npm run category:test
```

### Transaction table tests
```bash
npm run transaction:test
```

### Persistence demo
```bash
npm run persistence:demo
```

## Project Structure

```
.
├── csvParser.ts                    # CSV parser implementation
├── categoryEngine.ts               # Category rule engine (pure functions)
├── categoryEnginePersistence.ts    # State persistence layer
├── store.ts                        # Zustand store (React state management)
├── storeExamples.tsx               # React component examples using store
├── storeTest.ts                    # Zustand store test
├── transactionTableTest.ts         # Transaction table test
├── persistenceDemo.ts              # Persistence service demo
├── quickstart.ts                   # Quick start example (run with npm start)
├── example.ts                      # CSV parser example
├── test.ts                         # CSV parser tests
├── categoryEngineExample.ts        # Category engine example
├── categoryEngineTest.ts           # Category engine tests
├── components/
│   ├── CategoryPage.tsx            # Main category management page
│   ├── TransactionPage.tsx         # Main transaction management page
│   ├── Sidebar.tsx                 # Shared navigation sidebar
│   └── ui/
│       ├── card.tsx                # Card components (ShadCN)
│       ├── button.tsx              # Button component (ShadCN)
│       ├── input.tsx               # Input component (ShadCN)
│       ├── select.tsx              # Select component (ShadCN)
│       ├── checkbox.tsx            # Checkbox component (ShadCN)
│       ├── table.tsx               # Table components (ShadCN)
│       └── alert-dialog.tsx        # Alert dialog components (ShadCN)
├── services/
│   ├── persistence.ts              # File-based persistence (Node.js)
│   ├── storeIntegration.ts         # Store persistence integration
│   └── browserPersistence.ts       # Browser localStorage persistence
├── demo/
│   ├── App.tsx                     # Demo application
│   └── main.tsx                    # Demo entry point
├── styles/
│   └── globals.css                 # Tailwind CSS global styles
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
├── README.md                       # This file
├── CATEGORY_ENGINE.md              # Category engine documentation
├── INTEGRATION_GUIDE.md            # Complete integration guide
├── STORE.md                        # Zustand store documentation
├── COMPONENTS.md                   # React components documentation
├── TRANSACTION_PAGE.md             # Transaction page documentation
├── PERSISTENCE.md                  # Persistence service documentation
├── index.html                      # Demo HTML entry point
├── vite.config.ts                  # Vite configuration
└── data/
    ├── 23421.csv                   # Sample transaction CSV data
    ├── persistent/                 # Persisted data (auto-generated)
    │   ├── transactions.json
    │   ├── hovedkategorier.json
    │   ├── underkategorier.json
    │   ├── rules.json
    │   ├── locks.json
    │   └── metadata.json
    ├── backups/                    # Timestamped backups (auto-generated)
    └── export.json                 # Single-file export (optional)
```

## Implementation Notes

### CSV Parser
- **No Underkategori for Categorization**: As per requirements, the `underkategori` field is parsed but not used for automatic categorization
- **Norwegian Format Support**: Properly handles Norwegian number formats with comma as decimal separator
- **Robust Parsing**: Handles missing fields gracefully with empty string defaults
- **Type Safety**: Full TypeScript support with strict typing

### Category Engine
- **Pure Functions**: All functions are pure (no mutations, no side effects)
- **Text Normalization**: Transaction text is normalized (lowercase, trimmed) for consistent matching
- **Lock Priority**: Locked transactions always keep their locked category (highest priority)
- **Protected Categories**: Income categories cannot be deleted or modified
- **Immutable State**: State is never mutated, always returns new state objects

## Rule Application Logic

1. **Locked transactions** → Use locked category (highest priority)
2. **Rule exists** → Apply rule's category
3. **No rule** → Transaction remains uncategorized

## Documentation

- **[README.md](./README.md)** - This file, overview and quick start
- **[CATEGORY_ENGINE.md](./CATEGORY_ENGINE.md)** - Detailed category engine documentation
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Complete workflow and best practices
- **[STORE.md](./STORE.md)** - Zustand store documentation for React apps
- **[COMPONENTS.md](./COMPONENTS.md)** - React components documentation (ShadCN UI)
- **[TRANSACTION_PAGE.md](./TRANSACTION_PAGE.md)** - Transaction table documentation
- **[PERSISTENCE.md](./PERSISTENCE.md)** - Local persistence service documentation
- **[CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md)** - CSV import feature guide

## Key Concepts

### Categories
Organizational buckets for transactions (e.g., "Food", "Transport"). Income categories are protected from deletion.

### Rules
Mappings from transaction text patterns to categories. When a rule exists, all matching transactions get that category.

### Locks (Exceptions)
Override automatic categorization for specific transactions. Useful when one transaction needs different treatment than the general rule.

### Example Scenario

```typescript
// Most KIWI purchases are groceries
state.rules = setRule(state.rules, 'KIWI', foodCategoryId);

// But this specific KIWI purchase was for cleaning supplies
state.locks = lockTransaction(
  state.locks,
  transaction.transactionId,
  householdCategoryId,
  'Cleaning supplies purchase'
);
```

## License

MIT

