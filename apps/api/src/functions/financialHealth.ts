import { FinancialHealthService } from "../core/FinancialHealthService";
import { resolveFinancialHealthRuntimeConfig } from "../lib/config";
import { AppError } from "../lib/errors";
import {
  createApiErrorPayload,
  createJsonResponse,
  extractOrigin,
  logRequestError,
  logRequestResult
} from "../lib/http";
import {
  DynamoBudgetsRepository,
  DynamoFinancialHealthScoresRepository,
  DynamoSavingsGoalsRepository,
  DynamoSubscriptionsRepository,
  DynamoTransactionsRepository
} from "../repositories";

interface ApiGatewayRequestContext {
  authorizer?: {
    jwt?: {
      claims?: Record<string, string | undefined>;
    };
  };
  http?: {
    method?: string;
    path?: string;
  };
  requestId?: string;
}

interface ApiGatewayHttpEvent {
  headers?: Record<string, string | undefined>;
  rawPath?: string;
  requestContext: ApiGatewayRequestContext;
}

const config = resolveFinancialHealthRuntimeConfig();
const financialHealthService = new FinancialHealthService(
  new DynamoTransactionsRepository({ tableName: config.transactionsTable }),
  new DynamoBudgetsRepository({ tableName: config.budgetsTable }),
  new DynamoSavingsGoalsRepository({ tableName: config.savingsGoalsTable }),
  new DynamoSubscriptionsRepository({ tableName: config.subscriptionsTable }),
  new DynamoFinancialHealthScoresRepository({
    tableName: config.financialHealthScoresTable
  })
);

function getAuthenticatedUserId(event: ApiGatewayHttpEvent) {
  const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

  if (!userId) {
    throw new AppError("Authentication is required.", "UNAUTHORIZED", 401);
  }

  return userId;
}

function getEventMethod(event: ApiGatewayHttpEvent) {
  return event.requestContext.http?.method ?? "GET";
}

function getEventPath(event: ApiGatewayHttpEvent) {
  return event.rawPath ?? event.requestContext.http?.path ?? "/";
}

export async function handler(event: ApiGatewayHttpEvent) {
  const method = getEventMethod(event);
  const route = getEventPath(event);
  const requestId = event.requestContext.requestId ?? `lambda-${Date.now()}`;
  const origin = extractOrigin({
    Origin: event.headers?.Origin,
    origin: event.headers?.origin
  });
  const respond = (statusCode: number, payload: unknown) => {
    logRequestResult({ method, requestId, route, statusCode });
    return createJsonResponse(statusCode, payload, {
      allowedOrigins: config.allowedOrigins,
      origin
    });
  };

  try {
    if (method === "OPTIONS") {
      return respond(204, null);
    }

    if (route !== "/financial-health" || method !== "GET") {
      throw new AppError("Route not found.", "ROUTE_NOT_FOUND", 404);
    }

    const userId = getAuthenticatedUserId(event);
    const payload = await financialHealthService.calculateScore(userId);
    return respond(200, payload);
  } catch (error) {
    logRequestError({ error, method, requestId, route });
    const errorPayload = createApiErrorPayload(error, requestId);
    return respond(errorPayload.statusCode, errorPayload);
  }
}
