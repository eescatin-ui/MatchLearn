import { apiClient } from './client';

export interface ActivityNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  success: boolean;
  data?: {
    notifications?: ActivityNotification[];
    unread_count?: number;
  };
}

export interface NotificationsFeed {
  notifications: ActivityNotification[];
  unreadCount: number;
}

export const fetchNotifications = async (): Promise<NotificationsFeed> => {
  const response = await apiClient.get<NotificationsResponse>('/notifications');
  return {
    notifications: response.data.data?.notifications ?? [],
    unreadCount: response.data.data?.unread_count ?? 0,
  };
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await apiClient.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await apiClient.patch('/notifications/read-all');
};

export const deleteNotifications = async (ids: number[]): Promise<number> => {
  const response = await apiClient.delete<{ data?: { unread_count?: number } }>('/notifications', {
    data: { ids },
  });
  return response.data.data?.unread_count ?? 0;
};
