import { useEffect, useMemo, useState } from "react";
import type { Category, CreateCategoryInputDto } from "@finance-pilot/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useUiStore } from "../../app/useUiStore";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { PlaceholderCard } from "../../components/feedback/PlaceholderCard";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { categoriesQueryKey, useCategories } from "../../hooks/useCategories";
import {
  createCategory as createCategoryRequest,
  deleteCategory as deleteCategoryRequest,
  isCategoriesApiEnabled,
  updateCategory as updateCategoryRequest
} from "../../services/categoriesApi";
import { useFinanceSnapshot } from "../../hooks/useFinanceSnapshot";
import { ExpenseSummaryCard } from "../transactions/components/ExpenseSummaryCard";

const categoryFormSchema = z.object({
  icon: z.string().max(32, "Keep the icon label short").optional(),
  name: z.string().min(1, "Enter a category name"),
  type: z.enum(["expense", "income"])
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;
const emptyCategories: Category[] = [];

function createEmptyFormValues(type: CategoryFormValues["type"] = "expense"): CategoryFormValues {
  return {
    icon: "",
    name: "",
    type
  };
}

function normalizeCategoryForm(values: CategoryFormValues): CreateCategoryInputDto {
  return {
    icon: values.icon?.trim() ? values.icon.trim() : undefined,
    name: values.name.trim(),
    type: values.type
  };
}

function getCategoryGroups(categories: Category[]) {
  return {
    expense: categories.filter((category) => category.type === "expense"),
    income: categories.filter((category) => category.type === "income")
  };
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const snapshot = useFinanceSnapshot();
  const categories = useCategories();
  const createLocalCategory = useUiStore((state) => state.createLocalCategory);
  const deleteLocalCategory = useUiStore((state) => state.deleteLocalCategory);
  const updateLocalCategory = useUiStore((state) => state.updateLocalCategory);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const shouldUseCategoriesApi = isCategoriesApiEnabled();
  const form = useForm<CategoryFormValues>({
    defaultValues: createEmptyFormValues(),
    resolver: zodResolver(categoryFormSchema)
  });

  const allCategories = categories.data ?? emptyCategories;
  const categoryGroups = useMemo(() => getCategoryGroups(allCategories), [allCategories]);
  const selectedCategory = allCategories.find((category) => category.id === editingCategoryId) ?? null;

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    form.reset({
      icon: selectedCategory.icon ?? "",
      name: selectedCategory.name,
      type: selectedCategory.type
    });
  }, [form, selectedCategory]);

  const saveCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const payload = normalizeCategoryForm(values);

      if (!shouldUseCategoriesApi) {
        const now = new Date().toISOString();
        const fallbackCategory: Category = {
          createdAt: selectedCategory?.createdAt ?? now,
          icon: payload.icon,
          id: selectedCategory?.id ?? `cat_local_${Date.now()}`,
          isDefault: selectedCategory?.isDefault ?? false,
          name: payload.name,
          type: payload.type,
          updatedAt: now
        };

        if (selectedCategory) {
          updateLocalCategory(fallbackCategory);
        } else {
          createLocalCategory(fallbackCategory);
        }

        return fallbackCategory;
      }

      if (selectedCategory) {
        return updateCategoryRequest(selectedCategory.id, payload);
      }

      return createCategoryRequest(payload as CreateCategoryInputDto);
    },
    onSuccess: async (category) => {
      setFeedback("Saved successfully.");
      form.reset(createEmptyFormValues(category.type));
      setEditingCategoryId(null);

      if (shouldUseCategoriesApi) {
        queryClient.setQueryData<Category[]>(categoriesQueryKey, (current) => {
          const next = current ? [...current] : [];
          const existingIndex = next.findIndex((item) => item.id === category.id);

          if (existingIndex >= 0) {
            next[existingIndex] = category;
          } else {
            next.push(category);
          }

          return next;
        });
        await queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      }
    },
    onError: (error) => {
      setFeedback(null);
      form.setError("name", {
        message: error instanceof Error ? error.message : "Unable to save the category right now."
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      if (!shouldUseCategoriesApi) {
        deleteLocalCategory(category.id);
        return { categoryId: category.id, deleted: true };
      }

      return deleteCategoryRequest(category.id);
    },
    onSuccess: async (_result, category) => {
      setFeedback(`Deleted "${category.name}".`);

      if (editingCategoryId === category.id) {
        setEditingCategoryId(null);
        form.reset(createEmptyFormValues());
      }

      if (shouldUseCategoriesApi) {
        queryClient.setQueryData<Category[]>(categoriesQueryKey, (current) =>
          current ? current.filter((item) => item.id !== category.id) : current
        );
        await queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      }
    }
  });

  if (categories.isLoading || snapshot.isLoading) {
    return <LoadingState label="Loading your categories" />;
  }

  if (categories.isError || snapshot.isError) {
    return (
      <ErrorState
        message={
          categories.error instanceof Error
            ? categories.error.message
            : snapshot.error instanceof Error
              ? snapshot.error.message
              : "FinancePilot could not load your categories."
        }
        onRetry={() => {
          void categories.refetch();
          void snapshot.refetch();
        }}
        title="Categories are unavailable."
      />
    );
  }

  return (
    <div className="page-shell categories-page">
      <ScreenHeader
        actions={
          <div className="screen-header-action-cluster">
            <button
              className="primary-cta"
              onClick={() => {
                setEditingCategoryId(null);
                form.reset(createEmptyFormValues());
                setFeedback(null);
              }}
              type="button"
            >
              + New category
            </button>
            <Link className="inline-link" to="/more">
              Back to More
            </Link>
          </div>
        }
        eyebrow="Categories"
        title="Categories"
      />

      {feedback ? <p className="form-banner form-banner-success" role="status">{feedback}</p> : null}

      <section className="expenses-top-grid">
        <ExpenseSummaryCard
          label="Total categories"
          meta="Across income and expenses"
          value={String(allCategories.length)}
        />
        <ExpenseSummaryCard
          label="Default"
          meta="Built in for every user"
          value={String(allCategories.filter((category) => category.isDefault).length)}
        />
        <ExpenseSummaryCard
          label="Custom"
          meta="Created by you"
          value={String(allCategories.filter((category) => !category.isDefault).length)}
        />
        <ExpenseSummaryCard
          label="Used in transactions"
          meta="Current loaded activity"
          value={String(new Set((snapshot.data?.transactions ?? []).map((item) => item.category)).size)}
        />
      </section>

      <section className="categories-layout">
        <div className="categories-main-column">
          <section className="soft-card">
            <div className="section-head">
              <div>
                <p className="section-label">Expense categories</p>
                <h3>Spending labels</h3>
              </div>
              <StatusPill tone="accent">{categoryGroups.expense.length}</StatusPill>
            </div>
            {categoryGroups.expense.length ? (
              <div className="recommendation-list">
                {categoryGroups.expense.map((category) => (
                  <CategoryRow
                    category={category}
                    isDeletePending={
                      deleteCategoryMutation.isPending && deleteCategoryMutation.variables?.id === category.id
                    }
                    key={category.id}
                    onDelete={
                      category.isDefault
                        ? undefined
                        : () => {
                            setFeedback(null);
                            deleteCategoryMutation.mutate(category);
                          }
                    }
                    onEdit={
                      category.isDefault
                        ? undefined
                        : () => {
                            setFeedback(null);
                            setEditingCategoryId(category.id);
                          }
                    }
                    selected={editingCategoryId === category.id}
                  />
                ))}
              </div>
            ) : (
              <PlaceholderCard
                description="Create an expense category to begin."
                title="No expense categories yet"
              />
            )}
          </section>

          <section className="soft-card">
            <div className="section-head">
              <div>
                <p className="section-label">Income categories</p>
                <h3>Incoming money labels</h3>
              </div>
              <StatusPill tone="success">{categoryGroups.income.length}</StatusPill>
            </div>
            {categoryGroups.income.length ? (
              <div className="recommendation-list">
                {categoryGroups.income.map((category) => (
                  <CategoryRow
                    category={category}
                    isDeletePending={
                      deleteCategoryMutation.isPending && deleteCategoryMutation.variables?.id === category.id
                    }
                    key={category.id}
                    onDelete={
                      category.isDefault
                        ? undefined
                        : () => {
                            setFeedback(null);
                            deleteCategoryMutation.mutate(category);
                          }
                    }
                    onEdit={
                      category.isDefault
                        ? undefined
                        : () => {
                            setFeedback(null);
                            setEditingCategoryId(category.id);
                          }
                    }
                    selected={editingCategoryId === category.id}
                  />
                ))}
              </div>
            ) : (
              <PlaceholderCard
                description="Create an income category to begin."
                title="No income categories yet"
              />
            )}
          </section>
        </div>

        <section className="soft-card categories-form-card">
          <div className="section-head">
            <div>
              <p className="section-label">{selectedCategory ? "Edit category" : "Create category"}</p>
              <h3>{selectedCategory ? "Update this label" : "Add a new label"}</h3>
            </div>
            {selectedCategory?.isDefault ? <StatusPill tone="warning">Read only</StatusPill> : null}
          </div>

          <form
            className="manual-form"
            onSubmit={form.handleSubmit((values) => {
              if (selectedCategory && !form.formState.isDirty) {
                setFeedback("Nothing changed.");
                return;
              }

              saveCategoryMutation.mutate(values);
            })}
          >
            <label className="field-block">
              <span>Name</span>
              <input {...form.register("name")} placeholder="Dining" type="text" />
              {form.formState.errors.name?.message ? <small>{form.formState.errors.name.message}</small> : null}
            </label>

            <label className="field-block">
              <span>Type</span>
              <select {...form.register("type")}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label className="field-block">
              <span>Optional icon label</span>
              <input {...form.register("icon")} placeholder="utensils" type="text" />
              {form.formState.errors.icon?.message ? <small>{form.formState.errors.icon.message}</small> : null}
            </label>

            <div className="dialog-actions">
              <button className="primary-cta" disabled={saveCategoryMutation.isPending} type="submit">
                {saveCategoryMutation.isPending
                  ? "Saving..."
                  : selectedCategory
                    ? "Save changes"
                    : "Create category"}
              </button>
              <button
                className="secondary-cta"
                onClick={() => {
                  setEditingCategoryId(null);
                  form.reset(createEmptyFormValues());
                  setFeedback(null);
                }}
                type="button"
              >
                Clear
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  isDeletePending,
  onDelete,
  onEdit,
  selected
}: {
  category: Category;
  isDeletePending: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  selected: boolean;
}) {
  return (
    <div className={`category-row ${selected ? "category-row-selected" : ""}`}>
      <div className="category-row-copy">
        <div className="category-row-heading">
          <strong>{category.name}</strong>
          <StatusPill tone={category.isDefault ? "warning" : "accent"}>
            {category.isDefault ? "Default" : "Custom"}
          </StatusPill>
        </div>
        <p>
          {category.type === "income" ? "Income" : "Expense"}
          {category.icon ? ` • ${category.icon}` : ""}
        </p>
      </div>
      <div className="category-row-actions">
        {onEdit ? (
          <button className="text-button" onClick={onEdit} type="button">
            Edit
          </button>
        ) : (
          <span className="menu-row-status">Built in</span>
        )}
        {onDelete ? (
          <button className="text-button" disabled={isDeletePending} onClick={onDelete} type="button">
            {isDeletePending ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
