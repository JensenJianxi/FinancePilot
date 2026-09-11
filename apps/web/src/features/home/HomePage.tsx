import { Link } from "react-router-dom";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { PlaceholderCard } from "../../components/feedback/PlaceholderCard";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { StatusPill } from "../../components/ui/StatusPill";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { useBudgets } from "../../hooks/useBudgets";
import { useCurrentMonthKey } from "../../hooks/useCurrentMonthKey";
import { useFinanceSnapshot } from "../../hooks/useFinanceSnapshot";
import { useSavingsGoals } from "../../hooks/useSavingsGoals";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { formatCurrency } from "../../utils/format";
import { isBudgetActiveForMonth } from "../../utils/budgets";
import {
  getHighestSpendingTitle,
  sortExpensesByAmount
} from "../../utils/transactions";
import { SavingGoalProgress } from "../budget/components/SavingGoalProgress";
import { ActivityRow } from "../transactions/components/ActivityRow";
import { CompactMetric } from "./components/CompactMetric";
import { DashboardLinkCard } from "./components/DashboardLinkCard";

function formatUpcomingDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short"
  });
}

export default function HomePage() {
  const snapshot = useFinanceSnapshot();
  const budgets = useBudgets();
  const currentMonth = useCurrentMonthKey();
  const savingsGoals = useSavingsGoals();
  const subscriptions = useSubscriptions();
  const formattedToday = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    weekday: "long"
  });

  if (snapshot.isLoading) {
    return <LoadingState label="Preparing your money overview" />;
  }

  if (snapshot.isError || !snapshot.data) {
    return (
      <ErrorState
        message={
          snapshot.error instanceof Error
            ? snapshot.error.message
            : "FinancePilot could not load your dashboard from the live transactions API."
        }
        onRetry={() => {
          void snapshot.refetch();
        }}
        title="Dashboard data is unavailable."
      />
    );
  }

  const { summary, notifications, transactions } = snapshot.data;
  const rankedExpenses = sortExpensesByAmount(transactions, currentMonth);
  const hasRankedExpenses = rankedExpenses.length > 0;
  const currentBudgets = (budgets.data ?? []).filter((budget) =>
    isBudgetActiveForMonth(budget, currentMonth)
  );
  const monthlyBudgetLimit = currentBudgets.reduce((total, budget) => total + budget.limit, 0);
  const hasMonthlyBudget = monthlyBudgetLimit > 0;
  const budgetDifference = monthlyBudgetLimit - summary.monthlyExpense;
  const budgetUsage = hasMonthlyBudget
    ? Math.min(100, (summary.monthlyExpense / monthlyBudgetLimit) * 100)
    : 0;
  const budgetTone = budgetUsage >= 100 ? "danger" : budgetUsage >= 80 ? "warning" : "success";
  const topSpending = getHighestSpendingTitle(transactions, currentMonth);
  const upcomingSubscriptions = (subscriptions.data ?? [])
    .filter((subscription) => subscription.active)
    .slice(0, 3);
  const hasSavingGoals = savingsGoals.data.length > 0;
  const nextNotification = notifications[0] ?? null;

  return (
    <div className="page-shell home-page">
      <ScreenHeader
        eyebrow={formattedToday}
        title="Good evening"
      />

      <DashboardLinkCard
        ariaLabel="Open Expenses to review this month's spending"
        className="home-hero-card"
        to="/expenses"
      >
        <div className="balance-block">
          <p className="section-label">Spent this month</p>
          <h2>{formatCurrency(summary.monthlyExpense)}</h2>
          <div className="monthly-budget-overview">
            <span>
              {budgets.isLoading
                ? "Loading monthly budget..."
                : budgets.isError
                  ? "Monthly budget unavailable"
                  : hasMonthlyBudget
                    ? `${formatCurrency(summary.monthlyExpense)} of ${formatCurrency(monthlyBudgetLimit)} used`
                    : "No monthly budget set"}
            </span>
            {hasMonthlyBudget ? <ProgressBar tone={budgetTone} value={budgetUsage} /> : null}
          </div>
        </div>
        <div className="summary-strip" aria-label="Monthly summary">
          <CompactMetric
            label={hasMonthlyBudget && budgetDifference < 0 ? "Over budget" : "Budget left"}
            value={hasMonthlyBudget ? formatCurrency(Math.abs(budgetDifference)) : "Not set"}
          />
          <CompactMetric
            label="Highest spend"
            value={topSpending ? `${topSpending.title} · ${formatCurrency(topSpending.amount)}` : "No spending yet"}
          />
        </div>
      </DashboardLinkCard>

      <section className="dashboard-layout">
        <div className="dashboard-main-column">
          <DashboardLinkCard
            ariaLabel="Open Expenses and review this month's spending"
            className="soft-card"
            to="/expenses"
          >
            <div className="section-head">
              <div>
                <p className="section-label">This month's expenses</p>
                <h3>Highest to lowest</h3>
              </div>
              <Link className="inline-link" to="/expenses">
                Open Expenses
              </Link>
            </div>
            {hasRankedExpenses ? (
              <div className="activity-list home-expense-ranking">
                {rankedExpenses.map((transaction) => (
                  <ActivityRow key={transaction.id} transaction={transaction} />
                ))}
              </div>
            ) : (
              <PlaceholderCard
                description="Add a transaction to begin."
                title="No expenses yet"
              />
            )}
          </DashboardLinkCard>
        </div>

        <div className="dashboard-side-column">
          <DashboardLinkCard
            ariaLabel="Open recurring costs in Budget"
            className="soft-card"
            to="/budget#subscriptions"
          >
            <div className="section-head">
              <div>
                <p className="section-label">Upcoming recurring payments</p>
                <h3>Keep an eye on</h3>
              </div>
              <StatusPill tone={upcomingSubscriptions.length ? "warning" : "accent"}>
                {upcomingSubscriptions.length} upcoming
              </StatusPill>
            </div>
            {subscriptions.isLoading ? (
              <PlaceholderCard description="Loading recurring costs..." title="Upcoming bills" />
            ) : subscriptions.isError ? (
              <div>
                <PlaceholderCard
                  description="FinancePilot could not load recurring costs."
                  title="Upcoming bills unavailable"
                />
                <button className="text-button" onClick={() => void subscriptions.refetch()} type="button">
                  Retry
                </button>
              </div>
            ) : upcomingSubscriptions.length ? (
              <div className="recommendation-list">
                {upcomingSubscriptions.map((subscription) => (
                  <div className="recommendation-item" key={subscription.id}>
                    <strong>{subscription.name}</strong>
                    <p>
                      {formatCurrency(subscription.amount)} • {formatUpcomingDate(subscription.nextPaymentDate)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <PlaceholderCard
                description="Add subscriptions to track renewals."
                title="No upcoming bills"
              />
            )}
          </DashboardLinkCard>

          <DashboardLinkCard
            ariaLabel="Open Savings goals in Budget"
            className="soft-card"
            to="/budget#savings-goals"
          >
            <div className="section-head">
              <div>
                <p className="section-label">Savings goals</p>
                <h3>Long-term progress</h3>
              </div>
            </div>
            {savingsGoals.isLoading ? (
              <PlaceholderCard description="Loading goals..." title="Savings goals" />
            ) : savingsGoals.isError ? (
              <div>
                <PlaceholderCard description="FinancePilot could not load goals." title="Goals unavailable" />
                <button className="text-button" onClick={() => void savingsGoals.refetch()} type="button">
                  Retry
                </button>
              </div>
            ) : hasSavingGoals ? (
              <div className="progress-stack">
                {savingsGoals.data.slice(0, 3).map((goal) => (
                  <SavingGoalProgress goal={goal} key={goal.id} />
                ))}
              </div>
            ) : (
              <PlaceholderCard
                description="Add a goal to track progress."
                title="No savings goals yet"
              />
            )}
          </DashboardLinkCard>

          {nextNotification ? (
            <DashboardLinkCard
              ariaLabel="Open notification preferences"
              className="soft-card notice-card"
              to="/more"
            >
              <p className="section-label">Heads up</p>
              <strong>{nextNotification.title}</strong>
            </DashboardLinkCard>
          ) : null}
        </div>
      </section>
    </div>
  );
}
