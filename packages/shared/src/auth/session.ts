export interface SessionTokens {
  accessToken: string;
  expiresAt: string;
  idToken: string;
  refreshToken?: string;
}

export interface AuthenticatedUser {
  cognitoSub: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  userId: string;
}

export interface AuthSession {
  tokens: SessionTokens;
  user: AuthenticatedUser;
}

export interface BearerTokenTransport {
  authorizationHeader: `Bearer ${string}`;
}

export interface AuthenticatedRequestContext {
  cognitoSub: string;
  userId: string;
}
