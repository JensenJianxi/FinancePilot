import type {
  CreateSubscriptionInputDto,
  UpdateSubscriptionInputDto
} from "@finance-pilot/shared";
import { SubscriptionsService } from "../core/SubscriptionsService";
import { AppError } from "../lib/errors";
import {
  createApiErrorPayload,
  createJsonResponse,
  extractOrigin,
  logRequestResult,
  parseLambdaJsonBody
} from "../lib/http";
import { resolveApiRuntimeConfig } from "../lib/config";
import { DynamoSubscriptionsRepository } from "../repositories";

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
  rawPath?: string;
  requestContext: ApiGatewayRequestContext;
}

const config = resolveApiRuntimeConfig();
const repository = new DynamoSubscriptionsRepository({
  tableName: config.subscriptionsTable
});
const subscriptionsService = new SubscriptionsService(repository);

function getAuthenticatedUserId(event: ApiGatewayHttpEvent) {
  const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

  if (!userId) {
    throw new AppError("Authentication is required.", "UNAUTHORIZED", 401);
  }

  return userId;
}

function getSubscriptionIdFromPath(path: string) {
  const matches = path.match(/^\/subscriptions\/([^/]+)$/);
  return matches?.[1] ? decodeURIComponent(matches[1]) : null;
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

    if (route === "/subscriptions") {
      if (method === "GET") {
        const payload = await subscriptionsService.listSubscriptions(userId);
        return respond(200, payload);
      }

      if (method === "POST") {
        const body = parseLambdaJsonBody<CreateSubscriptionInputDto>(
          event.body,
          event.isBase64Encoded
        );
        const payload = await subscriptionsService.createSubscription(userId, body);
        return respond(201, payload);
      }
    }

    const subscriptionId = getSubscriptionIdFromPath(route);

    if (subscriptionId) {
      if (method === "PATCH") {
        const body = parseLambdaJsonBody<UpdateSubscriptionInputDto>(
          event.body,
          event.isBase64Encoded
        );
        const payload = await subscriptionsService.updateSubscription(
          userId,
          subscriptionId,
          body
        );
        return respond(200, payload);
      }

      if (method === "DELETE") {
        const payload = await subscriptionsService.deleteSubscription(userId, subscriptionId);
        return respond(200, payload);
      }
    }

    throw new AppError("Route not found.", "ROUTE_NOT_FOUND", 404);
  } catch (error) {
    const errorPayload = createApiErrorPayload(error, requestId);
    return respond(errorPayload.statusCode, errorPayload);
  }
}
