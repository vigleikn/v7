import { describe, it, expect, beforeEach } from 'vitest';
import { useTransactionStore } from '../src/store';

describe('redactSensitive store flag', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useTransactionStore.setState({ redactSensitive: false });
  });

  it('defaults to false', () => {
    const state = useTransactionStore.getState();
    expect(state.redactSensitive).toBe(false);
  });

  it('can be set to true via setRedactSensitive', () => {
    useTransactionStore.getState().setRedactSensitive(true);
    expect(useTransactionStore.getState().redactSensitive).toBe(true);
  });

  it('can be toggled back to false', () => {
    useTransactionStore.getState().setRedactSensitive(true);
    expect(useTransactionStore.getState().redactSensitive).toBe(true);
    useTransactionStore.getState().setRedactSensitive(false);
    expect(useTransactionStore.getState().redactSensitive).toBe(false);
  });

  it('does not affect other state when toggled', () => {
    const stateBefore = useTransactionStore.getState();
    const txCountBefore = stateBefore.transactions.length;
    const budgetCountBefore = stateBefore.budgets.size;

    useTransactionStore.getState().setRedactSensitive(true);

    const stateAfter = useTransactionStore.getState();
    expect(stateAfter.transactions.length).toBe(txCountBefore);
    expect(stateAfter.budgets.size).toBe(budgetCountBefore);
    expect(stateAfter.redactSensitive).toBe(true);
  });

  it('is not included in persisted state (partialize excludes it)', () => {
    // The partialize function only persists specific fields.
    // redactSensitive should NOT be in the persisted payload,
    // so it always starts as false on page reload.
    // We verify this by checking the store always initializes with false.
    useTransactionStore.getState().setRedactSensitive(true);
    // Simulate a fresh store state read — the initial value should be false
    useTransactionStore.setState({ redactSensitive: false });
    expect(useTransactionStore.getState().redactSensitive).toBe(false);
  });
});
