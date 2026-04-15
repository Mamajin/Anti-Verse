import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'antiverseTheme' | 'light';
  confirmModal: { isOpen: boolean; title: string; message: string; onConfirm: () => void } | null;
  toggleSidebar: () => void;
  setTheme: (theme: 'antiverseTheme' | 'light') => void;
  showConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  hideConfirmModal: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  theme: 'antiverseTheme',
  confirmModal: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  showConfirmModal: (title, message, onConfirm) => set({ confirmModal: { isOpen: true, title, message, onConfirm } }),
  hideConfirmModal: () => set({ confirmModal: null })
}));
