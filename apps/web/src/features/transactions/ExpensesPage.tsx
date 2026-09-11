import { useMemo, useState } from "react";
import type { Transaction } from "@finance-pilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useUiStore } from "../../app/useUiStore";
import { ConfirmationDialog } from "../../components/feedback/ConfirmationDialog";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { PlaceholderCard } from "../../components/feedback/PlaceholderCard";
import { ModalDialog } from "../../components/overlays/ModalDialog";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { FilterIcon } from "../../components/ui/icons";
import { useCategories } from "../../hooks/useCategories";
import { useCurrentMonthKey } from "../../hooks/useCurrentMonthKey";
import { StatusPill } from "../../components/ui/StatusPill";
import { useFinanceSnapshot } from "../../hooks/useFinanceSnapshot";
import { financialHealthQueryKey } from "../../hooks/useFinancialHealth";
import { transactionsQueryKey } from "../../hooks/useTransactions";
import { deleteTransaction as deleteTransactionRequest, isTransactionsApiEnabled } from "../../services/transactionsApi";
import { formatCurrency } from "../../utils/format";
import { compareTransactions, isTransactionInMonth } from "../../utils/transactions";
import { TransactionComposer } from "./TransactionComposer";
import { ActivityRow } from "./components/ActivityRow";
import { ExpenseFilters, type ExpenseFilterState } from "./components/ExpenseFilters";
import { ExpenseSummaryCard } from "./components/ExpenseSummaryCard";
import { TransactionDetailsCard } from "./components/TransactionDetailsCard";

const initialFilters: ExpenseFilterState = {
  category: "all",
  search: "",
  sort: "newest",
  type: "all"
};
const emptyTransactions: Transaction[] = [];

export default function ExpensesPage() {
  const snapshot = useFinanceSnapshot();
  const categories = useCategories();
  const currentMonth = useCurrentMonthKey();
  const deleteLocalTransaction = useUiStore((state) => state.deleteTransaction);
  const openComposer = useUiStore((state) => state.openComposer);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExpenseFilterState>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ExpenseFilterState>(initialFilters);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const shouldUseTransactionsApi = isTransactionsApiEnabled();

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!shouldUseTransactionsApi) {
        deleteLocalTransaction(transaction.id);
        return { deleted: true, transactionId: transaction.id };
      }

      return deleteTransactionRequest(transaction.id);
    },
    onSuccess: async (_result, transaction) => {
      if (shouldUseTransactionsApi) {
        queryClient.setQueryData<Transaction[]>(transactionsQueryKey, (currentTransactions) =>
          currentTransactions
            ? currentTransactions.filter((item) => item.id !== transaction.id).sort(compareTransactions)
            : currentTransactions
        );
        await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
        await queryClient.invalidateQueries({ queryKey: financialHealthQueryKey });
      }

      setFeedback(`Deleted "${transaction.title}".`);
      setSelectedTransactionId(null);
      setShowDeleteConfirmation(false);
    },
    onError: () => {
      setShowDeleteConfirmation(false);
    }
  });

  const allTransactions = snapshot.data?.transactions ?? emptyTransactions;
  const currentMonthTransactions = useMemo(
    () => allTransactions.filter((transaction) => isTransactionInMonth(transaction.date, currentMonth)),
    [allTransactions, currentMonth]
  );
  const expenseTransactions = currentMonthTransactions.filter(
    (transaction) => transaction.type === "expense"
  );
  const categoryOptions = Array.from(
    new Set([
      ...currentMonthTransactions.map((item) => item.category),
      ...(categories.data ?? []).map((item) => item.name)
    ])
  ).sort();
  const filteredTransactions = useMemo(
    () => sortTransactions(filterTransactions(currentMonthTransactions, filters), filters.sort),
    [currentMonthTransactions, filters]
  );
  const filteredExpenseTransactions = filteredTransactions.filter(
    (transaction) => transaction.type === "expense"
  );

  const selectedTransaction =
    allTransactions.find((transaction) => transaction.id === selectedTransactionId) ?? null;

  if (snapshot.isLoading || categories.isLoading) {
    return <LoadingState label="Preparing your expenses" />;
  }

  if (snapshot.isError || categories.isError || !snapshot.data) {
    return (
      <ErrorState
        message={
          snapshot.error instanceof Error
            ? snapshot.error.message
            : categories.error instanceof Error
              ? categories.error.message
              : "FinancePilot could not load your expense activity from the live transactions API."
        }
        onRetry={() => {
          void snapshot.refetch();
          void categories.refetch();
        }}
        title="Expenses are unavailable."
      />
    );
  }

  const currentMonthExpenses = expenseTransactions;
  const currentMonthTotal = currentMonthExpenses
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const averageDailySpend = currentMonthTotal / Math.max(new Date().getDate(), 1);
  const topCategory = findTopCategory(currentMonthExpenses);
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="page-shell expenses-page">
      <ScreenHeader
        actions={
          <div className="screen-header-action-cluster">
            <button className="primary-cta expenses-header-cta tablet-up-only" onClick={openComposer} type="button">
              + Add expense
            </button>
            <Link className="inline-link" to="/activity">Previous history</Link>
          </div>
        }
        eyebrow="Expenses"
        title="Track every spend"
      />

      {feedback ? <p className="form-banner form-banner-success">{feedback}</p> : null}

      <section className="expenses-top-grid">
        <ExpenseSummaryCard
          label="Monthly expense total"
          meta="Current month"
          value={formatCurrency(currentMonthTotal)}
        />
        <ExpenseSummaryCard
          label="Daily average"
          meta="Current month"
          value={formatCurrency(Math.round(averageDailySpend))}
        />
        <ExpenseSummaryCard
          label="Top category"
          meta={topCategory.name}
          value={formatCurrency(topCategory.total)}
        />
      </section>

      <section className="expenses-main-column">
          <section className="soft-card">
              <div className="section-head">
                <div>
                  <p className="section-label">Category breakdown</p>
                  <h3>This month's spending</h3>
                </div>
              </div>
            <div className="breakdown-list">
              {filteredExpenseTransactions.length ? (
                buildBreakdown(filteredExpenseTransactions).map((item) => (
                  <div className="breakdown-row" key={item.name}>
                    <div className="breakdown-copy">
                      <strong>{item.name}</strong>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill progress-fill-accent" style={{ width: `${item.share}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <PlaceholderCard
                  description="Add expenses to see category totals."
                  title="No category breakdown yet"
                />
              )}
            </div>
          </section>

          <section className="soft-card filtered-results-card">
            <div className="filtered-results-header">
              <div>
                <p className="section-label">This month</p>
                <h3>Transactions</h3>
              </div>
              <div className="filtered-results-actions">
                <StatusPill tone="accent">{filteredTransactions.length} matches</StatusPill>
                <button
                  className="filter-trigger-button"
                  onClick={() => {
                    setDraftFilters(filters);
                    setShowFilters(true);
                  }}
                  type="button"
                >
                  <FilterIcon aria-hidden="true" />
                  Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
                </button>
              </div>
            </div>

            {filteredTransactions.length ? (
              <div className="activity-list filtered-transaction-list">
                {filteredTransactions.map((transaction) => (
                  <ActivityRow
                    key={transaction.id}
                    onClick={() => setSelectedTransactionId(transaction.id)}
                    transaction={transaction}
                  />
                ))}
              </div>
            ) : (
              <PlaceholderCard
                description={
                  currentMonthTransactions.length
                    ? "Clear a filter or try another search."
                    : "Add a transaction to begin."
                }
                title={currentMonthTransactions.length ? "No transactions match these filters" : "No transactions this month"}
              />
            )}
          </section>
      </section>

      {showFilters ? (
        <ModalDialog
          eyebrow="Transactions"
          onClose={() => setShowFilters(false)}
          title="Filter and sort"
        >
          <ExpenseFilters
            categories={categoryOptions}
            onChange={setDraftFilters}
            value={draftFilters}
          />
          <div className="dialog-actions filter-dialog-actions">
            <button
              className="primary-cta"
              onClick={() => {
                setFilters(draftFilters);
                setSelectedTransactionId(null);
                setShowFilters(false);
              }}
              type="button"
            >
              Apply filters
            </button>
            <button
              className="secondary-cta"
              onClick={() => setDraftFilters(initialFilters)}
              type="button"
            >
              Clear
            </button>
          </div>
        </ModalDialog>
      ) : null}

      {selectedTransaction ? (
        <ModalDialog
          eyebrow="Transaction details"
          isBusy={deleteTransactionMutation.isPending}
          onClose={() => setSelectedTransactionId(null)}
          title={selectedTransaction.title}
        >
          <TransactionDetailsCard
            actionError={
              deleteTransactionMutation.isError
                ? deleteTransactionMutation.error instanceof Error
                  ? deleteTransactionMutation.error.message
                  : "Unable to delete the transaction right now."
                : null
            }
            isDeletePending={deleteTransactionMutation.isPending}
            onDelete={() => {
              setFeedback(null);
              setShowDeleteConfirmation(true);
            }}
            onEdit={() => {
              setFeedback(null);
              setEditingTransaction(selectedTransaction);
              setSelectedTransactionId(null);
            }}
            transaction={selectedTransaction}
            variant="dialog"
          />
        </ModalDialog>
      ) : null}

      {editingTransaction ? (
        <TransactionComposer
          initialTransaction={editingTransaction}
          onClose={() => {
            setEditingTransaction(null);
          }}
          onSuccess={(message) => {
            setFeedback(message);
          }}
        />
      ) : null}

      {showDeleteConfirmation && selectedTransaction ? (
        <ConfirmationDialog
          confirmLabel="Delete transaction"
          description={`Delete "${selectedTransaction.title}"? This cannot be undone.`}
          isConfirmPending={deleteTransactionMutation.isPending}
          onCancel={() => {
            setShowDeleteConfirmation(false);
          }}
          onConfirm={() => {
            deleteTransactionMutation.mutate(selectedTransaction);
          }}
          title="Delete this transaction?"
        />
      ) : null}
    </div>
  );
}

function filterTransactions(transactions: Transaction[], filters: ExpenseFilterState) {
  return transactions.filter((transaction) => {
    const matchesSearch =
      !filters.search ||
      `${transaction.title} ${transaction.category} ${transaction.notes}`
        .toLowerCase()
        .includes(filters.search.toLowerCase());

    const matchesType = filters.type === "all" || transaction.type === filters.type;
    const matchesCategory =
      filters.category === "all" || transaction.category === filters.category;

    return matchesSearch && matchesType && matchesCategory;
  });
}

function sortTransactions(
  transactions: Transaction[],
  sort: ExpenseFilterState["sort"]
) {
  const sorted = [...transactions];

  if (sort === "amountDesc") {
    return sorted.sort((left, right) => right.amount - left.amount || compareTransactions(left, right));
  }

  if (sort === "amountAsc") {
    return sorted.sort((left, right) => left.amount - right.amount || compareTransactions(left, right));
  }

  if (sort === "oldest") {
    return sorted.sort((left, right) => compareTransactions(right, left));
  }

  if (sort === "titleAsc") {
    return sorted.sort(
      (left, right) => left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
        || compareTransactions(left, right)
    );
  }

  return sorted.sort(compareTransactions);
}

function countActiveFilters(filters: ExpenseFilterState) {
  return [
    filters.search,
    filters.type !== "all",
    filters.category !== "all",
    filters.sort !== "newest"
  ].filter(Boolean).length;
}

function findTopCategory(transactions: Transaction[]) {
  const totals = buildBreakdown(transactions);
  return totals[0] ?? { name: "No category", share: 0, total: 0 };
}

function buildBreakdown(transactions: Transaction[]) {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const map = new Map<string, number>();

  transactions.forEach((transaction) => {
    map.set(transaction.category, (map.get(transaction.category) ?? 0) + transaction.amount);
  });

  return Array.from(map.entries())
    .map(([name, amount]) => ({
      name,
      share: total ? Math.round((amount / total) * 100) : 0,
      total: amount
    }))
    .sort((a, b) => b.total - a.total);
}
