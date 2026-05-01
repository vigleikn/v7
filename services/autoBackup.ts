/**
 * Auto Backup Service
 * Automatic daily backup to JSON file with browser download
 */

import { useTransactionStore } from '../src/store';

// ============================================================================
// Constants
// ============================================================================

const LAST_BACKUP_KEY = 'last-backup-date';
const AUTO_BACKUP_DIRECTORY_NAME_KEY = 'auto-backup-directory-name';
const AUTO_BACKUP_LAST_COMPLETED_AT_KEY = 'auto-backup-last-completed-at';
const AUTO_BACKUP_LAST_FILENAME_KEY = 'auto-backup-last-filename';
const DIRECTORY_HANDLE_DB_NAME = 'transaction-auto-backup';
const DIRECTORY_HANDLE_STORE_NAME = 'handles';
const DIRECTORY_HANDLE_KEY = 'backup-directory';
const BACKUP_VERSION = '1.0.0';

// ============================================================================
// Types
// ============================================================================

export interface BackupData {
  version: string;
  backupDate: string;
  data: {
    transactions: any[];
    hovedkategorier: any[];
    underkategorier: any[];
    rules: any[];
    locks: any[];
    budgets: any[];
    startBalance: { amount: number; date: string } | null;
  };
  metadata: {
    transactionCount: number;
    categoryCount: number;
    ruleCount: number;
  };
}

interface FileSystemWritableFileStreamLike {
  write: (data: string) => Promise<void> | void;
  close: () => Promise<void> | void;
}

interface FileSystemFileHandleLike {
  createWritable: () => Promise<FileSystemWritableFileStreamLike>;
}

interface FileSystemDirectoryHandleLike {
  name: string;
  getFileHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<FileSystemFileHandleLike>;
  queryPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

export interface AutoBackupStatus {
  supportsDirectoryPicker: boolean;
  directoryName: string | null;
  lastCompletedAt: string | null;
  lastFilename: string | null;
  needsBackup: boolean;
}

export interface AutoBackupResult {
  success: boolean;
  mode?: 'directory' | 'download';
  filename?: string;
  directoryName?: string;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createBackupFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `transaction-backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;
}

/**
 * Check if backup is needed today
 */
export function shouldBackupToday(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  const lastBackupDate = localStorage.getItem(LAST_BACKUP_KEY);
  const today = getTodayDate();

  return lastBackupDate !== today;
}

/**
 * Mark backup as completed for today
 */
function markBackupCompleted(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(LAST_BACKUP_KEY, getTodayDate());
  }
}

function recordBackupCompleted(filename: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  localStorage.setItem(LAST_BACKUP_KEY, getTodayDate());
  localStorage.setItem(AUTO_BACKUP_LAST_COMPLETED_AT_KEY, new Date().toISOString());
  localStorage.setItem(AUTO_BACKUP_LAST_FILENAME_KEY, filename);
}

export function getAutoBackupStatus(): AutoBackupStatus {
  const supportsDirectoryPicker =
    typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      supportsDirectoryPicker,
      directoryName: null,
      lastCompletedAt: null,
      lastFilename: null,
      needsBackup: false,
    };
  }

  return {
    supportsDirectoryPicker,
    directoryName: localStorage.getItem(AUTO_BACKUP_DIRECTORY_NAME_KEY),
    lastCompletedAt: localStorage.getItem(AUTO_BACKUP_LAST_COMPLETED_AT_KEY),
    lastFilename: localStorage.getItem(AUTO_BACKUP_LAST_FILENAME_KEY),
    needsBackup: shouldBackupToday(),
  };
}

function openDirectoryHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DIRECTORY_HANDLE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(DIRECTORY_HANDLE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open backup settings'));
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandleLike): Promise<void> {
  const db = await openDirectoryHandleDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DIRECTORY_HANDLE_STORE_NAME, 'readwrite');
    tx.objectStore(DIRECTORY_HANDLE_STORE_NAME).put(handle, DIRECTORY_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save backup folder'));
  });

  db.close();
}

async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandleLike | null> {
  try {
    const db = await openDirectoryHandleDb();

    const handle = await new Promise<FileSystemDirectoryHandleLike | null>((resolve, reject) => {
      const tx = db.transaction(DIRECTORY_HANDLE_STORE_NAME, 'readonly');
      const request = tx.objectStore(DIRECTORY_HANDLE_STORE_NAME).get(DIRECTORY_HANDLE_KEY);
      request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandleLike) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Could not load backup folder'));
    });

    db.close();
    return handle;
  } catch {
    return null;
  }
}

async function hasDirectoryWritePermission(
  handle: FileSystemDirectoryHandleLike,
  requestPermission: boolean
): Promise<boolean> {
  if (!handle.queryPermission) return true;

  const options = { mode: 'readwrite' as const };
  const existingPermission = await handle.queryPermission(options);
  if (existingPermission === 'granted') return true;
  if (!requestPermission || !handle.requestPermission) return false;

  return (await handle.requestPermission(options)) === 'granted';
}

export async function chooseAutoBackupDirectory(): Promise<AutoBackupResult> {
  if (typeof window === 'undefined' || typeof (window as any).showDirectoryPicker !== 'function') {
    return {
      success: false,
      error: 'Nettleseren støtter ikke automatisk lagring til valgt mappe.',
    };
  }

  try {
    const handle = (await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    })) as FileSystemDirectoryHandleLike;

    await saveDirectoryHandle(handle);
    localStorage.setItem(AUTO_BACKUP_DIRECTORY_NAME_KEY, handle.name);

    return {
      success: true,
      mode: 'directory',
      directoryName: handle.name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Kunne ikke velge backupmappe',
    };
  }
}

export async function clearAutoBackupDirectory(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(AUTO_BACKUP_DIRECTORY_NAME_KEY);
  }

  try {
    const db = await openDirectoryHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DIRECTORY_HANDLE_STORE_NAME, 'readwrite');
      tx.objectStore(DIRECTORY_HANDLE_STORE_NAME).delete(DIRECTORY_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not clear backup folder'));
    });
    db.close();
  } catch {
    // If IndexedDB is unavailable, removing local metadata is enough.
  }
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Create backup data from current store state
 */
export function createBackupData(): BackupData {
  const state = useTransactionStore.getState();

  // Safe extraction with fallbacks for potentially undefined fields
  const transactions = state.transactions || [];
  const hovedkategorier = state.hovedkategorier ? Array.from(state.hovedkategorier.entries()) : [];
  const underkategorier = state.underkategorier ? Array.from(state.underkategorier.entries()) : [];
  const rules = state.rules ? Array.from(state.rules.entries()) : [];
  const locks = state.locks ? Array.from(state.locks.entries()) : [];
  
  // Only include budgets if they exist and are valid
  let budgets: any[] = [];
  let startBalance: { amount: number; date: string } | null = null;
  
  if (state.budgets && typeof state.budgets === 'object' && 'entries' in state.budgets) {
    try {
      budgets = Array.from(state.budgets.entries());
      if (state.startBalance && Number.isFinite(state.startBalance.amount)) {
        startBalance = {
          amount: Math.round(Number(state.startBalance.amount)),
          date: state.startBalance.date,
        };
      }
    } catch (error) {
      console.warn('⚠️  Could not export budgets:', error);
    }
  }

  const backupData: BackupData = {
    version: BACKUP_VERSION,
    backupDate: new Date().toISOString(),
    data: {
      transactions,
      hovedkategorier,
      underkategorier,
      rules,
      locks,
      budgets,
      startBalance,
    },
    metadata: {
      transactionCount: transactions.length,
      categoryCount: hovedkategorier.length + underkategorier.length,
      ruleCount: rules.length,
    },
  };

  return backupData;
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(data: BackupData, filename?: string): void {
  const defaultFilename = createBackupFilename();
  const finalFilename = filename || defaultFilename;

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✅ Backup downloaded: ${finalFilename}`);
}

export async function writeBackupToDirectory(
  directoryHandle: FileSystemDirectoryHandleLike,
  data: BackupData,
  filename = createBackupFilename()
): Promise<AutoBackupResult> {
  try {
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    return {
      success: true,
      mode: 'directory',
      filename,
      directoryName: directoryHandle.name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Kunne ikke skrive backupfil',
    };
  }
}

/**
 * Perform automatic daily backup
 */
export async function performAutoBackup(options: { allowPermissionPrompt?: boolean } = {}): Promise<AutoBackupResult> {
  if (!shouldBackupToday()) {
    console.log('ℹ️  Backup already done today');
    return { success: false, error: 'Backup already done today' };
  }

  try {
    const backupData = createBackupData();
    const filename = createBackupFilename();
    const directoryHandle = await loadDirectoryHandle();

    if (directoryHandle) {
      const hasPermission = await hasDirectoryWritePermission(
        directoryHandle,
        options.allowPermissionPrompt ?? false
      );

      if (hasPermission) {
        const result = await writeBackupToDirectory(directoryHandle, backupData, filename);
        if (result.success) {
          recordBackupCompleted(filename);
          localStorage.setItem(AUTO_BACKUP_DIRECTORY_NAME_KEY, directoryHandle.name);
          console.log(`✅ Auto backup saved: ${directoryHandle.name}/${filename}`);
          return result;
        }
      }
    }

    downloadBackup(backupData, filename);
    recordBackupCompleted(filename);

    console.log('✅ Auto backup downloaded');
    return { success: true, mode: 'download', filename };
  } catch (error) {
    console.error('❌ Auto backup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Import/Restore Functions
// ============================================================================

/**
 * Validate backup data structure
 */
export function validateBackupData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check version
  if (!data.version) {
    errors.push('Missing version field');
  }

  // Check data object
  if (!data.data || typeof data.data !== 'object') {
    errors.push('Missing or invalid data field');
  } else {
    // Check required fields
    if (!Array.isArray(data.data.transactions)) {
      errors.push('Missing or invalid transactions array');
    }
    if (!Array.isArray(data.data.hovedkategorier)) {
      errors.push('Missing or invalid hovedkategorier array');
    }
    if (!Array.isArray(data.data.underkategorier)) {
      errors.push('Missing or invalid underkategorier array');
    }
    if (!Array.isArray(data.data.rules)) {
      errors.push('Missing or invalid rules array');
    }
    if (!Array.isArray(data.data.locks)) {
      errors.push('Missing or invalid locks array');
    }
  }

  // Check metadata
  if (!data.metadata || typeof data.metadata !== 'object') {
    errors.push('Missing or invalid metadata field');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Restore store from backup data
 */
export function restoreFromBackup(backupData: BackupData): { success: boolean; error?: string } {
  try {
    // Validate data
    const validation = validateBackupData(backupData);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid backup data: ${validation.errors.join(', ')}`,
      };
    }

    const state = useTransactionStore.getState();

    // Create Maps from arrays
    const hovedkategorier = new Map(backupData.data.hovedkategorier);
    const underkategorier = new Map(backupData.data.underkategorier);
    const rules = new Map(backupData.data.rules);
    const locks = new Map(backupData.data.locks);
    const budgets = new Map(backupData.data.budgets || []);

    // Update store state (only set budgets if it exists in current store)
    const currentState = useTransactionStore.getState();
    const stateUpdate: any = {
      transactions: backupData.data.transactions,
      hovedkategorier,
      underkategorier,
      rules,
      locks,
      filteredTransactions: backupData.data.transactions, // Will be recalculated
    };

    // Only update budgets if the store supports it
    if ('budgets' in currentState) {
      stateUpdate.budgets = budgets;
      stateUpdate.startBalance = backupData.data.startBalance
        ? {
            amount: Math.round(Number(backupData.data.startBalance.amount)),
            date: backupData.data.startBalance.date,
          }
        : null;
    }

    useTransactionStore.setState(stateUpdate);

    // Refresh stats and filtered transactions
    state.refreshStats();
    state.setFilters(state.filters); // Trigger filter recalculation

    console.log('✅ Backup restored successfully');
    console.log(`   Transactions: ${backupData.metadata.transactionCount}`);
    console.log(`   Categories: ${backupData.metadata.categoryCount}`);
    console.log(`   Rules: ${backupData.metadata.ruleCount}`);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to restore backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Merge backup data into existing store state without replacing current data.
 * De-duplicates by transactionId (fallback: id), keeps current state values on key conflicts.
 */
export function mergeFromBackup(backupData: BackupData): {
  success: boolean;
  addedTransactions?: number;
  skippedTransactions?: number;
  totalTransactions?: number;
  error?: string;
} {
  try {
    const validation = validateBackupData(backupData);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid backup data: ${validation.errors.join(', ')}`,
      };
    }

    const state = useTransactionStore.getState();
    const existingTransactions = state.transactions || [];
    const incomingTransactions = backupData.data.transactions || [];

    const existingKeys = new Set<string>();
    existingTransactions.forEach((tx: any) => {
      if (tx?.transactionId) existingKeys.add(`tid:${tx.transactionId}`);
      else if (tx?.id) existingKeys.add(`id:${tx.id}`);
    });

    let addedTransactions = 0;
    let skippedTransactions = 0;
    const mergedTransactions = [...existingTransactions];

    incomingTransactions.forEach((tx: any) => {
      const key = tx?.transactionId ? `tid:${tx.transactionId}` : tx?.id ? `id:${tx.id}` : null;
      if (key && existingKeys.has(key)) {
        skippedTransactions++;
        return;
      }

      const normalizedTx = {
        ...tx,
        id: tx?.id || crypto.randomUUID(),
        transactionId: tx?.transactionId || crypto.randomUUID(),
      };
      mergedTransactions.push(normalizedTx);
      if (key) existingKeys.add(key);
      addedTransactions++;
    });

    const currentHk = Array.from(state.hovedkategorier.entries());
    const currentUk = Array.from(state.underkategorier.entries());
    const currentRules = Array.from(state.rules.entries());
    const currentLocks = Array.from(state.locks.entries());
    const currentBudgets = state.budgets ? Array.from(state.budgets.entries()) : [];

    const mergedHovedkategorier = new Map([
      ...(backupData.data.hovedkategorier || []),
      ...currentHk,
    ]);
    const mergedUnderkategorier = new Map([
      ...(backupData.data.underkategorier || []),
      ...currentUk,
    ]);
    const mergedRules = new Map([
      ...(backupData.data.rules || []),
      ...currentRules,
    ]);
    const mergedLocks = new Map([
      ...(backupData.data.locks || []),
      ...currentLocks,
    ]);
    const mergedBudgets = new Map([
      ...(backupData.data.budgets || []),
      ...currentBudgets,
    ]);

    const startBalance = state.startBalance
      ? state.startBalance
      : backupData.data.startBalance
      ? {
          amount: Math.round(Number(backupData.data.startBalance.amount)),
          date: backupData.data.startBalance.date,
        }
      : null;

    const stateUpdate: any = {
      transactions: mergedTransactions,
      hovedkategorier: mergedHovedkategorier,
      underkategorier: mergedUnderkategorier,
      rules: mergedRules,
      locks: mergedLocks,
      budgets: mergedBudgets,
      startBalance,
      filteredTransactions: mergedTransactions,
    };

    useTransactionStore.setState(stateUpdate);
    state.refreshStats();
    state.setFilters(state.filters);

    return {
      success: true,
      addedTransactions,
      skippedTransactions,
      totalTransactions: mergedTransactions.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse backup file from File object
 */
export async function parseBackupFile(file: File): Promise<{
  success: boolean;
  data?: BackupData;
  error?: string;
}> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const validation = validateBackupData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid backup file: ${validation.errors.join(', ')}`,
      };
    }

    return {
      success: true,
      data: data as BackupData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse file',
    };
  }
}

// ============================================================================
// Auto-backup Setup
// ============================================================================

/**
 * Setup automatic backup check on app load
 */
export function setupAutoBackup(): void {
  if (typeof window === 'undefined') {
    return;
  }

  console.log('🔄 Checking for auto backup...');

  // Wait a bit for store to be ready
  setTimeout(() => {
    const state = useTransactionStore.getState();
    
    // Only backup if there's data
    if (state.transactions.length > 0 && shouldBackupToday()) {
      console.log('💾 Performing automatic daily backup...');
      void performAutoBackup();
    }
  }, 2000); // 2 second delay to ensure app is loaded
}

