import assert from "node:assert/strict";
import test from "node:test";
import type { Category } from "@finance-pilot/shared";
import { inferCategoryFromTitle } from "./categoryInference";

const categories: Category[] = [
  { id: "bills", isDefault: true, name: "Bills", type: "expense" },
  { id: "entertainment", isDefault: true, name: "Entertainment", type: "expense" },
  { id: "food", isDefault: true, name: "Food", type: "expense" },
  { id: "transport", isDefault: true, name: "Transport", type: "expense" },
  { id: "salary", isDefault: true, name: "Salary", type: "income" }
];

test("infers transport from refuelling words", () => {
  assert.equal(inferCategoryFromTitle("Refuel car", categories, "expense"), "Transport");
});

test("infers food from common dining words", () => {
  assert.equal(inferCategoryFromTitle("BBQ restaurant", categories, "expense"), "Food");
  assert.equal(inferCategoryFromTitle("Afternoon snacks", categories, "expense"), "Food");
  assert.equal(inferCategoryFromTitle("Cold drink", categories, "expense"), "Food");
});

test("infers entertainment from movie titles", () => {
  assert.equal(inferCategoryFromTitle("Movie tickets", categories, "expense"), "Entertainment");
  assert.equal(inferCategoryFromTitle("Badminton court", categories, "expense"), "Entertainment");
  assert.equal(inferCategoryFromTitle("Weekend golf", categories, "expense"), "Entertainment");
  assert.equal(inferCategoryFromTitle("Cinema", categories, "expense"), "Entertainment");
});

test("infers bills from TNG topups", () => {
  assert.equal(inferCategoryFromTitle("TNG Topup", categories, "expense"), "Bills");
});

test("uses the available income category", () => {
  assert.equal(inferCategoryFromTitle("Monthly salary", categories, "income"), "Salary");
});

test("does not invent a category that the user does not have", () => {
  const categoriesWithoutHealthcare = categories.filter((category) => category.name !== "Healthcare");
  assert.equal(inferCategoryFromTitle("Dental appointment", categoriesWithoutHealthcare, "expense"), null);
});
