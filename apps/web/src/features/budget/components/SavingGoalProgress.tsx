import type { SavingGoal } from "@finance-pilot/shared";
import { ProgressBar } from "../../../components/ui/ProgressBar";
import { formatCompactCurrency, formatShortDate } from "../../../utils/format";

export function SavingGoalProgress({
  goal,
  onDelete,
  onEdit
}: {
  goal: SavingGoal;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

  return (
    <div className="progress-item">
      <div className="section-head savings-goal-title-row">
        <strong>{goal.name}</strong>
        <span>{progress}%</span>
      </div>
      <ProgressBar tone="accent" value={progress} />
      <p className="progress-copy">
        {formatCompactCurrency(goal.currentAmount)} of {formatCompactCurrency(goal.targetAmount)} ·{" "}
        {goal.predictedCompletion
          ? `Est. ${formatShortDate(goal.predictedCompletion)}`
          : `Target ${formatShortDate(goal.deadline)}`}
      </p>
      {onEdit || onDelete ? (
        <div className="savings-goal-actions">
          {onEdit ? <button className="text-button" onClick={onEdit} type="button">Edit</button> : null}
          {onDelete ? <button className="text-button danger-link" onClick={onDelete} type="button">Delete</button> : null}
        </div>
      ) : null}
    </div>
  );
}
