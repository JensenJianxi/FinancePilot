import { z } from "zod";
import {
  budgetDtoSchema,
  createBudgetInputDtoSchema,
  updateBudgetInputDtoSchema,
  type Budget,
  type BudgetDto,
  type CreateBudgetInputDto,
  type UpdateBudgetInputDto
} from "@finance-pilot/shared";
import { hasConfiguredApiBaseUrl, requestApi } from "./financeApi";

const deleteBudgetResponseSchema = z.object({
  budgetId: z.string().min(1),
  deleted: z.boolean()
});

function toBudget(budget: BudgetDto): Budget {
  return budgetDtoSchema.parse(budget);
}

export function isBudgetsApiEnabled() {
  return hasConfiguredApiBaseUrl();
}

export async function listBudgets(): Promise<Budget[]> {
  const response = await requestApi<BudgetDto[]>("/budgets");
  return response.map((item) => toBudget(item));
}

export async function createBudget(input: CreateBudgetInputDto): Promise<Budget> {
  const payload = createBudgetInputDtoSchema.parse(input);
  const response = await requestApi<BudgetDto>("/budgets", {
    body: JSON.stringify(payload),
    method: "POST"
  });

  return toBudget(response);
}

export async function updateBudget(
  budgetId: string,
  input: UpdateBudgetInputDto
): Promise<Budget> {
  const payload = updateBudgetInputDtoSchema.parse(input);
  const response = await requestApi<BudgetDto>(`/budgets/${encodeURIComponent(budgetId)}`, {
    body: JSON.stringify(payload),
    method: "PATCH"
  });

  return toBudget(response);
}

export async function deleteBudget(budgetId: string): Promise<{ budgetId: string; deleted: boolean }> {
  const response = await requestApi<{ budgetId: string; deleted: boolean }>(
    `/budgets/${encodeURIComponent(budgetId)}`,
    {
      method: "DELETE"
    }
  );

  return deleteBudgetResponseSchema.parse(response);
}
