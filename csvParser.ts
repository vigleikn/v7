/**
 * CSV Parser for transactions with duplicate detection
 * Parses Norwegian bank transaction CSV files
 */

export interface Transaction {
  dato: string;
  beløp: number;
  tilKonto: string;
  tilKontonummer: string;
  fraKonto: string;
  fraKontonummer: string;
  type: string;
  tekst: string;
  underkategori: string;
  // Additional fields from the actual CSV
  originaltBeløp?: number;
  originalValuta?: string;
  kid?: string;
  hovedkategori?: string;
}

export interface ParseResult {
  transactions: Transaction[];
  duplicates: Transaction[];
  originalCount: number;
  uniqueCount: number;
}

/**
 * Parses a Norwegian number format (1.234,56) to a JavaScript number
 */
function parseNorwegianNumber(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove spaces and replace comma with dot
  return parseFloat(value.replace(/\s/g, '').replace(',', '.'));
}

/**
 * Generates a unique hash for a transaction to detect duplicates
 * Based on: date, amount, type, and text (key identifying fields)
 */
function generateTransactionHash(transaction: Transaction): string {
  return `${transaction.dato}|${transaction.beløp}|${transaction.type}|${transaction.tekst}|${transaction.fraKonto}|${transaction.tilKonto}`;
}

/**
 * Parses CSV content and returns transactions with duplicate detection
 */
export function parseCSV(csvContent: string): ParseResult {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const header = lines[0].split(';').map(h => h.trim());
  
  // Verify required columns exist
  const requiredColumns = ['Dato', 'Beløp', 'Til konto', 'Til kontonummer', 'Fra konto', 'Fra kontonummer', 'Type', 'Tekst', 'Underkategori'];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Get column indices
  const indices = {
    dato: header.indexOf('Dato'),
    beløp: header.indexOf('Beløp'),
    originaltBeløp: header.indexOf('Originalt Beløp'),
    originalValuta: header.indexOf('Original Valuta'),
    tilKonto: header.indexOf('Til konto'),
    tilKontonummer: header.indexOf('Til kontonummer'),
    fraKonto: header.indexOf('Fra konto'),
    fraKontonummer: header.indexOf('Fra kontonummer'),
    type: header.indexOf('Type'),
    tekst: header.indexOf('Tekst'),
    kid: header.indexOf('KID'),
    hovedkategori: header.indexOf('Hovedkategori'),
    underkategori: header.indexOf('Underkategori'),
  };

  const allTransactions: Transaction[] = [];
  const duplicates: Transaction[] = [];
  const seenHashes = new Set<string>();

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const columns = line.split(';');

    const transaction: Transaction = {
      dato: columns[indices.dato]?.trim() || '',
      beløp: parseNorwegianNumber(columns[indices.beløp]),
      tilKonto: columns[indices.tilKonto]?.trim() || '',
      tilKontonummer: columns[indices.tilKontonummer]?.trim() || '',
      fraKonto: columns[indices.fraKonto]?.trim() || '',
      fraKontonummer: columns[indices.fraKontonummer]?.trim() || '',
      type: columns[indices.type]?.trim() || '',
      tekst: columns[indices.tekst]?.trim() || '',
      underkategori: columns[indices.underkategori]?.trim() || '',
    };

    // Add optional fields if they exist
    if (indices.originaltBeløp !== -1) {
      transaction.originaltBeløp = parseNorwegianNumber(columns[indices.originaltBeløp]);
    }
    if (indices.originalValuta !== -1) {
      transaction.originalValuta = columns[indices.originalValuta]?.trim() || '';
    }
    if (indices.kid !== -1) {
      transaction.kid = columns[indices.kid]?.trim() || '';
    }
    if (indices.hovedkategori !== -1) {
      transaction.hovedkategori = columns[indices.hovedkategori]?.trim() || '';
    }

    // Check for duplicates
    const hash = generateTransactionHash(transaction);
    if (seenHashes.has(hash)) {
      duplicates.push(transaction);
    } else {
      seenHashes.add(hash);
      allTransactions.push(transaction);
    }
  }

  return {
    transactions: allTransactions,
    duplicates,
    originalCount: allTransactions.length + duplicates.length,
    uniqueCount: allTransactions.length,
  };
}

/**
 * Parses CSV from a file path (Node.js environment)
 */
export async function parseCSVFile(filePath: string): Promise<ParseResult> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseCSV(content);
}

/**
 * Exports transactions to CSV format
 */
export function exportToCSV(transactions: Transaction[]): string {
  const header = 'Dato;Beløp;Til konto;Til kontonummer;Fra konto;Fra kontonummer;Type;Tekst;Underkategori';
  const rows = transactions.map(t => {
    const beløp = t.beløp.toFixed(2).replace('.', ',');
    return `${t.dato};${beløp};${t.tilKonto};${t.tilKontonummer};${t.fraKonto};${t.fraKontonummer};${t.type};${t.tekst};${t.underkategori}`;
  });
  
  return [header, ...rows].join('\n');
}

