import { useMemo, useState } from "react";
import type {
  Category,
  CreateSubscriptionInputDto,
  Subscription,
  UpdateSubscriptionInputDto
} from "@finance-pilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUiStore } from "../../../app/useUiStore";
import { ConfirmationDialog } from "../../../components/feedback/ConfirmationDialog";
import { PlaceholderCard } from "../../../components/feedback/PlaceholderCard";
import { StatusPill } from "../../../components/ui/StatusPill";
import { financialHealthQueryKey } from "../../../hooks/useFinancialHealth";
import { subscriptionsQueryKey, useSubscriptions } from "../../../hooks/useSubscriptions";
import {
  createSubscription,
  deleteSubscription,
  isSubscriptionsApiEnabled,
  updateSubscription
} from "../../../services/subscriptionsApi";
import { formatCurrency } from "../../../utils/format";
import { SubscriptionDialog, type SubscriptionFormValues } from "./SubscriptionDialog";
import { SubscriptionSummary } from "./SubscriptionSummary";

function sortSubscriptions(left: Subscription, right: Subscription) {
  if (left.active !== right.active) {
    return left.active ? -1 : 1;
  }

  return left.nextPaymentDate.localeCompare(right.nextPaymentDate) || left.name.localeCompare(right.name);
}

export function SubscriptionsSection({ categories }: { categories: Category[] }) {
  const subscriptions = useSubscriptions();
  const queryClient = useQueryClient();
  const createLocalSubscription = useUiStore((state) => state.createLocalSubscription);
  const deleteLocalSubscription = useUiStore((state) => state.deleteLocalSubscription);
  const updateLocalSubscription = useUiStore((state) => state.updateLocalSubscription);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<Subscription | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const shouldUseSubscriptionsApi = isSubscriptionsApiEnabled();
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "expense"),
    [categories]
  );
  const inactiveCount = subscriptions.data?.filter((subscription) => !subscription.active).length ?? 0;

  async function updateCachedSubscriptions(subscription: Subscription) {
    queryClient.setQueryData<Subscription[]>(subscriptionsQueryKey, (current) => {
      const next = current ? [...current] : [];
      const existingIndex = next.findIndex((item) => item.id === subscription.id);

      if (existingIndex >= 0) {
        next[existingIndex] = subscription;
      } else {
        next.push(subscription);
      }

      return next.sort(sortSubscriptions);
    });
    await queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey });
    await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
  }

  const saveMutation = useMutation({
    mutationFn: async (values: SubscriptionFormValues) => {
      const category = expenseCategories.find((item) => item.id === values.categoryId);

      if (!category) {
        throw new Error("Choose an expense category before saving this subscription.");
      }

      const payload: CreateSubscriptionInputDto = {
        ...values,
        categoryName: category.name,
        paymentMethod: editingSubscription?.paymentMethod || "Not specified"
      };

      if (!shouldUseSubscriptionsApi) {
        const timestamp = new Date().toISOString();
        const localSubscription: Subscription = {
          ...payload,
          createdAt: editingSubscription?.createdAt ?? timestamp,
          id: editingSubscription?.id ?? `sub_local_${Date.now()}`,
          updatedAt: timestamp
        };

        if (editingSubscription) {
          updateLocalSubscription(localSubscription);
        } else {
          createLocalSubscription(localSubscription);
        }

        return localSubscription;
      }

      if (editingSubscription) {
        return updateSubscription(editingSubscription.id, payload);
      }

      return createSubscription(payload);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to save this subscription.");
    },
    onSuccess: async (subscription) => {
      setActionError(null);
      setFeedback("Saved successfully.");
      setEditingSubscription(null);
      setIsDialogOpen(false);

      if (shouldUseSubscriptionsApi) {
        await updateCachedSubscriptions(subscription);
      }
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (subscription: Subscription) => {
      const input: UpdateSubscriptionInputDto = { active: !subscription.active };

      if (!shouldUseSubscriptionsApi) {
        const updated = {
          ...subscription,
          active: !subscription.active,
          updatedAt: new Date().toISOString()
        };
        updateLocalSubscription(updated);
        return updated;
      }

      return updateSubscription(subscription.id, input);
    },
    onError: (error) => {
      setFeedback(null);
      setActionError(error instanceof Error ? error.message : "Unable to update this subscription.");
    },
    onSuccess: async (subscription) => {
      setActionError(null);
      setFeedback(subscription.active ? "Subscription enabled." : "Subscription paused.");

      if (shouldUseSubscriptionsApi) {
        await updateCachedSubscriptions(subscription);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (subscription: Subscription) => {
      if (!shouldUseSubscriptionsApi) {
        deleteLocalSubscription(subscription.id);
        return { deleted: true, subscriptionId: subscription.id };
      }

      return deleteSubscription(subscription.id);
    },
    onError: (error) => {
      setPendingDeletion(null);
      setFeedback(null);
      setActionError(error instanceof Error ? error.message : "Unable to delete this subscription.");
    },
    onSuccess: async (_result, subscription) => {
      setPendingDeletion(null);
      setActionError(null);
      setFeedback(`${subscription.name} removed.`);

      if (shouldUseSubscriptionsApi) {
        queryClient.setQueryData<Subscription[] | undefined>(subscriptionsQueryKey, (current) =>
          current?.filter((item) => item.id !== subscription.id)
        );
        await queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey });
        await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
      }
    }
  });

  const isPending = saveMutation.isPending || toggleMutation.isPending || deleteMutation.isPending;

  return (
    <section className="soft-card subscriptions-card" id="subscriptions">
      <div className="section-head">
        <div>
          <p className="section-label">Subscriptions</p>
          <h3>Recurring costs</h3>
        </div>
        <div className="subscription-head-actions">
          <StatusPill tone={inactiveCount ? "warning" : "success"}>
            {inactiveCount ? `${inactiveCount} paused` : `${subscriptions.data?.length ?? 0} active`}
          </StatusPill>
          <button
            className="text-button"
            disabled={!expenseCategories.length || isPending}
            onClick={() => {
              setActionError(null);
              setFeedback(null);
              setEditingSubscription(null);
              setIsDialogOpen(true);
            }}
            type="button"
          >
            Add
          </button>
        </div>
      </div>

      {feedback ? <p className="form-banner form-banner-success" role="status">{feedback}</p> : null}
      {actionError && !isDialogOpen ? <p className="form-banner form-banner-error">{actionError}</p> : null}

      {subscriptions.isLoading ? (
        <PlaceholderCard description="Loading recurring costs..." title="Subscriptions" />
      ) : subscriptions.isError ? (
        <div>
          <PlaceholderCard
            description="FinancePilot could not load subscriptions."
            title="Subscriptions unavailable"
          />
          <button className="text-button" onClick={() => void subscriptions.refetch()} type="button">Retry</button>
        </div>
      ) : subscriptions.data?.length ? (
        <div className="recommendation-list">
          {subscriptions.data.map((subscription) => (
            <SubscriptionSummary
              isPending={isPending}
              key={subscription.id}
              onDelete={() => {
                setActionError(null);
                setFeedback(null);
                setPendingDeletion(subscription);
              }}
              onEdit={() => {
                setActionError(null);
                setFeedback(null);
                setEditingSubscription(subscription);
                setIsDialogOpen(true);
              }}
              onToggle={() => toggleMutation.mutate(subscription)}
              subscription={subscription}
            />
          ))}
        </div>
      ) : (
        <PlaceholderCard description="Add a recurring payment to begin." title="No subscriptions yet" />
      )}

      {isDialogOpen ? (
        <SubscriptionDialog
          categories={expenseCategories}
          error={actionError}
          isSaving={saveMutation.isPending}
          onClose={() => {
            if (!saveMutation.isPending) {
              setIsDialogOpen(false);
              setEditingSubscription(null);
              setActionError(null);
            }
          }}
          onNoChanges={() => {
            setFeedback("Nothing changed.");
            setIsDialogOpen(false);
            setEditingSubscription(null);
            setActionError(null);
          }}
          onSubmit={(values) => saveMutation.mutate(values)}
          subscription={editingSubscription}
        />
      ) : null}

      {pendingDeletion ? (
        <ConfirmationDialog
          confirmLabel="Delete subscription"
          description={
            <>
              Delete <strong>{pendingDeletion.name}</strong> at{" "}
              <strong>{formatCurrency(pendingDeletion.amount)}</strong>? This cannot be undone.
            </>
          }
          isConfirmPending={deleteMutation.isPending}
          onCancel={() => setPendingDeletion(null)}
          onConfirm={() => deleteMutation.mutate(pendingDeletion)}
          title="Delete this subscription?"
        />
      ) : null}
    </section>
  );
}
