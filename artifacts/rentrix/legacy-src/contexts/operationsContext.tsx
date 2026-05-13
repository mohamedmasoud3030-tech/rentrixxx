import { createContext, useContext } from 'react';
import type { AppContextType } from '../types';

export type OperationsContextValue = {
  settings: AppContextType['settings'];
  updateSettings: AppContextType['updateSettings'];
  dataService: AppContextType['dataService'];
  runManualAutomation: AppContextType['runManualAutomation'];
  generateNotifications: AppContextType['generateNotifications'];
  updateNotificationTemplate: AppContextType['updateNotificationTemplate'];
};

export const OperationsContext = createContext<OperationsContextValue | undefined>(undefined);

export const useOperationsContext = (): OperationsContextValue => {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperationsContext must be used within OperationsContext.Provider');
  }
  return context;
};
