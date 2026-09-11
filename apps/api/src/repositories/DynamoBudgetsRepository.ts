import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";
import type {
  BudgetRecord,
  CreateBudgetInputDto,
  UpdateBudgetInputDto
} from "@finance-pilot/shared";
import type { BudgetsRepository } from "./BudgetsRepository";

export interface DynamoBudgetsRepositoryOptions {
  client?: DynamoDBDocumentClient;
  tableName: string;
}

function calculateTrend(spent: number, limit: number): BudgetRecord["trend"] {
  if (limit <= 0) {
    return "healthy";
  }

  const ratio = spent / limit;

  if (ratio >= 1) {
    return "over";
  }

  if (ratio >= 0.8) {
    return "watch";
  }

  return "healthy";
}

export class DynamoBudgetsRepository implements BudgetsRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: DynamoBudgetsRepositoryOptions) {
    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({})
      );
    this.tableName = options.tableName;
  }

  async createBudget(userId: string, input: CreateBudgetInputDto): Promise<BudgetRecord> {
    const timestamp = new Date().toISOString();
    const categoryFields = input.scope === "category"
      ? {
          categoryId: input.categoryId,
          categoryName: input.categoryName
        }
      : {};
    const record: BudgetRecord = {
      budgetId: `bud_${randomUUID()}`,
      ...categoryFields,
      createdAt: timestamp,
      entityType: "budget",
      limit: input.limit,
      name: input.name ?? input.categoryName ?? "Monthly budget",
      ownerUserId: userId,
      periodMonth: input.periodMonth,
      recurrence: input.recurrence,
      scope: input.scope,
      spent: 0,
      trend: "healthy",
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

  async deleteBudget(userId: string, budgetId: string): Promise<boolean> {
    const existing = await this.getBudget(userId, budgetId);

    if (!existing) {
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        Key: {
          budgetId,
          userId
        },
        TableName: this.tableName
      })
    );

    return true;
  }

  async getBudget(userId: string, budgetId: string): Promise<BudgetRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        Key: {
          budgetId,
          userId
        },
        TableName: this.tableName
      })
    );

    return (response.Item as BudgetRecord | undefined) ?? null;
  }

  async listUserBudgets(userId: string): Promise<BudgetRecord[]> {
    const response = await this.client.send(
      new QueryCommand({
        ExpressionAttributeValues: {
          ":userId": userId
        },
        KeyConditionExpression: "userId = :userId",
        TableName: this.tableName
      })
    );

    const items = (response.Items as BudgetRecord[] | undefined) ?? [];
    return items.sort(this.sortBudgets);
  }

  async updateBudget(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInputDto
  ): Promise<BudgetRecord | null> {
    const existing = await this.getBudget(userId, budgetId);

    if (!existing) {
      return null;
    }

    const limit = input.limit ?? existing.limit;
    const scope = input.scope ?? existing.scope ?? "overall";
    const nextRecord: BudgetRecord = {
      ...existing,
      categoryId: input.categoryId ?? existing.categoryId,
      categoryName: input.categoryName ?? existing.categoryName,
      limit,
      name: input.name ?? existing.name ?? existing.categoryName ?? "Monthly budget",
      periodMonth: input.periodMonth ?? existing.periodMonth,
      recurrence: input.recurrence ?? existing.recurrence ?? "monthly",
      scope,
      trend: calculateTrend(existing.spent, limit),
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

  private sortBudgets(left: BudgetRecord, right: BudgetRecord) {
    const monthComparison = right.periodMonth.localeCompare(left.periodMonth);

    if (monthComparison !== 0) {
      return monthComparison;
    }

    return (left.name ?? left.categoryName ?? "").localeCompare(
      right.name ?? right.categoryName ?? ""
    );
  }
}
