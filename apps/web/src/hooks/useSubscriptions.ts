import { useEffect, useMemo } from "react";
import type { Subscription } from "@finance-pilot/shared";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "../app/useUiStore";
import { isSubscriptionsApiEnabled, listSubscriptions } from "../services/subscriptionsApi";
import { useFinanceSnapshot } from "./useFinanceSnapshot";

export const subscriptionsQueryKey = ["subscriptions"];

function sortSubscriptions(left: Subscription, right: Subscription) {
  if (left.active !== right.active) {
    return left.active ? -1 : 1;
  }

  const dateComparison = left.nextPaymentDate.localeCompare(right.nextPaymentDate);
  return dateComparison || left.name.localeCompare(right.name);
}

export function useSubscriptions() {
  const shouldUseSubscriptionsApi = isSubscriptionsApiEnabled();
  const initializeLocalSubscriptions = useUiStore((state) => state.initializeLocalSubscriptions);
  const localSubscriptions = useUiStore((state) => state.localSubscriptions);
  const snapshot = useFinanceSnapshot();
  const liveSubscriptions = useQuery({
    enabled: shouldUseSubscriptionsApi,
    queryFn: listSubscriptions,
    queryKey: subscriptionsQueryKey,
    staleTime: 30_000
  });

  useEffect(() => {
    if (shouldUseSubscriptionsApi || localSubscriptions || !snapshot.data?.subscriptions.length) {
      return;
    }

    initializeLocalSubscriptions(snapshot.data.subscriptions);
  }, [
    initializeLocalSubscriptions,
    localSubscriptions,
    shouldUseSubscriptionsApi,
    snapshot.data?.subscriptions
  ]);

  const data = useMemo(() => {
    if (shouldUseSubscriptionsApi) {
      return liveSubscriptions.data?.slice().sort(sortSubscriptions);
    }

    return (localSubscriptions ?? snapshot.data?.subscriptions ?? []).slice().sort(sortSubscriptions);
  }, [liveSubscriptions.data, localSubscriptions, shouldUseSubscriptionsApi, snapshot.data?.subscriptions]);

  if (shouldUseSubscriptionsApi) {
    return {
      ...liveSubscriptions,
      data,
      isUsingLiveSubscriptions: true as const
    };
  }

  return {
    data,
    error: snapshot.error,
    isError: snapshot.isError,
    isLoading: snapshot.isLoading && !localSubscriptions,
    isUsingLiveSubscriptions: false as const,
    refetch: snapshot.refetch
  };
}
