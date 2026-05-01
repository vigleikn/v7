import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeState = {
  transactions: [{ id: 'tx-1', transactionId: 'bank-1' }],
  hovedkategorier: new Map([['cat-1', { id: 'cat-1', name: 'Mat' }]]),
  underkategorier: new Map(),
  rules: new Map(),
  locks: new Map(),
  budgets: new Map(),
  startBalance: null,
};

vi.mock('../src/store', () => ({
  useTransactionStore: {
    getState: () => storeState,
  },
}));

describe('auto backup', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('builds a timestamped backup filename that sorts chronologically', async () => {
    vi.setSystemTime(new Date(2026, 3, 30, 20, 15, 30));
    const { createBackupFilename } = await import('../services/autoBackup');

    expect(createBackupFilename()).toBe('transaction-backup-2026-04-30-201530.json');

    vi.useRealTimers();
  });

  it('reports selected folder metadata from localStorage', async () => {
    localStorage.setItem('auto-backup-directory-name', 'Økonomi-backup');
    localStorage.setItem('auto-backup-last-completed-at', '2026-04-30T20:15:30.000Z');
    localStorage.setItem('auto-backup-last-filename', 'transaction-backup-2026-04-30-201530.json');

    const { getAutoBackupStatus } = await import('../services/autoBackup');

    expect(getAutoBackupStatus()).toMatchObject({
      directoryName: 'Økonomi-backup',
      lastCompletedAt: '2026-04-30T20:15:30.000Z',
      lastFilename: 'transaction-backup-2026-04-30-201530.json',
    });
  });

  it('writes backup JSON to a selected directory handle', async () => {
    vi.setSystemTime(new Date(2026, 3, 30, 20, 15, 30));
    const write = vi.fn();
    const close = vi.fn();
    const createWritable = vi.fn().mockResolvedValue({ write, close });
    const getFileHandle = vi.fn().mockResolvedValue({ createWritable });
    const directoryHandle = {
      name: 'Budget backups',
      getFileHandle,
    };

    const { writeBackupToDirectory } = await import('../services/autoBackup');
    const result = await writeBackupToDirectory(directoryHandle as any, {
      version: '1.0.0',
      backupDate: '2026-04-30T20:15:30.000Z',
      data: {
        transactions: [],
        hovedkategorier: [],
        underkategorier: [],
        rules: [],
        locks: [],
        budgets: [],
        startBalance: null,
      },
      metadata: {
        transactionCount: 0,
        categoryCount: 0,
        ruleCount: 0,
      },
    });

    expect(result).toEqual({
      success: true,
      mode: 'directory',
      filename: 'transaction-backup-2026-04-30-201530.json',
      directoryName: 'Budget backups',
    });
    expect(getFileHandle).toHaveBeenCalledWith('transaction-backup-2026-04-30-201530.json', {
      create: true,
    });
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"version": "1.0.0"'));
    expect(close).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
