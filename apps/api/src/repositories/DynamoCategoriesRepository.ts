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
  CategoryRecord,
  CreateCategoryInputDto,
  UpdateCategoryInputDto
} from "@finance-pilot/shared";
import type { CategoriesRepository, DefaultCategorySeed } from "./CategoriesRepository";

export interface DynamoCategoriesRepositoryOptions {
  client?: DynamoDBDocumentClient;
  tableName: string;
}

export class DynamoCategoriesRepository implements CategoriesRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: DynamoCategoriesRepositoryOptions) {
    this.client =
      options.client ??
      DynamoDBDocumentClient.from(
        new DynamoDBClient({})
      );
    this.tableName = options.tableName;
  }

  async createCategory(userId: string, input: CreateCategoryInputDto): Promise<CategoryRecord> {
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

    await this.client.send(
      new PutCommand({
        Item: record,
        TableName: this.tableName
      })
    );

    return record;
  }

  async deleteCategory(userId: string, categoryId: string): Promise<boolean> {
    const existing = await this.getCategory(userId, categoryId);

    if (!existing) {
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        Key: {
          categoryId,
          userId
        },
        TableName: this.tableName
      })
    );

    return true;
  }

  async getCategory(userId: string, categoryId: string): Promise<CategoryRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        Key: {
          categoryId,
          userId
        },
        TableName: this.tableName
      })
    );

    return (response.Item as CategoryRecord | undefined) ?? null;
  }

  async listUserCategories(userId: string): Promise<CategoryRecord[]> {
    const response = await this.client.send(
      new QueryCommand({
        ExpressionAttributeValues: {
          ":userId": userId
        },
        KeyConditionExpression: "userId = :userId",
        TableName: this.tableName
      })
    );

    const items = (response.Items as CategoryRecord[] | undefined) ?? [];
    return items.sort(this.sortCategories);
  }

  async seedDefaultCategories(userId: string, seeds: DefaultCategorySeed[]): Promise<void> {
    await Promise.all(
      seeds.map(async (seed) => {
        const timestamp = new Date().toISOString();
        const record: CategoryRecord = {
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
        };

        try {
          await this.client.send(
            new PutCommand({
              ConditionExpression: "attribute_not_exists(categoryId)",
              Item: record,
              TableName: this.tableName
            })
          );
        } catch (error) {
          if (
            typeof error === "object" &&
            error &&
            "name" in error &&
            error.name === "ConditionalCheckFailedException"
          ) {
            return;
          }

          throw error;
        }
      })
    );
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInputDto
  ): Promise<CategoryRecord | null> {
    const existing = await this.getCategory(userId, categoryId);

    if (!existing) {
      return null;
    }

    const nextRecord: CategoryRecord = {
      ...existing,
      icon: input.icon ?? existing.icon,
      name: input.name ?? existing.name,
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
}
