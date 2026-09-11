import { z } from "zod";
import {
  categoryDtoSchema,
  createCategoryInputDtoSchema,
  updateCategoryInputDtoSchema,
  type Category,
  type CategoryDto,
  type CreateCategoryInputDto,
  type UpdateCategoryInputDto
} from "@finance-pilot/shared";
import { hasConfiguredApiBaseUrl, requestApi } from "./financeApi";

const deleteCategoryResponseSchema = z.object({
  categoryId: z.string().min(1),
  deleted: z.boolean()
});

function toCategory(category: CategoryDto): Category {
  return categoryDtoSchema.parse(category);
}

export function isCategoriesApiEnabled() {
  return hasConfiguredApiBaseUrl();
}

export async function listCategories(): Promise<Category[]> {
  const response = await requestApi<CategoryDto[]>("/categories");
  return response.map((item) => toCategory(item));
}

export async function createCategory(input: CreateCategoryInputDto): Promise<Category> {
  const payload = createCategoryInputDtoSchema.parse(input);
  const response = await requestApi<CategoryDto>("/categories", {
    body: JSON.stringify(payload),
    method: "POST"
  });

  return toCategory(response);
}

export async function updateCategory(
  categoryId: string,
  input: UpdateCategoryInputDto
): Promise<Category> {
  const payload = updateCategoryInputDtoSchema.parse(input);
  const response = await requestApi<CategoryDto>(`/categories/${encodeURIComponent(categoryId)}`, {
    body: JSON.stringify(payload),
    method: "PATCH"
  });

  return toCategory(response);
}

export async function deleteCategory(categoryId: string): Promise<{ categoryId: string; deleted: boolean }> {
  const response = await requestApi<{ categoryId: string; deleted: boolean }>(
    `/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "DELETE"
    }
  );

  return deleteCategoryResponseSchema.parse(response);
}
