import {
  financialHealthScoreDtoSchema,
  type FinancialHealthScore
} from "@finance-pilot/shared";
import { hasConfiguredApiBaseUrl, requestApi } from "./financeApi";

export function isFinancialHealthApiEnabled() {
  return hasConfiguredApiBaseUrl();
}

export async function getFinancialHealthScore(): Promise<FinancialHealthScore> {
  const response = await requestApi<FinancialHealthScore>("/financial-health");
  return financialHealthScoreDtoSchema.parse(response);
}
