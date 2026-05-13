import { createContext, useContext } from 'react';
import type { AppContextType } from '../types';

export type AuthContextValue = {
  auth: AppContextType['auth'];
  canAccess: AppContextType['canAccess'];
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthContext.Provider');
  }
  return context;
};
