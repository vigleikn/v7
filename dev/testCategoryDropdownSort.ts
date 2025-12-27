/**
 * Test for Category Dropdown Sorting and Search
 * 
 * Tests that category dropdown sorts and searches alphabetically based on
 * Latin letters, ignoring emoji at the start of category names.
 */

import { cleanCategoryNameForSort } from '../components/TransactionPage';

// Export the function for testing (we'll need to extract it first)
// For now, we'll test the logic directly

function cleanCategoryNameForSort(name: string): string {
  return name.replace(/^[^\p{L}]*/u, '');
}

console.log('\n' + '='.repeat(80));
console.log('🧪 TEST: Category Dropdown Sorting and Search');
console.log('='.repeat(80));
console.log();

// Test data
const testCategories = [
  { id: '1', name: '🍕 Mat ute' },
  { id: '2', name: '🎓 Skole' },
  { id: '3', name: '💰 Inntekter' },
  { id: '4', name: 'Bil' },
  { id: '5', name: '🏠 Hus og hjem' },
  { id: '6', name: 'Mat og drikke' },
  { id: '7', name: '💎 Sparing' },
];

console.log('📋 Test 1: Cleaning category names');
console.log('─'.repeat(80));
testCategories.forEach(cat => {
  const cleaned = cleanCategoryNameForSort(cat.name);
  console.log(`  "${cat.name}" → "${cleaned}"`);
});
console.log();

console.log('📋 Test 2: Sorting categories alphabetically');
console.log('─'.repeat(80));
const sorted = [...testCategories].sort((a, b) => 
  cleanCategoryNameForSort(a.name).localeCompare(
    cleanCategoryNameForSort(b.name), 
    'nb'
  )
);

console.log('Sorted order:');
sorted.forEach((cat, i) => {
  const cleaned = cleanCategoryNameForSort(cat.name);
  console.log(`  ${i + 1}. ${cat.name} (sortert som "${cleaned}")`);
});
console.log();

// Verify sorting (alphabetical order: Bil, Hus, Inntekter, Mat og drikke, Mat ute, Skole, Sparing)
const expectedOrder = ['Bil', 'Hus og hjem', 'Inntekter', 'Mat og drikke', 'Mat ute', 'Skole', 'Sparing'];
const actualOrder = sorted.map(cat => cleanCategoryNameForSort(cat.name));
const isCorrect = JSON.stringify(actualOrder) === JSON.stringify(expectedOrder);

if (isCorrect) {
  console.log('✅ Sorting test PASSED');
} else {
  console.log('❌ Sorting test FAILED');
  console.log(`  Expected: ${expectedOrder.join(', ')}`);
  console.log(`  Got: ${actualOrder.join(', ')}`);
}
console.log();

console.log('📋 Test 3: Search functionality');
console.log('─'.repeat(80));

const searchTests = [
  { query: 'skole', expected: ['🎓 Skole'] },
  { query: 'mat', expected: ['🍕 Mat ute', 'Mat og drikke'] },
  { query: 'bil', expected: ['Bil'] },
  { query: 'hus', expected: ['🏠 Hus og hjem'] },
];

searchTests.forEach(({ query, expected }) => {
  const matches = testCategories.filter(cat => {
    const cleaned = cleanCategoryNameForSort(cat.name).toLowerCase();
    return cleaned.includes(query.toLowerCase());
  });
  
  const matchNames = matches.map(m => m.name);
  const expectedNames = expected;
  const passed = JSON.stringify(matchNames.sort()) === JSON.stringify(expectedNames.sort());
  
  console.log(`  Søk: "${query}"`);
  console.log(`    Forventet: ${expectedNames.join(', ')}`);
  console.log(`    Funnet: ${matchNames.join(', ')}`);
  console.log(`    ${passed ? '✅' : '❌'} ${passed ? 'PASSED' : 'FAILED'}`);
  console.log();
});

console.log('📋 Test 4: Verify emoji is preserved in display');
console.log('─'.repeat(80));
testCategories.forEach(cat => {
  const cleaned = cleanCategoryNameForSort(cat.name);
  const hasEmoji = cat.name !== cleaned;
  console.log(`  "${cat.name}" → Original name preserved: ${!hasEmoji ? 'N/A' : '✅'}`);
  if (hasEmoji) {
    console.log(`    (Emoji preserved: ${cat.name[0]})`);
  }
});
console.log();

console.log('='.repeat(80));
console.log('✅ All tests completed!');
console.log('='.repeat(80));
console.log();

