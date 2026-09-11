import type { Subscription } from "@finance-pilot/shared";
import { StatusPill } from "../../../components/ui/StatusPill";
import { formatCurrency } from "../../../utils/format";

function formatPaymentDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short"
  });
}

export function SubscriptionSummary({
  isPending,
  onDelete,
  onEdit,
  onToggle,
  subscription
}: {
  isPending: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: () => void;
  subscription: Subscription;
}) {
  return (
    <div className="subscription-item">
      <div className="subscription-copy">
        <strong>{subscription.name}</strong>
        <p>
          {subscription.categoryName} • {subscription.frequency} • {formatPaymentDate(subscription.nextPaymentDate)}
        </p>
        <div className="subscription-row-actions">
          <button className="text-button" disabled={isPending} onClick={onEdit} type="button">Edit</button>
          <button className="text-button" disabled={isPending} onClick={onToggle} type="button">
            {subscription.active ? "Pause" : "Enable"}
          </button>
          <button className="text-button" disabled={isPending} onClick={onDelete} type="button">Delete</button>
        </div>
      </div>
      <div className="subscription-meta">
        <StatusPill tone={subscription.active ? "success" : "warning"}>
          {subscription.active ? "Active" : "Paused"}
        </StatusPill>
        <strong>{formatCurrency(subscription.amount)}</strong>
      </div>
    </div>
  );
}
