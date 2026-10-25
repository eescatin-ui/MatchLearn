import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { fetchNotifications } from '../services/api/notifications';

interface NotificationBadgeContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: Dispatch<SetStateAction<number>>;
}

const NotificationBadgeContext = createContext<NotificationBadgeContextValue | undefined>(undefined);

interface UserUnreadCount {
  userId: number | null;
  count: number;
}

export function NotificationBadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [userUnreadCount, setUserUnreadCount] = useState<UserUnreadCount>({ userId: null, count: 0 });
  const requestId = useRef(0);
  const unreadCount = userUnreadCount.userId === userId ? userUnreadCount.count : 0;

  const setUnreadCount = useCallback<Dispatch<SetStateAction<number>>>((nextCount) => {
    requestId.current += 1;
    setUserUnreadCount((current) => {
      const currentCount = current.userId === userId ? current.count : 0;
      return {
        userId: userId ?? null,
        count: typeof nextCount === 'function' ? nextCount(currentCount) : nextCount,
      };
    });
  }, [userId]);

  const refreshUnreadCount = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!userId) {
      return;
    }

    try {
      const feed = await fetchNotifications();
      if (requestId.current === currentRequestId) setUnreadCount(feed.unreadCount);
    } catch (error) {
      console.error('Failed to refresh unread notification count:', error);
    }
  }, [setUnreadCount, userId]);

  const value: NotificationBadgeContextValue = {
    unreadCount,
    refreshUnreadCount,
    setUnreadCount,
  };

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadge(): NotificationBadgeContextValue {
  const context = useContext(NotificationBadgeContext);
  if (!context) {
    throw new Error('useNotificationBadge must be used within NotificationBadgeProvider');
  }
  return context;
}
