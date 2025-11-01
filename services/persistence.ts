/**
 * Local Persistence Service
 * Handles saving and loading transactions, categories, rules, and exceptions
 * Uses JSON files for lightweight local storage
 */

import { promises as fs } from 'fs';
import { join } from 'path';
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

const DATA_DIR = join(process.cwd(), 'data', 'persistent');

const FILES = {
  transactions: join(DATA_DIR, 'transactions.json'),
  hovedkategorier: join(DATA_DIR, 'hovedkategorier.json'),
  underkategorier: join(DATA_DIR, 'underkategorier.json'),
  rules: join(DATA_DIR, 'rules.json'),
  locks: join(DATA_DIR, 'locks.json'),
  metadata: join(DATA_DIR, 'metadata.json'),
};

// ============================================================================
// Types
// ============================================================================

interface PersistedData {
  transactions: CategorizedTransaction[];
  hovedkategorier: Array<[string, Hovedkategori]>;
  underkategorier: Array<[string, Underkategori]>;
  rules: Array<[string, CategoryRule]>;
  locks: Array<[string, TransactionLock]>;
  metadata: {
    lastSaved: string;
    version: string;
  };
}

interface Metadata {
  lastSaved: string;
  version: string;
  transactionCount: number;
  categoryCount: number;
  ruleCount: number;
  lockCount: number;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Ensures the data directory exists
 */
export async function initializePersistence(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`✓ Persistence initialized at: ${DATA_DIR}`);
  } catch (error) {
    console.error('Failed to initialize persistence:', error);
    throw error;
  }
}

/**
 * Checks if persisted data exists
 */
export async function hasPersistentData(): Promise<boolean> {
  try {
    await fs.access(FILES.metadata);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Serializes Date objects to ISO strings
 */
function serializeDates<T>(obj: T): any {
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

/**
 * Deserializes ISO strings back to Date objects
 */
function deserializeDates<T>(obj: T): any {
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
// Save Functions
// ============================================================================

/**
 * Saves transactions to JSON file
 */
export async function saveTransactions(
  transactions: CategorizedTransaction[]
): Promise<void> {
  const data = serializeDates(transactions);
  await fs.writeFile(FILES.transactions, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Saves hovedkategorier to JSON file
 */
export async function saveHovedkategorier(
  hovedkategorier: Map<string, Hovedkategori>
): Promise<void> {
  const data = Array.from(hovedkategorier.entries());
  await fs.writeFile(FILES.hovedkategorier, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Saves underkategorier to JSON file
 */
export async function saveUnderkategorier(
  underkategorier: Map<string, Underkategori>
): Promise<void> {
  const data = Array.from(underkategorier.entries());
  await fs.writeFile(FILES.underkategorier, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Saves rules to JSON file
 */
export async function saveRules(rules: Map<string, CategoryRule>): Promise<void> {
  const data = Array.from(rules.entries()).map(([key, rule]) => [
    key,
    serializeDates(rule),
  ]);
  await fs.writeFile(FILES.rules, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Saves locks to JSON file
 */
export async function saveLocks(locks: Map<string, TransactionLock>): Promise<void> {
  const data = Array.from(locks.entries()).map(([key, lock]) => [
    key,
    serializeDates(lock),
  ]);
  await fs.writeFile(FILES.locks, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Saves metadata
 */
async function saveMetadata(metadata: Metadata): Promise<void> {
  await fs.writeFile(FILES.metadata, JSON.stringify(metadata, null, 2), 'utf-8');
}

/**
 * Saves all data at once (atomic save)
 */
export async function saveAll(data: {
  transactions: CategorizedTransaction[];
  hovedkategorier: Map<string, Hovedkategori>;
  underkategorier: Map<string, Underkategori>;
  rules: Map<string, CategoryRule>;
  locks: Map<string, TransactionLock>;
}): Promise<void> {
  await initializePersistence();

  // Save all files
  await Promise.all([
    saveTransactions(data.transactions),
    saveHovedkategorier(data.hovedkategorier),
    saveUnderkategorier(data.underkategorier),
    saveRules(data.rules),
    saveLocks(data.locks),
  ]);

  // Save metadata
  const metadata: Metadata = {
    lastSaved: new Date().toISOString(),
    version: '1.0.0',
    transactionCount: data.transactions.length,
    categoryCount: data.hovedkategorier.size + data.underkategorier.size,
    ruleCount: data.rules.size,
    lockCount: data.locks.size,
  };

  await saveMetadata(metadata);
}

// ============================================================================
// Load Functions
// ============================================================================

/**
 * Loads transactions from JSON file
 */
export async function loadTransactions(): Promise<CategorizedTransaction[]> {
  try {
    const data = await fs.readFile(FILES.transactions, 'utf-8');
    return deserializeDates(JSON.parse(data));
  } catch (error) {
    console.log('No transactions file found, returning empty array');
    return [];
  }
}

/**
 * Loads hovedkategorier from JSON file
 */
export async function loadHovedkategorier(): Promise<Map<string, Hovedkategori>> {
  try {
    const data = await fs.readFile(FILES.hovedkategorier, 'utf-8');
    const entries = JSON.parse(data);
    return new Map(entries);
  } catch (error) {
    console.log('No hovedkategorier file found, returning empty Map');
    return new Map();
  }
}

/**
 * Loads underkategorier from JSON file
 */
export async function loadUnderkategorier(): Promise<Map<string, Underkategori>> {
  try {
    const data = await fs.readFile(FILES.underkategorier, 'utf-8');
    const entries = JSON.parse(data);
    return new Map(entries);
  } catch (error) {
    console.log('No underkategorier file found, returning empty Map');
    return new Map();
  }
}

/**
 * Loads rules from JSON file
 */
export async function loadRules(): Promise<Map<string, CategoryRule>> {
  try {
    const data = await fs.readFile(FILES.rules, 'utf-8');
    const entries = JSON.parse(data);
    return new Map(
      entries.map(([key, rule]: [string, any]) => [key, deserializeDates(rule)])
    );
  } catch (error) {
    console.log('No rules file found, returning empty Map');
    return new Map();
  }
}

/**
 * Loads locks from JSON file
 */
export async function loadLocks(): Promise<Map<string, TransactionLock>> {
  try {
    const data = await fs.readFile(FILES.locks, 'utf-8');
    const entries = JSON.parse(data);
    return new Map(
      entries.map(([key, lock]: [string, any]) => [key, deserializeDates(lock)])
    );
  } catch (error) {
    console.log('No locks file found, returning empty Map');
    return new Map();
  }
}

/**
 * Loads metadata
 */
export async function loadMetadata(): Promise<Metadata | null> {
  try {
    const data = await fs.readFile(FILES.metadata, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Loads all data at once
 */
export async function loadAll(): Promise<PersistedData> {
  const [transactions, hovedkategorier, underkategorier, rules, locks, metadata] =
    await Promise.all([
      loadTransactions(),
      loadHovedkategorier(),
      loadUnderkategorier(),
      loadRules(),
      loadLocks(),
      loadMetadata(),
    ]);

  return {
    transactions,
    hovedkategorier: Array.from(hovedkategorier.entries()),
    underkategorier: Array.from(underkategorier.entries()),
    rules: Array.from(rules.entries()),
    locks: Array.from(locks.entries()),
    metadata: metadata || {
      lastSaved: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a backup of all data files
 */
export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(process.cwd(), 'data', 'backups', timestamp);

  await fs.mkdir(backupDir, { recursive: true });

  // Copy all files to backup
  const filesToBackup = Object.entries(FILES);
  for (const [name, path] of filesToBackup) {
    try {
      const backupPath = join(backupDir, `${name}.json`);
      await fs.copyFile(path, backupPath);
    } catch (error) {
      // File might not exist, skip
    }
  }

  console.log(`✓ Backup created at: ${backupDir}`);
  return backupDir;
}

/**
 * Clears all persisted data
 */
export async function clearAll(): Promise<void> {
  const files = Object.values(FILES);
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.unlink(file);
      } catch {
        // File might not exist
      }
    })
  );
  console.log('✓ All persisted data cleared');
}

/**
 * Gets storage statistics
 */
export async function getStorageStats(): Promise<{
  files: Record<string, { exists: boolean; size: number }>;
  totalSize: number;
  lastModified?: Date;
}> {
  const stats: Record<string, { exists: boolean; size: number }> = {};
  let totalSize = 0;

  for (const [name, path] of Object.entries(FILES)) {
    try {
      const stat = await fs.stat(path);
      stats[name] = { exists: true, size: stat.size };
      totalSize += stat.size;
    } catch {
      stats[name] = { exists: false, size: 0 };
    }
  }

  const metadata = await loadMetadata();

  return {
    files: stats,
    totalSize,
    lastModified: metadata ? new Date(metadata.lastSaved) : undefined,
  };
}

/**
 * Exports all data as a single JSON file (for backup/sharing)
 */
export async function exportToFile(filePath: string): Promise<void> {
  const data = await loadAll();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Data exported to: ${filePath}`);
}

/**
 * Imports data from a single JSON file
 */
export async function importFromFile(filePath: string): Promise<PersistedData> {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  // Validate data structure
  if (!data.transactions || !data.hovedkategorier || !data.underkategorier) {
    throw new Error('Invalid data format');
  }

  return deserializeDates(data);
}

// ============================================================================
// Auto-save Manager
// ============================================================================

let autoSaveTimeout: NodeJS.Timeout | null = null;
const AUTO_SAVE_DELAY = 1000; // 1 second debounce

/**
 * Schedules an auto-save (debounced)
 */
export function scheduleAutoSave(
  getData: () => {
    transactions: CategorizedTransaction[];
    hovedkategorier: Map<string, Hovedkategori>;
    underkategorier: Map<string, Underkategori>;
    rules: Map<string, CategoryRule>;
    locks: Map<string, TransactionLock>;
  }
): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  autoSaveTimeout = setTimeout(async () => {
    try {
      const data = getData();
      await saveAll(data);
      console.log('✓ Auto-saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, AUTO_SAVE_DELAY);
}

/**
 * Forces an immediate save
 */
export async function forceSave(data: {
  transactions: CategorizedTransaction[];
  hovedkategorier: Map<string, Hovedkategori>;
  underkategorier: Map<string, Underkategori>;
  rules: Map<string, CategoryRule>;
  locks: Map<string, TransactionLock>;
}): Promise<void> {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
  await saveAll(data);
}

// ============================================================================
// Browser Storage Adapter (for web apps)
// ============================================================================

/**
 * Browser-compatible storage using localStorage
 */
export const browserStorage = {
  async saveAll(data: {
    transactions: CategorizedTransaction[];
    hovedkategorier: Map<string, Hovedkategori>;
    underkategorier: Map<string, Underkategori>;
    rules: Map<string, CategoryRule>;
    locks: Map<string, TransactionLock>;
  }): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage not available');
    }

    const persistedData: PersistedData = {
      transactions: data.transactions,
      hovedkategorier: Array.from(data.hovedkategorier.entries()),
      underkategorier: Array.from(data.underkategorier.entries()),
      rules: Array.from(data.rules.entries()).map(([key, rule]) => [
        key,
        serializeDates(rule),
      ]) as any,
      locks: Array.from(data.locks.entries()).map(([key, lock]) => [
        key,
        serializeDates(lock),
      ]) as any,
      metadata: {
        lastSaved: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    localStorage.setItem('transaction-app-data', JSON.stringify(persistedData));
  },

  async loadAll(): Promise<PersistedData | null> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const stored = localStorage.getItem('transaction-app-data');
    if (!stored) return null;

    const data = JSON.parse(stored);
    return deserializeDates(data);
  },

  async clear(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('transaction-app-data');
    }
  },
};

// ============================================================================
// High-Level API
// ============================================================================

/**
 * Complete persistence service
 */
export const PersistenceService = {
  /**
   * Initialize persistence (create directories)
   */
  async init(): Promise<void> {
    await initializePersistence();
  },

  /**
   * Check if data exists
   */
  async exists(): Promise<boolean> {
    return await hasPersistentData();
  },

  /**
   * Save all data
   */
  async save(data: {
    transactions: CategorizedTransaction[];
    hovedkategorier: Map<string, Hovedkategori>;
    underkategorier: Map<string, Underkategori>;
    rules: Map<string, CategoryRule>;
    locks: Map<string, TransactionLock>;
  }): Promise<void> {
    await saveAll(data);
  },

  /**
   * Load all data
   */
  async load(): Promise<PersistedData> {
    return await loadAll();
  },

  /**
   * Create backup
   */
  async backup(): Promise<string> {
    return await createBackup();
  },

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    await clearAll();
  },

  /**
   * Get statistics
   */
  async stats(): Promise<{
    files: Record<string, { exists: boolean; size: number }>;
    totalSize: number;
    lastModified?: Date;
  }> {
    return await getStorageStats();
  },

  /**
   * Export to file
   */
  async export(filePath: string): Promise<void> {
    await exportToFile(filePath);
  },

  /**
   * Import from file
   */
  async import(filePath: string): Promise<PersistedData> {
    return await importFromFile(filePath);
  },

  /**
   * Auto-save (debounced)
   */
  scheduleAutoSave(getData: () => any): void {
    scheduleAutoSave(getData);
  },

  /**
   * Force immediate save
   */
  async forceSave(data: any): Promise<void> {
    await forceSave(data);
  },
};

// ============================================================================
// Browser-compatible version
// ============================================================================

export const BrowserPersistenceService = {
  async save(data: any): Promise<void> {
    await browserStorage.saveAll(data);
  },

  async load(): Promise<PersistedData | null> {
    return await browserStorage.loadAll();
  },

  async clear(): Promise<void> {
    await browserStorage.clear();
  },
};

export default PersistenceService;

