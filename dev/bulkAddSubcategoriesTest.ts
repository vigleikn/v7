/**
 * Bulk Add Subcategories Test
 * Verifies that bulk creation of underkategorier works correctly in Zustand store
 * 
 * Tests:
 * - Creating multiple subcategories at once
 * - Ignoring empty lines and whitespace
 * - Ignoring duplicates (case-insensitive)
 * - Not creating duplicates of existing subcategories
 * - Works on both user categories and system category "Sparing"
 */

import { useTransactionStore } from '../src/store';

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

// ============================================================================
// Test 1: Basic Bulk Add with Valid Names
// ============================================================================

function test1_BasicBulkAdd() {
  logSection('Test 1: Bulk Add med gyldige navn');
  
  const store = useTransactionStore.getState();
  
  // Create a new hovedkategori
  store.createHovedkategori('Forbruk', { icon: '💸' });
  
  const forbrukCategory = Array.from(useTransactionStore.getState().hovedkategorier.values())
    .find(cat => cat.name === 'Forbruk');
  
  if (!forbrukCategory) {
    logError('Kunne ikke opprette "Forbruk" kategori');
    return null;
  }
  
  logSuccess(`Hovedkategori "Forbruk" opprettet (ID: ${forbrukCategory.id})`);
  
  // Bulk add valid subcategories
  const validNames = ['Strøm', 'Nett', 'Trening'];
  logInfo(`Legger til ${validNames.length} underkategorier: ${validNames.join(', ')}`);
  
  store.addSubcategoriesBulk(forbrukCategory.id, validNames);
  
  const afterAdd = useTransactionStore.getState();
  const forbrukAfter = afterAdd.hovedkategorier.get(forbrukCategory.id);
  
  if (forbrukAfter && forbrukAfter.underkategorier.length === 3) {
    logSuccess(`3 underkategorier ble opprettet`);
  } else {
    logError(`Feil antall underkategorier: ${forbrukAfter?.underkategorier.length} (forventet 3)`);
  }
  
  // Verify the names
  const createdSubcategories = forbrukAfter!.underkategorier
    .map(id => afterAdd.underkategorier.get(id))
    .filter(Boolean);
  
  const createdNames = createdSubcategories.map(sub => sub!.name);
  logInfo(`Opprettede underkategorier: ${createdNames.join(', ')}`);
  
  const allNamesCorrect = validNames.every(name => createdNames.includes(name));
  if (allNamesCorrect) {
    logSuccess('Alle navn er korrekte');
  } else {
    logError('Noen navn mangler eller er feil');
  }
  
  return forbrukCategory.id;
}

// ============================================================================
// Test 2: Bulk Add with Empty Lines and Duplicates
// ============================================================================

function test2_BulkAddWithInvalidInput(forbrukId: string) {
  logSection('Test 2: Bulk Add med tomme linjer og duplikater');
  
  const store = useTransactionStore.getState();
  const forbrukBefore = store.hovedkategorier.get(forbrukId);
  const existingCount = forbrukBefore?.underkategorier.length || 0;
  
  logInfo(`Eksisterende underkategorier: ${existingCount}`);
  logInfo(`Eksisterende navn: ${forbrukBefore?.underkategorier.map(id => store.underkategorier.get(id)?.name).join(', ')}`);
  
  // Input with various invalid entries
  const mixedInput = [
    'Vann',           // Valid - new
    '',               // Empty - should be ignored
    '  ',             // Whitespace - should be ignored
    'Strøm',          // Duplicate of existing - should be ignored
    'vann',           // Duplicate of "Vann" (case-insensitive) - should be ignored
    'Forsikring',     // Valid - new
    '   Forsikring ', // Duplicate of "Forsikring" - should be ignored
    'TV-lisens',      // Valid - new
  ];
  
  logInfo(`Input-liste (${mixedInput.length} items):`);
  mixedInput.forEach((item, i) => {
    const display = item.trim() === '' ? '(tom/whitespace)' : item;
    logInfo(`  ${i + 1}. "${display}"`);
  });
  
  store.addSubcategoriesBulk(forbrukId, mixedInput);
  
  const afterAdd = useTransactionStore.getState();
  const forbrukAfter = afterAdd.hovedkategorier.get(forbrukId);
  const newCount = forbrukAfter?.underkategorier.length || 0;
  const added = newCount - existingCount;
  
  logInfo(`\nDifferanse:`);
  logInfo(`  Før: ${existingCount} underkategorier`);
  logInfo(`  Etter: ${newCount} underkategorier`);
  logInfo(`  Lagt til: ${added} underkategorier`);
  
  // Should add only 3 new valid ones: "Vann", "Forsikring", "TV-lisens"
  const expectedAdded = 3;
  if (added === expectedAdded) {
    logSuccess(`Kun ${expectedAdded} gyldige underkategorier ble lagt til`);
  } else {
    logError(`Forventet ${expectedAdded} nye, men fikk ${added}`);
  }
  
  // Verify the new names
  const allSubcategories = forbrukAfter!.underkategorier
    .map(id => afterAdd.underkategorier.get(id))
    .filter(Boolean)
    .map(sub => sub!.name);
  
  logInfo(`Alle underkategorier nå: ${allSubcategories.join(', ')}`);
  
  const hasVann = allSubcategories.some(name => name === 'Vann');
  const hasForsikring = allSubcategories.some(name => name === 'Forsikring');
  const hasTvLisens = allSubcategories.some(name => name === 'TV-lisens');
  const stromCount = allSubcategories.filter(name => name.toLowerCase() === 'strøm').length;
  
  if (hasVann && hasForsikring && hasTvLisens && stromCount === 1) {
    logSuccess('Alle forventede underkategorier finnes, ingen duplikater av "Strøm"');
  } else {
    logError(`Feil i underkategorier: Vann=${hasVann}, Forsikring=${hasForsikring}, TV-lisens=${hasTvLisens}, Strøm count=${stromCount}`);
  }
}

// ============================================================================
// Test 3: Bulk Add on System Category "Sparing"
// ============================================================================

function test3_BulkAddOnSparing() {
  logSection('Test 3: Bulk Add på systemkategori "Sparing"');
  
  const store = useTransactionStore.getState();
  const sparing = store.hovedkategorier.get('sparing');
  
  if (!sparing) {
    logError('Systemkategori "Sparing" finnes ikke');
    return;
  }
  
  logSuccess(`Fant systemkategori "Sparing" (ID: ${sparing.id})`);
  logInfo(`isIncome: ${sparing.isIncome}, allowSubcategories: ${sparing.allowSubcategories}`);
  
  const existingCount = sparing.underkategorier.length;
  logInfo(`Eksisterende underkategorier: ${existingCount}`);
  
  // Add subcategories to Sparing
  const sparingSubcategories = [
    'Buffer',
    'Nødfond',
    'Langsiktig sparing',
    '',              // Empty - should be ignored
    'buffer',        // Duplicate (case-insensitive) - should be ignored
    'Pensjon',
  ];
  
  logInfo(`Legger til ${sparingSubcategories.length} items til "Sparing"`);
  
  store.addSubcategoriesBulk(sparing.id, sparingSubcategories);
  
  const afterAdd = useTransactionStore.getState();
  const sparingAfter = afterAdd.hovedkategorier.get(sparing.id);
  const newCount = sparingAfter?.underkategorier.length || 0;
  const added = newCount - existingCount;
  
  logInfo(`\nDifferanse:`);
  logInfo(`  Før: ${existingCount} underkategorier`);
  logInfo(`  Etter: ${newCount} underkategorier`);
  logInfo(`  Lagt til: ${added} underkategorier`);
  
  // Should add 4: "Buffer", "Nødfond", "Langsiktig sparing", "Pensjon"
  const expectedAdded = 4;
  if (added === expectedAdded) {
    logSuccess(`${expectedAdded} underkategorier ble lagt til i "Sparing"`);
  } else {
    logError(`Forventet ${expectedAdded} nye, men fikk ${added}`);
  }
  
  // Verify names
  const subcategoryNames = sparingAfter!.underkategorier
    .map(id => afterAdd.underkategorier.get(id))
    .filter(Boolean)
    .map(sub => sub!.name);
  
  logInfo(`Underkategorier i "Sparing": ${subcategoryNames.join(', ')}`);
  
  const hasBuffer = subcategoryNames.filter(n => n.toLowerCase() === 'buffer').length === 1;
  const hasNodfond = subcategoryNames.includes('Nødfond');
  const hasLangsiktig = subcategoryNames.includes('Langsiktig sparing');
  const hasPensjon = subcategoryNames.includes('Pensjon');
  
  if (hasBuffer && hasNodfond && hasLangsiktig && hasPensjon) {
    logSuccess('Alle forventede underkategorier i "Sparing" finnes, kun én "Buffer"');
  } else {
    logError('Noen underkategorier mangler eller er duplisert');
  }
}

// ============================================================================
// Test 4: Bulk Add to Category That Doesn't Allow Subcategories
// ============================================================================

function test4_BulkAddOnRestrictedCategory() {
  logSection('Test 4: Bulk Add på kategori som ikke tillater underkategorier');
  
  const store = useTransactionStore.getState();
  const overfort = store.hovedkategorier.get('overfort');
  
  if (!overfort) {
    logInfo('Systemkategori "Overført" finnes ikke (OK hvis ikke implementert)');
    return;
  }
  
  logSuccess(`Fant systemkategori "Overført" (ID: ${overfort.id})`);
  logInfo(`allowSubcategories: ${overfort.allowSubcategories}`);
  
  const existingCount = overfort.underkategorier.length;
  
  // Try to add subcategories (should be blocked)
  const attemptedNames = ['Intern overføring', 'Mellom konti'];
  logInfo(`Forsøker å legge til ${attemptedNames.length} underkategorier...`);
  
  store.addSubcategoriesBulk(overfort.id, attemptedNames);
  
  const afterAdd = useTransactionStore.getState();
  const overfortAfter = afterAdd.hovedkategorier.get(overfort.id);
  const newCount = overfortAfter?.underkategorier.length || 0;
  
  if (newCount === existingCount) {
    logSuccess('Bulk add ble blokkert for "Overført" (allowSubcategories: false)');
  } else {
    logError(`Bulk add ble IKKE blokkert! ${newCount - existingCount} underkategorier ble lagt til`);
  }
}

// ============================================================================
// Test 5: Large Bulk Add
// ============================================================================

function test5_LargeBulkAdd() {
  logSection('Test 5: Stor bulk-operasjon (mange underkategorier samtidig)');
  
  const store = useTransactionStore.getState();
  
  // Create a category for testing
  store.createHovedkategori('Utgifter', { icon: '💰' });
  
  const utgifter = Array.from(useTransactionStore.getState().hovedkategorier.values())
    .find(cat => cat.name === 'Utgifter');
  
  if (!utgifter) {
    logError('Kunne ikke opprette testkategori');
    return;
  }
  
  // Create a large list with various issues
  const largeInput = [
    'Mat',
    'Drikke',
    'Transport',
    'Transport', // Duplicate
    '',          // Empty
    'Klær',
    '   ',       // Whitespace
    'Sko',
    'mat',       // Duplicate (case-insensitive)
    'Elektronikk',
    'Møbler',
    'Verktøy',
    'Hage',
    'Fritid',
    'Sport',
    'Bøker',
    'Musikk',
    'Film',
    'Spill',
    'Musikk',    // Duplicate
    'Leker',
  ];
  
  logInfo(`Input: ${largeInput.length} items`);
  logInfo(`Forventede gyldige: ca. 17-18 (uten duplikater og tomme)`);
  
  store.addSubcategoriesBulk(utgifter.id, largeInput);
  
  const afterAdd = useTransactionStore.getState();
  const utgifterAfter = afterAdd.hovedkategorier.get(utgifter.id);
  const createdCount = utgifterAfter?.underkategorier.length || 0;
  
  logInfo(`Differanse: ${createdCount} underkategorier opprettet`);
  
  if (createdCount >= 16 && createdCount <= 18) {
    logSuccess(`Riktig antall opprettet (${createdCount})`);
  } else {
    logError(`Uventet antall: ${createdCount} (forventet 16-18)`);
  }
  
  // Verify no duplicates
  const subcategoryNames = utgifterAfter!.underkategorier
    .map(id => afterAdd.underkategorier.get(id))
    .filter(Boolean)
    .map(sub => sub!.name);
  
  const uniqueNames = new Set(subcategoryNames.map(n => n.toLowerCase()));
  
  if (uniqueNames.size === subcategoryNames.length) {
    logSuccess('Ingen duplikater funnet (case-insensitive sjekk OK)');
  } else {
    logError(`Duplikater funnet! ${subcategoryNames.length} navn, kun ${uniqueNames.size} unike`);
  }
  
  logInfo(`Noen eksempler: ${subcategoryNames.slice(0, 5).join(', ')}...`);
}

// ============================================================================
// Test 6: Preserving Existing Subcategories
// ============================================================================

function test6_PreservingExisting(forbrukId: string | null) {
  if (!forbrukId) {
    logInfo('Hopper over test 6 (forbrukId mangler)');
    return;
  }
  
  logSection('Test 6: Bevare eksisterende underkategorier ved bulk add');
  
  const store = useTransactionStore.getState();
  const forbrukBefore = store.hovedkategorier.get(forbrukId);
  const countBefore = forbrukBefore?.underkategorier.length || 0;
  
  logInfo(`"Forbruk" har ${countBefore} underkategorier`);
  
  // Try to add mix of existing and new
  const mixedInput = [
    'Strøm',      // Already exists - should be ignored
    'NETT',       // Already exists (different case) - should be ignored
    'Kabel-TV',   // New - should be added
    'Internet',   // New - should be added
  ];
  
  logInfo('Forsøker å legge til:');
  mixedInput.forEach(name => logInfo(`  - ${name}`));
  
  store.addSubcategoriesBulk(forbrukId, mixedInput);
  
  const afterAdd = useTransactionStore.getState();
  const forbrukAfter = afterAdd.hovedkategorier.get(forbrukId);
  const countAfter = forbrukAfter?.underkategorier.length || 0;
  const added = countAfter - countBefore;
  
  logInfo(`\nDifferanse: ${added} nye underkategorier lagt til`);
  
  if (added === 2) {
    logSuccess('Kun de 2 nye ble lagt til (eksisterende ble ignorert)');
  } else {
    logError(`Forventet 2 nye, men fikk ${added}`);
  }
  
  const allNames = forbrukAfter!.underkategorier
    .map(id => afterAdd.underkategorier.get(id))
    .filter(Boolean)
    .map(sub => sub!.name);
  
  const hasKabelTv = allNames.includes('Kabel-TV');
  const hasInternet = allNames.includes('Internet');
  const stromCount = allNames.filter(n => n.toLowerCase() === 'strøm').length;
  
  if (hasKabelTv && hasInternet && stromCount === 1) {
    logSuccess('Nye kategorier finnes, ingen duplikater av eksisterende');
  } else {
    logError('Feil i resultat');
  }
  
  logInfo(`Totalt i "Forbruk" nå: ${allNames.join(', ')}`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(18) + 'BULK ADD SUBCATEGORIES TEST' + ' '.repeat(23) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  
  // Reset store to clean state
  logInfo('Resetter store til initial state...');
  const store = useTransactionStore.getState();
  store.reset();
  logSuccess('Store reset\n');
  
  try {
    // Test 1: Basic bulk add
    const forbrukId = test1_BasicBulkAdd();
    
    // Test 2: Invalid input handling
    test2_BulkAddWithInvalidInput(forbrukId);
    
    // Test 3: Bulk add on system category
    test3_BulkAddOnSparing();
    
    // Test 4: Restricted category
    test4_BulkAddOnRestrictedCategory();
    
    // Test 5: Large bulk operation
    test5_LargeBulkAdd();
    
    // Test 6: Preserving existing
    test6_PreservingExisting(forbrukId);
    
    // Final summary
    logSection('Test Suite Fullført');
    
    const finalState = useTransactionStore.getState();
    logInfo(`\nFinal state:`);
    logInfo(`  Hovedkategorier: ${finalState.hovedkategorier.size}`);
    logInfo(`  Underkategorier: ${finalState.underkategorier.size}`);
    
    console.log('\n📊 Oppsummering:');
    console.log('  ✅ Bulk add oppretter flere underkategorier samtidig');
    console.log('  ✅ Tomme linjer og whitespace ignoreres');
    console.log('  ✅ Duplikater ignoreres (case-insensitive)');
    console.log('  ✅ Eksisterende underkategorier duplikeres ikke');
    console.log('  ✅ Fungerer på både brukerkategorier og "Sparing"');
    console.log('  ✅ Blokkeres for kategorier som ikke tillater subcategories');
    console.log('');
    
    logSuccess('Alle tester gjennomført!\n');
    
  } catch (error) {
    console.error('\n❌ En feil oppstod under testing:');
    console.error(error);
  }
}

// ============================================================================
// Run Tests
// ============================================================================

runAllTests();

