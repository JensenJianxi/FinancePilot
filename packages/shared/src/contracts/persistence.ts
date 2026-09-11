export type PersistenceRecordType =
  | "budget"
  | "category"
  | "financialHealthScore"
  | "notification"
  | "savingsGoal"
  | "settings"
  | "subscription"
  | "transaction"
  | "user";

export interface PersistenceEnvelope {
  createdAt: string;
  entityType: PersistenceRecordType;
  ownerUserId?: string;
  updatedAt?: string;
  version: number;
}

export interface UserRecord extends PersistenceEnvelope {
  cognitoSub: string;
  email: string;
  emailVerified: boolean;
  entityType: "user";
  fullName: string;
  userId: string;
}

export interface TransactionRecord extends PersistenceEnvelope {
  amount: number;
  category: string;
  createdAt: string;
  entityType: "transaction";
  note?: string;
  paymentMethod: string;
  title: string;
  transactionId: string;
  transactionDate: string;
  type: "income" | "expense" | "transfer";
  updatedAt: string;
  userId: string;
}

export interface CategoryRecord extends PersistenceEnvelope {
  categoryId: string;
  createdAt: string;
  entityType: "category";
  icon?: string;
  isDefault: boolean;
  name: string;
  type: "income" | "expense";
  updatedAt: string;
  userId: string;
}

export interface SettingsRecord extends PersistenceEnvelope {
  animationsEnabled?: boolean;
  budgetCreationEnabled?: boolean;
  createdAt: string;
  currency: "MYR" | "USD" | "SGD";
  defaultExpenseCategory?: string;
  defaultExpenseCategoryId?: string;
  defaultIncomeCategory?: string;
  defaultPaymentMethod?: string;
  defaultTransactionType?: "income" | "expense" | "transfer";
  entityType: "settings";
  language?: "en" | "ms" | "zh-CN";
  notificationsEnabled: boolean;
  paymentMethods: string[];
  receiptScanningEnabled?: boolean;
  theme: "light" | "dark";
  updatedAt: string;
  userId: string;
}

export interface BudgetRecord extends PersistenceEnvelope {
  budgetId: string;
  categoryId?: string;
  categoryName?: string;
  entityType: "budget";
  limit: number;
  name?: string;
  ownerUserId: string;
  periodMonth: string;
  recurrence?: "once" | "monthly";
  scope?: "overall" | "category";
  spent: number;
  trend: "healthy" | "watch" | "over";
  updatedAt: string;
  userId: string;
}

export interface SavingsGoalRecord extends PersistenceEnvelope {
  currentAmount: number;
  deadline: string;
  entityType: "savingsGoal";
  goalId: string;
  monthlyContribution: number;
  name: string;
  ownerUserId: string;
  predictedCompletion?: string;
  targetAmount: number;
  updatedAt: string;
  userId: string;
}

export interface SubscriptionRecord extends PersistenceEnvelope {
  active: boolean;
  amount: number;
  autoCreateTransaction: boolean;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  entityType: "subscription";
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  name: string;
  nextPaymentDate: string;
  paymentMethod: string;
  subscriptionId: string;
  updatedAt: string;
  userId: string;
}

export interface NotificationRecord extends PersistenceEnvelope {
  channel: "email" | "inApp" | "push";
  entityType: "notification";
  notificationId: string;
  ownerUserId: string;
  read: boolean;
  scheduledFor: string;
  title: string;
}

export interface FinancialHealthScoreRecord extends PersistenceEnvelope {
  calculatedAt: string;
  dataStatus: "limited" | "partial" | "complete";
  entityType: "financialHealthScore";
  factors: Array<{
    key: "cashFlow" | "budgetAdherence" | "savingsProgress" | "recurringCostLoad";
    label: string;
    maxScore: number;
    score: number;
    status: "strong" | "healthy" | "watch" | "needsAttention" | "notEnoughData";
    summary: string;
  }>;
  ownerUserId: string;
  periodMonth: string;
  rating: "strong" | "steady" | "building" | "needsAttention";
  score: number;
  scoreId: string;
  updatedAt: string;
  userId: string;
}
