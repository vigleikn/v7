import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import {
  generateComparableContentHashes,
  generateSoftMatchKey,
  normalizeDateForComparison,
} from '../categoryEngine';

const STORE_SNAPSHOT = '/tmp/store-snapshot-2026-04-06.json';

function toTimestamp(dateStr: string): number {
  if (!dateStr) return 0;
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const [day, month, yearRaw] = parts;
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }
  }
  if (dateStr.includes('-')) return new Date(dateStr).getTime();
  return new Date(dateStr).getTime();
}

interface StoreTx {
  dato: string;
  beløp: number;
  type: string;
  tekst: string;
  fraKonto: string;
  tilKonto: string;
  fraKontonummer?: string;
  tilKontonummer?: string;
  bankId?: string;
  transactionId: string;
  categoryId?: string;
  id: string;
}

function loadStore(): StoreTx[] {
  const raw = fs.readFileSync(STORE_SNAPSHOT, 'utf8');
  return JSON.parse(raw).transactions;
}

describe('Ghost duplicate analysis – proving 170 legacy duplicates', () => {
  const cutoff = toTimestamp('2026-01-01');
  let allTx: StoreTx[];
  let withBankId: StoreTx[];
  let withoutBankId: StoreTx[];

  it('store snapshot exists and can be loaded', () => {
    expect(fs.existsSync(STORE_SNAPSHOT)).toBe(true);
    allTx = loadStore();
    expect(allTx.length).toBeGreaterThan(0);
  });

  it('splits into bankId vs non-bankId sets for 2026', () => {
    allTx = loadStore();
    const since2026 = allTx.filter(t => toTimestamp(t.dato) >= cutoff);
    withBankId = since2026.filter(t => !!t.bankId);
    withoutBankId = since2026.filter(t => !t.bankId);

    expect(since2026.length).toBe(759);
    expect(withoutBankId.length).toBe(170);
    expect(withBankId.length).toBe(589);
  });

  it('content hash matching fails for the 170 against bankId transactions', () => {
    allTx = loadStore();
    const since2026 = allTx.filter(t => toTimestamp(t.dato) >= cutoff);
    withBankId = since2026.filter(t => !!t.bankId);
    withoutBankId = since2026.filter(t => !t.bankId);

    const hashIndex = new Map<string, StoreTx>();
    for (const t of withBankId) {
      for (const hash of generateComparableContentHashes(t)) {
        if (!hashIndex.has(hash)) hashIndex.set(hash, t);
      }
    }

    let hashMatched = 0;
    for (const t of withoutBankId) {
      const hashes = generateComparableContentHashes(t);
      if (hashes.some(h => hashIndex.has(h))) hashMatched++;
    }

    expect(hashMatched).toBeLessThan(withoutBankId.length);
    console.log(`Content hash matched only ${hashMatched} of ${withoutBankId.length}`);
  });

  it('date+amount matching finds near-duplicates for most of the 170', () => {
    allTx = loadStore();
    const since2026 = allTx.filter(t => toTimestamp(t.dato) >= cutoff);
    withBankId = since2026.filter(t => !!t.bankId);
    withoutBankId = since2026.filter(t => !t.bankId);

    const dateAmountIndex = new Map<string, StoreTx[]>();
    for (const t of withBankId) {
      const norm = normalizeDateForComparison(t.dato);
      const key = `${norm}|${t.beløp}`;
      if (!dateAmountIndex.has(key)) dateAmountIndex.set(key, []);
      dateAmountIndex.get(key)!.push(t);
    }

    let dateAmountMatched = 0;
    const unmatched: StoreTx[] = [];

    for (const t of withoutBankId) {
      const norm = normalizeDateForComparison(t.dato);
      const key = `${norm}|${t.beløp}`;
      if (dateAmountIndex.has(key)) {
        dateAmountMatched++;
      } else {
        unmatched.push(t);
      }
    }

    console.log(`Date+amount matched ${dateAmountMatched} of ${withoutBankId.length}`);
    console.log(`Unmatched: ${unmatched.length}`);
    if (unmatched.length > 0) {
      console.log('Sample unmatched:', unmatched.slice(0, 5).map(t =>
        `${t.dato} | ${t.beløp} | ${t.tekst}`
      ));
    }

    expect(dateAmountMatched).toBeGreaterThan(withoutBankId.length * 0.5);
  });

  it('identifies which fields cause content hash mismatch', () => {
    allTx = loadStore();
    const since2026 = allTx.filter(t => toTimestamp(t.dato) >= cutoff);
    withBankId = since2026.filter(t => !!t.bankId);
    withoutBankId = since2026.filter(t => !t.bankId);

    const dateAmountIndex = new Map<string, StoreTx[]>();
    for (const t of withBankId) {
      const norm = normalizeDateForComparison(t.dato);
      const key = `${norm}|${t.beløp}`;
      if (!dateAmountIndex.has(key)) dateAmountIndex.set(key, []);
      dateAmountIndex.get(key)!.push(t);
    }

    const fieldDiffs: Record<string, number> = {
      dato: 0,
      tekst: 0,
      type: 0,
      fraKonto: 0,
      tilKonto: 0,
      multiple: 0,
    };
    let pairsAnalyzed = 0;
    const samples: { legacy: Partial<StoreTx>; excel: Partial<StoreTx>; diffFields: string[] }[] = [];

    for (const legacy of withoutBankId) {
      const norm = normalizeDateForComparison(legacy.dato);
      const key = `${norm}|${legacy.beløp}`;
      const candidates = dateAmountIndex.get(key);
      if (!candidates || candidates.length === 0) continue;

      const best = candidates.reduce((a, b) => {
        const scoreA = (a.tekst === legacy.tekst ? 1 : 0) + (a.type === legacy.type ? 1 : 0);
        const scoreB = (b.tekst === legacy.tekst ? 1 : 0) + (b.type === legacy.type ? 1 : 0);
        return scoreB > scoreA ? b : a;
      });

      pairsAnalyzed++;
      const diffs: string[] = [];
      const normLegacy = normalizeDateForComparison(legacy.dato);
      const normExcel = normalizeDateForComparison(best.dato);
      if (normLegacy !== normExcel) diffs.push('dato');
      if (legacy.tekst !== best.tekst) diffs.push('tekst');
      if (legacy.type !== best.type) diffs.push('type');
      if (legacy.fraKonto !== best.fraKonto) diffs.push('fraKonto');
      if (legacy.tilKonto !== best.tilKonto) diffs.push('tilKonto');

      if (diffs.length > 1) {
        fieldDiffs.multiple++;
      } else if (diffs.length === 1) {
        fieldDiffs[diffs[0]]++;
      }

      if (samples.length < 15 && diffs.length > 0) {
        samples.push({
          legacy: { dato: legacy.dato, tekst: legacy.tekst, type: legacy.type, fraKonto: legacy.fraKonto, tilKonto: legacy.tilKonto },
          excel: { dato: best.dato, tekst: best.tekst, type: best.type, fraKonto: best.fraKonto, tilKonto: best.tilKonto, bankId: best.bankId },
          diffFields: diffs,
        });
      }
    }

    console.log(`\nPairs analyzed (date+amount match): ${pairsAnalyzed}`);
    console.log('Field causing hash mismatch:');
    console.log(`  dato:     ${fieldDiffs.dato}`);
    console.log(`  tekst:    ${fieldDiffs.tekst}`);
    console.log(`  type:     ${fieldDiffs.type}`);
    console.log(`  fraKonto: ${fieldDiffs.fraKonto}`);
    console.log(`  tilKonto: ${fieldDiffs.tilKonto}`);
    console.log(`  multiple: ${fieldDiffs.multiple}`);
    console.log('\nSample mismatches:');
    for (const s of samples) {
      console.log(`  diff=[${s.diffFields.join(',')}]`);
      for (const f of s.diffFields) {
        console.log(`    ${f}: legacy=${JSON.stringify((s.legacy as any)[f])} vs excel=${JSON.stringify((s.excel as any)[f])}`);
      }
    }

    expect(pairsAnalyzed).toBeGreaterThan(0);
    const totalSingleField = fieldDiffs.dato + fieldDiffs.tekst + fieldDiffs.type + fieldDiffs.fraKonto + fieldDiffs.tilKonto;
    expect(totalSingleField + fieldDiffs.multiple).toBeGreaterThan(0);
  });

  it('date+amount+tekst matching narrows down remaining mismatches', () => {
    allTx = loadStore();
    const since2026 = allTx.filter(t => toTimestamp(t.dato) >= cutoff);
    withBankId = since2026.filter(t => !!t.bankId);
    withoutBankId = since2026.filter(t => !t.bankId);

    const index = new Map<string, StoreTx[]>();
    for (const t of withBankId) {
      const norm = normalizeDateForComparison(t.dato);
      const key = `${norm}|${t.beløp}|${t.tekst}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push(t);
    }

    let matched = 0;
    const unmatched: StoreTx[] = [];
    for (const t of withoutBankId) {
      const norm = normalizeDateForComparison(t.dato);
      const key = `${norm}|${t.beløp}|${t.tekst}`;
      if (index.has(key)) {
        matched++;
      } else {
        unmatched.push(t);
      }
    }

    console.log(`\nDate+amount+tekst matched ${matched} of ${withoutBankId.length}`);
    console.log(`Still unmatched: ${unmatched.length}`);
    if (unmatched.length > 0) {
      console.log('Unmatched sample:');
      for (const t of unmatched.slice(0, 10)) {
        console.log(`  ${t.dato} | ${t.beløp} | "${t.tekst}" | type=${t.type} | fra=${t.fraKonto} | til=${t.tilKonto}`);
      }
    }

    expect(matched).toBeGreaterThan(0);
  });

  it('soft-match catches the ghost duplicates that content hash missed', () => {
    allTx = loadStore();
    const since2026 = allTx.filter(t => toTimestamp(t.dato) >= cutoff);
    withBankId = since2026.filter(t => !!t.bankId);
    withoutBankId = since2026.filter(t => !t.bankId);

    // Build soft-match index from bankId transactions
    const softIndex = new Map<string, StoreTx[]>();
    for (const t of withBankId) {
      const key = generateSoftMatchKey(t);
      if (!softIndex.has(key)) softIndex.set(key, []);
      softIndex.get(key)!.push(t);
    }

    // Also build content-hash index
    const hashIndex = new Map<string, StoreTx>();
    for (const t of withBankId) {
      for (const hash of generateComparableContentHashes(t)) {
        if (!hashIndex.has(hash)) hashIndex.set(hash, t);
      }
    }

    let hashMatched = 0;
    let softMatched = 0;
    let totalMatched = 0;
    const stillUnmatched: StoreTx[] = [];

    for (const t of withoutBankId) {
      const hashes = generateComparableContentHashes(t);
      if (hashes.some(h => hashIndex.has(h))) {
        hashMatched++;
        totalMatched++;
        continue;
      }
      const softKey = generateSoftMatchKey(t);
      if (softIndex.has(softKey)) {
        softMatched++;
        totalMatched++;
        continue;
      }
      stillUnmatched.push(t);
    }

    console.log(`\nSoft-match analysis on ${withoutBankId.length} ghosts:`);
    console.log(`  Content hash matched: ${hashMatched}`);
    console.log(`  Soft-match caught:    ${softMatched}`);
    console.log(`  Total matched:        ${totalMatched}`);
    console.log(`  Still unmatched:      ${stillUnmatched.length}`);
    if (stillUnmatched.length > 0) {
      console.log('  Unmatched:');
      for (const t of stillUnmatched.slice(0, 10)) {
        console.log(`    ${t.dato} | ${t.beløp} | "${t.tekst}" | fra=${t.fraKonto} | til=${t.tilKonto}`);
      }
    }

    // Soft-match should catch the vast majority the content hash missed
    expect(totalMatched).toBeGreaterThan(withoutBankId.length * 0.9);
  });
});
