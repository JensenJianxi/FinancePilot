import test from "node:test";
import assert from "node:assert/strict";
import type { ListTransactionsQueryDto, FinanceWorkspaceSnapshotDto } from "@finance-pilot/shared";
import { createMockWorkspaceSnapshot } from "@finance-pilot/shared/mocks";
import { FinanceReadService } from "./FinanceReadService";
import type { WorkspaceSnapshotRepository } from "../repositories/WorkspaceSnapshotRepository";

class InMemoryWorkspaceSnapshotRepository implements WorkspaceSnapshotRepository {
  constructor(private readonly snapshot: FinanceWorkspaceSnapshotDto) {}

  async getWorkspaceSnapshot() {
    return structuredClone(this.snapshot);
  }

  async listTransactions(query?: ListTransactionsQueryDto) {
    return this.snapshot.transactions.filter((transaction) => {
      if (query?.type && transaction.type !== query.type) {
        return false;
      }

      if (query?.paymentMethod && transaction.paymentMethod !== query.paymentMethod) {
        return false;
      }

      return true;
    });
  }
}

test("FinanceReadService filters transactions through the repository contract", async () => {
  const service = new FinanceReadService(
    new InMemoryWorkspaceSnapshotRepository(createMockWorkspaceSnapshot())
  );

  const expenses = await service.getTransactions({ type: "expense" });

  assert.ok(expenses.length > 0);
  assert.ok(expenses.every((item) => item.type === "expense"));
});
