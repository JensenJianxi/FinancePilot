import type {
  CreateSavingsGoalInputDto,
  UpdateSavingsGoalInputDto
} from "@finance-pilot/shared";
import { SavingsGoalsService } from "../core/SavingsGoalsService";
import { resolveApiRuntimeConfig } from "../lib/config";
import { AppError } from "../lib/errors";
import {
  createApiErrorPayload,
  createJsonResponse,
  extractOrigin,
  logRequestResult,
  parseLambdaJsonBody
} from "../lib/http";
import { DynamoSavingsGoalsRepository } from "../repositories";

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
const repository = new DynamoSavingsGoalsRepository({
  tableName: config.savingsGoalsTable
});
const savingsGoalsService = new SavingsGoalsService(repository);

function getAuthenticatedUserId(event: ApiGatewayHttpEvent) {
  const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

  if (!userId) {
    throw new AppError("Authentication is required.", "UNAUTHORIZED", 401);
  }

  return userId;
}

function getGoalIdFromPath(path: string) {
  const matches = path.match(/^\/goals\/([^/]+)$/);
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

    const userId = getAuthenticatedUserId(event);

    if (route === "/goals") {
      if (method === "GET") {
        return respond(200, await savingsGoalsService.listSavingsGoals(userId));
      }

      if (method === "POST") {
        const body = parseLambdaJsonBody<CreateSavingsGoalInputDto>(
          event.body,
          event.isBase64Encoded
        );
        return respond(201, await savingsGoalsService.createSavingsGoal(userId, body));
      }
    }

    const goalId = getGoalIdFromPath(route);

    if (goalId) {
      if (method === "GET") {
        return respond(200, await savingsGoalsService.getSavingsGoal(userId, goalId));
      }

      if (method === "PATCH") {
        const body = parseLambdaJsonBody<UpdateSavingsGoalInputDto>(
          event.body,
          event.isBase64Encoded
        );
        return respond(200, await savingsGoalsService.updateSavingsGoal(userId, goalId, body));
      }

      if (method === "DELETE") {
        return respond(200, await savingsGoalsService.deleteSavingsGoal(userId, goalId));
      }
    }

    throw new AppError("Route not found.", "ROUTE_NOT_FOUND", 404);
  } catch (error) {
    const errorPayload = createApiErrorPayload(error, requestId);
    return respond(errorPayload.statusCode, errorPayload);
  }
}
