import { createClient } from './client';
import type { LoginRequest, LoginResponse, VerifyTokenResult, ApiErrorResponse } from '@antiverse/types';

export const authClient = createClient(process.env.AUTH_SERVICE_URL || 'http://auth-service:3001');

export const verifyToken = async (token: string): Promise<VerifyTokenResult> => {
  const { data } = await authClient.get<{ data: VerifyTokenResult }>('/api/auth/verify', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data.data;
};
