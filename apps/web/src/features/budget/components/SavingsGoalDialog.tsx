import { useEffect } from "react";
import {
  createSavingsGoalInputDtoSchema,
  type CreateSavingsGoalInputDto,
  type SavingGoal
} from "@finance-pilot/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ModalDialog } from "../../../components/overlays/ModalDialog";

export type SavingsGoalFormValues = CreateSavingsGoalInputDto;

function getDefaultDeadline() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getDefaultValues(goal?: SavingGoal | null): SavingsGoalFormValues {
  return {
    currentAmount: goal?.currentAmount ?? 0,
    deadline: goal?.deadline ?? getDefaultDeadline(),
    monthlyContribution: goal?.monthlyContribution ?? 0,
    name: goal?.name ?? "",
    targetAmount: goal?.targetAmount ?? 0
  };
}

export function SavingsGoalDialog({
  error,
  goal,
  isSaving,
  onClose,
  onNoChanges,
  onSubmit
}: {
  error: string | null;
  goal?: SavingGoal | null;
  isSaving: boolean;
  onClose: () => void;
  onNoChanges: () => void;
  onSubmit: (values: SavingsGoalFormValues) => void;
}) {
  const form = useForm<SavingsGoalFormValues>({
    defaultValues: getDefaultValues(goal),
    resolver: zodResolver(createSavingsGoalInputDtoSchema)
  });

  useEffect(() => {
    form.reset(getDefaultValues(goal));
  }, [form, goal]);

  return (
    <ModalDialog
      eyebrow="Savings goal"
      isBusy={isSaving}
      onClose={onClose}
      title={goal ? "Edit goal" : "Add goal"}
    >
      <form
        className="manual-form savings-goal-form"
        onSubmit={form.handleSubmit((values) => {
          if (goal && !form.formState.isDirty) {
            onNoChanges();
            return;
          }

          onSubmit(values);
        })}
      >
        <label className="field-block">
          <span>Name</span>
          <input {...form.register("name")} autoComplete="off" placeholder="e.g. Emergency fund" type="text" />
          {form.formState.errors.name?.message ? <small>{form.formState.errors.name.message}</small> : null}
        </label>

        <label className="field-block">
          <span>Target amount</span>
          <input
            {...form.register("targetAmount", { valueAsNumber: true })}
            inputMode="decimal"
            min="0.01"
            step="0.01"
            type="number"
          />
          {form.formState.errors.targetAmount?.message ? (
            <small>{form.formState.errors.targetAmount.message}</small>
          ) : null}
        </label>

        <label className="field-block">
          <span>Saved so far</span>
          <input
            {...form.register("currentAmount", { valueAsNumber: true })}
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
          />
          {form.formState.errors.currentAmount?.message ? (
            <small>{form.formState.errors.currentAmount.message}</small>
          ) : null}
        </label>

        <label className="field-block">
          <span>Monthly contribution</span>
          <input
            {...form.register("monthlyContribution", { valueAsNumber: true })}
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
          />
          {form.formState.errors.monthlyContribution?.message ? (
            <small>{form.formState.errors.monthlyContribution.message}</small>
          ) : null}
        </label>

        <label className="field-block">
          <span>Target date</span>
          <input {...form.register("deadline")} type="date" />
          {form.formState.errors.deadline?.message ? (
            <small>{form.formState.errors.deadline.message}</small>
          ) : null}
        </label>

        {error ? <p className="form-banner form-banner-error">{error}</p> : null}

        <div className="dialog-actions">
          <button className="secondary-cta" disabled={isSaving} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-cta" disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : goal ? "Save changes" : "Add goal"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
