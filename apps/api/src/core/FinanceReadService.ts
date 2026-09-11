import type { ListTransactionsQueryDto } from "@finance-pilot/shared";
import type { WorkspaceSnapshotRepository } from "../repositories/WorkspaceSnapshotRepository";

export class FinanceReadService {
  constructor(private readonly repository: WorkspaceSnapshotRepository) {}

  async getWorkspaceSnapshot() {
    return this.repository.getWorkspaceSnapshot();
  }

  async getDashboard() {
    const snapshot = await this.repository.getWorkspaceSnapshot();
    return snapshot.summary;
  }

  async getTransactions(query?: ListTransactionsQueryDto) {
    return this.repository.listTransactions(query);
  }

  async getCategories() {
    const snapshot = await this.repository.getWorkspaceSnapshot();
    return snapshot.categories;
  }

  async getBudgets() {
    const snapshot = await this.repository.getWorkspaceSnapshot();
    return snapshot.budgets;
  }

  async getSavingGoals() {
    const snapshot = await this.repository.getWorkspaceSnapshot();
    return snapshot.savingGoals;
  }

  async getSubscriptions() {
    const snapshot = await this.repository.getWorkspaceSnapshot();
    return snapshot.subscriptions;
  }

  async getAnalytics() {
    const snapshot = await this.repository.getWorkspaceSnapshot();
    return snapshot.analytics;
  }

  async getNotifications() {
    const snapshot = await this.repository.getWorkspaceSnapshot();
    return snapshot.notifications;
  }
}
