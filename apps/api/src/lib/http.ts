import type { IncomingMessage, ServerResponse } from "node:http";
import { apiErrorDtoSchema } from "@finance-pilot/shared";
import { ZodError } from "zod";
import { AppError } from "./errors";

const defaultAllowedHeaders = "Authorization, Content-Type";
const defaultAllowedMethods = "GET,POST,PATCH,DELETE,OPTIONS";
const defaultContentType = "application/json; charset=utf-8";

interface ResponseOptions {
  allowedMethods?: string;
  allowedOrigins?: string[];
  origin?: string;
}

function resolveAllowedOrigin(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) {
    return allowedOrigins[0] ?? "*";
  }

  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    return origin;
  }

  return allowedOrigins[0] ?? "*";
}

export function buildJsonHeaders(options: ResponseOptions = {}) {
  return {
    "Access-Control-Allow-Headers": defaultAllowedHeaders,
    "Access-Control-Allow-Methods": options.allowedMethods ?? defaultAllowedMethods,
    "Access-Control-Allow-Origin": resolveAllowedOrigin(options.origin, options.allowedOrigins ?? ["*"]),
    "Content-Type": defaultContentType,
    Vary: "Origin"
  };
}

export function createApiErrorPayload(error: unknown, requestId?: string) {
  if (error instanceof ZodError) {
    return apiErrorDtoSchema.parse({
      code: "VALIDATION_ERROR",
      message: error.issues[0]?.message ?? "Request validation failed.",
      requestId,
      statusCode: 400,
      timestamp: new Date().toISOString()
    });
  }

  if (error instanceof AppError) {
    return apiErrorDtoSchema.parse({
      code: error.code,
      message: error.message,
      requestId,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString()
    });
  }

  return apiErrorDtoSchema.parse({
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong while processing this request.",
    requestId,
    statusCode: 500,
    timestamp: new Date().toISOString()
  });
}

export function createJsonResponse(
  statusCode: number,
  payload: unknown,
  options: ResponseOptions = {}
) {
  return {
    body: JSON.stringify(payload),
    headers: buildJsonHeaders(options),
    statusCode
  };
}

export function extractOrigin(headers: Record<string, string | undefined>) {
  return headers.origin ?? headers.Origin;
}

export function logRequestResult(input: {
  method: string;
  requestId: string;
  route: string;
  statusCode: number;
}) {
  console.info(JSON.stringify(input));
}

export function logRequestError(input: {
  error: unknown;
  method: string;
  requestId: string;
  route: string;
}) {
  const error = input.error;
  console.error(JSON.stringify({
    errorCode:
      error instanceof AppError
        ? error.code
        : typeof error === "object" && error && "name" in error
          ? String(error.name)
          : "UNKNOWN_ERROR",
    errorMessage: error instanceof Error ? error.message : "Unknown request failure",
    method: input.method,
    requestId: input.requestId,
    route: input.route
  }));
}

export async function parseJsonRequestBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

export function parseLambdaJsonBody<T>(body?: string | null, isBase64Encoded?: boolean): T {
  if (!body) {
    return {} as T;
  }

  const decoded = isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
  return JSON.parse(decoded) as T;
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
  options: ResponseOptions = {}
) {
  response.writeHead(statusCode, buildJsonHeaders(options));
  response.end(JSON.stringify(payload));
}
