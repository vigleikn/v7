import { describe, it, expect, beforeEach } from 'vitest';
import { generateTransactionId, CategorizedTransaction } from '../categoryEngine';
import { useTransactionStore } from '../src/store';

const makeTx = (overrides: Partial<{
  dato: string; beløp: number; type: string; tekst: string;
  fraKonto: string; tilKonto: string;
}> = {}) => ({
  dato: '01.01.26',
  beløp: -500,
  type: 'Betaling',
  tekst: 'REMA 1000',
  fraKonto: 'Brukskonto',
  tilKonto: 'REMA',
  fraKontonummer: '',
  tilKontonummer: '',
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
  it('returns a deterministic content hash for the same input', () => {
    const tx = makeTx();
    const id1 = generateTransactionId(tx);
    const id2 = generateTransactionId(tx);
    expect(id1).toBe(id2);
  });

  it('includes all relevant fields in the hash', () => {
    const tx = makeTx();
    const id = generateTransactionId(tx);
    expect(id).toContain(tx.dato);
    expect(id).toContain(String(tx.beløp));
    expect(id).toContain(tx.type);
    expect(id).toContain(tx.tekst);
    expect(id).toContain(tx.fraKonto);
    expect(id).toContain(tx.tilKonto);
  });

  it('produces different IDs when any field differs', () => {
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

    variants.forEach((variant) => {
      expect(generateTransactionId(variant)).not.toBe(baseId);
    });
  });
});

describe('duplicate detection during import', () => {
  beforeEach(() => {
    useTransactionStore.getState().reset();
  });

  it('detects exact duplicates by transactionId', () => {
    const txA = makeTx();
    const txB = makeTx(); // identical content

    const catA = toCategorized(txA);
    const catB = toCategorized(txB);

    // catA and catB have different UUIDs (id) but same transactionId
    expect(catA.id).not.toBe(catB.id);
    expect(catA.transactionId).toBe(catB.transactionId);
  });

  it('correctly counts duplicates when reimporting', () => {
    const transactions = [
      makeTx({ tekst: 'REMA 1000', beløp: -200 }),
      makeTx({ tekst: 'KIWI', beløp: -150 }),
      makeTx({ tekst: 'Spotify', beløp: -119 }),
    ];

    const firstBatch = transactions.map(toCategorized);

    // Import first batch
    useTransactionStore.getState().importTransactions(firstBatch);
    expect(useTransactionStore.getState().transactions).toHaveLength(3);

    // Simulate reimport of same data
    const secondBatch = transactions.map(toCategorized);
    const existingIds = new Set(
      useTransactionStore.getState().transactions.map((t) => t.transactionId)
    );

    const duplicates = secondBatch.filter((tx) => existingIds.has(tx.transactionId));
    const unique = secondBatch.filter((tx) => !existingIds.has(tx.transactionId));
    const duplicatesCount = duplicates.length;

    expect(duplicatesCount).toBe(3);
    expect(unique).toHaveLength(0);
  });

  it('correctly separates new from duplicate transactions', () => {
    const existingTx = [
      makeTx({ tekst: 'REMA 1000', beløp: -200 }),
      makeTx({ tekst: 'KIWI', beløp: -150 }),
    ];

    useTransactionStore.getState().importTransactions(existingTx.map(toCategorized));

    // New batch: 2 existing + 1 new
    const newBatch = [
      ...existingTx,
      makeTx({ tekst: 'Netflix', beløp: -179 }),
    ].map(toCategorized);

    const existingIds = new Set(
      useTransactionStore.getState().transactions.map((t) => t.transactionId)
    );

    const duplicates = newBatch.filter((tx) => existingIds.has(tx.transactionId));
    const unique = newBatch.filter((tx) => !existingIds.has(tx.transactionId));

    expect(duplicates).toHaveLength(2);
    expect(unique).toHaveLength(1);
    expect(unique[0].tekst).toBe('Netflix');
  });

  it('handles empty store with no false duplicates', () => {
    const batch = [
      makeTx({ tekst: 'REMA 1000', beløp: -200 }),
      makeTx({ tekst: 'KIWI', beløp: -150 }),
    ].map(toCategorized);

    const existingIds = new Set(
      useTransactionStore.getState().transactions.map((t) => t.transactionId)
    );

    const duplicates = batch.filter((tx) => existingIds.has(tx.transactionId));
    const unique = batch.filter((tx) => !existingIds.has(tx.transactionId));

    expect(duplicates).toHaveLength(0);
    expect(unique).toHaveLength(2);
  });
});
