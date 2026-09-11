import { apiErrorDtoSchema, type FinanceSnapshot } from "@finance-pilot/shared";
import { authService } from "./auth/authService";

const configuredApiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  ""
).trim();

const localDevelopmentApiBaseUrl = "http://localhost:4000";
const shouldUseLocalDevelopmentApi = import.meta.env.DEV && configuredApiBaseUrl.length === 0;

export const apiBaseUrl = shouldUseLocalDevelopmentApi
  ? localDevelopmentApiBaseUrl
  : configuredApiBaseUrl;

export class ApiServiceError extends Error {
  code?: string;
  statusCode?: number;

  constructor(message: string, options?: { code?: string; statusCode?: number }) {
    super(message);
    this.name = "ApiServiceError";
    this.code = options?.code;
    this.statusCode = options?.statusCode;
  }
}

export function hasConfiguredApiBaseUrl() {
  return configuredApiBaseUrl.length > 0;
}

export async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiServiceError("FinancePilot could not load your financial data.");
  }

  const authorization = await authService.getAuthorizationHeader();
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(authorization ? { Authorization: authorization.authorizationHeader } : {})
      },
      method: init?.method ?? "GET"
    });
  } catch {
    throw new ApiServiceError("FinancePilot could not load your financial data.");
  }

  if (!response.ok) {
    const candidate = apiErrorDtoSchema.safeParse(await response.json().catch(() => null));

    if (candidate.success) {
      throw new ApiServiceError(candidate.data.message, {
        code: candidate.data.code,
        statusCode: candidate.data.statusCode
      });
    }

    throw new ApiServiceError(`Request failed for ${path}`, {
      statusCode: response.status
    });
  }

  return response.json() as Promise<T>;
}

export function isApiServiceError(error: unknown): error is ApiServiceError {
  return error instanceof ApiServiceError;
}

export async function getWorkspaceSnapshot(): Promise<FinanceSnapshot> {
  return requestApi<FinanceSnapshot>("/api/workspace");
}
