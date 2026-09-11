import assert from "node:assert/strict";
import test from "node:test";
import type {
  BudgetRecord,
  FinancialHealthScoreDto,
  FinancialHealthScoreRecord,
  SavingsGoalRecord,
  SubscriptionRecord,
  TransactionRecord
} from "@finance-pilot/shared";
import { calculateFinancialHealthScore, FinancialHealthService } from "./FinancialHealthService";

const calculatedAt = new Date("2026-08-28T08:00:00.000Z");
const timestamp = calculatedAt.toISOString();

function createTransaction(
  transactionId: string,
  type: TransactionRecord["type"],
  amount: number,
  category: string,
  transactionDate = "2026-08-20"
): TransactionRecord {
  return {
    amount,
    category,
    createdAt: timestamp,
    entityType: "transaction",
    paymentMethod: "Card",
    title: transactionId,
    transactionDate,
    transactionId,
    type,
    updatedAt: timestamp,
    userId: "user-1",
    version: 1
  };
}

const budget: BudgetRecord = {
  budgetId: "budget-1",
  categoryId: "bills",
  categoryName: "Bills",
  createdAt: timestamp,
  entityType: "budget",
  limit: 1000,
  ownerUserId: "user-1",
  periodMonth: "2026-08",
  recurrence: "once",
  scope: "category",
  spent: 0,
  trend: "healthy",
  updatedAt: timestamp,
  userId: "user-1",
  version: 1
};

const goal: SavingsGoalRecord = {
  createdAt: timestamp,
  currentAmount: 5000,
  deadline: "2027-08-01",
  entityType: "savingsGoal",
  goalId: "goal-1",
  monthlyContribution: 500,
  name: "Emergency fund",
  ownerUserId: "user-1",
  targetAmount: 10000,
  updatedAt: timestamp,
  userId: "user-1",
  version: 1
};

const subscription: SubscriptionRecord = {
  active: true,
  amount: 100,
  autoCreateTransaction: false,
  categoryId: "bills",
  categoryName: "Bills",
  createdAt: timestamp,
  entityType: "subscription",
  frequency: "monthly",
  name: "Streaming",
  nextPaymentDate: "2026-09-01",
  paymentMethod: "Card",
  subscriptionId: "subscription-1",
  updatedAt: timestamp,
  userId: "user-1",
  version: 1
};

test("calculateFinancialHealthScore produces a strong explainable score", () => {
  const result = calculateFinancialHealthScore({
    budgets: [budget],
    calculatedAt,
    savingsGoals: [goal],
    subscriptions: [subscription],
    transactions: [
      createTransaction("income-1", "income", 5000, "Salary"),
      createTransaction("expense-1", "expense", 500, "Bills"),
      createTransaction("expense-2", "expense", 2000, "Food")
    ]
  });

  assert.equal(result.score, 90);
  assert.equal(result.rating, "strong");
  assert.equal(result.dataStatus, "complete");
  assert.equal(result.factors.length, 4);
  assert.deepEqual(result.factors.map((factor) => factor.score), [35, 25, 15, 15]);
});

test("calculateFinancialHealthScore uses a clearly marked neutral baseline with no data", () => {
  const result = calculateFinancialHealthScore({
    budgets: [],
    calculatedAt,
    savingsGoals: [],
    subscriptions: [],
    transactions: []
  });

  assert.equal(result.score, 51);
  assert.equal(result.rating, "building");
  assert.equal(result.dataStatus, "limited");
  assert.ok(result.factors.every((factor) => factor.status === "notEnoughData"));
});

test("a recurring overall budget scores total spending in later months", () => {
  const recurringBudget: BudgetRecord = {
    ...budget,
    categoryId: undefined,
    categoryName: undefined,
    recurrence: "monthly",
    scope: "overall"
  };
  const result = calculateFinancialHealthScore({
    budgets: [recurringBudget],
    calculatedAt: new Date("2026-09-28T08:00:00.000Z"),
    savingsGoals: [],
    subscriptions: [],
    transactions: [
      createTransaction("income-september", "income", 5000, "Salary", "2026-09-01"),
      createTransaction("food-september", "expense", 500, "Food", "2026-09-15")
    ]
  });

  assert.equal(result.factors.find((factor) => factor.key === "budgetAdherence")?.score, 25);
});

test("a legacy budget without recurrence rolls into the current month", () => {
  const legacyBudget: BudgetRecord = {
    ...budget,
    categoryId: undefined,
    categoryName: undefined,
    recurrence: undefined,
    scope: "overall"
  };
  const result = calculateFinancialHealthScore({
    budgets: [legacyBudget],
    calculatedAt: new Date("2026-09-03T08:00:00.000Z"),
    savingsGoals: [],
    subscriptions: [],
    transactions: [
      createTransaction("september-expense", "expense", 250, "Food", "2026-09-02")
    ]
  });

  assert.equal(result.factors.find((factor) => factor.key === "budgetAdherence")?.score, 25);
});

test("a legacy budget without scope is treated as an overall spending limit", () => {
  const legacyBudget: BudgetRecord = {
    ...budget,
    scope: undefined
  };
  const result = calculateFinancialHealthScore({
    budgets: [legacyBudget],
    calculatedAt,
    savingsGoals: [],
    subscriptions: [],
    transactions: [
      createTransaction("bills", "expense", 100, "Bills"),
      createTransaction("food", "expense", 1000, "Food")
    ]
  });

  assert.equal(result.factors.find((factor) => factor.key === "budgetAdherence")?.score, 16);
});

test("FinancialHealthService scopes every repository call to the authenticated user", async () => {
  const requestedUserIds: string[] = [];
  let savedScore: FinancialHealthScoreDto | null = null;
  const service = new FinancialHealthService(
    {
      createTransaction: async () => { throw new Error("not used"); },
      deleteTransaction: async () => false,
      getTransaction: async () => null,
      listUserTransactions: async (userId) => {
        requestedUserIds.push(userId);
        return [createTransaction("income-1", "income", 5000, "Salary")];
      },
      updateTransaction: async () => null
    },
    {
      createBudget: async () => { throw new Error("not used"); },
      deleteBudget: async () => false,
      getBudget: async () => null,
      listUserBudgets: async (userId) => {
        requestedUserIds.push(userId);
        return [budget];
      },
      updateBudget: async () => null
    },
    {
      createSavingsGoal: async () => { throw new Error("not used"); },
      deleteSavingsGoal: async () => false,
      getSavingsGoal: async () => null,
      listUserSavingsGoals: async (userId) => {
        requestedUserIds.push(userId);
        return [goal];
      },
      updateSavingsGoal: async () => null
    },
    {
      createSubscription: async () => { throw new Error("not used"); },
      deleteSubscription: async () => false,
      getSubscription: async () => null,
      listUserSubscriptions: async (userId) => {
        requestedUserIds.push(userId);
        return [subscription];
      },
      updateSubscription: async () => null
    },
    {
      saveLatestScore: async (userId, score): Promise<FinancialHealthScoreRecord> => {
        requestedUserIds.push(userId);
        savedScore = score;
        return {
          ...score,
          createdAt: score.calculatedAt,
          entityType: "financialHealthScore",
          ownerUserId: userId,
          scoreId: score.id,
          updatedAt: score.calculatedAt,
          userId,
          version: 1
        };
      }
    }
  );

  const result = await service.calculateScore("cognito-user-sub", calculatedAt);

  assert.deepEqual(requestedUserIds, Array(5).fill("cognito-user-sub"));
  assert.deepEqual(savedScore, result);
});
