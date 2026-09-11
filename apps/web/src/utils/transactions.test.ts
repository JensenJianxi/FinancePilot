import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "@finance-pilot/shared";
import { getHighestSpendingTitle, sortExpensesByAmount } from "./transactions";

function transaction(id: string, title: string, amount: number, date = "2026-08-20"): Transaction {
  return {
    amount,
    category: "Transport",
    date,
    id,
    notes: "",
    paymentMethod: "Not specified",
    title,
    type: "expense"
  };
}

test("highest spending groups title casing and common aliases within the month", () => {
  const result = getHighestSpendingTitle(
    [
      transaction("food-1", "Food", 20),
      transaction("food-2", "food", 10),
      transaction("fuel-1", "Car refuel", 40),
      transaction("fuel-2", "refuel", 35),
      transaction("old", "Large old expense", 500, "2026-07-20")
    ],
    "2026-08"
  );

  assert.deepEqual(result, { amount: 75, title: "Refuel" });
});

test("all-time expense ranking excludes income and sorts highest amount first", () => {
  const income = { ...transaction("income", "Salary", 5000), type: "income" as const };
  const result = sortExpensesByAmount([
    transaction("small", "Coffee", 8, "2026-08-20"),
    transaction("large", "Annual insurance", 900, "2026-01-10"),
    income,
    transaction("medium", "Groceries", 120, "2026-08-29")
  ]);

  assert.deepEqual(result.map((item) => item.id), ["large", "medium", "small"]);
});

test("monthly expense ranking excludes previous months", () => {
  const result = sortExpensesByAmount(
    [
      transaction("current-small", "Coffee", 8, "2026-08-20"),
      transaction("previous-large", "Old purchase", 900, "2026-07-10"),
      transaction("current-large", "Groceries", 120, "2026-08-29")
    ],
    "2026-08"
  );

  assert.deepEqual(result.map((item) => item.id), ["current-large", "current-small"]);
});
