import { describe, it, expect, beforeEach } from 'vitest';
import { generateTransactionId, generateContentHash, CategorizedTransaction } from '../categoryEngine';
import { useTransactionStore } from '../src/store';

const makeTx = (overrides: Partial<{
  dato: string; beløp: number; type: string; tekst: string;
  fraKonto: string; tilKonto: string; bankId: string;
}> = {}) => ({
  dato: '01.01.26',
  beløp: -500,
  type: 'Betaling',
  tekst: 'REMA 1000',
  fraKonto: 'Brukskonto',
  tilKonto: 'REMA',
  fraKontonummer: '',
  tilKontonummer: '',
  underkategori: '',
  ...overrides,
});

const toCategorized = (tx: ReturnType<typeof makeTx>): CategorizedTransaction => ({
  ...tx,
  id: crypto.randomUUID(),
  transactionId: generateTransactionId(tx),
  categoryId: undefined,
  isLocked: false,
});

describe('generateTransactionId', () => {
  it('returns bankId when available', () => {
    const tx = makeTx({ bankId: 'BANK-12345' });
    expect(generateTransactionId(tx)).toBe('BANK-12345');
  });

  it('falls back to content hash when no bankId', () => {
    const tx = makeTx();
    const id = generateTransactionId(tx);
    expect(id).toContain(tx.dato);
    expect(id).toContain(String(tx.beløp));
    expect(id).toContain(tx.type);
    expect(id).toContain(tx.tekst);
  });

  it('returns deterministic content hash for same input', () => {
    const tx = makeTx();
    expect(generateTransactionId(tx)).toBe(generateTransactionId(tx));
  });

  it('produces different IDs when fields differ (no bankId)', () => {
    const base = makeTx();
    const baseId = generateTransactionId(base);
    const variants = [
      makeTx({ dato: '02.01.26' }),
      makeTx({ beløp: -600 }),
      makeTx({ type: 'Overføring' }),
      makeTx({ tekst: 'KIWI' }),
      makeTx({ fraKonto: 'Sparekonto' }),
      makeTx({ tilKonto: 'KIWI' }),
    ];
    variants.forEach((v) => {
      expect(generateTransactionId(v)).not.toBe(baseId);
    });
  });

  it('two transactions with same content but different bankIds get different IDs', () => {
    const txA = makeTx({ bankId: 'BANK-001' });
    const txB = makeTx({ bankId: 'BANK-002' });
    expect(generateTransactionId(txA)).not.toBe(generateTransactionId(txB));
  });
});

describe('generateContentHash', () => {
  it('always returns content hash regardless of bankId', () => {
    const tx = makeTx({ bankId: 'BANK-12345' });
    const hash = generateContentHash(tx);
    expect(hash).not.toBe('BANK-12345');
    expect(hash).toContain(tx.dato);
    expect(hash).toContain(String(tx.beløp));
  });

  it('matches generateTransactionId output for transactions without bankId', () => {
    const tx = makeTx();
    expect(generateContentHash(tx)).toBe(generateTransactionId(tx));
  });
});

describe('bank-ID duplicate detection during import', () => {
  beforeEach(() => {
    useTransactionStore.getState().reset();
  });

  it('detects exact duplicates by bank-ID transactionId', () => {
    const txA = makeTx({ bankId: 'BANK-001' });
    const txB = makeTx({ bankId: 'BANK-001' });
    const catA = toCategorized(txA);
    const catB = toCategorized(txB);

    expect(catA.id).not.toBe(catB.id);
    expect(catA.transactionId).toBe(catB.transactionId);
    expect(catA.transactionId).toBe('BANK-001');
  });

  it('treats different bankIds as different transactions even with identical content', () => {
    const txA = makeTx({ bankId: 'BANK-001' });
    const txB = makeTx({ bankId: 'BANK-002' });
    expect(generateTransactionId(txA)).not.toBe(generateTransactionId(txB));
  });

  it('correctly counts duplicates when reimporting with bankId', () => {
    const transactions = [
      makeTx({ tekst: 'REMA 1000', beløp: -200, bankId: 'B001' }),
      makeTx({ tekst: 'KIWI', beløp: -150, bankId: 'B002' }),
      makeTx({ tekst: 'Spotify', beløp: -119, bankId: 'B003' }),
    ];

    const firstBatch = transactions.map(toCategorized);
    useTransactionStore.getState().importTransactions(firstBatch);
    expect(useTransactionStore.getState().transactions).toHaveLength(3);

    const secondBatch = transactions.map(toCategorized);
    const existingIds = new Set(
      useTransactionStore.getState().transactions.map((t) => t.transactionId)
    );

    const duplicates = secondBatch.filter((tx) => existingIds.has(tx.transactionId));
    expect(duplicates).toHaveLength(3);
  });

  it('correctly separates new from duplicate transactions', () => {
    const existing = [
      makeTx({ tekst: 'REMA', beløp: -200, bankId: 'B001' }),
      makeTx({ tekst: 'KIWI', beløp: -150, bankId: 'B002' }),
    ];
    useTransactionStore.getState().importTransactions(existing.map(toCategorized));

    const newBatch = [
      ...existing,
      makeTx({ tekst: 'Netflix', beløp: -179, bankId: 'B003' }),
    ].map(toCategorized);

    const existingIds = new Set(
      useTransactionStore.getState().transactions.map((t) => t.transactionId)
    );

    const dupes = newBatch.filter((tx) => existingIds.has(tx.transactionId));
    const unique = newBatch.filter((tx) => !existingIds.has(tx.transactionId));
    expect(dupes).toHaveLength(2);
    expect(unique).toHaveLength(1);
    expect(unique[0].tekst).toBe('Netflix');
  });

  it('handles pending-to-cleared: same bankId, different amount/text', () => {
    const pendingTx = makeTx({ tekst: 'PENDING REMA', beløp: -499, bankId: 'B100' });
    const catPending = toCategorized(pendingTx);
    useTransactionStore.getState().importTransactions([catPending]);

    const clearedTx = makeTx({ tekst: 'REMA 1000 Oslo', beløp: -500, bankId: 'B100' });
    const catCleared = toCategorized(clearedTx);

    const existingById = new Map(
      useTransactionStore.getState().transactions.map(t => [t.transactionId, t])
    );

    const existing = existingById.get(catCleared.transactionId);
    expect(existing).toBeDefined();
    expect(existing!.tekst).toBe('PENDING REMA');
    expect(existing!.beløp).toBe(-499);

    // Import detects same bankId but different content -> pending update
    const isDifferent = existing!.beløp !== catCleared.beløp || existing!.tekst !== catCleared.tekst;
    expect(isDifferent).toBe(true);
  });
});

describe('legacy content-hash duplicate detection', () => {
  beforeEach(() => {
    useTransactionStore.getState().reset();
  });

  it('still works for transactions without bankId', () => {
    const tx = makeTx();
    const cat = toCategorized(tx);

    useTransactionStore.getState().importTransactions([cat]);

    const reimport = toCategorized(makeTx());
    const existingIds = new Set(
      useTransactionStore.getState().transactions.map((t) => t.transactionId)
    );

    expect(existingIds.has(reimport.transactionId)).toBe(true);
  });

  it('handles empty store with no false duplicates', () => {
    const batch = [
      makeTx({ tekst: 'REMA', beløp: -200, bankId: 'B001' }),
      makeTx({ tekst: 'KIWI', beløp: -150, bankId: 'B002' }),
    ].map(toCategorized);

    const existingIds = new Set(
      useTransactionStore.getState().transactions.map((t) => t.transactionId)
    );

    const dupes = batch.filter((tx) => existingIds.has(tx.transactionId));
    const unique = batch.filter((tx) => !existingIds.has(tx.transactionId));
    expect(dupes).toHaveLength(0);
    expect(unique).toHaveLength(2);
  });
});

describe('CSV-to-Excel migration (dual lookup)', () => {
  beforeEach(() => {
    useTransactionStore.getState().reset();
  });

  it('migrates CSV transaction to bank-ID when content matches', () => {
    const csvTx = makeTx({ tekst: 'REMA 1000', beløp: -200 });
    const catCsv = toCategorized(csvTx);
    catCsv.categoryId = 'cat_groceries';
    catCsv.isLocked = true;

    useTransactionStore.getState().importTransactions([catCsv]);
    const stored = useTransactionStore.getState().transactions[0];
    const oldTransactionId = stored.transactionId;
    expect(oldTransactionId).not.toBe('BANK-AAA');
    expect(oldTransactionId).toContain('REMA 1000');

    // Same transaction from Excel, now with bankId
    const excelTx = makeTx({ tekst: 'REMA 1000', beløp: -200, bankId: 'BANK-AAA' });
    const catExcel = toCategorized(excelTx);
    expect(catExcel.transactionId).toBe('BANK-AAA');

    // Simulate the dual-lookup logic from handleExcelImport
    const existingByTransactionId = new Map(
      useTransactionStore.getState().transactions.map(t => [t.transactionId, t])
    );
    const existingByContentHash = new Map<string, CategorizedTransaction>();
    for (const t of useTransactionStore.getState().transactions) {
      const hash = generateContentHash(t);
      if (!existingByContentHash.has(hash)) existingByContentHash.set(hash, t);
    }

    // bankId lookup should NOT find anything (CSV has content hash, not bankId)
    expect(existingByTransactionId.has(catExcel.transactionId)).toBe(false);

    // Content-hash lookup SHOULD find the CSV transaction
    const contentHash = generateContentHash(excelTx);
    const byHash = existingByContentHash.get(contentHash);
    expect(byHash).toBeDefined();
    expect(byHash!.id).toBe(stored.id);
    expect(byHash!.categoryId).toBe('cat_groceries');
    expect(byHash!.isLocked).toBe(true);

    // Migration: update the existing transaction with bank-ID, preserving category/lock
    const migratedTx = {
      ...catExcel,
      id: byHash!.id,
      categoryId: byHash!.categoryId,
      isLocked: byHash!.isLocked,
    };

    expect(migratedTx.transactionId).toBe('BANK-AAA');
    expect(migratedTx.categoryId).toBe('cat_groceries');
    expect(migratedTx.isLocked).toBe(true);
    expect(migratedTx.id).toBe(stored.id);
  });

  it('does not duplicate when migrating CSV transactions to Excel', () => {
    const csvTransactions = [
      makeTx({ tekst: 'REMA 1000', beløp: -200 }),
      makeTx({ tekst: 'KIWI', beløp: -150 }),
    ];
    const catCsvs = csvTransactions.map(toCategorized);
    useTransactionStore.getState().importTransactions(catCsvs);
    expect(useTransactionStore.getState().transactions).toHaveLength(2);

    const excelTransactions = [
      makeTx({ tekst: 'REMA 1000', beløp: -200, bankId: 'BANK-001' }),
      makeTx({ tekst: 'KIWI', beløp: -150, bankId: 'BANK-002' }),
      makeTx({ tekst: 'Netflix', beløp: -179, bankId: 'BANK-003' }),
    ];

    const existingByTransactionId = new Map(
      useTransactionStore.getState().transactions.map(t => [t.transactionId, t])
    );
    const existingByContentHash = new Map<string, CategorizedTransaction>();
    for (const t of useTransactionStore.getState().transactions) {
      const hash = generateContentHash(t);
      if (!existingByContentHash.has(hash)) existingByContentHash.set(hash, t);
    }

    const migrated: CategorizedTransaction[] = [];
    const brandNew: CategorizedTransaction[] = [];

    for (const raw of excelTransactions) {
      const tx = toCategorized(raw);

      const byId = existingByTransactionId.get(tx.transactionId);
      if (byId) continue; // duplicate

      const hash = generateContentHash(raw);
      const byHash = existingByContentHash.get(hash);
      if (byHash) {
        migrated.push({ ...tx, id: byHash.id, categoryId: byHash.categoryId, isLocked: byHash.isLocked });
        existingByContentHash.delete(hash);
        continue;
      }

      brandNew.push(tx);
    }

    expect(migrated).toHaveLength(2);
    expect(brandNew).toHaveLength(1);
    expect(brandNew[0].tekst).toBe('Netflix');

    // Apply migration: update existing + add new
    let updated = [...useTransactionStore.getState().transactions];
    const updateMap = new Map(migrated.map(t => [t.id, t]));
    updated = updated.map(t => updateMap.has(t.id) ? { ...t, ...updateMap.get(t.id)! } : t);
    const all = [...updated, ...brandNew];

    useTransactionStore.getState().importTransactions(all);
    // Total should be 3, not 5 (no duplicates)
    expect(useTransactionStore.getState().transactions).toHaveLength(3);

    const rema = useTransactionStore.getState().transactions.find(t => t.tekst === 'REMA 1000');
    expect(rema!.transactionId).toBe('BANK-001');
    expect(rema!.bankId).toBe('BANK-001');

    const kiwi = useTransactionStore.getState().transactions.find(t => t.tekst === 'KIWI');
    expect(kiwi!.transactionId).toBe('BANK-002');
  });

  it('preserves locked category when migrating from CSV to Excel', () => {
    const csvTx = makeTx({ tekst: 'REMA 1000', beløp: -200 });
    const cat = toCategorized(csvTx);
    cat.categoryId = 'cat_mat';
    cat.isLocked = true;

    useTransactionStore.getState().importTransactions([cat]);

    const excelTx = makeTx({ tekst: 'REMA 1000', beløp: -200, bankId: 'BANK-X' });

    // Content-hash lookup finds the CSV transaction
    const hash = generateContentHash(excelTx);
    const stored = useTransactionStore.getState().transactions[0];
    const storedHash = generateContentHash(stored);
    expect(hash).toBe(storedHash);

    // Migration preserves category
    const migrated = {
      ...toCategorized(excelTx),
      id: stored.id,
      categoryId: stored.categoryId,
      isLocked: stored.isLocked,
    };

    expect(migrated.transactionId).toBe('BANK-X');
    expect(migrated.categoryId).toBe('cat_mat');
    expect(migrated.isLocked).toBe(true);
  });
});
