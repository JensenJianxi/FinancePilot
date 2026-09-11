import test from "node:test";
import assert from "node:assert/strict";
import type {
  CreateSubscriptionInputDto,
  SubscriptionRecord,
  UpdateSubscriptionInputDto
} from "@finance-pilot/shared";
import type { SubscriptionsRepository } from "../repositories";
import { SubscriptionsService } from "./SubscriptionsService";

class InMemorySubscriptionsRepository implements SubscriptionsRepository {
  private readonly items = new Map<string, SubscriptionRecord[]>();

  async createSubscription(
    userId: string,
    input: CreateSubscriptionInputDto
  ): Promise<SubscriptionRecord> {
    const timestamp = "2026-08-27T00:00:00.000Z";
    const record: SubscriptionRecord = {
      ...input,
      createdAt: timestamp,
      entityType: "subscription",
      subscriptionId: `sub_${this.getItems(userId).length + 1}`,
      updatedAt: timestamp,
      userId,
      version: 1
    };
    this.items.set(userId, [...this.getItems(userId), record]);
    return record;
  }

  async deleteSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const current = this.getItems(userId);
    const next = current.filter((item) => item.subscriptionId !== subscriptionId);
    this.items.set(userId, next);
    return next.length !== current.length;
  }

  async getSubscription(userId: string, subscriptionId: string): Promise<SubscriptionRecord | null> {
    return this.getItems(userId).find((item) => item.subscriptionId === subscriptionId) ?? null;
  }

  async listUserSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
    return this.getItems(userId);
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    input: UpdateSubscriptionInputDto
  ): Promise<SubscriptionRecord | null> {
    const current = this.getItems(userId);
    const index = current.findIndex((item) => item.subscriptionId === subscriptionId);

    if (index < 0) {
      return null;
    }

    const nextRecord: SubscriptionRecord = {
      ...current[index]!,
      ...input,
      updatedAt: "2026-08-27T01:00:00.000Z"
    };
    const next = [...current];
    next[index] = nextRecord;
    this.items.set(userId, next);
    return nextRecord;
  }

  private getItems(userId: string) {
    return this.items.get(userId) ?? [];
  }
}

const validSubscription: CreateSubscriptionInputDto = {
  active: true,
  amount: 55,
  autoCreateTransaction: false,
  categoryId: "cat_bills",
  categoryName: "Bills",
  frequency: "monthly",
  name: "Netflix",
  nextPaymentDate: "2026-09-01",
  paymentMethod: "Card"
};

test("SubscriptionsService manages user-scoped recurring costs", async () => {
  const service = new SubscriptionsService(new InMemorySubscriptionsRepository());
  const created = await service.createSubscription("user_a", validSubscription);

  assert.equal(created.name, "Netflix");
  assert.equal((await service.listSubscriptions("user_b")).length, 0);

  const updated = await service.updateSubscription("user_a", created.id, {
    active: false,
    amount: 60
  });
  assert.equal(updated.active, false);
  assert.equal(updated.amount, 60);

  await assert.rejects(
    () => service.updateSubscription("user_b", created.id, { active: false }),
    /Subscription not found/
  );

  const deleted = await service.deleteSubscription("user_a", created.id);
  assert.deepEqual(deleted, {
    deleted: true,
    subscriptionId: created.id
  });
});

test("SubscriptionsService validates amount, date, and recurrence", async () => {
  const service = new SubscriptionsService(new InMemorySubscriptionsRepository());

  await assert.rejects(
    () => service.createSubscription("user_a", { ...validSubscription, amount: 0 }),
    /Too small/
  );
  await assert.rejects(
    () => service.createSubscription("user_a", { ...validSubscription, nextPaymentDate: "01-09-2026" }),
    /Expected YYYY-MM-DD/
  );
  await assert.rejects(
    () => service.createSubscription("user_a", { ...validSubscription, nextPaymentDate: "2026-02-30" }),
    /valid calendar date/
  );
  await assert.rejects(
    () => service.createSubscription("user_a", {
      ...validSubscription,
      frequency: "daily" as CreateSubscriptionInputDto["frequency"]
    }),
    /Invalid option/
  );
});
