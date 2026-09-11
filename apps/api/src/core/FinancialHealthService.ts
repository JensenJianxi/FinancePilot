import type {
  BudgetRecord,
  FinancialHealthScoreDto,
  SavingsGoalRecord,
  SubscriptionRecord,
  TransactionRecord
} from "@finance-pilot/shared";
import { financialHealthScoreDtoSchema } from "@finance-pilot/shared";
import { AppError } from "../lib/errors";
import type { BudgetsRepository } from "../repositories/BudgetsRepository";
import type { FinancialHealthScoresRepository } from "../repositories/FinancialHealthScoresRepository";
import type { SavingsGoalsRepository } from "../repositories/SavingsGoalsRepository";
import type { SubscriptionsRepository } from "../repositories/SubscriptionsRepository";
import type { TransactionsRepository } from "../repositories/TransactionsRepository";

interface FinancialHealthInputs {
  budgets: BudgetRecord[];
  calculatedAt: Date;
  savingsGoals: SavingsGoalRecord[];
  subscriptions: SubscriptionRecord[];
  transactions: TransactionRecord[];
}

type FactorStatus = FinancialHealthScoreDto["factors"][number]["status"];

const factorMaximums = {
  budgetAdherence: 25,
  cashFlow: 35,
  recurringCostLoad: 15,
  savingsProgress: 25
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getPeriodMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

function getFactorStatus(score: number, maxScore: number, hasData: boolean): FactorStatus {
  if (!hasData) {
    return "notEnoughData";
  }

  const percentage = score / maxScore;

  if (percentage >= 0.8) {
    return "strong";
  }

  if (percentage >= 0.6) {
    return "healthy";
  }

  if (percentage >= 0.35) {
    return "watch";
  }

  return "needsAttention";
}

function calculateCashFlowFactor(transactions: TransactionRecord[]) {
  const maxScore = factorMaximums.cashFlow;
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const hasData = income > 0 || expenses > 0;

  if (!hasData) {
    const score = 18;
    return {
      key: "cashFlow" as const,
      label: "Cash flow",
      maxScore,
      score,
      status: getFactorStatus(score, maxScore, false),
      summary: "Add monthly income and expenses to assess cash flow."
    };
  }

  if (income <= 0) {
    return {
      key: "cashFlow" as const,
      label: "Cash flow",
      maxScore,
      score: 0,
      status: "needsAttention" as const,
      summary: "Recorded expenses currently have no matching monthly income."
    };
  }

  const savingsRate = ((income - expenses) / income) * 100;
  const score = savingsRate >= 20
    ? maxScore
    : savingsRate >= 0
      ? Math.round(15 + savingsRate)
      : Math.round(clamp(15 + savingsRate / 2, 0, 15));
  const summary = savingsRate >= 20
    ? "You are retaining at least 20% of monthly income."
    : savingsRate >= 0
      ? "Monthly income covers spending, with room to save more."
      : "Monthly spending is currently above recorded income.";

  return {
    key: "cashFlow" as const,
    label: "Cash flow",
    maxScore,
    score,
    status: getFactorStatus(score, maxScore, true),
    summary
  };
}

function calculateBudgetFactor(
  budgets: BudgetRecord[],
  transactions: TransactionRecord[],
  periodMonth: string
) {
  const maxScore = factorMaximums.budgetAdherence;
  const activeBudgets = budgets.filter((budget) => isBudgetActiveForMonth(budget, periodMonth));
  const overallBudgets = activeBudgets.filter((budget) => (budget.scope ?? "overall") === "overall");
  const currentBudgets = overallBudgets.length ? overallBudgets : activeBudgets;

  if (!currentBudgets.length) {
    const score = 13;
    return {
      key: "budgetAdherence" as const,
      label: "Budgets",
      maxScore,
      score,
      status: getFactorStatus(score, maxScore, false),
      summary: "Create a budget to measure spending against a monthly limit."
    };
  }

  const expenseTotals = new Map<string, number>();
  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const category = transaction.category.trim().toLocaleLowerCase();
      expenseTotals.set(category, (expenseTotals.get(category) ?? 0) + transaction.amount);
    });
  const averageUtilization = currentBudgets.reduce((total, budget) => {
    const scope = budget.scope ?? "overall";
    const category = budget.categoryName?.trim().toLocaleLowerCase() ?? "";
    const spent = scope === "overall" ? totalExpenses : expenseTotals.get(category) ?? 0;
    return total + (spent / budget.limit) * 100;
  }, 0) / currentBudgets.length;
  const score = averageUtilization <= 80
    ? maxScore
    : averageUtilization <= 100
      ? Math.round(25 - (averageUtilization - 80) * 0.25)
      : averageUtilization <= 150
        ? Math.round(20 - (averageUtilization - 100) * 0.4)
        : 0;
  const summary = averageUtilization <= 80
    ? "Current budgets have comfortable room remaining."
    : averageUtilization <= 100
      ? "Current budgets are close to their monthly limits."
      : "One or more budgets need attention this month.";

  return {
    key: "budgetAdherence" as const,
    label: "Budgets",
    maxScore,
    score,
    status: getFactorStatus(score, maxScore, true),
    summary
  };
}

function isBudgetActiveForMonth(budget: BudgetRecord, periodMonth: string) {
  return (
    budget.periodMonth === periodMonth ||
    ((budget.recurrence ?? "monthly") === "monthly" && budget.periodMonth <= periodMonth)
  );
}

function calculateSavingsFactor(savingsGoals: SavingsGoalRecord[]) {
  const maxScore = factorMaximums.savingsProgress;

  if (!savingsGoals.length) {
    const score = 12;
    return {
      key: "savingsProgress" as const,
      label: "Savings",
      maxScore,
      score,
      status: getFactorStatus(score, maxScore, false),
      summary: "Add a savings goal to measure long-term progress."
    };
  }

  const averageProgress = savingsGoals.reduce(
    (total, goal) => total + clamp(goal.currentAmount / goal.targetAmount, 0, 1),
    0
  ) / savingsGoals.length;
  const contributionCoverage = savingsGoals.filter((goal) => goal.monthlyContribution > 0).length /
    savingsGoals.length;
  const score = Math.round(averageProgress * 20 + contributionCoverage * 5);
  const summary = score >= 20
    ? "Savings goals are progressing well."
    : score >= 12
      ? "Savings goals are moving forward."
      : "Savings goals would benefit from more regular contributions.";

  return {
    key: "savingsProgress" as const,
    label: "Savings",
    maxScore,
    score,
    status: getFactorStatus(score, maxScore, true),
    summary
  };
}

function toMonthlySubscriptionAmount(subscription: SubscriptionRecord) {
  switch (subscription.frequency) {
    case "weekly":
      return subscription.amount * 52 / 12;
    case "quarterly":
      return subscription.amount / 3;
    case "yearly":
      return subscription.amount / 12;
    default:
      return subscription.amount;
  }
}

function calculateRecurringCostFactor(
  subscriptions: SubscriptionRecord[],
  transactions: TransactionRecord[]
) {
  const maxScore = factorMaximums.recurringCostLoad;
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active);
  const monthlyCost = activeSubscriptions.reduce(
    (total, subscription) => total + toMonthlySubscriptionAmount(subscription),
    0
  );
  const hasData = income > 0 || activeSubscriptions.length > 0;

  if (!hasData) {
    const score = 8;
    return {
      key: "recurringCostLoad" as const,
      label: "Recurring costs",
      maxScore,
      score,
      status: getFactorStatus(score, maxScore, false),
      summary: "Add income or recurring costs to assess subscription load."
    };
  }

  if (income <= 0) {
    return {
      key: "recurringCostLoad" as const,
      label: "Recurring costs",
      maxScore,
      score: 0,
      status: "needsAttention" as const,
      summary: "Active recurring costs have no matching monthly income."
    };
  }

  const recurringRatio = monthlyCost / income;
  const score = recurringRatio <= 0.1
    ? 15
    : recurringRatio <= 0.2
      ? 12
      : recurringRatio <= 0.3
        ? 8
        : recurringRatio <= 0.4
          ? 4
          : 0;
  const summary = recurringRatio <= 0.1
    ? "Recurring costs are low relative to monthly income."
    : recurringRatio <= 0.3
      ? "Recurring costs are manageable but worth monitoring."
      : "Recurring costs take a large share of monthly income.";

  return {
    key: "recurringCostLoad" as const,
    label: "Recurring costs",
    maxScore,
    score,
    status: getFactorStatus(score, maxScore, true),
    summary
  };
}

export function calculateFinancialHealthScore({
  budgets,
  calculatedAt,
  savingsGoals,
  subscriptions,
  transactions
}: FinancialHealthInputs): FinancialHealthScoreDto {
  const periodMonth = getPeriodMonth(calculatedAt);
  const currentTransactions = transactions.filter(
    (transaction) => transaction.transactionDate.slice(0, 7) === periodMonth
  );
  const currentBudgets = budgets.filter((budget) => isBudgetActiveForMonth(budget, periodMonth));
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active);
  const availableDimensions = [
    currentTransactions.some((transaction) => transaction.type !== "transfer"),
    currentBudgets.length > 0,
    savingsGoals.length > 0,
    activeSubscriptions.length > 0 || currentTransactions.some((transaction) => transaction.type === "income")
  ].filter(Boolean).length;
  const factors = [
    calculateCashFlowFactor(currentTransactions),
    calculateBudgetFactor(currentBudgets, currentTransactions, periodMonth),
    calculateSavingsFactor(savingsGoals),
    calculateRecurringCostFactor(activeSubscriptions, currentTransactions)
  ];
  const score = factors.reduce((total, factor) => total + factor.score, 0);
  const rating = score >= 80
    ? "strong"
    : score >= 65
      ? "steady"
      : score >= 50
        ? "building"
        : "needsAttention";
  const dataStatus = availableDimensions === 4
    ? "complete"
    : availableDimensions > 0
      ? "partial"
      : "limited";

  return financialHealthScoreDtoSchema.parse({
    calculatedAt: calculatedAt.toISOString(),
    dataStatus,
    factors,
    id: "current",
    periodMonth,
    rating,
    score
  });
}

export class FinancialHealthService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly budgetsRepository: BudgetsRepository,
    private readonly savingsGoalsRepository: SavingsGoalsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly scoresRepository: FinancialHealthScoresRepository
  ) {}

  async calculateScore(userId: string, calculatedAt = new Date()) {
    if (!userId.trim()) {
      throw new AppError("Authenticated user is required.", "UNAUTHORIZED", 401);
    }

    const [transactions, budgets, savingsGoals, subscriptions] = await Promise.all([
      this.transactionsRepository.listUserTransactions(userId),
      this.budgetsRepository.listUserBudgets(userId),
      this.savingsGoalsRepository.listUserSavingsGoals(userId),
      this.subscriptionsRepository.listUserSubscriptions(userId)
    ]);
    const score = calculateFinancialHealthScore({
      budgets,
      calculatedAt,
      savingsGoals,
      subscriptions,
      transactions
    });

    await this.scoresRepository.saveLatestScore(userId, score);
    return score;
  }
}
