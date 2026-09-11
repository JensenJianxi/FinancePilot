import { createServer } from "node:http";
import {
  type CreateCategoryInputDto,
  type CreateSettingsInputDto,
  type CreateSavingsGoalInputDto,
  type CreateSubscriptionInputDto,
  type CreateTransactionRequestDto,
  listTransactionsQueryDtoSchema,
  type UpdateCategoryInputDto,
  type UpdateSettingsInputDto,
  type UpdateSavingsGoalInputDto,
  type UpdateSubscriptionInputDto,
  type UpdateTransactionRequestDto
} from "@finance-pilot/shared";
import { CategoriesService } from "../core/CategoriesService";
import { FinanceReadService } from "../core/FinanceReadService";
import { SettingsService } from "../core/SettingsService";
import { SavingsGoalsService } from "../core/SavingsGoalsService";
import { SubscriptionsService } from "../core/SubscriptionsService";
import { TransactionsService } from "../core/TransactionsService";
import { resolveApiRuntimeConfig } from "../lib/config";
import {
  createApiErrorPayload,
  extractOrigin,
  logRequestResult,
  parseJsonRequestBody,
  sendJson
} from "../lib/http";

const localRequestUserId = "local-demo-user";

export function createLocalServer(
  service: FinanceReadService,
  categoriesService: CategoriesService,
  settingsService: SettingsService,
  savingsGoalsService: SavingsGoalsService,
  subscriptionsService: SubscriptionsService,
  transactionsService: TransactionsService
) {
  const config = resolveApiRuntimeConfig();

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const requestId = request.headers["x-request-id"]?.toString() ?? `local-${Date.now()}`;
    const origin = extractOrigin({
      Origin: request.headers.origin,
      origin: request.headers.origin
    });

    const respond = (statusCode: number, payload: unknown) => {
      sendJson(response, statusCode, payload, {
        allowedOrigins: config.allowedOrigins,
        origin
      });
      logRequestResult({
        method: request.method ?? "GET",
        requestId,
        route: url.pathname,
        statusCode
      });
    };

    if (request.method === "OPTIONS") {
      respond(204, null);
      return;
    }

    if (url.pathname === "/health") {
      respond(200, { service: "finance-pilot-api", status: "ok" });
      return;
    }

    const handlers: Record<string, () => Promise<unknown>> = {
      "/api/analytics": () => service.getAnalytics(),
      "/api/budgets": () => service.getBudgets(),
      "/api/dashboard": () => service.getDashboard(),
      "/api/goals": () => service.getSavingGoals(),
      "/api/notifications": () => service.getNotifications(),
      "/api/subscriptions": () => service.getSubscriptions(),
      "/api/workspace": () => service.getWorkspaceSnapshot(),
      "/api/transactions": () =>
        service.getTransactions(
          listTransactionsQueryDtoSchema.parse({
            category: url.searchParams.get("category") ?? undefined,
            categoryName: url.searchParams.get("categoryName") ?? undefined,
            month: url.searchParams.get("month") ?? undefined,
            paymentMethod: url.searchParams.get("paymentMethod") ?? undefined,
            type: url.searchParams.get("type") ?? undefined
          })
        )
    };

    const transactionCollectionRoute =
      url.pathname === "/transactions" || url.pathname === "/api/transactions";
    const transactionDetailsMatch =
      url.pathname.match(/^\/transactions\/([^/]+)$/) ??
      url.pathname.match(/^\/api\/transactions\/([^/]+)$/);
    const categoryCollectionRoute =
      url.pathname === "/categories" || url.pathname === "/api/categories";
    const categoryDetailsMatch =
      url.pathname.match(/^\/categories\/([^/]+)$/) ??
      url.pathname.match(/^\/api\/categories\/([^/]+)$/);
    const settingsRoute =
      url.pathname === "/settings" || url.pathname === "/api/settings";
    const subscriptionCollectionRoute =
      url.pathname === "/subscriptions" || url.pathname === "/api/subscriptions";
    const subscriptionDetailsMatch =
      url.pathname.match(/^\/subscriptions\/([^/]+)$/) ??
      url.pathname.match(/^\/api\/subscriptions\/([^/]+)$/);
    const savingsGoalCollectionRoute =
      url.pathname === "/goals" || url.pathname === "/api/goals";
    const savingsGoalDetailsMatch =
      url.pathname.match(/^\/goals\/([^/]+)$/) ??
      url.pathname.match(/^\/api\/goals\/([^/]+)$/);

    try {
      if (savingsGoalCollectionRoute) {
        if (request.method === "GET") {
          const payload = await savingsGoalsService.listSavingsGoals(localRequestUserId);
          respond(200, payload);
          return;
        }

        if (request.method === "POST") {
          const body = await parseJsonRequestBody<CreateSavingsGoalInputDto>(request);
          const payload = await savingsGoalsService.createSavingsGoal(localRequestUserId, body);
          respond(201, payload);
          return;
        }
      }

      if (savingsGoalDetailsMatch) {
        const goalId = decodeURIComponent(savingsGoalDetailsMatch[1] ?? "");

        if (request.method === "GET") {
          const payload = await savingsGoalsService.getSavingsGoal(localRequestUserId, goalId);
          respond(200, payload);
          return;
        }

        if (request.method === "PATCH") {
          const body = await parseJsonRequestBody<UpdateSavingsGoalInputDto>(request);
          const payload = await savingsGoalsService.updateSavingsGoal(
            localRequestUserId,
            goalId,
            body
          );
          respond(200, payload);
          return;
        }

        if (request.method === "DELETE") {
          const payload = await savingsGoalsService.deleteSavingsGoal(localRequestUserId, goalId);
          respond(200, payload);
          return;
        }
      }

      if (subscriptionCollectionRoute) {
        if (request.method === "GET") {
          const payload = await subscriptionsService.listSubscriptions(localRequestUserId);
          respond(200, payload);
          return;
        }

        if (request.method === "POST") {
          const body = await parseJsonRequestBody<CreateSubscriptionInputDto>(request);
          const payload = await subscriptionsService.createSubscription(localRequestUserId, body);
          respond(201, payload);
          return;
        }
      }

      if (subscriptionDetailsMatch) {
        const subscriptionId = decodeURIComponent(subscriptionDetailsMatch[1] ?? "");

        if (request.method === "PATCH") {
          const body = await parseJsonRequestBody<UpdateSubscriptionInputDto>(request);
          const payload = await subscriptionsService.updateSubscription(
            localRequestUserId,
            subscriptionId,
            body
          );
          respond(200, payload);
          return;
        }

        if (request.method === "DELETE") {
          const payload = await subscriptionsService.deleteSubscription(
            localRequestUserId,
            subscriptionId
          );
          respond(200, payload);
          return;
        }
      }

      if (settingsRoute) {
        if (request.method === "GET") {
          const payload = await settingsService.getSettings(localRequestUserId);
          respond(200, payload);
          return;
        }

        if (request.method === "POST") {
          const body = await parseJsonRequestBody<CreateSettingsInputDto>(request);
          const payload = await settingsService.createSettings(localRequestUserId, body);
          respond(201, payload);
          return;
        }

        if (request.method === "PATCH") {
          const body = await parseJsonRequestBody<UpdateSettingsInputDto>(request);
          const payload = await settingsService.updateSettings(localRequestUserId, body);
          respond(200, payload);
          return;
        }
      }

      if (categoryCollectionRoute) {
        if (request.method === "GET") {
          const payload = await categoriesService.listCategories(localRequestUserId);
          respond(200, payload);
          return;
        }

        if (request.method === "POST") {
          const body = await parseJsonRequestBody<CreateCategoryInputDto>(request);
          const payload = await categoriesService.createCategory(localRequestUserId, body);
          respond(201, payload);
          return;
        }
      }

      if (categoryDetailsMatch) {
        const categoryId = decodeURIComponent(categoryDetailsMatch[1] ?? "");

        if (request.method === "PATCH") {
          const body = await parseJsonRequestBody<UpdateCategoryInputDto>(request);
          const payload = await categoriesService.updateCategory(
            localRequestUserId,
            categoryId,
            body
          );
          respond(200, payload);
          return;
        }

        if (request.method === "DELETE") {
          const payload = await categoriesService.deleteCategory(localRequestUserId, categoryId);
          respond(200, payload);
          return;
        }
      }

      if (transactionCollectionRoute) {
        if (request.method === "GET") {
          const query = listTransactionsQueryDtoSchema.parse({
            category: url.searchParams.get("category") ?? undefined,
            categoryName: url.searchParams.get("categoryName") ?? undefined,
            month: url.searchParams.get("month") ?? undefined,
            paymentMethod: url.searchParams.get("paymentMethod") ?? undefined,
            type: url.searchParams.get("type") ?? undefined
          });
          const payload = await transactionsService.listTransactions(localRequestUserId, query);
          respond(200, payload);
          return;
        }

        if (request.method === "POST") {
          const body = await parseJsonRequestBody<CreateTransactionRequestDto>(request);
          const payload = await transactionsService.createTransaction(localRequestUserId, body);
          respond(201, payload);
          return;
        }
      }

      if (transactionDetailsMatch) {
        const transactionId = decodeURIComponent(transactionDetailsMatch[1] ?? "");

        if (request.method === "GET") {
          const payload = await transactionsService.getTransaction(localRequestUserId, transactionId);
          respond(200, payload);
          return;
        }

        if (request.method === "PATCH") {
          const body = await parseJsonRequestBody<UpdateTransactionRequestDto>(request);
          const payload = await transactionsService.updateTransaction(
            localRequestUserId,
            transactionId,
            body
          );
          respond(200, payload);
          return;
        }

        if (request.method === "DELETE") {
          const payload = await transactionsService.deleteTransaction(localRequestUserId, transactionId);
          respond(200, payload);
          return;
        }
      }

      const handler = handlers[url.pathname];

      if (!handler) {
        respond(404, {
          message: "Route not found",
          path: url.pathname
        });
        return;
      }

      const payload = await handler();
      respond(200, payload);
    } catch (error) {
      const errorPayload = createApiErrorPayload(error, requestId);
      respond(errorPayload.statusCode, errorPayload);
    }
  });
}
