import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { FinancialHealthScoreDto, FinancialHealthScoreRecord } from "@finance-pilot/shared";
import type { FinancialHealthScoresRepository } from "./FinancialHealthScoresRepository";

export interface DynamoFinancialHealthScoresRepositoryOptions {
  client?: DynamoDBDocumentClient;
  tableName: string;
}

export class DynamoFinancialHealthScoresRepository implements FinancialHealthScoresRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: DynamoFinancialHealthScoresRepositoryOptions) {
    this.client =
      options.client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.tableName = options.tableName;
  }

  async saveLatestScore(
    userId: string,
    score: FinancialHealthScoreDto
  ): Promise<FinancialHealthScoreRecord> {
    const record: FinancialHealthScoreRecord = {
      calculatedAt: score.calculatedAt,
      createdAt: score.calculatedAt,
      dataStatus: score.dataStatus,
      entityType: "financialHealthScore",
      factors: score.factors,
      ownerUserId: userId,
      periodMonth: score.periodMonth,
      rating: score.rating,
      score: score.score,
      scoreId: score.id,
      updatedAt: score.calculatedAt,
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
}
