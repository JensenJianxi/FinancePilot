import type {
  BudgetDto,
  BudgetRecord,
  CreateBudgetInputDto,
  UpdateBudgetInputDto
} from "@finance-pilot/shared";
import {
  budgetDtoSchema,
  createBudgetInputDtoSchema,
  updateBudgetInputDtoSchema
} from "@finance-pilot/shared";
import { AppError } from "../lib/errors";
import type { BudgetsRepository } from "../repositories/BudgetsRepository";

function toBudgetDto(record: BudgetRecord): BudgetDto {
  const scope = record.scope ?? "overall";

  return budgetDtoSchema.parse({
    category: scope === "overall" ? "All expenses" : record.categoryName ?? "Uncategorized",
    categoryId: record.categoryId,
    id: record.budgetId,
    limit: record.limit,
    name: record.name ?? record.categoryName ?? "Monthly budget",
    periodMonth: record.periodMonth,
    recurrence: record.recurrence ?? "monthly",
    scope,
    spent: record.spent,
    trend: record.trend
  });
}

export class BudgetsService {
  constructor(private readonly repository: BudgetsRepository) {}

  async createBudget(userId: string, input: CreateBudgetInputDto): Promise<BudgetDto> {
    this.assertUserId(userId);
    const validatedInput = createBudgetInputDtoSchema.parse(input);
    const created = await this.repository.createBudget(userId, validatedInput);

    return toBudgetDto(created);
  }

  async deleteBudget(userId: string, budgetId: string) {
    this.assertUserId(userId);
    this.assertBudgetId(budgetId);
    const deleted = await this.repository.deleteBudget(userId, budgetId);

    if (!deleted) {
      throw new AppError("Budget not found.", "BUDGET_NOT_FOUND", 404);
    }

    return {
      budgetId,
      deleted: true
    };
  }

  async getBudget(userId: string, budgetId: string): Promise<BudgetDto> {
    this.assertUserId(userId);
    this.assertBudgetId(budgetId);
    const budget = await this.repository.getBudget(userId, budgetId);

    if (!budget) {
      throw new AppError("Budget not found.", "BUDGET_NOT_FOUND", 404);
    }

    return toBudgetDto(budget);
  }

  async listBudgets(userId: string): Promise<BudgetDto[]> {
    this.assertUserId(userId);
    const budgets = await this.repository.listUserBudgets(userId);

    return budgets.map(toBudgetDto);
  }

  async updateBudget(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInputDto
  ): Promise<BudgetDto> {
    this.assertUserId(userId);
    this.assertBudgetId(budgetId);
    const validatedInput = updateBudgetInputDtoSchema.parse(input);
    const existing = await this.repository.getBudget(userId, budgetId);

    if (!existing) {
      throw new AppError("Budget not found.", "BUDGET_NOT_FOUND", 404);
    }

    const scope = validatedInput.scope ?? existing.scope ?? "overall";
    createBudgetInputDtoSchema.parse({
      categoryId: validatedInput.categoryId ?? existing.categoryId,
      categoryName: validatedInput.categoryName ?? existing.categoryName,
      limit: validatedInput.limit ?? existing.limit,
      name: validatedInput.name ?? existing.name,
      periodMonth: validatedInput.periodMonth ?? existing.periodMonth,
      recurrence: validatedInput.recurrence ?? existing.recurrence ?? "monthly",
      scope
    });
    const updated = await this.repository.updateBudget(userId, budgetId, validatedInput);

    if (!updated) {
      throw new AppError("Budget not found.", "BUDGET_NOT_FOUND", 404);
    }

    return toBudgetDto(updated);
  }

  private assertBudgetId(budgetId: string) {
    if (!budgetId.trim()) {
      throw new AppError("Budget ID is required.", "BUDGET_ID_REQUIRED", 400);
    }
  }

  private assertUserId(userId: string) {
    if (!userId.trim()) {
      throw new AppError("Authenticated user is required.", "UNAUTHORIZED", 401);
    }
  }
}
