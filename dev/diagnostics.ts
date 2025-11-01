/**
 * Diagnostics - Check where categories are and if they're connected properly
 */

import { useTransactionStore } from '../store';
import { loadHovedkategorier, loadUnderkategorier } from '../services/persistence';
import { promises as fs } from 'fs';
import { join } from 'path';

console.log('='.repeat(80));
console.log('DIAGNOSTIKK - FINN KATEGORIER');
console.log('='.repeat(80));
console.log();

async function diagnose() {
  // ============================================================================
  // 1. Sjekk Zustand store (minne)
  // ============================================================================

  console.log('📦 1. SJEKK ZUSTAND STORE (MINNE)');
  console.log('-'.repeat(80));
  console.log();

  const state = useTransactionStore.getState();

  console.log(`Hovedkategorier i store: ${state.hovedkategorier.size}`);
  Array.from(state.hovedkategorier.values()).forEach((hk, i) => {
    console.log(`  ${i + 1}. ${hk.icon || '📁'} ${hk.name} ${hk.isIncome ? '[SYSTEM]' : ''}`);
    console.log(`     ID: ${hk.id}`);
    console.log(`     Underkategorier: ${hk.underkategorier.length}`);
  });
  console.log();

  console.log(`Underkategorier i store: ${state.underkategorier.size}`);
  Array.from(state.underkategorier.values()).forEach((uk, i) => {
    console.log(`  ${i + 1}. ${uk.name}`);
    console.log(`     ID: ${uk.id}`);
    console.log(`     Parent: ${uk.hovedkategoriId}`);
  });
  console.log();

  // ============================================================================
  // 2. Sjekk persistent filer
  // ============================================================================

  console.log('💾 2. SJEKK PERSISTENT LAGRING (FILER)');
  console.log('-'.repeat(80));
  console.log();

  const dataDir = join(process.cwd(), 'data', 'persistent');

  try {
    // Check if directory exists
    await fs.access(dataDir);
    console.log(`✓ Data directory exists: ${dataDir}`);
    console.log();

    // List files
    const files = await fs.readdir(dataDir);
    console.log(`Filer i persistent lagring (${files.length}):`);
    for (const file of files) {
      const stat = await fs.stat(join(dataDir, file));
      console.log(`  - ${file.padEnd(25)} ${(stat.size / 1024).toFixed(2)} KB`);
    }
    console.log();

    // Load hovedkategorier from file
    console.log('Laster hovedkategorier fra fil...');
    const loadedHovedkat = await loadHovedkategorier();
    console.log(`  Lastet: ${loadedHovedkat.size} hovedkategorier`);
    Array.from(loadedHovedkat.values()).forEach((hk, i) => {
      console.log(`    ${i + 1}. ${hk.name} (ID: ${hk.id})`);
    });
    console.log();

    // Load underkategorier from file
    console.log('Laster underkategorier fra fil...');
    const loadedUnderkat = await loadUnderkategorier();
    console.log(`  Lastet: ${loadedUnderkat.size} underkategorier`);
    Array.from(loadedUnderkat.values()).slice(0, 10).forEach((uk, i) => {
      console.log(`    ${i + 1}. ${uk.name} (Parent: ${uk.hovedkategoriId})`);
    });
    if (loadedUnderkat.size > 10) {
      console.log(`    ... og ${loadedUnderkat.size - 10} flere`);
    }
    console.log();

  } catch (error) {
    console.log(`❌ Kunne ikke lese persistent lagring: ${error}`);
    console.log();
  }

  // ============================================================================
  // 3. Sjekk browser localStorage (hvis tilgjengelig)
  // ============================================================================

  console.log('🌐 3. SJEKK BROWSER LOCALSTORAGE');
  console.log('-'.repeat(80));
  console.log();

  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('transaction-app-data');
    
    if (stored) {
      const data = JSON.parse(stored);
      console.log('✓ Data funnet i localStorage');
      console.log(`  Hovedkategorier: ${data.hovedkategorier?.length || 0}`);
      console.log(`  Underkategorier: ${data.underkategorier?.length || 0}`);
      console.log(`  Transaksjoner: ${data.transactions?.length || 0}`);
      console.log(`  Regler: ${data.rules?.length || 0}`);
      console.log(`  Sist lagret: ${data.lastSaved || 'Ukjent'}`);
    } else {
      console.log('ℹ️  Ingen data i localStorage');
    }
  } else {
    console.log('ℹ️  localStorage ikke tilgjengelig (Node.js miljø)');
  }
  console.log();

  // ============================================================================
  // 4. Test kobling mellom hoved- og underkategorier
  // ============================================================================

  console.log('🔗 4. TEST KOBLING MELLOM KATEGORIER');
  console.log('-'.repeat(80));
  console.log();

  console.log('Tester getHovedkategoriWithUnderkategorier():');
  console.log();

  const hovedkategorier = Array.from(state.hovedkategorier.values());
  
  for (const hk of hovedkategorier) {
    const details = state.getHovedkategoriWithUnderkategorier(hk.id);
    
    console.log(`${hk.icon || '📁'} ${hk.name}`);
    console.log(`  IDs i hovedkategori.underkategorier array: [${hk.underkategorier.join(', ')}]`);
    
    if (details) {
      console.log(`  Funnet via getHovedkategoriWithUnderkategorier: ${details.underkategorier.length}`);
      details.underkategorier.forEach(uk => {
        console.log(`    └─ ${uk.name} (ID: ${uk.id})`);
      });
    } else {
      console.log(`  ❌ getHovedkategoriWithUnderkategorier returnerte null`);
    }
    console.log();
  }

  // ============================================================================
  // 5. Sammenligning
  // ============================================================================

  console.log('📊 5. SAMMENLIGNING');
  console.log('-'.repeat(80));
  console.log();

  const loadedHovedkat = await loadHovedkategorier();
  const loadedUnderkat = await loadUnderkategorier();

  console.log('I minne (Zustand):');
  console.log(`  Hovedkategorier: ${state.hovedkategorier.size}`);
  console.log(`  Underkategorier: ${state.underkategorier.size}`);
  console.log();

  console.log('På disk (persistent):');
  console.log(`  Hovedkategorier: ${loadedHovedkat.size}`);
  console.log(`  Underkategorier: ${loadedUnderkat.size}`);
  console.log();

  if (state.hovedkategorier.size !== loadedHovedkat.size) {
    console.log('⚠️  MISMATCH: Forskjellig antall hovedkategorier i minne vs disk!');
  } else {
    console.log('✓ Samme antall hovedkategorier i minne og disk');
  }

  if (state.underkategorier.size !== loadedUnderkat.size) {
    console.log('⚠️  MISMATCH: Forskjellig antall underkategorier i minne vs disk!');
  } else {
    console.log('✓ Samme antall underkategorier i minne og disk');
  }
  console.log();

  // ============================================================================
  // 6. Anbefaling
  // ============================================================================

  console.log('💡 6. ANBEFALING');
  console.log('-'.repeat(80));
  console.log();

  if (loadedHovedkat.size > state.hovedkategorier.size) {
    console.log('📌 Kategorier finnes på disk, men ikke i minne.');
    console.log('   For å laste dem:');
    console.log('   1. Restart appen');
    console.log('   2. Eller kjør: await initializeStore()');
    console.log();
  }

  if (state.hovedkategorier.size > 1 && typeof window !== 'undefined') {
    console.log('📌 Kategorier finnes i minne (Node.js).');
    console.log('   For å se dem i browser:');
    console.log('   1. Åpne http://localhost:3000');
    console.log('   2. Åpne Console (F12)');
    console.log('   3. Kjør: localStorage.clear(); location.reload()');
    console.log('   4. Kategoriene vil lastes fra disk');
    console.log();
  }

  console.log('='.repeat(80));
  console.log('🎯 Diagnostikk fullført');
  console.log('='.repeat(80));
  console.log();
}

// Run diagnostics
diagnose().catch(console.error);

