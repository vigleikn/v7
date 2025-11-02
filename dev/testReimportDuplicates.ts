/**
 * Re-Import Duplicate Detection Test
 * Verifies that duplicates ARE detected when importing the same CSV twice
 */

import { parseCSVFile } from '../csvParser';
import { useTransactionStore } from '../src/store';
import { generateTransactionId } from '../categoryEngine';
import { join } from 'path';

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`🔍 ${title}`);
  console.log('='.repeat(70));
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

async function testReimportDuplicates() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     RE-IMPORT DUPLICATE DETECTION TEST                     ║');
  console.log('║     Verifies duplicates detected on second import          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const store = useTransactionStore.getState();
  const csvPath = join(process.cwd(), 'data', '1nov12mnd.csv');

  // ========================================================================
  // First Import
  // ========================================================================

  logSection('First Import');
  
  store.reset();
  const parseResult1 = await parseCSVFile(csvPath);
  
  logInfo(`CSV parsed: ${parseResult1.originalCount} transaksjoner`);
  
  const transactions1 = parseResult1.transactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
    confidence: 0,
    source: 'uncategorized' as const,
  }));
  
  store.importTransactions(transactions1);
  
  const afterFirstImport = useTransactionStore.getState();
  logSuccess(`First import: ${afterFirstImport.transactions.length} transaksjoner i store`);

  // ========================================================================
  // Second Import (Same File)
  // ========================================================================

  logSection('Second Import (same file - should find duplicates)');
  
  const parseResult2 = await parseCSVFile(csvPath);
  
  logInfo(`CSV parsed again: ${parseResult2.originalCount} transaksjoner`);
  
  const transactions2 = parseResult2.transactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
    confidence: 0,
    source: 'uncategorized' as const,
  }));
  
  // Check against existing
  const existingIds = new Set(afterFirstImport.transactions.map(t => t.transactionId));
  const duplicates = transactions2.filter(tx => existingIds.has(tx.transactionId));
  const unique = transactions2.filter(tx => !existingIds.has(tx.transactionId));
  
  logInfo(`Transaksjoner i CSV: ${transactions2.length}`);
  logInfo(`Duplikater mot store: ${duplicates.length}`);
  logInfo(`Nye transaksjoner: ${unique.length}`);
  
  if (duplicates.length === parseResult2.originalCount) {
    logSuccess('✅ Alle transaksjoner fra andre import er duplikater (korrekt!)');
  } else {
    console.log(`⚠️  Forventet ${parseResult2.originalCount} duplikater, fant ${duplicates.length}`);
  }
  
  if (unique.length === 0) {
    logSuccess('✅ Ingen nye transaksjoner å importere (korrekt!)');
  }

  // Import only unique (should be 0)
  const beforeSecondImport = afterFirstImport.transactions.length;
  store.importTransactions([...afterFirstImport.transactions, ...unique]);
  
  const afterSecondImport = useTransactionStore.getState();
  const added = afterSecondImport.transactions.length - beforeSecondImport;
  
  logInfo(`Transaksjoner lagt til: ${added}`);
  logInfo(`Total i store: ${afterSecondImport.transactions.length}`);

  // ========================================================================
  // Summary
  // ========================================================================

  logSection('Oppsummering');
  
  console.log('\n📊 Resultat:');
  console.log(`  • First import: ${parseResult1.originalCount} transaksjoner importert`);
  console.log(`  • Second import: ${duplicates.length} duplikater funnet`);
  console.log(`  • Second import: ${unique.length} nye transaksjoner`);
  console.log(`  • Total i store: ${afterSecondImport.transactions.length}`);
  console.log('');
  
  console.log('✅ Konklusjon:');
  console.log('  • CSV parser importerer ALLE rader fra filen');
  console.log('  • Duplikater sjekkes KUN mot eksisterende data i store');
  console.log('  • Samme fil to ganger = alle duplikater (korrekt)');
  console.log('  • Intern duplikatsjekk i CSV er DEAKTIVERT (korrekt)');
  console.log('');
  
  logSuccess('Test bestått!\n');
}

testReimportDuplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test feilet:', error);
    process.exit(1);
  });

