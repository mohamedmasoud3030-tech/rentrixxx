import { useCallback, useMemo, useState } from 'react';
import type { AppNotification, NotificationType } from '../types';
import { computeUnreadCount, notificationService } from '../services/notificationService';

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  createNotification: (payload: { type: NotificationType; title: string; message: string; link: string }) => Promise<void>;
}

export const useNotifications = (initial: AppNotification[] = []): UseNotificationsResult => {
  const [notifications, setNotifications] = useState<AppNotification[]>(initial);

  const unreadCount = useMemo(() => computeUnreadCount(notifications), [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(notification => (notification.id === id ? { ...notification, isRead: true } : notification)));
  }, []);

  const createNotification = useCallback(async (payload: { type: NotificationType; title: string; message: string; link: string }) => {
    const created = await notificationService.createAppNotification(payload);
    setNotifications(prev => [created, ...prev]);
  }, []);

  return { notifications, unreadCount, markAsRead, createNotification };
};
