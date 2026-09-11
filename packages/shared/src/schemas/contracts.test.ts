import test from "node:test";
import assert from "node:assert/strict";
import {
  createTransactionInputDtoSchema,
  financeWorkspaceSnapshotDtoSchema,
  transactionDtoSchema
} from "../index";
import { createMockWorkspaceSnapshot } from "../mocks";

test("mock workspace snapshot satisfies the shared DTO contract", () => {
  const result = financeWorkspaceSnapshotDtoSchema.safeParse(createMockWorkspaceSnapshot());

  assert.equal(result.success, true);
});

test("transaction DTO rejects backend-only owner fields", () => {
  const snapshot = createMockWorkspaceSnapshot();
  const result = transactionDtoSchema.safeParse({
    ...snapshot.transactions[0],
    ownerUserId: "user_001"
  });

  assert.equal(result.success, false);
});

test("create transaction DTO rejects negative amounts", () => {
  const result = createTransactionInputDtoSchema.safeParse({
    amount: -15,
    categoryName: "Food",
    date: "2026-08-15",
    notes: "",
    paymentMethod: "Card",
    title: "Lunch",
    type: "expense"
  });

  assert.equal(result.success, false);
});
