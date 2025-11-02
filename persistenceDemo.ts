/**
 * Persistence Service Demo
 * Demonstrates loading, saving, and managing persistent data
 */

import { useTransactionStore } from './src/store';
import { generateTransactionId } from './categoryEngine';
import {
  setupPersistence,
  saveStoreState,
  backupCurrentState,
  displayStorageInfo,
  exportCurrentState,
} from './services/storeIntegration';

async function demo() {
  console.log('='.repeat(80));
  console.log('PERSISTENCE SERVICE DEMO');
  console.log('='.repeat(80));
  console.log();

  // ============================================================================
  // STEP 1: Setup persistence (load existing data if available)
  // ============================================================================

  console.log('📦 STEP 1: Initialize persistence');
  console.log('-'.repeat(80));
  console.log();

  const unsubscribe = await setupPersistence();

  const state = useTransactionStore.getState();
  console.log();
  console.log('📊 Current state after initialization:');
  console.log(`   Transactions: ${state.transactions.length}`);
  console.log(`   Hovedkategorier: ${state.hovedkategorier.size}`);
  console.log(`   Underkategorier: ${state.underkategorier.size}`);
  console.log(`   Rules: ${state.rules.size}`);
  console.log(`   Locks: ${state.locks.size}`);
  console.log();

  // ============================================================================
  // STEP 2: Add some data if none exists
  // ============================================================================

  if (state.transactions.length === 0) {
    console.log('📦 STEP 2: Adding sample data (no existing data found)');
    console.log('-'.repeat(80));
    console.log();

    // Create categories
    state.createHovedkategori('Mat', { icon: '🍕', color: '#10b981' });
    const matKat = Array.from(useTransactionStore.getState().hovedkategorier.values()).find(
      k => k.name === 'Mat'
    );
    
    if (matKat) {
      state.createUnderkategori('Dagligvarer', matKat.id);
      console.log('✓ Created Mat → Dagligvarer');
    }

    state.createHovedkategori('Transport', { icon: '🚗', color: '#3b82f6' });
    const transportKat = Array.from(useTransactionStore.getState().hovedkategorier.values()).find(
      k => k.name === 'Transport'
    );
    
    if (transportKat) {
      state.createUnderkategori('Bensin', transportKat.id);
      console.log('✓ Created Transport → Bensin');
    }

    // Add transactions
    const transactions = [
      {
        dato: '2025-11-01',
        beløp: -450,
        tilKonto: '',
        tilKontonummer: '',
        fraKonto: 'Felles',
        fraKontonummer: '3610.61.63558',
        type: 'Betaling',
        tekst: 'KIWI TRONDHEIM',
        underkategori: 'Dagligvarer',
      },
      {
        dato: '2025-11-02',
        beløp: -380,
        tilKonto: '',
        tilKontonummer: '',
        fraKonto: 'Felles',
        fraKontonummer: '3610.61.63558',
        type: 'Betaling',
        tekst: 'REMA 1000',
        underkategori: 'Dagligvarer',
      },
      {
        dato: '2025-11-03',
        beløp: -550,
        tilKonto: '',
        tilKontonummer: '',
        fraKonto: 'Felles',
        fraKontonummer: '3610.61.63558',
        type: 'Betaling',
        tekst: 'CIRCLE K',
        underkategori: '',
      },
      {
        dato: '2025-11-04',
        beløp: 5000,
        tilKonto: 'Felles',
        tilKontonummer: '3610.61.63558',
        fraKonto: '',
        fraKontonummer: '',
        type: 'Renter',
        tekst: 'KREDITRENTER',
        underkategori: 'Renter',
      },
    ];

    const categorizedTxs = transactions.map(tx => ({
      ...tx,
      transactionId: generateTransactionId(tx),
      categoryId: undefined,
      isLocked: false,
    }));

    state.importTransactions(categorizedTxs);
    console.log(`✓ Imported ${transactions.length} transactions`);
    console.log();

    console.log('💾 Auto-save will persist this data...');
    console.log();

    // Wait a moment for auto-save to trigger
    await new Promise(resolve => setTimeout(resolve, 1500));
  } else {
    console.log('✓ STEP 2: Loaded existing data');
    console.log();
  }

  // ============================================================================
  // STEP 3: Display storage info
  // ============================================================================

  console.log('📊 STEP 3: Storage information');
  console.log('-'.repeat(80));
  console.log();

  await displayStorageInfo();
  console.log();

  // ============================================================================
  // STEP 4: Make a change and watch auto-save
  // ============================================================================

  console.log('📝 STEP 4: Making a change (will trigger auto-save)');
  console.log('-'.repeat(80));
  console.log();

  const currentState = useTransactionStore.getState();
  const dagligvarerKat = Array.from(currentState.underkategorier.values()).find(
    k => k.name === 'Dagligvarer'
  );

  if (dagligvarerKat) {
    const kiwiTx = currentState.transactions.find(t => t.tekst === 'KIWI TRONDHEIM');
    if (kiwiTx) {
      console.log('Categorizing KIWI transaction...');
      currentState.categorizeTransactionAction(kiwiTx.transactionId, dagligvarerKat.id, true);
      console.log('✓ Transaction categorized');
      console.log('⏳ Auto-save will trigger in ~1 second...');
      console.log();

      // Wait for auto-save
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // ============================================================================
  // STEP 5: Create a backup
  // ============================================================================

  console.log('💾 STEP 5: Creating backup');
  console.log('-'.repeat(80));
  console.log();

  const backupDir = await backupCurrentState();
  console.log(`✓ Backup created at: ${backupDir}`);
  console.log();

  // ============================================================================
  // STEP 6: Export to a single file
  // ============================================================================

  console.log('📤 STEP 6: Export to single file');
  console.log('-'.repeat(80));
  console.log();

  const exportPath = join(process.cwd(), 'data', 'export.json');
  await exportCurrentState(exportPath);
  console.log(`✓ Exported to: ${exportPath}`);
  console.log();

  // ============================================================================
  // STEP 7: Manual save
  // ============================================================================

  console.log('💾 STEP 7: Manual save');
  console.log('-'.repeat(80));
  console.log();

  await saveStoreState();
  console.log();

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('='.repeat(80));
  console.log('✅ PERSISTENCE DEMO COMPLETE');
  console.log('='.repeat(80));
  console.log();

  console.log('Features demonstrated:');
  console.log('  ✓ Initialize and load persisted data');
  console.log('  ✓ Auto-save on state changes (debounced)');
  console.log('  ✓ Manual save');
  console.log('  ✓ Create backups');
  console.log('  ✓ Export to single file');
  console.log('  ✓ Display storage statistics');
  console.log();

  console.log('Data is persisted in:');
  console.log(`  ${join(process.cwd(), 'data', 'persistent')}/`);
  console.log();

  console.log('To clear all data:');
  console.log('  import PersistenceService from "./services/persistence"');
  console.log('  await PersistenceService.clear()');
  console.log();

  // Cleanup
  unsubscribe();
}

// Helper to avoid import path issues
import { join } from 'path';

// Run demo
demo().catch(console.error);

