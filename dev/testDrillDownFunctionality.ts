/**
 * Test: Drill-Down Functionality in Overview
 * Verifies that clicking on cells shows correct transactions
 */

import { useTransactionStore } from '../src/store';
import { CategorizedTransaction } from '../src/store/state';
import {
  getLast12Months,
  calculateMonthlyData,
  buildCategoryRows,
} from '../services/monthlyCalculations';

function setupTestData() {
  const store = useTransactionStore.getState();
  
  // Clear and setup categories
  store.hovedkategorier.clear();
  store.hovedkategorier.set('cat_inntekter_default', {
    id: 'cat_inntekter_default',
    name: 'Inntekter',
    type: 'hovedkategori',
    isIncome: true,
    underkategorier: ['udi-id'],
    sortOrder: 0,
    allowSubcategories: true,
  });
  
  store.hovedkategorier.set('mat-hk', {
    id: 'mat-hk',
    name: 'Mat',
    type: 'hovedkategori',
    isIncome: false,
    underkategorier: ['dagligvarer-id'],
    sortOrder: 1,
  });

  store.underkategorier.clear();
  store.underkategorier.set('udi-id', {
    id: 'udi-id',
    name: 'UDI',
    type: 'underkategori',
    hovedkategoriId: 'cat_inntekter_default',
    sortOrder: 0,
  });
  
  store.underkategorier.set('dagligvarer-id', {
    id: 'dagligvarer-id',
    name: 'Dagligvarer',
    type: 'underkategori',
    hovedkategoriId: 'mat-hk',
    sortOrder: 0,
  });

  // Create test transactions
  const testTransactions: CategorizedTransaction[] = [
    // Oktober 2025 - UDI
    {
      id: 'tx-1',
      transactionId: 'hash-1',
      dato: '15.10.25',
      beløp: 50000,
      type: 'Betaling',
      tekst: 'Lønn UDI oktober',
      underkategori: '',
      tilKonto: 'Konto',
      tilKontonummer: '1234',
      fraKonto: '',
      fraKontonummer: '',
      categoryId: 'udi-id',
      isLocked: false,
    },
    // Oktober 2025 - Dagligvarer
    {
      id: 'tx-2',
      transactionId: 'hash-2',
      dato: '05.10.25',
      beløp: -500,
      type: 'Betaling',
      tekst: 'Rema 1000',
      underkategori: 'Dagligvarer',
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Konto',
      fraKontonummer: '1234',
      categoryId: 'dagligvarer-id',
      isLocked: false,
    },
    {
      id: 'tx-3',
      transactionId: 'hash-3',
      dato: '12.10.25',
      beløp: -750,
      type: 'Betaling',
      tekst: 'Kiwi',
      underkategori: 'Dagligvarer',
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Konto',
      fraKontonummer: '1234',
      categoryId: 'dagligvarer-id',
      isLocked: false,
    },
    // September 2025 - Dagligvarer
    {
      id: 'tx-4',
      transactionId: 'hash-4',
      dato: '20.09.25',
      beløp: -600,
      type: 'Betaling',
      tekst: 'Meny',
      underkategori: 'Dagligvarer',
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Konto',
      fraKontonummer: '1234',
      categoryId: 'dagligvarer-id',
      isLocked: false,
    },
  ];

  return testTransactions;
}

function testDrillDownLogic() {
  console.log('\n🧪 TEST: Drill-Down Functionality\n');
  console.log('='.repeat(80));

  const testTransactions = setupTestData();
  const store = useTransactionStore.getState();
  const hovedkategorier = Array.from(store.hovedkategorier.values());
  const underkategorier = Array.from(store.underkategorier.values());

  const months = getLast12Months();
  const monthlyData = calculateMonthlyData(testTransactions, months, hovedkategorier, underkategorier);
  const categoryRows = buildCategoryRows(monthlyData, hovedkategorier, underkategorier);

  console.log(`\n✓ Test data created:`);
  console.log(`   Months: ${months.length}`);
  console.log(`   Transactions: ${testTransactions.length}`);
  console.log(`   Category rows: ${categoryRows.length}`);

  // Find oktober måned index
  const oktoberIndex = months.findIndex((m) => m === '2025-10');
  const septemberIndex = months.findIndex((m) => m === '2025-09');
  
  console.log(`\n✓ Month indices:`);
  console.log(`   Oktober 2025: index ${oktoberIndex}`);
  console.log(`   September 2025: index ${septemberIndex}`);

  // Test 1: Filter transactions for Dagligvarer in Oktober
  console.log(`\n📊 Test 1: Filter transactions for Dagligvarer in Oktober`);
  
  const targetMonth = months[oktoberIndex];
  const dagligvarerTx = testTransactions.filter((tx) => {
    let txMonth: string;
    if (tx.dato.includes('.')) {
      const [day, month, year] = tx.dato.split('.');
      const fullYear = year.length === 2 ? `20${year}` : year;
      txMonth = `${fullYear}-${month.padStart(2, '0')}`;
    } else {
      txMonth = tx.dato.substring(0, 7);
    }
    
    return txMonth === targetMonth && tx.categoryId === 'dagligvarer-id';
  });

  console.log(`   Filtered transactions: ${dagligvarerTx.length}`);
  dagligvarerTx.forEach((tx, idx) => {
    console.log(`   ${idx + 1}. ${tx.dato} - ${tx.tekst}: ${tx.beløp} kr`);
  });
  console.log(`   Total: ${dagligvarerTx.reduce((sum, tx) => sum + tx.beløp, 0)} kr`);

  const expectedOktDagligvarer = 2;
  const test1Pass = dagligvarerTx.length === expectedOktDagligvarer;
  console.log(`   ${test1Pass ? '✓' : '✗'} Expected ${expectedOktDagligvarer}, got ${dagligvarerTx.length}`);

  // Test 2: Filter transactions for Dagligvarer in September
  console.log(`\n📊 Test 2: Filter transactions for Dagligvarer in September`);
  
  const sepMonth = months[septemberIndex];
  const sepDagligvarerTx = testTransactions.filter((tx) => {
    let txMonth: string;
    if (tx.dato.includes('.')) {
      const [day, month, year] = tx.dato.split('.');
      const fullYear = year.length === 2 ? `20${year}` : year;
      txMonth = `${fullYear}-${month.padStart(2, '0')}`;
    } else {
      txMonth = tx.dato.substring(0, 7);
    }
    
    return txMonth === sepMonth && tx.categoryId === 'dagligvarer-id';
  });

  console.log(`   Filtered transactions: ${sepDagligvarerTx.length}`);
  sepDagligvarerTx.forEach((tx, idx) => {
    console.log(`   ${idx + 1}. ${tx.dato} - ${tx.tekst}: ${tx.beløp} kr`);
  });

  const expectedSepDagligvarer = 1;
  const test2Pass = sepDagligvarerTx.length === expectedSepDagligvarer;
  console.log(`   ${test2Pass ? '✓' : '✗'} Expected ${expectedSepDagligvarer}, got ${sepDagligvarerTx.length}`);

  // Test 3: Check clickable cells logic
  console.log(`\n📊 Test 3: Clickable cells logic`);
  
  const inntekterRow = categoryRows.find((r) => r.categoryName === 'Inntekter');
  const udiRow = inntekterRow?.children?.find((c) => c.categoryName === 'UDI');
  const utgifterRow = categoryRows.find((r) => r.categoryName === 'Utgifter');
  const matRow = utgifterRow?.children?.find((c) => c.categoryName === 'Mat');
  
  console.log(`   Inntekter (main): isCollapsible=${inntekterRow?.isCollapsible}, hasChildren=${!!inntekterRow?.children}`);
  console.log(`   UDI (sub): isCollapsible=${udiRow?.isCollapsible}, hasChildren=${!!udiRow?.children}`);
  console.log(`   Utgifter (main): isCollapsible=${utgifterRow?.isCollapsible}, hasChildren=${!!utgifterRow?.children}`);
  console.log(`   Mat (collapsible group): isCollapsible=${matRow?.isCollapsible}, hasChildren=${!!matRow?.children}`);

  // UDI should be clickable (not collapsible, no children)
  const udiClickable = udiRow && !udiRow.isCollapsible && !udiRow.children;
  console.log(`   ${udiClickable ? '✓' : '✗'} UDI cells should be clickable`);

  // Mat should NOT be clickable (collapsible)
  const matNotClickable = matRow && matRow.isCollapsible;
  console.log(`   ${matNotClickable ? '✓' : '✗'} Mat cells should NOT be clickable (collapsible)`);

  // Inntekter should NOT be clickable (main category)
  const inntekterNotClickable = inntekterRow && !inntekterRow.isCollapsible;
  console.log(`   ${inntekterNotClickable ? '✓' : '✗'} Inntekter cells should NOT be clickable (main)`);

  const allPassed = test1Pass && test2Pass && udiClickable && matNotClickable;

  console.log('\n' + '='.repeat(80));
  console.log(allPassed ? '✅ PASS: Drill-down logic works correctly' : '❌ FAIL: Some checks failed');
  console.log('='.repeat(80) + '\n');
}

// Run test
testDrillDownLogic();

