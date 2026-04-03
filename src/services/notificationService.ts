import { supabaseData } from './supabaseDataService';
import type { AppNotification, Contract, NotificationType } from '../types';
import { safeAsync, validateRequiredString } from '../utils/validation';

export interface NotificationCreateInput {
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

export interface ContractExpiryInput {
  contracts: Contract[];
  now: number;
  alertDays: number;
}

export interface NotificationService {
  createAppNotification: (input: NotificationCreateInput) => Promise<AppNotification>;
}

export const getExpiringContracts = ({ contracts, now, alertDays }: ContractExpiryInput): Contract[] => {
  return contracts.filter(contract => {
    const endDate = new Date(contract.end).getTime();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= alertDays;
  });
};

export const notificationService: NotificationService = {
  async createAppNotification(input: NotificationCreateInput): Promise<AppNotification> {
    const payload: AppNotification = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      isRead: false,
      role: 'ADMIN',
      type: input.type,
      title: validateRequiredString(input.title, 'Notification title'),
      message: validateRequiredString(input.message, 'Notification message'),
      link: validateRequiredString(input.link, 'Notification link'),
    };

    return safeAsync(async () => {
      const insertResult = await supabaseData.insert<AppNotification>('appNotifications', payload);
      if (insertResult.error) {
        throw new Error(`Failed to create app notification: ${insertResult.error}`);
      }
      return payload;
    }, 'Failed to create app notification');
  },
};
