import type { z } from "zod";
import type {
  budgetEntitySchema,
  categoryEntitySchema,
  financialHealthScoreEntitySchema,
  notificationEntitySchema,
  savingsGoalEntitySchema,
  settingsEntitySchema,
  subscriptionEntitySchema,
  transactionEntitySchema,
  userEntitySchema
} from "../schemas/domain";

export type UserEntity = z.infer<typeof userEntitySchema>;
export type TransactionEntity = z.infer<typeof transactionEntitySchema>;
export type CategoryEntity = z.infer<typeof categoryEntitySchema>;
export type SettingsEntity = z.infer<typeof settingsEntitySchema>;
export type BudgetEntity = z.infer<typeof budgetEntitySchema>;
export type SavingsGoalEntity = z.infer<typeof savingsGoalEntitySchema>;
export type SubscriptionEntity = z.infer<typeof subscriptionEntitySchema>;
export type NotificationEntity = z.infer<typeof notificationEntitySchema>;
export type FinancialHealthScoreEntity = z.infer<typeof financialHealthScoreEntitySchema>;
