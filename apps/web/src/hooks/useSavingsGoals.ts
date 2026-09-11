import { useEffect, useMemo } from "react";
import type { SavingGoal } from "@finance-pilot/shared";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "../app/useUiStore";
import { isSavingsGoalsApiEnabled, listSavingsGoals } from "../services/savingsGoalsApi";
import { useFinanceSnapshot } from "./useFinanceSnapshot";

export const savingsGoalsQueryKey = ["savings-goals"];

function sortSavingsGoals(left: SavingGoal, right: SavingGoal) {
  const completedComparison = Number(left.currentAmount >= left.targetAmount) -
    Number(right.currentAmount >= right.targetAmount);
  return completedComparison || left.deadline.localeCompare(right.deadline) || left.name.localeCompare(right.name);
}

export function useSavingsGoals() {
  const shouldUseSavingsGoalsApi = isSavingsGoalsApiEnabled();
  const initializeLocalSavingsGoals = useUiStore((state) => state.initializeLocalSavingsGoals);
  const localSavingsGoals = useUiStore((state) => state.localSavingsGoals);
  const snapshot = useFinanceSnapshot();
  const liveGoals = useQuery({
    enabled: shouldUseSavingsGoalsApi,
    queryFn: listSavingsGoals,
    queryKey: savingsGoalsQueryKey,
    staleTime: 30_000
  });

  useEffect(() => {
    if (shouldUseSavingsGoalsApi || localSavingsGoals || !snapshot.data?.savingGoals.length) {
      return;
    }

    initializeLocalSavingsGoals(snapshot.data.savingGoals);
  }, [
    initializeLocalSavingsGoals,
    localSavingsGoals,
    shouldUseSavingsGoalsApi,
    snapshot.data?.savingGoals
  ]);

  const data = useMemo(() => {
    const goals = shouldUseSavingsGoalsApi
      ? liveGoals.data
      : localSavingsGoals ?? snapshot.data?.savingGoals;
    return (goals ?? []).slice().sort(sortSavingsGoals);
  }, [liveGoals.data, localSavingsGoals, shouldUseSavingsGoalsApi, snapshot.data?.savingGoals]);

  if (shouldUseSavingsGoalsApi) {
    return {
      ...liveGoals,
      data,
      isUsingLiveSavingsGoals: true as const
    };
  }

  return {
    data,
    error: snapshot.error,
    isError: snapshot.isError,
    isLoading: snapshot.isLoading && !localSavingsGoals,
    isUsingLiveSavingsGoals: false as const,
    refetch: snapshot.refetch
  };
}
