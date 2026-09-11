import { useState } from "react";
import type {
  CreateSavingsGoalInputDto,
  SavingGoal
} from "@finance-pilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUiStore } from "../../../app/useUiStore";
import { ConfirmationDialog } from "../../../components/feedback/ConfirmationDialog";
import { PlaceholderCard } from "../../../components/feedback/PlaceholderCard";
import { StatusPill } from "../../../components/ui/StatusPill";
import { financialHealthQueryKey } from "../../../hooks/useFinancialHealth";
import { savingsGoalsQueryKey, useSavingsGoals } from "../../../hooks/useSavingsGoals";
import {
  createSavingsGoal,
  deleteSavingsGoal,
  isSavingsGoalsApiEnabled,
  updateSavingsGoal
} from "../../../services/savingsGoalsApi";
import { formatCurrency } from "../../../utils/format";
import { SavingGoalProgress } from "./SavingGoalProgress";
import { SavingsGoalDialog, type SavingsGoalFormValues } from "./SavingsGoalDialog";

function sortGoals(left: SavingGoal, right: SavingGoal) {
  return left.deadline.localeCompare(right.deadline) || left.name.localeCompare(right.name);
}

export function SavingsGoalsSection() {
  const goals = useSavingsGoals();
  const queryClient = useQueryClient();
  const createLocalSavingsGoal = useUiStore((state) => state.createLocalSavingsGoal);
  const deleteLocalSavingsGoal = useUiStore((state) => state.deleteLocalSavingsGoal);
  const updateLocalSavingsGoal = useUiStore((state) => state.updateLocalSavingsGoal);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<SavingGoal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const shouldUseSavingsGoalsApi = isSavingsGoalsApiEnabled();

  async function updateCachedGoals(goal: SavingGoal) {
    queryClient.setQueryData<SavingGoal[]>(savingsGoalsQueryKey, (current) => {
      const next = current ? [...current] : [];
      const index = next.findIndex((item) => item.id === goal.id);

      if (index >= 0) {
        next[index] = goal;
      } else {
        next.push(goal);
      }

      return next.sort(sortGoals);
    });
    await queryClient.invalidateQueries({ queryKey: savingsGoalsQueryKey });
    await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
  }

  const saveMutation = useMutation({
    mutationFn: async (values: SavingsGoalFormValues) => {
      const payload: CreateSavingsGoalInputDto = values;

      if (!shouldUseSavingsGoalsApi) {
        const localGoal: SavingGoal = {
          ...payload,
          id: editingGoal?.id ?? `goal_local_${Date.now()}`
        };

        if (editingGoal) {
          updateLocalSavingsGoal(localGoal);
        } else {
          createLocalSavingsGoal(localGoal);
        }

        return localGoal;
      }

      return editingGoal
        ? updateSavingsGoal(editingGoal.id, payload)
        : createSavingsGoal(payload);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to save this goal.");
    },
    onSuccess: async (goal) => {
      setActionError(null);
      setFeedback("Saved successfully.");
      setEditingGoal(null);
      setIsDialogOpen(false);

      if (shouldUseSavingsGoalsApi) {
        await updateCachedGoals(goal);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (goal: SavingGoal) => {
      if (!shouldUseSavingsGoalsApi) {
        deleteLocalSavingsGoal(goal.id);
        return { deleted: true, goalId: goal.id };
      }

      return deleteSavingsGoal(goal.id);
    },
    onError: (error) => {
      setPendingDeletion(null);
      setFeedback(null);
      setActionError(error instanceof Error ? error.message : "Unable to delete this goal.");
    },
    onSuccess: async (_result, goal) => {
      setPendingDeletion(null);
      setActionError(null);
      setFeedback(`${goal.name} removed.`);

      if (shouldUseSavingsGoalsApi) {
        queryClient.setQueryData<SavingGoal[] | undefined>(savingsGoalsQueryKey, (current) =>
          current?.filter((item) => item.id !== goal.id)
        );
        await queryClient.invalidateQueries({ queryKey: savingsGoalsQueryKey });
        await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
      }
    }
  });

  return (
    <section className="soft-card savings-goals-card" id="savings-goals">
      <div className="section-head">
        <div>
          <p className="section-label">Savings goals</p>
          <h3>Moving forward</h3>
        </div>
        <div className="subscription-head-actions">
          <StatusPill tone="accent">{goals.data?.length ?? 0} active</StatusPill>
          <button
            className="text-button"
            disabled={saveMutation.isPending || deleteMutation.isPending}
            onClick={() => {
              setActionError(null);
              setFeedback(null);
              setEditingGoal(null);
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

      {goals.isLoading ? (
        <PlaceholderCard description="Loading goals..." title="Savings goals" />
      ) : goals.isError ? (
        <div>
          <PlaceholderCard description="FinancePilot could not load goals." title="Goals unavailable" />
          <button className="text-button" onClick={() => void goals.refetch()} type="button">Retry</button>
        </div>
      ) : goals.data?.length ? (
        <div className="progress-stack">
          {goals.data.map((goal) => (
            <SavingGoalProgress
              goal={goal}
              key={goal.id}
              onDelete={() => {
                setActionError(null);
                setFeedback(null);
                setPendingDeletion(goal);
              }}
              onEdit={() => {
                setActionError(null);
                setFeedback(null);
                setEditingGoal(goal);
                setIsDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <PlaceholderCard description="Add a goal to track progress." title="No savings goals yet" />
      )}

      {isDialogOpen ? (
        <SavingsGoalDialog
          error={actionError}
          goal={editingGoal}
          isSaving={saveMutation.isPending}
          onClose={() => {
            if (!saveMutation.isPending) {
              setIsDialogOpen(false);
              setEditingGoal(null);
              setActionError(null);
            }
          }}
          onNoChanges={() => {
            setFeedback("Nothing changed.");
            setIsDialogOpen(false);
            setEditingGoal(null);
            setActionError(null);
          }}
          onSubmit={(values) => saveMutation.mutate(values)}
        />
      ) : null}

      {pendingDeletion ? (
        <ConfirmationDialog
          confirmLabel="Delete goal"
          description={
            <>
              Delete <strong>{pendingDeletion.name}</strong> with a target of{" "}
              <strong>{formatCurrency(pendingDeletion.targetAmount)}</strong>? This cannot be undone.
            </>
          }
          isConfirmPending={deleteMutation.isPending}
          onCancel={() => setPendingDeletion(null)}
          onConfirm={() => deleteMutation.mutate(pendingDeletion)}
          title="Delete this goal?"
        />
      ) : null}
    </section>
  );
}
