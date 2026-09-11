import { useEffect, useMemo } from "react";
import type { Budget } from "@finance-pilot/shared";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "../app/useUiStore";
import { useFinanceSnapshot } from "./useFinanceSnapshot";
import { isBudgetsApiEnabled, listBudgets } from "../services/budgetsApi";

export const budgetsQueryKey = ["budgets"];

function sortBudgets(left: Budget, right: Budget) {
  const monthComparison = right.periodMonth.localeCompare(left.periodMonth);

  if (monthComparison !== 0) {
    return monthComparison;
  }

  return left.category.localeCompare(right.category);
}

export function useBudgets() {
  const shouldUseBudgetsApi = isBudgetsApiEnabled();
  const initializeLocalBudgets = useUiStore((state) => state.initializeLocalBudgets);
  const localBudgets = useUiStore((state) => state.localBudgets);
  const snapshot = useFinanceSnapshot();
  const liveBudgets = useQuery({
    enabled: shouldUseBudgetsApi,
    queryKey: budgetsQueryKey,
    queryFn: listBudgets
  });

  useEffect(() => {
    if (shouldUseBudgetsApi || localBudgets || !snapshot.data?.budgets.length) {
      return;
    }

    initializeLocalBudgets(snapshot.data.budgets);
  }, [initializeLocalBudgets, localBudgets, shouldUseBudgetsApi, snapshot.data?.budgets]);

  const data = useMemo(() => {
    if (shouldUseBudgetsApi) {
      return liveBudgets.data?.slice().sort(sortBudgets);
    }

    return (localBudgets ?? snapshot.data?.budgets ?? []).slice().sort(sortBudgets);
  }, [liveBudgets.data, localBudgets, shouldUseBudgetsApi, snapshot.data?.budgets]);

  if (shouldUseBudgetsApi) {
    return {
      ...liveBudgets,
      data,
      isUsingLiveBudgets: true as const
    };
  }

  return {
    data,
    error: snapshot.error,
    isError: snapshot.isError,
    isLoading: snapshot.isLoading && !localBudgets,
    isUsingLiveBudgets: false as const,
    refetch: snapshot.refetch
  };
}
