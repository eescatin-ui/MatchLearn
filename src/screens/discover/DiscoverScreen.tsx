import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import { cancelGroupJoinRequest, discoverGroups, GroupRecord, joinGroup } from '../../services/api/groups';
import { fetchMatches, refreshMatches } from '../../services/api/matches';
import { fetchBuddyConnections } from '../../services/api/buddies';
import { MatchRecord } from '../../types/match';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import GroupAvatar from '../../components/GroupAvatar';
import UserRatingBadge from '../../components/UserRatingBadge';
import { getMatchScoreColors } from '../../utils/matchScoreColors';
import { matchesSearch } from '../../utils/search';
import { colors } from '../../theme';

export default function DiscoverScreen({ navigation, route }: any) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [view, setView] = useState<'buddies' | 'groups'>('buddies');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<number | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState<number | null>(null);
  const [pendingBuddyIds, setPendingBuddyIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [matchSort, setMatchSort] = useState<'recommended' | 'shared_courses' | 'ratings'>('recommended');
  const [showCompatibilityNote, setShowCompatibilityNote] = useState(false);

  const filteredMatches = matches
    .filter((match) => matchesSearch(
        searchQuery,
        match.matched_user.name,
        match.matched_user.profile?.program,
        match.reasons.join(' '),
        ...match.matched_user.profile?.study_courses.map((course) => `${course.course_code} ${course.course_name}`) ?? []
      ))
    .sort((first, second) => {
      if (matchSort === 'shared_courses') {
        return second.shared_course_count - first.shared_course_count
          || second.compatibility_score - first.compatibility_score;
      }
      if (matchSort === 'ratings') {
        return (second.matched_user.average_rating ?? -1) - (first.matched_user.average_rating ?? -1)
          || second.matched_user.ratings_count - first.matched_user.ratings_count;
      }
      return second.compatibility_score - first.compatibility_score;
    });
  const filteredGroups = groups.filter((group) => matchesSearch(
    searchQuery,
    group.name,
    group.course,
    group.schedule,
    group.description
  ));

  const loadData = useCallback(async (refresh = false) => {
    try {
      const [nextMatches, nextGroups] = await Promise.all([
        refresh ? refreshMatches() : fetchMatches(),
        discoverGroups(),
      ]);
      setError(null);
      setMatches(nextMatches);
      setGroups(nextGroups);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load recommendations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  useEffect(() => {
    if (!route?.params?.showGroups) return;
    const focusGroupsTab = setTimeout(() => setView('groups'), 0);
    navigation.setParams({ showGroups: undefined });
    return () => clearTimeout(focusGroupsTab);
  }, [navigation, route?.params?.showGroups]);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    fetchBuddyConnections().then((connections) => {
      if (isActive) {
        setPendingBuddyIds(new Set(connections.outgoing_requests.map((request) => request.user.id)));
      }
    }).catch((statusError) => {
      if (isActive) {
        Alert.alert(
          'Could not load buddy requests',
          statusError instanceof Error ? statusError.message : 'Please try again.'
        );
      }
    });

    return () => {
      isActive = false;
    };
  }, []));

  useEffect(() => {
    const openMatchId = route?.params?.openMatchId;
    if (!openMatchId || loading) return;
    const match = matches.find((item) => item.matched_user.id === Number(openMatchId));
    if (match) {
      navigation.navigate('MatchDetail', { match });
      navigation.setParams({ openMatchId: undefined });
    }
  }, [loading, matches, navigation, route?.params?.openMatchId]);

  const handleJoin = async (group: GroupRecord) => {
    try {
      setJoining(group.id);
      await joinGroup(group.id);
      setGroups((current) => current.map((item) => (
        item.id === group.id ? { ...item, request_status: 'pending' } : item
      )));
      Alert.alert('Request sent', `The admin of ${group.name} must approve your request to join.`);
    } catch (joinError) {
      Alert.alert('Could not join group', joinError instanceof Error ? joinError.message : 'Please try again.');
    } finally {
      setJoining(null);
    }
  };

  const handleCancelRequest = async (group: GroupRecord) => {
    try {
      setCancellingRequest(group.id);
      await cancelGroupJoinRequest(group.id);
      setGroups((current) => current.map((item) => (
        item.id === group.id ? { ...item, request_status: null, request_id: null } : item
      )));
      Alert.alert('Request cancelled', `Your request to join ${group.name} was cancelled.`);
    } catch (cancelError) {
      Alert.alert('Could not cancel request', cancelError instanceof Error ? cancelError.message : 'Please try again.');
    } finally {
      setCancellingRequest(null);
    }
  };

  const openGroupDetails = (group: GroupRecord) => {
    navigation.navigate('BuddyGroupDetail', {
      kind: 'group',
      id: group.id,
      name: group.name,
      averageRating: group.average_rating,
      ratingsCount: group.ratings_count,
      source: 'discover',
    });
  };

  return (
    <View style={styles.frame}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadData(true); }} />}
      >
        <View style={styles.stickyHeader}>
        <AppHeader title="Discover" subtitle="Study buddies and groups" navigation={navigation} />
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}><Ionicons name="compass-outline" size={22} color={colors.teal} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>GOOD STUDY PARTNERS START HERE</Text>
            <Text style={styles.heroTitle}>Find your next study match.</Text>
            <Text style={styles.heroSubtitle}>Explore students with shared courses and groups.</Text>
          </View>
        </View>
        <View style={styles.tabs}>
          {(['buddies', 'groups'] as const).map((item) => (
            <TouchableOpacity key={item} style={[styles.tab, view === item && styles.tabActive]} onPress={() => setView(item)}>
              <Text style={[styles.tabText, view === item && styles.tabTextActive]}>{item === 'buddies' ? 'Study buddies' : 'Study groups'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#64748b" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={view === 'buddies' ? 'Search people, courses, or skills' : 'Search groups, courses, or schedules'}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel={view === 'buddies' ? 'Search study buddy matches' : 'Search study groups'}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={19} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
        {view === 'buddies' ? (
          <>
            <View style={styles.sortSection}>
              <Text style={styles.sortLabel}>Sort by</Text>
              <View style={styles.sortOptions}>
                {[
                  { label: 'Recommended', value: 'recommended' },
                  { label: 'Shared courses', value: 'shared_courses' },
                  { label: 'Ratings', value: 'ratings' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.sortChip, matchSort === option.value && styles.sortChipActive]}
                    onPress={() => setMatchSort(option.value as typeof matchSort)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: matchSort === option.value }}
                  >
                    <Text style={[styles.sortChipText, matchSort === option.value && styles.sortChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : null}
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingCopy}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{view === 'buddies' ? 'Study buddy matches' : 'Groups to explore'}</Text>
                {view === 'buddies' ? (
                  <TouchableOpacity
                    onPress={() => setShowCompatibilityNote((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel="Compatibility information"
                    accessibilityState={{ expanded: showCompatibilityNote }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showCompatibilityNote ? 'information-circle' : 'information-circle-outline'}
                      size={19}
                      color={colors.teal}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
              {showCompatibilityNote && view === 'buddies' ? (
                <View style={styles.scoreNote}>
                  <Text style={styles.scoreNoteText}>
                    Compatibility is a study-profile suggestion, not a guarantee. Review the match reasons and choose what works for you.
                  </Text>
                </View>
              ) : null}
              <Text style={styles.sectionSubtitle}>{view === 'buddies' ? `${filteredMatches.length} personalized matches` : `${filteredGroups.length} groups available`}</Text>
            </View>
            <Ionicons name={view === 'buddies' ? 'people-outline' : 'library-outline'} size={21} color="#1a5f7a" />
          </View>
        </View>

        <View>
          {loading ? <ActivityIndicator style={styles.loading} /> : error ? (
          <View style={styles.empty}><Text style={styles.body}>{error}</Text><TouchableOpacity onPress={() => { setLoading(true); void loadData(); }}><Text style={styles.link}>Try again</Text></TouchableOpacity></View>
        ) : view === 'buddies' ? filteredMatches.length ? (
          <View style={styles.listGroup}>
            {filteredMatches.map((match, index) => (
              <TouchableOpacity
                key={match.id}
                style={[styles.listRow, index === filteredMatches.length - 1 && styles.listRowLast]}
                onPress={() => navigation.navigate('MatchDetail', { match })}
              >
                <View style={styles.avatarWrapper}>
                  {match.matched_user.profile?.profile_photo_url ? (
                    <Image source={{ uri: match.matched_user.profile.profile_photo_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatar}><Text style={styles.avatarText}>{match.matched_user.name.slice(0, 2).toUpperCase()}</Text></View>
                  )}
                  <UserRatingBadge
                    averageRating={match.matched_user.average_rating}
                    ratingsCount={match.matched_user.ratings_count}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{match.matched_user.name}</Text>
                  <Text style={styles.body}>
                    {match.shared_course_count > 0
                      ? `${match.shared_course_count} shared course code${match.shared_course_count === 1 ? '' : 's'}`
                      : match.reasons[0] || 'Study profile match'}
                  </Text>
                </View>
                <View style={styles.matchMeta}>
                  {pendingBuddyIds.has(match.matched_user.id) ? (
                    <Text style={styles.requestSentText}>Request sent</Text>
                  ) : null}
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
        ) : <View style={styles.empty}>
          <Text style={styles.cardTitle}>{searchQuery ? 'No matching study buddies' : 'No matches yet'}</Text>
          <Text style={styles.body}>
            {searchQuery
              ? 'Try another name, course, or skill.'
              : 'Add course codes, strengths, and academic needs to get matched.'}
          </Text>
        </View>
        : filteredGroups.length ? (
          <View style={styles.listGroup}>
            {filteredGroups.map((group, index) => (
              <View key={group.id} style={[styles.listRow, index === filteredGroups.length - 1 && styles.listRowLast]}>
                <TouchableOpacity
                  style={styles.groupDetailsTap}
                  onPress={() => openGroupDetails(group)}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${group.name}`}
                >
                <View style={styles.groupAvatarWrapper}>
                  <GroupAvatar icon={group.avatar_icon} color={group.avatar_color} size={40} />
                  {group.average_rating != null ? (
                    <View
                      style={styles.ratingBadge}
                      accessibilityLabel={`Rated ${group.average_rating.toFixed(1)} out of 5 from ${group.ratings_count ?? 0} ratings`}
                    >
                      <Text style={styles.ratingValue}>{group.average_rating.toFixed(1)}</Text>
                      <Ionicons name="star" size={9} color="#d97706" />
                    </View>
                  ) : null}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{group.name}</Text>
                  <Text style={styles.body}>{group.course} · {group.members ?? 0} members</Text>
                  {group.study_style && group.preferred_study_time && group.study_mode ? (
                    <Text style={styles.body} numberOfLines={1}>
                      {group.study_style} · {group.preferred_study_time} · {group.study_mode.replace('_', ' ')}
                    </Text>
                  ) : null}
                  {group.schedule ? <Text style={styles.body}>{group.schedule}</Text> : null}
                  {group.description ? <Text style={styles.body} numberOfLines={2}>{group.description}</Text> : null}
                </View>
                </TouchableOpacity>
                <View style={styles.groupActionColumn}>
                  <View style={[styles.matchBadge, { backgroundColor: getMatchScoreColors(group.compatibility_score ?? 0).backgroundColor }]}>
                    <Text style={[styles.matchBadgeText, { color: getMatchScoreColors(group.compatibility_score ?? 0).color }]}>
                      {group.compatibility_score ?? 0}%
                    </Text>
                  </View>
                  {group.request_status === 'pending' ? (
                    <>
                      <TouchableOpacity
                        style={styles.pendingButton}
                        onPress={() => openGroupDetails(group)}
                        accessibilityRole="button"
                        accessibilityLabel={`View requested group ${group.name}`}
                      >
                        <Text style={styles.pendingText}>Requested</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelRequestButton}
                        disabled={cancellingRequest === group.id}
                        onPress={() => { void handleCancelRequest(group); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Cancel request to join ${group.name}`}
                      >
                        <Text style={styles.cancelRequestText}>
                          {cancellingRequest === group.id ? 'Cancelling…' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : group.request_status === 'invited' ? (
                    <TouchableOpacity
                      style={styles.pendingButton}
                      onPress={() => openGroupDetails(group)}
                      accessibilityRole="button"
                      accessibilityLabel={`View invitation for ${group.name}`}
                    >
                      <Text style={styles.pendingText}>Invited</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.joinButton} disabled={joining === group.id} onPress={() => { void handleJoin(group); }}>
                      <Text style={styles.joinText}>{joining === group.id ? 'Requesting…' : 'Join'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : <View style={styles.empty}><Text style={styles.cardTitle}>{searchQuery ? 'No matching groups' : 'No groups to discover'}</Text><Text style={styles.body}>{searchQuery ? 'Try another group name, course, or schedule.' : 'Check back later, or create a group from My Buddies.'}</Text></View>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.page },
  content: {
    flex: 1,
    backgroundColor: colors.page,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  stickyHeader: { backgroundColor: colors.page, paddingBottom: 5, zIndex: 2 },
  heroCard: { flexDirection: 'row', gap: 13, backgroundColor: colors.heroSurface, borderColor: colors.heroBorder, borderWidth: 1, borderRadius: 11, padding: 14, marginBottom: 9 },
  heroIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: colors.teal, fontSize: 9, letterSpacing: 0.8, fontWeight: '800', marginBottom: 5 },
  heroTitle: { color: colors.navy, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  heroSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 2, marginBottom: 6 },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: '#64748b', fontSize: 11, marginTop: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#0d3b4f', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#64748b', marginTop: 4 },
  avatarWrapper: { width: 44, height: 44, position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.teal, fontWeight: '800' },
  tabs: { flexDirection: 'row', backgroundColor: '#e9edf2', borderRadius: 9, padding: 4, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 7 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#64748b', fontWeight: '700' },
  tabTextActive: { color: colors.navy },
  searchBox: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 13, marginBottom: 8 },
  searchInput: { flex: 1, minHeight: 44, color: '#0f172a', paddingVertical: 8, fontSize: 13 },
  sortSection: { marginBottom: 4, gap: 5 },
  sortLabel: { color: colors.navy, fontSize: 11, fontWeight: '700' },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingRight: 4 },
  sortChip: { minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', paddingHorizontal: 11 },
  sortChipActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  sortChipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  sortChipTextActive: { color: colors.teal, fontWeight: '800' },
  scoreNote: { backgroundColor: '#eff8fa', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, marginTop: 4 },
  scoreNoteText: { flex: 1, color: '#475569', fontSize: 11, lineHeight: 16 },
  loading: { marginTop: 28 },
  listGroup: { backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 },
  listRow: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  listRowLast: { borderBottomWidth: 0 },
  matchMeta: { alignItems: 'flex-end', gap: 5 },
  groupAvatarWrapper: { width: 40, height: 40, position: 'relative' },
  groupActionColumn: { alignItems: 'flex-end', gap: 5 },
  groupDetailsTap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.navy, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  requestSentText: { color: colors.teal, backgroundColor: colors.tealLight, fontSize: 9, fontWeight: '800', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  ratingBadge: { position: 'absolute', top: -5, right: -6, minWidth: 27, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, zIndex: 1 },
  ratingValue: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  matchBadge: { borderRadius: 16, paddingVertical: 5, paddingHorizontal: 10 },
  matchBadgeText: { fontWeight: '800', fontSize: 11 },
  joinButton: { backgroundColor: colors.teal, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  joinText: { color: '#fff', fontWeight: '700' },
  pendingButton: { backgroundColor: colors.page, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 7, borderWidth: 1, borderColor: colors.border },
  pendingText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  cancelRequestButton: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff7f7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7 },
  cancelRequestText: { color: '#b42318', fontWeight: '700', fontSize: 11 },
  empty: { backgroundColor: '#fff', padding: 18, borderRadius: 11, alignItems: 'center', marginTop: 10, gap: 8, borderWidth: 1, borderColor: colors.border },
  link: { color: '#1a5f7a', fontWeight: '700' },
});
