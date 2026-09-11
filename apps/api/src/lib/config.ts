export type FinancePilotStage = "dev" | "prod";

export interface ApiRuntimeConfig {
  allowedOrigins: string[];
  apiName: string;
  budgetsTable: string;
  categoriesTable: string;
  financialHealthScoresTable: string;
  port: number;
  savingsGoalsTable: string;
  settingsTable: string;
  stage: FinancePilotStage;
  subscriptionsTable: string;
  transactionsTable: string;
}

export type FinancialHealthRuntimeConfig = ApiRuntimeConfig;

export function resolveApiRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env
): ApiRuntimeConfig {
  const rawStage = environment.FINANCE_PILOT_STAGE === "prod" ? "prod" : "dev";
  const port = Number(environment.PORT ?? 4000);
  const allowedOrigins = (environment.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const budgetsTable =
    environment.BUDGETS_TABLE ?? `FinancePilotBudgets-${rawStage}`;
  const categoriesTable =
    environment.CATEGORIES_TABLE ?? `FinancePilotCategories-${rawStage}`;
  const financialHealthScoresTable =
    environment.HEALTH_SCORES_TABLE ?? "FinancePilotFinancialHealthScores";
  const settingsTable =
    environment.SETTINGS_TABLE ?? `FinancePilotSettings`;
  const savingsGoalsTable =
    environment.SAVINGS_GOALS_TABLE ?? "FinancePilotSavingsGoals";
  const subscriptionsTable =
    environment.SUBSCRIPTIONS_TABLE ?? "FinancePilotSubscriptions";
  const transactionsTable =
    environment.TRANSACTIONS_TABLE ?? `FinancePilotTransactions-${rawStage}`;

  return {
    allowedOrigins,
    apiName: `financepilot-${rawStage}-local-api`,
    budgetsTable,
    categoriesTable,
    financialHealthScoresTable,
    port,
    savingsGoalsTable,
    settingsTable,
    stage: rawStage,
    subscriptionsTable,
    transactionsTable
  };
}

export function resolveFinancialHealthRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env
): FinancialHealthRuntimeConfig {
  const config = resolveApiRuntimeConfig(environment);

  return {
    ...config,
    budgetsTable: environment.BUDGETS_TABLE?.trim() || "FinancePilotBudgets",
    financialHealthScoresTable:
      environment.HEALTH_SCORES_TABLE?.trim() || "FinancePilotFinancialHealthScores",
    savingsGoalsTable:
      environment.SAVINGS_GOALS_TABLE?.trim() || "FinancePilotSavingsGoals",
    subscriptionsTable:
      environment.SUBSCRIPTIONS_TABLE?.trim() || "FinancePilotSubscriptions",
    transactionsTable:
      environment.TRANSACTIONS_TABLE?.trim() || "FinancePilotTransactions"
  };
}
