import { useEffect, useMemo, useState } from "react";
import type { Budget, CreateBudgetInputDto } from "@finance-pilot/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { z } from "zod";
import { useUiStore } from "../../app/useUiStore";
import { ErrorState } from "../../components/feedback/ErrorState";
import { ConfirmationDialog } from "../../components/feedback/ConfirmationDialog";
import { LoadingState } from "../../components/feedback/LoadingState";
import { PlaceholderCard } from "../../components/feedback/PlaceholderCard";
import { ModalDialog } from "../../components/overlays/ModalDialog";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { budgetsQueryKey, useBudgets } from "../../hooks/useBudgets";
import { useCategories } from "../../hooks/useCategories";
import { useCurrentMonthKey } from "../../hooks/useCurrentMonthKey";
import { useFinanceSnapshot } from "../../hooks/useFinanceSnapshot";
import { financialHealthQueryKey } from "../../hooks/useFinancialHealth";
import { useSettings } from "../../hooks/useSettings";
import {
  createBudget as createBudgetRequest,
  deleteBudget as deleteBudgetRequest,
  isBudgetsApiEnabled,
  updateBudget as updateBudgetRequest
} from "../../services/budgetsApi";
import { getCurrentMonthKey } from "../../utils/transactions";
import { formatCurrency } from "../../utils/format";
import { enrichBudgetsWithTransactions } from "../../utils/budgets";
import { BudgetMonthPicker } from "./components/BudgetMonthPicker";
import { BudgetProgress } from "./components/BudgetProgress";
import { SavingsGoalsSection } from "./components/SavingsGoalsSection";
import { SubscriptionsSection } from "./components/SubscriptionsSection";

const budgetFormSchema = z.object({
  limit: z.number().positive("Enter a budget limit"),
  name: z.string().trim().min(1, "Enter a budget name").max(80, "Keep the name under 80 characters"),
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid month"),
  recurrence: z.enum(["once", "monthly"])
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

function createEmptyFormValues(): BudgetFormValues {
  return {
    limit: 0,
    name: "",
    periodMonth: getCurrentMonthKey(),
    recurrence: "monthly"
  };
}

function hasBudgetChanges(values: BudgetFormValues, budget: Budget) {
  return (
    values.name.trim() !== (budget.name ?? budget.category).trim() ||
    values.limit !== budget.limit ||
    values.periodMonth !== budget.periodMonth ||
    values.recurrence !== budget.recurrence ||
    budget.scope !== "overall"
  );
}

export default function BudgetPage() {
  const location = useLocation();
  const snapshot = useFinanceSnapshot();
  const budgets = useBudgets();
  const categories = useCategories();
  const currentMonth = useCurrentMonthKey();
  const settings = useSettings();
  const createLocalBudget = useUiStore((state) => state.createLocalBudget);
  const deleteLocalBudget = useUiStore((state) => state.deleteLocalBudget);
  const updateLocalBudget = useUiStore((state) => state.updateLocalBudget);
  const animationsEnabled = useUiStore((state) => state.animationsEnabled);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [budgetPendingDeletion, setBudgetPendingDeletion] = useState<Budget | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const shouldUseBudgetsApi = isBudgetsApiEnabled();
  const budgetCreationEnabled = settings.data?.budgetCreationEnabled ?? true;
  const expenseCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.type === "expense"),
    [categories.data]
  );
  const form = useForm<BudgetFormValues>({
    defaultValues: createEmptyFormValues(),
    resolver: zodResolver(budgetFormSchema)
  });
  const selectedMonth = form.watch("periodMonth");
  const selectedRecurrence = form.watch("recurrence");

  const enrichedBudgets = useMemo(
    () => enrichBudgetsWithTransactions(
      budgets.data ?? [],
      snapshot.data?.transactions ?? [],
      currentMonth
    ),
    [budgets.data, currentMonth, snapshot.data?.transactions]
  );
  const selectedBudget = enrichedBudgets.find((budget) => budget.id === editingBudgetId) ?? null;

  useEffect(() => {
    if (
      !location.hash ||
      snapshot.isLoading ||
      budgets.isLoading ||
      categories.isLoading
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      target?.scrollIntoView({
        behavior: animationsEnabled && !prefersReducedMotion ? "smooth" : "auto",
        block: "start"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    animationsEnabled,
    budgets.isLoading,
    categories.isLoading,
    location.hash,
    snapshot.isLoading
  ]);

  const saveBudgetMutation = useMutation({
    mutationFn: async (values: BudgetFormValues) => {
      const payload: CreateBudgetInputDto = {
        limit: values.limit,
        name: values.name.trim(),
        periodMonth: values.periodMonth,
        recurrence: values.recurrence,
        scope: "overall"
      };

      if (!shouldUseBudgetsApi) {
        const fallbackBudget: Budget = {
          category: "All expenses",
          id: selectedBudget?.id ?? `bud_local_${Date.now()}`,
          limit: payload.limit,
          name: payload.name,
          periodMonth: payload.periodMonth,
          recurrence: payload.recurrence,
          scope: payload.scope,
          spent: selectedBudget?.spent ?? 0,
          trend: selectedBudget?.trend ?? "healthy"
        };

        if (selectedBudget) {
          updateLocalBudget(fallbackBudget);
        } else {
          createLocalBudget(fallbackBudget);
        }

        return fallbackBudget;
      }

      if (selectedBudget) {
        return updateBudgetRequest(selectedBudget.id, payload);
      }

      return createBudgetRequest(payload);
    },
    onSuccess: async (budget) => {
      setActionError(null);
      setFeedback("Saved successfully.");
      setIsBudgetDialogOpen(false);
      setEditingBudgetId(null);
      form.reset(createEmptyFormValues());

      if (shouldUseBudgetsApi) {
        queryClient.setQueryData<Budget[]>(budgetsQueryKey, (current) => {
          const next = current ? [...current] : [];
          const existingIndex = next.findIndex((item) => item.id === budget.id);

          if (existingIndex >= 0) {
            next[existingIndex] = budget;
          } else {
            next.push(budget);
          }

          return next;
        });
        await queryClient.invalidateQueries({ queryKey: budgetsQueryKey });
        await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
      }
    },
    onError: (error) => {
      setFeedback(null);
      setActionError(error instanceof Error ? error.message : "Unable to save this budget right now.");
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (budget: Budget) => {
      if (!shouldUseBudgetsApi) {
        deleteLocalBudget(budget.id);
        return { budgetId: budget.id, deleted: true };
      }

      return deleteBudgetRequest(budget.id);
    },
    onSuccess: async (_result, budget) => {
      setBudgetPendingDeletion(null);
      setActionError(null);
      setFeedback(`Deleted ${budget.name ?? budget.category} budget.`);

      if (editingBudgetId === budget.id) {
        setIsBudgetDialogOpen(false);
        setEditingBudgetId(null);
        form.reset(createEmptyFormValues());
      }

      if (shouldUseBudgetsApi) {
        queryClient.setQueryData<Budget[]>(budgetsQueryKey, (current) =>
          current ? current.filter((item) => item.id !== budget.id) : current
        );
        await queryClient.invalidateQueries({ queryKey: budgetsQueryKey });
        await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
      }
    },
    onError: (error) => {
      setBudgetPendingDeletion(null);
      setFeedback(null);
      setActionError(error instanceof Error ? error.message : "Unable to delete this budget right now.");
    }
  });

  function closeBudgetDialog() {
    if (saveBudgetMutation.isPending) {
      return;
    }

    setIsBudgetDialogOpen(false);
    setEditingBudgetId(null);
    setActionError(null);
    form.reset(createEmptyFormValues());
  }

  function openCreateBudgetDialog() {
    if (!budgetCreationEnabled) {
      return;
    }

    setFeedback(null);
    setActionError(null);
    setEditingBudgetId(null);
    form.reset(createEmptyFormValues());
    setIsBudgetDialogOpen(true);
  }

  function openEditBudgetDialog(budget: Budget) {
    setFeedback(null);
    setActionError(null);
    setEditingBudgetId(budget.id);
    form.reset({
      limit: budget.limit,
      name: budget.name ?? budget.category,
      periodMonth: budget.periodMonth,
      recurrence: budget.recurrence
    });
    setIsBudgetDialogOpen(true);
  }

  if (snapshot.isLoading || budgets.isLoading || categories.isLoading || settings.isLoading) {
    return <LoadingState label="Preparing your budgets" />;
  }

  if (snapshot.isError || budgets.isError || categories.isError || settings.isError || !snapshot.data) {
    return (
      <ErrorState
        message={
          snapshot.error instanceof Error
            ? snapshot.error.message
            : budgets.error instanceof Error
              ? budgets.error.message
              : categories.error instanceof Error
                ? categories.error.message
                : settings.error instanceof Error
                  ? settings.error.message
                  : "FinancePilot could not load your budget workspace."
        }
        onRetry={() => {
          void snapshot.refetch();
          void budgets.refetch();
          void categories.refetch();
          void settings.refetch();
        }}
        title="Budget data is unavailable."
      />
    );
  }

  return (
    <div className="page-shell budget-page">
      <ScreenHeader
        actions={
          snapshot.isUsingLiveTransactions ? (
            <StatusPill tone="accent">Live budgets</StatusPill>
          ) : (
            <StatusPill tone="success">{Math.round(snapshot.data.summary.savingsRate)}% saving rate</StatusPill>
          )
        }
        eyebrow="Budget"
        title="Progress, not pressure"
      />

      {feedback ? <p className="form-banner form-banner-success" role="status">{feedback}</p> : null}
      {actionError && !isBudgetDialogOpen ? (
        <p className="form-banner form-banner-error">{actionError}</p>
      ) : null}

      <section className="budget-layout">
        <section className="soft-card" id="budgets">
          <div className="section-head">
            <div>
              <p className="section-label">Spending budgets</p>
              <h3>Overall limits</h3>
              <p className="budget-saved-count">
                {enrichedBudgets.length} {enrichedBudgets.length === 1 ? "budget" : "budgets"}
              </p>
            </div>
            {budgetCreationEnabled ? (
              <button
                className="primary-cta budget-create-button"
                onClick={openCreateBudgetDialog}
                type="button"
              >
                + Create budget
              </button>
            ) : null}
          </div>
          {enrichedBudgets.length ? (
            <div className="progress-stack">
              {enrichedBudgets.map((budget) => (
                <BudgetProgress
                  budget={budget}
                  isDeletePending={
                    deleteBudgetMutation.isPending && deleteBudgetMutation.variables?.id === budget.id
                  }
                  key={budget.id}
                  periodMonth={currentMonth}
                  onDelete={() => {
                    setFeedback(null);
                    setActionError(null);
                    setBudgetPendingDeletion(budget);
                  }}
                  onEdit={() => {
                    openEditBudgetDialog(budget);
                  }}
                />
              ))}
            </div>
          ) : (
            <PlaceholderCard
              description="Create a budget to track monthly spending."
              title="No budgets yet"
            />
          )}

        </section>

        <div className="budget-side-column">
          <SavingsGoalsSection />

          <SubscriptionsSection categories={expenseCategories} />
        </div>
      </section>

      {isBudgetDialogOpen ? (
        <ModalDialog
          eyebrow={selectedBudget ? "Edit budget" : "New budget"}
          isBusy={saveBudgetMutation.isPending}
          onClose={closeBudgetDialog}
          title={selectedBudget ? "Update budget" : "Create budget"}
        >
          <form
            className="manual-form budget-form budget-dialog-form"
            onSubmit={form.handleSubmit((values) => {
              if (selectedBudget && !hasBudgetChanges(values, selectedBudget)) {
                setFeedback("Nothing changed.");
                setActionError(null);
                closeBudgetDialog();
                return;
              }

              saveBudgetMutation.mutate(values);
            })}
          >
            <label className="field-block">
              <span>Budget name</span>
              <input
                {...form.register("name")}
                autoComplete="off"
                placeholder="e.g. Monthly essentials"
                type="text"
              />
              {form.formState.errors.name?.message ? (
                <small>{form.formState.errors.name.message}</small>
              ) : null}
            </label>

            <label className="field-block">
              <span>Repeat</span>
              <select {...form.register("recurrence")}>
                <option value="once">One month</option>
                <option value="monthly">Every month</option>
              </select>
            </label>

            <input {...form.register("periodMonth")} type="hidden" />
            <BudgetMonthPicker
              error={form.formState.errors.periodMonth?.message}
              label={selectedRecurrence === "monthly" ? "Starts" : "Month"}
              onChange={(value) => {
                form.setValue("periodMonth", value, {
                  shouldDirty: true,
                  shouldValidate: true
                });
              }}
              value={selectedMonth}
            />

            <label className="field-block">
              <span>Limit</span>
              <input
                {...form.register("limit", { valueAsNumber: true })}
                min="0"
                step="0.01"
                type="number"
              />
              {form.formState.errors.limit?.message ? (
                <small>{form.formState.errors.limit.message}</small>
              ) : null}
            </label>

            {actionError ? <p className="form-banner form-banner-error">{actionError}</p> : null}

            <div className="dialog-actions">
              <button
                className="primary-cta"
                disabled={saveBudgetMutation.isPending}
                type="submit"
              >
                {saveBudgetMutation.isPending
                  ? "Saving..."
                  : selectedBudget
                    ? "Save budget"
                    : "Create budget"}
              </button>
              <button
                className="secondary-cta"
                disabled={saveBudgetMutation.isPending}
                onClick={closeBudgetDialog}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </ModalDialog>
      ) : null}

      {budgetPendingDeletion ? (
        <ConfirmationDialog
          confirmLabel="Delete budget"
          description={
            <>
              Delete the <strong>{budgetPendingDeletion.name ?? budgetPendingDeletion.category}</strong> budget with a limit of{" "}
              <strong>{formatCurrency(budgetPendingDeletion.limit)}</strong>? This action cannot be undone.
            </>
          }
          isConfirmPending={deleteBudgetMutation.isPending}
          onCancel={() => setBudgetPendingDeletion(null)}
          onConfirm={() => deleteBudgetMutation.mutate(budgetPendingDeletion)}
          title="Delete this budget?"
        />
      ) : null}
    </div>
  );
}
