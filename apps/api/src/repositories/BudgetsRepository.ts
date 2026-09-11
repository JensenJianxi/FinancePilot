import type {
  BudgetRecord,
  CreateBudgetInputDto,
  UpdateBudgetInputDto
} from "@finance-pilot/shared";

export interface BudgetsRepository {
  createBudget: (userId: string, input: CreateBudgetInputDto) => Promise<BudgetRecord>;
  deleteBudget: (userId: string, budgetId: string) => Promise<boolean>;
  getBudget: (userId: string, budgetId: string) => Promise<BudgetRecord | null>;
  listUserBudgets: (userId: string) => Promise<BudgetRecord[]>;
  updateBudget: (
    userId: string,
    budgetId: string,
    input: UpdateBudgetInputDto
  ) => Promise<BudgetRecord | null>;
}
