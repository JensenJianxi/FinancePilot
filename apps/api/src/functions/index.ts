import type { CreateTransactionRequestDto, UpdateTransactionRequestDto } from "@finance-pilot/shared";
import { listTransactionsQueryDtoSchema } from "@finance-pilot/shared";
import { TransactionsService } from "../core/TransactionsService";
import { resolveApiRuntimeConfig } from "../lib/config";
import {
  createApiErrorPayload,
  createJsonResponse,
  extractOrigin,
  logRequestResult,
  parseLambdaJsonBody
} from "../lib/http";
import { AppError } from "../lib/errors";
import { DynamoTransactionsRepository } from "../repositories";

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
  body?: string | null;
  headers?: Record<string, string | undefined>;
  isBase64Encoded?: boolean;
  pathParameters?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  rawPath?: string;
  requestContext: ApiGatewayRequestContext;
}

const config = resolveApiRuntimeConfig();
const repository = new DynamoTransactionsRepository({
  tableName: config.transactionsTable
});
const transactionsService = new TransactionsService(repository);

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

function getTransactionIdFromPath(path: string) {
  const matches = path.match(/^\/transactions\/([^/]+)$/);
  return matches?.[1] ? decodeURIComponent(matches[1]) : null;
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
    logRequestResult({
      method,
      requestId,
      route,
      statusCode
    });

    return createJsonResponse(statusCode, payload, {
      allowedOrigins: config.allowedOrigins,
      origin
    });
  };

  try {
    if (method === "OPTIONS") {
      return respond(204, null);
    }

    const userId = getAuthenticatedUserId(event);

    if (route === "/transactions") {
      if (method === "GET") {
        const query = listTransactionsQueryDtoSchema.parse({
          category: event.queryStringParameters?.category,
          categoryName: event.queryStringParameters?.categoryName,
          month: event.queryStringParameters?.month,
          paymentMethod: event.queryStringParameters?.paymentMethod,
          type: event.queryStringParameters?.type
        });
        const payload = await transactionsService.listTransactions(userId, query);
        return respond(200, payload);
      }

      if (method === "POST") {
        const body = parseLambdaJsonBody<CreateTransactionRequestDto>(
          event.body,
          event.isBase64Encoded
        );
        const payload = await transactionsService.createTransaction(userId, body);
        return respond(201, payload);
      }
    }

    const transactionId = getTransactionIdFromPath(route);

    if (transactionId) {
      if (method === "GET") {
        const payload = await transactionsService.getTransaction(userId, transactionId);
        return respond(200, payload);
      }

      if (method === "PATCH") {
        const body = parseLambdaJsonBody<UpdateTransactionRequestDto>(
          event.body,
          event.isBase64Encoded
        );
        const payload = await transactionsService.updateTransaction(userId, transactionId, body);
        return respond(200, payload);
      }

      if (method === "DELETE") {
        const payload = await transactionsService.deleteTransaction(userId, transactionId);
        return respond(200, payload);
      }
    }

    throw new AppError("Route not found.", "ROUTE_NOT_FOUND", 404);
  } catch (error) {
    const errorPayload = createApiErrorPayload(error, requestId);
    return respond(errorPayload.statusCode, errorPayload);
  }
}
