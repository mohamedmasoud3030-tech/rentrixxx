import { useCallback } from 'react';
import type { User } from '../types';
import { canUserAccess } from '../services/authService';

export interface UseAuthResult {
  canAccess: (action: string) => boolean;
}

export const useAuth = (currentUser: User | null | undefined): UseAuthResult => {
  const canAccess = useCallback((action: string) => canUserAccess(currentUser, action), [currentUser]);
  return { canAccess };
};
