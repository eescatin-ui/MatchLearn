import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications } from '../services/api/notifications';
import { getUserInitials } from '../utils/user';
import { colors } from '../theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  navigation: any;
  onSettingsPress?: () => void;
}

export default function AppHeader({
  title,
  subtitle,
  navigation,
  onSettingsPress,
}: AppHeaderProps) {
  const { user } = useAuth();
  const initials = getUserInitials(user?.name || 'Student');
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    fetchNotifications()
      .then((feed) => {
        if (active) setUnreadCount(feed.unreadCount);
      })
      .catch((error: unknown) => {
        console.error('Failed to load unread notification count:', error);
      });
    return () => {
      active = false;
    };
  }, []));

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.teal} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {onSettingsPress ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.teal} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {user?.profile?.profile_photo_url || user?.profile_photo_url ? (
              <Image
                source={{ uri: user.profile?.profile_photo_url ?? user.profile_photo_url ?? '' }}
                style={styles.avatarImage}
                accessibilityLabel={`${user.name}'s profile photo`}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 66,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: '800',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
});
