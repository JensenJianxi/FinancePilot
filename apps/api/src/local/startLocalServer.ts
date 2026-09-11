import { CategoriesService } from "../core/CategoriesService";
import { FinanceReadService } from "../core/FinanceReadService";
import { SettingsService } from "../core/SettingsService";
import { SavingsGoalsService } from "../core/SavingsGoalsService";
import { SubscriptionsService } from "../core/SubscriptionsService";
import { TransactionsService } from "../core/TransactionsService";
import { resolveApiRuntimeConfig } from "../lib/config";
import { MockWorkspaceSnapshotRepository } from "./MockWorkspaceSnapshotRepository";
import { createLocalServer } from "./createLocalServer";

export function startLocalServer() {
  const config = resolveApiRuntimeConfig();
  const repository = new MockWorkspaceSnapshotRepository();
  const service = new FinanceReadService(repository);
  const categoriesService = new CategoriesService(repository);
  const settingsService = new SettingsService(repository);
  const savingsGoalsService = new SavingsGoalsService(repository);
  const subscriptionsService = new SubscriptionsService(repository);
  const transactionsService = new TransactionsService(repository);
  const server = createLocalServer(
    service,
    categoriesService,
    settingsService,
    savingsGoalsService,
    subscriptionsService,
    transactionsService
  );

  server.listen(config.port, () => {
    console.log(`FinancePilot API listening on http://localhost:${config.port}`);
  });

  return server;
}
