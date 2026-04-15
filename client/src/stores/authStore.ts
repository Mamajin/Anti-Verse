import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApiClient } from '../utils/api';
import type { LoginRequest, RegisterRequest } from '@antiverse/types'; // Uses shared types!

interface AuthState {
  token: string | null;
  user: { id: string; role: string; email: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const res = await authApiClient.post('/login', credentials);
          const { accessToken, user } = res.data.data;
          // Store token securely in localStorage managed by persist middleware
          set({
            token: accessToken,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          // Also set the token explicitly to local storage since axios interceptor uses it directly
          localStorage.setItem('access_token', accessToken); 
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (credentials) => {
        set({ isLoading: true });
        try {
          await authApiClient.post('/register', credentials);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        localStorage.removeItem('access_token');
        // Theoretically call /logout to blacklist refresh token
        authApiClient.post('/logout').catch(() => {});
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }), // Don't persist isLoading
      onRehydrateStorage: () => (state) => {
         if (state && state.token) {
           localStorage.setItem('access_token', state.token);
         }
      }
    }
  )
);
