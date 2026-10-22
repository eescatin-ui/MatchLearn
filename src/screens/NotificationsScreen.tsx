import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import { useAuth } from '../context/AuthContext';
import {
  ActivityNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/api/notifications';
import { getUserInitials } from '../utils/user';
import { colors } from '../theme';

const notificationIcons: Record<string, string> = {
  buddy_request: '👋',
  buddy_request_accepted: '🤝',
  buddy_request_declined: '↩',
  buddy_removed: '💔',
  group_join_request: '👥',
  group_join_accepted: '✅',
  group_join_declined: '↩',
  group_member_left: '👋',
  session_invitation: '📚',
  session_accepted: '✅',
  session_declined: '↩',
  session_today: '⏰',
  session_tomorrow: '📅',
};

const formatNotificationTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const userInitials = getUserInitials(user?.name || 'Student');
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const feed = await fetchNotifications();
      setNotifications(feed.notifications);
      setUnreadCount(feed.unreadCount);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadNotifications();
  }, [loadNotifications]));

  const openNotification = async (notification: ActivityNotification) => {
    if (notification.read_at) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (markError) {
      Alert.alert(
        'Could not update notification',
        markError instanceof Error ? markError.message : 'Please try again.'
      );
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
      setUnreadCount(0);
    } catch (markError) {
      Alert.alert(
        'Could not update notifications',
        markError instanceof Error ? markError.message : 'Please try again.'
      );
    }
  };

  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadNotifications(true); }} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread · Your recent activity` : 'Your recent activity'}
            </Text>
          </View>
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable accessibilityRole="button" onPress={() => { void markAllRead(); }} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        )}

        {loading ? (
          <ActivityIndicator color={colors.teal} style={styles.state} />
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void loadNotifications(); }}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <Text style={styles.emptyText}>No notifications yet.</Text>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map((notification, index) => (
              <Pressable
                key={notification.id}
                accessibilityRole="button"
                accessibilityState={{ selected: !notification.read_at }}
                onPress={() => { void openNotification(notification); }}
                style={[
                  styles.card,
                  !notification.read_at && styles.unreadCard,
                  index === notifications.length - 1 && styles.cardLast,
                ]}
              >
                <View style={[styles.iconBadge, !notification.read_at && styles.unreadIconBadge]}>
                  <Text style={styles.iconText}>{notificationIcons[notification.type] ?? '🔔'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{notification.title}</Text>
                  <Text style={styles.cardDetail}>{notification.message}</Text>
                  <Text style={styles.time}>{formatNotificationTime(notification.created_at)}</Text>
                </View>
                {!notification.read_at && <View style={styles.unreadDot} />}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.page,
  },
  content: {
    flex: 1,
    backgroundColor: colors.page,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 32 },
  state: { alignItems: 'center', paddingVertical: 32 },
  retryText: { color: colors.teal, fontWeight: '800', padding: 8 },
  markAllButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  markAllText: { color: colors.teal, fontSize: 12, fontWeight: '800' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  avatarBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  notificationList: { backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 },
  card: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardLast: { borderBottomWidth: 0 },
  unreadCard: { backgroundColor: '#f1fbfa' },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.page,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadIconBadge: { backgroundColor: colors.tealLight },
  iconText: {
    fontSize: 20,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  time: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '700',
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal, marginLeft: 8 },
});
