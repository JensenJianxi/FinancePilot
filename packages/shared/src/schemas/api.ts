import { z } from "zod";
import {
  budgetEntitySchema,
  budgetRecurrenceSchema,
  budgetScopeSchema,
  categoryEntitySchema,
  categoryTypeSchema,
  currencySchema,
  financialHealthScoreEntitySchema,
  languagePreferenceSchema,
  notificationEntitySchema,
  savingsGoalEntitySchema,
  settingsEntitySchema,
  subscriptionEntitySchema,
  themePreferenceSchema,
  transactionEntitySchema,
  transactionTypeSchema,
  userEntitySchema
} from "./domain";
import { amountSchema, identifierSchema, isoDateSchema, isoDateTimeSchema, isoMonthSchema } from "./common";

export const userDtoSchema = userEntitySchema.pick({
  email: true,
  emailVerified: true,
  fullName: true,
  id: true
});

export const transactionDtoSchema = transactionEntitySchema.omit({
  ownerUserId: true,
  categoryId: true,
  categoryName: true
}).extend({
  category: z.string().min(1),
  createdAt: isoDateTimeSchema.optional(),
  updatedAt: isoDateTimeSchema.optional()
});

export const categoryDtoSchema = categoryEntitySchema.pick({
  createdAt: true,
  icon: true,
  id: true,
  isDefault: true,
  name: true,
  type: true,
  updatedAt: true
});

export const settingsDtoSchema = settingsEntitySchema.pick({
  animationsEnabled: true,
  budgetCreationEnabled: true,
  createdAt: true,
  currency: true,
  defaultExpenseCategory: true,
  defaultExpenseCategoryId: true,
  defaultIncomeCategory: true,
  defaultPaymentMethod: true,
  defaultTransactionType: true,
  language: true,
  notificationsEnabled: true,
  paymentMethods: true,
  receiptScanningEnabled: true,
  theme: true,
  updatedAt: true
});

export const budgetDtoSchema = budgetEntitySchema.pick({
  id: true,
  limit: true,
  name: true,
  recurrence: true,
  scope: true,
  spent: true,
  trend: true
}).extend({
  category: z.string().min(1),
  categoryId: identifierSchema.optional(),
  periodMonth: isoMonthSchema
});

export const savingsGoalDtoSchema = savingsGoalEntitySchema.omit({
  ownerUserId: true
});

export const subscriptionDtoSchema = subscriptionEntitySchema;

export const notificationDtoSchema = notificationEntitySchema.omit({
  ownerUserId: true
});

export const financialHealthScoreDtoSchema = financialHealthScoreEntitySchema.omit({
  ownerUserId: true
});

export const dashboardSummaryDtoSchema = z
  .object({
    currentBalance: amountSchema,
    healthScore: z.number().int().min(0).max(100),
    monthlyExpense: amountSchema,
    monthlyIncome: amountSchema,
    savingsRate: z.number().int().min(0).max(100),
    spendingSummary: z.string().min(1),
    upcomingBills: z.number().int().min(0),
    userDisplayName: z.string().min(1)
  })
  .strict();

export const analyticsPointDtoSchema = z
  .object({
    expense: amountSchema,
    income: amountSchema,
    label: z.string().min(1),
    savings: amountSchema
  })
  .strict();

export const scorePointDtoSchema = z
  .object({
    label: z.string().min(1),
    score: z.number().int().min(0).max(100)
  })
  .strict();

export const categorySpendDtoSchema = z
  .object({
    name: z.string().min(1),
    value: z.number().int().min(0)
  })
  .strict();

export const financeAnalyticsDtoSchema = z
  .object({
    categoryBreakdown: z.array(categorySpendDtoSchema),
    healthScoreTrend: z.array(scorePointDtoSchema),
    monthlyCashFlow: z.array(analyticsPointDtoSchema)
  })
  .strict();

export const financeWorkspaceSnapshotDtoSchema = z
  .object({
    analytics: financeAnalyticsDtoSchema,
    budgets: z.array(budgetDtoSchema),
    categories: z.array(categoryDtoSchema),
    notifications: z.array(notificationDtoSchema),
    savingGoals: z.array(savingsGoalDtoSchema),
    scores: z.array(financialHealthScoreDtoSchema),
    subscriptions: z.array(subscriptionDtoSchema),
    summary: dashboardSummaryDtoSchema,
    transactions: z.array(transactionDtoSchema),
    user: userDtoSchema
  })
  .strict();

export const listTransactionsQueryDtoSchema = z
  .object({
    category: z.string().min(1).optional(),
    categoryId: identifierSchema.optional(),
    categoryName: z.string().min(1).optional(),
    month: isoMonthSchema.optional(),
    paymentMethod: z.string().min(1).optional(),
    type: transactionTypeSchema.optional()
  })
  .strict();

export const createTransactionInputDtoSchema = z
  .object({
    amount: amountSchema.positive(),
    categoryId: identifierSchema.optional(),
    categoryName: z.string().min(1),
    date: isoDateSchema,
    notes: z.string().max(240).default(""),
    paymentMethod: z.string().min(1),
    title: z.string().min(1),
    type: transactionTypeSchema
  })
  .strict();

export const updateTransactionInputDtoSchema = createTransactionInputDtoSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

export const transactionApiDtoSchema = z
  .object({
    amount: amountSchema.positive(),
    category: z.string().min(1),
    createdAt: isoDateTimeSchema,
    note: z.string().max(240).optional(),
    paymentMethod: z.string().min(1),
    title: z.string().min(1),
    transactionDate: isoDateSchema,
    transactionId: identifierSchema,
    type: transactionTypeSchema,
    updatedAt: isoDateTimeSchema
  })
  .strict();

export const createTransactionRequestDtoSchema = z
  .object({
    amount: amountSchema.positive(),
    category: z.string().min(1),
    note: z.string().max(240).optional(),
    paymentMethod: z.string().min(1),
    title: z.string().min(1),
    transactionDate: isoDateSchema,
    type: transactionTypeSchema
  })
  .strict();

export const updateTransactionRequestDtoSchema = createTransactionRequestDtoSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

export const createCategoryInputDtoSchema = z
  .object({
    icon: z.string().min(1).optional(),
    name: z.string().min(1),
    type: categoryTypeSchema
  })
  .strict();

export const updateCategoryInputDtoSchema = createCategoryInputDtoSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

const budgetInputShape = {
    categoryId: identifierSchema.optional(),
    categoryName: z.string().min(1).optional(),
    limit: amountSchema.positive(),
    name: z.string().trim().min(1).max(80).optional(),
    periodMonth: isoMonthSchema,
    recurrence: budgetRecurrenceSchema.default("monthly"),
    scope: budgetScopeSchema.default("category")
};

export const createBudgetInputDtoSchema = z
  .object(budgetInputShape)
  .strict()
  .superRefine((value, context) => {
    if (value.scope !== "category") {
      return;
    }

    if (!value.categoryId) {
      context.addIssue({
        code: "custom",
        message: "Choose a category",
        path: ["categoryId"]
      });
    }

    if (!value.categoryName) {
      context.addIssue({
        code: "custom",
        message: "Category name is required",
        path: ["categoryName"]
      });
    }
  });

export const updateBudgetInputDtoSchema = z.object(budgetInputShape).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

export const createSettingsInputDtoSchema = z
  .object({
    animationsEnabled: z.boolean().optional(),
    budgetCreationEnabled: z.boolean().optional(),
    currency: currencySchema.optional(),
    defaultExpenseCategory: identifierSchema.optional(),
    defaultExpenseCategoryId: identifierSchema.optional(),
    defaultIncomeCategory: identifierSchema.optional(),
    defaultPaymentMethod: z.string().min(1).optional(),
    defaultTransactionType: transactionTypeSchema.optional(),
    language: languagePreferenceSchema.optional(),
    notificationsEnabled: z.boolean().optional(),
    paymentMethods: z.array(z.string().min(1)).min(1).optional(),
    receiptScanningEnabled: z.boolean().optional(),
    theme: themePreferenceSchema.optional()
  })
  .strict();

export const updateSettingsInputDtoSchema = createSettingsInputDtoSchema.refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

export const createSavingsGoalInputDtoSchema = z
  .object({
    currentAmount: amountSchema,
    deadline: savingsGoalEntitySchema.shape.deadline,
    monthlyContribution: amountSchema,
    name: savingsGoalEntitySchema.shape.name,
    targetAmount: amountSchema.positive()
  })
  .strict();

export const updateSavingsGoalInputDtoSchema = createSavingsGoalInputDtoSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

export const createSubscriptionInputDtoSchema = z
  .object({
    active: z.boolean(),
    amount: amountSchema.positive(),
    autoCreateTransaction: z.boolean(),
    categoryId: identifierSchema,
    categoryName: z.string().trim().min(1),
    frequency: subscriptionEntitySchema.shape.frequency,
    name: z.string().trim().min(1).max(120),
    nextPaymentDate: isoDateSchema,
    paymentMethod: z.string().trim().min(1)
  })
  .strict();

export const updateSubscriptionInputDtoSchema = createSubscriptionInputDtoSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

export const apiErrorDtoSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: identifierSchema.optional(),
    statusCode: z.number().int().min(400).max(599),
    timestamp: isoDateTimeSchema
  })
  .strict();
