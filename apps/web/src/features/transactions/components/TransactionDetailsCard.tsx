import type { Transaction } from "@finance-pilot/shared";
import { formatCurrency, formatShortDate } from "../../../utils/format";

export function TransactionDetailsCard({
  actionError,
  actionSuccess,
  isDeletePending = false,
  onDelete,
  onEdit,
  transaction,
  variant = "card"
}: {
  actionError?: string | null;
  actionSuccess?: string | null;
  isDeletePending?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  transaction: Transaction | null;
  variant?: "card" | "dialog";
}) {
  if (!transaction) {
    return (
      <section className="soft-card transaction-detail-card transaction-detail-empty">
        <p className="section-label">Transaction details</p>
        <h3>Select a transaction</h3>
        <p>Choose an entry from the list to see the full details here.</p>
      </section>
    );
  }

  const amountPrefix = transaction.type === "expense" ? "-" : transaction.type === "income" ? "+" : "";

  return (
    <section className={`${variant === "card" ? "soft-card " : ""}transaction-detail-card`}>
      {variant === "card" ? (
        <>
          <p className="section-label">Transaction details</p>
          <h3>{transaction.title}</h3>
        </>
      ) : null}
      <div className={`detail-total ${transaction.type === "expense" ? "amount-negative" : "amount-positive"}`}>
        {amountPrefix}
        {formatCurrency(transaction.amount)}
      </div>
      <dl className="detail-grid">
        <div>
          <dt>Category</dt>
          <dd>{transaction.category}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatShortDate(transaction.date)}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{transaction.type}</dd>
        </div>
        <div className="detail-note">
          <dt>Note</dt>
          <dd>{transaction.notes || "No note added"}</dd>
        </div>
      </dl>
      {actionSuccess ? <p className="form-banner form-banner-success">{actionSuccess}</p> : null}
      {actionError ? <p className="form-banner form-banner-error">{actionError}</p> : null}
      {onEdit || onDelete ? (
        <div className="dialog-actions detail-card-actions">
          {onEdit ? (
            <button className="secondary-cta" onClick={onEdit} type="button">
              Edit transaction
            </button>
          ) : null}
          {onDelete ? (
            <button className="primary-cta danger-cta" disabled={isDeletePending} onClick={onDelete} type="button">
              {isDeletePending ? "Deleting..." : "Delete transaction"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
