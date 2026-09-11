import { z } from "zod";
import {
  createSavingsGoalInputDtoSchema,
  savingsGoalDtoSchema,
  updateSavingsGoalInputDtoSchema,
  type CreateSavingsGoalInputDto,
  type SavingGoal,
  type SavingsGoalDto,
  type UpdateSavingsGoalInputDto
} from "@finance-pilot/shared";
import { hasConfiguredApiBaseUrl, requestApi } from "./financeApi";

const deleteSavingsGoalResponseSchema = z.object({
  deleted: z.boolean(),
  goalId: z.string().min(1)
});

function toSavingsGoal(goal: SavingsGoalDto): SavingGoal {
  return savingsGoalDtoSchema.parse(goal);
}

export function isSavingsGoalsApiEnabled() {
  return hasConfiguredApiBaseUrl();
}

export async function listSavingsGoals(): Promise<SavingGoal[]> {
  const response = await requestApi<SavingsGoalDto[]>("/goals");
  return response.map(toSavingsGoal);
}

export async function createSavingsGoal(
  input: CreateSavingsGoalInputDto
): Promise<SavingGoal> {
  const payload = createSavingsGoalInputDtoSchema.parse(input);
  const response = await requestApi<SavingsGoalDto>("/goals", {
    body: JSON.stringify(payload),
    method: "POST"
  });
  return toSavingsGoal(response);
}

export async function updateSavingsGoal(
  goalId: string,
  input: UpdateSavingsGoalInputDto
): Promise<SavingGoal> {
  const payload = updateSavingsGoalInputDtoSchema.parse(input);
  const response = await requestApi<SavingsGoalDto>(`/goals/${encodeURIComponent(goalId)}`, {
    body: JSON.stringify(payload),
    method: "PATCH"
  });
  return toSavingsGoal(response);
}

export async function deleteSavingsGoal(goalId: string) {
  const response = await requestApi<{ deleted: boolean; goalId: string }>(
    `/goals/${encodeURIComponent(goalId)}`,
    { method: "DELETE" }
  );
  return deleteSavingsGoalResponseSchema.parse(response);
}
