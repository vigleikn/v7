/**
 * Seed Categories Script
 * Programmatisk opprettelse av hovedkategorier og underkategorier
 */

import { useTransactionStore } from '../store';
import { saveStoreState } from '../services/storeIntegration';
import PersistenceService from '../services/persistence';

console.log('='.repeat(80));
console.log('OPPRETT KATEGORIER PROGRAMMATISK');
console.log('='.repeat(80));
console.log();

async function seedCategories() {
  const store = useTransactionStore.getState();

  // Initialize persistence
  await PersistenceService.init();

  console.log('📁 Starter opprettelse av kategorier...');
  console.log();

  // ============================================================================
  // HOVEDKATEGORI 1: FORUTSIGBARE UTGIFTER
  // ============================================================================

  console.log('📂 Oppretter: FORUTSIGBARE UTGIFTER');

  store.createHovedkategori('Forutsigbare utgifter', {
    color: '#ef4444',
    icon: '📅',
    isIncome: false,
  });

  let currentState = useTransactionStore.getState();
  const forutsigbareUtgifter = Array.from(currentState.hovedkategorier.values()).find(
    k => k.name === 'Forutsigbare utgifter'
  );

  if (!forutsigbareUtgifter) {
    throw new Error('Forutsigbare utgifter ikke opprettet');
  }

  console.log(`✓ Hovedkategori opprettet: Forutsigbare utgifter (ID: ${forutsigbareUtgifter.id})`);

  // Underkategorier
  const forutsigbareUnderkategorier = [
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
  ];

  for (const navn of forutsigbareUnderkategorier) {
    store.createUnderkategori(navn, forutsigbareUtgifter.id);
    console.log(`  └─ ${navn}`);
  }

  console.log();

  // ============================================================================
  // HOVEDKATEGORI 2: UFORUTSIGBARE UTGIFTER
  // ============================================================================

  console.log('📂 Oppretter: UFORUTSIGBARE UTGIFTER');

  store.createHovedkategori('Uforutsigbare utgifter', {
    color: '#f59e0b',
    icon: '❓',
    isIncome: false,
  });

  currentState = useTransactionStore.getState();
  const uforutsigbareUtgifter = Array.from(currentState.hovedkategorier.values()).find(
    k => k.name === 'Uforutsigbare utgifter'
  );

  if (!uforutsigbareUtgifter) {
    throw new Error('Uforutsigbare utgifter ikke opprettet');
  }

  console.log(`✓ Hovedkategori opprettet: Uforutsigbare utgifter (ID: ${uforutsigbareUtgifter.id})`);

  // Underkategorier
  const uforutsigbareUnderkategorier = [
    'Elektronikk',
    'Familieaktiviteter',
    'Ferie',
    'Gaver',
    'Hobby',
    'Interiør',
    'Planter',
    'Utstyr',
    'Velvære',
  ];

  for (const navn of uforutsigbareUnderkategorier) {
    store.createUnderkategori(navn, uforutsigbareUtgifter.id);
    console.log(`  └─ ${navn}`);
  }

  console.log();

  // ============================================================================
  // HOVEDKATEGORI 3: LIVSOPPHOLD
  // ============================================================================

  console.log('📂 Oppretter: LIVSOPPHOLD');

  store.createHovedkategori('Livsopphold', {
    color: '#10b981',
    icon: '🛒',
    isIncome: false,
  });

  currentState = useTransactionStore.getState();
  const livsopphold = Array.from(currentState.hovedkategorier.values()).find(
    k => k.name === 'Livsopphold'
  );

  if (!livsopphold) {
    throw new Error('Livsopphold ikke opprettet');
  }

  console.log(`✓ Hovedkategori opprettet: Livsopphold (ID: ${livsopphold.id})`);

  // Underkategorier
  const livsoppholdUnderkategorier = [
    'Bil',
    'Dagligvarer',
    'Helse',
    'Klær',
    'Mat ute',
    'Skole',
    'Sykkel',
  ];

  for (const navn of livsoppholdUnderkategorier) {
    store.createUnderkategori(navn, livsopphold.id);
    console.log(`  └─ ${navn}`);
  }

  console.log();

  // ============================================================================
  // SYSTEM-KATEGORI: INNTEKTER (legge til underkategorier)
  // ============================================================================

  console.log('📂 Legger til underkategorier i INNTEKTER (systemkategori)');

  currentState = useTransactionStore.getState();
  const inntekterKategori = Array.from(currentState.hovedkategorier.values()).find(
    k => k.name === 'Inntekter' && k.isIncome === true
  );

  if (!inntekterKategori) {
    throw new Error('Inntekter systemkategori ikke funnet');
  }

  console.log(`✓ Fant systemkategori: Inntekter (ID: ${inntekterKategori.id})`);

  // Underkategorier for Inntekter
  const inntekterUnderkategorier = [
    'Andre inntekter',
    'Torghatten',
    'UDI',
  ];

  for (const navn of inntekterUnderkategorier) {
    store.createUnderkategori(navn, inntekterKategori.id);
    console.log(`  └─ ${navn}`);
  }

  console.log();

  // ============================================================================
  // LAGRE TIL PERSISTENT LAGRING
  // ============================================================================

  console.log('💾 Lagrer kategorier til persistent lagring...');
  console.log();

  currentState = useTransactionStore.getState();

  console.log('Lagrer:');
  console.log(`  - ${currentState.hovedkategorier.size} hovedkategorier`);
  console.log(`  - ${currentState.underkategorier.size} underkategorier`);
  console.log();

  await saveStoreState();

  console.log('✓ Kategorier lagret til persistent lagring');
  console.log();

  // ============================================================================
  // OPPSUMMERING
  // ============================================================================

  console.log('='.repeat(80));
  console.log('📋 OPPSUMMERING');
  console.log('='.repeat(80));
  console.log();

  currentState = useTransactionStore.getState();

  console.log('✅ Kategorier opprettet og lagret:');
  console.log();

  // List all hovedkategorier with their underkategorier
  const hovedkategorier = Array.from(currentState.hovedkategorier.values())
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const hk of hovedkategorier) {
    const isSystem = hk.isIncome ? ' [SYSTEM]' : '';
    console.log(`${hk.icon || '📁'} ${hk.name}${isSystem}`);

    const details = currentState.getHovedkategoriWithUnderkategorier(hk.id);
    if (details && details.underkategorier.length > 0) {
      details.underkategorier.forEach(uk => {
        console.log(`  └─ ${uk.name}`);
      });
    }
    console.log();
  }

  console.log('📊 Statistikk:');
  console.log(`  Hovedkategorier: ${currentState.hovedkategorier.size}`);
  console.log(`  Underkategorier: ${currentState.underkategorier.size}`);
  console.log(`  Totalt kategorier: ${currentState.hovedkategorier.size + currentState.underkategorier.size}`);
  console.log();

  console.log('Fordeling:');
  const forutsigbare = currentState.getHovedkategoriWithUnderkategorier(forutsigbareUtgifter.id);
  const uforutsigbare = currentState.getHovedkategoriWithUnderkategorier(uforutsigbareUtgifter.id);
  const livsoppholdDetails = currentState.getHovedkategoriWithUnderkategorier(livsopphold.id);
  const inntekterDetails = currentState.getHovedkategoriWithUnderkategorier(inntekterKategori.id);

  console.log(`  Forutsigbare utgifter: ${forutsigbare?.underkategorier.length || 0} underkategorier`);
  console.log(`  Uforutsigbare utgifter: ${uforutsigbare?.underkategorier.length || 0} underkategorier`);
  console.log(`  Livsopphold: ${livsoppholdDetails?.underkategorier.length || 0} underkategorier`);
  console.log(`  Inntekter: ${inntekterDetails?.underkategorier.length || 0} underkategorier`);
  console.log();

  console.log('💾 Lagret til:');
  console.log(`  ${process.cwd()}/data/persistent/`);
  console.log();

  console.log('🎉 Ferdig! Kategorier er klare til bruk.');
  console.log('='.repeat(80));
  console.log();
}

// Run the seed script
seedCategories().catch(error => {
  console.error('❌ Feil ved opprettelse av kategorier:', error);
  process.exit(1);
});

