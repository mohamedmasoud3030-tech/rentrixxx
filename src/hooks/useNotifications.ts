import { useMemo } from 'react';
import { getExpiringContracts, notificationService } from '../services/notificationService';

export interface UseNotificationsResult {
  notificationService: typeof notificationService;
  getExpiringContracts: typeof getExpiringContracts;
}

export const useNotifications = (): UseNotificationsResult => {
  return useMemo(() => ({ notificationService, getExpiringContracts }), []);
};
