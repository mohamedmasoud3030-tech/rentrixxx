import { supabaseData } from './supabaseDataService';
import type { AppNotification, Contract, Database, NotificationType } from '../types';
import { safeAsync, validateRequiredString } from '../utils/validation';

export interface NotificationCreateInput {
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  role?: AppNotification['role'];
}

export interface ContractExpiryInput {
  contracts: Contract[];
  now: number;
  alertDays: number;
}

export interface NotificationTemplateInput {
  type: NotificationType;
  contractNo?: string;
  tenantName?: string;
  amountDue?: number;
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

export const buildNotificationTemplate = ({ type, contractNo, tenantName, amountDue }: NotificationTemplateInput): Pick<AppNotification, 'title' | 'message'> => {
  if (type === 'CONTRACT_EXPIRING') {
    return {
      title: 'تنبيه قرب انتهاء العقد',
      message: `العقد ${contractNo || ''} للمستأجر ${tenantName || ''} على وشك الانتهاء.`,
    };
  }

  if (type === 'OVERDUE_BALANCE') {
    return {
      title: 'تنبيه مديونية متأخرة',
      message: `يوجد مبلغ متأخر بقيمة ${amountDue?.toFixed(3) || '0.000'} ر.ع.`,
    };
  }

  return {
    title: 'إشعار جديد',
    message: 'لديك إشعار جديد في النظام.',
  };
};

export const computeUnreadCount = (notifications: AppNotification[]): number => {
  return notifications.filter(notification => !notification.isRead).length;
};

export const shouldDispatchNotification = (type: NotificationType, db: Pick<Database, 'contracts' | 'invoices'>): boolean => {
  if (type === 'CONTRACT_EXPIRING') return db.contracts.length > 0;
  if (type === 'OVERDUE_BALANCE') return db.invoices.some(invoice => invoice.status === 'OVERDUE');
  return true;
};

export const notificationService: NotificationService = {
  async createAppNotification(input: NotificationCreateInput): Promise<AppNotification> {
    const payload: AppNotification = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      isRead: false,
      role: input.role || 'ADMIN',
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
