import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb";
import type {
  SettingsRecord,
  UpdateSettingsInputDto
} from "@finance-pilot/shared";
import type { SettingsCreateInput, SettingsRepository } from "./SettingsRepository";

export interface DynamoSettingsRepositoryOptions {
  client?: DynamoDBDocumentClient;
  tableName: string;
}

export class DynamoSettingsRepository implements SettingsRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: DynamoSettingsRepositoryOptions) {
    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({})
      );
    this.tableName = options.tableName;
  }

  async createSettings(userId: string, input: SettingsCreateInput): Promise<SettingsRecord> {
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

    await this.client.send(
      new PutCommand({
        Item: record,
        TableName: this.tableName
      })
    );

    return record;
  }

  async getSettings(userId: string): Promise<SettingsRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        Key: {
          userId
        },
        TableName: this.tableName
      })
    );

    return (response.Item as SettingsRecord | undefined) ?? null;
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

    await this.client.send(
      new PutCommand({
        Item: nextRecord,
        TableName: this.tableName
      })
    );

    return nextRecord;
  }
}
