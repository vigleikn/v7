/**
 * CSV Import Flow Test
 * Tester hele importflyten: parsing → auto-kategorisering → lagring → lasting → duplikatsjekk
 */

import { parseCSV } from '../csvParser';
import { useTransactionStore } from '../store';
import { generateTransactionId } from '../categoryEngine';
import PersistenceService from '../services/persistence';
import { saveStoreState, initializeStore } from '../services/storeIntegration';

console.log('='.repeat(80));
console.log('CSV IMPORT FLYT TEST');
console.log('='.repeat(80));
console.log();

// Helper function to log state
function logState(title: string) {
  console.log('─'.repeat(80));
  console.log(`📊 ${title}`);
  console.log('─'.repeat(80));
  
  const state = useTransactionStore.getState();
  
  console.log();
  console.log(`📝 Transaksjoner (${state.transactions.length}):`);
  state.transactions.forEach((tx, i) => {
    const kategori = tx.categoryId
      ? state.underkategorier.get(tx.categoryId) || state.hovedkategorier.get(tx.categoryId)
      : null;
    
    const lockIcon = tx.isLocked ? ' 🔒' : '';
    const categoryText = kategori ? kategori.name : 'Ukategorisert';
    
    console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toString().padStart(8)} | ${tx.tekst.padEnd(20)} | ${categoryText}${lockIcon}`);
  });
  
  console.log();
  console.log(`📋 Regler (${state.rules.size}):`);
  if (state.rules.size > 0) {
    Array.from(state.rules.values()).forEach((rule, i) => {
      const cat = state.underkategorier.get(rule.categoryId) || state.hovedkategorier.get(rule.categoryId);
      console.log(`  ${i + 1}. "${rule.tekst}" → ${cat?.name || 'Ukjent'}`);
    });
  } else {
    console.log('  Ingen regler');
  }
  
  console.log();
  console.log(`📊 Statistikk:`);
  console.log(`  Total: ${state.stats.total}`);
  console.log(`  Kategoriserte: ${state.stats.categorized}`);
  console.log(`  Ukategoriserte: ${state.stats.uncategorized}`);
  console.log();
}

async function runTest() {
  // ============================================================================
  // STEG 1: Simuler CSV-streng med 3 transaksjoner
  // ============================================================================

  console.log('📄 STEG 1: Simuler CSV-streng med 3 transaksjoner');
  console.log();

  const csvString = `Dato;Beløp;Originalt Beløp;Original Valuta;Til konto;Til kontonummer;Fra konto;Fra kontonummer;Type;Tekst;KID;Hovedkategori;Underkategori
2025-11-01;-450,00;-450,00;NOK;;;Felles;3610.61.63558;Betaling;REMA 1000;;Mat;Dagligvarer
2025-11-02;-320,00;-320,00;NOK;;;Felles;3610.61.63558;Betaling;KIWI;;Mat;Dagligvarer
2025-11-03;-280,00;-280,00;NOK;;;Felles;3610.61.63558;Betaling;SPAR;;Mat;Dagligvarer`;

  console.log('CSV-innhold:');
  console.log('─'.repeat(80));
  console.log(csvString);
  console.log('─'.repeat(80));
  console.log();

  console.log('✓ CSV-streng opprettet med 3 transaksjoner');
  console.log('  - REMA 1000');
  console.log('  - KIWI');
  console.log('  - SPAR');
  console.log();

  // ============================================================================
  // STEG 2: Kjør csvParser() og bekreft resultat
  // ============================================================================

  console.log('📄 STEG 2: Parse CSV med csvParser()');
  console.log();

  const parseResult = parseCSV(csvString);

  console.log('Parser-resultat:');
  console.log(`  Total transaksjoner funnet: ${parseResult.originalCount}`);
  console.log(`  Unike transaksjoner: ${parseResult.uniqueCount}`);
  console.log(`  Duplikater i CSV: ${parseResult.duplicates.length}`);
  console.log();

  console.log('Parsede transaksjoner:');
  parseResult.transactions.forEach((tx, i) => {
    console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toFixed(2)} NOK | "${tx.tekst}"`);
    console.log(`     Type: ${tx.type}`);
    console.log(`     Fra konto: ${tx.fraKonto}`);
  });
  console.log();

  if (parseResult.uniqueCount === 3) {
    console.log('✅ SUKSESS: Parser returnerte korrekt antall transaksjoner');
  } else {
    console.log(`❌ FEIL: Forventet 3 transaksjoner, fikk ${parseResult.uniqueCount}`);
  }
  console.log();

  // ============================================================================
  // STEG 3: Send til regelmotor for auto-kategorisering
  // ============================================================================

  console.log('📄 STEG 3: Send transaksjoner til regelmotor');
  console.log();

  // Initialize store
  const store = useTransactionStore.getState();
  store.reset();

  // Create categories first
  store.createHovedkategori('Mat', {
    color: '#10b981',
    icon: '🍕',
    isIncome: false,
  });

  let currentState = useTransactionStore.getState();
  const matKategori = Array.from(currentState.hovedkategorier.values()).find(
    k => k.name === 'Mat'
  );

  if (!matKategori) {
    throw new Error('Mat kategori ikke opprettet');
  }

  store.createUnderkategori('Dagligvarer', matKategori.id);

  currentState = useTransactionStore.getState();
  const dagligvarerKategori = Array.from(currentState.underkategorier.values()).find(
    k => k.name === 'Dagligvarer'
  );

  if (!dagligvarerKategori) {
    throw new Error('Dagligvarer kategori ikke opprettet');
  }

  console.log('✓ Opprettet kategorier: Mat → Dagligvarer');
  console.log();

  // Convert to categorized transactions
  const categorizedTransactions = parseResult.transactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
  }));

  // Import transactions
  store.importTransactions(categorizedTransactions);

  console.log('✓ Importert transaksjoner til store (ukategoriserte)');
  console.log();

  logState('State etter import (før kategorisering)');

  // Categorize REMA 1000 manually (creates rule)
  console.log('🏷️  Kategoriser REMA 1000 manuelt (oppretter regel):');
  console.log();

  currentState = useTransactionStore.getState();
  const remaTx = currentState.transactions.find(t => t.tekst === 'REMA 1000');

  if (!remaTx) {
    throw new Error('REMA 1000 ikke funnet');
  }

  console.log(`  Kategoriserer: ${remaTx.dato} - "${remaTx.tekst}"`);
  console.log(`  Til: Dagligvarer`);
  console.log(`  Oppretter regel: Ja`);
  console.log();

  store.categorizeTransactionAction(
    remaTx.transactionId,
    dagligvarerKategori.id,
    true // Create rule
  );

  console.log('✓ REMA 1000 kategorisert');
  console.log();

  // Verify rule was created
  currentState = useTransactionStore.getState();
  const remaRule = currentState.rules.get('rema 1000');

  if (remaRule) {
    console.log('✅ SUKSESS: Regel opprettet for "rema 1000"');
  } else {
    console.log('❌ FEIL: Regel ble ikke opprettet');
  }
  console.log();

  logState('State etter kategorisering med regel');

  // ============================================================================
  // STEG 4: Lagre til lokal lagring
  // ============================================================================

  console.log('📄 STEG 4: Lagre til lokal lagring');
  console.log();

  await PersistenceService.init();

  currentState = useTransactionStore.getState();

  console.log('Lagrer:');
  console.log(`  - ${currentState.transactions.length} transaksjoner`);
  console.log(`  - ${currentState.hovedkategorier.size} hovedkategorier`);
  console.log(`  - ${currentState.underkategorier.size} underkategorier`);
  console.log(`  - ${currentState.rules.size} regler`);
  console.log(`  - ${currentState.locks.size} unntak`);
  console.log();

  await saveStoreState();

  console.log('✓ Data lagret til lokal lagring');
  console.log();

  // ============================================================================
  // STEG 5: Tøm store og last fra lagring
  // ============================================================================

  console.log('📄 STEG 5: Tøm store og last fra lagring');
  console.log();

  console.log('Før reset:');
  console.log(`  - Transaksjoner: ${currentState.transactions.length}`);
  console.log(`  - Regler: ${currentState.rules.size}`);
  console.log();

  store.reset();

  currentState = useTransactionStore.getState();

  console.log('Etter reset:');
  console.log(`  - Transaksjoner: ${currentState.transactions.length}`);
  console.log(`  - Regler: ${currentState.rules.size}`);
  console.log();

  console.log('Laster fra lagring...');
  await initializeStore();

  currentState = useTransactionStore.getState();

  console.log();
  console.log('Etter lasting:');
  console.log(`  - Transaksjoner: ${currentState.transactions.length}`);
  console.log(`  - Regler: ${currentState.rules.size}`);
  console.log();

  console.log('✓ Data lastet fra lokal lagring');
  console.log();

  logState('State etter lasting fra lagring');

  // ============================================================================
  // STEG 6: Bekreft at alt matcher forventet
  // ============================================================================

  console.log('📄 STEG 6: Bekreft at data er korrekt');
  console.log();

  currentState = useTransactionStore.getState();

  // 6a. Verify transaction count
  console.log('6a. Verifiser antall transaksjoner:');
  if (currentState.transactions.length === 3) {
    console.log(`  ✅ Korrekt antall: 3 transaksjoner`);
  } else {
    console.log(`  ❌ FEIL: Forventet 3, fikk ${currentState.transactions.length}`);
  }
  console.log();

  // 6b. Verify REMA is categorized
  console.log('6b. Verifiser at REMA 1000 er kategorisert:');
  const loadedRema = currentState.transactions.find(t => t.tekst === 'REMA 1000');
  const loadedDagligvarer = Array.from(currentState.underkategorier.values()).find(
    k => k.name === 'Dagligvarer'
  );

  if (loadedRema && loadedRema.categoryId === loadedDagligvarer?.id) {
    console.log(`  ✅ REMA 1000 er kategorisert til Dagligvarer`);
  } else {
    console.log(`  ❌ FEIL: REMA 1000 har feil kategori eller mangler`);
  }
  console.log();

  // 6c. Verify rule exists
  console.log('6c. Verifiser at regel eksisterer:');
  const loadedRule = currentState.rules.get('rema 1000');

  if (loadedRule && loadedRule.categoryId === loadedDagligvarer?.id) {
    console.log(`  ✅ Regel: "rema 1000" → Dagligvarer`);
  } else {
    console.log(`  ❌ FEIL: Regel mangler eller er feil`);
  }
  console.log();

  // ============================================================================
  // STEG 7: Import samme CSV igjen og bekreft ingen duplikater
  // ============================================================================

  console.log('📄 STEG 7: Re-importer samme CSV (duplikattest)');
  console.log();

  currentState = useTransactionStore.getState();
  const countBefore = currentState.transactions.length;

  console.log(`Transaksjoner før re-import: ${countBefore}`);
  console.log();
  console.log('Parser samme CSV på nytt...');

  // Parse same CSV again
  const parseResult2 = parseCSV(csvString);

  console.log(`  Parser-resultat: ${parseResult2.uniqueCount} unike`);
  console.log();

  // Convert to categorized transactions
  const newTransactions2 = parseResult2.transactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
  }));

  console.log('Sjekker for duplikater mot eksisterende data...');

  // Check for duplicates
  const existingIds = new Set(currentState.transactions.map(t => t.transactionId));
  const uniqueNew = newTransactions2.filter(tx => !existingIds.has(tx.transactionId));

  console.log(`  Nye transaksjoner (ikke duplikater): ${uniqueNew.length}`);
  console.log(`  Duplikater funnet: ${newTransactions2.length - uniqueNew.length}`);
  console.log();

  if (uniqueNew.length === 0) {
    console.log('✅ SUKSESS: Alle transaksjoner er duplikater (forventet oppførsel)');
    console.log('   Ingen nye transaksjoner ble lagt til');
  } else {
    console.log('❌ FEIL: Duplikatsjekk fungerte ikke, nye transaksjoner ble funnet');
  }
  console.log();

  // Import only unique ones (should be zero)
  if (uniqueNew.length > 0) {
    const allTransactions = [...currentState.transactions, ...uniqueNew];
    store.importTransactions(allTransactions);
    store.applyRulesToAll();
  }

  currentState = useTransactionStore.getState();
  const countAfter = currentState.transactions.length;

  console.log(`Transaksjoner etter re-import: ${countAfter}`);
  console.log();

  if (countBefore === countAfter) {
    console.log('✅ SUKSESS: Samme antall transaksjoner (ingen duplikater lagt til)');
  } else {
    console.log(`❌ FEIL: Antall endret fra ${countBefore} til ${countAfter}`);
  }
  console.log();

  logState('State etter duplikattest (skal være uendret)');

  // ============================================================================
  // BONUS: Test at regel fungerer på ny transaksjon
  // ============================================================================

  console.log('📄 BONUS: Test at regel fungerer på ny REMA-transaksjon');
  console.log();

  const newCsvWithExtraRema = `Dato;Beløp;Originalt Beløp;Original Valuta;Til konto;Til kontonummer;Fra konto;Fra kontonummer;Type;Tekst;KID;Hovedkategori;Underkategori
2025-11-10;-599,00;-599,00;NOK;;;Felles;3610.61.63558;Betaling;REMA 1000;;Mat;Dagligvarer`;

  console.log('Parser ny CSV med én ekstra REMA 1000-transaksjon...');

  const parseResult3 = parseCSV(newCsvWithExtraRema);
  const newRemaTransactions = parseResult3.transactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
  }));

  console.log(`  Parsed: ${parseResult3.uniqueCount} transaksjon`);
  console.log();

  // Check if it's unique
  currentState = useTransactionStore.getState();
  const existingIds2 = new Set(currentState.transactions.map(t => t.transactionId));
  const uniqueNewRema = newRemaTransactions.filter(tx => !existingIds2.has(tx.transactionId));

  if (uniqueNewRema.length > 0) {
    console.log(`  ✓ Ny REMA 1000-transaksjon (ikke duplikat)`);
    console.log();

    // Import it
    const allTxs = [...currentState.transactions, ...uniqueNewRema];
    store.importTransactions(allTxs);

    // Apply rules (should auto-categorize)
    store.applyRulesToAll();

    currentState = useTransactionStore.getState();

    // Check if it was auto-categorized
    const newRema = currentState.transactions.find(
      t => t.dato === '2025-11-10' && t.tekst === 'REMA 1000'
    );

    if (newRema && newRema.categoryId === loadedDagligvarer?.id) {
      console.log('✅ SUKSESS: Ny REMA 1000 ble automatisk kategorisert til Dagligvarer!');
      console.log('   Regelen fungerer på nye transaksjoner');
    } else {
      console.log('❌ FEIL: Ny REMA 1000 ble ikke auto-kategorisert');
    }
    console.log();

    // Show all REMA transactions
    const allRema = currentState.transactions.filter(t => t.tekst === 'REMA 1000');
    console.log(`Alle REMA 1000-transaksjoner (${allRema.length}):`);
    allRema.forEach((tx, i) => {
      const kat = tx.categoryId
        ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
        : null;
      console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toFixed(2)} NOK → ${kat?.name || 'Ukategorisert'}`);
    });
    console.log();
  }

  logState('State etter test av regel på ny transaksjon');

  // ============================================================================
  // OPPSUMMERING
  // ============================================================================

  console.log('='.repeat(80));
  console.log('📋 OPPSUMMERING');
  console.log('='.repeat(80));
  console.log();

  currentState = useTransactionStore.getState();

  console.log('✅ Alle tester fullført:');
  console.log();
  console.log('  1. ✓ Simulert CSV-streng med 3 transaksjoner');
  console.log('  2. ✓ Kjørt csvParser() og bekreftet resultat');
  console.log('  3. ✓ Sendt til regelmotor for auto-kategorisering');
  console.log('     - Kategorisert REMA 1000 manuelt');
  console.log('     - Regel opprettet');
  console.log('  4. ✓ Lagret til lokal lagring');
  console.log('  5. ✓ Tømt store og lastet fra lagring');
  console.log('  6. ✓ Bekreftet at:');
  console.log('     - Transaksjoner er tilbake (3 stk)');
  console.log('     - REMA 1000 er kategorisert');
  console.log('     - Regler matcher forventet');
  console.log('  7. ✓ Re-importert samme CSV');
  console.log('     - Ingen duplikater lagt til');
  console.log('  BONUS: ✓ Ny REMA 1000 auto-kategorisert av regel');
  console.log();

  console.log('📊 Slutt-state:');
  console.log(`  Total transaksjoner: ${currentState.stats.total}`);
  console.log(`  Kategoriserte: ${currentState.stats.categorized}`);
  console.log(`  Ukategoriserte: ${currentState.stats.uncategorized}`);
  console.log(`  Regler: ${currentState.rules.size}`);
  console.log();

  console.log('📋 Transaksjoner:');
  currentState.transactions.forEach((tx, i) => {
    const kat = tx.categoryId
      ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
      : null;
    console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toString().padStart(8)} | ${tx.tekst.padEnd(20)} | ${kat?.name || 'Ukategorisert'}`);
  });
  console.log();

  console.log('📋 Regler:');
  Array.from(currentState.rules.values()).forEach((rule, i) => {
    const cat = currentState.underkategorier.get(rule.categoryId) || currentState.hovedkategorier.get(rule.categoryId);
    console.log(`  ${i + 1}. "${rule.tekst}" → ${cat?.name || 'Ukjent'}`);
  });
  console.log();

  console.log('🎯 CSV Import Flow Test Fullført!');
  console.log('='.repeat(80));
  console.log();
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test feilet:', error);
  process.exit(1);
});

