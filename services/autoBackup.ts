/**
 * Auto Backup Service
 * Automatic daily backup to JSON file with browser download
 */

import { useTransactionStore } from '../src/store';

// ============================================================================
// Constants
// ============================================================================

const LAST_BACKUP_KEY = 'last-backup-date';
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
    startBalance: number;
  };
  metadata: {
    transactionCount: number;
    categoryCount: number;
    ruleCount: number;
  };
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
  let startBalance = 0;
  
  if (state.budgets && typeof state.budgets === 'object' && 'entries' in state.budgets) {
    try {
      budgets = Array.from(state.budgets.entries());
      startBalance = state.startBalance || 0;
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
  const today = getTodayDate();
  const defaultFilename = `transaction-backup-${today}.json`;
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

/**
 * Perform automatic daily backup
 */
export function performAutoBackup(): boolean {
  if (!shouldBackupToday()) {
    console.log('ℹ️  Backup already done today');
    return false;
  }

  try {
    const backupData = createBackupData();
    downloadBackup(backupData);
    markBackupCompleted();
    
    console.log('✅ Auto backup completed');
    return true;
  } catch (error) {
    console.error('❌ Auto backup failed:', error);
    return false;
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
      stateUpdate.startBalance = backupData.data.startBalance || 0;
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
      performAutoBackup();
    }
  }, 2000); // 2 second delay to ensure app is loaded
}

