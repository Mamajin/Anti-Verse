import { create } from 'zustand';
import { logApiClient } from '../utils/api';
import type { LogEntry, CreateLogEntryRequest } from '@antiverse/types';

interface LogState {
  entries: LogEntry[];
  isLoading: boolean;
  error: string | null;
  fetchEntries: (colonyId: string) => Promise<void>;
  createEntry: (colonyId: string, data: CreateLogEntryRequest) => Promise<void>;
  deleteEntry: (colonyId: string, logId: string) => Promise<void>;
}

export const useLogStore = create<LogState>()((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchEntries: async (colonyId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await logApiClient.get(`/${colonyId}`);
      set({ entries: res.data.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      console.error('Failed to fetch logs:', error);
    }
  },

  createEntry: async (colonyId, data) => {
    set({ isLoading: true, error: null });
    try {
      await logApiClient.post(`/${colonyId}`, data);
      await get().fetchEntries(colonyId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  deleteEntry: async (colonyId, logId) => {
    set({ isLoading: true, error: null });
    try {
      await logApiClient.delete(`/${colonyId}/${logId}`);
      await get().fetchEntries(colonyId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  }
}));
