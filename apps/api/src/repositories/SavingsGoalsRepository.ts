import type {
  CreateSavingsGoalInputDto,
  SavingsGoalRecord,
  UpdateSavingsGoalInputDto
} from "@finance-pilot/shared";

export interface SavingsGoalsRepository {
  createSavingsGoal: (
    userId: string,
    input: CreateSavingsGoalInputDto
  ) => Promise<SavingsGoalRecord>;
  deleteSavingsGoal: (userId: string, goalId: string) => Promise<boolean>;
  getSavingsGoal: (userId: string, goalId: string) => Promise<SavingsGoalRecord | null>;
  listUserSavingsGoals: (userId: string) => Promise<SavingsGoalRecord[]>;
  updateSavingsGoal: (
    userId: string,
    goalId: string,
    input: UpdateSavingsGoalInputDto
  ) => Promise<SavingsGoalRecord | null>;
}
