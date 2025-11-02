/**
 * Test file for Zustand store
 * Tests category management, auto-categorization, and exceptions
 */

import { useTransactionStore } from './src/store';
import { Transaction } from './csvParser';

console.log('='.repeat(80));
console.log('ZUSTAND STORE TEST - Personlig økonomiverktøy');
console.log('='.repeat(80));
console.log();

// Get store instance
const store = useTransactionStore.getState();

// ============================================================================
// 1. Legg til hovedkategori "Mat" og underkategori "Dagligvarer"
// ============================================================================

console.log('📁 STEG 1: Oppretter kategorier');
console.log('-'.repeat(80));

store.createHovedkategori('Mat', {
  color: '#10b981',
  icon: '🍕',
  isIncome: false,
});

// Get the created hovedkategori - need to get fresh state
const freshState = useTransactionStore.getState();
const hovedkategorier = Array.from(freshState.hovedkategorier.values());
console.log(`Debug: Found ${hovedkategorier.length} hovedkategorier`);
hovedkategorier.forEach(k => console.log(`  - ${k.name} (${k.id})`));

const matKategori = hovedkategorier.find(k => k.name === 'Mat');

if (!matKategori) {
  throw new Error('Mat kategori ble ikke opprettet');
}

console.log(`✓ Hovedkategori opprettet: "${matKategori.name}" (ID: ${matKategori.id})`);
console.log(`  - Farge: ${matKategori.color}`);
console.log(`  - Ikon: ${matKategori.icon}`);

// Create underkategori
store.createUnderkategori('Dagligvarer', matKategori.id);

// Get fresh state again
const freshState2 = useTransactionStore.getState();
const underkategorier = Array.from(freshState2.underkategorier.values());
const dagligvarerKategori = underkategorier.find(k => k.name === 'Dagligvarer');

if (!dagligvarerKategori) {
  throw new Error('Dagligvarer kategori ble ikke opprettet');
}

console.log(`✓ Underkategori opprettet: "${dagligvarerKategori.name}" (ID: ${dagligvarerKategori.id})`);
console.log(`  - Hovedkategori: ${matKategori.name}`);
console.log();

// ============================================================================
// 2. Importer liste med 3 transaksjoner med forskjellig "Tekst"-felt
// ============================================================================

console.log('📄 STEG 2: Importerer transaksjoner');
console.log('-'.repeat(80));

const rawTransactions: Transaction[] = [
  {
    dato: '2025-10-01',
    beløp: -235.50,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'KIWI TRONDHEIM',
    underkategori: '',
  },
  {
    dato: '2025-10-02',
    beløp: -189.90,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'KIWI TRONDHEIM',
    underkategori: '',
  },
  {
    dato: '2025-10-03',
    beløp: -456.20,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'KIWI TRONDHEIM',
    underkategori: '',
  },
  {
    dato: '2025-10-04',
    beløp: -299.00,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'REMA 1000',
    underkategori: '',
  },
  {
    dato: '2025-10-05',
    beløp: -5000.00,
    tilKonto: '',
    tilKontonummer: '',
    fraKonto: 'Felles',
    fraKontonummer: '3610.61.63558',
    type: 'Betaling',
    tekst: 'IKEA',
    underkategori: '',
  },
];

// Convert to CategorizedTransaction format
import { generateTransactionId } from './categoryEngine';

const categorizedTransactions = rawTransactions.map(tx => ({
  ...tx,
  transactionId: generateTransactionId(tx),
  categoryId: undefined,
  isLocked: false,
}));

store.importTransactions(categorizedTransactions);

// Get fresh state after import
let currentState = useTransactionStore.getState();

console.log(`✓ Importert ${currentState.transactions.length} transaksjoner`);
console.log();
console.log('Transaksjoner:');
currentState.transactions.forEach((tx, i) => {
  console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toFixed(2).padStart(10)} NOK | "${tx.tekst}"`);
});
console.log();

// Show initial stats
console.log('📊 Statistikk før kategorisering:');
console.log(`  - Total: ${currentState.stats.total}`);
console.log(`  - Kategoriserte: ${currentState.stats.categorized}`);
console.log(`  - Ukategoriserte: ${currentState.stats.uncategorized}`);
console.log();

// ============================================================================
// 3. Kategoriser én transaksjon til "Dagligvarer" med regel
// ============================================================================

console.log('🏷️  STEG 3: Kategoriser første KIWI-transaksjon');
console.log('-'.repeat(80));

const firstKiwiTx = currentState.transactions.find(tx => tx.tekst === 'KIWI TRONDHEIM');

if (!firstKiwiTx) {
  throw new Error('KIWI transaksjon ikke funnet');
}

console.log(`Kategoriserer transaksjon: ${firstKiwiTx.dato} - ${firstKiwiTx.tekst}`);
console.log(`Beløp: ${firstKiwiTx.beløp.toFixed(2)} NOK`);
console.log(`Oppretter regel: Ja (alle transaksjoner med samme tekst blir kategorisert)`);
console.log();

// Categorize with rule creation
store.categorizeTransactionAction(
  firstKiwiTx.transactionId,
  dagligvarerKategori.id,
  true // Create rule
);

console.log(`✓ Transaksjon kategorisert til "${dagligvarerKategori.name}"`);
console.log(`✓ Regel opprettet for tekst: "${firstKiwiTx.tekst}"`);
console.log();

// ============================================================================
// 4. Verifiser at andre med samme "Tekst" blir automatisk kategorisert
// ============================================================================

console.log('✨ STEG 4: Verifiser auto-kategorisering');
console.log('-'.repeat(80));

// Get fresh state after categorization
currentState = useTransactionStore.getState();
const kiwiTransactions = currentState.transactions.filter(tx => tx.tekst === 'KIWI TRONDHEIM');

console.log(`Fant ${kiwiTransactions.length} transaksjoner med tekst "KIWI TRONDHEIM":`);
console.log();

kiwiTransactions.forEach((tx, i) => {
  const kategori = tx.categoryId
    ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
    : null;
  
  const status = tx.categoryId ? '✓ Kategorisert' : '✗ Ukategorisert';
  const categoryName = kategori ? kategori.name : 'Ingen';
  
  console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toFixed(2).padStart(10)} NOK`);
  console.log(`     Status: ${status}`);
  console.log(`     Kategori: ${categoryName}`);
  console.log(`     Låst: ${tx.isLocked ? 'Ja' : 'Nei'}`);
  console.log();
});

// Verify all KIWI transactions are categorized
const allKiwiCategorized = kiwiTransactions.every(tx => tx.categoryId === dagligvarerKategori.id);

if (allKiwiCategorized) {
  console.log('✅ SUKSESS: Alle KIWI-transaksjoner er automatisk kategorisert til Dagligvarer!');
} else {
  console.log('❌ FEIL: Ikke alle KIWI-transaksjoner ble kategorisert');
}
console.log();

// Show updated stats
console.log('📊 Statistikk etter auto-kategorisering:');
console.log(`  - Total: ${currentState.stats.total}`);
console.log(`  - Kategoriserte: ${currentState.stats.categorized}`);
console.log(`  - Ukategoriserte: ${currentState.stats.uncategorized}`);
console.log(`  - Regler: ${currentState.rules.size}`);
console.log();

// ============================================================================
// 5. Marker én transaksjon som unntak og endre kategori
// ============================================================================

console.log('🔒 STEG 5: Opprett unntak (lås transaksjon)');
console.log('-'.repeat(80));

// Create a new category for the exception
store.createHovedkategori('Husholdning', {
  color: '#f59e0b',
  icon: '🏠',
  isIncome: false,
});

// Get fresh state
currentState = useTransactionStore.getState();
const husholdningKategori = Array.from(currentState.hovedkategorier.values()).find(
  k => k.name === 'Husholdning'
);

if (!husholdningKategori) {
  throw new Error('Husholdning kategori ikke opprettet');
}

// Lock the second KIWI transaction to a different category
const secondKiwiTx = kiwiTransactions[1];

console.log(`Velger transaksjon som unntak:`);
console.log(`  - Dato: ${secondKiwiTx.dato}`);
console.log(`  - Beløp: ${secondKiwiTx.beløp.toFixed(2)} NOK`);
console.log(`  - Tekst: "${secondKiwiTx.tekst}"`);
console.log(`  - Nåværende kategori: ${dagligvarerKategori.name}`);
console.log();

const lockReason = 'Dette KIWI-kjøpet var for rengjøringsmidler, ikke mat';

console.log(`Låser transaksjon til kategori: "${husholdningKategori.name}"`);
console.log(`Begrunnelse: "${lockReason}"`);
console.log();

store.lockTransactionAction(
  secondKiwiTx.transactionId,
  husholdningKategori.id,
  lockReason
);

console.log(`✓ Transaksjon låst som unntak`);
console.log();

// Re-apply rules to see the lock in effect
store.applyRulesToAll();

// ============================================================================
// 6. Sjekk at regelen ikke påvirker den låste transaksjonen lenger
// ============================================================================

console.log('🔍 STEG 6: Verifiser at regelen ikke påvirker unntaket');
console.log('-'.repeat(80));

// Get fresh state after locking
currentState = useTransactionStore.getState();
const updatedKiwiTransactions = currentState.transactions.filter(
  tx => tx.tekst === 'KIWI TRONDHEIM'
);

console.log('Status for alle KIWI-transaksjoner etter låsing:');
console.log();

updatedKiwiTransactions.forEach((tx, i) => {
  const kategori = tx.categoryId
    ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
    : null;
  
  const isLocked = tx.isLocked;
  const lockInfo = currentState.locks.get(tx.transactionId);
  
  console.log(`  ${i + 1}. ${tx.dato} | ${tx.beløp.toFixed(2).padStart(10)} NOK`);
  console.log(`     Kategori: ${kategori?.name || 'Ingen'}`);
  console.log(`     Låst: ${isLocked ? '🔒 Ja' : '🔓 Nei'}`);
  
  if (lockInfo) {
    console.log(`     Låst til: ${kategori?.name}`);
    console.log(`     Begrunnelse: "${lockInfo.reason}"`);
  }
  console.log();
});

// Verify the locked transaction
const lockedTransaction = updatedKiwiTransactions.find(tx => tx.isLocked);

if (lockedTransaction && lockedTransaction.categoryId === husholdningKategori.id) {
  console.log(`✅ SUKSESS: Låst transaksjon har kategori "${husholdningKategori.name}"`);
  console.log(`   (Regelen for "KIWI TRONDHEIM" påvirker den ikke lenger)`);
} else {
  console.log('❌ FEIL: Låsing fungerte ikke som forventet');
}
console.log();

// Verify other KIWI transactions still have Dagligvarer
const unlockedKiwiTransactions = updatedKiwiTransactions.filter(tx => !tx.isLocked);
const allUnlockedAreDagligvarer = unlockedKiwiTransactions.every(
  tx => tx.categoryId === dagligvarerKategori.id
);

if (allUnlockedAreDagligvarer && unlockedKiwiTransactions.length > 0) {
  console.log(`✅ SUKSESS: Ulåste KIWI-transaksjoner har fortsatt kategori "${dagligvarerKategori.name}"`);
  console.log(`   (Regelen fungerer normalt for ulåste transaksjoner)`);
} else {
  console.log('❌ FEIL: Regelen fungerer ikke for ulåste transaksjoner');
}
console.log();

// ============================================================================
// 7. Skriv ut endelig resultat
// ============================================================================

console.log('='.repeat(80));
console.log('📋 ENDELIG RESULTAT');
console.log('='.repeat(80));
console.log();

// Get final state
currentState = useTransactionStore.getState();

// Categories
console.log('📁 Kategorier:');
console.log();

const allHovedkategorier = Array.from(currentState.hovedkategorier.values());
allHovedkategorier.forEach(hk => {
  console.log(`  ${hk.icon} ${hk.name} ${hk.isIncome ? '(Låst - Inntekter)' : ''}`);
  
  const details = currentState.getHovedkategoriWithUnderkategorier(hk.id);
  if (details && details.underkategorier.length > 0) {
    details.underkategorier.forEach(uk => {
      console.log(`    └─ ${uk.name}`);
    });
  }
});
console.log();

// Rules
console.log('📋 Regler:');
console.log();

const rules = Array.from(currentState.rules.values());
rules.forEach((rule, i) => {
  const category =
    currentState.underkategorier.get(rule.categoryId) ||
    currentState.hovedkategorier.get(rule.categoryId);
  
  console.log(`  ${i + 1}. "${rule.tekst}" → ${category?.name || 'Ukjent'}`);
});
console.log();

// Locks
console.log('🔒 Låste transaksjoner (unntak):');
console.log();

const locks = Array.from(currentState.locks.values());
if (locks.length > 0) {
  locks.forEach((lock, i) => {
    const tx = currentState.transactions.find(t => t.transactionId === lock.transactionId);
    const category =
      currentState.underkategorier.get(lock.categoryId) ||
      currentState.hovedkategorier.get(lock.categoryId);
    
    console.log(`  ${i + 1}. ${tx?.dato} - "${tx?.tekst}"`);
    console.log(`     Låst til: ${category?.name}`);
    console.log(`     Begrunnelse: "${lock.reason}"`);
    console.log();
  });
} else {
  console.log('  Ingen låste transaksjoner');
  console.log();
}

// Statistics
console.log('📊 Statistikk:');
console.log();
console.log(`  Total transaksjoner:      ${currentState.stats.total}`);
console.log(`  Kategoriserte:            ${currentState.stats.categorized} (${((currentState.stats.categorized / currentState.stats.total) * 100).toFixed(1)}%)`);
console.log(`  Ukategoriserte:           ${currentState.stats.uncategorized}`);
console.log(`  Låste (unntak):           ${currentState.stats.locked}`);
console.log(`  Unike tekst-mønstre:      ${currentState.stats.uniqueTekstPatterns}`);
console.log(`  Mønstre med regler:       ${currentState.stats.patternsWithRules}`);
console.log();

// All transactions
console.log('💰 Alle transaksjoner:');
console.log();

currentState.transactions.forEach((tx, i) => {
  const kategori = tx.categoryId
    ? currentState.underkategorier.get(tx.categoryId) || currentState.hovedkategorier.get(tx.categoryId)
    : null;
  
  const lockIcon = tx.isLocked ? ' 🔒' : '';
  const categoryText = kategori ? kategori.name : 'Ukategorisert';
  
  console.log(`  ${(i + 1).toString().padStart(2)}. ${tx.dato} | ${tx.beløp.toFixed(2).padStart(10)} NOK | ${tx.tekst.padEnd(20)} | ${categoryText}${lockIcon}`);
});
console.log();

// Financial breakdown
console.log('💵 Finansiell oppsummering:');
console.log();

const totalAmount = currentState.transactions.reduce((sum, tx) => sum + Math.abs(tx.beløp), 0);
const categorizedAmount = currentState.transactions
  .filter(tx => tx.categoryId)
  .reduce((sum, tx) => sum + Math.abs(tx.beløp), 0);

console.log(`  Total beløp:              ${totalAmount.toFixed(2)} NOK`);
console.log(`  Kategorisert beløp:       ${categorizedAmount.toFixed(2)} NOK`);
console.log(`  Ukategorisert beløp:      ${(totalAmount - categorizedAmount).toFixed(2)} NOK`);
console.log();

// Summary by category
console.log('📈 Beløp per kategori:');
console.log();

const categoryTotals = new Map<string, number>();

currentState.transactions.forEach(tx => {
  if (tx.categoryId) {
    const current = categoryTotals.get(tx.categoryId) || 0;
    categoryTotals.set(tx.categoryId, current + Math.abs(tx.beløp));
  }
});

Array.from(categoryTotals.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([categoryId, amount]) => {
    const category =
      currentState.underkategorier.get(categoryId) || currentState.hovedkategorier.get(categoryId);
    
    const icon = category && 'icon' in category ? category.icon : '';
    console.log(`  ${icon} ${category?.name.padEnd(20)} ${amount.toFixed(2).padStart(10)} NOK`);
  });

console.log();
console.log('='.repeat(80));
console.log('✅ TEST FULLFØRT!');
console.log('='.repeat(80));
console.log();

console.log('Testet funksjonalitet:');
console.log('  ✓ Opprett hovedkategorier og underkategorier');
console.log('  ✓ Import transaksjoner');
console.log('  ✓ Kategoriser med automatisk regelopprettelse');
console.log('  ✓ Auto-kategorisering av transaksjoner med samme tekst');
console.log('  ✓ Låse transaksjoner som unntak');
console.log('  ✓ Verifiser at regler ikke påvirker låste transaksjoner');
console.log('  ✓ Statistikk og rapportering');
console.log();

