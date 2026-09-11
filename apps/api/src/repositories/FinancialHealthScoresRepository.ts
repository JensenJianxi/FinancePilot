import type { FinancialHealthScoreDto, FinancialHealthScoreRecord } from "@finance-pilot/shared";

export interface FinancialHealthScoresRepository {
  saveLatestScore: (
    userId: string,
    score: FinancialHealthScoreDto
  ) => Promise<FinancialHealthScoreRecord>;
}
