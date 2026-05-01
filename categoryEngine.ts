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
  /** Map key in `rules` (legacy: normalized tekst only; specific: tekst||fra|til kontonummer). */
  ruleKey: string;
  /** Normalized display pattern (lowercase trimmed tekst). */
  tekst: string;
  categoryId: string;
  /** Present when rule is account-specific (normalized kontonummer). */
  fraKontonummer?: string;
  tilKontonummer?: string;
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
  id: string; // Unique UUID for each transaction
  transactionId: string; // Content hash for duplicate detection
  categoryId?: string;
  isLocked: boolean;
}

export interface RuleEngineState {
  rules: Map<string, CategoryRule>; // Map of ruleKey -> rule
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
 * Generates a unique transaction ID.
 * Prefers the bank-provided ID (from Excel import) when available.
 * Falls back to content hash for legacy CSV-imported data.
 */
export function generateTransactionId(transaction: Transaction): string {
  if (transaction.bankId) {
    return transaction.bankId;
  }
  return `${transaction.dato}|${transaction.beløp}|${transaction.type}|${transaction.tekst}|${transaction.fraKonto}|${transaction.tilKonto}`;
}

function buildContentHash(date: string, transaction: Transaction): string {
  return `${date}|${transaction.beløp}|${transaction.type}|${transaction.tekst}|${transaction.fraKonto}|${transaction.tilKonto}`;
}

/**
 * Normalizes common bank date formats for migration comparisons.
 */
export function normalizeDateForComparison(date: string): string {
  const trimmed = date.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year}`;
  }

  const dottedIsoMatch = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dottedIsoMatch) {
    const [, year, month, day] = dottedIsoMatch;
    return `${day}.${month}.${year}`;
  }

  const shortNorwegianMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (shortNorwegianMatch) {
    const [, day, month, year] = shortNorwegianMatch;
    return `${day}.${month}.20${year}`;
  }

  return trimmed;
}

/**
 * Generates a content-hash ID regardless of whether bankId exists.
 * Used for migrating locks from old content-hash keys to bank-ID keys.
 */
export function generateContentHash(transaction: Transaction): string {
  return buildContentHash(transaction.dato, transaction);
}

/**
 * Builds a soft-match key for CSV-to-Excel migration where strict content
 * hashes fail due to field differences between export formats.
 * Uses only fields proven stable across CSV/Excel: date, amount, and
 * both account names sorted alphabetically (eliminates fra/til swap).
 */
export function generateSoftMatchKey(transaction: Transaction): string {
  const date = normalizeDateForComparison(transaction.dato);
  const accounts = [transaction.fraKonto || '', transaction.tilKonto || '']
    .map(s => s.trim())
    .sort()
    .join('|');
  return `${date}|${transaction.beløp}|${accounts}`;
}

/**
 * Generates candidate hashes for legacy CSV rows and normalized Excel rows.
 * This lets migration match old persisted hashes without breaking them.
 */
export function generateComparableContentHashes(transaction: Transaction): string[] {
  const hashes = new Set<string>();
  hashes.add(generateContentHash(transaction));
  hashes.add(buildContentHash(normalizeDateForComparison(transaction.dato), transaction));
  return Array.from(hashes);
}

/**
 * Normalizes text for consistent matching (trim, lowercase)
 */
function normalizeTekst(tekst: string): string {
  return tekst.trim().toLowerCase();
}

const RULE_KEY_ACCOUNT_SEP = '||';

/**
 * Normalizes kontonummer for stable rule keys (trim, remove spaces, lowercase).
 */
export function normalizeKontonummer(raw: string | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, '').toLowerCase();
}

export interface SetRuleContext {
  fraKontonummer?: string;
  tilKontonummer?: string;
}

/**
 * Builds persisted map key: legacy `normalizeTekst(tekst)` or
 * `normalizeTekst(tekst)||normFra|normTil` when both account numbers are present.
 */
export function buildRuleKey(
  tekst: string,
  fraKontonummer?: string,
  tilKontonummer?: string
): string {
  const nt = normalizeTekst(tekst);
  const nf = normalizeKontonummer(fraKontonummer);
  const ntil = normalizeKontonummer(tilKontonummer);
  if (nf && ntil) {
    return `${nt}${RULE_KEY_ACCOUNT_SEP}${nf}|${ntil}`;
  }
  return nt;
}

/**
 * Resolves which rule applies: account-specific first, then legacy tekst-only.
 */
export function findApplicableRule(
  rules: Map<string, CategoryRule>,
  transaction: Transaction
): CategoryRule | undefined {
  const specificKey = buildRuleKey(
    transaction.tekst,
    transaction.fraKontonummer,
    transaction.tilKontonummer
  );
  const legacyKey = normalizeTekst(transaction.tekst);
  if (specificKey !== legacyKey) {
    const specific = rules.get(specificKey);
    if (specific) return specific;
  }
  return rules.get(legacyKey);
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
 * Creates or updates a category rule for a text pattern (and optionally fra/til kontonummer).
 */
export function setRule(
  rules: Map<string, CategoryRule>,
  tekst: string,
  categoryId: string,
  context?: SetRuleContext
): Map<string, CategoryRule> {
  const ruleKey = buildRuleKey(tekst, context?.fraKontonummer, context?.tilKontonummer);
  const normalizedTekst = normalizeTekst(tekst);
  const nf = normalizeKontonummer(context?.fraKontonummer);
  const ntil = normalizeKontonummer(context?.tilKontonummer);
  const newRules = new Map(rules);

  const existingRule = newRules.get(ruleKey);
  const now = new Date();

  const baseFields = {
    ruleKey,
    tekst: normalizedTekst,
    categoryId,
    ...(nf && ntil ? { fraKontonummer: nf, tilKontonummer: ntil } : {}),
  };

  if (existingRule) {
    newRules.set(ruleKey, {
      ...existingRule,
      ...baseFields,
      updatedAt: now,
    });
  } else {
    newRules.set(ruleKey, {
      ...baseFields,
      createdAt: now,
      updatedAt: now,
    });
  }

  return newRules;
}

/**
 * Deletes a category rule by its map key (`ruleKey`). Exact match first; otherwise legacy tekst-only key.
 */
export function deleteRule(
  rules: Map<string, CategoryRule>,
  ruleKeyOrTekst: string
): Map<string, CategoryRule> {
  const newRules = new Map(rules);
  if (newRules.has(ruleKeyOrTekst)) {
    newRules.delete(ruleKeyOrTekst);
    return newRules;
  }
  newRules.delete(normalizeTekst(ruleKeyOrTekst));
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

/**
 * Ensures each rule has `ruleKey` and `tekst` after loading from JSON/persist (backward compatible).
 */
export function migrateRulesMapFromPersist(
  rules: Map<string, CategoryRule>
): Map<string, CategoryRule> {
  const next = new Map<string, CategoryRule>();
  for (const [key, rule] of rules) {
    const fallbackTekst = key.includes(RULE_KEY_ACCOUNT_SEP)
      ? key.split(RULE_KEY_ACCOUNT_SEP)[0]!
      : key;
    next.set(key, {
      ...rule,
      ruleKey: rule.ruleKey || key,
      tekst: rule.tekst ? normalizeTekst(rule.tekst) : fallbackTekst,
    });
  }
  return next;
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
    const rule = findApplicableRule(rules, transaction);

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
      rules: setRule(state.rules, transaction.tekst, categoryId, {
        fraKontonummer: transaction.fraKontonummer,
        tilKontonummer: transaction.tilKontonummer,
      }),
    };
  }

  const normalizedTekst = normalizeTekst(transaction.tekst);
  const newRuleKey = buildRuleKey(
    transaction.tekst,
    transaction.fraKontonummer,
    transaction.tilKontonummer
  );
  const isSpecificRuleKey = newRuleKey !== normalizedTekst;

  const affectedTransactions = transactions.filter((t) => {
    const matchesTekst = normalizeTekst(t.tekst) === normalizedTekst;
    const isNotLocked = !t.isLocked;
    const isUncategorized = !t.categoryId;
    if (!matchesTekst || !isNotLocked || !isUncategorized) return false;
    if (createRule && isSpecificRuleKey) {
      return (
        buildRuleKey(t.tekst, t.fraKontonummer, t.tilKontonummer) === newRuleKey
      );
    }
    return true;
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
    rules: setRule(state.rules, transaction.tekst, transaction.categoryId, {
      fraKontonummer: transaction.fraKontonummer,
      tilKontonummer: transaction.tilKontonummer,
    }),
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

