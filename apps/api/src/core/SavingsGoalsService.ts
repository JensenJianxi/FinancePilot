import type {
  CreateSavingsGoalInputDto,
  SavingsGoalDto,
  SavingsGoalRecord,
  UpdateSavingsGoalInputDto
} from "@finance-pilot/shared";
import {
  createSavingsGoalInputDtoSchema,
  savingsGoalDtoSchema,
  updateSavingsGoalInputDtoSchema
} from "@finance-pilot/shared";
import { AppError } from "../lib/errors";
import type { SavingsGoalsRepository } from "../repositories/SavingsGoalsRepository";

function toSavingsGoalDto(record: SavingsGoalRecord): SavingsGoalDto {
  return savingsGoalDtoSchema.parse({
    currentAmount: record.currentAmount,
    deadline: record.deadline,
    id: record.goalId,
    monthlyContribution: record.monthlyContribution,
    name: record.name,
    predictedCompletion: record.predictedCompletion,
    targetAmount: record.targetAmount
  });
}

export class SavingsGoalsService {
  constructor(private readonly repository: SavingsGoalsRepository) {}

  async createSavingsGoal(userId: string, input: CreateSavingsGoalInputDto) {
    this.assertUserId(userId);
    const validatedInput = createSavingsGoalInputDtoSchema.parse(input);
    const created = await this.repository.createSavingsGoal(userId, validatedInput);
    return toSavingsGoalDto(created);
  }

  async deleteSavingsGoal(userId: string, goalId: string) {
    this.assertUserId(userId);
    this.assertGoalId(goalId);
    const deleted = await this.repository.deleteSavingsGoal(userId, goalId);

    if (!deleted) {
      throw new AppError("Savings goal not found.", "SAVINGS_GOAL_NOT_FOUND", 404);
    }

    return { deleted: true, goalId };
  }

  async getSavingsGoal(userId: string, goalId: string) {
    this.assertUserId(userId);
    this.assertGoalId(goalId);
    const goal = await this.repository.getSavingsGoal(userId, goalId);

    if (!goal) {
      throw new AppError("Savings goal not found.", "SAVINGS_GOAL_NOT_FOUND", 404);
    }

    return toSavingsGoalDto(goal);
  }

  async listSavingsGoals(userId: string) {
    this.assertUserId(userId);
    const goals = await this.repository.listUserSavingsGoals(userId);
    return goals.map(toSavingsGoalDto);
  }

  async updateSavingsGoal(
    userId: string,
    goalId: string,
    input: UpdateSavingsGoalInputDto
  ) {
    this.assertUserId(userId);
    this.assertGoalId(goalId);
    const validatedInput = updateSavingsGoalInputDtoSchema.parse(input);
    const updated = await this.repository.updateSavingsGoal(userId, goalId, validatedInput);

    if (!updated) {
      throw new AppError("Savings goal not found.", "SAVINGS_GOAL_NOT_FOUND", 404);
    }

    return toSavingsGoalDto(updated);
  }

  private assertGoalId(goalId: string) {
    if (!goalId.trim()) {
      throw new AppError("Savings goal ID is required.", "SAVINGS_GOAL_ID_REQUIRED", 400);
    }
  }

  private assertUserId(userId: string) {
    if (!userId.trim()) {
      throw new AppError("Authenticated user is required.", "UNAUTHORIZED", 401);
    }
  }
}
