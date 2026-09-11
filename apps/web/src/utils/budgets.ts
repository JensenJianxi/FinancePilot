import type { Budget, Transaction } from "@finance-pilot/shared";
import { getCurrentMonthKey } from "./transactions";

export function calculateBudgetTrend(spent: number, limit: number): Budget["trend"] {
  if (limit <= 0) {
    return "healthy";
  }

  const ratio = spent / limit;

  if (ratio >= 1) {
    return "over";
  }

  if (ratio >= 0.8) {
    return "watch";
  }

  return "healthy";
}

export function isBudgetActiveForMonth(budget: Budget, periodMonth: string) {
  return (
    budget.periodMonth === periodMonth ||
    (budget.recurrence === "monthly" && budget.periodMonth <= periodMonth)
  );
}

export function getBudgetEffectiveMonth(budget: Budget, currentMonth = getCurrentMonthKey()) {
  return budget.recurrence === "monthly" && budget.periodMonth <= currentMonth
    ? currentMonth
    : budget.periodMonth;
}

export function calculateBudgetSpend(
  budget: Budget,
  transactions: Transaction[],
  currentMonth = getCurrentMonthKey()
) {
  const effectiveMonth = getBudgetEffectiveMonth(budget, currentMonth);

  return transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.date.startsWith(effectiveMonth) &&
        ((budget.scope ?? "overall") === "overall" || transaction.category === budget.category)
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function enrichBudgetsWithTransactions(
  budgets: Budget[],
  transactions: Transaction[],
  currentMonth = getCurrentMonthKey()
): Budget[] {
  return budgets.filter((budget) => isBudgetActiveForMonth(budget, currentMonth)).map((budget) => {
    const spent = calculateBudgetSpend(budget, transactions, currentMonth);

    return {
      ...budget,
      spent,
      trend: calculateBudgetTrend(spent, budget.limit)
    };
  });
}
