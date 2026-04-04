import * as XLSX from 'xlsx';
import type { Transaction, ParseResult } from './csvParser';

const COLUMN_MAP: Record<string, keyof Transaction> = {
  'Dato': 'dato',
  'Beløp': 'beløp',
  'Originalt Beløp': 'originaltBeløp',
  'Original Valuta': 'originalValuta',
  'Type': 'type',
  'Tekst': 'tekst',
  'KID': 'kid',
  'Hovedkategori': 'hovedkategori',
  'Underkategori': 'underkategori',
  'Id': 'bankId',
};

const ACCOUNT_COLUMN_MAP: Record<string, string> = {
  'Konto': 'fraKonto',
  'Kontonummer': 'fraKontonummer',
  'Motkonto': 'tilKonto',
  'Motkontonummer': 'tilKontonummer',
};

function normalizeDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    const d = value.getDate().toString().padStart(2, '0');
    const m = (value.getMonth() + 1).toString().padStart(2, '0');
    const y = value.getFullYear();
    return `${d}.${m}.${y}`;
  }
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    const d = date.d.toString().padStart(2, '0');
    const m = date.m.toString().padStart(2, '0');
    return `${d}.${m}.${date.y}`;
  }
  return String(value);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (rows.length === 0) {
    throw new Error('Excel-filen er tom');
  }

  const headers = Object.keys(rows[0]);
  const requiredColumns = ['Dato', 'Beløp', 'Tekst', 'Type', 'Id'];
  const missing = requiredColumns.filter(c => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(`Mangler påkrevde kolonner: ${missing.join(', ')}`);
  }

  const transactions: Transaction[] = rows.map(row => {
    const tx: Transaction = {
      dato: normalizeDate(row['Dato']),
      beløp: toNumber(row['Beløp']),
      type: String(row['Type'] ?? '').trim(),
      tekst: String(row['Tekst'] ?? '').trim(),
      underkategori: String(row['Underkategori'] ?? '').trim(),
      tilKonto: String(row['Motkonto'] ?? '').trim(),
      tilKontonummer: String(row['Motkontonummer'] ?? '').trim(),
      fraKonto: String(row['Konto'] ?? '').trim(),
      fraKontonummer: String(row['Kontonummer'] ?? '').trim(),
      bankId: String(row['Id'] ?? '').trim() || undefined,
    };

    if (row['Originalt Beløp'] !== undefined && row['Originalt Beløp'] !== '') {
      tx.originaltBeløp = toNumber(row['Originalt Beløp']);
    }
    if (row['Original Valuta'] !== undefined && row['Original Valuta'] !== '') {
      tx.originalValuta = String(row['Original Valuta']).trim();
    }
    if (row['KID'] !== undefined && row['KID'] !== '') {
      tx.kid = String(row['KID']).trim();
    }
    if (row['Hovedkategori'] !== undefined && row['Hovedkategori'] !== '') {
      tx.hovedkategori = String(row['Hovedkategori']).trim();
    }

    return tx;
  });

  return {
    transactions,
    originalCount: transactions.length,
  };
}
