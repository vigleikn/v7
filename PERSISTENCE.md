# Local Persistence Service

Complete local persistence for transactions, categories, rules, and exceptions using JSON files.

## Overview

Two persistence options:
1. **File-based** (Node.js) - JSON files in `data/persistent/`
2. **Browser-based** (Web) - localStorage

## Features

✅ **Automatic persistence** of:
- Transactions
- Hovedkategorier and underkategorier
- Categorization rules
- Exception locks

✅ **Auto-save** - Debounced saves on state changes  
✅ **Backup system** - Create timestamped backups  
✅ **Import/Export** - Single file data transfer  
✅ **Statistics** - Storage size and file info  
✅ **Type-safe** - Full TypeScript support  

## Installation

No additional dependencies needed - uses Node.js `fs` module for file storage.

## Usage

### Node.js Environment

#### Basic Setup

```typescript
import { setupPersistence } from './services/storeIntegration';

// Initialize on app startup
async function main() {
  // Loads persisted data and enables auto-save
  const unsubscribe = await setupPersistence();
  
  // Your app code...
  
  // Cleanup on shutdown
  unsubscribe();
}
```

#### Manual Save/Load

```typescript
import {
  saveStoreState,
  initializeStore,
} from './services/storeIntegration';

// Load data
await initializeStore();

// Make changes...

// Save manually
await saveStoreState();
```

#### Create Backup

```typescript
import { backupCurrentState } from './services/storeIntegration';

const backupDir = await backupCurrentState();
console.log(`Backup created: ${backupDir}`);
```

#### Import/Export

```typescript
import {
  exportCurrentState,
  importStateFromFile,
} from './services/storeIntegration';

// Export
await exportCurrentState('./my-data.json');

// Import
await importStateFromFile('./my-data.json');
```

### Browser/React Environment

#### Basic Setup

```tsx
import { setupBrowserPersistence } from './services/browserPersistence';

function App() {
  useEffect(() => {
    // Loads from localStorage and enables auto-save
    const unsubscribe = setupBrowserPersistence();
    
    return () => {
      unsubscribe();
    };
  }, []);

  return <YourApp />;
}
```

#### Manual Operations

```typescript
import {
  saveToBrowser,
  loadFromBrowser,
  clearBrowserStorage,
  getBrowserStorageInfo,
} from './services/browserPersistence';

// Load
loadFromBrowser();

// Save
saveToBrowser();

// Clear all
clearBrowserStorage();

// Get info
const info = getBrowserStorageInfo();
console.log(`Storage size: ${info.sizeKB} KB`);
```

## File Structure

### Node.js Storage

```
data/
├── persistent/
│   ├── transactions.json       # All transactions
│   ├── hovedkategorier.json    # Main categories
│   ├── underkategorier.json    # Subcategories
│   ├── rules.json              # Categorization rules
│   ├── locks.json              # Exception locks
│   └── metadata.json           # Storage metadata
└── backups/
    └── 2025-10-31T10-30-45/
        ├── transactions.json
        ├── hovedkategorier.json
        └── ...
```

### Browser Storage

All data stored in single localStorage key:
```
localStorage['transaction-app-data'] = {
  version: "1.0.0",
  lastSaved: "2025-10-31T...",
  transactions: [...],
  hovedkategorier: [...],
  underkategorier: [...],
  rules: [...],
  locks: [...]
}
```

## API Reference

### PersistenceService (Node.js)

```typescript
import PersistenceService from './services/persistence';

// Initialize
await PersistenceService.init();

// Check if data exists
const exists = await PersistenceService.exists();

// Save all
await PersistenceService.save({
  transactions,
  hovedkategorier,
  underkategorier,
  rules,
  locks,
});

// Load all
const data = await PersistenceService.load();

// Backup
const backupDir = await PersistenceService.backup();

// Clear all
await PersistenceService.clear();

// Get stats
const stats = await PersistenceService.stats();

// Export/Import
await PersistenceService.export('./export.json');
const data = await PersistenceService.import('./import.json');
```

### Store Integration Functions

```typescript
import {
  setupPersistence,
  initializeStore,
  saveStoreState,
  autoSaveStore,
  backupCurrentState,
  exportCurrentState,
  importStateFromFile,
  getPersistenceStats,
  displayStorageInfo,
} from './services/storeIntegration';

// Complete setup (recommended)
const unsubscribe = await setupPersistence();

// Individual operations
await initializeStore();          // Load data
await saveStoreState();           // Save data
autoSaveStore();                  // Trigger auto-save
const backup = await backupCurrentState();
await exportCurrentState('./export.json');
await importStateFromFile('./import.json');
await displayStorageInfo();       // Console output
```

### Browser Persistence Functions

```typescript
import {
  setupBrowserPersistence,
  saveToBrowser,
  loadFromBrowser,
  clearBrowserStorage,
  setupBrowserAutoSave,
  getBrowserStorageInfo,
} from './services/browserPersistence';

// Complete setup (recommended)
const unsubscribe = setupBrowserPersistence();

// Individual operations
saveToBrowser();
const loaded = loadFromBrowser();  // Returns true if data found
clearBrowserStorage();
const info = getBrowserStorageInfo();
```

## Auto-Save

### How it Works

1. Store changes are detected via subscription
2. Save is debounced (1 second for Node.js, 500ms for browser)
3. Data is automatically persisted

### Debouncing

Multiple rapid changes trigger only one save:
```
Change 1 → Start timer (1s)
Change 2 → Reset timer (1s)
Change 3 → Reset timer (1s)
... 1s passes → Save!
```

### Manual Save

Force immediate save without debounce:
```typescript
await PersistenceService.forceSave(data);
```

## Data Format

### Transactions

```json
[
  {
    "transactionId": "2025-10-01|...",
    "dato": "2025-10-01",
    "beløp": -235.50,
    "tekst": "KIWI",
    "categoryId": "cat_123",
    "isLocked": false,
    ...
  }
]
```

### Categories

```json
[
  ["cat_123", {
    "id": "cat_123",
    "name": "Mat",
    "type": "hovedkategori",
    "underkategorier": ["cat_456"],
    "color": "#10b981",
    "icon": "🍕"
  }]
]
```

### Rules

```json
[
  ["kiwi", {
    "tekst": "kiwi",
    "categoryId": "cat_123",
    "createdAt": "2025-10-31T...",
    "updatedAt": "2025-10-31T..."
  }]
]
```

### Locks

```json
[
  ["tx_123", {
    "transactionId": "tx_123",
    "categoryId": "cat_456",
    "lockedAt": "2025-10-31T...",
    "reason": "Special case"
  }]
]
```

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  await PersistenceService.load();
} catch (error) {
  console.error('Load failed:', error);
  // Store starts with empty state
}
```

## Migration

### From v0 to v1

```typescript
const data = await PersistenceService.load();

if (data.metadata.version === '0.9.0') {
  // Perform migration
  const migrated = migrateFromV0(data);
  await PersistenceService.save(migrated);
}
```

## Backup Strategy

### Automatic Backups

Create backup before major operations:

```typescript
// Before bulk import
await backupCurrentState();
await importStateFromFile('./new-data.json');
```

### Restore from Backup

```typescript
// List backups
const backups = await fs.readdir('./data/backups');

// Restore from specific backup
await importStateFromFile('./data/backups/2025-10-31T10-30-45/export.json');
```

## Storage Limits

### Browser (localStorage)

- Typical limit: 5-10 MB
- Monitor with `getBrowserStorageInfo()`
- Compress/archive old data if needed

### File-based (Node.js)

- No practical limit
- Monitor with `getStorageStats()`

## Testing

Run the persistence demo:

```bash
npm run persistence:demo
```

This will:
1. Initialize persistence
2. Add sample data
3. Save to files
4. Create backup
5. Export to single file
6. Display statistics

## Integration Examples

### React App with Persistence

```tsx
import { setupBrowserPersistence } from './services/browserPersistence';

function App() {
  useEffect(() => {
    const unsubscribe = setupBrowserPersistence();
    return unsubscribe;
  }, []);

  return <YourApp />;
}
```

### Node.js CLI with Persistence

```typescript
import { setupPersistence } from './services/storeIntegration';

async function main() {
  await setupPersistence();
  
  // Your CLI logic...
}

main();
```

### Electron App

Use Node.js file-based persistence:

```typescript
import { setupPersistence } from './services/storeIntegration';

app.on('ready', async () => {
  await setupPersistence();
  createWindow();
});

app.on('quit', async () => {
  await saveStoreState();
});
```

## Best Practices

### 1. Initialize Once

```typescript
// ✅ Good
useEffect(() => {
  setupBrowserPersistence();
}, []); // Empty deps

// ❌ Bad
useEffect(() => {
  setupBrowserPersistence();
}); // No deps - runs every render
```

### 2. Backup Before Imports

```typescript
// Create backup before importing
await backupCurrentState();
await importStateFromFile('./new-data.json');
```

### 3. Handle Load Failures

```typescript
try {
  await setupPersistence();
} catch (error) {
  console.error('Failed to load data:', error);
  // App continues with empty state
}
```

### 4. Save Before Exit

```typescript
// Browser
window.addEventListener('beforeunload', () => {
  saveToBrowser();
});

// Node.js
process.on('SIGINT', async () => {
  await saveStoreState();
  process.exit(0);
});
```

## Troubleshooting

### Data Not Persisting

Check console for errors:
```typescript
const stats = await getPersistenceStats();
console.log(stats);
```

### localStorage Full

```typescript
const info = getBrowserStorageInfo();
if (info && info.sizeKB > 4000) {
  // Near 4MB limit, clean up old data
  clearOldTransactions();
}
```

### Corrupted Data

```typescript
// Clear and start fresh
await PersistenceService.clear();
useTransactionStore.getState().reset();
```

## Files Created

```
services/
├── persistence.ts           # Core persistence service (Node.js)
├── storeIntegration.ts     # Zustand store integration
└── browserPersistence.ts   # Browser/localStorage version

persistenceDemo.ts          # Demo script
```

## Performance

- **Auto-save debounce**: 1 second (Node.js), 500ms (browser)
- **Atomic saves**: All files saved together
- **Async I/O**: Non-blocking operations
- **Minimal overhead**: JSON serialization only

## Security

- Data stored in plain JSON
- No encryption by default
- For sensitive data, consider encryption layer

## License

MIT

