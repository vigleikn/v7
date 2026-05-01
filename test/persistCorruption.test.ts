import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Zustand persist with corrupt localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('does not throw when transaction-store is invalid JSON; clears bad key', async () => {
    localStorage.setItem('transaction-store', '{');
    const { useTransactionStore } = await import('../src/store');
    expect(() => useTransactionStore.getState()).not.toThrow();
    expect(localStorage.getItem('transaction-store')).toBeNull();
    expect(Array.isArray(useTransactionStore.getState().transactions)).toBe(true);
  });

  it('loads normally when storage is empty', async () => {
    const { useTransactionStore } = await import('../src/store');
    expect(useTransactionStore.getState().hovedkategorier.size).toBeGreaterThan(0);
  });
});
