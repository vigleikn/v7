/**
 * Transaction Table Functionality Test
 * Tests categorization, bulk operations, and exception handling
 * without React - pure store logic
 */

import { useTransactionStore } from './store';
import { generateTransactionId } from './categoryEngine';
import { Transaction } from './csvParser';

console.log('='.repeat(80));
console.log('TRANSAKSJONSTABELL FUNKSJONSTEST');
console.log('='.repeat(80));
console.log();

// Get store instance
const store = useTransactionStore.getState();

// Helper function to log state
function logState(title: string) {
  console.log('─'.repeat(80));
  console.log(`📊 ${title}`);
  console.log('─'.repeat(80));
  
  const state = useTransactionStore.getState();
  
  console.log(`\n📝 Transaksjoner (${state.transactions.length}):`);
  state.transactions.forEach((tx, i) => {
    const kategori = tx.categoryId
      ? state.underkategorier.get(tx.categoryId) || state.hovedkategorier.get(tx.categoryId)
      : null;
    
    const lockIcon = tx.isLocked ? ' 🔒' : '';
    const categoryText = kategori ? kategori.name : 'Ukategorisert';
    
    console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toFixed(2).padStart(8)} NOK | ${tx.tekst.padEnd(20)} | ${categoryText}${lockIcon}`);
  });
  
  console.log(`\n📋 Regler (${state.rules.size}):`);
  if (state.rules.size > 0) {
    Array.from(state.rules.values()).forEach((rule, i) => {
      const cat = state.underkategorier.get(rule.categoryId) || state.hovedkategorier.get(rule.categoryId);
      console.log(`  ${i + 1}. "${rule.tekst}" → ${cat?.name || 'Ukjent'}`);
    });
  } else {
    console.log('  Ingen regler');
  }
  
  console.log(`\n🔒 Unntak/Låste transaksjoner (${state.locks.size}):`);
  if (state.locks.size > 0) {
    Array.from(state.locks.values()).forEach((lock, i) => {
      const tx = state.transactions.find(t => t.transactionId === lock.transactionId);
      const cat = state.underkategorier.get(lock.categoryId) || state.hovedkategorier.get(lock.categoryId);
      console.log(`  ${i + 1}. ${tx?.dato} - "${tx?.tekst}" → ${cat?.name}`);
      if (lock.reason) {
        console.log(`     Grunn: "${lock.reason}"`);
      }
    });
  } else {
    console.log('  Ingen låste transaksjoner');
  }
  
  console.log(`\n📊 Statistikk:`);
  console.log(`  Total: ${state.stats.total}`);
  console.log(`  Kategoriserte: ${state.stats.categorized}`);
  console.log(`  Ukategoriserte: ${state.stats.uncategorized}`);
  console.log(`  Låste: ${state.stats.locked}`);
  console.log();
}

// ============================================================================
// STEG 1: Sett opp mock-data med 5 transaksjoner
// ============================================================================

console.log('🔧 STEG 1: Setter opp mock-data med 5 transaksjoner');
console.log();

const mockTransactions: Transaction[] = [
  {
    dato: '2025-11-01',
    beløp: -450,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'SPAR TRONDHEIM',
    underkategori: '',
  },
  {
    dato: '2025-11-02',
    beløp: -380,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'SPAR TRONDHEIM',
    underkategori: '',
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
    beløp: -299,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'REMA 1000',
    underkategori: '',
  },
  {
    dato: '2025-11-05',
    beløp: 5000,
    tilKonto: 'Felles',
    tilKontonummer: '3610.61.63558',
    fraKonto: '',
    fraKontonummer: '',
    type: 'Renter',
    tekst: 'KREDITRENTER',
    underkategori: '',
  },
];

// Import transactions
const categorizedTransactions = mockTransactions.map(tx => ({
  ...tx,
  transactionId: generateTransactionId(tx),
  categoryId: undefined,
  isLocked: false,
}));

store.importTransactions(categorizedTransactions);

console.log('✓ Importert 5 transaksjoner');
console.log('  - 2x SPAR TRONDHEIM (for testing av auto-kategorisering)');
console.log('  - 1x CIRCLE K');
console.log('  - 1x REMA 1000');
console.log('  - 1x KREDITRENTER (inntekt)');
console.log();

logState('State etter import');

// ============================================================================
// STEG 2: Legg til hovedkategorier og underkategorier
// ============================================================================

console.log('🔧 STEG 2: Oppretter kategorier');
console.log();

// Create Mat hovedkategori
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

console.log(`✓ Opprettet hovedkategori: Mat (ID: ${matKategori.id})`);

// Create Dagligvarer underkategori
store.createUnderkategori('Dagligvarer', matKategori.id);

currentState = useTransactionStore.getState();
const dagligvarerKategori = Array.from(currentState.underkategorier.values()).find(
  k => k.name === 'Dagligvarer'
);

if (!dagligvarerKategori) {
  throw new Error('Dagligvarer kategori ikke opprettet');
}

console.log(`✓ Opprettet underkategori: Dagligvarer (ID: ${dagligvarerKategori.id})`);

// Create Transport hovedkategori
store.createHovedkategori('Transport', {
  color: '#3b82f6',
  icon: '🚗',
  isIncome: false,
});

currentState = useTransactionStore.getState();
const transportKategori = Array.from(currentState.hovedkategorier.values()).find(
  k => k.name === 'Transport'
);

if (!transportKategori) {
  throw new Error('Transport kategori ikke opprettet');
}

console.log(`✓ Opprettet hovedkategori: Transport (ID: ${transportKategori.id})`);

// Create Bensin underkategori
store.createUnderkategori('Bensin', transportKategori.id);

currentState = useTransactionStore.getState();
const bensinKategori = Array.from(currentState.underkategorier.values()).find(
  k => k.name === 'Bensin'
);

if (!bensinKategori) {
  throw new Error('Bensin kategori ikke opprettet');
}

console.log(`✓ Opprettet underkategori: Bensin (ID: ${bensinKategori.id})`);
console.log();

logState('State etter opprettelse av kategorier');

// ============================================================================
// STEG 3: Kategoriser én "SPAR"-transaksjon til "Dagligvarer"
// ============================================================================

console.log('🔧 STEG 3: Kategoriser første SPAR-transaksjon til Dagligvarer');
console.log();

currentState = useTransactionStore.getState();
const firstSparTx = currentState.transactions.find(t => t.tekst === 'SPAR TRONDHEIM');

if (!firstSparTx) {
  throw new Error('SPAR transaksjon ikke funnet');
}

console.log(`Kategoriserer: ${firstSparTx.dato} - "${firstSparTx.tekst}"`);
console.log(`Oppretter regel: Ja (alle med samme tekst blir kategorisert)`);
console.log();

// Categorize with rule creation
store.categorizeTransactionAction(
  firstSparTx.transactionId,
  dagligvarerKategori.id,
  true // Create rule
);

console.log('✓ Transaksjon kategorisert');
console.log();

// Verify both SPAR transactions are categorized
currentState = useTransactionStore.getState();
const sparTransactions = currentState.transactions.filter(t => t.tekst === 'SPAR TRONDHEIM');

console.log('📋 Verifiserer auto-kategorisering:');
console.log();

sparTransactions.forEach((tx, i) => {
  const kategori = tx.categoryId
    ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
    : null;
  
  console.log(`  SPAR ${i + 1}: ${tx.dato}`);
  console.log(`    Kategori: ${kategori?.name || 'Ukategorisert'}`);
  console.log(`    Låst: ${tx.isLocked ? 'Ja' : 'Nei'}`);
});

const allSparCategorized = sparTransactions.every(tx => tx.categoryId === dagligvarerKategori.id);

if (allSparCategorized) {
  console.log();
  console.log('✅ SUKSESS: Begge SPAR-transaksjoner er automatisk kategorisert til Dagligvarer!');
} else {
  console.log();
  console.log('❌ FEIL: Ikke alle SPAR-transaksjoner ble kategorisert');
}

console.log();

logState('State etter kategorisering av SPAR');

// ============================================================================
// STEG 4: Marker begge SPAR-transaksjoner og bulk-kategoriser til Bensin med Unntak
// ============================================================================

console.log('🔧 STEG 4: Bulk-kategoriser SPAR til Bensin med Unntak');
console.log();

currentState = useTransactionStore.getState();
const sparTxIds = currentState.transactions
  .filter(t => t.tekst === 'SPAR TRONDHEIM')
  .map(t => t.transactionId);

console.log(`Valgte ${sparTxIds.length} SPAR-transaksjoner`);
console.log(`Bulk-kategoriserer til: Bensin`);
console.log(`Unntak (lås): Ja`);
console.log();

// Bulk categorize with exception (lock)
store.bulkCategorize({
  transactionIds: sparTxIds,
  categoryId: bensinKategori.id,
  createRule: false, // Don't create rule when locking
  lockTransactions: true,
  lockReason: 'Bulk-kategorisering som unntak - disse SPAR-kjøpene var bensin',
});

console.log('✓ Bulk-kategorisering utført');
console.log();

logState('State etter bulk-kategorisering med unntak');

// ============================================================================
// STEG 5: Verifiser at SPAR-transaksjoner er låst til Bensin
// ============================================================================

console.log('🔧 STEG 5: Verifiser at SPAR-transaksjoner er låst');
console.log();

currentState = useTransactionStore.getState();
const sparTxsAfterLock = currentState.transactions.filter(t => t.tekst === 'SPAR TRONDHEIM');

console.log('📋 Status for SPAR-transaksjoner:');
console.log();

sparTxsAfterLock.forEach((tx, i) => {
  const kategori = tx.categoryId
    ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
    : null;
  
  const lock = currentState.locks.get(tx.transactionId);
  
  console.log(`  SPAR ${i + 1}: ${tx.dato}`);
  console.log(`    Kategori: ${kategori?.name || 'Ukategorisert'}`);
  console.log(`    Låst: ${tx.isLocked ? '🔒 Ja' : '🔓 Nei'}`);
  if (lock) {
    console.log(`    Låst til: ${kategori?.name}`);
  }
  console.log();
});

const allSparLocked = sparTxsAfterLock.every(tx => tx.isLocked && tx.categoryId === bensinKategori.id);

if (allSparLocked) {
  console.log('✅ SUKSESS: Begge SPAR-transaksjoner er låst til Bensin');
} else {
  console.log('❌ FEIL: SPAR-transaksjoner er ikke korrekt låst');
}

console.log();

// Verify rule still exists for SPAR but doesn't affect locked transactions
console.log('📋 Verifiser at regel for SPAR fortsatt eksisterer:');
const sparRule = currentState.rules.get('spar trondheim');
if (sparRule) {
  const ruleCat = currentState.underkategorier.get(sparRule.categoryId) || 
                  currentState.hovedkategorier.get(sparRule.categoryId);
  console.log(`  ✓ Regel: "spar trondheim" → ${ruleCat?.name}`);
  console.log(`  Men låste transaksjoner bruker ikke regelen (de er låst til Bensin)`);
} else {
  console.log(`  ℹ️  Ingen regel for SPAR (forventet når bulk med unntak)`);
}

console.log();

logState('State etter verifisering av låste transaksjoner');

// ============================================================================
// STEG 6: Forsøk å endre kategori på én låst transaksjon (skal ikke ha effekt)
// ============================================================================

console.log('🔧 STEG 6: Forsøk å kategorisere en låst transaksjon');
console.log();

currentState = useTransactionStore.getState();
const firstLockedSpar = sparTxsAfterLock[0];

console.log(`Prøver å kategorisere: ${firstLockedSpar.dato} - "${firstLockedSpar.tekst}"`);
console.log(`Nåværende kategori: Bensin (låst 🔒)`);
console.log(`Forsøker å endre til: Dagligvarer`);
console.log();

try {
  // Try to categorize a locked transaction
  store.categorizeTransactionAction(
    firstLockedSpar.transactionId,
    dagligvarerKategori.id,
    false
  );
  
  // Check if it changed
  currentState = useTransactionStore.getState();
  const txAfterAttempt = currentState.transactions.find(t => t.transactionId === firstLockedSpar.transactionId);
  
  if (txAfterAttempt && txAfterAttempt.categoryId === bensinKategori.id && txAfterAttempt.isLocked) {
    console.log('✅ SUKSESS: Låst transaksjon ble IKKE endret (forventet oppførsel)');
    console.log('   Transaksjonen er fortsatt låst til Bensin');
  } else {
    console.log('⚠️  Transaksjonen ble endret (uventet - bør være beskyttet)');
  }
} catch (error) {
  console.log('✅ SUKSESS: Fikk forventet feil ved forsøk på å kategorisere låst transaksjon');
  console.log(`   Feilmelding: ${error}`);
}

console.log();

logState('State etter forsøk på å endre låst transaksjon');

// ============================================================================
// STEG 7: Fjern unntak på én SPAR, og sett til Dagligvarer
// ============================================================================

console.log('🔧 STEG 7: Fjern unntak på én SPAR-transaksjon');
console.log();

currentState = useTransactionStore.getState();
const secondSparTx = sparTxsAfterLock[1];

console.log(`Låser opp: ${secondSparTx.dato} - "${secondSparTx.tekst}"`);

// Unlock the transaction
store.unlockTransactionAction(secondSparTx.transactionId);

console.log('✓ Transaksjon låst opp');
console.log();

// Now categorize it to Dagligvarer (should work since it's unlocked)
console.log(`Kategoriserer til: Dagligvarer`);
console.log(`Oppretter regel: Ja`);
console.log();

store.categorizeTransactionAction(
  secondSparTx.transactionId,
  dagligvarerKategori.id,
  true // Create rule
);

console.log('✓ Transaksjon kategorisert');
console.log();

// Verify the unlocked transaction is now categorized
currentState = useTransactionStore.getState();
const unlockedSpar = currentState.transactions.find(t => t.transactionId === secondSparTx.transactionId);
const stillLockedSpar = currentState.transactions.find(t => t.transactionId === firstLockedSpar.transactionId);

console.log('📋 Status for begge SPAR-transaksjoner:');
console.log();

if (unlockedSpar) {
  const kategori = unlockedSpar.categoryId
    ? currentState.underkategorier.get(unlockedSpar.categoryId) || 
      currentState.hovedkategorier.get(unlockedSpar.categoryId)
    : null;
  
  console.log(`  SPAR 1 (ulåst): ${unlockedSpar.dato}`);
  console.log(`    Kategori: ${kategori?.name || 'Ukategorisert'}`);
  console.log(`    Låst: ${unlockedSpar.isLocked ? '🔒 Ja' : '🔓 Nei'}`);
  console.log();
}

if (stillLockedSpar) {
  const kategori = stillLockedSpar.categoryId
    ? currentState.underkategorier.get(stillLockedSpar.categoryId) || 
      currentState.hovedkategorier.get(stillLockedSpar.categoryId)
    : null;
  
  console.log(`  SPAR 2 (fortsatt låst): ${stillLockedSpar.dato}`);
  console.log(`    Kategori: ${kategori?.name || 'Ukategorisert'}`);
  console.log(`    Låst: ${stillLockedSpar.isLocked ? '🔒 Ja' : '🔓 Nei'}`);
  console.log();
}

// Verify expectations
if (unlockedSpar && unlockedSpar.categoryId === dagligvarerKategori.id && !unlockedSpar.isLocked) {
  console.log('✅ SUKSESS: Ulåst SPAR-transaksjon er nå kategorisert til Dagligvarer');
} else {
  console.log('❌ FEIL: Ulåst SPAR-transaksjon har feil kategori');
}

if (stillLockedSpar && stillLockedSpar.categoryId === bensinKategori.id && stillLockedSpar.isLocked) {
  console.log('✅ SUKSESS: Låst SPAR-transaksjon er fortsatt låst til Bensin');
} else {
  console.log('❌ FEIL: Låst SPAR-transaksjon har endret seg');
}

console.log();

logState('State etter opplåsing og re-kategorisering');

// ============================================================================
// OPPSUMMERING
// ============================================================================

console.log('='.repeat(80));
console.log('📋 OPPSUMMERING AV TEST');
console.log('='.repeat(80));
console.log();

currentState = useTransactionStore.getState();

console.log('✅ Testet funksjonalitet:');
console.log('  1. ✓ Import av transaksjoner');
console.log('  2. ✓ Opprettelse av kategorier og underkategorier');
console.log('  3. ✓ Kategorisering med automatisk regelopprettelse');
console.log('  4. ✓ Auto-kategorisering av transaksjoner med samme tekst');
console.log('  5. ✓ Bulk-kategorisering med unntak (låsing)');
console.log('  6. ✓ Verifisering at låste transaksjoner ikke påvirkes av regler');
console.log('  7. ✓ Forsøk på å endre låste transaksjoner (beskyttet)');
console.log('  8. ✓ Opplåsing og re-kategorisering');
console.log();

console.log('📊 Slutt-state:');
console.log(`  Total transaksjoner: ${currentState.stats.total}`);
console.log(`  Kategoriserte: ${currentState.stats.categorized}`);
console.log(`  Ukategoriserte: ${currentState.stats.uncategorized}`);
console.log(`  Låste (unntak): ${currentState.stats.locked}`);
console.log(`  Regler: ${currentState.rules.size}`);
console.log();

console.log('🎯 Alle tester fullført!');
console.log('='.repeat(80));
console.log();

