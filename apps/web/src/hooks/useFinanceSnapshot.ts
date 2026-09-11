import { useMemo } from "react";
import type { FinanceSnapshot, Transaction } from "@finance-pilot/shared";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../app/AuthProvider";
import { getWorkspaceSnapshot } from "../services/financeApi";
import { useUiStore } from "../app/useUiStore";
import { compareTransactions, summarizeTransactions } from "../utils/transactions";
import { useTransactions } from "./useTransactions";
import { isTransactionsApiEnabled } from "../services/transactionsApi";

const placeholderEmail = "account@financepilot.local";

function getUserDisplayName(fullName?: string) {
  return fullName?.trim().split(/\s+/)[0] ?? "there";
}

function createLiveTransactionsSnapshot(
  transactions: Transaction[],
  user: ReturnType<typeof useAuth>["user"]
): FinanceSnapshot {
  const sortedTransactions = [...transactions].sort(compareTransactions);
  const summary = summarizeTransactions(sortedTransactions);

  return {
    analytics: {
      categoryBreakdown: [],
      healthScoreTrend: [],
      monthlyCashFlow: []
    },
    budgets: [],
    categories: [],
    notifications: [],
    savingGoals: [],
    scores: [],
    subscriptions: [],
    summary: {
      currentBalance: summary.currentBalance,
      healthScore: 0,
      monthlyExpense: summary.monthlyExpense,
      monthlyIncome: summary.monthlyIncome,
      savingsRate: summary.savingsRate,
      spendingSummary:
        "Live transactions are connected. More analytics will appear when the remaining backend modules are ready.",
      upcomingBills: 0,
      userDisplayName: getUserDisplayName(user?.fullName)
    },
    transactions: sortedTransactions,
    user: {
      email: user?.email ?? placeholderEmail,
      emailVerified: user?.emailVerified ?? false,
      fullName: user?.fullName ?? "FinancePilot user",
      id: user?.userId ?? "authenticated-user"
    }
  };
}

export function useFinanceSnapshot() {
  const { user } = useAuth();
  const deletedTransactionIds = useUiStore((state) => state.deletedTransactionIds);
  const draftTransactions = useUiStore((state) => state.draftTransactions);
  const liveTransactions = useTransactions();
  const shouldUseTransactionsApi = isTransactionsApiEnabled();
  const snapshot = useQuery({
    enabled: !shouldUseTransactionsApi,
    queryKey: ["workspace-snapshot"],
    queryFn: getWorkspaceSnapshot
  });

  const data = useMemo(() => {
    if (shouldUseTransactionsApi) {
      return liveTransactions.data ? createLiveTransactionsSnapshot(liveTransactions.data, user) : undefined;
    }

    if (!snapshot.data) {
      return undefined;
    }

    const transactions = liveTransactions.data
      ? [...liveTransactions.data].sort(compareTransactions)
      : (() => {
          const mergedTransactions = [
            ...draftTransactions,
            ...snapshot.data.transactions.filter(
              (transaction) =>
                !deletedTransactionIds.includes(transaction.id) &&
                !draftTransactions.some((draftTransaction) => draftTransaction.id === transaction.id)
            )
          ];

          return mergedTransactions.sort(compareTransactions);
        })();

    return {
      ...snapshot.data,
      transactions
    };
  }, [
    deletedTransactionIds,
    draftTransactions,
    liveTransactions.data,
    shouldUseTransactionsApi,
    snapshot.data,
    user
  ]);

  if (shouldUseTransactionsApi) {
    return {
      ...liveTransactions,
      data,
      isUsingLiveTransactions: true as const
    };
  }

  return {
    ...snapshot,
    data,
    isUsingLiveTransactions: false as const
  };
}
