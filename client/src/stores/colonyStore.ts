import { create } from 'zustand';
import { colonyApiClient } from '../utils/api';
import type { Colony, SpeciesSummary, CreateColonyRequest } from '@antiverse/types';

interface ColonyState {
  colonies: Colony[];
  speciesLookup: SpeciesSummary[];
  isLoading: boolean;
  error: string | null;
  fetchColonies: () => Promise<void>;
  fetchSpecies: () => Promise<void>;
  createColony: (data: CreateColonyRequest) => Promise<void>;
}

export const useColonyStore = create<ColonyState>()((set, get) => ({
  colonies: [],
  speciesLookup: [],
  isLoading: false,
  error: null,

  fetchColonies: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await colonyApiClient.get('/');
      set({ colonies: res.data.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      console.error('Failed to fetch colonies:', error);
    }
  },

  fetchSpecies: async () => {
    try {
      const res = await colonyApiClient.get('/species');
      set({ speciesLookup: res.data.data });
    } catch (error) {
      console.error('Failed to fetch species catalog:', error);
    }
  },

  createColony: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await colonyApiClient.post('/', data);
      await get().fetchColonies();
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  }
}));
