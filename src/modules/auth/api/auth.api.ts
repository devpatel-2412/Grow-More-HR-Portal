import { api } from '../../../shared/lib/api-client';
import type { LoginFormValues, SignupFormValues, TwoFactorVerifyFormValues } from '../schemas/auth.schemas';
import type { LoginResponse, MeResponse, AuthUser } from '../types/auth.types';

export const authApi = {
  signup: (values: SignupFormValues) => api.post<{ accessToken: string; user: AuthUser }>('/auth/signup', values),
  login: (values: LoginFormValues) => api.post<LoginResponse>('/auth/login', values),
  verifyTwoFactor: (values: TwoFactorVerifyFormValues) =>
    api.post<{ accessToken: string; user: AuthUser }>('/auth/2fa/verify', values),
  logout: () => api.post<void>('/auth/logout'),
  logoutAll: () => api.post<void>('/auth/logout-all'),
  me: () => api.get<MeResponse>('/auth/me'),
  requestPasswordReset: (email: string) => api.post<{ message: string }>('/auth/password-reset/request', { email }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/password-reset/confirm', { token, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/password/change', { currentPassword, newPassword }),
  beginTwoFactorEnrollment: () => api.post<{ secret: string; qrCodeDataUrl: string }>('/auth/2fa/enroll'),
  enableTwoFactor: (code: string) => api.post<{ recoveryCodes: string[] }>('/auth/2fa/enable', { code }),
  disableTwoFactor: (password: string, code: string) => api.post<void>('/auth/2fa/disable', { password, code }),
};
