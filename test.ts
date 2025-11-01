/**
 * Simple test for CSV parser
 */

import { parseCSV, Transaction } from './csvParser';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

function testParser() {
  console.log('=== Running CSV Parser Tests ===\n');

  // Test 1: Parse simple CSV
  const testCSV = `Dato;Beløp;Originalt Beløp;Original Valuta;Til konto;Til kontonummer;Fra konto;Fra kontonummer;Type;Tekst;KID;Hovedkategori;Underkategori
2025-10-01;-235,00;-235,00;NOK;;;Felles;3610.61.63558;Betaling;RINGVE LEGESENTER;;Helse og velvære;Lege
2025-10-01;-18,00;-18,00;NOK;;;Felles;3610.61.63558;Betaling;7171 SLUPPENVEI;;Mat og drikke;Restaurant
2025-10-01;-235,00;-235,00;NOK;;;Felles;3610.61.63558;Betaling;RINGVE LEGESENTER;;Helse og velvære;Lege`;

  const result = parseCSV(testCSV);
  
  assert(result.originalCount === 3, 'Should have 3 total transactions');
  assert(result.uniqueCount === 2, 'Should have 2 unique transactions');
  assert(result.duplicates.length === 1, 'Should have 1 duplicate');
  
  // Test 2: Verify Norwegian number parsing
  const firstTransaction = result.transactions[0];
  assert(firstTransaction.beløp === -235.00, 'Should parse Norwegian number format correctly');
  assert(firstTransaction.dato === '2025-10-01', 'Should parse date correctly');
  assert(firstTransaction.tekst === 'RINGVE LEGESENTER', 'Should parse text correctly');
  
  // Test 3: Verify all required fields are present
  assert(firstTransaction.dato !== undefined, 'Should have dato field');
  assert(firstTransaction.beløp !== undefined, 'Should have beløp field');
  assert(firstTransaction.tilKonto !== undefined, 'Should have tilKonto field');
  assert(firstTransaction.tilKontonummer !== undefined, 'Should have tilKontonummer field');
  assert(firstTransaction.fraKonto !== undefined, 'Should have fraKonto field');
  assert(firstTransaction.fraKontonummer !== undefined, 'Should have fraKontonummer field');
  assert(firstTransaction.type !== undefined, 'Should have type field');
  assert(firstTransaction.tekst !== undefined, 'Should have tekst field');
  assert(firstTransaction.underkategori !== undefined, 'Should have underkategori field');

  // Test 4: Verify duplicate detection
  const duplicate = result.duplicates[0];
  assert(duplicate.beløp === -235.00, 'Duplicate should match original transaction');
  assert(duplicate.tekst === 'RINGVE LEGESENTER', 'Duplicate should have same text');

  // Test 5: Test with empty lines
  const csvWithEmptyLines = `Dato;Beløp;Originalt Beløp;Original Valuta;Til konto;Til kontonummer;Fra konto;Fra kontonummer;Type;Tekst;KID;Hovedkategori;Underkategori
2025-10-01;-100,00;-100,00;NOK;;;Felles;123;Betaling;TEST;;Test;Test

2025-10-02;-200,00;-200,00;NOK;;;Felles;456;Betaling;TEST2;;Test;Test`;

  const result2 = parseCSV(csvWithEmptyLines);
  assert(result2.uniqueCount === 2, 'Should handle empty lines correctly');

  console.log('\n=== All Tests Passed! ===');
}

// Run tests
try {
  testParser();
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}

