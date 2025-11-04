/**
 * Test: Drag and Drop Underkategorier
 * Verifies that underkategorier can be moved between hovedkategorier
 */

import { useTransactionStore } from '../src/store';
import { saveToBrowser } from '../services/browserPersistence';

function testDragAndDrop() {
  console.log('\n🧪 TEST: Drag and Drop Underkategorier\n');
  console.log('='.repeat(80));

  const store = useTransactionStore.getState();

  // Setup: Create hovedkategorier and underkategorier
  console.log('\n✓ Setting up test data...\n');

  store.hovedkategorier.clear();
  store.underkategorier.clear();

  // Create two hovedkategorier
  store.hovedkategorier.set('mat', {
    id: 'mat',
    name: 'Mat',
    type: 'hovedkategori',
    isIncome: false,
    underkategorier: ['dagligvarer', 'restaurant'],
    color: '#10b981',
    icon: '🍕',
    sortOrder: 0,
  });

  store.hovedkategorier.set('transport', {
    id: 'transport',
    name: 'Transport',
    type: 'hovedkategori',
    isIncome: false,
    underkategorier: ['bensin'],
    color: '#3b82f6',
    icon: '🚗',
    sortOrder: 1,
  });

  // Create underkategorier
  store.underkategorier.set('dagligvarer', {
    id: 'dagligvarer',
    name: 'Dagligvarer',
    type: 'underkategori',
    hovedkategoriId: 'mat',
    sortOrder: 0,
  });

  store.underkategorier.set('restaurant', {
    id: 'restaurant',
    name: 'Restaurant',
    type: 'underkategori',
    hovedkategoriId: 'mat',
    sortOrder: 1,
  });

  store.underkategorier.set('bensin', {
    id: 'bensin',
    name: 'Bensin',
    type: 'underkategori',
    hovedkategoriId: 'transport',
    sortOrder: 0,
  });

  console.log('Initial state:');
  console.log('  Mat:');
  console.log('    - Dagligvarer');
  console.log('    - Restaurant');
  console.log('  Transport:');
  console.log('    - Bensin');

  // Test 1: Move "Restaurant" from "Mat" to "Transport"
  console.log('\n📊 Test 1: Move "Restaurant" from "Mat" to "Transport"');
  
  console.log('\nBefore move:');
  console.log(`  Restaurant hovedkategoriId: ${store.underkategorier.get('restaurant')?.hovedkategoriId}`);
  console.log(`  Mat underkategorier: [${store.hovedkategorier.get('mat')?.underkategorier.join(', ')}]`);
  console.log(`  Transport underkategorier: [${store.hovedkategorier.get('transport')?.underkategorier.join(', ')}]`);
  
  const moveUnderkategori = store.moveUnderkategori;
  moveUnderkategori('restaurant', 'transport');

  // Get fresh state after move
  const stateAfterMove = useTransactionStore.getState();
  const restaurantAfterMove = stateAfterMove.underkategorier.get('restaurant');
  const matAfterMove = stateAfterMove.hovedkategorier.get('mat');
  const transportAfterMove = stateAfterMove.hovedkategorier.get('transport');

  console.log('\nAfter move:');
  console.log(`  Restaurant hovedkategoriId: ${restaurantAfterMove?.hovedkategoriId} (expected: transport)`);
  console.log(`  Mat underkategorier: [${matAfterMove?.underkategorier.join(', ')}] (expected: [dagligvarer])`);
  console.log(`  Transport underkategorier: [${transportAfterMove?.underkategorier.join(', ')}] (expected: [bensin, restaurant])`);

  const test1Pass = 
    restaurantAfterMove?.hovedkategoriId === 'transport' &&
    matAfterMove?.underkategorier.length === 1 &&
    matAfterMove?.underkategorier.includes('dagligvarer') &&
    transportAfterMove?.underkategorier.length === 2 &&
    transportAfterMove?.underkategorier.includes('restaurant');

  console.log(`\n  ${test1Pass ? '✓' : '✗'} Move successful`);

  // Test 2: Move "Bensin" back to "Mat"
  console.log('\n📊 Test 2: Move "Bensin" from "Transport" to "Mat"');

  moveUnderkategori('bensin', 'mat');

  // Get fresh state after second move
  const stateAfterMove2 = useTransactionStore.getState();
  const bensinAfterMove = stateAfterMove2.underkategorier.get('bensin');
  const matAfterMove2 = stateAfterMove2.hovedkategorier.get('mat');
  const transportAfterMove2 = stateAfterMove2.hovedkategorier.get('transport');

  console.log('\nAfter move:');
  console.log(`  Bensin hovedkategoriId: ${bensinAfterMove?.hovedkategoriId} (expected: mat)`);
  console.log(`  Mat underkategorier: [${matAfterMove2?.underkategorier.join(', ')}] (expected: [dagligvarer, bensin])`);
  console.log(`  Transport underkategorier: [${transportAfterMove2?.underkategorier.join(', ')}] (expected: [restaurant])`);

  const test2Pass = 
    bensinAfterMove?.hovedkategoriId === 'mat' &&
    matAfterMove2?.underkategorier.includes('bensin') &&
    transportAfterMove2?.underkategorier.length === 1 &&
    transportAfterMove2?.underkategorier.includes('restaurant');

  console.log(`\n  ${test2Pass ? '✓' : '✗'} Move successful`);

  // Test 3: Verify sortOrder updates
  console.log('\n📊 Test 3: Verify sortOrder updates');

  const finalState = useTransactionStore.getState();
  const dagligvarer = finalState.underkategorier.get('dagligvarer');
  const bensinFinal = finalState.underkategorier.get('bensin');
  const restaurantFinal = finalState.underkategorier.get('restaurant');

  console.log('\nFinal sortOrders:');
  console.log(`  Dagligvarer (mat): ${dagligvarer?.sortOrder}`);
  console.log(`  Bensin (mat): ${bensinFinal?.sortOrder}`);
  console.log(`  Restaurant (transport): ${restaurantFinal?.sortOrder}`);

  const test3Pass = 
    typeof dagligvarer?.sortOrder === 'number' &&
    typeof bensinFinal?.sortOrder === 'number' &&
    typeof restaurantFinal?.sortOrder === 'number';

  console.log(`\n  ${test3Pass ? '✓' : '✗'} sortOrder maintained`);

  // Overall result
  const allPassed = test1Pass && test2Pass && test3Pass;

  console.log('\n' + '='.repeat(80));
  console.log(allPassed ? '✅ PASS: Drag and drop works correctly' : '❌ FAIL: Some tests failed');
  console.log('='.repeat(80) + '\n');

  // Cleanup: Don't save this test data
  console.log('💾 Skipping persistence (test data)');
}

// Run test
testDragAndDrop();

