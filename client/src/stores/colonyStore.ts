import { create } from 'zustand';
import { colonyApiClient } from '../utils/api';
import type { Colony, SpeciesSummary, CreateColonyRequest } from '@antiverse/types';

interface ColonyState {
  colonies: Colony[];
  currentColony: Colony | null;
  members: any[];
  speciesLookup: SpeciesSummary[];
  isLoading: boolean;
  error: string | null;
  fetchColonies: () => Promise<void>;
  fetchColonyById: (id: string) => Promise<void>;
  fetchSpecies: () => Promise<void>;
  createColony: (data: CreateColonyRequest) => Promise<void>;
  updateColony: (id: string, data: any) => Promise<void>;
  fetchMembers: (colonyId: string) => Promise<void>;
}

export const useColonyStore = create<ColonyState>()((set, get) => ({
  colonies: [],
  currentColony: null,
  members: [],
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

  fetchColonyById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await colonyApiClient.get(`/${id}`);
      set({ currentColony: res.data.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      console.error('Failed to fetch single colony:', error);
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
  },

  updateColony: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await colonyApiClient.patch(`/${id}`, data);
      await get().fetchColonyById(id);
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  fetchMembers: async (id) => {
    try {
      const res = await colonyApiClient.get(`/${id}/members`);
      set({ members: res.data.data });
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  }
}));
