import { useCallback, useState } from 'react';

interface ToastItem {
  id: string;
  message: string;
  tone?: 'success' | 'error' | 'info';
}

type ModalState = Record<string, boolean>;

export interface UseUIStateResult {
  modals: ModalState;
  openModal: (modal: string) => void;
  closeModal: (modal: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toasts: ToastItem[];
  addToast: (message: string, tone?: ToastItem['tone']) => void;
  removeToast: (id: string) => void;
}

export const useUIState = (defaultTab = 'dashboard'): UseUIStateResult => {
  const [modals, setModals] = useState<ModalState>({});
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const openModal = useCallback((modal: string) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: string) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  }, []);

  const addToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    setToasts(prev => [...prev, { id: crypto.randomUUID(), message, tone }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return { modals, openModal, closeModal, activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed, toasts, addToast, removeToast };
};
