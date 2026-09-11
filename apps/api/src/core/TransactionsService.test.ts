import test from "node:test";
import assert from "node:assert/strict";
import type {
  CreateTransactionRequestDto,
  ListTransactionsQueryDto,
  TransactionRecord,
  UpdateTransactionRequestDto
} from "@finance-pilot/shared";
import { TransactionsService } from "./TransactionsService";
import type { TransactionsRepository } from "../repositories";

class InMemoryTransactionsRepository implements TransactionsRepository {
  private readonly items = new Map<string, TransactionRecord[]>();

  async createTransaction(userId: string, input: CreateTransactionRequestDto): Promise<TransactionRecord> {
    const timestamp = "2026-08-18T00:00:00.000Z";
    const record: TransactionRecord = {
      amount: input.amount,
      category: input.category,
      createdAt: timestamp,
      entityType: "transaction",
      note: input.note,
      paymentMethod: input.paymentMethod,
      title: input.title,
      transactionDate: input.transactionDate,
      transactionId: `txn_${this.getUserTransactions(userId).length + 1}`,
      type: input.type,
      updatedAt: timestamp,
      userId,
      version: 1
    };

    this.items.set(userId, [record, ...this.getUserTransactions(userId)]);
    return record;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const existing = this.getUserTransactions(userId);
    const next = existing.filter((item) => item.transactionId !== transactionId);
    this.items.set(userId, next);
    return next.length !== existing.length;
  }

  async getTransaction(userId: string, transactionId: string): Promise<TransactionRecord | null> {
    return this.getUserTransactions(userId).find((item) => item.transactionId === transactionId) ?? null;
  }

  async listUserTransactions(userId: string, query?: ListTransactionsQueryDto): Promise<TransactionRecord[]> {
    return this.getUserTransactions(userId).filter((item) => {
      if (query?.type && item.type !== query.type) {
        return false;
      }

      const categoryFilter = query?.category ?? query?.categoryName;

      if (categoryFilter && item.category !== categoryFilter) {
        return false;
      }

      if (query?.paymentMethod && item.paymentMethod !== query.paymentMethod) {
        return false;
      }

      if (query?.month && !item.transactionDate.startsWith(query.month)) {
        return false;
      }

      return true;
    });
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    input: UpdateTransactionRequestDto
  ): Promise<TransactionRecord | null> {
    const items = this.getUserTransactions(userId);
    const index = items.findIndex((item) => item.transactionId === transactionId);

    if (index < 0) {
      return null;
    }

    const existing = items[index]!;
    const nextRecord: TransactionRecord = {
      ...existing,
      amount: input.amount ?? existing.amount,
      category: input.category ?? existing.category,
      note: input.note ?? existing.note,
      paymentMethod: input.paymentMethod ?? existing.paymentMethod,
      title: input.title ?? existing.title,
      transactionDate: input.transactionDate ?? existing.transactionDate,
      type: input.type ?? existing.type,
      updatedAt: "2026-08-18T01:00:00.000Z"
    };
    const nextItems = [...items];
    nextItems[index] = nextRecord;
    this.items.set(userId, nextItems);
    return nextRecord;
  }

  private getUserTransactions(userId: string) {
    return this.items.get(userId) ?? [];
  }
}

test("TransactionsService creates, lists, updates, and deletes user-scoped transactions", async () => {
  const service = new TransactionsService(new InMemoryTransactionsRepository());

  const created = await service.createTransaction("user_123", {
    amount: 48.5,
    category: "Food",
    note: "Lunch",
    paymentMethod: "Card",
    title: "Lunch at office",
    transactionDate: "2026-08-18",
    type: "expense"
  });

  assert.equal(created.category, "Food");

  const listed = await service.listTransactions("user_123", { type: "expense" });
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.transactionId, created.transactionId);

  const updated = await service.updateTransaction("user_123", created.transactionId, {
    category: "Dining",
    note: "Team lunch"
  });

  assert.equal(updated.category, "Dining");
  assert.equal(updated.note, "Team lunch");

  const deleted = await service.deleteTransaction("user_123", created.transactionId);
  assert.deepEqual(deleted, {
    deleted: true,
    transactionId: created.transactionId
  });

  const afterDelete = await service.listTransactions("user_123");
  assert.equal(afterDelete.length, 0);
});
