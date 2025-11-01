/**
 * Persistence layer for Category Rule Engine
 * Handles saving and loading state to/from JSON files
 */

import { RuleEngineState, CategoryRule, TransactionLock, Category } from './categoryEngine';
import { promises as fs } from 'fs';

// ============================================================================
// Serialization Types
// ============================================================================

interface SerializedState {
  version: string;
  rules: Array<[string, CategoryRule]>;
  locks: Array<[string, TransactionLock]>;
  categories: Array<[string, Category]>;
  metadata: {
    savedAt: string;
    transactionCount?: number;
  };
}

// ============================================================================
// Pure Serialization Functions
// ============================================================================

/**
 * Converts Date objects to ISO strings for JSON serialization
 */
function serializeDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parses ISO date strings back to Date objects
 */
function deserializeDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Serializes RuleEngineState to a plain object suitable for JSON
 */
export function serializeState(state: RuleEngineState): SerializedState {
  return {
    version: '1.0.0',
    rules: Array.from(state.rules.entries()).map(([key, rule]) => [
      key,
      {
        ...rule,
        createdAt: serializeDate(rule.createdAt) as any,
        updatedAt: serializeDate(rule.updatedAt) as any,
      },
    ]),
    locks: Array.from(state.locks.entries()).map(([key, lock]) => [
      key,
      {
        ...lock,
        lockedAt: serializeDate(lock.lockedAt) as any,
      },
    ]),
    categories: Array.from(state.categories.entries()),
    metadata: {
      savedAt: new Date().toISOString(),
    },
  };
}

/**
 * Deserializes a plain object back to RuleEngineState
 */
export function deserializeState(serialized: SerializedState): RuleEngineState {
  return {
    rules: new Map(
      serialized.rules.map(([key, rule]) => [
        key,
        {
          ...rule,
          createdAt: deserializeDate(rule.createdAt as any),
          updatedAt: deserializeDate(rule.updatedAt as any),
        },
      ])
    ),
    locks: new Map(
      serialized.locks.map(([key, lock]) => [
        key,
        {
          ...lock,
          lockedAt: deserializeDate(lock.lockedAt as any),
        },
      ])
    ),
    categories: new Map(serialized.categories),
  };
}

// ============================================================================
// File I/O Functions
// ============================================================================

/**
 * Saves state to a JSON file
 */
export async function saveStateToFile(
  state: RuleEngineState,
  filePath: string
): Promise<void> {
  const serialized = serializeState(state);
  const json = JSON.stringify(serialized, null, 2);
  await fs.writeFile(filePath, json, 'utf-8');
}

/**
 * Loads state from a JSON file
 */
export async function loadStateFromFile(filePath: string): Promise<RuleEngineState> {
  const json = await fs.readFile(filePath, 'utf-8');
  const serialized = JSON.parse(json) as SerializedState;
  return deserializeState(serialized);
}

/**
 * Checks if a state file exists
 */
export async function stateFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a backup of the current state file
 */
export async function backupStateFile(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup.${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

// ============================================================================
// Export/Import for specific data
// ============================================================================

/**
 * Exports only rules to a JSON file (useful for sharing rule templates)
 */
export async function exportRules(
  state: RuleEngineState,
  filePath: string
): Promise<void> {
  const rules = Array.from(state.rules.entries()).map(([key, rule]) => ({
    tekst: rule.tekst,
    categoryId: rule.categoryId,
    categoryName: state.categories.get(rule.categoryId)?.name,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }));

  await fs.writeFile(filePath, JSON.stringify({ rules }, null, 2), 'utf-8');
}

/**
 * Exports only categories to a JSON file
 */
export async function exportCategories(
  state: RuleEngineState,
  filePath: string
): Promise<void> {
  const categories = Array.from(state.categories.values());
  await fs.writeFile(filePath, JSON.stringify({ categories }, null, 2), 'utf-8');
}

/**
 * Imports rules from a JSON file
 * Note: This requires categories to already exist with matching IDs or names
 */
export async function importRules(
  filePath: string,
  state: RuleEngineState
): Promise<RuleEngineState> {
  const json = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(json);
  
  const newRules = new Map(state.rules);
  
  for (const rule of data.rules) {
    // Try to match by category ID first, then by name
    let categoryId = rule.categoryId;
    if (!state.categories.has(categoryId) && rule.categoryName) {
      // Find category by name
      const category = Array.from(state.categories.values()).find(
        c => c.name === rule.categoryName
      );
      if (category) {
        categoryId = category.id;
      }
    }
    
    if (state.categories.has(categoryId)) {
      newRules.set(rule.tekst.toLowerCase(), {
        tekst: rule.tekst.toLowerCase(),
        categoryId,
        createdAt: new Date(rule.createdAt),
        updatedAt: new Date(rule.updatedAt),
      });
    }
  }
  
  return {
    ...state,
    rules: newRules,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets metadata about a saved state file without fully loading it
 */
export async function getStateMetadata(filePath: string): Promise<{
  version: string;
  savedAt: Date;
  ruleCount: number;
  lockCount: number;
  categoryCount: number;
}> {
  const json = await fs.readFile(filePath, 'utf-8');
  const serialized = JSON.parse(json) as SerializedState;
  
  return {
    version: serialized.version,
    savedAt: new Date(serialized.metadata.savedAt),
    ruleCount: serialized.rules.length,
    lockCount: serialized.locks.length,
    categoryCount: serialized.categories.length,
  };
}

/**
 * Validates a serialized state object
 */
export function validateSerializedState(data: any): data is SerializedState {
  if (!data || typeof data !== 'object') return false;
  if (!data.version || typeof data.version !== 'string') return false;
  if (!Array.isArray(data.rules)) return false;
  if (!Array.isArray(data.locks)) return false;
  if (!Array.isArray(data.categories)) return false;
  if (!data.metadata || !data.metadata.savedAt) return false;
  return true;
}

/**
 * Merges two states (useful for importing rules from another system)
 */
export function mergeStates(
  baseState: RuleEngineState,
  importState: RuleEngineState,
  options: {
    overwriteRules?: boolean;
    overwriteLocks?: boolean;
    overwriteCategories?: boolean;
  } = {}
): RuleEngineState {
  const {
    overwriteRules = true,
    overwriteLocks = false,
    overwriteCategories = false,
  } = options;

  const newState: RuleEngineState = {
    rules: new Map(baseState.rules),
    locks: new Map(baseState.locks),
    categories: new Map(baseState.categories),
  };

  // Merge categories
  if (overwriteCategories) {
    for (const [id, category] of importState.categories) {
      newState.categories.set(id, category);
    }
  } else {
    for (const [id, category] of importState.categories) {
      if (!newState.categories.has(id)) {
        newState.categories.set(id, category);
      }
    }
  }

  // Merge rules
  if (overwriteRules) {
    for (const [tekst, rule] of importState.rules) {
      newState.rules.set(tekst, rule);
    }
  } else {
    for (const [tekst, rule] of importState.rules) {
      if (!newState.rules.has(tekst)) {
        newState.rules.set(tekst, rule);
      }
    }
  }

  // Merge locks
  if (overwriteLocks) {
    for (const [id, lock] of importState.locks) {
      newState.locks.set(id, lock);
    }
  } else {
    for (const [id, lock] of importState.locks) {
      if (!newState.locks.has(id)) {
        newState.locks.set(id, lock);
      }
    }
  }

  return newState;
}

