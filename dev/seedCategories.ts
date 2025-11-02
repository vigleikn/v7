/**
 * Seed Categories Script
 * Programmatically creates hovedkategorier and underkategorier
 * using existing Zustand store actions, then saves to persistent storage
 */

import { useTransactionStore } from '../store';
import { saveAll } from '../services/persistence';

// ============================================================================
// Category Data
// ============================================================================

const CATEGORIES = {
  'FORUTSIGBARE UTGIFTER': [
    'Kommunalt',
    'Nett og tlf',
    'Streaming abo.',
    'Strøm',
    'Studielån og fagforening',
    'Tidsskrift',
    'Treningsavgift',
    'Veldedighet',
    'Husleie',
    'Forsikring',
    'Fellesutgifter',
  ],
  'UFORUTSIGBARE UTGIFTER': [
    'Elektronikk',
    'Familieaktiviteter',
    'Ferie',
    'Gaver',
    'Hobby',
    'Interiør',
    'Planter',
    'Utstyr',
    'Velvære',
  ],
  'LIVSOPPHOLD': [
    'Bil',
    'Dagligvarer',
    'Helse',
    'Klær',
    'Mat ute',
    'Skole',
    'Sykkel',
  ],
};

const INNTEKTER_SUBCATEGORIES = [
  'Andre inntekter',
  'Torghatten',
  'UDI',
];

// ============================================================================
// Main Function
// ============================================================================

async function seedCategories() {
  console.log('🌱 Starting category seeding...\n');

  const store = useTransactionStore.getState();
  
  // Track created categories
  const createdHovedkategorier: string[] = [];
  const createdUnderkategorier: string[] = [];

  // ========================================================================
  // Step 1: Create hovedkategorier with their underkategorier
  // ========================================================================

  console.log('📁 Creating hovedkategorier and underkategorier...');
  
  for (const [hovedkategoriName, underkategorier] of Object.entries(CATEGORIES)) {
    console.log(`\n  Creating: ${hovedkategoriName}`);
    
    // Create hovedkategori
    store.createHovedkategori(hovedkategoriName);
    createdHovedkategorier.push(hovedkategoriName);
    
    // Get the created hovedkategori ID
    const currentState = useTransactionStore.getState();
    const hovedkategori = Array.from(currentState.hovedkategorier.values())
      .find(cat => cat.name === hovedkategoriName);
    
    if (!hovedkategori) {
      console.error(`  ❌ Failed to create hovedkategori: ${hovedkategoriName}`);
      continue;
    }
    
    console.log(`  ✅ Created hovedkategori (ID: ${hovedkategori.id})`);
    
    // Create underkategorier
    for (const underkategoriName of underkategorier) {
      store.createUnderkategori(underkategoriName, hovedkategori.id);
      createdUnderkategorier.push(underkategoriName);
      console.log(`     ↳ ${underkategoriName}`);
    }
  }

  // ========================================================================
  // Step 2: Add underkategorier to "Inntekter" system category
  // ========================================================================

  console.log('\n💰 Adding underkategorier to "Inntekter"...');
  
  const currentState = useTransactionStore.getState();
  const inntekterCategory = currentState.hovedkategorier.get('cat_inntekter_default');
  
  if (inntekterCategory) {
    for (const underkategoriName of INNTEKTER_SUBCATEGORIES) {
      store.createUnderkategori(underkategoriName, inntekterCategory.id);
      createdUnderkategorier.push(underkategoriName);
      console.log(`  ↳ ${underkategoriName}`);
    }
  } else {
    console.error('  ❌ Could not find "Inntekter" category');
  }

  // ========================================================================
  // Step 3: Save to persistent storage
  // ========================================================================

  console.log('\n💾 Saving to persistent storage...');
  
  try {
    const finalState = useTransactionStore.getState();
    
    await saveAll({
      transactions: finalState.transactions,
      hovedkategorier: finalState.hovedkategorier,
      underkategorier: finalState.underkategorier,
      rules: finalState.rules,
      locks: finalState.locks,
    });
    
    console.log('✅ Successfully saved to data/persistent/');
  } catch (error) {
    console.error('❌ Failed to save:', error);
    throw error;
  }

  // ========================================================================
  // Step 4: Summary
  // ========================================================================

  console.log('\n📊 Summary:');
  console.log(`  Hovedkategorier created: ${createdHovedkategorier.length}`);
  console.log(`  Underkategorier created: ${createdUnderkategorier.length}`);
  
  const finalState = useTransactionStore.getState();
  console.log(`\n  Total hovedkategorier in store: ${finalState.hovedkategorier.size}`);
  console.log(`  Total underkategorier in store: ${finalState.underkategorier.size}`);
  
  console.log('\n✨ Category seeding complete!\n');

  // ========================================================================
  // Step 5: Display all categories
  // ========================================================================

  console.log('📋 All categories in store:\n');
  
  Array.from(finalState.hovedkategorier.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach(hovedkat => {
      const isIncome = hovedkat.isIncome ? ' [Income]' : '';
      const hideFromUI = hovedkat.hideFromCategoryPage ? ' [Hidden from UI]' : '';
      console.log(`  ${hovedkat.icon || '📁'} ${hovedkat.name}${isIncome}${hideFromUI}`);
      
      const subkategorier = hovedkat.underkategorier
        .map(subId => finalState.underkategorier.get(subId))
        .filter(Boolean);
      
      subkategorier.forEach(sub => {
        console.log(`     ↳ ${sub!.name}`);
      });
      
      if (subkategorier.length === 0) {
        console.log(`     (no subcategories)`);
      }
    });
}

// ============================================================================
// Run
// ============================================================================

seedCategories()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
