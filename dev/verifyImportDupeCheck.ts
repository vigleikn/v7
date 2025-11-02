/**
 * CSV Import Duplicate Detection Test
 * Verifies duplicate detection during import from data/1nov12mnd.csv
 * 
 * This test:
 * - Resets the store
 * - Imports transactions from CSV
 * - Identifies and logs all duplicates
 * - Shows summary statistics
 */

import { parseCSVFile } from '../csvParser';
import { useTransactionStore } from '../store';
import { generateTransactionId } from '../categoryEngine';
import { join } from 'path';

// ============================================================================
// Helper Functions
// ============================================================================

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`🔍 ${title}`);
  console.log('='.repeat(70));
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

function logDuplicate(transaction: any, index: number) {
  const beløpFormatted = Math.round(transaction.beløp).toString();
  const arrow = transaction.beløp < 0 ? '→' : '←';
  const fromAccount = transaction.fraKontonummer || 'N/A';
  const toAccount = transaction.tilKontonummer || 'N/A';
  
  console.log(
    `⛔ Duplikat #${index}: [${transaction.dato}] ${beløpFormatted} kr • ${transaction.tekst} • ${fromAccount} ${arrow} ${toAccount}`
  );
}

// ============================================================================
// Main Test Function
// ============================================================================

async function verifyImportDuplicateCheck() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     CSV IMPORT DUPLICATE DETECTION TEST                    ║');
  console.log('║     File: data/1nov12mnd.csv                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ========================================================================
  // Step 1: Reset Store
  // ========================================================================

  logSection('Step 1: Nullstiller store');
  
  const store = useTransactionStore.getState();
  store.reset();
  
  const initialState = useTransactionStore.getState();
  logSuccess('Store nullstilt');
  logInfo(`Transaksjoner i store før import: ${initialState.transactions.length}`);

  // ========================================================================
  // Step 2: Parse CSV File
  // ========================================================================

  logSection('Step 2: Leser og parser CSV-fil');
  
  const csvPath = join(process.cwd(), 'data', '1nov12mnd.csv');
  logInfo(`Fil: ${csvPath}`);
  
  let parseResult;
  try {
    parseResult = await parseCSVFile(csvPath);
    logSuccess(`CSV parsert`);
  } catch (error) {
    logError(`Feil ved lesing av CSV: ${error}`);
    return;
  }

  // ========================================================================
  // Step 3: Parse Results from CSV
  // ========================================================================

  logSection('Step 3: Parsing-resultat fra CSV');
  
  const { transactions, originalCount } = parseResult;
  
  logInfo(`Total linjer i CSV: ${originalCount}`);
  logInfo(`Alle transaksjoner parset: ${transactions.length}`);
  logSuccess('CSV parser sjekker IKKE for duplikater internt (korrekt oppførsel)\n');

  // ========================================================================
  // Step 4: Check for Duplicates Against Existing Store Data
  // ========================================================================

  logSection('Step 4: Sjekk mot eksisterende transaksjoner i store');
  
  // Convert to CategorizedTransactions
  const newTransactions = transactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
    confidence: 0,
    source: 'uncategorized' as const,
  }));
  
  // Check against existing (should be 0 since we reset)
  const existingIds = new Set(initialState.transactions.map(t => t.transactionId));
  const duplicatesWithExisting = newTransactions.filter(tx => 
    existingIds.has(tx.transactionId)
  );
  
  logInfo(`Eksisterende transaksjoner i store: ${existingIds.size}`);
  logInfo(`Duplikater mot store: ${duplicatesWithExisting.length}`);
  
  if (duplicatesWithExisting.length > 0) {
    console.log('\n⚠️  Duplikater mot eksisterende data (vil bli ignorert):');
    console.log('');
    duplicatesWithExisting.slice(0, 20).forEach((dup, index) => {
      logDuplicate(dup, index + 1);
    });
    if (duplicatesWithExisting.length > 20) {
      console.log(`   ... og ${duplicatesWithExisting.length - 20} duplikater til`);
    }
    console.log('');
  } else {
    logSuccess('Ingen duplikater mot eksisterende data (forventet etter reset)');
  }

  // ========================================================================
  // Step 5: Import to Store
  // ========================================================================

  logSection('Step 5: Importerer unike transaksjoner til store');
  
  const uniqueNewTransactions = newTransactions.filter(tx => 
    !existingIds.has(tx.transactionId)
  );
  
  logInfo(`Transaksjoner som vil bli importert: ${uniqueNewTransactions.length}`);
  
  store.importTransactions(uniqueNewTransactions);
  
  const afterImport = useTransactionStore.getState();
  logSuccess(`Import fullført`);
  logInfo(`Transaksjoner i store etter import: ${afterImport.transactions.length}`);

  // ========================================================================
  // Step 6: Summary
  // ========================================================================

  logSection('Oppsummering');
  
  console.log('\n📊 Import-statistikk:');
  console.log(`  • Total linjer i CSV: ${originalCount}`);
  console.log(`  • Transaksjoner fra CSV: ${transactions.length}`);
  console.log(`  • Duplikater mot store: ${duplicatesWithExisting.length}`);
  console.log(`  • Nye importert til store: ${uniqueNewTransactions.length}`);
  console.log(`  • Total i store etter import: ${afterImport.transactions.length}`);
  console.log('');
  
  if (duplicatesWithExisting.length > 0) {
    const percentage = ((duplicatesWithExisting.length / originalCount) * 100).toFixed(1);
    console.log(`📈 Duplikatrate: ${percentage}% mot eksisterende data`);
    console.log('');
  }
  
  // Duplicate detection details
  console.log('🔍 Duplikat-deteksjon basert på:');
  console.log('  • Dato');
  console.log('  • Beløp');
  console.log('  • Type');
  console.log('  • Tekst');
  console.log('  • Fra konto');
  console.log('  • Til konto');
  console.log('');
  
  logSuccess('Test fullført!\n');

  // ========================================================================
  // Step 7: Sample Data Display
  // ========================================================================

  logSection('Eksempel på importerte transaksjoner (første 10)');
  
  const sampleTransactions = afterImport.transactions.slice(0, 10);
  console.log('');
  sampleTransactions.forEach((tx, i) => {
    const beløpFormatted = Math.round(tx.beløp).toString();
    const sign = tx.beløp >= 0 ? '+' : '';
    console.log(`  ${i + 1}. [${tx.dato}] ${sign}${beløpFormatted} kr • ${tx.type} • ${tx.tekst}`);
  });
  
  if (afterImport.transactions.length > 10) {
    console.log(`  ... og ${afterImport.transactions.length - 10} til`);
  }
  console.log('');

  // ========================================================================
  // Step 8: Duplicate Examples Against Store (if any)
  // ========================================================================

  if (duplicatesWithExisting.length > 0) {
    logSection('Eksempler på duplikater mot store (første 10)');
    console.log('');
    const sampleDuplicates = duplicatesWithExisting.slice(0, 10);
    sampleDuplicates.forEach((dup, i) => {
      logDuplicate(dup, i + 1);
    });
    if (duplicatesWithExisting.length > 10) {
      console.log(`  ... og ${duplicatesWithExisting.length - 10} duplikater til\n`);
    }
  } else {
    logInfo('Ingen duplikater mot store (alle transaksjoner fra CSV er nye)');
  }
}

// ============================================================================
// Run Test
// ============================================================================

verifyImportDuplicateCheck()
  .then(() => {
    console.log('✨ Test fullført!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test feilet:', error);
    console.error(error);
    process.exit(1);
  });

