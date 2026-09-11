import type {
  CategoryRecord,
  CreateCategoryInputDto,
  UpdateCategoryInputDto
} from "@finance-pilot/shared";

export interface DefaultCategorySeed {
  categoryId: string;
  icon?: string;
  name: string;
  type: "income" | "expense";
}

export interface CategoriesRepository {
  createCategory: (userId: string, input: CreateCategoryInputDto) => Promise<CategoryRecord>;
  deleteCategory: (userId: string, categoryId: string) => Promise<boolean>;
  getCategory: (userId: string, categoryId: string) => Promise<CategoryRecord | null>;
  listUserCategories: (userId: string) => Promise<CategoryRecord[]>;
  seedDefaultCategories: (userId: string, seeds: DefaultCategorySeed[]) => Promise<void>;
  updateCategory: (
    userId: string,
    categoryId: string,
    input: UpdateCategoryInputDto
  ) => Promise<CategoryRecord | null>;
}
