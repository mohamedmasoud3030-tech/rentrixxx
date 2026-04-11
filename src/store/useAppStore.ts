import { useSyncExternalStore } from 'react';

type AppStoreState = {
  sessionUserId: string | null;
  isLoading: boolean;
  uiFlags: Record<string, boolean>;
  cache: Record<string, unknown>;
};

const state: AppStoreState = {
  sessionUserId: null,
  isLoading: false,
  uiFlags: {},
  cache: {},
};

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = (): AppStoreState => state;

export const appStoreActions = {
  setSessionUserId(sessionUserId: string | null) {
    state.sessionUserId = sessionUserId;
    emit();
  },
  setLoading(isLoading: boolean) {
    state.isLoading = isLoading;
    emit();
  },
  setUiFlag(key: string, value: boolean) {
    state.uiFlags = { ...state.uiFlags, [key]: value };
    emit();
  },
  setCache(key: string, value: unknown) {
    state.cache = { ...state.cache, [key]: value };
    emit();
  },
  clearCache(key: string) {
    const next = { ...state.cache };
    delete next[key];
    state.cache = next;
    emit();
  },
};

export function useAppStore(): AppStoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
