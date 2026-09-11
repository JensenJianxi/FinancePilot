import type { Transaction } from "@finance-pilot/shared";
import { formatCurrency, formatShortDate } from "../../../utils/format";

export function ActivityRow({
  onClick,
  selected = false,
  transaction
}: {
  onClick?: () => void;
  selected?: boolean;
  transaction: Transaction;
}) {
  const content = (
    <>
      <div className="activity-copy">
        <strong className="activity-title">{transaction.title}</strong>
        <p className="activity-meta">
          {transaction.category} • {formatShortDate(transaction.date)}
        </p>
      </div>
      <div className="amount-block">
        <strong
          className={`activity-amount ${
            transaction.type === "expense" ? "amount-negative" : "amount-positive"
          }`}
        >
          {transaction.type === "expense" ? "-" : "+"}
          {formatCurrency(transaction.amount)}
        </strong>
        <span className="activity-note">{transaction.notes || "No note"}</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        className={`activity-row activity-row-button ${selected ? "activity-row-selected" : ""}`}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <div className="activity-row">{content}</div>;
}
