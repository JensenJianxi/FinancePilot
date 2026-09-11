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
  CreateSavingsGoalInputDto,
  SavingsGoalRecord,
  UpdateSavingsGoalInputDto
} from "@finance-pilot/shared";
import type { SavingsGoalsRepository } from "./SavingsGoalsRepository";

export interface DynamoSavingsGoalsRepositoryOptions {
  client?: DynamoDBDocumentClient;
  tableName: string;
}

function predictCompletion(
  currentAmount: number,
  monthlyContribution: number,
  targetAmount: number
) {
  if (currentAmount >= targetAmount) {
    return new Date().toISOString().slice(0, 10);
  }

  if (monthlyContribution <= 0) {
    return undefined;
  }

  const monthsRemaining = Math.ceil((targetAmount - currentAmount) / monthlyContribution);
  const completion = new Date();
  completion.setUTCMonth(completion.getUTCMonth() + monthsRemaining);
  return completion.toISOString().slice(0, 10);
}

export class DynamoSavingsGoalsRepository implements SavingsGoalsRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: DynamoSavingsGoalsRepositoryOptions) {
    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({})
      );
    this.tableName = options.tableName;
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
      predictedCompletion: predictCompletion(
        input.currentAmount,
        input.monthlyContribution,
        input.targetAmount
      ),
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

  async deleteSavingsGoal(userId: string, goalId: string): Promise<boolean> {
    const existing = await this.getSavingsGoal(userId, goalId);

    if (!existing) {
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        Key: { goalId, userId },
        TableName: this.tableName
      })
    );

    return true;
  }

  async getSavingsGoal(userId: string, goalId: string): Promise<SavingsGoalRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        Key: { goalId, userId },
        TableName: this.tableName
      })
    );

    return (response.Item as SavingsGoalRecord | undefined) ?? null;
  }

  async listUserSavingsGoals(userId: string): Promise<SavingsGoalRecord[]> {
    const response = await this.client.send(
      new QueryCommand({
        ExpressionAttributeValues: { ":userId": userId },
        KeyConditionExpression: "userId = :userId",
        TableName: this.tableName
      })
    );

    const items = (response.Items as SavingsGoalRecord[] | undefined) ?? [];
    return items.sort(this.sortSavingsGoals);
  }

  async updateSavingsGoal(
    userId: string,
    goalId: string,
    input: UpdateSavingsGoalInputDto
  ): Promise<SavingsGoalRecord | null> {
    const existing = await this.getSavingsGoal(userId, goalId);

    if (!existing) {
      return null;
    }

    const currentAmount = input.currentAmount ?? existing.currentAmount;
    const monthlyContribution = input.monthlyContribution ?? existing.monthlyContribution;
    const targetAmount = input.targetAmount ?? existing.targetAmount;
    const nextRecord: SavingsGoalRecord = {
      ...existing,
      currentAmount,
      deadline: input.deadline ?? existing.deadline,
      monthlyContribution,
      name: input.name ?? existing.name,
      predictedCompletion: predictCompletion(currentAmount, monthlyContribution, targetAmount),
      targetAmount,
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

  private sortSavingsGoals(left: SavingsGoalRecord, right: SavingsGoalRecord) {
    const completedComparison = Number(left.currentAmount >= left.targetAmount) -
      Number(right.currentAmount >= right.targetAmount);

    if (completedComparison !== 0) {
      return completedComparison;
    }

    return left.deadline.localeCompare(right.deadline) || left.name.localeCompare(right.name);
  }
}
