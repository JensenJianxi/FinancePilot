import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type {
  Category,
  CreateTransactionRequestDto,
  Transaction,
  UpdateTransactionRequestDto
} from "@finance-pilot/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUiStore } from "../../app/useUiStore";
import { useModalPageLock } from "../../components/overlays/useModalPageLock";
import { useCategories } from "../../hooks/useCategories";
import { financialHealthQueryKey } from "../../hooks/useFinancialHealth";
import { useSettings } from "../../hooks/useSettings";
import {
  createTransaction,
  isTransactionsApiEnabled,
  updateTransaction as updateTransactionRequest
} from "../../services/transactionsApi";
import { transactionsQueryKey } from "../../hooks/useTransactions";
import { inferCategoryFromTitle } from "../../utils/categoryInference";
import { compareTransactions } from "../../utils/transactions";

const manualEntrySchema = z.object({
  amount: z.number().positive("Enter an amount"),
  category: z.string().min(1, "Choose a category"),
  date: z.string().min(1, "Choose a date"),
  title: z.string().min(1, "Enter a title"),
  notes: z.string().max(240, "Keep the note short"),
  type: z.enum(["expense", "income"])
});

type ManualEntryValues = z.infer<typeof manualEntrySchema>;
type SaveTransactionPayload =
  | {
      fallbackTransaction: Transaction;
      mode: "create";
      request: CreateTransactionRequestDto;
    }
  | {
      fallbackTransaction: Transaction;
      mode: "edit";
      request: UpdateTransactionRequestDto;
      transactionId: string;
    };

const hiddenPaymentMethod = "Not specified";
const emptyCategories: Category[] = [];

function getResolvedTransactionType(values: ManualEntryValues): Transaction["type"] {
  return values.category === "Transfer" ? "transfer" : values.type;
}

function hasTransactionChanges(values: ManualEntryValues, transaction: Transaction) {
  return (
    values.title.trim() !== transaction.title.trim() ||
    values.amount !== transaction.amount ||
    getResolvedTransactionType(values) !== transaction.type ||
    values.category !== transaction.category ||
    values.date !== transaction.date ||
    values.notes.trim() !== transaction.notes.trim()
  );
}

function getDefaultCategoryName(
  categories: Category[],
  type: ManualEntryValues["type"],
  defaultExpenseCategory?: string,
  defaultIncomeCategory?: string
) {
  const preferredCategoryValue =
    type === "expense" ? defaultExpenseCategory : defaultIncomeCategory;

  if (preferredCategoryValue === "Transfer") {
    return "Transfer";
  }

  if (preferredCategoryValue) {
    const preferredCategory = categories.find(
      (category) =>
        category.type === type &&
        (category.id === preferredCategoryValue || category.name === preferredCategoryValue)
    );

    if (preferredCategory) {
      return preferredCategory.name;
    }
  }

  return categories.find((category) => category.type === type)?.name ?? (type === "income" ? "Salary" : "Food");
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function buildCategoryOptions(
  categories: Category[],
  type: ManualEntryValues["type"],
  currentCategory?: string
) {
  const categoryNames = new Set(
    categories
      .filter((category) => category.type === type)
      .map((category) => category.name)
  );

  categoryNames.add("Transfer");

  const knownCurrentCategory = categories.find(
    (category) => category.name === currentCategory?.trim()
  );

  if (
    currentCategory?.trim() &&
    (currentCategory === "Transfer" || !knownCurrentCategory || knownCurrentCategory.type === type)
  ) {
    categoryNames.add(currentCategory.trim());
  }

  return Array.from(categoryNames).sort((left, right) => left.localeCompare(right));
}

export function TransactionComposer({
  initialTransaction,
  onClose,
  onSuccess
}: {
  initialTransaction?: Transaction | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}) {
  useModalPageLock();

  const addTransaction = useUiStore((state) => state.addTransaction);
  const updateTransaction = useUiStore((state) => state.updateTransaction);
  const queryClient = useQueryClient();
  const categories = useCategories();
  const settings = useSettings();
  const isEditing = Boolean(initialTransaction);
  const receiptScanningEnabled = settings.data?.receiptScanningEnabled ?? true;
  const [mode, setMode] = useState<"choice" | "scan" | "manual">(
    isEditing || !receiptScanningEnabled ? "manual" : "choice"
  );
  const [isClosing, setIsClosing] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const categoryManuallyChangedRef = useRef(Boolean(initialTransaction));
  const shouldUseTransactionsApi = isTransactionsApiEnabled();
  const liveCategories = categories.data ?? emptyCategories;
  const defaultTransactionType: ManualEntryValues["type"] =
    settings.data?.defaultTransactionType === "income" ? "income" : "expense";
  const defaultExpenseCategory =
    settings.data?.defaultExpenseCategory ?? settings.data?.defaultExpenseCategoryId;
  const defaultIncomeCategory = settings.data?.defaultIncomeCategory;
  const animationsEnabled = settings.data?.animationsEnabled ?? true;
  const form = useForm<ManualEntryValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      amount: 0,
      category: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      title: "",
      type: defaultTransactionType
    }
  });
  const watchedType = form.watch("type");
  const watchedTitle = form.watch("title");
  const watchedCategory = form.watch("category");
  const categoryOptions = useMemo(
    () => buildCategoryOptions(liveCategories, watchedType, watchedCategory),
    [liveCategories, watchedCategory, watchedType]
  );
  const isCategorySelectionBlocked =
    shouldUseTransactionsApi &&
    (categories.isLoading || categories.isError || categoryOptions.length === 0);

  useEffect(() => {
    const nextType: ManualEntryValues["type"] = initialTransaction
      ? initialTransaction.type === "income"
        ? "income"
        : "expense"
      : defaultTransactionType;
    form.reset({
      amount: initialTransaction?.amount ?? 0,
      category:
        initialTransaction?.category ??
        getDefaultCategoryName(
          liveCategories,
          nextType,
          defaultExpenseCategory,
          defaultIncomeCategory
        ),
      date: initialTransaction?.date ?? new Date().toISOString().slice(0, 10),
      notes: initialTransaction?.notes ?? "",
      title: initialTransaction?.title ?? "",
      type: nextType
    });
    categoryManuallyChangedRef.current = Boolean(initialTransaction);
    setMode(initialTransaction || !receiptScanningEnabled ? "manual" : "choice");
  }, [
    defaultExpenseCategory,
    defaultIncomeCategory,
    defaultTransactionType,
    form,
    initialTransaction,
    liveCategories,
    receiptScanningEnabled
  ]);

  useEffect(() => {
    if (!categoryOptions.length) {
      return;
    }

    const currentCategory = form.getValues("category");

    if (categoryOptions.includes(currentCategory)) {
      return;
    }

    const preferredCategory = getDefaultCategoryName(
      liveCategories,
      watchedType,
      defaultExpenseCategory,
      defaultIncomeCategory
    );

    form.setValue("category", categoryOptions.includes(preferredCategory) ? preferredCategory : categoryOptions[0] ?? "", {
      shouldDirty: Boolean(currentCategory),
      shouldValidate: Boolean(currentCategory)
    });
  }, [
    categoryOptions,
    defaultExpenseCategory,
    defaultIncomeCategory,
    form,
    liveCategories,
    watchedType
  ]);

  useEffect(() => {
    if (mode !== "manual" || initialTransaction || categoryManuallyChangedRef.current) {
      return;
    }

    const inferredCategory = inferCategoryFromTitle(watchedTitle, liveCategories, watchedType);

    if (!inferredCategory || inferredCategory === form.getValues("category")) {
      return;
    }

    form.setValue("category", inferredCategory, {
      shouldDirty: false,
      shouldValidate: true
    });
  }, [form, initialTransaction, liveCategories, mode, watchedTitle, watchedType]);

  const transactionMutation = useMutation({
    mutationFn: async (payload: SaveTransactionPayload) => {
      if (!shouldUseTransactionsApi) {
        if (payload.mode === "edit") {
          updateTransaction(payload.fallbackTransaction);
          return payload.fallbackTransaction;
        }

        addTransaction(payload.fallbackTransaction);
        return payload.fallbackTransaction;
      }

      if (payload.mode === "edit") {
        return updateTransactionRequest(payload.transactionId, payload.request);
      }

      return createTransaction(payload.request);
    },
    onSuccess: async (transaction) => {
      setSubmitError(null);

      if (shouldUseTransactionsApi) {
        queryClient.setQueryData<Transaction[]>(transactionsQueryKey, (currentTransactions) => {
          const nextTransactions = currentTransactions ? [...currentTransactions] : [];
          const existingIndex = nextTransactions.findIndex((item) => item.id === transaction.id);

          if (existingIndex >= 0) {
            nextTransactions[existingIndex] = transaction;
          } else {
            nextTransactions.unshift(transaction);
          }

          return nextTransactions.sort(compareTransactions);
        });
        await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
        await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
      }

      onSuccess?.(
        "Saved successfully."
      );
      if (animationsEnabled && !prefersReducedMotion()) {
        setSaveComplete(true);
      } else {
        onClose();
      }
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Unable to save the transaction right now.");
    }
  });

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !transactionMutation.isPending) {
        if (animationsEnabled && !prefersReducedMotion()) {
          setIsClosing(true);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [animationsEnabled, onClose, transactionMutation.isPending]);

  useEffect(() => {
    if (!saveComplete) {
      return;
    }

    const timer = window.setTimeout(() => setIsClosing(true), 360);
    return () => window.clearTimeout(timer);
  }, [saveComplete]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const timer = window.setTimeout(onClose, 220);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  const submitLabel = useMemo(() => {
    if (isEditing) {
      return transactionMutation.isPending ? "Saving..." : "Save changes";
    }

    return transactionMutation.isPending ? "Saving..." : "Save transaction";
  }, [isEditing, transactionMutation.isPending]);

  function saveTransaction(payload: SaveTransactionPayload) {
    setSubmitError(null);
    setSubmitNotice(null);
    setSaveComplete(false);
    transactionMutation.mutate(payload);
  }

  function requestClose() {
    if (transactionMutation.isPending || isClosing) {
      return;
    }

    if (animationsEnabled && !prefersReducedMotion()) {
      setIsClosing(true);
      return;
    }

    onClose();
  }

  return createPortal(
    <div
      className={`composer-backdrop${isClosing ? " composer-backdrop-closing" : ""}`}
      onClick={requestClose}
      role="presentation"
    >
      <div
        aria-labelledby="transaction-composer-title"
        aria-modal="true"
        className={`composer-sheet${isClosing ? " composer-sheet-closing" : ""}`}
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="section-head composer-header">
          <div>
            <p className="section-label">{isEditing ? "Edit transaction" : "Add transaction"}</p>
            <h2 id="transaction-composer-title">{isEditing ? "Update the details" : "One quick step"}</h2>
          </div>
          <button
            aria-label="Close transaction dialog"
            className="icon-button"
            disabled={transactionMutation.isPending}
            onClick={requestClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="composer-scroll-region">
        {!isEditing && mode === "choice" ? (
          <div className="composer-choice">
            <button className="choice-card" onClick={() => setMode("scan")} type="button">
              <strong>Scan receipt</strong>
              <p>Receipt scanning is coming soon.</p>
            </button>
            <button className="choice-card" onClick={() => setMode("manual")} type="button">
              <strong>Manual entry</strong>
              <p>Enter transaction details.</p>
            </button>
          </div>
        ) : null}

        {!isEditing && mode === "scan" ? (
          <div className="composer-panel">
            <div className="receipt-preview">
              <p className="section-label">Receipt scanner demo</p>
              <strong>Coming soon</strong>
              <p>Use manual entry for now.</p>
            </div>
            <button className="secondary-cta" onClick={() => setMode("choice")} type="button">
              Back
            </button>
            {submitError ? <p className="form-banner form-banner-error">{submitError}</p> : null}
          </div>
        ) : null}

        {mode === "manual" ? (
          <form
            className="manual-form"
            onSubmit={form.handleSubmit((values) => {
              if (initialTransaction && !hasTransactionChanges(values, initialTransaction)) {
                setSubmitError(null);
                setSubmitNotice("Nothing changed.");
                onSuccess?.("Nothing changed.");
                return;
              }

              const transactionType = getResolvedTransactionType(values);
              const compatibilityPaymentMethod =
                initialTransaction?.paymentMethod.trim() || hiddenPaymentMethod;
              const fallbackTransaction: Transaction = {
                createdAt: initialTransaction?.createdAt ?? new Date().toISOString(),
                id: initialTransaction?.id ?? `manual_${Date.now()}`,
                title: values.title.trim(),
                amount: values.amount,
                category: values.category,
                date: values.date,
                paymentMethod: compatibilityPaymentMethod,
                notes: values.notes?.trim() ?? "",
                type: transactionType,
                updatedAt: new Date().toISOString()
              };

              if (initialTransaction) {
                saveTransaction({
                  fallbackTransaction,
                  mode: "edit",
                  request: {
                    amount: values.amount,
                    category: values.category,
                    note: values.notes?.trim() || undefined,
                    paymentMethod: compatibilityPaymentMethod,
                    title: values.title.trim(),
                    transactionDate: values.date,
                    type: transactionType
                  },
                  transactionId: initialTransaction.id
                });
                return;
              }

              saveTransaction({
                fallbackTransaction,
                mode: "create",
                request: {
                  amount: values.amount,
                  category: values.category,
                  note: values.notes?.trim() || undefined,
                  paymentMethod: compatibilityPaymentMethod,
                  title: values.title.trim(),
                  transactionDate: values.date,
                  type: transactionType
                }
              });
            })}
          >
            <ManualField
              error={form.formState.errors.title?.message}
              label="Title"
              render={<input {...form.register("title")} type="text" />}
            />
            <ManualField
              error={form.formState.errors.amount?.message}
              label="Amount"
              render={
                <input
                  {...form.register("amount", { valueAsNumber: true })}
                  min="0"
                  step="0.01"
                  type="number"
                />
              }
            />
            <ManualField
              error={form.formState.errors.type?.message}
              label="Type"
              render={
                <select {...form.register("type")}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              }
            />
            <ManualField
              error={form.formState.errors.category?.message}
              label="Category"
              render={
                <select
                  {...form.register("category", {
                    onChange: () => {
                      categoryManuallyChangedRef.current = true;
                    }
                  })}
                  disabled={isCategorySelectionBlocked}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              }
            />
            <ManualField
              error={form.formState.errors.date?.message}
              label="Date"
              render={<input {...form.register("date")} type="date" />}
            />
            <ManualField
              error={form.formState.errors.notes?.message}
              label="Optional note"
              render={<textarea {...form.register("notes")} rows={3} />}
            />
            {shouldUseTransactionsApi && categories.isLoading ? (
              <p className="form-banner form-banner-info">Loading your categories...</p>
            ) : null}
            {shouldUseTransactionsApi && categories.isError ? (
              <p className="form-banner form-banner-error">
                {categories.error instanceof Error
                  ? categories.error.message
                  : "FinancePilot could not load your categories."}
              </p>
            ) : null}
            {submitNotice ? <p className="form-banner form-banner-success" role="status">{submitNotice}</p> : null}
            {submitError ? <p className="form-banner form-banner-error">{submitError}</p> : null}
            <button
              aria-live="polite"
              className={`primary-cta transaction-save-button${transactionMutation.isPending ? " is-saving" : ""}${saveComplete ? " is-saved" : ""}`}
              disabled={transactionMutation.isPending || isCategorySelectionBlocked || saveComplete}
              type="submit"
            >
              {transactionMutation.isPending ? <span aria-hidden="true" className="save-spinner" /> : null}
              {saveComplete ? <span aria-hidden="true" className="save-check">✓</span> : null}
              {saveComplete ? "Saved successfully" : submitLabel}
            </button>
            {!isEditing && receiptScanningEnabled ? (
              <button className="secondary-cta" onClick={() => setMode("choice")} type="button">
                Back
              </button>
            ) : null}
          </form>
        ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ManualField({
  error,
  label,
  render
}: {
  error?: string;
  label: string;
  render: ReactNode;
}) {
  return (
    <label className="field-block">
      <span>{label}</span>
      {render}
      {error ? <small>{error}</small> : null}
    </label>
  );
}
