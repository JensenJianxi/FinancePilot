import type { z } from "zod";
import type {
  apiErrorDtoSchema,
  budgetDtoSchema,
  categoryDtoSchema,
  categorySpendDtoSchema,
  createBudgetInputDtoSchema,
  createCategoryInputDtoSchema,
  createSavingsGoalInputDtoSchema,
  createSettingsInputDtoSchema,
  createSubscriptionInputDtoSchema,
  createTransactionInputDtoSchema,
  createTransactionRequestDtoSchema,
  dashboardSummaryDtoSchema,
  financeAnalyticsDtoSchema,
  financeWorkspaceSnapshotDtoSchema,
  financialHealthScoreDtoSchema,
  listTransactionsQueryDtoSchema,
  notificationDtoSchema,
  savingsGoalDtoSchema,
  scorePointDtoSchema,
  settingsDtoSchema,
  subscriptionDtoSchema,
  transactionDtoSchema,
  transactionApiDtoSchema,
  updateBudgetInputDtoSchema,
  updateCategoryInputDtoSchema,
  updateSavingsGoalInputDtoSchema,
  updateSettingsInputDtoSchema,
  updateSubscriptionInputDtoSchema,
  updateTransactionInputDtoSchema,
  updateTransactionRequestDtoSchema,
  userDtoSchema,
  analyticsPointDtoSchema
} from "../schemas/api";

export type UserDto = z.infer<typeof userDtoSchema>;
export type TransactionDto = z.infer<typeof transactionDtoSchema>;
export type CategoryDto = z.infer<typeof categoryDtoSchema>;
export type SettingsDto = z.infer<typeof settingsDtoSchema>;
export type BudgetDto = z.infer<typeof budgetDtoSchema>;
export type SavingsGoalDto = z.infer<typeof savingsGoalDtoSchema>;
export type SubscriptionDto = z.infer<typeof subscriptionDtoSchema>;
export type NotificationDto = z.infer<typeof notificationDtoSchema>;
export type FinancialHealthScoreDto = z.infer<typeof financialHealthScoreDtoSchema>;
export type DashboardSummaryDto = z.infer<typeof dashboardSummaryDtoSchema>;
export type AnalyticsPointDto = z.infer<typeof analyticsPointDtoSchema>;
export type ScorePointDto = z.infer<typeof scorePointDtoSchema>;
export type CategorySpendDto = z.infer<typeof categorySpendDtoSchema>;
export type FinanceAnalyticsDto = z.infer<typeof financeAnalyticsDtoSchema>;
export type FinanceWorkspaceSnapshotDto = z.infer<typeof financeWorkspaceSnapshotDtoSchema>;
export type ListTransactionsQueryDto = z.infer<typeof listTransactionsQueryDtoSchema>;
export type CreateTransactionInputDto = z.infer<typeof createTransactionInputDtoSchema>;
export type UpdateTransactionInputDto = z.infer<typeof updateTransactionInputDtoSchema>;
export type TransactionApiDto = z.infer<typeof transactionApiDtoSchema>;
export type CreateTransactionRequestDto = z.infer<typeof createTransactionRequestDtoSchema>;
export type UpdateTransactionRequestDto = z.infer<typeof updateTransactionRequestDtoSchema>;
export type CreateCategoryInputDto = z.infer<typeof createCategoryInputDtoSchema>;
export type UpdateCategoryInputDto = z.infer<typeof updateCategoryInputDtoSchema>;
export type CreateBudgetInputDto = z.infer<typeof createBudgetInputDtoSchema>;
export type UpdateBudgetInputDto = z.infer<typeof updateBudgetInputDtoSchema>;
export type CreateSettingsInputDto = z.infer<typeof createSettingsInputDtoSchema>;
export type UpdateSettingsInputDto = z.infer<typeof updateSettingsInputDtoSchema>;
export type CreateSavingsGoalInputDto = z.infer<typeof createSavingsGoalInputDtoSchema>;
export type UpdateSavingsGoalInputDto = z.infer<typeof updateSavingsGoalInputDtoSchema>;
export type CreateSubscriptionInputDto = z.infer<typeof createSubscriptionInputDtoSchema>;
export type UpdateSubscriptionInputDto = z.infer<typeof updateSubscriptionInputDtoSchema>;
export type ApiErrorDto = z.infer<typeof apiErrorDtoSchema>;
