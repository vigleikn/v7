/**
 * Example usage of the CSV parser
 */

import { parseCSVFile } from './csvParser';

async function main() {
  try {
    // Parse the CSV file
    const result = await parseCSVFile('./data/23421.csv');

    console.log('=== CSV Parse Results ===');
    console.log(`Total transactions found: ${result.originalCount}`);
    console.log(`Unique transactions: ${result.uniqueCount}`);
    console.log(`Duplicates removed: ${result.duplicates.length}`);
    console.log('');

    // Show first 5 transactions
    console.log('=== First 5 Transactions ===');
    result.transactions.slice(0, 5).forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.dato}`);
      console.log(`   Beløp: ${t.beløp.toFixed(2)} NOK`);
      console.log(`   Type: ${t.type}`);
      console.log(`   Tekst: ${t.tekst}`);
      console.log(`   Fra: ${t.fraKonto} (${t.fraKontonummer})`);
      console.log(`   Til: ${t.tilKonto} (${t.tilKontonummer})`);
    });

    // Show duplicates if any
    if (result.duplicates.length > 0) {
      console.log('\n=== Duplicates Found ===');
      result.duplicates.forEach((t, i) => {
        console.log(`\n${i + 1}. ${t.dato} - ${t.tekst} (${t.beløp.toFixed(2)} NOK)`);
      });
    } else {
      console.log('\n=== No duplicates found ===');
    }

    // Group by transaction type
    console.log('\n=== Transactions by Type ===');
    const byType = result.transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

    // Calculate total income and expenses
    const income = result.transactions
      .filter(t => t.beløp > 0)
      .reduce((sum, t) => sum + t.beløp, 0);
    
    const expenses = result.transactions
      .filter(t => t.beløp < 0)
      .reduce((sum, t) => sum + Math.abs(t.beløp), 0);

    console.log('\n=== Financial Summary ===');
    console.log(`Total Income: ${income.toFixed(2)} NOK`);
    console.log(`Total Expenses: ${expenses.toFixed(2)} NOK`);
    console.log(`Net: ${(income - expenses).toFixed(2)} NOK`);

  } catch (error) {
    console.error('Error parsing CSV:', error);
    process.exit(1);
  }
}

main();

