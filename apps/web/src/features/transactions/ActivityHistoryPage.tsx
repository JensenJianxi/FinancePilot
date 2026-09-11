import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { PlaceholderCard } from "../../components/feedback/PlaceholderCard";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useFinanceSnapshot } from "../../hooks/useFinanceSnapshot";
import { formatCurrency } from "../../utils/format";
import { groupTransactionsByMonth, isTransactionInMonth } from "../../utils/transactions";
import { ActivityRow } from "./components/ActivityRow";

export default function ActivityHistoryPage() {
  const snapshot = useFinanceSnapshot();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const monthGroups = useMemo(
    () =>
      groupTransactionsByMonth(
        (snapshot.data?.transactions ?? []).filter(
          (transaction) => !isTransactionInMonth(transaction.date)
        )
      ),
    [snapshot.data?.transactions]
  );
  const selectedGroup = monthGroups.find(([month]) => month === selectedMonth) ?? null;
  const selectedTransactions = (selectedGroup?.[1] ?? []).filter((transaction) => {
    if (!deferredSearch) {
      return true;
    }

    return `${transaction.title} ${transaction.category} ${transaction.notes}`
      .toLowerCase()
      .includes(deferredSearch);
  });

  if (snapshot.isLoading) {
    return <LoadingState label="Opening your history" />;
  }

  if (snapshot.isError || !snapshot.data) {
    return (
      <ErrorState
        message={
          snapshot.error instanceof Error
            ? snapshot.error.message
            : "FinancePilot could not load your previous history."
        }
        onRetry={() => {
          void snapshot.refetch();
        }}
        title="Previous history is unavailable."
      />
    );
  }

  return (
    <div className="screen-stack history-page">
      <ScreenHeader
        actions={<Link className="inline-link" to="/expenses">← Back to Expenses</Link>}
        eyebrow="History"
        title="Previous History"
      />

      {selectedGroup ? (
        <section className="history-month-detail">
          <div className="history-detail-header">
            <button
              className="text-button"
              onClick={() => {
                setSelectedMonth(null);
                setSearch("");
              }}
              type="button"
            >
              ← All months
            </button>
            <h2>{selectedGroup[0]}</h2>
          </div>

          <input
            aria-label={`Search ${selectedGroup[0]} transactions`}
            className="search-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search this month"
            value={search}
          />

          {selectedTransactions.length ? (
            <div className="soft-card timeline-card">
              {selectedTransactions.map((transaction) => (
                <ActivityRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            <PlaceholderCard
              description="Try a different search."
              title="No matching transactions"
            />
          )}
        </section>
      ) : monthGroups.length ? (
        <section aria-label="Transaction history by month" className="history-month-list">
          {monthGroups.map(([month, items]) => {
            const expenseTotal = items
              .filter((transaction) => transaction.type === "expense")
              .reduce((sum, transaction) => sum + transaction.amount, 0);

            return (
              <button
                className="soft-card history-month-card"
                key={month}
                onClick={() => setSelectedMonth(month)}
                type="button"
              >
                <span className="history-month-copy">
                  <strong>{month}</strong>
                  <span>{items.length} {items.length === 1 ? "transaction" : "transactions"}</span>
                </span>
                <span className="history-month-total">
                  <small>Spent</small>
                  <strong>{formatCurrency(expenseTotal)}</strong>
                </span>
              </button>
            );
          })}
        </section>
      ) : (
        <PlaceholderCard
          description="Transactions from completed months will appear here."
          title="No previous history yet"
        />
      )}
    </div>
  );
}
