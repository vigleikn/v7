/**
 * Category Rule Engine
 * Automatically categorizes transactions based on the "Tekst" field
 * with support for locked exceptions
 */

import { Transaction } from './csvParser';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Category {
  id: string;
  name: string;
  parentId?: string; // For subcategories
  isIncome?: boolean; // Income categories are locked from deletion/editing
}

export interface CategoryRule {
  tekst: string; // The text pattern to match
  categoryId: string; // The category to apply
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionLock {
  transactionId: string; // Unique identifier for the transaction
  categoryId: string; // The locked category for this transaction
  lockedAt: Date;
  reason?: string; // Optional reason for the lock
}

export interface CategorizedTransaction extends Transaction {
  transactionId: string; // Unique ID for tracking
  categoryId?: string;
  isLocked: boolean;
}

export interface RuleEngineState {
  rules: Map<string, CategoryRule>; // Map of tekst -> rule
  locks: Map<string, TransactionLock>; // Map of transactionId -> lock
  categories: Map<string, Category>; // Map of categoryId -> category
}

export interface ApplyRulesResult {
  categorized: CategorizedTransaction[];
  stats: {
    total: number;
    categorized: number;
    uncategorized: number;
    locked: number;
    rulesApplied: number;
  };
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Generates a unique transaction ID based on transaction properties
 */
export function generateTransactionId(transaction: Transaction): string {
  return `${transaction.dato}|${transaction.beløp}|${transaction.type}|${transaction.tekst}|${transaction.fraKonto}|${transaction.tilKonto}`;
}

/**
 * Normalizes text for consistent matching (trim, lowercase)
 */
function normalizeTekst(tekst: string): string {
  return tekst.trim().toLowerCase();
}

// ============================================================================
// Category Management (Pure Functions)
// ============================================================================

/**
 * Creates a new category
 */
export function createCategory(
  categories: Map<string, Category>,
  category: Omit<Category, 'id'>
): { categories: Map<string, Category>; category: Category } {
  const newCategories = new Map(categories);
  const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newCategory: Category = { ...category, id };
  newCategories.set(id, newCategory);
  
  return { categories: newCategories, category: newCategory };
}

/**
 * Updates an existing category (cannot update income categories)
 */
export function updateCategory(
  categories: Map<string, Category>,
  categoryId: string,
  updates: Partial<Omit<Category, 'id' | 'isIncome'>>
): Map<string, Category> | null {
  const category = categories.get(categoryId);
  if (!category) return null;
  if (category.isIncome) return null; // Income categories are locked
  
  const newCategories = new Map(categories);
  newCategories.set(categoryId, { ...category, ...updates });
  return newCategories;
}

/**
 * Deletes a category (cannot delete income categories)
 */
export function deleteCategory(
  categories: Map<string, Category>,
  categoryId: string
): Map<string, Category> | null {
  const category = categories.get(categoryId);
  if (!category) return null;
  if (category.isIncome) return null; // Income categories cannot be deleted
  
  const newCategories = new Map(categories);
  newCategories.delete(categoryId);
  return newCategories;
}

/**
 * Gets a category by ID
 */
export function getCategory(
  categories: Map<string, Category>,
  categoryId: string
): Category | undefined {
  return categories.get(categoryId);
}

/**
 * Lists all categories
 */
export function listCategories(categories: Map<string, Category>): Category[] {
  return Array.from(categories.values());
}

// ============================================================================
// Rule Management (Pure Functions)
// ============================================================================

/**
 * Creates or updates a category rule for a specific text pattern
 */
export function setRule(
  rules: Map<string, CategoryRule>,
  tekst: string,
  categoryId: string
): Map<string, CategoryRule> {
  const normalizedTekst = normalizeTekst(tekst);
  const newRules = new Map(rules);
  
  const existingRule = newRules.get(normalizedTekst);
  const now = new Date();
  
  if (existingRule) {
    // Update existing rule
    newRules.set(normalizedTekst, {
      ...existingRule,
      categoryId,
      updatedAt: now,
    });
  } else {
    // Create new rule
    newRules.set(normalizedTekst, {
      tekst: normalizedTekst,
      categoryId,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  return newRules;
}

/**
 * Deletes a category rule
 */
export function deleteRule(
  rules: Map<string, CategoryRule>,
  tekst: string
): Map<string, CategoryRule> {
  const normalizedTekst = normalizeTekst(tekst);
  const newRules = new Map(rules);
  newRules.delete(normalizedTekst);
  return newRules;
}

/**
 * Gets a rule for a specific text pattern
 */
export function getRule(
  rules: Map<string, CategoryRule>,
  tekst: string
): CategoryRule | undefined {
  return rules.get(normalizeTekst(tekst));
}

/**
 * Lists all rules
 */
export function listRules(rules: Map<string, CategoryRule>): CategoryRule[] {
  return Array.from(rules.values());
}

// ============================================================================
// Lock Management (Pure Functions)
// ============================================================================

/**
 * Locks a transaction to a specific category
 */
export function lockTransaction(
  locks: Map<string, TransactionLock>,
  transactionId: string,
  categoryId: string,
  reason?: string
): Map<string, TransactionLock> {
  const newLocks = new Map(locks);
  newLocks.set(transactionId, {
    transactionId,
    categoryId,
    lockedAt: new Date(),
    reason,
  });
  return newLocks;
}

/**
 * Unlocks a transaction
 */
export function unlockTransaction(
  locks: Map<string, TransactionLock>,
  transactionId: string
): Map<string, TransactionLock> {
  const newLocks = new Map(locks);
  newLocks.delete(transactionId);
  return newLocks;
}

/**
 * Checks if a transaction is locked
 */
export function isTransactionLocked(
  locks: Map<string, TransactionLock>,
  transactionId: string
): boolean {
  return locks.has(transactionId);
}

/**
 * Gets lock information for a transaction
 */
export function getTransactionLock(
  locks: Map<string, TransactionLock>,
  transactionId: string
): TransactionLock | undefined {
  return locks.get(transactionId);
}

/**
 * Lists all locked transactions
 */
export function listLocks(locks: Map<string, TransactionLock>): TransactionLock[] {
  return Array.from(locks.values());
}

// ============================================================================
// Rule Application (Pure Functions)
// ============================================================================

/**
 * Applies category rules to a list of transactions
 * - Locked transactions keep their locked category
 * - Uncategorized transactions get category from matching rule
 * - Already categorized transactions are skipped (unless they match a rule)
 */
export function applyRules(
  transactions: Transaction[],
  state: RuleEngineState
): ApplyRulesResult {
  const { rules, locks } = state;
  const categorized: CategorizedTransaction[] = [];
  
  let stats = {
    total: transactions.length,
    categorized: 0,
    uncategorized: 0,
    locked: 0,
    rulesApplied: 0,
  };

  for (const transaction of transactions) {
    const transactionId = generateTransactionId(transaction);
    const lock = locks.get(transactionId);
    const normalizedTekst = normalizeTekst(transaction.tekst);
    const rule = rules.get(normalizedTekst);

    let categoryId: string | undefined;
    let isLocked = false;

    if (lock) {
      // Transaction is locked, use locked category
      categoryId = lock.categoryId;
      isLocked = true;
      stats.locked++;
      stats.categorized++;
    } else if (rule) {
      // Apply rule if transaction is not locked
      categoryId = rule.categoryId;
      stats.rulesApplied++;
      stats.categorized++;
    } else {
      // No rule found and not locked
      categoryId = undefined;
      stats.uncategorized++;
    }

    categorized.push({
      ...transaction,
      transactionId,
      categoryId,
      isLocked,
    });
  }

  return { categorized, stats };
}

/**
 * Categorizes a single transaction and creates a rule for it
 * Returns updated state and list of affected transactions
 */
export function categorizeTransaction(
  transactions: CategorizedTransaction[],
  transactionId: string,
  categoryId: string,
  state: RuleEngineState,
  createRule: boolean = true
): {
  state: RuleEngineState;
  affectedTransactions: CategorizedTransaction[];
} {
  const transaction = transactions.find(t => t.transactionId === transactionId);
  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  // Check if transaction is locked
  if (transaction.isLocked) {
    throw new Error(`Transaction ${transactionId} is locked and cannot be auto-categorized`);
  }

  let newState = { ...state };
  
  // Create rule if requested
  if (createRule) {
    newState = {
      ...newState,
      rules: setRule(state.rules, transaction.tekst, categoryId),
    };
  }

  // Find all transactions with the same tekst that are uncategorized and unlocked
  const normalizedTekst = normalizeTekst(transaction.tekst);
  const affectedTransactions = transactions.filter(t => {
    const matchesTekst = normalizeTekst(t.tekst) === normalizedTekst;
    const isNotLocked = !t.isLocked;
    const isUncategorized = !t.categoryId;
    return matchesTekst && isNotLocked && isUncategorized;
  });

  return { state: newState, affectedTransactions };
}

/**
 * Creates a rule from an existing categorized transaction
 * and applies it to all matching uncategorized transactions
 */
export function createRuleFromTransaction(
  transaction: CategorizedTransaction,
  state: RuleEngineState
): RuleEngineState {
  if (!transaction.categoryId) {
    throw new Error('Transaction must have a category to create a rule');
  }

  return {
    ...state,
    rules: setRule(state.rules, transaction.tekst, transaction.categoryId),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Groups transactions by their tekst field
 */
export function groupByTekst(
  transactions: CategorizedTransaction[]
): Map<string, CategorizedTransaction[]> {
  const groups = new Map<string, CategorizedTransaction[]>();
  
  for (const transaction of transactions) {
    const normalizedTekst = normalizeTekst(transaction.tekst);
    const existing = groups.get(normalizedTekst) || [];
    groups.set(normalizedTekst, [...existing, transaction]);
  }
  
  return groups;
}

/**
 * Gets categorization statistics
 */
export function getCategorizationStats(
  transactions: CategorizedTransaction[]
): {
  total: number;
  categorized: number;
  uncategorized: number;
  locked: number;
  uniqueTekstPatterns: number;
  patternsWithRules: number;
} {
  const categorized = transactions.filter(t => t.categoryId).length;
  const locked = transactions.filter(t => t.isLocked).length;
  const uniquePatterns = new Set(transactions.map(t => normalizeTekst(t.tekst))).size;
  const patternsWithCategories = new Set(
    transactions.filter(t => t.categoryId).map(t => normalizeTekst(t.tekst))
  ).size;

  return {
    total: transactions.length,
    categorized,
    uncategorized: transactions.length - categorized,
    locked,
    uniqueTekstPatterns: uniquePatterns,
    patternsWithRules: patternsWithCategories,
  };
}

/**
 * Initializes an empty rule engine state
 */
export function createInitialState(): RuleEngineState {
  return {
    rules: new Map(),
    locks: new Map(),
    categories: new Map(),
  };
}

