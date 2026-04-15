import { createClient } from './client';
import type { VerifyColonyResult } from '@antiverse/types';

export const colonyClient = createClient(process.env.COLONY_SERVICE_URL || 'http://colony-service:3002');

export const verifyColony = async (colonyId: string, token: string): Promise<VerifyColonyResult> => {
  const { data } = await colonyClient.get<{ data: VerifyColonyResult }>(`/api/colonies/${colonyId}/verify`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data.data;
};
