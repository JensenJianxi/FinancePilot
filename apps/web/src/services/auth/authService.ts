import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  type CognitoUserSession
} from "amazon-cognito-identity-js";
import type { AuthorizationHeader } from "../../types/auth";
import type {
  AuthSession,
  ConfirmEmailChangePayload,
  ConfirmEmailPayload,
  ForgotPasswordPayload,
  ForgotPasswordResult,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  ResetPasswordPayload,
  StartEmailChangePayload,
  StoragePreference,
  UpdatePasswordPayload,
  UpdateUsernamePayload
} from "../../types/auth";
import {
  createUserPool,
  getCognitoConfig,
  getCognitoStorage,
  getConfigurationErrorMessage,
  getStoragePreferences
} from "./cognitoClient";

const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  AliasExistsException: "That email address is already connected to another account.",
  CodeMismatchException: "That verification code does not match. Check the latest email and try again.",
  ExpiredCodeException: "That verification code expired. Request a new code and try again.",
  InvalidParameterException: "Some details look incomplete. Please review the form and try again.",
  InvalidPasswordException: "Password must meet your Cognito password policy requirements.",
  LimitExceededException: "Too many attempts were made. Please wait a moment before trying again.",
  NotAuthorizedException: "Incorrect email or password.",
  PasswordResetRequiredException: "Your password needs to be reset before you can sign in.",
  TooManyRequestsException: "Too many requests were made. Please pause briefly and try again.",
  UserNotConfirmedException: "Confirm your email address before signing in.",
  UserNotFoundException: "We could not find an account with that email address.",
  UsernameExistsException: "An account with that email address already exists."
};

export class AuthServiceError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getFullNameFromPayload(email: string, payload: Record<string, unknown>): string {
  const nameClaim = payload.name;
  const givenNameClaim = payload.given_name;

  if (typeof nameClaim === "string" && nameClaim.trim().length > 0) {
    return nameClaim;
  }

  if (typeof givenNameClaim === "string" && givenNameClaim.trim().length > 0) {
    return givenNameClaim;
  }

  return email.split("@")[0] ?? "FinancePilot User";
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return false;
}

function mapSession(user: CognitoUser, session: CognitoUserSession): AuthSession {
  const accessToken = session.getAccessToken();
  const idToken = session.getIdToken();
  const refreshToken = session.getRefreshToken();
  const payload = idToken.decodePayload();
  const email = typeof payload.email === "string" ? payload.email : user.getUsername();
  const cognitoSub = typeof payload.sub === "string" ? payload.sub : user.getUsername();

  return {
    tokens: {
      accessToken: accessToken.getJwtToken(),
      expiresAt: new Date(accessToken.getExpiration() * 1000).toISOString(),
      idToken: idToken.getJwtToken(),
      refreshToken: refreshToken.getToken() || undefined
    },
    user: {
      cognitoSub,
      email,
      emailVerified: toBoolean(payload.email_verified),
      fullName: getFullNameFromPayload(email, payload),
      userId: cognitoSub
    }
  };
}

function toAuthServiceError(error: unknown, fallbackMessage: string): AuthServiceError {
  if (error instanceof AuthServiceError) {
    return error;
  }

  const candidate = error as { code?: string; message?: string; name?: string } | undefined;
  const code = candidate?.code ?? candidate?.name;
  const message = (code && FRIENDLY_AUTH_ERRORS[code]) || candidate?.message || fallbackMessage;

  return new AuthServiceError(message, code);
}

function assertConfigured(): void {
  const config = getCognitoConfig();

  if (!config.isConfigured) {
    throw new AuthServiceError(
      getConfigurationErrorMessage() ?? "Authentication configuration is incomplete."
    );
  }
}

function createCognitoUser(email: string, preference: StoragePreference): CognitoUser {
  const normalizedEmail = normalizeEmail(email);

  return new CognitoUser({
    Pool: createUserPool(preference),
    Storage: getCognitoStorage(preference),
    Username: normalizedEmail
  });
}

function getSession(user: CognitoUser): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (error || !session) {
        reject(error ?? new Error("Unable to restore session."));
        return;
      }

      if (!session.isValid()) {
        reject(new Error("Session is no longer valid."));
        return;
      }

      resolve(session);
    });
  });
}

async function getAuthenticatedCognitoContext(): Promise<{
  session: CognitoUserSession;
  user: CognitoUser;
}> {
  assertConfigured();

  for (const preference of getStoragePreferences()) {
    const user = createUserPool(preference).getCurrentUser();

    if (!user) {
      continue;
    }

    try {
      return { session: await getSession(user), user };
    } catch {
      continue;
    }
  }

  throw new AuthServiceError("Your session has expired. Sign in again to continue.", "NotAuthorizedException");
}

function refreshSession(user: CognitoUser, session: CognitoUserSession): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    user.refreshSession(session.getRefreshToken(), (error, nextSession) => {
      if (error || !nextSession) {
        reject(toAuthServiceError(error, "FinancePilot could not refresh your account session."));
        return;
      }

      resolve(nextSession as CognitoUserSession);
    });
  });
}

function requestAttributeVerificationCode(user: CognitoUser, attributeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    user.getAttributeVerificationCode(attributeName, {
      inputVerificationCode() {
        resolve();
      },
      onFailure(error) {
        reject(toAuthServiceError(error, "FinancePilot could not send the verification code."));
      },
      onSuccess() {
        resolve();
      }
    });
  });
}

function verifyAttribute(user: CognitoUser, attributeName: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    user.verifyAttribute(attributeName, code.trim(), {
      onFailure(error) {
        reject(toAuthServiceError(error, "That verification code could not be confirmed."));
      },
      onSuccess() {
        resolve();
      }
    });
  });
}

function updateUserAttributes(
  user: CognitoUser,
  attributes: CognitoUserAttribute[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    user.updateAttributes(attributes, (error) => {
      if (error) {
        reject(toAuthServiceError(error, "FinancePilot could not update your profile."));
        return;
      }

      resolve();
    });
  });
}

function signOutPreference(preference: StoragePreference): void {
  const currentUser = createUserPool(preference).getCurrentUser();
  currentUser?.signOut();
}

export function isAuthServiceError(error: unknown): error is AuthServiceError {
  return error instanceof AuthServiceError;
}

export const authService = {
  async confirmEmailChange(payload: ConfirmEmailChangePayload): Promise<AuthSession> {
    const { session, user } = await getAuthenticatedCognitoContext();
    await verifyAttribute(user, "email", payload.code);
    return mapSession(user, await refreshSession(user, session));
  },
  async confirmEmail(payload: ConfirmEmailPayload): Promise<void> {
    assertConfigured();

    const user = createCognitoUser(payload.email, "local");

    await new Promise<void>((resolve, reject) => {
      user.confirmRegistration(payload.code.trim(), true, (error) => {
        if (error) {
          reject(toAuthServiceError(error, "We could not confirm that email address."));
          return;
        }

        resolve();
      });
    });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResult> {
    assertConfigured();

    const user = createCognitoUser(payload.email, "local");

    return new Promise((resolve, reject) => {
      user.forgotPassword({
        inputVerificationCode(data) {
          resolve({
            codeDeliveryDestination: data?.CodeDeliveryDetails?.Destination
          });
        },
        onFailure(error) {
          reject(toAuthServiceError(error, "We could not start the password reset flow."));
        },
        onSuccess() {
          resolve({});
        }
      });
    });
  },

  getConfigurationError(): string | undefined {
    return getConfigurationErrorMessage();
  },

  async getCurrentSession(): Promise<AuthSession | null> {
    if (!getCognitoConfig().isConfigured) {
      return null;
    }

    for (const preference of getStoragePreferences()) {
      const currentUser = createUserPool(preference).getCurrentUser();

      if (!currentUser) {
        continue;
      }

      try {
        const session = await getSession(currentUser);
        return mapSession(currentUser, session);
      } catch {
        currentUser.signOut();
      }
    }

    return null;
  },

  async getAuthorizationHeader(): Promise<AuthorizationHeader | null> {
    const session = await this.getCurrentSession();

    if (!session) {
      return null;
    }

    return {
      authorizationHeader: `Bearer ${session.tokens.accessToken}`
    };
  },

  isConfigured(): boolean {
    return getCognitoConfig().isConfigured;
  },

  async requestProfileVerificationCode(): Promise<void> {
    const { user } = await getAuthenticatedCognitoContext();
    await requestAttributeVerificationCode(user, "email");
  },

  async resendConfirmationCode(email: string): Promise<void> {
    assertConfigured();

    const user = createCognitoUser(email, "local");

    await new Promise<void>((resolve, reject) => {
      user.resendConfirmationCode((error) => {
        if (error) {
          reject(toAuthServiceError(error, "We could not resend the confirmation code."));
          return;
        }

        resolve();
      });
    });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    assertConfigured();

    const user = createCognitoUser(payload.email, "local");

    await new Promise<void>((resolve, reject) => {
      user.confirmPassword(payload.code.trim(), payload.newPassword, {
        onFailure(error) {
          reject(toAuthServiceError(error, "We could not reset that password."));
        },
        onSuccess() {
          resolve();
        }
      });
    });
  },

  async signIn(payload: LoginPayload): Promise<AuthSession> {
    assertConfigured();

    const preference: StoragePreference = payload.rememberMe ? "local" : "session";
    const user = createCognitoUser(payload.email, preference);
    const authenticationDetails = new AuthenticationDetails({
      Password: payload.password,
      Username: normalizeEmail(payload.email)
    });

    const session = await new Promise<CognitoUserSession>((resolve, reject) => {
      user.authenticateUser(authenticationDetails, {
        newPasswordRequired() {
          reject(
            new AuthServiceError(
              "A password update is required before you can continue.",
              "NewPasswordRequired"
            )
          );
        },
        onFailure(error) {
          reject(toAuthServiceError(error, "We could not sign you in."));
        },
        onSuccess(authenticatedSession) {
          resolve(authenticatedSession);
        }
      });
    });

    for (const candidate of getStoragePreferences()) {
      if (candidate !== preference) {
        signOutPreference(candidate);
      }
    }

    return mapSession(user, session);
  },

  async signOut(): Promise<void> {
    for (const preference of getStoragePreferences()) {
      signOutPreference(preference);
    }
  },

  async signUp(payload: RegisterPayload): Promise<RegisterResult> {
    assertConfigured();

    const userPool = createUserPool("local");
    const email = normalizeEmail(payload.email);
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "name", Value: payload.fullName.trim() })
    ];

    return new Promise((resolve, reject) => {
      userPool.signUp(email, payload.password, attributes, [], (error, result) => {
        if (error || !result) {
          reject(toAuthServiceError(error, "We could not create that account."));
          return;
        }

        resolve({
          codeDeliveryDestination: result.codeDeliveryDetails?.Destination,
          isConfirmed: result.userConfirmed
        });
      });
    });
  },

  async startEmailChange(payload: StartEmailChangePayload): Promise<void> {
    const { user } = await getAuthenticatedCognitoContext();
    await updateUserAttributes(user, [
      new CognitoUserAttribute({ Name: "email", Value: normalizeEmail(payload.newEmail) })
    ]);
  },

  async updatePassword(payload: UpdatePasswordPayload): Promise<void> {
    const { user } = await getAuthenticatedCognitoContext();
    await verifyAttribute(user, "email", payload.code);

    await new Promise<void>((resolve, reject) => {
      user.changePassword(payload.currentPassword, payload.newPassword, (error) => {
        if (error) {
          reject(toAuthServiceError(error, "FinancePilot could not update your password."));
          return;
        }

        resolve();
      });
    });
  },

  async updateUsername(payload: UpdateUsernamePayload): Promise<AuthSession> {
    const { session, user } = await getAuthenticatedCognitoContext();
    await verifyAttribute(user, "email", payload.code);
    await updateUserAttributes(user, [
      new CognitoUserAttribute({ Name: "name", Value: payload.fullName.trim() })
    ]);
    return mapSession(user, await refreshSession(user, session));
  }
};
