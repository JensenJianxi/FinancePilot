import type {
  CreateSettingsInputDto,
  UpdateSettingsInputDto
} from "@finance-pilot/shared";
import { SettingsService } from "../core/SettingsService";
import { resolveApiRuntimeConfig } from "../lib/config";
import {
  createApiErrorPayload,
  createJsonResponse,
  extractOrigin,
  logRequestResult,
  parseLambdaJsonBody
} from "../lib/http";
import { AppError } from "../lib/errors";
import { DynamoSettingsRepository } from "../repositories";

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
const repository = new DynamoSettingsRepository({
  tableName: config.settingsTable
});
const settingsService = new SettingsService(repository);

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

    if (route === "/settings") {
      if (method === "GET") {
        const payload = await settingsService.getSettings(userId);
        return respond(200, payload);
      }

      if (method === "POST") {
        const body = parseLambdaJsonBody<CreateSettingsInputDto>(
          event.body,
          event.isBase64Encoded
        );
        const payload = await settingsService.createSettings(userId, body);
        return respond(201, payload);
      }

      if (method === "PATCH") {
        const body = parseLambdaJsonBody<UpdateSettingsInputDto>(
          event.body,
          event.isBase64Encoded
        );
        const payload = await settingsService.updateSettings(userId, body);
        return respond(200, payload);
      }
    }

    throw new AppError("Route not found.", "ROUTE_NOT_FOUND", 404);
  } catch (error) {
    const errorPayload = createApiErrorPayload(error, requestId);
    return respond(errorPayload.statusCode, errorPayload);
  }
}
