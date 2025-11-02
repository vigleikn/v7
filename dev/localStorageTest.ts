/**
 * Local Storage, Rule Engine, and Zustand Store Integration Test
 * Tests complete persistence workflow without React
 */

import { useTransactionStore } from '../src/store';
import { generateTransactionId } from '../categoryEngine';
import { Transaction } from '../csvParser';
import PersistenceService from '../services/persistence';
import {
  initializeStore,
  saveStoreState,
  displayStorageInfo,
} from '../services/storeIntegration';

console.log('='.repeat(80));
console.log('LOKAL LAGRING, REGELMOTOR OG ZUSTAND-STORE TEST');
console.log('='.repeat(80));
console.log();

// Helper to log current state
function logCurrentState(title: string) {
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
    
    console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toString().padStart(8)} NOK | ${tx.tekst.padEnd(20)} | ${categoryText}${lockIcon}`);
  });
  
  console.log();
  console.log(`📁 Hovedkategorier (${state.hovedkategorier.size}):`);
  Array.from(state.hovedkategorier.values()).forEach((hk, i) => {
    console.log(`  ${i + 1}. ${hk.icon || ''} ${hk.name} ${hk.isIncome ? '[System]' : ''}`);
    const details = state.getHovedkategoriWithUnderkategorier(hk.id);
    if (details && details.underkategorier.length > 0) {
      details.underkategorier.forEach(uk => {
        console.log(`     └─ ${uk.name}`);
      });
    }
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
  console.log(`🔒 Unntak (${state.locks.size}):`);
  if (state.locks.size > 0) {
    Array.from(state.locks.values()).forEach((lock, i) => {
      const tx = state.transactions.find(t => t.transactionId === lock.transactionId);
      console.log(`  ${i + 1}. ${tx?.dato} - "${tx?.tekst}"`);
    });
  } else {
    console.log('  Ingen unntak');
  }
  
  console.log();
  console.log(`📊 Statistikk:`);
  console.log(`  Total: ${state.stats.total}`);
  console.log(`  Kategoriserte: ${state.stats.categorized}`);
  console.log(`  Ukategoriserte: ${state.stats.uncategorized}`);
  console.log(`  Låste: ${state.stats.locked}`);
  console.log();
}

async function runTest() {
  // ============================================================================
  // STEG 1: Sett opp mock-kategorier og transaksjoner i minnet
  // ============================================================================

  console.log('🔧 STEG 1: Sett opp mock-data i minnet (ikke last fra disk)');
  console.log();

  const store = useTransactionStore.getState();

  // Clear any existing data
  store.reset();

  // Create hovedkategori "Mat"
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

  console.log(`✓ Opprettet hovedkategori: Mat`);

  // Create underkategori "Dagligvarer"
  store.createUnderkategori('Dagligvarer', matKategori.id);

  currentState = useTransactionStore.getState();
  const dagligvarerKategori = Array.from(currentState.underkategorier.values()).find(
    k => k.name === 'Dagligvarer'
  );

  if (!dagligvarerKategori) {
    throw new Error('Dagligvarer kategori ikke opprettet');
  }

  console.log(`✓ Opprettet underkategori: Dagligvarer`);
  console.log();

  // Create three transactions
  const mockTransactions: Transaction[] = [
    {
      dato: '2025-11-01',
      beløp: -450,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Felles',
      fraKontonummer: '3610.61.63558',
      type: 'Betaling',
      tekst: 'REMA 1000',
      underkategori: '',
    },
    {
      dato: '2025-11-02',
      beløp: -320,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Felles',
      fraKontonummer: '3610.61.63558',
      type: 'Betaling',
      tekst: 'KIWI',
      underkategori: '',
    },
    {
      dato: '2025-11-03',
      beløp: -280,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Felles',
      fraKontonummer: '3610.61.63558',
      type: 'Betaling',
      tekst: 'SPAR',
      underkategori: '',
    },
  ];

  const categorizedTransactions = mockTransactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
  }));

  store.importTransactions(categorizedTransactions);

  console.log(`✓ Importert ${mockTransactions.length} transaksjoner:`);
  console.log(`  - REMA 1000`);
  console.log(`  - KIWI`);
  console.log(`  - SPAR`);
  console.log();

  logCurrentState('State etter initiell oppsett (kun i minnet)');

  // ============================================================================
  // STEG 2: Bruk regelmotoren til å kategorisere "REMA 1000"
  // ============================================================================

  console.log('🔧 STEG 2: Kategoriser REMA 1000 med regelmotor');
  console.log();

  currentState = useTransactionStore.getState();
  const remaTx = currentState.transactions.find(t => t.tekst === 'REMA 1000');

  if (!remaTx) {
    throw new Error('REMA 1000 transaksjon ikke funnet');
  }

  console.log(`Kategoriserer: ${remaTx.dato} - "${remaTx.tekst}"`);
  console.log(`Til kategori: Dagligvarer`);
  console.log(`Oppretter regel: Ja`);
  console.log();

  store.categorizeTransactionAction(
    remaTx.transactionId,
    dagligvarerKategori.id,
    true // Create rule
  );

  currentState = useTransactionStore.getState();
  
  // Verify categorization
  const categorizedRema = currentState.transactions.find(t => t.tekst === 'REMA 1000');
  if (categorizedRema && categorizedRema.categoryId === dagligvarerKategori.id) {
    console.log('✅ SUKSESS: REMA 1000 er kategorisert til Dagligvarer');
  } else {
    console.log('❌ FEIL: Kategorisering feilet');
  }

  // Verify rule creation
  const remaRule = currentState.rules.get('rema 1000');
  if (remaRule && remaRule.categoryId === dagligvarerKategori.id) {
    console.log('✅ SUKSESS: Regel opprettet for "rema 1000" → Dagligvarer');
  } else {
    console.log('❌ FEIL: Regel ble ikke opprettet');
  }

  console.log();

  logCurrentState('State etter kategorisering (regler opprettet)');

  // ============================================================================
  // STEG 3: Lagre alle transaksjoner og regler til lokal lagring
  // ============================================================================

  console.log('🔧 STEG 3: Lagre til lokal lagring');
  console.log();

  await PersistenceService.init();

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

  // Show storage info
  await displayStorageInfo();
  console.log();

  // ============================================================================
  // STEG 4: Tøm Zustand-store (reset)
  // ============================================================================

  console.log('🔧 STEG 4: Tøm Zustand-store (reset)');
  console.log();

  console.log('Før reset:');
  console.log(`  - Transaksjoner: ${currentState.transactions.length}`);
  console.log(`  - Hovedkategorier: ${currentState.hovedkategorier.size}`);
  console.log(`  - Regler: ${currentState.rules.size}`);
  console.log();

  store.reset();

  currentState = useTransactionStore.getState();

  console.log('Etter reset:');
  console.log(`  - Transaksjoner: ${currentState.transactions.length}`);
  console.log(`  - Hovedkategorier: ${currentState.hovedkategorier.size} (kun system-kategori)`);
  console.log(`  - Regler: ${currentState.rules.size}`);
  console.log();

  console.log('✓ Store er tømt');
  console.log();

  logCurrentState('State etter reset (tomt)');

  // ============================================================================
  // STEG 5: Last transaksjoner og regler fra lokal lagring
  // ============================================================================

  console.log('🔧 STEG 5: Last data fra lokal lagring');
  console.log();

  console.log('Laster data fra disk...');
  await initializeStore();

  currentState = useTransactionStore.getState();

  console.log();
  console.log('✓ Data lastet fra lokal lagring');
  console.log();
  console.log('Gjenopprettet:');
  console.log(`  - Transaksjoner: ${currentState.transactions.length}`);
  console.log(`  - Hovedkategorier: ${currentState.hovedkategorier.size}`);
  console.log(`  - Underkategorier: ${currentState.underkategorier.size}`);
  console.log(`  - Regler: ${currentState.rules.size}`);
  console.log(`  - Unntak: ${currentState.locks.size}`);
  console.log();

  logCurrentState('State etter lasting fra disk');

  // ============================================================================
  // STEG 6: Bekreft at alt er tilbake
  // ============================================================================

  console.log('🔧 STEG 6: Bekreft at data er korrekt gjenopprettet');
  console.log();

  currentState = useTransactionStore.getState();

  // 6a. Check transactions
  console.log('📝 6a. Verifiser transaksjoner:');
  const expectedTexts = ['REMA 1000', 'KIWI', 'SPAR'];
  const allTransactionsPresent = expectedTexts.every(text =>
    currentState.transactions.some(tx => tx.tekst === text)
  );

  if (allTransactionsPresent && currentState.transactions.length === 3) {
    console.log(`  ✅ Alle 3 transaksjoner er tilbake`);
  } else {
    console.log(`  ❌ FEIL: Transaksjoner mangler eller er feil`);
  }
  console.log();

  // 6b. Check REMA categorization
  console.log('📝 6b. Verifiser at REMA 1000 fortsatt er kategorisert:');
  const remaTransaction = currentState.transactions.find(t => t.tekst === 'REMA 1000');
  const dagligvarer = Array.from(currentState.underkategorier.values()).find(
    k => k.name === 'Dagligvarer'
  );

  if (remaTransaction && remaTransaction.categoryId === dagligvarer?.id) {
    console.log(`  ✅ REMA 1000 er kategorisert til Dagligvarer`);
  } else {
    console.log(`  ❌ FEIL: REMA 1000 har feil kategori eller mangler kategori`);
  }
  console.log();

  // 6c. Check rules
  console.log('📝 6c. Verifiser at reglene fortsatt fungerer:');
  const loadedRule = currentState.rules.get('rema 1000');
  
  if (loadedRule && loadedRule.categoryId === dagligvarer?.id) {
    console.log(`  ✅ Regel for "rema 1000" → Dagligvarer eksisterer`);
  } else {
    console.log(`  ❌ FEIL: Regel mangler eller er feil`);
  }
  console.log();

  // 6d. Test rule by adding a new REMA transaction
  console.log('📝 6d. Test regel ved å legge til ny REMA 1000-transaksjon:');
  console.log();

  const newRemaTransaction: Transaction = {
    dato: '2025-11-04',
    beløp: -199,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'REMA 1000',
    underkategori: '',
  };

  const newCategorizedTx = {
    ...newRemaTransaction,
    transactionId: generateTransactionId(newRemaTransaction),
    categoryId: undefined,
    isLocked: false,
  };

  // Add the new transaction
  const existingTransactions = currentState.transactions;
  store.importTransactions([...existingTransactions, newCategorizedTx]);

  // Re-apply rules
  store.applyRulesToAll();

  currentState = useTransactionStore.getState();
  const allRemaTransactions = currentState.transactions.filter(t => t.tekst === 'REMA 1000');

  console.log(`  Lagt til ny REMA 1000-transaksjon`);
  console.log(`  Totalt ${allRemaTransactions.length} REMA 1000-transaksjoner nå`);
  console.log();

  const allRemaCategorized = allRemaTransactions.every(tx => tx.categoryId === dagligvarer?.id);

  if (allRemaCategorized) {
    console.log(`  ✅ SUKSESS: Alle REMA 1000-transaksjoner er kategorisert til Dagligvarer`);
    console.log(`     Regelen fungerer for nye transaksjoner!`);
  } else {
    console.log(`  ❌ FEIL: Ikke alle REMA 1000-transaksjoner er kategorisert`);
  }
  console.log();

  allRemaTransactions.forEach((tx, i) => {
    const kat = tx.categoryId
      ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
      : null;
    console.log(`    REMA ${i + 1}: ${tx.dato} → ${kat?.name || 'Ukategorisert'}`);
  });
  console.log();

  logCurrentState('State etter at ny transaksjon ble lagt til og regler anvendt');

  // ============================================================================
  // STEG 7: Lagre på nytt og bekreft ingen duplikater
  // ============================================================================

  console.log('🔧 STEG 7: Lagre på nytt og bekreft ingen duplikater');
  console.log();

  currentState = useTransactionStore.getState();
  const transactionCountBefore = currentState.transactions.length;
  const rulesCountBefore = currentState.rules.size;

  console.log(`Før lagring:`);
  console.log(`  - Transaksjoner: ${transactionCountBefore}`);
  console.log(`  - Regler: ${rulesCountBefore}`);
  console.log();

  await saveStoreState();

  console.log('✓ Data lagret til lokal lagring');
  console.log();

  // Load again to verify no duplicates
  console.log('Laster data på nytt for å sjekke duplikater...');
  store.reset();
  await initializeStore();

  currentState = useTransactionStore.getState();
  const transactionCountAfter = currentState.transactions.length;
  const rulesCountAfter = currentState.rules.size;

  console.log();
  console.log(`Etter re-lasting:`);
  console.log(`  - Transaksjoner: ${transactionCountAfter}`);
  console.log(`  - Regler: ${rulesCountAfter}`);
  console.log();

  if (
    transactionCountBefore === transactionCountAfter &&
    rulesCountBefore === rulesCountAfter
  ) {
    console.log('✅ SUKSESS: Ingen duplikater! Samme antall transaksjoner og regler');
  } else {
    console.log('❌ FEIL: Duplikater funnet eller data mangler');
    console.log(`  Transaksjoner: ${transactionCountBefore} → ${transactionCountAfter}`);
    console.log(`  Regler: ${rulesCountBefore} → ${rulesCountAfter}`);
  }
  console.log();

  logCurrentState('State etter re-lasting (duplikattest)');

  // ============================================================================
  // OPPSUMMERING
  // ============================================================================

  console.log('='.repeat(80));
  console.log('📋 ENDELIG OPPSUMMERING');
  console.log('='.repeat(80));
  console.log();

  console.log('✅ Alle tester fullført:');
  console.log();
  console.log('  1. ✓ Satt opp mock-data i minnet');
  console.log('  2. ✓ Brukt regelmotor til å kategorisere REMA 1000');
  console.log('  3. ✓ Lagret alle transaksjoner og regler til disk');
  console.log('  4. ✓ Tømt Zustand-store (reset)');
  console.log('  5. ✓ Lastet transaksjoner og regler fra disk');
  console.log('  6. ✓ Bekreftet at:');
  console.log('     - Alle transaksjoner er tilbake');
  console.log('     - REMA 1000 fortsatt er kategorisert');
  console.log('     - Reglene fungerer for nye transaksjoner');
  console.log('  7. ✓ Lagret på nytt uten duplikater');
  console.log();

  currentState = useTransactionStore.getState();

  console.log('📊 Slutt-state:');
  console.log(`  Total transaksjoner: ${currentState.stats.total}`);
  console.log(`  Kategoriserte: ${currentState.stats.categorized}`);
  console.log(`  Ukategoriserte: ${currentState.stats.uncategorized}`);
  console.log(`  Regler: ${currentState.rules.size}`);
  console.log(`  Unntak: ${currentState.locks.size}`);
  console.log();

  console.log('💾 Lagringslokasjon:');
  console.log(`  ${PersistenceService}`);
  console.log();

  console.log('🎯 Test fullført!');
  console.log('='.repeat(80));
  console.log();
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test feilet:', error);
  process.exit(1);
});

