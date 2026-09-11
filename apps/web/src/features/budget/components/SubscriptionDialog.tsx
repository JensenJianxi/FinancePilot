import { useEffect } from "react";
import {
  createSubscriptionInputDtoSchema,
  type Category,
  type CreateSubscriptionInputDto,
  type Subscription
} from "@finance-pilot/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ModalDialog } from "../../../components/overlays/ModalDialog";

const subscriptionFormSchema = createSubscriptionInputDtoSchema.omit({
  categoryName: true,
  paymentMethod: true
});
export type SubscriptionFormValues = Omit<
  CreateSubscriptionInputDto,
  "categoryName" | "paymentMethod"
>;

function getDefaultValues(
  categories: Category[],
  subscription?: Subscription | null
): SubscriptionFormValues {
  return {
    active: subscription?.active ?? true,
    amount: subscription?.amount ?? 0,
    autoCreateTransaction: subscription?.autoCreateTransaction ?? false,
    categoryId: subscription?.categoryId ?? categories[0]?.id ?? "",
    frequency: subscription?.frequency ?? "monthly",
    name: subscription?.name ?? "",
    nextPaymentDate: subscription?.nextPaymentDate ?? new Date().toISOString().slice(0, 10)
  };
}

export function SubscriptionDialog({
  categories,
  error,
  isSaving,
  onClose,
  onNoChanges,
  onSubmit,
  subscription
}: {
  categories: Category[];
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onNoChanges: () => void;
  onSubmit: (values: SubscriptionFormValues) => void;
  subscription?: Subscription | null;
}) {
  const form = useForm<SubscriptionFormValues>({
    defaultValues: getDefaultValues(categories, subscription),
    resolver: zodResolver(subscriptionFormSchema)
  });

  useEffect(() => {
    form.reset(getDefaultValues(categories, subscription));
  }, [categories, form, subscription]);

  return (
    <ModalDialog
      eyebrow="Recurring cost"
      isBusy={isSaving}
      onClose={onClose}
      title={subscription ? "Edit subscription" : "Add subscription"}
    >
      <form
        className="manual-form subscription-form"
        onSubmit={form.handleSubmit((values) => {
          if (subscription && !form.formState.isDirty) {
            onNoChanges();
            return;
          }

          onSubmit(values);
        })}
      >
        <label className="field-block">
          <span>Name</span>
          <input {...form.register("name")} autoComplete="off" placeholder="e.g. Netflix" type="text" />
          {form.formState.errors.name?.message ? <small>{form.formState.errors.name.message}</small> : null}
        </label>

        <label className="field-block">
          <span>Amount</span>
          <input
            {...form.register("amount", { valueAsNumber: true })}
            inputMode="decimal"
            min="0.01"
            step="0.01"
            type="number"
          />
          {form.formState.errors.amount?.message ? <small>{form.formState.errors.amount.message}</small> : null}
        </label>

        <label className="field-block">
          <span>Category</span>
          <select {...form.register("categoryId")} disabled={!categories.length}>
            {categories.length ? null : <option value="">No expense categories</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          {form.formState.errors.categoryId?.message ? (
            <small>{form.formState.errors.categoryId.message}</small>
          ) : null}
        </label>

        <label className="field-block">
          <span>Frequency</span>
          <select {...form.register("frequency")}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <label className="field-block">
          <span>Next payment</span>
          <input {...form.register("nextPaymentDate")} type="date" />
          {form.formState.errors.nextPaymentDate?.message ? (
            <small>{form.formState.errors.nextPaymentDate.message}</small>
          ) : null}
        </label>

        <label className="checkbox-field">
          <input {...form.register("active")} type="checkbox" />
          <span>Active subscription</span>
        </label>

        <label className="checkbox-field">
          <input {...form.register("autoCreateTransaction")} type="checkbox" />
          <span>Prepare automatic transaction creation</span>
        </label>
        <p className="header-copy subscription-future-note">
          Automatic transactions are not enabled yet.
        </p>

        {error ? <p className="form-banner form-banner-error">{error}</p> : null}

        <div className="dialog-actions">
          <button className="secondary-cta" disabled={isSaving} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="primary-cta"
            disabled={isSaving || !categories.length}
            type="submit"
          >
            {isSaving ? "Saving..." : subscription ? "Save changes" : "Add subscription"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
