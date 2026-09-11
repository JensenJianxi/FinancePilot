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
  CreateSubscriptionInputDto,
  SubscriptionRecord,
  UpdateSubscriptionInputDto
} from "@finance-pilot/shared";
import type { SubscriptionsRepository } from "./SubscriptionsRepository";

export interface DynamoSubscriptionsRepositoryOptions {
  client?: DynamoDBDocumentClient;
  tableName: string;
}

export class DynamoSubscriptionsRepository implements SubscriptionsRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: DynamoSubscriptionsRepositoryOptions) {
    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({})
      );
    this.tableName = options.tableName;
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

    await this.client.send(
      new PutCommand({
        Item: record,
        TableName: this.tableName
      })
    );

    return record;
  }

  async deleteSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const existing = await this.getSubscription(userId, subscriptionId);

    if (!existing) {
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        Key: {
          subscriptionId,
          userId
        },
        TableName: this.tableName
      })
    );

    return true;
  }

  async getSubscription(userId: string, subscriptionId: string): Promise<SubscriptionRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        Key: {
          subscriptionId,
          userId
        },
        TableName: this.tableName
      })
    );

    return (response.Item as SubscriptionRecord | undefined) ?? null;
  }

  async listUserSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
    const response = await this.client.send(
      new QueryCommand({
        ExpressionAttributeValues: {
          ":userId": userId
        },
        KeyConditionExpression: "userId = :userId",
        TableName: this.tableName
      })
    );

    const items = (response.Items as SubscriptionRecord[] | undefined) ?? [];
    return items.sort(this.sortSubscriptions);
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    input: UpdateSubscriptionInputDto
  ): Promise<SubscriptionRecord | null> {
    const existing = await this.getSubscription(userId, subscriptionId);

    if (!existing) {
      return null;
    }

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

    await this.client.send(
      new PutCommand({
        Item: nextRecord,
        TableName: this.tableName
      })
    );

    return nextRecord;
  }

  private sortSubscriptions(left: SubscriptionRecord, right: SubscriptionRecord) {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    const dateComparison = left.nextPaymentDate.localeCompare(right.nextPaymentDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return left.name.localeCompare(right.name);
  }
}
