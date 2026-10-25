import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer, TabActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import MatchDetailScreen from '../screens/discover/MatchDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import BuddiesScreen from '../screens/BuddiesScreen';
import BuddiesDetailScreen from '../screens/BuddiesDetailScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import { fetchMatches } from '../services/api/matches';
import { fetchStudySessions } from '../services/api/schedule';
import { fetchConversations } from '../services/api/messages';
import { fetchBuddyConnections } from '../services/api/buddies';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

interface ProfileLeaveGuard {
  hasUnsavedChanges: boolean;
  confirmLeave: (onLeave: () => void) => void;
}

interface ProfileCompletionGuard {
  isOnboarding: boolean;
  warn: () => void;
}

interface NavigationBadges {
  discover: number;
  sessions: number;
  messages: number;
  buddies: number;
}

const badgeValue = (count: number): number | string | undefined => {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : count;
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTab" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
    </Stack.Navigator>
  );
}

function StudySessionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudySessionsTab" component={ScheduleScreen} />
    </Stack.Navigator>
  );
}

function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverTab" component={DiscoverScreen} />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="BuddyGroupDetail" component={BuddiesDetailScreen} />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessagesTab" component={MessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function BuddiesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BuddiesTab" component={BuddiesScreen} />
      <Stack.Screen name="BuddyGroupDetail" component={BuddiesDetailScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [profileLeaveGuard, setProfileLeaveGuard] = useState<ProfileLeaveGuard | null>(null);
  const [profileCompletionGuard, setProfileCompletionGuard] = useState<ProfileCompletionGuard | null>(null);
  const seenDiscoverMatchIds = useRef(new Set<number>());
  const [badges, setBadges] = useState<NavigationBadges>({
    discover: 0,
    sessions: 0,
    messages: 0,
    buddies: 0,
  });

  const refreshBadges = useCallback(async (markDiscoverMatchesSeen = false) => {
    if (!user) return;

    try {
      const [matches, sessions, conversations, connections] = await Promise.all([
        fetchMatches(),
        fetchStudySessions(),
        fetchConversations(),
        fetchBuddyConnections(),
      ]);
      if (markDiscoverMatchesSeen) {
        matches
          .filter((match) => match.compatibility_score >= 50)
          .forEach((match) => seenDiscoverMatchIds.current.add(match.id));
      }
      setBadges({
        discover: matches.filter(
          (match) => match.compatibility_score >= 50 && !seenDiscoverMatchIds.current.has(match.id)
        ).length,
        sessions: sessions.filter(
          (session) => session.status === 'pending' && !session.is_past && session.host_user_id !== user.id
        ).length,
        messages: conversations.unreadCount,
        buddies: connections.incoming_requests.length,
      });
    } catch (error) {
      console.error('Failed to refresh navigation badges:', error);
    }
  }, [user]);

  useEffect(() => {
    const initialRefresh = setTimeout(() => {
      void refreshBadges();
    }, 0);
    const interval = setInterval(() => {
      void refreshBadges();
    }, 30000);
    return () => {
      clearTimeout(initialRefresh);
      clearInterval(interval);
    };
  }, [refreshBadges]);

  const guardedTabListeners = (targetRouteName: string) => ({ navigation }: any) => ({
    tabPress: (event: { preventDefault: () => void }) => {
      if (targetRouteName !== 'Profile' && profileCompletionGuard?.isOnboarding) {
        event.preventDefault();
        profileCompletionGuard.warn();
        return;
      }

      const state = navigation.getState();
      if (state.routes[state.index]?.name !== 'Profile') return;

      if (!profileLeaveGuard?.hasUnsavedChanges) return;

      event.preventDefault();
      profileLeaveGuard.confirmLeave(() => {
        navigation.dispatch(TabActions.jumpTo(targetRouteName));
      });
    },
  });

  const registerProfileLeaveGuard = useCallback((guard: ProfileLeaveGuard | null) => {
    setProfileLeaveGuard(guard);
  }, []);

  const registerProfileCompletionGuard = useCallback((guard: ProfileCompletionGuard | null) => {
    setProfileCompletionGuard(guard);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#0f172a',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 10,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Home: ['home-outline', 'home'],
            Discover: ['search-outline', 'search'],
            Sessions: ['calendar-outline', 'calendar'],
            Messages: ['chatbubble-ellipses-outline', 'chatbubble-ellipses'],
            Buddies: ['people-outline', 'people'],
            Profile: ['person-outline', 'person'],
          };
          const [inactiveIcon, activeIcon] = icons[route.name] ?? ['home-outline', 'home'];
          const iconName = focused ? activeIcon : inactiveIcon;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} listeners={guardedTabListeners('Home')} />
      <Tab.Screen
        name="Discover"
        component={DiscoverStack}
        options={{
          tabBarBadge: badgeValue(badges.discover),
          tabBarBadgeStyle: styles.badge,
        }}
        listeners={({ navigation }) => ({
          ...guardedTabListeners('Discover')({ navigation }),
          focus: () => {
            setBadges((current) => ({ ...current, discover: 0 }));
            void refreshBadges(true);
          },
        })}
      />
      <Tab.Screen
        name="Sessions"
        component={StudySessionsStack}
        options={{
          tabBarLabel: 'Study Sessions',
          tabBarBadge: badgeValue(badges.sessions),
          tabBarBadgeStyle: styles.badge,
        }}
        listeners={({ navigation }) => ({
          ...guardedTabListeners('Sessions')({ navigation }),
          focus: () => { void refreshBadges(); },
        })}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarBadge: badgeValue(badges.messages),
          tabBarBadgeStyle: styles.badge,
        }}
        listeners={({ navigation }) => ({
          ...guardedTabListeners('Messages')({ navigation }),
          focus: () => { void refreshBadges(); },
        })}
      />
      <Tab.Screen
        name="Buddies"
        component={BuddiesStack}
        options={{
          tabBarBadge: badgeValue(badges.buddies),
          tabBarBadgeStyle: styles.badge,
        }}
        listeners={({ navigation }) => ({
          ...guardedTabListeners('Buddies')({ navigation }),
          focus: () => { void refreshBadges(); },
        })}
      />
      <Tab.Screen name="Profile">
        {(screenProps) => (
          <ProfileScreen
            {...screenProps}
            registerLeaveGuard={registerProfileLeaveGuard}
            registerCompletionGuard={registerProfileCompletionGuard}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = {
  badge: {
    backgroundColor: colors.danger,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800' as const,
  },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {isSignedIn ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
