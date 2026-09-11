import { z } from "zod";
import { amountSchema, identifierSchema, isoDateSchema, isoDateTimeSchema, isoMonthSchema } from "./common";

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
export const categoryTypeSchema = z.enum(["income", "expense"]);
export const subscriptionFrequencySchema = z.enum(["weekly", "monthly", "quarterly", "yearly"]);
export const notificationChannelSchema = z.enum(["email", "inApp", "push"]);
export const authProviderSchema = z.enum(["cognito", "local-mock"]);
export const budgetTrendSchema = z.enum(["healthy", "watch", "over"]);
export const budgetScopeSchema = z.enum(["overall", "category"]);
export const budgetRecurrenceSchema = z.enum(["once", "monthly"]);
export const currencySchema = z.enum(["MYR", "USD", "SGD"]);
export const themePreferenceSchema = z.enum(["light", "dark"]);
export const languagePreferenceSchema = z.enum(["en", "ms", "zh-CN"]);
export const financialHealthDataStatusSchema = z.enum(["limited", "partial", "complete"]);
export const financialHealthFactorKeySchema = z.enum([
  "cashFlow",
  "budgetAdherence",
  "savingsProgress",
  "recurringCostLoad"
]);
export const financialHealthFactorStatusSchema = z.enum([
  "strong",
  "healthy",
  "watch",
  "needsAttention",
  "notEnoughData"
]);
export const financialHealthRatingSchema = z.enum([
  "strong",
  "steady",
  "building",
  "needsAttention"
]);

export const calendarDateSchema = isoDateSchema.refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month! - 1 &&
    parsed.getUTCDate() === day
  );
}, "Enter a valid calendar date");

export const userEntitySchema = z
  .object({
    cognitoSub: identifierSchema,
    createdAt: isoDateTimeSchema,
    email: z.email(),
    emailVerified: z.boolean(),
    fullName: z.string().min(1),
    id: identifierSchema,
    provider: authProviderSchema,
    updatedAt: isoDateTimeSchema.optional()
  })
  .strict();

export const transactionEntitySchema = z
  .object({
    amount: amountSchema,
    categoryId: identifierSchema.optional(),
    categoryName: z.string().min(1),
    createdAt: isoDateTimeSchema,
    date: isoDateSchema,
    id: identifierSchema,
    notes: z.string().max(240),
    ownerUserId: identifierSchema,
    paymentMethod: z.string().min(1),
    title: z.string().min(1),
    type: transactionTypeSchema,
    updatedAt: isoDateTimeSchema.optional()
  })
  .strict();

export const categoryEntitySchema = z
  .object({
    createdAt: isoDateTimeSchema.optional(),
    icon: z.string().min(1).optional(),
    id: identifierSchema,
    isDefault: z.boolean(),
    name: z.string().min(1),
    type: categoryTypeSchema,
    updatedAt: isoDateTimeSchema.optional()
  })
  .strict();

export const settingsEntitySchema = z
  .object({
    animationsEnabled: z.boolean().default(true),
    budgetCreationEnabled: z.boolean().default(true),
    createdAt: isoDateTimeSchema,
    currency: currencySchema,
    defaultExpenseCategory: identifierSchema.optional(),
    defaultExpenseCategoryId: identifierSchema.optional(),
    defaultIncomeCategory: identifierSchema.optional(),
    defaultPaymentMethod: z.string().min(1).optional(),
    defaultTransactionType: transactionTypeSchema.default("expense"),
    language: languagePreferenceSchema.default("en"),
    notificationsEnabled: z.boolean(),
    paymentMethods: z.array(z.string().min(1)).min(1),
    receiptScanningEnabled: z.boolean().default(true),
    theme: themePreferenceSchema,
    updatedAt: isoDateTimeSchema,
    userId: identifierSchema
  })
  .strict();

export const budgetEntitySchema = z
  .object({
    categoryId: identifierSchema.optional(),
    categoryName: z.string().min(1).optional(),
    id: identifierSchema,
    limit: amountSchema.positive(),
    name: z.string().trim().min(1).optional(),
    ownerUserId: identifierSchema,
    periodMonth: isoMonthSchema,
    recurrence: budgetRecurrenceSchema.default("monthly"),
    scope: budgetScopeSchema.default("category"),
    spent: amountSchema,
    trend: budgetTrendSchema
  })
  .strict();

export const savingsGoalEntitySchema = z
  .object({
    currentAmount: amountSchema,
    deadline: calendarDateSchema,
    id: identifierSchema,
    monthlyContribution: amountSchema,
    name: z.string().trim().min(1).max(120),
    ownerUserId: identifierSchema,
    predictedCompletion: calendarDateSchema.optional(),
    targetAmount: amountSchema.positive()
  })
  .strict();

export const subscriptionEntitySchema = z
  .object({
    active: z.boolean(),
    amount: amountSchema.positive(),
    autoCreateTransaction: z.boolean(),
    categoryId: identifierSchema,
    categoryName: z.string().trim().min(1),
    createdAt: isoDateTimeSchema,
    frequency: subscriptionFrequencySchema,
    id: identifierSchema,
    name: z.string().trim().min(1).max(120),
    nextPaymentDate: calendarDateSchema,
    paymentMethod: z.string().trim().min(1),
    updatedAt: isoDateTimeSchema
  })
  .strict();

export const notificationEntitySchema = z
  .object({
    channel: notificationChannelSchema,
    id: identifierSchema,
    ownerUserId: identifierSchema,
    read: z.boolean(),
    scheduledFor: isoDateTimeSchema,
    title: z.string().min(1)
  })
  .strict();

export const financialHealthFactorSchema = z
  .object({
    key: financialHealthFactorKeySchema,
    label: z.string().min(1),
    maxScore: z.number().int().positive().max(100),
    score: z.number().int().min(0).max(100),
    status: financialHealthFactorStatusSchema,
    summary: z.string().min(1)
  })
  .strict()
  .refine((factor) => factor.score <= factor.maxScore, "Factor score cannot exceed its maximum");

export const financialHealthScoreEntitySchema = z
  .object({
    calculatedAt: isoDateTimeSchema,
    dataStatus: financialHealthDataStatusSchema,
    factors: z.array(financialHealthFactorSchema).length(4),
    id: identifierSchema,
    ownerUserId: identifierSchema,
    periodMonth: isoMonthSchema,
    rating: financialHealthRatingSchema,
    score: z.number().int().min(0).max(100)
  })
  .strict();
