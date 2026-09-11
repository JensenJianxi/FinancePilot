import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Category, Settings, UpdateSettingsInputDto } from "@finance-pilot/shared";
import { useModalPageLock } from "../../../components/overlays/useModalPageLock";

export function DefaultPreferencesDialog({
  expenseCategories,
  incomeCategories,
  onClose,
  onFeedback,
  onSave,
  settings
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
  onClose: () => void;
  onFeedback: (message: string) => void;
  onSave: (input: UpdateSettingsInputDto) => Promise<void>;
  settings: Settings;
}) {
  useModalPageLock();

  const [defaultExpenseCategory, setDefaultExpenseCategory] = useState(
    settings.defaultExpenseCategory ?? settings.defaultExpenseCategoryId ?? expenseCategories[0]?.id ?? ""
  );
  const [defaultIncomeCategory, setDefaultIncomeCategory] = useState(
    settings.defaultIncomeCategory ?? incomeCategories[0]?.id ?? ""
  );
  const initialTransactionType = settings.defaultTransactionType === "income" ? "income" : "expense";
  const [defaultTransactionType, setDefaultTransactionType] = useState<"expense" | "income">(
    initialTransactionType
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    const input: UpdateSettingsInputDto = {
      defaultTransactionType,
      ...(defaultExpenseCategory
        ? {
            defaultExpenseCategory,
            defaultExpenseCategoryId: defaultExpenseCategory
          }
        : {}),
      ...(defaultIncomeCategory ? { defaultIncomeCategory } : {})
    };

    const initialExpenseCategory =
      settings.defaultExpenseCategory ?? settings.defaultExpenseCategoryId ?? expenseCategories[0]?.id ?? "";
    const initialIncomeCategory = settings.defaultIncomeCategory ?? incomeCategories[0]?.id ?? "";

    if (
      defaultTransactionType === initialTransactionType &&
      defaultExpenseCategory === initialExpenseCategory &&
      defaultIncomeCategory === initialIncomeCategory
    ) {
      onFeedback("Nothing changed.");
      setIsSaving(false);
      onClose();
      return;
    }

    try {
      await onSave(input);
      onFeedback("Saved successfully.");
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "FinancePilot could not save these defaults.");
      setIsSaving(false);
    }
  }

  return createPortal(
    <div className="install-modal-backdrop" onClick={isSaving ? undefined : onClose} role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="install-modal-sheet default-preferences-sheet"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="section-head install-dialog-header">
          <div>
            <p className="section-label">Default preferences</p>
            <h2 id={titleId}>Transaction defaults</h2>
          </div>
        </div>

        <form className="manual-form default-preferences-form" onSubmit={(event) => void handleSubmit(event)}>
          <PreferenceField label="Default transaction type">
            <select
              onChange={(event) => setDefaultTransactionType(event.target.value as "expense" | "income")}
              value={defaultTransactionType}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </PreferenceField>

          <PreferenceField label="Default expense category">
            <select
              disabled={!expenseCategories.length}
              onChange={(event) => setDefaultExpenseCategory(event.target.value)}
              value={defaultExpenseCategory}
            >
              {expenseCategories.length ? null : <option value="">No expense categories</option>}
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
              {expenseCategories.some((category) => category.name === "Transfer") ? null : (
                <option value="Transfer">Transfer</option>
              )}
            </select>
          </PreferenceField>

          <PreferenceField label="Default income category">
            <select
              disabled={!incomeCategories.length}
              onChange={(event) => setDefaultIncomeCategory(event.target.value)}
              value={defaultIncomeCategory}
            >
              {incomeCategories.length ? null : <option value="">No income categories</option>}
              {incomeCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
              {incomeCategories.some((category) => category.name === "Transfer") ? null : (
                <option value="Transfer">Transfer</option>
              )}
            </select>
          </PreferenceField>

          {saveError ? <p className="form-banner form-banner-error">{saveError}</p> : null}

          <div className="dialog-actions">
            <button
              className="secondary-cta"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button className="primary-cta" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function PreferenceField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="field-block">
      <span>{label}</span>
      {children}
    </label>
  );
}
