import type { Budget } from "@finance-pilot/shared";
import { ProgressBar } from "../../../components/ui/ProgressBar";
import { formatCurrency } from "../../../utils/format";

export function BudgetProgress({
  budget,
  isDeletePending,
  onDelete,
  onEdit,
  periodMonth
}: {
  budget: Budget;
  isDeletePending?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  periodMonth: string;
}) {
  const progress = Math.min(Math.round((budget.spent / budget.limit) * 100), 100);
  const tone = budget.trend === "over" ? "danger" : budget.trend === "watch" ? "warning" : "success";

  return (
    <article className="progress-item budget-progress-item">
      <div className="budget-progress-header">
        <div className="budget-progress-copy">
          <strong>{budget.name ?? budget.category}</strong>
          <p className="progress-copy">
            {budget.category} · {periodMonth}
            {budget.recurrence === "monthly" ? " · Every month" : ""}
          </p>
        </div>
        <strong className="budget-progress-amount">
          {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
        </strong>
      </div>
      <ProgressBar tone={tone} value={progress} />
      <div className="budget-progress-footer">
        <span>{progress}% used</span>
        {onEdit || onDelete ? (
          <div className="budget-row-actions">
            {onEdit ? (
              <button className="budget-action-button" onClick={onEdit} type="button">
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                className="budget-action-button budget-delete-button"
                disabled={isDeletePending}
                onClick={onDelete}
                type="button"
              >
                {isDeletePending ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
