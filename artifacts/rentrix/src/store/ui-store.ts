import { create } from 'zustand';
import type { SyncStatus } from '@/types/domain';

type Theme = 'light' | 'dark';

type UiState = {
  sidebarCollapsed: boolean;
  theme: Theme;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setSyncStatus: (syncStatus: SyncStatus) => void;
  setLastSyncedAt: (lastSyncedAt: string | null) => void;
};

const getInitialTheme = (): Theme => {
  if (globalThis.window === undefined) return 'light';
  return (globalThis.window.localStorage.getItem('rentrix-theme') as Theme | null) ?? 'light';
};

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  theme: getInitialTheme(),
  syncStatus: 'idle',
  lastSyncedAt: null,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => {
    globalThis.window.localStorage.setItem('rentrix-theme', theme);
    globalThis.window.document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));
