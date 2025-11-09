/**
 * Budget Risk Evaluation Helper
 * Mirrors the Excel IFS logic for monthly budget monitoring.
 */

export type BudgetRiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export interface BudgetRiskInputs {
  plannedIncome: number;
  actualIncome: number;
  plannedSpending: number;
  actualSpending: number;
  today: Date | string;
  daysInMonth?: number;
}

export interface BudgetRiskMetrics {
  missingIncomeAmount: number;
  missingIncomeRatio: number;
  monthProgressRatio: number;
  remainingPlannedSpending: number;
  spendingRate: number;
}

export interface BudgetRiskResult extends BudgetRiskMetrics {
  riskLevel: BudgetRiskLevel;
}

const clamp = (value: number): number => (Number.isNaN(value) ? 0 : value);

const ensureDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date supplied to evaluateBudgetRisk: "${value}"`);
  }
  return parsed;
};

const calculateDaysInMonth = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

const roundTwo = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 1e6) / 1e6;

/**
 * Evaluate the budget risk level for the current month.
 * @param inputs Raw inputs mirroring the spreadsheet values.
 */
export function evaluateBudgetRisk(inputs: BudgetRiskInputs): BudgetRiskResult {
  const {
    plannedIncome,
    actualIncome,
    plannedSpending,
    actualSpending,
    today,
    daysInMonth,
  } = inputs;

  const safePlannedIncome = clamp(plannedIncome);
  const safeActualIncome = clamp(actualIncome);
  const safePlannedSpending = clamp(plannedSpending);
  const safeActualSpending = clamp(actualSpending);

  const date = ensureDate(today);
  const totalDays = daysInMonth ?? calculateDaysInMonth(date);
  if (totalDays <= 0) {
    throw new Error('Days in month must be greater than zero');
  }

  const currentDay = Math.min(Math.max(date.getDate(), 1), totalDays);

  const missingIncomeAmount = Math.max(safePlannedIncome - safeActualIncome, 0);
  const missingIncomeRatio =
    safePlannedIncome > 0 ? missingIncomeAmount / safePlannedIncome : 0;

  const monthProgressRatio = currentDay / totalDays;
  const remainingPlannedSpending = Math.max(
    safePlannedSpending - safeActualSpending,
    0
  );
  const spendingRate =
    safePlannedSpending > 0 ? safeActualSpending / safePlannedSpending : 0;

  const metrics: BudgetRiskMetrics = {
    missingIncomeAmount: roundTwo(missingIncomeAmount),
    missingIncomeRatio: roundTwo(missingIncomeRatio),
    monthProgressRatio: roundTwo(monthProgressRatio),
    remainingPlannedSpending: roundTwo(remainingPlannedSpending),
    spendingRate: roundTwo(spendingRate),
  };

  const riskLevel = determineRiskLevel(metrics);

  return { ...metrics, riskLevel };
}

const determineRiskLevel = ({
  missingIncomeAmount,
  missingIncomeRatio,
  monthProgressRatio,
  remainingPlannedSpending,
  spendingRate,
}: BudgetRiskMetrics): BudgetRiskLevel => {
  if (remainingPlannedSpending === 0 && missingIncomeAmount > 0) {
    return 'Very High';
  }

  if (spendingRate > monthProgressRatio + 0.2) {
    return 'High';
  }

  if (missingIncomeRatio <= 0.2) {
    return 'Low';
  }

  if (missingIncomeRatio <= 0.5) {
    if (monthProgressRatio > 0.7) {
      return 'High';
    }
    return 'Medium';
  }

  if (monthProgressRatio <= 0.3) {
    return 'Medium';
  }
  if (monthProgressRatio <= 0.7) {
    return 'High';
  }
  return 'Very High';
};


