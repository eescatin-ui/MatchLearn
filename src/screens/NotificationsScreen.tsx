import React, { useCallback, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../components/AppAlert';
import { useNotificationBadge } from '../context/NotificationBadgeContext';
import AppHeader from '../components/AppHeader';
import {
  ActivityNotification,
  deleteNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/api/notifications';
import { respondToGroupInvitation } from '../services/api/groups';
import { colors } from '../theme';

const notificationIcons: Record<string, string> = {
  buddy_request: '👋',
  buddy_request_accepted: '🤝',
  buddy_request_declined: '↩',
  buddy_removed: '💔',
  group_join_request: '👥',
  group_join_accepted: '✅',
  group_join_declined: '↩',
  group_join_cancelled: '↩',
  group_invitation: '🎟️',
  group_invitation_accepted: '✅',
  group_invitation_declined: '↩',
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

const notificationDataId = (notification: ActivityNotification, key: string): number | undefined => {
  const value = notification.data?.[key];
  const id = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

export default function NotificationsScreen({ navigation }: any) {
  const { setUnreadCount: setHeaderUnreadCount } = useNotificationBadge();
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [respondingInvitationId, setRespondingInvitationId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<number[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const selectionModeRef = useRef(false);
  const selectionActive = selectionMode;

  const setSelectionActive = useCallback((active: boolean) => {
    selectionModeRef.current = active;
    setSelectionMode(active);
  }, []);

  const toggleNotificationSelection = (notificationId: number) => {
    setSelectedNotificationIds((current) => current.includes(notificationId)
      ? current.filter((id) => id !== notificationId)
      : [...current, notificationId]);
  };

  const loadNotifications = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const feed = await fetchNotifications();
      setNotifications(feed.notifications);
      setUnreadCount(feed.unreadCount);
      setHeaderUnreadCount(feed.unreadCount);
      setSelectedNotificationIds([]);
      setSelectionActive(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setHeaderUnreadCount, setSelectionActive]);

  useFocusEffect(useCallback(() => {
    void loadNotifications();
  }, [loadNotifications]));

  const openNotification = async (notification: ActivityNotification) => {
    if (!notification.read_at) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )));
        setUnreadCount((count) => Math.max(0, count - 1));
        setHeaderUnreadCount((count) => Math.max(0, count - 1));
      } catch (markError) {
        Alert.alert(
          'Could not update notification',
          markError instanceof Error ? markError.message : 'Please try again.'
        );
      }
    }

    const parentNavigation = navigation.getParent();
    if (!parentNavigation) {
      Alert.alert('Could not open notification', 'The destination screen is unavailable.');
      return;
    }

    const buddyId = notificationDataId(notification, 'user_id');
    const groupId = notificationDataId(notification, 'group_id');
    const sessionId = notificationDataId(notification, 'session_id');

    switch (notification.type) {
      case 'session_invitation':
      case 'session_accepted':
      case 'session_declined':
      case 'session_cancelled':
      case 'session_completed':
      case 'session_updated':
      case 'session_today':
      case 'session_tomorrow':
        parentNavigation.navigate('Sessions', {
          screen: 'StudySessionsTab',
          params: sessionId ? { openSessionId: sessionId } : undefined,
        });
        return;
      case 'buddy_request':
        parentNavigation.navigate('Buddies', {
          screen: 'BuddiesTab',
          params: { openRequests: true },
        });
        return;
      case 'buddy_request_accepted':
        parentNavigation.navigate('Buddies', {
          screen: 'BuddiesTab',
          params: buddyId ? { openBuddyId: buddyId } : undefined,
        });
        return;
      case 'buddy_request_declined':
      case 'buddy_removed':
        parentNavigation.navigate('Buddies', {
          screen: 'BuddiesTab',
          params: { openRequests: true },
        });
        return;
      case 'group_join_request':
      case 'group_join_accepted':
      case 'group_join_cancelled':
      case 'group_member_left':
      case 'group_invitation_accepted':
      case 'group_invitation_declined':
        parentNavigation.navigate('Buddies', {
          screen: 'BuddiesTab',
          params: groupId ? { openGroupId: groupId } : { openRequests: true },
        });
        return;
      case 'group_invitation':
        parentNavigation.navigate('Buddies', { screen: 'BuddiesTab' });
        return;
      case 'group_join_declined':
        parentNavigation.navigate('Discover', {
          screen: 'DiscoverTab',
          params: { showGroups: true },
        });
        return;
      default:
        parentNavigation.navigate('Home', { screen: 'HomeTab' });
    }
  };

  const respondToInvitation = async (
    notification: ActivityNotification,
    action: 'accept' | 'decline'
  ) => {
    const groupId = notificationDataId(notification, 'group_id');
    const requestId = notificationDataId(notification, 'request_id');
    if (!groupId || !requestId) {
      Alert.alert('Could not respond to invitation', 'This invitation is missing its group details. Refresh notifications and try again.');
      return;
    }

    try {
      setRespondingInvitationId(notification.id);
      await respondToGroupInvitation(groupId, requestId, action);
      setNotifications((current) => current.map((item) => (
        item.id === notification.id
          ? {
              ...item,
              type: action === 'accept' ? 'group_invitation_accepted' : 'group_invitation_declined',
              read_at: item.read_at ?? new Date().toISOString(),
            }
          : item
      )));
      if (!notification.read_at) {
        setUnreadCount((count) => Math.max(0, count - 1));
        setHeaderUnreadCount((count) => Math.max(0, count - 1));
      }
      if (action === 'accept') {
        const parentNavigation = navigation.getParent();
        if (!parentNavigation) {
          Alert.alert('Invitation accepted', 'You joined the group, but its screen is unavailable right now.');
          return;
        }
        parentNavigation.navigate('Buddies', {
          screen: 'BuddiesTab',
          params: { openGroupId: groupId },
        });
      } else {
        Alert.alert('Invitation declined', 'You declined the invitation to join the group.');
      }
    } catch (responseError) {
      Alert.alert(
        'Could not respond to invitation',
        responseError instanceof Error ? responseError.message : 'Please try again.'
      );
    } finally {
      setRespondingInvitationId(null);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
      setUnreadCount(0);
      setHeaderUnreadCount(0);
    } catch (markError) {
      Alert.alert(
        'Could not update notifications',
        markError instanceof Error ? markError.message : 'Please try again.'
      );
    }
  };

  const deleteSelected = async () => {
    if (!selectedNotificationIds.length || deletingSelected) return;
    try {
      setDeletingSelected(true);
      const nextUnreadCount = await deleteNotifications(selectedNotificationIds);
      const selectedIds = new Set(selectedNotificationIds);
      setNotifications((current) => current.filter((item) => !selectedIds.has(item.id)));
      setUnreadCount(nextUnreadCount);
      setHeaderUnreadCount(nextUnreadCount);
      setSelectedNotificationIds([]);
      setSelectionActive(false);
    } catch (deleteError) {
      Alert.alert(
        'Could not delete notifications',
        deleteError instanceof Error ? deleteError.message : 'Please try again.'
      );
    } finally {
      setDeletingSelected(false);
    }
  };

  const confirmDeleteSelected = () => {
    if (!selectedNotificationIds.length) return;
    Alert.alert(
      'Delete selected notifications?',
      `This will permanently delete ${selectedNotificationIds.length} selected notification${selectedNotificationIds.length === 1 ? '' : 's'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { void deleteSelected(); } },
      ]
    );
  };

  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadNotifications(true); }} />}
      >
        <AppHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread · Your recent activity` : 'Your recent activity'}
          navigation={navigation}
          onNotificationsPress={() => { void loadNotifications(true); }}
        />

        <View style={styles.notificationActions}>
          {selectionActive ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectionActive(false);
                  setSelectedNotificationIds([]);
                }}
                style={styles.markAllButton}
              >
                <Text style={styles.markAllText}>Cancel · {selectedNotificationIds.length} selected</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmDeleteSelected}
                disabled={deletingSelected || selectedNotificationIds.length === 0}
                style={[styles.deleteSelectedButton, (deletingSelected || selectedNotificationIds.length === 0) && styles.disabledButton]}
              >
                <Text style={styles.deleteSelectedText}>{deletingSelected ? 'Deleting…' : 'Delete selected'}</Text>
              </Pressable>
            </>
          ) : notifications.length > 0 ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectionActive(true)}
                style={styles.markAllButton}
              >
                <Text style={styles.markAllText}>Select</Text>
              </Pressable>
              {unreadCount > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => { void markAllRead(); }} style={styles.markAllButton}>
                  <Text style={styles.markAllText}>Mark all as read</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>

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
              <View
                key={notification.id}
                style={[
                  styles.card,
                  !notification.read_at && styles.unreadCard,
                  selectedNotificationIds.includes(notification.id) && styles.selectedCard,
                  index === notifications.length - 1 && styles.cardLast,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedNotificationIds.includes(notification.id) }}
                  onLongPress={() => {
                    if (!selectionModeRef.current) {
                      setSelectionActive(true);
                      setSelectedNotificationIds([notification.id]);
                    }
                    else toggleNotificationSelection(notification.id);
                  }}
                  delayLongPress={350}
                  onPress={() => {
                    if (selectionModeRef.current) toggleNotificationSelection(notification.id);
                    else void openNotification(notification);
                  }}
                  style={styles.cardContent}
                >
                  {selectionActive ? (
                    <View style={[styles.selectionMark, selectedNotificationIds.includes(notification.id) && styles.selectionMarkActive]}>
                      {selectedNotificationIds.includes(notification.id) ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
                    </View>
                  ) : null}
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
                {!selectionActive && notification.type === 'group_invitation' ? (
                  <View style={styles.invitationActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => { void respondToInvitation(notification, 'decline'); }}
                      disabled={respondingInvitationId !== null}
                      style={[styles.invitationButton, styles.declineInvitationButton, respondingInvitationId !== null && styles.disabledButton]}
                    >
                      <Text style={styles.declineInvitationText}>Decline</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => { void respondToInvitation(notification, 'accept'); }}
                      disabled={respondingInvitationId !== null}
                      style={[styles.invitationButton, styles.acceptInvitationButton, respondingInvitationId !== null && styles.disabledButton]}
                    >
                      <Text style={styles.acceptInvitationText}>
                        {respondingInvitationId === notification.id ? 'Saving…' : 'Accept'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
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
  notificationActions: { minHeight: 34, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginBottom: 6 },
  deleteSelectedButton: { backgroundColor: '#fee2e2', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  deleteSelectedText: { color: '#b91c1c', fontSize: 12, fontWeight: '800' },
  notificationList: { backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 },
  card: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardContent: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLast: { borderBottomWidth: 0 },
  unreadCard: { backgroundColor: '#f1fbfa' },
  selectedCard: { backgroundColor: '#eaf4f8', borderLeftWidth: 3, borderLeftColor: colors.teal },
  selectionMark: { width: 22, height: 22, marginRight: 9, borderRadius: 11, borderWidth: 1.5, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  selectionMarkActive: { borderColor: colors.teal, backgroundColor: colors.teal },
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
  invitationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  invitationButton: { minWidth: 82, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 13 },
  declineInvitationButton: { backgroundColor: '#f1f5f9' },
  declineInvitationText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  acceptInvitationButton: { backgroundColor: colors.teal },
  acceptInvitationText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disabledButton: { opacity: 0.55 },
});
