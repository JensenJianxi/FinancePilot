import type { FinanceWorkspaceSnapshotDto, ListTransactionsQueryDto } from "@finance-pilot/shared";

export interface WorkspaceSnapshotRepository {
  getWorkspaceSnapshot(): Promise<FinanceWorkspaceSnapshotDto>;
  listTransactions(query?: ListTransactionsQueryDto): Promise<FinanceWorkspaceSnapshotDto["transactions"]>;
}
