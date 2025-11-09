## Budget Risk Helper (WIP Integration)

- Logic lives in `services/budgetRisk.ts`.
- Accepts raw monthly planning numbers (planned/actual income & spending, date, optional days in month) and mirrors the spreadsheet IFS rules to return `Low` / `Medium` / `High` / `Very High`.
- Temporary test harness: run `npx tsx dev/budgetRiskTest.ts` to exercise baseline scenarios.
- UI hookup is pending; plan to surface risk level plus derived metrics once budget overview widgets are designed.


