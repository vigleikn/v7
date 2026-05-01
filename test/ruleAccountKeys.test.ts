import { describe, it, expect } from 'vitest';
import {
  setRule,
  applyRules,
  buildRuleKey,
  findApplicableRule,
  migrateRulesMapFromPersist,
  type CategoryRule,
} from '../categoryEngine';
import type { Transaction } from '../csvParser';

const catA = 'cat_a';
const catB = 'cat_b';
const now = new Date();

describe('Rule keys: account-specific vs legacy tekst', () => {
  it('specific rule wins over legacy when both kontonummer are set', () => {
    const tekst = 'nedbetaling lån';
    let rules = new Map<string, CategoryRule>();
    rules = setRule(rules, tekst, catA);
    rules = setRule(rules, tekst, catB, {
      fraKontonummer: '3610.61.63531',
      tilKontonummer: '3621.29.21011',
    });

    expect(rules.size).toBe(2);

    const txSpecific: Transaction = {
      dato: '28.03.26',
      beløp: -100,
      tilKonto: 'B',
      tilKontonummer: '3621.29.21011',
      fraKonto: 'V',
      fraKontonummer: '3610.61.63531',
      type: 'Betaling',
      tekst,
      underkategori: '',
    };
    const txOtherDirection: Transaction = {
      ...txSpecific,
      fraKontonummer: '3621.29.21011',
      tilKontonummer: '3610.61.63531',
    };

    const r1 = findApplicableRule(rules, txSpecific);
    const r2 = findApplicableRule(rules, txOtherDirection);

    expect(r1?.categoryId).toBe(catB);
    expect(r2?.categoryId).toBe(catA);
  });

  it('falls back to legacy tekst-only rule when no specific match', () => {
    let rules = new Map<string, CategoryRule>();
    rules = setRule(rules, 'kiwi', catA);

    const tx: Transaction = {
      dato: '2025-01-01',
      beløp: -50,
      tilKonto: '',
      tilKontonummer: '',
      fraKonto: 'Main',
      fraKontonummer: '',
      type: 'Betaling',
      tekst: 'KIWI',
      underkategori: '',
    };

    const { categorized } = applyRules([tx], {
      rules,
      locks: new Map(),
      categories: new Map(),
    });
    expect(categorized[0]?.categoryId).toBe(catA);
  });

  it('migrateRulesMapFromPersist fills missing ruleKey from map key', () => {
    const legacy = new Map<string, CategoryRule>([
      [
        'kiwi',
        {
          tekst: 'kiwi',
          categoryId: catA,
          createdAt: now,
          updatedAt: now,
        } as CategoryRule,
      ],
    ]);
    const migrated = migrateRulesMapFromPersist(legacy);
    const rule = migrated.get('kiwi')!;
    expect(rule.ruleKey).toBe('kiwi');
    expect(rule.tekst).toBe('kiwi');
  });

  it('buildRuleKey uses legacy key when either kontonummer is missing', () => {
    expect(buildRuleKey('X', '1', '')).toBe('x');
    expect(buildRuleKey('X', '', '2')).toBe('x');
  });
});
