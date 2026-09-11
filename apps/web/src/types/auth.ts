import type {
  AuthSession as SharedAuthSession,
  AuthenticatedUser as SharedAuthenticatedUser,
  BearerTokenTransport
} from "@finance-pilot/shared/auth";

export type AuthSession = SharedAuthSession;
export type AuthenticatedUser = SharedAuthenticatedUser;
export type AuthorizationHeader = BearerTokenTransport;

export type AuthBannerTone = "error" | "info" | "success";
export type AuthStatus = "authenticated" | "loading" | "unauthenticated";
export type StoragePreference = "local" | "session";

export interface CognitoBrowserConfig {
  appClientId: string;
  isConfigured: boolean;
  missingKeys: string[];
  region: string;
  userPoolId: string;
}

export interface AuthBanner {
  message: string;
  tone: AuthBannerTone;
}

export interface AuthRouteState {
  banner?: AuthBanner;
  from?: {
    hash?: string;
    pathname?: string;
    search?: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterPayload {
  email: string;
  fullName: string;
  password: string;
}

export interface ConfirmEmailPayload {
  code: string;
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  code: string;
  email: string;
  newPassword: string;
}

export interface UpdateUsernamePayload {
  code: string;
  fullName: string;
}

export interface UpdatePasswordPayload {
  code: string;
  currentPassword: string;
  newPassword: string;
}

export interface StartEmailChangePayload {
  newEmail: string;
}

export interface ConfirmEmailChangePayload {
  code: string;
}

export interface RegisterResult {
  codeDeliveryDestination?: string;
  isConfirmed: boolean;
}

export interface ForgotPasswordResult {
  codeDeliveryDestination?: string;
}

export interface AuthContextValue {
  confirmEmailChange: (payload: ConfirmEmailChangePayload) => Promise<AuthSession>;
  configurationError?: string;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<ForgotPasswordResult>;
  getAuthorizationHeader: () => Promise<AuthorizationHeader | null>;
  isConfigured: boolean;
  requestProfileVerificationCode: () => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  session: AuthSession | null;
  signIn: (payload: LoginPayload) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<RegisterResult>;
  startEmailChange: (payload: StartEmailChangePayload) => Promise<void>;
  status: AuthStatus;
  confirmEmail: (payload: ConfirmEmailPayload) => Promise<void>;
  user: AuthenticatedUser | null;
  updatePassword: (payload: UpdatePasswordPayload) => Promise<void>;
  updateUsername: (payload: UpdateUsernamePayload) => Promise<AuthSession>;
}
