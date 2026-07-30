export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthenticatedUserView {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface LoginResult {
  requiresTwoFactor: false;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUserView;
}

export interface TwoFactorChallengeResult {
  requiresTwoFactor: true;
  challengeToken: string;
}
