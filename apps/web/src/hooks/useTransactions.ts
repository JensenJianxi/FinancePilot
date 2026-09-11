import { useQuery } from "@tanstack/react-query";
import { listTransactions, isTransactionsApiEnabled } from "../services/transactionsApi";

export const transactionsQueryKey = ["transactions"];

export function useTransactions() {
  return useQuery({
    enabled: isTransactionsApiEnabled(),
    queryKey: transactionsQueryKey,
    queryFn: listTransactions
  });
}
