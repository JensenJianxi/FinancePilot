import assert from "node:assert/strict";
import test from "node:test";
import type { Budget, Transaction } from "@finance-pilot/shared";
import {
  calculateBudgetSpend,
  enrichBudgetsWithTransactions,
  getBudgetEffectiveMonth,
  isBudgetActiveForMonth
} from "./budgets";

const recurringBudget: Budget = {
  category: "All expenses",
  id: "budget-1",
  limit: 1000,
  name: "Monthly spending",
  periodMonth: "2026-08",
  recurrence: "monthly",
  scope: "overall",
  spent: 0,
  trend: "healthy"
};

function createTransaction(
  id: string,
  amount: number,
  date: string,
  type: Transaction["type"] = "expense"
): Transaction {
  return {
    amount,
    category: "Food",
    date,
    id,
    notes: "",
    paymentMethod: "Not specified",
    title: id,
    type
  };
}

test("recurring overall budgets include every expense in the current month", () => {
  const spent = calculateBudgetSpend(
    recurringBudget,
    [
      createTransaction("food", 100, "2026-09-01"),
      createTransaction("transport", 50, "2026-09-02"),
      createTransaction("income", 500, "2026-09-03", "income"),
      createTransaction("old", 75, "2026-08-20")
    ],
    "2026-09"
  );

  assert.equal(spent, 150);
  assert.equal(isBudgetActiveForMonth(recurringBudget, "2026-09"), true);
});

test("one-month budgets do not roll into later months", () => {
  assert.equal(
    isBudgetActiveForMonth({ ...recurringBudget, recurrence: "once" }, "2026-09"),
    false
  );
});

test("the current budget list rolls recurring budgets forward and hides expired budgets", () => {
  const transactions = [
    createTransaction("current", 125, "2026-09-02"),
    createTransaction("previous", 400, "2026-08-20")
  ];
  const budgets = enrichBudgetsWithTransactions(
    [recurringBudget, { ...recurringBudget, id: "budget-once", recurrence: "once" }],
    transactions,
    "2026-09"
  );

  assert.equal(budgets.length, 1);
  assert.equal(budgets[0]?.id, recurringBudget.id);
  assert.equal(budgets[0]?.spent, 125);
  assert.equal(getBudgetEffectiveMonth(recurringBudget, "2026-09"), "2026-09");
});
