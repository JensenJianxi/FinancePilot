import assert from "node:assert/strict";
import test from "node:test";
import type { BudgetRecord } from "@finance-pilot/shared";
import type { BudgetsRepository } from "../repositories/BudgetsRepository";
import { BudgetsService } from "./BudgetsService";

const timestamp = "2026-08-01T00:00:00.000Z";

const legacyBudget: BudgetRecord = {
  budgetId: "budget-legacy",
  createdAt: timestamp,
  entityType: "budget",
  limit: 1500,
  name: "Monthly Budget",
  ownerUserId: "user-1",
  periodMonth: "2026-08",
  spent: 0,
  trend: "healthy",
  updatedAt: timestamp,
  userId: "user-1",
  version: 1
};

const repository: BudgetsRepository = {
  createBudget: async () => legacyBudget,
  deleteBudget: async () => false,
  getBudget: async () => legacyBudget,
  listUserBudgets: async () => [legacyBudget],
  updateBudget: async () => legacyBudget
};

test("BudgetsService treats records created before recurrence as monthly", async () => {
  const service = new BudgetsService(repository);
  const budgets = await service.listBudgets("user-1");

  assert.equal(budgets[0]?.recurrence, "monthly");
  assert.equal(budgets[0]?.scope, "overall");
});
