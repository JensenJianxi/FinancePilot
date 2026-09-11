import test from "node:test";
import assert from "node:assert/strict";
import type {
  CreateSavingsGoalInputDto,
  SavingsGoalRecord,
  UpdateSavingsGoalInputDto
} from "@finance-pilot/shared";
import type { SavingsGoalsRepository } from "../repositories";
import { SavingsGoalsService } from "./SavingsGoalsService";

class InMemorySavingsGoalsRepository implements SavingsGoalsRepository {
  private readonly items = new Map<string, SavingsGoalRecord[]>();

  async createSavingsGoal(
    userId: string,
    input: CreateSavingsGoalInputDto
  ): Promise<SavingsGoalRecord> {
    const timestamp = "2026-08-27T00:00:00.000Z";
    const record: SavingsGoalRecord = {
      ...input,
      createdAt: timestamp,
      entityType: "savingsGoal",
      goalId: `goal_${this.getItems(userId).length + 1}`,
      ownerUserId: userId,
      predictedCompletion: "2027-06-27",
      updatedAt: timestamp,
      userId,
      version: 1
    };
    this.items.set(userId, [...this.getItems(userId), record]);
    return record;
  }

  async deleteSavingsGoal(userId: string, goalId: string): Promise<boolean> {
    const current = this.getItems(userId);
    const next = current.filter((item) => item.goalId !== goalId);
    this.items.set(userId, next);
    return next.length !== current.length;
  }

  async getSavingsGoal(userId: string, goalId: string) {
    return this.getItems(userId).find((item) => item.goalId === goalId) ?? null;
  }

  async listUserSavingsGoals(userId: string) {
    return this.getItems(userId);
  }

  async updateSavingsGoal(
    userId: string,
    goalId: string,
    input: UpdateSavingsGoalInputDto
  ) {
    const current = this.getItems(userId);
    const index = current.findIndex((item) => item.goalId === goalId);

    if (index < 0) {
      return null;
    }

    const updated = {
      ...current[index]!,
      ...input,
      updatedAt: "2026-08-27T01:00:00.000Z"
    };
    const next = [...current];
    next[index] = updated;
    this.items.set(userId, next);
    return updated;
  }

  private getItems(userId: string) {
    return this.items.get(userId) ?? [];
  }
}

const validGoal: CreateSavingsGoalInputDto = {
  currentAmount: 1000,
  deadline: "2027-12-31",
  monthlyContribution: 400,
  name: "Emergency fund",
  targetAmount: 5000
};

test("SavingsGoalsService manages goals within the authenticated user", async () => {
  const service = new SavingsGoalsService(new InMemorySavingsGoalsRepository());
  const created = await service.createSavingsGoal("user_a", validGoal);

  assert.equal(created.name, "Emergency fund");
  assert.equal((await service.listSavingsGoals("user_b")).length, 0);
  assert.equal((await service.getSavingsGoal("user_a", created.id)).id, created.id);

  const updated = await service.updateSavingsGoal("user_a", created.id, {
    currentAmount: 1800
  });
  assert.equal(updated.currentAmount, 1800);

  await assert.rejects(
    () => service.updateSavingsGoal("user_b", created.id, { currentAmount: 2000 }),
    /Savings goal not found/
  );

  assert.deepEqual(await service.deleteSavingsGoal("user_a", created.id), {
    deleted: true,
    goalId: created.id
  });
});

test("SavingsGoalsService validates amounts and calendar dates", async () => {
  const service = new SavingsGoalsService(new InMemorySavingsGoalsRepository());

  await assert.rejects(
    () => service.createSavingsGoal("user_a", { ...validGoal, targetAmount: 0 }),
    /Too small/
  );
  await assert.rejects(
    () => service.createSavingsGoal("user_a", { ...validGoal, currentAmount: -1 }),
    /Too small/
  );
  await assert.rejects(
    () => service.createSavingsGoal("user_a", { ...validGoal, deadline: "2027-02-30" }),
    /valid calendar date/
  );
});
