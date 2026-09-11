import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiRuntimeConfig, resolveFinancialHealthRuntimeConfig } from "./config";

test("resolveApiRuntimeConfig falls back to the local dev defaults", () => {
  const config = resolveApiRuntimeConfig({});

  assert.deepEqual(config.allowedOrigins, ["http://localhost:5173"]);
  assert.equal(config.stage, "dev");
  assert.equal(config.port, 4000);
  assert.equal(config.budgetsTable, "FinancePilotBudgets-dev");
  assert.equal(config.categoriesTable, "FinancePilotCategories-dev");
  assert.equal(config.financialHealthScoresTable, "FinancePilotFinancialHealthScores");
  assert.equal(config.savingsGoalsTable, "FinancePilotSavingsGoals");
  assert.equal(config.settingsTable, "FinancePilotSettings");
  assert.equal(config.subscriptionsTable, "FinancePilotSubscriptions");
  assert.equal(config.transactionsTable, "FinancePilotTransactions-dev");
});

test("resolveApiRuntimeConfig accepts the prod stage and custom port", () => {
  const config = resolveApiRuntimeConfig({
    ALLOWED_ORIGINS: "http://localhost:5173,https://d3q58tmz0hee61.cloudfront.net",
    BUDGETS_TABLE: "FinancePilotBudgets-prod",
    CATEGORIES_TABLE: "FinancePilotCategories-prod",
    FINANCE_PILOT_STAGE: "prod",
    HEALTH_SCORES_TABLE: "FinancePilotFinancialHealthScores-prod",
    PORT: "5050",
    SAVINGS_GOALS_TABLE: "FinancePilotSavingsGoals-prod",
    SETTINGS_TABLE: "FinancePilotSettings-prod",
    SUBSCRIPTIONS_TABLE: "FinancePilotSubscriptions-prod",
    TRANSACTIONS_TABLE: "FinancePilotTransactions-prod"
  });

  assert.deepEqual(config.allowedOrigins, [
    "http://localhost:5173",
    "https://d3q58tmz0hee61.cloudfront.net"
  ]);
  assert.equal(config.stage, "prod");
  assert.equal(config.port, 5050);
  assert.equal(config.budgetsTable, "FinancePilotBudgets-prod");
  assert.equal(config.categoriesTable, "FinancePilotCategories-prod");
  assert.equal(config.financialHealthScoresTable, "FinancePilotFinancialHealthScores-prod");
  assert.equal(config.savingsGoalsTable, "FinancePilotSavingsGoals-prod");
  assert.equal(config.settingsTable, "FinancePilotSettings-prod");
  assert.equal(config.subscriptionsTable, "FinancePilotSubscriptions-prod");
  assert.equal(config.transactionsTable, "FinancePilotTransactions-prod");
});

test("resolveFinancialHealthRuntimeConfig uses the confirmed production table names", () => {
  const config = resolveFinancialHealthRuntimeConfig({});

  assert.equal(config.transactionsTable, "FinancePilotTransactions");
  assert.equal(config.budgetsTable, "FinancePilotBudgets");
  assert.equal(config.savingsGoalsTable, "FinancePilotSavingsGoals");
  assert.equal(config.subscriptionsTable, "FinancePilotSubscriptions");
  assert.equal(config.financialHealthScoresTable, "FinancePilotFinancialHealthScores");
});
