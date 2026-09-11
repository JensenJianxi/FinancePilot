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
  CreateTransactionRequestDto,
  ListTransactionsQueryDto,
  TransactionRecord,
  UpdateTransactionRequestDto
} from "@finance-pilot/shared";
import type { TransactionsRepository } from "./TransactionsRepository";

export interface DynamoTransactionsRepositoryOptions {
  client?: DynamoDBDocumentClient;
  tableName: string;
}

export class DynamoTransactionsRepository implements TransactionsRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: DynamoTransactionsRepositoryOptions) {
    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({})
      );
    this.tableName = options.tableName;
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
      transactionId: `txn_${randomUUID()}`,
      transactionDate: input.transactionDate,
      type: input.type,
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

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const existing = await this.getTransaction(userId, transactionId);

    if (!existing) {
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        Key: {
          transactionId,
          userId
        },
        TableName: this.tableName
      })
    );

    return true;
  }

  async getTransaction(userId: string, transactionId: string): Promise<TransactionRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        Key: {
          transactionId,
          userId
        },
        TableName: this.tableName
      })
    );

    return (response.Item as TransactionRecord | undefined) ?? null;
  }

  async listUserTransactions(userId: string, query?: ListTransactionsQueryDto): Promise<TransactionRecord[]> {
    const response = await this.client.send(
      new QueryCommand({
        ExpressionAttributeValues: {
          ":userId": userId
        },
        KeyConditionExpression: "userId = :userId",
        TableName: this.tableName
      })
    );

    const items = (response.Items as TransactionRecord[] | undefined) ?? [];

    return items
      .filter((item) => {
        if (query?.type && item.type !== query.type) {
          return false;
        }

        const categoryFilter = query?.category ?? query?.categoryName;

        if (categoryFilter && item.category !== categoryFilter) {
          return false;
        }

        if (query?.paymentMethod && item.paymentMethod !== query.paymentMethod) {
          return false;
        }

        if (query?.month && !item.transactionDate.startsWith(query.month)) {
          return false;
        }

        return true;
      })
      .sort(this.sortTransactions);
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateTransactionRequestDto
  ): Promise<TransactionRecord | null> {
    const existing = await this.getTransaction(userId, transactionId);

    if (!existing) {
      return null;
    }

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

    await this.client.send(
      new PutCommand({
        Item: nextRecord,
        TableName: this.tableName
      })
    );

    return nextRecord;
  }

  private sortTransactions(left: TransactionRecord, right: TransactionRecord) {
    const dateComparison = right.transactionDate.localeCompare(left.transactionDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return right.createdAt.localeCompare(left.createdAt);
  }
}
