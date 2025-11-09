import { evaluateBudgetRisk } from '../services/budgetRisk';

const scenarios = [
  {
    name: 'Baseline example (Medium risk)',
    input: {
      plannedIncome: 200_000,
      actualIncome: 90_000,
      plannedSpending: 90_000,
      actualSpending: 20_000,
      today: '2025-11-09',
      daysInMonth: 30,
    },
    expected: 'Medium',
  },
  {
    name: 'Low risk (income almost complete, early month)',
    input: {
      plannedIncome: 100_000,
      actualIncome: 90_000,
      plannedSpending: 80_000,
      actualSpending: 10_000,
      today: '2025-11-05',
      daysInMonth: 30,
    },
    expected: 'Low',
  },
  {
    name: 'High risk (spending significantly ahead of progress)',
    input: {
      plannedIncome: 150_000,
      actualIncome: 60_000,
      plannedSpending: 100_000,
      actualSpending: 70_000,
      today: '2025-11-10',
      daysInMonth: 30,
    },
    expected: 'High',
  },
  {
    name: 'Very High risk (late month, income missing)',
    input: {
      plannedIncome: 120_000,
      actualIncome: 40_000,
      plannedSpending: 120_000,
      actualSpending: 110_000,
      today: '2025-11-28',
      daysInMonth: 30,
    },
    expected: 'Very High',
  },
];

let allPassed = true;

scenarios.forEach(({ name, input, expected }) => {
  const result = evaluateBudgetRisk(input);
  const passed = result.riskLevel === expected;

  if (!passed) {
    allPassed = false;
    console.error(
      `[FAIL] ${name} -> expected ${expected}, got ${result.riskLevel}`,
      result
    );
  } else {
    console.log(`[PASS] ${name}`, result);
  }
});

if (!allPassed) {
  process.exitCode = 1;
  console.error('Budget risk test failed.');
} else {
  console.log('All budget risk scenarios passed.');
}


