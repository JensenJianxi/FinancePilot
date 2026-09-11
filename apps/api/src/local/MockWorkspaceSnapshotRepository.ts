import { randomUUID } from "node:crypto";
import type {
  Category,
  CategoryRecord,
  CreateSavingsGoalInputDto,
  CreateSubscriptionInputDto,
  CreateTransactionRequestDto,
  ListTransactionsQueryDto,
  SavingGoal,
  SavingsGoalRecord,
  SettingsRecord,
  Subscription,
  SubscriptionRecord,
  Transaction,
  TransactionRecord,
  UpdateSettingsInputDto,
  UpdateSavingsGoalInputDto,
  UpdateSubscriptionInputDto,
  UpdateTransactionRequestDto
} from "@finance-pilot/shared";
import { createMockWorkspaceSnapshot } from "@finance-pilot/shared/mocks";
import type {
  CategoriesRepository,
  DefaultCategorySeed,
  SettingsCreateInput,
  SettingsRepository,
  SavingsGoalsRepository,
  SubscriptionsRepository,
  TransactionsRepository
} from "../repositories";
import type { WorkspaceSnapshotRepository } from "../repositories/WorkspaceSnapshotRepository";

const LOCAL_DEMO_USER_ID = "local-demo-user";

function toTransactionDto(record: TransactionRecord): Transaction {
  return {
    amount: record.amount,
    category: record.category,
    createdAt: record.createdAt,
    date: record.transactionDate,
    id: record.transactionId,
    notes: record.note ?? "",
    paymentMethod: record.paymentMethod,
    title: record.title,
    type: record.type,
    updatedAt: record.updatedAt
  };
}

function toTransactionRecord(transaction: Transaction, userId: string): TransactionRecord {
  const timestamp = new Date(`${transaction.date}T08:00:00.000Z`).toISOString();

  return {
    amount: transaction.amount,
    category: transaction.category,
    createdAt: timestamp,
    entityType: "transaction",
    note: transaction.notes,
    paymentMethod: transaction.paymentMethod,
    title: transaction.title,
    transactionDate: transaction.date,
    transactionId: transaction.id,
    type: transaction.type,
    updatedAt: timestamp,
    userId,
    version: 1
  };
}

function toCategoryRecord(category: Category, userId: string): CategoryRecord {
  const timestamp = category.createdAt ?? new Date("2026-08-01T08:00:00.000Z").toISOString();

  return {
    categoryId: category.id,
    createdAt: timestamp,
    entityType: "category",
    icon: category.icon,
    isDefault: category.isDefault,
    name: category.name,
    type: category.type,
    updatedAt: category.updatedAt ?? timestamp,
    userId,
    version: 1
  };
}

function toCategoryDto(record: CategoryRecord): Category {
  return {
    createdAt: record.createdAt,
    icon: record.icon,
    id: record.categoryId,
    isDefault: record.isDefault,
    name: record.name,
    type: record.type,
    updatedAt: record.updatedAt
  };
}

function toSubscriptionRecord(subscription: Subscription, userId: string): SubscriptionRecord {
  return {
    active: subscription.active,
    amount: subscription.amount,
    autoCreateTransaction: subscription.autoCreateTransaction,
    categoryId: subscription.categoryId,
    categoryName: subscription.categoryName,
    createdAt: subscription.createdAt,
    entityType: "subscription",
    frequency: subscription.frequency,
    name: subscription.name,
    nextPaymentDate: subscription.nextPaymentDate,
    paymentMethod: subscription.paymentMethod,
    subscriptionId: subscription.id,
    updatedAt: subscription.updatedAt,
    userId,
    version: 1
  };
}

function toSavingsGoalRecord(goal: SavingGoal, userId: string): SavingsGoalRecord {
  const timestamp = new Date("2026-08-01T08:00:00.000Z").toISOString();

  return {
    createdAt: timestamp,
    currentAmount: goal.currentAmount,
    deadline: goal.deadline,
    entityType: "savingsGoal",
    goalId: goal.id,
    monthlyContribution: goal.monthlyContribution,
    name: goal.name,
    ownerUserId: userId,
    predictedCompletion: goal.predictedCompletion,
    targetAmount: goal.targetAmount,
    updatedAt: timestamp,
    userId,
    version: 1
  };
}

function toSavingsGoalDto(record: SavingsGoalRecord): SavingGoal {
  return {
    currentAmount: record.currentAmount,
    deadline: record.deadline,
    id: record.goalId,
    monthlyContribution: record.monthlyContribution,
    name: record.name,
    predictedCompletion: record.predictedCompletion,
    targetAmount: record.targetAmount
  };
}

export class MockWorkspaceSnapshotRepository
  implements
    WorkspaceSnapshotRepository,
    TransactionsRepository,
    CategoriesRepository,
    SettingsRepository,
    SavingsGoalsRepository,
    SubscriptionsRepository
{
  private readonly baseSnapshot = createMockWorkspaceSnapshot();
  private readonly categoriesByUser = new Map<string, CategoryRecord[]>([
    [
      LOCAL_DEMO_USER_ID,
      this.baseSnapshot.categories.map((category) => toCategoryRecord(category, LOCAL_DEMO_USER_ID))
    ]
  ]);
  private readonly transactionsByUser = new Map<string, TransactionRecord[]>([
    [
      LOCAL_DEMO_USER_ID,
      this.baseSnapshot.transactions
        .map((transaction) => toTransactionRecord(transaction, LOCAL_DEMO_USER_ID))
        .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate))
    ]
  ]);
  private readonly settingsByUser = new Map<string, SettingsRecord>();
  private readonly savingsGoalsByUser = new Map<string, SavingsGoalRecord[]>([
    [
      LOCAL_DEMO_USER_ID,
      this.baseSnapshot.savingGoals.map((goal) => toSavingsGoalRecord(goal, LOCAL_DEMO_USER_ID))
    ]
  ]);
  private readonly subscriptionsByUser = new Map<string, SubscriptionRecord[]>([
    [
      LOCAL_DEMO_USER_ID,
      this.baseSnapshot.subscriptions.map((subscription) =>
        toSubscriptionRecord(subscription, LOCAL_DEMO_USER_ID)
      )
    ]
  ]);

  async getWorkspaceSnapshot() {
    return {
      ...structuredClone(this.baseSnapshot),
      categories: this.getCategoryRecords(LOCAL_DEMO_USER_ID).map(toCategoryDto),
      savingGoals: this.getSavingsGoalRecords(LOCAL_DEMO_USER_ID).map(toSavingsGoalDto),
      subscriptions: this.getSubscriptionRecords(LOCAL_DEMO_USER_ID).map((record) => ({
        active: record.active,
        amount: record.amount,
        autoCreateTransaction: record.autoCreateTransaction,
        categoryId: record.categoryId,
        categoryName: record.categoryName,
        createdAt: record.createdAt,
        frequency: record.frequency,
        id: record.subscriptionId,
        name: record.name,
        nextPaymentDate: record.nextPaymentDate,
        paymentMethod: record.paymentMethod,
        updatedAt: record.updatedAt
      })),
      transactions: this.getTransactionRecords(LOCAL_DEMO_USER_ID).map(toTransactionDto)
    };
  }

  async listTransactions(query?: ListTransactionsQueryDto) {
    return this.filterTransactions(this.getTransactionRecords(LOCAL_DEMO_USER_ID), query).map(toTransactionDto);
  }

  async createTransaction(
    userId: string,
    input: CreateTransactionRequestDto
  ): Promise<TransactionRecord> {
    const timestamp = new Date().toISOString();
    const record: TransactionRecord = {
      amount: input.amount,
      category: input.category,
      createdAt: timestamp,
      entityType: "transaction",
      note: input.note,
      paymentMethod: input.paymentMethod,
      title: input.title,
      transactionDate: input.transactionDate,
      transactionId: `txn_${randomUUID()}`,
      type: input.type,
      updatedAt: timestamp,
      userId,
      version: 1
    };
    const current = this.getTransactionRecords(userId);
    this.transactionsByUser.set(userId, [record, ...current].sort(this.sortTransactions));

    return record;
  }

  async createCategory(
    userId: string,
    input: { icon?: string; name: string; type: "income" | "expense" }
  ): Promise<CategoryRecord> {
    const timestamp = new Date().toISOString();
    const record: CategoryRecord = {
      categoryId: `cat_${randomUUID()}`,
      createdAt: timestamp,
      entityType: "category",
      icon: input.icon,
      isDefault: false,
      name: input.name,
      type: input.type,
      updatedAt: timestamp,
      userId,
      version: 1
    };
    const current = this.getCategoryRecords(userId);
    this.categoriesByUser.set(userId, [record, ...current].sort(this.sortCategories));

    return record;
  }

  async createSettings(
    userId: string,
    input: SettingsCreateInput
  ): Promise<SettingsRecord> {
    const timestamp = new Date().toISOString();
    const record: SettingsRecord = {
      animationsEnabled: input.animationsEnabled,
      budgetCreationEnabled: input.budgetCreationEnabled,
      createdAt: timestamp,
      currency: input.currency,
      defaultExpenseCategory: input.defaultExpenseCategory ?? input.defaultExpenseCategoryId,
      defaultExpenseCategoryId: input.defaultExpenseCategoryId ?? input.defaultExpenseCategory,
      defaultIncomeCategory: input.defaultIncomeCategory,
      defaultPaymentMethod: input.defaultPaymentMethod,
      defaultTransactionType: input.defaultTransactionType,
      entityType: "settings",
      language: input.language,
      notificationsEnabled: input.notificationsEnabled,
      paymentMethods: input.paymentMethods,
      receiptScanningEnabled: input.receiptScanningEnabled,
      theme: input.theme,
      updatedAt: timestamp,
      userId,
      version: 1
    };
    this.settingsByUser.set(userId, record);

    return record;
  }

  async createSubscription(
    userId: string,
    input: CreateSubscriptionInputDto
  ): Promise<SubscriptionRecord> {
    const timestamp = new Date().toISOString();
    const record: SubscriptionRecord = {
      active: input.active,
      amount: input.amount,
      autoCreateTransaction: input.autoCreateTransaction,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      createdAt: timestamp,
      entityType: "subscription",
      frequency: input.frequency,
      name: input.name,
      nextPaymentDate: input.nextPaymentDate,
      paymentMethod: input.paymentMethod,
      subscriptionId: `sub_${randomUUID()}`,
      updatedAt: timestamp,
      userId,
      version: 1
    };
    const current = this.getSubscriptionRecords(userId);
    this.subscriptionsByUser.set(userId, [record, ...current].sort(this.sortSubscriptions));

    return record;
  }

  async createSavingsGoal(
    userId: string,
    input: CreateSavingsGoalInputDto
  ): Promise<SavingsGoalRecord> {
    const timestamp = new Date().toISOString();
    const record: SavingsGoalRecord = {
      ...input,
      createdAt: timestamp,
      entityType: "savingsGoal",
      goalId: `goal_${randomUUID()}`,
      ownerUserId: userId,
      updatedAt: timestamp,
      userId,
      version: 1
    };
    const current = this.getSavingsGoalRecords(userId);
    this.savingsGoalsByUser.set(userId, [record, ...current].sort(this.sortSavingsGoals));
    return record;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const current = this.getTransactionRecords(userId);
    const next = current.filter((item) => item.transactionId !== transactionId);
    this.transactionsByUser.set(userId, next);

    return next.length !== current.length;
  }

  async getTransaction(userId: string, transactionId: string): Promise<TransactionRecord | null> {
    return this.getTransactionRecords(userId).find((item) => item.transactionId === transactionId) ?? null;
  }

  async deleteCategory(userId: string, categoryId: string): Promise<boolean> {
    const current = this.getCategoryRecords(userId);
    const next = current.filter((item) => item.categoryId !== categoryId);
    this.categoriesByUser.set(userId, next);

    return next.length !== current.length;
  }

  async deleteSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const current = this.getSubscriptionRecords(userId);
    const next = current.filter((item) => item.subscriptionId !== subscriptionId);
    this.subscriptionsByUser.set(userId, next);

    return next.length !== current.length;
  }

  async deleteSavingsGoal(userId: string, goalId: string): Promise<boolean> {
    const current = this.getSavingsGoalRecords(userId);
    const next = current.filter((item) => item.goalId !== goalId);
    this.savingsGoalsByUser.set(userId, next);
    return next.length !== current.length;
  }

  async getCategory(userId: string, categoryId: string): Promise<CategoryRecord | null> {
    return this.getCategoryRecords(userId).find((item) => item.categoryId === categoryId) ?? null;
  }

  async getSettings(userId: string): Promise<SettingsRecord | null> {
    return structuredClone(this.settingsByUser.get(userId)) ?? null;
  }

  async getSavingsGoal(userId: string, goalId: string): Promise<SavingsGoalRecord | null> {
    return this.getSavingsGoalRecords(userId).find((item) => item.goalId === goalId) ?? null;
  }

  async getSubscription(userId: string, subscriptionId: string): Promise<SubscriptionRecord | null> {
    return this.getSubscriptionRecords(userId).find(
      (item) => item.subscriptionId === subscriptionId
    ) ?? null;
  }

  async listUserCategories(userId: string): Promise<CategoryRecord[]> {
    return this.getCategoryRecords(userId).sort(this.sortCategories);
  }

  async listUserSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
    return this.getSubscriptionRecords(userId).sort(this.sortSubscriptions);
  }

  async listUserSavingsGoals(userId: string): Promise<SavingsGoalRecord[]> {
    return this.getSavingsGoalRecords(userId).sort(this.sortSavingsGoals);
  }

  async seedDefaultCategories(userId: string, seeds: DefaultCategorySeed[]): Promise<void> {
    const current = this.getCategoryRecords(userId);
    const existingIds = new Set(current.map((category) => category.categoryId));
    const timestamp = new Date("2026-08-01T08:00:00.000Z").toISOString();
    const nextDefaults = seeds
      .filter((seed) => !existingIds.has(seed.categoryId))
      .map<CategoryRecord>((seed) => ({
        categoryId: seed.categoryId,
        createdAt: timestamp,
        entityType: "category",
        icon: seed.icon,
        isDefault: true,
        name: seed.name,
        type: seed.type,
        updatedAt: timestamp,
        userId,
        version: 1
      }));

    if (!nextDefaults.length) {
      return;
    }

    this.categoriesByUser.set(userId, [...current, ...nextDefaults].sort(this.sortCategories));
  }

  async listUserTransactions(userId: string, query?: ListTransactionsQueryDto): Promise<TransactionRecord[]> {
    return this.filterTransactions(this.getTransactionRecords(userId), query);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    input: { icon?: string; name?: string; type?: "income" | "expense" }
  ): Promise<CategoryRecord | null> {
    const current = this.getCategoryRecords(userId);
    const index = current.findIndex((item) => item.categoryId === categoryId);

    if (index < 0) {
      return null;
    }

    const existing = current[index]!;
    const nextRecord: CategoryRecord = {
      ...existing,
      icon: input.icon ?? existing.icon,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      updatedAt: new Date().toISOString()
    };
    const next = [...current];
    next[index] = nextRecord;
    this.categoriesByUser.set(userId, next.sort(this.sortCategories));

    return nextRecord;
  }

  async updateSettings(userId: string, input: UpdateSettingsInputDto): Promise<SettingsRecord | null> {
    const existing = await this.getSettings(userId);

    if (!existing) {
      return null;
    }

    const nextRecord: SettingsRecord = {
      ...existing,
      animationsEnabled: input.animationsEnabled ?? existing.animationsEnabled,
      budgetCreationEnabled:
        input.budgetCreationEnabled ?? existing.budgetCreationEnabled ?? true,
      currency: input.currency ?? existing.currency,
      defaultExpenseCategory:
        input.defaultExpenseCategory ?? input.defaultExpenseCategoryId ?? existing.defaultExpenseCategory,
      defaultExpenseCategoryId:
        input.defaultExpenseCategoryId ?? input.defaultExpenseCategory ?? existing.defaultExpenseCategoryId,
      defaultIncomeCategory: input.defaultIncomeCategory ?? existing.defaultIncomeCategory,
      defaultPaymentMethod: input.defaultPaymentMethod ?? existing.defaultPaymentMethod,
      defaultTransactionType: input.defaultTransactionType ?? existing.defaultTransactionType,
      language: input.language ?? existing.language,
      notificationsEnabled: input.notificationsEnabled ?? existing.notificationsEnabled,
      paymentMethods: input.paymentMethods ?? existing.paymentMethods,
      receiptScanningEnabled: input.receiptScanningEnabled ?? existing.receiptScanningEnabled ?? true,
      theme: input.theme ?? existing.theme,
      updatedAt: new Date().toISOString()
    };
    this.settingsByUser.set(userId, nextRecord);

    return nextRecord;
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    input: UpdateSubscriptionInputDto
  ): Promise<SubscriptionRecord | null> {
    const current = this.getSubscriptionRecords(userId);
    const index = current.findIndex((item) => item.subscriptionId === subscriptionId);

    if (index < 0) {
      return null;
    }

    const existing = current[index]!;
    const nextRecord: SubscriptionRecord = {
      ...existing,
      active: input.active ?? existing.active,
      amount: input.amount ?? existing.amount,
      autoCreateTransaction: input.autoCreateTransaction ?? existing.autoCreateTransaction,
      categoryId: input.categoryId ?? existing.categoryId,
      categoryName: input.categoryName ?? existing.categoryName,
      frequency: input.frequency ?? existing.frequency,
      name: input.name ?? existing.name,
      nextPaymentDate: input.nextPaymentDate ?? existing.nextPaymentDate,
      paymentMethod: input.paymentMethod ?? existing.paymentMethod,
      updatedAt: new Date().toISOString()
    };
    const next = [...current];
    next[index] = nextRecord;
    this.subscriptionsByUser.set(userId, next.sort(this.sortSubscriptions));

    return nextRecord;
  }

  async updateSavingsGoal(
    userId: string,
    goalId: string,
    input: UpdateSavingsGoalInputDto
  ): Promise<SavingsGoalRecord | null> {
    const current = this.getSavingsGoalRecords(userId);
    const index = current.findIndex((item) => item.goalId === goalId);

    if (index < 0) {
      return null;
    }

    const nextRecord: SavingsGoalRecord = {
      ...current[index]!,
      ...input,
      updatedAt: new Date().toISOString()
    };
    const next = [...current];
    next[index] = nextRecord;
    this.savingsGoalsByUser.set(userId, next.sort(this.sortSavingsGoals));
    return nextRecord;
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateTransactionRequestDto
  ): Promise<TransactionRecord | null> {
    const current = this.getTransactionRecords(userId);
    const index = current.findIndex((item) => item.transactionId === transactionId);

    if (index < 0) {
      return null;
    }

    const existing = current[index]!;
    const nextRecord: TransactionRecord = {
      ...existing,
      amount: input.amount ?? existing.amount,
      category: input.category ?? existing.category,
      note: input.note ?? existing.note,
      paymentMethod: input.paymentMethod ?? existing.paymentMethod,
      title: input.title ?? existing.title,
      transactionDate: input.transactionDate ?? existing.transactionDate,
      type: input.type ?? existing.type,
      updatedAt: new Date().toISOString()
    };
    const next = [...current];
    next[index] = nextRecord;
    this.transactionsByUser.set(userId, next.sort(this.sortTransactions));

    return nextRecord;
  }

  private filterTransactions(records: TransactionRecord[], query?: ListTransactionsQueryDto) {
    return records.filter((transaction) => {
      if (query?.type && transaction.type !== query.type) {
        return false;
      }

      if (query?.paymentMethod && transaction.paymentMethod !== query.paymentMethod) {
        return false;
      }

      if (query?.month && !transaction.transactionDate.startsWith(query.month)) {
        return false;
      }

      const categoryFilter = query?.category ?? query?.categoryName;

      if (categoryFilter && transaction.category !== categoryFilter) {
        return false;
      }

      return true;
    }).sort(this.sortTransactions);
  }

  private getTransactionRecords(userId: string) {
    return structuredClone(this.transactionsByUser.get(userId) ?? []);
  }

  private getCategoryRecords(userId: string) {
    return structuredClone(this.categoriesByUser.get(userId) ?? []);
  }

  private getSubscriptionRecords(userId: string) {
    return structuredClone(this.subscriptionsByUser.get(userId) ?? []);
  }

  private getSavingsGoalRecords(userId: string) {
    return structuredClone(this.savingsGoalsByUser.get(userId) ?? []);
  }

  private sortCategories(left: CategoryRecord, right: CategoryRecord) {
    const typeComparison = left.type.localeCompare(right.type);

    if (typeComparison !== 0) {
      return typeComparison;
    }

    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  }

  private sortTransactions(left: TransactionRecord, right: TransactionRecord) {
    const dateComparison = right.transactionDate.localeCompare(left.transactionDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return right.createdAt.localeCompare(left.createdAt);
  }

  private sortSubscriptions(left: SubscriptionRecord, right: SubscriptionRecord) {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    const dateComparison = left.nextPaymentDate.localeCompare(right.nextPaymentDate);

    return dateComparison || left.name.localeCompare(right.name);
  }

  private sortSavingsGoals(left: SavingsGoalRecord, right: SavingsGoalRecord) {
    return left.deadline.localeCompare(right.deadline) || left.name.localeCompare(right.name);
  }
}
