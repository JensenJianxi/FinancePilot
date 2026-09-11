import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  AuthContextValue,
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
  UpdatePasswordPayload,
  UpdateUsernamePayload
} from "../types/auth";
import { authService } from "../services/auth/authService";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [configurationError, setConfigurationError] = useState<string | undefined>(
    authService.getConfigurationError()
  );

  const isConfigured = authService.isConfigured();

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!isConfigured) {
        if (isMounted) {
          setSession(null);
          setStatus("unauthenticated");
          setConfigurationError(authService.getConfigurationError());
        }
        return;
      }

      try {
        const currentSession = await authService.getCurrentSession();

        if (!isMounted) {
          return;
        }

        setSession(currentSession);
        setStatus(currentSession ? "authenticated" : "unauthenticated");
        setConfigurationError(undefined);
      } catch {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setStatus("unauthenticated");
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [isConfigured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      async confirmEmailChange(payload: ConfirmEmailChangePayload) {
        const nextSession = await authService.confirmEmailChange(payload);
        setSession(nextSession);
        return nextSession;
      },
      configurationError,
      async confirmEmail(payload: ConfirmEmailPayload) {
        await authService.confirmEmail(payload);
      },
      async forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResult> {
        return authService.forgotPassword(payload);
      },
      async getAuthorizationHeader() {
        return authService.getAuthorizationHeader();
      },
      isConfigured,
      async requestProfileVerificationCode() {
        await authService.requestProfileVerificationCode();
      },
      async resendConfirmationCode(email: string) {
        await authService.resendConfirmationCode(email);
      },
      async resetPassword(payload: ResetPasswordPayload) {
        await authService.resetPassword(payload);
      },
      session,
      async signIn(payload: LoginPayload) {
        const nextSession = await authService.signIn(payload);
        setConfigurationError(undefined);
        setSession(nextSession);
        setStatus("authenticated");
        return nextSession;
      },
      async signOut() {
        await authService.signOut();
        setSession(null);
        setStatus("unauthenticated");
      },
      async signUp(payload: RegisterPayload): Promise<RegisterResult> {
        return authService.signUp(payload);
      },
      async startEmailChange(payload: StartEmailChangePayload) {
        await authService.startEmailChange(payload);
      },
      status,
      user: session?.user ?? null,
      async updatePassword(payload: UpdatePasswordPayload) {
        await authService.updatePassword(payload);
      },
      async updateUsername(payload: UpdateUsernamePayload) {
        const nextSession = await authService.updateUsername(payload);
        setSession(nextSession);
        return nextSession;
      }
    }),
    [configurationError, isConfigured, session, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
