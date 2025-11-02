/**
 * Store Integration with Persistence
 * Connects Zustand store with the persistence service
 */

import { useTransactionStore } from '../src/store';
import PersistenceService from './persistence';

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initializes the store by loading persisted data
 * Call this on application startup
 */
export async function initializeStore(): Promise<void> {
  console.log('🔧 Initializing store with persisted data...');

  try {
    // Initialize persistence directory
    await PersistenceService.init();

    // Check if data exists
    const hasData = await PersistenceService.exists();

    if (hasData) {
      console.log('📂 Loading persisted data...');
      const data = await PersistenceService.load();

      const store = useTransactionStore.getState();

      // Load transactions
      if (data.transactions && data.transactions.length > 0) {
        store.importTransactions(data.transactions);
        console.log(`  ✓ Loaded ${data.transactions.length} transactions`);
      }

      // Load hovedkategorier - use setState to avoid Immer issues
      if (data.hovedkategorier && data.hovedkategorier.length > 0) {
        useTransactionStore.setState((state) => {
          const newHovedkategorier = new Map(data.hovedkategorier);
          return { ...state, hovedkategorier: newHovedkategorier };
        });
        console.log(`  ✓ Loaded ${data.hovedkategorier.length} hovedkategorier`);
      }

      // Load underkategorier
      if (data.underkategorier && data.underkategorier.length > 0) {
        useTransactionStore.setState((state) => {
          const newUnderkategorier = new Map(data.underkategorier);
          return { ...state, underkategorier: newUnderkategorier };
        });
        console.log(`  ✓ Loaded ${data.underkategorier.length} underkategorier`);
      }

      // Load rules
      if (data.rules && data.rules.length > 0) {
        useTransactionStore.setState((state) => {
          const newRules = new Map(data.rules);
          return { ...state, rules: newRules };
        });
        console.log(`  ✓ Loaded ${data.rules.length} rules`);
      }

      // Load locks
      if (data.locks && data.locks.length > 0) {
        useTransactionStore.setState((state) => {
          const newLocks = new Map(data.locks);
          return { ...state, locks: newLocks };
        });
        console.log(`  ✓ Loaded ${data.locks.length} locks`);
      }

      // Re-apply rules to ensure consistency
      store.applyRulesToAll();

      console.log('✅ Store initialized with persisted data');
      console.log(`   Last saved: ${data.metadata.lastSaved}`);
    } else {
      console.log('ℹ️  No persisted data found, starting fresh');
    }
  } catch (error) {
    console.error('❌ Failed to initialize store:', error);
    console.log('   Starting with empty state');
  }
}

// ============================================================================
// Save Functions
// ============================================================================

/**
 * Saves the current store state to persistence
 */
export async function saveStoreState(): Promise<void> {
  const state = useTransactionStore.getState();

  await PersistenceService.save({
    transactions: state.transactions,
    hovedkategorier: state.hovedkategorier,
    underkategorier: state.underkategorier,
    rules: state.rules,
    locks: state.locks,
  });

  console.log('✓ Store state saved');
}

/**
 * Auto-saves the store state (debounced)
 */
export function autoSaveStore(): void {
  const getData = () => {
    const state = useTransactionStore.getState();
    return {
      transactions: state.transactions,
      hovedkategorier: state.hovedkategorier,
      underkategorier: state.underkategorier,
      rules: state.rules,
      locks: state.locks,
    };
  };

  PersistenceService.scheduleAutoSave(getData);
}

// ============================================================================
// Store Subscription for Auto-save
// ============================================================================

/**
 * Sets up automatic saving on store changes
 * Call this once on app startup after initializeStore()
 */
export function setupAutoSave(): () => void {
  console.log('🔄 Setting up auto-save on store changes...');

  const unsubscribe = useTransactionStore.subscribe((state, prevState) => {
    // Check if relevant state changed
    const hasChanges =
      state.transactions !== prevState.transactions ||
      state.hovedkategorier !== prevState.hovedkategorier ||
      state.underkategorier !== prevState.underkategorier ||
      state.rules !== prevState.rules ||
      state.locks !== prevState.locks;

    if (hasChanges) {
      autoSaveStore();
    }
  });

  console.log('✓ Auto-save enabled');
  return unsubscribe;
}

// ============================================================================
// Backup and Restore
// ============================================================================

/**
 * Creates a backup of the current state
 */
export async function backupCurrentState(): Promise<string> {
  const backupDir = await PersistenceService.backup();
  return backupDir;
}

/**
 * Exports current state to a file
 */
export async function exportCurrentState(filePath: string): Promise<void> {
  await PersistenceService.export(filePath);
}

/**
 * Imports state from a file and loads into store
 */
export async function importStateFromFile(filePath: string): Promise<void> {
  console.log(`📥 Importing data from: ${filePath}`);

  const data = await PersistenceService.import(filePath);
  const store = useTransactionStore.getState();

  // Load all data
  if (data.transactions) {
    store.importTransactions(data.transactions);
  }

  if (data.hovedkategorier) {
    useTransactionStore.setState((state) => {
      const newHovedkategorier = new Map(data.hovedkategorier);
      return { ...state, hovedkategorier: newHovedkategorier };
    });
  }

  if (data.underkategorier) {
    useTransactionStore.setState((state) => {
      const newUnderkategorier = new Map(data.underkategorier);
      return { ...state, underkategorier: newUnderkategorier };
    });
  }

  if (data.rules) {
    useTransactionStore.setState((state) => {
      const newRules = new Map(data.rules);
      return { ...state, rules: newRules };
    });
  }

  if (data.locks) {
    useTransactionStore.setState((state) => {
      const newLocks = new Map(data.locks);
      return { ...state, locks: newLocks };
    });
  }

  // Re-apply rules
  store.applyRulesToAll();

  console.log('✅ Data imported successfully');
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Gets persistence statistics
 */
export async function getPersistenceStats(): Promise<{
  files: Record<string, { exists: boolean; size: number }>;
  totalSize: number;
  lastModified?: Date;
}> {
  return await PersistenceService.stats();
}

/**
 * Displays storage information
 */
export async function displayStorageInfo(): Promise<void> {
  const stats = await getPersistenceStats();

  console.log('📊 Storage Statistics:');
  console.log(`   Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`   Last modified: ${stats.lastModified?.toLocaleString() || 'Never'}`);
  console.log();
  console.log('   Files:');
  
  for (const [name, info] of Object.entries(stats.files)) {
    const status = info.exists ? '✓' : '✗';
    const size = info.exists ? `${(info.size / 1024).toFixed(2)} KB` : 'N/A';
    console.log(`   ${status} ${name.padEnd(20)} ${size}`);
  }
}

// ============================================================================
// Complete Setup Helper
// ============================================================================

/**
 * Complete setup: Initialize and enable auto-save
 * Call this once on application startup
 */
export async function setupPersistence(): Promise<() => void> {
  // Initialize store with persisted data
  await initializeStore();

  // Setup auto-save
  const unsubscribe = setupAutoSave();

  console.log('✅ Persistence fully configured');

  // Return cleanup function
  return unsubscribe;
}

