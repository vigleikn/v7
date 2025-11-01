/**
 * Browser Persistence Service
 * localStorage-based persistence for React apps
 */

import { useTransactionStore } from '../store';
import {
  CategorizedTransaction,
  Hovedkategori,
  Underkategori,
} from '../store';
import {
  CategoryRule,
  TransactionLock,
} from '../categoryEngine';

// ============================================================================
// Configuration
// ============================================================================

const STORAGE_KEY = 'transaction-app-data';
const STORAGE_VERSION = '1.0.0';

// ============================================================================
// Types
// ============================================================================

interface PersistedData {
  version: string;
  lastSaved: string;
  transactions: CategorizedTransaction[];
  hovedkategorier: Array<[string, Hovedkategori]>;
  underkategorier: Array<[string, Underkategori]>;
  rules: Array<[string, any]>;
  locks: Array<[string, any]>;
}

// ============================================================================
// Serialization Helpers
// ============================================================================

function serializeDates(obj: any): any {
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeDates);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result;
  }
  return obj;
}

function deserializeDates(obj: any): any {
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    return new Date(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deserializeDates);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deserializeDates(value);
    }
    return result;
  }
  return obj;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Saves current store state to localStorage
 */
export function saveToBrowser(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('localStorage not available');
    return;
  }

  const state = useTransactionStore.getState();

  const data: PersistedData = {
    version: STORAGE_VERSION,
    lastSaved: new Date().toISOString(),
    transactions: state.transactions,
    hovedkategorier: Array.from(state.hovedkategorier.entries()),
    underkategorier: Array.from(state.underkategorier.entries()),
    rules: Array.from(state.rules.entries()).map(([key, rule]) => [
      key,
      serializeDates(rule),
    ]),
    locks: Array.from(state.locks.entries()).map(([key, lock]) => [
      key,
      serializeDates(lock),
    ]),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('✓ Saved to browser storage');
  } catch (error) {
    console.error('Failed to save to browser:', error);
  }
}

/**
 * Loads data from localStorage into the store
 */
export function loadFromBrowser(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('localStorage not available');
    return false;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('No saved data found in browser');
      return false;
    }

    const data: PersistedData = deserializeDates(JSON.parse(stored));

    // Validate version
    if (data.version !== STORAGE_VERSION) {
      console.warn(`Version mismatch: ${data.version} vs ${STORAGE_VERSION}`);
      // Could add migration logic here
    }

    const state = useTransactionStore.getState();

    // Load transactions
    if (data.transactions && data.transactions.length > 0) {
      state.importTransactions(data.transactions);
      console.log(`✓ Loaded ${data.transactions.length} transactions`);
    }

    // Load hovedkategorier - use setState to avoid Immer issues
    if (data.hovedkategorier && data.hovedkategorier.length > 0) {
      useTransactionStore.setState((state) => {
        const newHovedkategorier = new Map(data.hovedkategorier);
        return { ...state, hovedkategorier: newHovedkategorier };
      });
      console.log(`✓ Loaded ${data.hovedkategorier.length} hovedkategorier`);
    }

    // Load underkategorier
    if (data.underkategorier && data.underkategorier.length > 0) {
      useTransactionStore.setState((state) => {
        const newUnderkategorier = new Map(data.underkategorier);
        return { ...state, underkategorier: newUnderkategorier };
      });
      console.log(`✓ Loaded ${data.underkategorier.length} underkategorier`);
    }

    // Load rules
    if (data.rules && data.rules.length > 0) {
      useTransactionStore.setState((state) => {
        const newRules = new Map(data.rules);
        return { ...state, rules: newRules };
      });
      console.log(`✓ Loaded ${data.rules.length} rules`);
    }

    // Load locks
    if (data.locks && data.locks.length > 0) {
      useTransactionStore.setState((state) => {
        const newLocks = new Map(data.locks);
        return { ...state, locks: newLocks };
      });
      console.log(`✓ Loaded ${data.locks.length} locks`);
    }

    // Re-apply rules for consistency
    state.applyRulesToAll();

    console.log(`✓ Loaded from browser storage (saved: ${new Date(data.lastSaved).toLocaleString()})`);
    return true;
  } catch (error) {
    console.error('Failed to load from browser:', error);
    return false;
  }
}

/**
 * Clears all data from localStorage
 */
export function clearBrowserStorage(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✓ Browser storage cleared');
  }
}

/**
 * Sets up auto-save for browser (saves on every change)
 */
export function setupBrowserAutoSave(): () => void {
  if (typeof window === 'undefined') {
    console.warn('Not in browser environment');
    return () => {};
  }

  console.log('🔄 Setting up browser auto-save...');

  let saveTimeout: NodeJS.Timeout | null = null;

  const unsubscribe = useTransactionStore.subscribe((state, prevState) => {
    // Check if relevant state changed
    const hasChanges =
      state.transactions !== prevState.transactions ||
      state.hovedkategorier !== prevState.hovedkategorier ||
      state.underkategorier !== prevState.underkategorier ||
      state.rules !== prevState.rules ||
      state.locks !== prevState.locks;

    if (hasChanges) {
      // Debounce saves
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveToBrowser();
      }, 500);
    }
  });

  console.log('✓ Browser auto-save enabled');
  return unsubscribe;
}

/**
 * Complete browser setup: Load and enable auto-save
 */
export function setupBrowserPersistence(): () => void {
  console.log('📦 Setting up browser persistence...');
  
  // Load existing data
  loadFromBrowser();

  // Setup auto-save
  const unsubscribe = setupBrowserAutoSave();

  console.log('✅ Browser persistence ready');
  
  return unsubscribe;
}

/**
 * Gets storage size information
 */
export function getBrowserStorageInfo(): {
  size: number;
  sizeKB: number;
  lastSaved?: string;
} | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { size: 0, sizeKB: 0 };
  }

  try {
    const data = JSON.parse(stored);
    const size = new Blob([stored]).size;
    
    return {
      size,
      sizeKB: Math.round(size / 1024 * 100) / 100,
      lastSaved: data.lastSaved,
    };
  } catch {
    return null;
  }
}

