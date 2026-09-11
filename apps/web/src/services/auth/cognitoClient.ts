import { CognitoUserPool, type ICognitoStorage } from "amazon-cognito-identity-js";
import type { CognitoBrowserConfig, StoragePreference } from "../../types/auth";

let hasLoggedCognitoConfig = false;

function createMemoryStorage(): ICognitoStorage {
  const store = new Map<string, string>();

  return {
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    }
  };
}

function createStorageAdapter(getStorage: () => Storage | null): ICognitoStorage {
  const fallbackStorage = createMemoryStorage();

  return {
    clear() {
      const storage = getStorage();

      if (!storage) {
        fallbackStorage.clear();
        return;
      }

      storage.clear();
    },
    getItem(key) {
      const storage = getStorage();
      return storage ? storage.getItem(key) : fallbackStorage.getItem(key);
    },
    removeItem(key) {
      const storage = getStorage();

      if (!storage) {
        fallbackStorage.removeItem(key);
        return;
      }

      storage.removeItem(key);
    },
    setItem(key, value) {
      const storage = getStorage();

      if (!storage) {
        fallbackStorage.setItem(key, value);
        return;
      }

      storage.setItem(key, value);
    }
  };
}

function resolveBrowserStorage(kind: StoragePreference): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

const storageAdapters: Record<StoragePreference, ICognitoStorage> = {
  local: createStorageAdapter(() => resolveBrowserStorage("local")),
  session: createStorageAdapter(() => resolveBrowserStorage("session"))
};

export function getCognitoConfig(): CognitoBrowserConfig {
  const region = import.meta.env.VITE_AWS_REGION?.trim() ?? "";
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim() ?? "";
  const appClientId = (
    import.meta.env.VITE_COGNITO_APP_CLIENT_ID ??
    import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID ??
    ""
  ).trim();

  const missingKeys = [
    !region ? "VITE_AWS_REGION" : null,
    !userPoolId ? "VITE_COGNITO_USER_POOL_ID" : null,
    !appClientId ? "VITE_COGNITO_APP_CLIENT_ID" : null
  ].filter((value): value is string => Boolean(value));

  if (import.meta.env.DEV && !hasLoggedCognitoConfig) {
    const maskedAppClientId =
      appClientId.length >= 8
        ? `${appClientId.slice(0, 4)}...${appClientId.slice(-4)}`
        : appClientId;

    console.info("[FinancePilot auth] Cognito config", {
      appClientIdLength: appClientId.length,
      maskedAppClientId,
      region,
      userPoolId
    });

    hasLoggedCognitoConfig = true;
  }

  return {
    appClientId,
    isConfigured: missingKeys.length === 0,
    missingKeys,
    region,
    userPoolId
  };
}

export function getConfigurationErrorMessage(): string | undefined {
  const config = getCognitoConfig();

  if (config.isConfigured) {
    return undefined;
  }

  return `Missing authentication environment values: ${config.missingKeys.join(", ")}.`;
}

export function getCognitoStorage(preference: StoragePreference): ICognitoStorage {
  return storageAdapters[preference];
}

export function getStoragePreferences(): StoragePreference[] {
  return ["local", "session"];
}

export function createUserPool(preference: StoragePreference): CognitoUserPool {
  const config = getCognitoConfig();

  return new CognitoUserPool({
    ClientId: config.appClientId,
    Storage: getCognitoStorage(preference),
    UserPoolId: config.userPoolId
  });
}
