import test from "node:test";
import assert from "node:assert/strict";
import type {
  CategoryRecord,
  CreateCategoryInputDto,
  UpdateCategoryInputDto
} from "@finance-pilot/shared";
import { CategoriesService } from "./CategoriesService";
import type { CategoriesRepository, DefaultCategorySeed } from "../repositories";

class InMemoryCategoriesRepository implements CategoriesRepository {
  private readonly items = new Map<string, CategoryRecord[]>();

  async createCategory(userId: string, input: CreateCategoryInputDto): Promise<CategoryRecord> {
    const timestamp = "2026-08-20T00:00:00.000Z";
    const record: CategoryRecord = {
      categoryId: `cat_${this.getUserCategories(userId).length + 1}`,
      createdAt: timestamp,
      entityType: "category",
      icon: input.icon,
      isDefault: false,
      name: input.name,
      type: input.type,
      updatedAt: timestamp,
      userId,
      version: 1
    };

    this.items.set(userId, [record, ...this.getUserCategories(userId)]);
    return record;
  }

  async deleteCategory(userId: string, categoryId: string): Promise<boolean> {
    const existing = this.getUserCategories(userId);
    const next = existing.filter((item) => item.categoryId !== categoryId);
    this.items.set(userId, next);
    return next.length !== existing.length;
  }

  async getCategory(userId: string, categoryId: string): Promise<CategoryRecord | null> {
    return this.getUserCategories(userId).find((item) => item.categoryId === categoryId) ?? null;
  }

  async listUserCategories(userId: string): Promise<CategoryRecord[]> {
    return this.getUserCategories(userId);
  }

  async seedDefaultCategories(userId: string, seeds: DefaultCategorySeed[]): Promise<void> {
    const existing = this.getUserCategories(userId);
    const seen = new Set(existing.map((category) => category.categoryId));
    const next = [...existing];

    for (const seed of seeds) {
      if (seen.has(seed.categoryId)) {
        continue;
      }

      next.push({
        categoryId: seed.categoryId,
        createdAt: "2026-08-20T00:00:00.000Z",
        entityType: "category",
        icon: seed.icon,
        isDefault: true,
        name: seed.name,
        type: seed.type,
        updatedAt: "2026-08-20T00:00:00.000Z",
        userId,
        version: 1
      });
    }

    this.items.set(userId, next);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInputDto
  ): Promise<CategoryRecord | null> {
    const items = this.getUserCategories(userId);
    const index = items.findIndex((item) => item.categoryId === categoryId);

    if (index < 0) {
      return null;
    }

    const existing = items[index]!;
    const nextRecord: CategoryRecord = {
      ...existing,
      icon: input.icon ?? existing.icon,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      updatedAt: "2026-08-20T01:00:00.000Z"
    };
    const nextItems = [...items];
    nextItems[index] = nextRecord;
    this.items.set(userId, nextItems);
    return nextRecord;
  }

  private getUserCategories(userId: string) {
    return this.items.get(userId) ?? [];
  }
}

test("CategoriesService seeds defaults once and manages custom categories per user", async () => {
  const service = new CategoriesService(new InMemoryCategoriesRepository());

  const seeded = await service.listCategories("user_123");
  assert.equal(seeded.filter((category) => category.isDefault).length >= 1, true);

  const seededAgain = await service.listCategories("user_123");
  assert.equal(seededAgain.length, seeded.length);

  const created = await service.createCategory("user_123", {
    name: "Dining out",
    type: "expense"
  });

  assert.equal(created.isDefault, false);
  assert.equal(created.name, "Dining out");

  const updated = await service.updateCategory("user_123", created.id, {
    name: "Dining"
  });

  assert.equal(updated.name, "Dining");

  const deleted = await service.deleteCategory("user_123", created.id);
  assert.deepEqual(deleted, {
    categoryId: created.id,
    deleted: true
  });
});

test("CategoriesService prevents deleting default categories", async () => {
  const service = new CategoriesService(new InMemoryCategoriesRepository());
  const categories = await service.listCategories("user_123");
  const defaultCategory = categories.find((category) => category.isDefault);

  await assert.rejects(
    () => service.deleteCategory("user_123", defaultCategory!.id),
    /Default categories cannot be deleted/
  );
});
