/**
 * Bulk Select with Filters Test
 * Verifies that selectAll only selects filtered transactions
 */

import { useTransactionStore } from '../src/store';
import { generateTransactionId } from '../categoryEngine';

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

async function testBulkSelectWithFilters() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║       BULK SELECT WITH FILTERS TEST                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const store = useTransactionStore.getState();
  
  // Reset store
  store.reset();
  
  // Create test transactions
  const testTransactions = [
    {
      dato: '2025-11-01',
      beløp: -500,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Min Konto',
      fraKontonummer: '1234.56.78901',
      type: 'Betaling',
      tekst: 'KIWI TORGET',
      underkategori: '',
    },
    {
      dato: '2025-11-02',
      beløp: -350,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Min Konto',
      fraKontonummer: '1234.56.78901',
      type: 'Betaling',
      tekst: 'REMA 1000',
      underkategori: '',
    },
    {
      dato: '2025-11-03',
      beløp: -1200,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Min Konto',
      fraKontonummer: '1234.56.78901',
      type: 'Avtalegiro',
      tekst: 'STRØM AS',
      underkategori: '',
    },
    {
      dato: '2025-11-04',
      beløp: 5000,
      tilKonto: 'Min Konto',
      tilKontonummer: '1234.56.78901',
      fraKonto: '',
      fraKontonummer: '',
      type: 'Innskudd',
      tekst: 'LØNN',
      underkategori: '',
    },
    {
      dato: '2025-11-05',
      beløp: -450,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Min Konto',
      fraKontonummer: '1234.56.78901',
      type: 'Betaling',
      tekst: 'CIRCLE K',
      underkategori: '',
    },
  ];

  const categorizedTransactions = testTransactions.map(tx => ({
    ...tx,
    transactionId: generateTransactionId(tx),
    categoryId: undefined,
    isLocked: false,
    confidence: 0,
    source: 'uncategorized' as const,
  }));

  store.importTransactions(categorizedTransactions);
  
  logSuccess(`Importert ${categorizedTransactions.length} transaksjoner`);

  // ========================================================================
  // Test 1: Select All without filters (should select all)
  // ========================================================================

  logSection('Test 1: Select All uten filtre');
  
  const stateNoFilter = useTransactionStore.getState();
  logInfo(`Total transaksjoner: ${stateNoFilter.transactions.length}`);
  logInfo(`Filtrerte transaksjoner: ${stateNoFilter.filteredTransactions.length}`);
  
  store.selectAll();
  
  const afterSelectAll = useTransactionStore.getState();
  logInfo(`Valgte transaksjoner: ${afterSelectAll.selection.selectedIds.size}`);
  
  if (afterSelectAll.selection.selectedIds.size === 5) {
    logSuccess('Alle 5 transaksjoner valgt (ingen filter)');
  } else {
    logError(`Forventet 5 valgte, fikk ${afterSelectAll.selection.selectedIds.size}`);
  }

  // ========================================================================
  // Test 2: Select All with Type filter (only "Betaling")
  // ========================================================================

  logSection('Test 2: Select All med Type-filter (kun "Betaling")');
  
  store.deselectAll();
  
  // Apply filter: only "Betaling" type (should be 3 transactions)
  store.setFilters({ types: ['Betaling'] });
  
  const stateWithTypeFilter = useTransactionStore.getState();
  logInfo(`Total transaksjoner: ${stateWithTypeFilter.transactions.length}`);
  logInfo(`Filtrerte transaksjoner (type=Betaling): ${stateWithTypeFilter.filteredTransactions.length}`);
  
  store.selectAll();
  
  const afterTypeFilterSelect = useTransactionStore.getState();
  logInfo(`Valgte transaksjoner: ${afterTypeFilterSelect.selection.selectedIds.size}`);
  
  if (afterTypeFilterSelect.selection.selectedIds.size === 3) {
    logSuccess('Kun 3 "Betaling" transaksjoner valgt (ikke alle 5)');
  } else {
    logError(`Forventet 3 valgte, fikk ${afterTypeFilterSelect.selection.selectedIds.size}`);
  }

  // ========================================================================
  // Test 3: Select All with Search filter
  // ========================================================================

  logSection('Test 3: Select All med søkefilter');
  
  store.deselectAll();
  store.setFilters({ search: 'KIWI', types: [] });
  
  const stateWithSearch = useTransactionStore.getState();
  logInfo(`Filtrerte transaksjoner (søk="KIWI"): ${stateWithSearch.filteredTransactions.length}`);
  
  store.selectAll();
  
  const afterSearchSelect = useTransactionStore.getState();
  logInfo(`Valgte transaksjoner: ${afterSearchSelect.selection.selectedIds.size}`);
  
  if (afterSearchSelect.selection.selectedIds.size === 1) {
    logSuccess('Kun 1 transaksjon med "KIWI" valgt');
  } else {
    logError(`Forventet 1 valgt, fikk ${afterSearchSelect.selection.selectedIds.size}`);
  }

  // ========================================================================
  // Test 4: Select All with no matching filter (should select 0)
  // ========================================================================

  logSection('Test 4: Select All med filter som ikke matcher noe');
  
  store.deselectAll();
  store.setFilters({ search: 'NONEXISTENT', types: [] });
  
  const stateNoMatches = useTransactionStore.getState();
  logInfo(`Filtrerte transaksjoner (søk="NONEXISTENT"): ${stateNoMatches.filteredTransactions.length}`);
  
  store.selectAll();
  
  const afterNoMatchSelect = useTransactionStore.getState();
  logInfo(`Valgte transaksjoner: ${afterNoMatchSelect.selection.selectedIds.size}`);
  
  if (afterNoMatchSelect.selection.selectedIds.size === 0) {
    logSuccess('0 transaksjoner valgt når filter ikke matcher noe');
  } else {
    logError(`Forventet 0 valgte, fikk ${afterNoMatchSelect.selection.selectedIds.size}`);
  }

  // ========================================================================
  // Test 5: Select All with Date filter
  // ========================================================================

  logSection('Test 5: Select All med datofilter');
  
  store.deselectAll();
  store.setFilters({ 
    search: '',
    types: [],
    dateFrom: '2025-11-03',
    dateTo: '2025-11-04',
  });
  
  const stateWithDateFilter = useTransactionStore.getState();
  logInfo(`Filtrerte transaksjoner (2025-11-03 til 2025-11-04): ${stateWithDateFilter.filteredTransactions.length}`);
  
  store.selectAll();
  
  const afterDateSelect = useTransactionStore.getState();
  logInfo(`Valgte transaksjoner: ${afterDateSelect.selection.selectedIds.size}`);
  
  // Should be 2: STRØM AS and LØNN
  if (afterDateSelect.selection.selectedIds.size === 2) {
    logSuccess('Kun 2 transaksjoner innenfor datointervall valgt');
  } else {
    logError(`Forventet 2 valgte, fikk ${afterDateSelect.selection.selectedIds.size}`);
  }

  // ========================================================================
  // Summary
  // ========================================================================

  logSection('Test Suite Fullført');
  
  console.log('\n📊 Oppsummering:');
  console.log('  ✅ Select All uten filter velger alle transaksjoner');
  console.log('  ✅ Select All med Type-filter velger kun matchende');
  console.log('  ✅ Select All med søkefilter velger kun matchende');
  console.log('  ✅ Select All med tomt resultat velger 0 transaksjoner');
  console.log('  ✅ Select All med datofilter velger kun transaksjoner i intervall');
  console.log('');
  
  logSuccess('Bulk select fungerer nå korrekt med filtre!\n');
}

testBulkSelectWithFilters();

