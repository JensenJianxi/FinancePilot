import type {
  CategoryDto,
  CategoryRecord,
  CreateCategoryInputDto,
  UpdateCategoryInputDto
} from "@finance-pilot/shared";
import {
  categoryDtoSchema,
  createCategoryInputDtoSchema,
  updateCategoryInputDtoSchema
} from "@finance-pilot/shared";
import { AppError } from "../lib/errors";
import type { CategoriesRepository, DefaultCategorySeed } from "../repositories/CategoriesRepository";

const defaultCategorySeeds: DefaultCategorySeed[] = [
  { categoryId: "default_expense_bills", name: "Bills", type: "expense" },
  { categoryId: "default_expense_entertainment", name: "Entertainment", type: "expense" },
  { categoryId: "default_expense_food", name: "Food", type: "expense" },
  { categoryId: "default_expense_healthcare", name: "Healthcare", type: "expense" },
  { categoryId: "default_expense_shopping", name: "Shopping", type: "expense" },
  { categoryId: "default_expense_transport", name: "Transport", type: "expense" },
  { categoryId: "default_income_investment", name: "Investment", type: "income" },
  { categoryId: "default_income_salary", name: "Salary", type: "income" }
];

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function toCategoryDto(record: CategoryRecord): CategoryDto {
  return categoryDtoSchema.parse({
    createdAt: record.createdAt,
    icon: record.icon,
    id: record.categoryId,
    isDefault: record.isDefault,
    name: record.name,
    type: record.type,
    updatedAt: record.updatedAt
  });
}

export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  async createCategory(userId: string, input: CreateCategoryInputDto): Promise<CategoryDto> {
    this.assertUserId(userId);
    await this.ensureDefaultCategories(userId);
    const validatedInput = createCategoryInputDtoSchema.parse(input);
    const existing = await this.repository.listUserCategories(userId);
    this.assertUniqueCategory(existing, validatedInput.name, validatedInput.type);
    const created = await this.repository.createCategory(userId, validatedInput);

    return toCategoryDto(created);
  }

  async deleteCategory(userId: string, categoryId: string) {
    this.assertUserId(userId);
    this.assertCategoryId(categoryId);
    await this.ensureDefaultCategories(userId);
    const existing = await this.repository.getCategory(userId, categoryId);

    if (!existing) {
      throw new AppError("Category not found.", "CATEGORY_NOT_FOUND", 404);
    }

    if (existing.isDefault) {
      throw new AppError("Default categories cannot be deleted.", "CATEGORY_DEFAULT_LOCKED", 403);
    }

    await this.repository.deleteCategory(userId, categoryId);

    return {
      categoryId,
      deleted: true
    };
  }

  async listCategories(userId: string): Promise<CategoryDto[]> {
    this.assertUserId(userId);
    await this.ensureDefaultCategories(userId);
    const categories = await this.repository.listUserCategories(userId);

    return categories.map(toCategoryDto);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInputDto
  ): Promise<CategoryDto> {
    this.assertUserId(userId);
    this.assertCategoryId(categoryId);
    await this.ensureDefaultCategories(userId);
    const validatedInput = updateCategoryInputDtoSchema.parse(input);
    const existing = await this.repository.getCategory(userId, categoryId);

    if (!existing) {
      throw new AppError("Category not found.", "CATEGORY_NOT_FOUND", 404);
    }

    if (existing.isDefault) {
      throw new AppError("Default categories are read-only.", "CATEGORY_DEFAULT_LOCKED", 403);
    }

    const allCategories = await this.repository.listUserCategories(userId);
    this.assertUniqueCategory(
      allCategories.filter((category) => category.categoryId !== categoryId),
      validatedInput.name ?? existing.name,
      validatedInput.type ?? existing.type
    );

    const updated = await this.repository.updateCategory(userId, categoryId, validatedInput);

    if (!updated) {
      throw new AppError("Category not found.", "CATEGORY_NOT_FOUND", 404);
    }

    return toCategoryDto(updated);
  }

  private assertCategoryId(categoryId: string) {
    if (!categoryId.trim()) {
      throw new AppError("Category ID is required.", "CATEGORY_ID_REQUIRED", 400);
    }
  }

  private assertUniqueCategory(
    categories: CategoryRecord[],
    name: string,
    type: CategoryRecord["type"]
  ) {
    const normalizedTarget = normalizeName(name);
    const duplicate = categories.find(
      (category) =>
        category.type === type &&
        normalizeName(category.name) === normalizedTarget
    );

    if (duplicate) {
      throw new AppError("A category with this name already exists.", "CATEGORY_ALREADY_EXISTS", 409);
    }
  }

  private assertUserId(userId: string) {
    if (!userId.trim()) {
      throw new AppError("Authenticated user is required.", "UNAUTHORIZED", 401);
    }
  }

  private async ensureDefaultCategories(userId: string) {
    await this.repository.seedDefaultCategories(userId, defaultCategorySeeds);
  }
}
