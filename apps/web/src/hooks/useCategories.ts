import { useEffect, useMemo } from "react";
import type { Category } from "@finance-pilot/shared";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "../app/useUiStore";
import { useFinanceSnapshot } from "./useFinanceSnapshot";
import { isCategoriesApiEnabled, listCategories } from "../services/categoriesApi";

export const categoriesQueryKey = ["categories"];

function sortCategories(left: Category, right: Category) {
  const typeComparison = left.type.localeCompare(right.type);

  if (typeComparison !== 0) {
    return typeComparison;
  }

  if (left.isDefault !== right.isDefault) {
    return left.isDefault ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

export function useCategories() {
  const shouldUseCategoriesApi = isCategoriesApiEnabled();
  const initializeLocalCategories = useUiStore((state) => state.initializeLocalCategories);
  const localCategories = useUiStore((state) => state.localCategories);
  const snapshot = useFinanceSnapshot();
  const liveCategories = useQuery({
    enabled: shouldUseCategoriesApi,
    queryKey: categoriesQueryKey,
    queryFn: listCategories
  });

  useEffect(() => {
    if (shouldUseCategoriesApi || localCategories || !snapshot.data?.categories.length) {
      return;
    }

    initializeLocalCategories(snapshot.data.categories);
  }, [initializeLocalCategories, localCategories, shouldUseCategoriesApi, snapshot.data?.categories]);

  const data = useMemo(() => {
    if (shouldUseCategoriesApi) {
      return liveCategories.data?.slice().sort(sortCategories);
    }

    return (localCategories ?? snapshot.data?.categories ?? []).slice().sort(sortCategories);
  }, [liveCategories.data, localCategories, shouldUseCategoriesApi, snapshot.data?.categories]);

  if (shouldUseCategoriesApi) {
    return {
      ...liveCategories,
      data,
      isUsingLiveCategories: true as const
    };
  }

  return {
    data,
    error: snapshot.error,
    isError: snapshot.isError,
    isLoading: snapshot.isLoading && !localCategories,
    isUsingLiveCategories: false as const,
    refetch: snapshot.refetch
  };
}
