/**
 * Browser Persistence Service
 *
 * IMPORTANT:
 * - `transaction-store` (Zustand persist) is the single source of truth.
 * - `transaction-app-data` is legacy and only read for one-time migration.
 */

import { useTransactionStore } from '../src/store';
import {
  CategorizedTransaction,
  Hovedkategori,
  Underkategori,
} from '../src/store';
import {
  CategoryRule,
  TransactionLock,
  migrateRulesMapFromPersist,
} from '../categoryEngine';

const LEGACY_STORAGE_KEY = 'transaction-app-data';
const LEGACY_MIGRATION_MARKER = 'transaction-app-data-migrated-v2';
const ZUSTAND_STORAGE_KEY = 'transaction-store';

const normalizeDateToIso = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.includes('-')) {
    const [year, month, day] = trimmed.split('-');
    if (!year || !month) return '';
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${(day || '01').padStart(2, '0')}`;
  }

  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length === 3) {
      const [day, month, yearRaw] = parts;
      if (!day || !month || !yearRaw) return '';
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw.padStart(4, '0');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return '';
};

const extractYearMonth = (dateValue: unknown): string | null => {
  if (typeof dateValue !== 'string') return null;
  const trimmed = dateValue.trim();
  if (!trimmed) return null;

  if (trimmed.includes('-')) {
    const [year, month] = trimmed.split('-');
    if (!year || !month) return null;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}`;
  }

  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length !== 3) return null;
    const [, month, yearRaw] = parts;
    if (!month || !yearRaw) return null;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw.padStart(4, '0');
    return `${year}-${month.padStart(2, '0')}`;
  }

  return null;
};

const getEarliestMonth = (transactions: Array<{ dato?: string }>): string | null => {
  const months = transactions
    .map((tx) => extractYearMonth(tx.dato))
    .filter((m): m is string => Boolean(m));
  if (months.length === 0) return null;
  return months.reduce((min, current) => (current < min ? current : min));
};

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
  budgets: Array<[string, number]>;
  startBalance: { amount: number; date: string } | null;
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
 * Legacy no-op.
 * State is persisted by Zustand (`transaction-store`) automatically.
 */
export function saveToBrowser(): void {
  return;
}

/**
 * Loads legacy data from `transaction-app-data` into store (one-time migration).
 * Returns true if migration loaded any data into state.
 */
export function loadFromBrowser(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('localStorage not available');
    return false;
  }

  try {
    const hasLegacyBeenMigrated = localStorage.getItem(LEGACY_MIGRATION_MARKER);
    const zustandRaw = localStorage.getItem(ZUSTAND_STORAGE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (hasLegacyBeenMigrated) {
      return false;
    }

    if (!legacyRaw) {
      // Nothing legacy to migrate.
      return false;
    }

    // If canonical key exists, only prefer legacy when it clearly contains
    // richer history (safety against partial/corrupt canonical state).
    if (zustandRaw) {
      try {
        const parsedZustand = JSON.parse(zustandRaw);
        const canonicalTxs = Array.isArray(parsedZustand?.state?.transactions)
          ? parsedZustand.state.transactions
          : [];
        const legacyPreview = JSON.parse(legacyRaw);
        const legacyTxs = Array.isArray(legacyPreview?.transactions)
          ? legacyPreview.transactions
          : [];

        const canonicalCount = canonicalTxs.length;
        const legacyCount = legacyTxs.length;
        const canonicalEarliest = getEarliestMonth(canonicalTxs);
        const legacyEarliest = getEarliestMonth(legacyTxs);

        const canonicalLooksEmpty = canonicalCount === 0 && legacyCount > 0;
        const legacyLooksRicher =
          legacyCount > canonicalCount &&
          Boolean(canonicalEarliest && legacyEarliest && legacyEarliest < canonicalEarliest);

        if (!canonicalLooksEmpty && !legacyLooksRicher) {
          console.warn(
            '[Persistence] Found both transaction-store and legacy transaction-app-data. ' +
              'Using transaction-store and skipping legacy import.'
          );
          localStorage.setItem(LEGACY_MIGRATION_MARKER, new Date().toISOString());
          return false;
        }

        console.warn(
          '[Persistence] Legacy storage appears richer than canonical state. ' +
            'Using legacy data once to recover history.'
        );
      } catch {
        localStorage.setItem(LEGACY_MIGRATION_MARKER, new Date().toISOString());
        return false;
      }
    }

    const data: PersistedData = deserializeDates(JSON.parse(legacyRaw));

    const loadedTxCount = Array.isArray(data.transactions) ? data.transactions.length : 0;
    if (loadedTxCount === 0) {
      localStorage.setItem(LEGACY_MIGRATION_MARKER, new Date().toISOString());
      return false;
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
        const newRules = migrateRulesMapFromPersist(new Map(data.rules));
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

    // Load budgets
    useTransactionStore.setState((state) => {
      const budgets = data.budgets ? new Map(data.budgets) : new Map();
      return { ...state, budgets };
    });

    // Load start balance
    useTransactionStore.setState((state) => ({
      ...state,
      startBalance: data.startBalance
        ? {
            amount: Math.round(Number(data.startBalance.amount)),
            date: normalizeDateToIso(data.startBalance.date),
          }
        : null,
    }));

    // Re-apply rules for consistency
    state.applyRulesToAll();

    // Mark migration as complete and remove legacy key to eliminate ambiguity.
    localStorage.setItem(LEGACY_MIGRATION_MARKER, new Date().toISOString());
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    console.log(
      `✓ Migrated legacy browser storage (saved: ${new Date(data.lastSaved).toLocaleString()})`
    );
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
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_MIGRATION_MARKER);
    console.log('✓ Legacy browser storage cleared');
  }
}

/**
 * Legacy no-op.
 * Zustand persist already handles auto-save.
 */
export function setupBrowserAutoSave(): () => void {
  return () => {};
}

/**
 * Complete browser setup:
 * - migrate legacy key once (if canonical key is missing)
 * - no extra autosave layer
 */
export function setupBrowserPersistence(): () => void {
  console.log('📦 Setting up browser persistence (single-source mode)...');
  
  // One-time legacy migration if needed.
  loadFromBrowser();

  console.log('✅ Browser persistence ready');
  
  return () => {};
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

  const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
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

