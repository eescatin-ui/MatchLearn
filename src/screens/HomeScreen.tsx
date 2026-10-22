import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchGroups, GroupRecord } from '../services/api/groups';
import { fetchMatches } from '../services/api/matches';
import { MatchRecord } from '../types/match';
import { fetchBuddyConnections } from '../services/api/buddies';
import { fetchReviews } from '../services/api/reviews';
import { profileApi } from '../services/api/profile';
import { Alert } from '../components/AppAlert';
import AppHeader from '../components/AppHeader';
import GroupAvatar from '../components/GroupAvatar';
import { getMatchScoreColors } from '../utils/matchScoreColors';
import { colors } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const profilePromptedForUser = useRef<number | null>(null);
  const userName = user?.name || 'Student';
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [buddyCount, setBuddyCount] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || profilePromptedForUser.current === userId) return;

    profilePromptedForUser.current = userId;
    let active = true;

    const promptToCompleteProfile = () => {
      if (!active) return;
      Alert.alert(
        'Complete your study profile',
        'Add your program, year level, courses, study preferences, and availability to help us find better study matches for you.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'OK', onPress: () => navigation.navigate('Profile') },
        ]
      );
    };

    const checkProfile = async () => {
      try {
        const response = await profileApi.getProfile();
        const profile = response.data?.profile;
        const hasAcademicTags = Boolean(
          profile?.academic_strengths?.length || profile?.academic_needs?.length
        );
        const isIncomplete = !profile
          || !profile.department?.name
          || !profile.program?.name
          || !profile.year_level
          || !profile.learning_style?.name
          || !profile.study_courses?.length
          || !profile.study_mode
          || !hasAcademicTags
          || !response.data?.availabilities?.length;

        if (isIncomplete) promptToCompleteProfile();
      } catch (error) {
        const status = (error as { status?: number })?.status;
        if (status === 404) {
          promptToCompleteProfile();
          return;
        }
        console.error('Could not check study profile completeness:', error);
      }
    };

    void checkProfile();
    return () => { active = false; };
  }, [navigation, user?.id]);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([fetchMatches(), fetchGroups(), fetchBuddyConnections(), fetchReviews()])
      .then(([nextMatches, nextGroups, connections, reviews]) => {
        if (!active) return;
        setMatches(nextMatches);
        setGroups(nextGroups);
        setBuddyCount(connections.buddies.length);
        setAverageRating(reviews.averageRating);
        setRatingsCount(reviews.ratingsCount);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => { active = false; };
  }, []));

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <AppHeader
          title="Dashboard"
          subtitle={`Welcome back, ${userName.split(' ')[0]}!`}
          navigation={navigation}
        />

        <View style={styles.heroCard}>
          <View style={styles.heroTopline}>
            <View style={styles.heroIcon}><Ionicons name="sparkles-outline" size={20} color={colors.teal} /></View>
            <Text style={styles.heroEyebrow}>YOUR STUDY SPACE</Text>
          </View>
          <Text style={styles.heroTitle}>A little progress, together.</Text>
          <Text style={styles.heroSubtitle}>Find your people, share what you know, and make every study session count.</Text>
          <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Sessions')}>
            <Text style={styles.heroButtonText}>Plan a study session   +</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.teal} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.compactStatCard]}>
            <View style={styles.statCardTopline}>
              <View style={[styles.statIcon, styles.buddyStatIcon]}>
                <Ionicons name="people-outline" size={18} color="#0369a1" />
              </View>
              <Text style={styles.statValue}>{buddyCount}</Text>
            </View>
            <Text style={styles.statLabel}>Buddies</Text>
          </View>

          <View style={[styles.statCard, styles.compactStatCard]}>
            <View style={styles.statCardTopline}>
              <View style={[styles.statIcon, styles.groupStatIcon]}>
                <Ionicons name="people-circle-outline" size={19} color="#15803d" />
              </View>
              <Text style={styles.statValue}>{groups.length}</Text>
            </View>
            <Text style={styles.statLabel}>Groups</Text>
          </View>

          <TouchableOpacity
            style={[styles.statCard, styles.compactStatCard, styles.rateButton]}
            onPress={() => navigation.navigate('Reviews')}
            accessibilityRole="button"
            accessibilityLabel={
              averageRating === null
                ? 'View buddy reviews, no ratings yet'
                : `View buddy reviews, average rating ${averageRating.toFixed(1)} out of 5 from ${ratingsCount} ratings`
            }
          >
            <View style={styles.statCardTopline}>
              <View style={styles.averageStars}>
                {[1, 2, 3, 4, 5].map((value) => {
                  const filled = averageRating !== null && value <= Math.round(averageRating);
                  return (
                    <Ionicons
                      key={value}
                      name={filled ? 'star' : 'star-outline'}
                      size={11}
                      color={filled ? '#f59e0b' : '#cbd5e1'}
                    />
                  );
                })}
              </View>
              <Text style={styles.ratingValue}>{averageRating === null ? '—' : averageRating.toFixed(1)}</Text>
            </View>
            <Text style={styles.statLabel}>Reviews</Text>
          </TouchableOpacity>

        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Text style={styles.linkText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listGroup}>
          {loadError ? <Text style={styles.itemDetail}>Could not load your recommendations.</Text> : matches.length === 0 ? (
            <Text style={styles.itemDetail}>No matches yet. Add course codes and complete your preferences to get matched.</Text>
          ) : matches.slice(0, 3).map((match: MatchRecord, index, items) => (
            <TouchableOpacity
              key={match.id}
              style={[styles.listItem, index === items.length - 1 && styles.listItemLast]}
              onPress={() => navigation.navigate('Discover', {
                screen: 'DiscoverTab',
                params: { openMatchId: match.matched_user.id },
              })}
              accessibilityRole="button"
              accessibilityLabel={`View ${match.matched_user.name}'s profile in Discover${
                match.matched_user.average_rating === null
                  ? ', no ratings yet'
                  : `, rated ${match.matched_user.average_rating.toFixed(1)} out of 5`
              }`}
            >
              <View style={styles.avatarCircle}>
                {match.matched_user.profile?.profile_photo_url ? (
                  <Image source={{ uri: match.matched_user.profile.profile_photo_url }} style={styles.avatarPhoto} />
                ) : (
                  <Text style={styles.avatarTextSmall}>{match.matched_user.name.slice(0, 2).toUpperCase()}</Text>
                )}
                {match.matched_user.average_rating !== null ? (
                  <View
                    style={styles.ratingBadge}
                    accessibilityLabel={`Rated ${match.matched_user.average_rating.toFixed(1)} out of 5 from ${match.matched_user.ratings_count} ratings`}
                  >
                    <Text style={styles.matchRatingValue}>{Math.round(match.matched_user.average_rating)}</Text>
                    <Ionicons name="star" size={10} color="#d97706" />
                  </View>
                ) : null}
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{match.matched_user.name}</Text>
                <Text style={styles.itemDetail}>
                  {match.shared_course_count > 0
                    ? `${match.shared_course_count} shared course code${match.shared_course_count === 1 ? '' : 's'}`
                    : match.reasons[0] || 'Study profile match'}
                </Text>
              </View>

              <View style={styles.matchMeta}>
                <View style={[styles.matchBadge, { backgroundColor: getMatchScoreColors(match.compatibility_score).backgroundColor }]}>
                  <Text style={[styles.matchBadgeText, { color: getMatchScoreColors(match.compatibility_score).color }]}>
                    {match.compatibility_score}%
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your study groups</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Text style={styles.linkText}>Manage</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listGroup}>
          {groups.length === 0 ? <Text style={styles.itemDetail}>You have not joined any study groups yet.</Text> : groups.slice(0, 3).map((group, index, items) => (
            <TouchableOpacity
              key={group.id}
              style={[styles.listItem, index === items.length - 1 && styles.listItemLast]}
              onPress={() => navigation.navigate('Buddies', {
                screen: 'BuddyGroupDetail',
                params: { kind: 'group', id: group.id, name: group.name },
              })}
              accessibilityRole="button"
              accessibilityLabel={`View ${group.name} group details`}
            >
              <GroupAvatar icon={group.avatar_icon} color={group.avatar_color} size={40} />

              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{group.name}</Text>
                <Text style={styles.itemDetail}>{group.course} • {group.members} members</Text>
              </View>

              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{group.role}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => navigation.navigate('Sessions')}
        >
          <Text style={styles.primaryActionText}>+ Create Study Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mutedAction}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.mutedActionText}>View notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => navigation.navigate('Reviews')}
        >
          <Text style={styles.secondaryActionText}>View reviews</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: colors.heroSurface,
    borderColor: colors.heroBorder,
    borderWidth: 1,
    borderRadius: 11,
    padding: 12,
    marginBottom: 10,
  },
  heroTopline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  heroIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { color: colors.teal, fontSize: 10, letterSpacing: 1.2, fontWeight: '800' },
  heroTitle: { color: colors.navy, fontSize: 19, fontWeight: '800', lineHeight: 24 },
  heroSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3, marginBottom: 9 },
  heroButton: { alignSelf: 'flex-start', minHeight: 36, borderRadius: 8, backgroundColor: colors.teal, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleWrap: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.5,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactStatCard: {
    width: '31.5%',
    minHeight: 68,
    padding: 8,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 4,
  },
  statCardTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  statIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.page,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buddyStatIcon: { backgroundColor: '#e0f2fe' },
  groupStatIcon: { backgroundColor: '#dcfce7' },
  rateButton: { marginBottom: 12 },
  averageStars: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  ratingValue: {
    color: colors.navy,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '800',
  },
  orange: { backgroundColor: '#f093fb' },
  purple: { backgroundColor: '#4facfe' },
  iconText: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  statLabel: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  linkText: {
    fontSize: 12,
    color: '#1a5f7a',
    fontWeight: '700',
  },
  listGroup: {
    marginBottom: 18,
    backgroundColor: colors.surface,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listItem: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemLast: { borderBottomWidth: 0 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: colors.tealLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarTextSmall: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: '800',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    color: colors.navy,
    fontWeight: '700',
    fontSize: 14,
  },
  matchMeta: { alignItems: 'flex-end', gap: 5 },
  ratingBadge: { position: 'absolute', top: -5, right: -6, minWidth: 27, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, zIndex: 1 },
  matchRatingValue: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  itemDetail: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  matchBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  matchBadgeText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 11,
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.tealLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIcon: {
    fontSize: 18,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#eef2f7',
  },
  roleBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '700',
  },
  primaryAction: {
    marginTop: 10,
    backgroundColor: '#1a5f7a',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  mutedAction: {
    marginTop: 10,
    backgroundColor: '#eef2f7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mutedActionText: {
    color: '#0d3b4f',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryAction: {
    marginTop: 10,
    backgroundColor: colors.tealLight,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 14,
  },
});
