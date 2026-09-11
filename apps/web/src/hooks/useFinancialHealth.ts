import { useQuery } from "@tanstack/react-query";
import {
  getFinancialHealthScore,
  isFinancialHealthApiEnabled
} from "../services/financialHealthApi";

export const financialHealthQueryKey = ["financial-health"];

export function useFinancialHealth() {
  return useQuery({
    enabled: isFinancialHealthApiEnabled(),
    queryFn: getFinancialHealthScore,
    queryKey: financialHealthQueryKey,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 30_000
  });
}
