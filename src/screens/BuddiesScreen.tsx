import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import {
  createGroup,
  fetchGroups,
  GroupRecord,
  GROUP_AVATAR_COLORS,
  GROUP_AVATAR_OPTIONS,
  GroupAvatarColor,
  GroupAvatarIcon,
  GroupStudyMode,
  GroupStudyStyle,
  GroupStudyTime,
  GROUP_STUDY_MODE_OPTIONS,
  GROUP_STUDY_STYLE_OPTIONS,
  GROUP_STUDY_TIME_OPTIONS,
  respondToGroupJoinRequest,
} from '../services/api/groups';
import GroupAvatar from '../components/GroupAvatar';
import UserRatingBadge from '../components/UserRatingBadge';
import GroupPreferencePicker from '../components/GroupPreferencePicker';
import {
  BuddyConnections,
  fetchBuddyConnections,
  respondToBuddyRequest,
} from '../services/api/buddies';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { matchesSearch } from '../utils/search';
import { colors } from '../theme';

export default function BuddiesScreen({ navigation, route }: any) {
  const [tab, setTab] = useState<'buddies' | 'groups' | 'requests'>('buddies');
  const [connections, setConnections] = useState<BuddyConnections>({
    buddies: [],
    incoming_requests: [],
    outgoing_requests: [],
  });
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [schedule, setSchedule] = useState('');
  const [avatarIcon, setAvatarIcon] = useState<GroupAvatarIcon>('construct-outline');
  const [avatarColor, setAvatarColor] = useState<GroupAvatarColor>('#1a5f7a');
  const [studyStyle, setStudyStyle] = useState<GroupStudyStyle>('Visual');
  const [preferredStudyTime, setPreferredStudyTime] = useState<GroupStudyTime>('Flexible');
  const [studyMode, setStudyMode] = useState<GroupStudyMode>('either');
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [respondingToGroup, setRespondingToGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredBuddies = connections.buddies.filter((buddy) => matchesSearch(searchQuery, buddy.name, buddy.program));
  const filteredIncomingRequests = connections.incoming_requests.filter((request) => matchesSearch(
    searchQuery,
    request.user.name,
    request.user.program
  ));
  const filteredOutgoingRequests = connections.outgoing_requests.filter((request) => matchesSearch(
    searchQuery,
    request.user.name,
    request.user.program
  ));
  const filteredGroups = groups.filter((group) => matchesSearch(
    searchQuery,
    group.name,
    group.course,
    group.schedule,
    group.description,
    group.study_style,
    group.preferred_study_time,
    group.study_mode
  ));
  const filteredGroupRequests = groups.flatMap((group) => (group.join_requests ?? [])
    .filter((request) => matchesSearch(searchQuery, request.user_name, group.name, group.course))
    .map((request) => ({ group, request })));
  const totalRequests = connections.incoming_requests.length
    + connections.outgoing_requests.length
    + groups.reduce((total, group) => total + (group.join_requests?.length ?? 0), 0);

  const loadData = useCallback(async () => {
    try {
      const [nextConnections, nextGroups] = await Promise.all([fetchBuddyConnections(), fetchGroups()]);
      setError(null);
      setConnections(nextConnections);
      setGroups(nextGroups);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load buddies and groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (route?.params?.openGroupId) {
      setTab('groups');
    }
    void loadData();
  }, [loadData, route?.params?.openGroupId]));

  useEffect(() => {
    const openGroupId = route?.params?.openGroupId;
    if (!openGroupId) return;

    if (loading) return;

    const group = groups.find((item) => item.id === Number(openGroupId));
    if (group) {
      navigation.navigate('BuddyGroupDetail', {
        kind: 'group',
        id: group.id,
        name: group.name,
        averageRating: group.average_rating,
        ratingsCount: group.ratings_count,
      });
    }
    navigation.setParams({ openGroupId: undefined });
  }, [groups, loading, navigation, route?.params?.openGroupId]);

  const handleRequestResponse = async (requestId: number, action: 'accept' | 'decline') => {
    try {
      setRespondingTo(requestId);
      await respondToBuddyRequest(requestId, action);
      await loadData();
      if (action === 'accept') Alert.alert('Request accepted', 'You are now study buddies.');
    } catch (responseError) {
      Alert.alert(
        action === 'accept' ? 'Could not accept request' : 'Could not decline request',
        responseError instanceof Error ? responseError.message : 'Please try again.'
      );
    } finally {
      setRespondingTo(null);
    }
  };

  const openBuddyDetails = (buddy: {
    id: number;
    name: string;
    average_rating: number | null;
    ratings_count: number;
  }) => {
    navigation.navigate('BuddyGroupDetail', {
      kind: 'buddy',
      id: buddy.id,
      name: buddy.name,
      averageRating: buddy.average_rating,
      ratingsCount: buddy.ratings_count,
    });
  };

  const openGroupDetails = (group: GroupRecord) => {
    navigation.navigate('BuddyGroupDetail', {
      kind: 'group',
      id: group.id,
      name: group.name,
      averageRating: group.average_rating,
      ratingsCount: group.ratings_count,
    });
  };

  const handleGroupRequestResponse = async (
    groupId: number,
    requestId: number,
    action: 'accept' | 'decline'
  ) => {
    try {
      setRespondingToGroup(`${groupId}:${requestId}`);
      await respondToGroupJoinRequest(groupId, requestId, action);
      await loadData();
      if (action === 'accept') Alert.alert('Request accepted', 'The student has joined your group.');
    } catch (responseError) {
      Alert.alert(
        action === 'accept' ? 'Could not accept request' : 'Could not decline request',
        responseError instanceof Error ? responseError.message : 'Please try again.'
      );
    } finally {
      setRespondingToGroup(null);
    }
  };

  const handleCreateGroup = async () => {
    if (!name.trim() || !course.trim()) {
      Alert.alert('Required fields', 'Enter a group name and course.');
      return;
    }
    try {
      const group = await createGroup({
        name: name.trim(),
        course: course.trim(),
        avatar_icon: avatarIcon,
        avatar_color: avatarColor,
        study_style: studyStyle,
        preferred_study_time: preferredStudyTime,
        study_mode: studyMode,
        schedule: schedule.trim() || 'Flexible',
      });
      setGroups((current) => [group, ...current]);
      setName('');
      setCourse('');
      setSchedule('');
      setAvatarIcon('construct-outline');
      setAvatarColor('#1a5f7a');
      setStudyStyle('Visual');
      setPreferredStudyTime('Flexible');
      setStudyMode('either');
      setShowCreate(false);
    } catch (createError) {
      Alert.alert('Could not create group', createError instanceof Error ? createError.message : 'Please try again.');
    }
  };

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <AppHeader title="My Buddies" subtitle="Your matches and joined study groups" navigation={navigation} />
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={tab === 'groups' ? 'library-outline' : tab === 'requests' ? 'mail-unread-outline' : 'people-outline'}
              size={22}
              color={colors.teal}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>YOUR STUDY COMMUNITY</Text>
            <Text style={styles.heroTitle}>
              {tab === 'buddies' ? 'Learn better, together.' : tab === 'groups' ? 'Build your study circle.' : 'Manage your requests.'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {tab === 'buddies'
                ? `${connections.buddies.length} study ${connections.buddies.length === 1 ? 'buddy' : 'buddies'} connected with you.`
                : tab === 'groups'
                  ? `${groups.length} ${groups.length === 1 ? 'group' : 'groups'} you have joined.`
                  : `${totalRequests} pending buddy and group ${totalRequests === 1 ? 'request' : 'requests'}.`}
            </Text>
          </View>
        </View>
        <View style={styles.tabs}>
          {(['buddies', 'groups', 'requests'] as const).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.tab, tab === item && styles.tabActive]}
              onPress={() => setTab(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === item }}
            >
              {item === 'requests' ? (
                <View style={styles.requestTabLabel}>
                  <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>Requests</Text>
                  {totalRequests > 0 ? (
                    <View style={styles.requestCountBadge}>
                      <Text style={styles.requestCountText}>
                        {totalRequests > 99 ? '99+' : totalRequests}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                  {item === 'buddies' ? 'Buddies' : 'Groups'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#64748b" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={tab === 'buddies' ? 'Search study buddies' : tab === 'groups' ? 'Search your groups' : 'Search all requests'}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel={tab === 'buddies' ? 'Search study buddies' : tab === 'groups' ? 'Search joined study groups' : 'Search buddy and group requests'}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={19} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {tab === 'groups' && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => {
            setAvatarIcon('construct-outline');
            setAvatarColor('#1a5f7a');
            setStudyStyle('Visual');
            setPreferredStudyTime('Flexible');
            setStudyMode('either');
            setShowCreate(true);
          }}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Create a study group</Text>
          </TouchableOpacity>
        )}
        {loading ? <ActivityIndicator style={styles.loading} /> : error ? (
          <View style={styles.empty}><Text style={styles.emptyText}>{error}</Text><TouchableOpacity onPress={() => { setLoading(true); void loadData(); }}><Text style={styles.link}>Try again</Text></TouchableOpacity></View>
        ) : tab === 'buddies' ? (
          <>
            {filteredBuddies.length ? (
              <>
                <Text style={styles.sectionTitle}>Study buddies</Text>
                <View style={styles.buddyList}>
                  {filteredBuddies.map((buddy, index) => (
                    <TouchableOpacity
                      key={buddy.id}
                      style={[
                        styles.buddyRow,
                        index === filteredBuddies.length - 1 && styles.buddyRowLast,
                      ]}
                      onPress={() => openBuddyDetails(buddy)}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${buddy.name}'s profile`}
                    >
                      <View style={styles.buddyAvatarWrapper}>
                        {buddy.profile_photo_url ? (
                          <Image source={{ uri: buddy.profile_photo_url }} style={styles.buddyAvatar} />
                        ) : (
                          <View style={styles.buddyAvatar}>
                            <Text style={styles.avatarText}>{buddy.name.slice(0, 2).toUpperCase()}</Text>
                          </View>
                        )}
                        <UserRatingBadge
                          averageRating={buddy.average_rating}
                          ratingsCount={buddy.ratings_count}
                        />
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{buddy.name}</Text>
                        <Text style={styles.cardSub}>{buddy.program || 'SNSU student'}</Text>
                      </View>
                      <View style={styles.buddyRowMeta}>
                        <Text style={styles.score}>Buddy</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
            {!filteredBuddies.length ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No matching study buddies' : 'No study buddies yet'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'Try a different name or program.'
                      : 'Send a request to someone in Discover. Once they accept, they will appear here.'}
                  </Text>
                </View>
            ) : null}
          </>
        ) : tab === 'groups' && filteredGroups.length ? (
          <View style={styles.buddyList}>
            {filteredGroups.map((group, index) => (
            <TouchableOpacity
              style={[styles.buddyRow, index === filteredGroups.length - 1 && styles.buddyRowLast]}
              onPress={() => openGroupDetails(group)}
              key={group.id}
            >
              <View style={styles.groupAvatarWrapper}>
                <GroupAvatar icon={group.avatar_icon} color={group.avatar_color} size={42} />
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
                <Text style={styles.cardSub}>{group.course} · {group.members ?? 0} members</Text>
              </View>
              <Text style={styles.role}>{group.role}</Text>
              <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
            </TouchableOpacity>
            ))}
          </View>
        ) : tab === 'groups' ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{searchQuery ? 'No matching groups' : 'No joined groups'}</Text>
            <Text style={styles.emptyText}>{searchQuery ? 'Try another group name, course, or schedule.' : 'Find a group in Discover or create one to get started.'}</Text>
          </View>
        ) : (
          <>
            {filteredIncomingRequests.length ? (
              <>
                <Text style={styles.sectionTitle}>Buddy requests</Text>
                {filteredIncomingRequests.map((request) => (
                  <View key={`buddy-incoming-${request.id}`} style={styles.requestCard}>
                    <View style={styles.card}>
                      <View style={styles.requestAvatarWrap}>
                        {request.user.profile_photo_url ? (
                          <Image source={{ uri: request.user.profile_photo_url }} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatar}><Text style={styles.avatarText}>{request.user.name.slice(0, 2).toUpperCase()}</Text></View>
                        )}
                        <UserRatingBadge averageRating={request.user.average_rating} ratingsCount={request.user.ratings_count} />
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{request.user.name}</Text>
                        <Text style={styles.cardSub}>{request.user.program || 'SNSU student'} wants to study with you</Text>
                      </View>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        disabled={respondingTo === request.id}
                        onPress={() => { void handleRequestResponse(request.id, 'accept'); }}
                      >
                        <Text style={styles.actionText}>{respondingTo === request.id ? 'Working…' : 'Accept'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineButton}
                        disabled={respondingTo === request.id}
                        onPress={() => { void handleRequestResponse(request.id, 'decline'); }}
                      >
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
            {filteredOutgoingRequests.length ? (
              <>
                <Text style={styles.sectionTitle}>Sent buddy requests</Text>
                {filteredOutgoingRequests.map((request) => (
                  <View key={`buddy-outgoing-${request.id}`} style={styles.card}>
                    <View style={styles.requestAvatarWrap}>
                      {request.user.profile_photo_url ? (
                        <Image source={{ uri: request.user.profile_photo_url }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatar}><Text style={styles.avatarText}>{request.user.name.slice(0, 2).toUpperCase()}</Text></View>
                      )}
                      <UserRatingBadge averageRating={request.user.average_rating} ratingsCount={request.user.ratings_count} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{request.user.name}</Text>
                      <Text style={styles.cardSub}>Waiting for them to accept</Text>
                    </View>
                    <Text style={styles.role}>Pending</Text>
                  </View>
                ))}
              </>
            ) : null}
            {filteredGroupRequests.length ? (
              <>
                <Text style={styles.sectionTitle}>Group join requests</Text>
                {filteredGroupRequests.map(({ group, request }) => {
                  const actionKey = `${group.id}:${request.id}`;
                  return (
                    <View key={`group-${actionKey}`} style={styles.requestCard}>
                      <View style={styles.groupRequestUser}>
                        <View style={styles.groupRequestAvatarWrap}>
                        {request.profile_photo_url ? (
                          <Image source={{ uri: request.profile_photo_url }} style={styles.groupRequestAvatar} />
                        ) : (
                          <View style={[styles.groupRequestAvatar, styles.groupRequestAvatarFallback]}>
                            <Text style={styles.avatarText}>{request.user_name.slice(0, 2).toUpperCase()}</Text>
                          </View>
                        )}
                        <UserRatingBadge averageRating={request.average_rating} ratingsCount={request.ratings_count} />
                        </View>
                        <View style={styles.cardBody}>
                          <Text style={styles.cardTitle}>{request.user_name}</Text>
                          <Text style={styles.cardSub}>Requested to join {group.name}</Text>
                        </View>
                      </View>
                      <View style={styles.groupRequestActions}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          disabled={respondingToGroup === actionKey}
                          onPress={() => { void handleGroupRequestResponse(group.id, request.id, 'accept'); }}
                        >
                          <Text style={styles.actionText}>{respondingToGroup === actionKey ? 'Working…' : 'Accept'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineButton}
                          disabled={respondingToGroup === actionKey}
                          onPress={() => { void handleGroupRequestResponse(group.id, request.id, 'decline'); }}
                        >
                          <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : null}
            {!filteredIncomingRequests.length && !filteredOutgoingRequests.length && !filteredGroupRequests.length ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{searchQuery ? 'No matching requests' : 'No requests'}</Text>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'Try a different name or group.'
                    : 'Buddy requests and requests to join your groups will appear here.'}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Create study group</Text>
            <View style={styles.avatarPreview}>
              <GroupAvatar icon={avatarIcon} color={avatarColor} size={58} />
              <Text style={styles.cardSub}>Choose the icon for your SNSU department</Text>
            </View>
            <View style={styles.avatarOptions}>
              {GROUP_AVATAR_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.icon}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} group icon`}
                  accessibilityState={{ selected: avatarIcon === option.icon }}
                  style={[styles.iconOption, avatarIcon === option.icon && styles.selectedOption]}
                  onPress={() => setAvatarIcon(option.icon)}
                >
                  <Ionicons name={option.icon} size={21} color={avatarIcon === option.icon ? '#0d3b4f' : '#64748b'} />
                  <Text style={[styles.iconOptionLabel, avatarIcon === option.icon && styles.iconOptionLabelSelected]}>
                    {option.shortLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.avatarOptions}>
              {GROUP_AVATAR_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${color} group color`}
                  accessibilityState={{ selected: avatarColor === color }}
                  style={[styles.colorOption, { backgroundColor: color }, avatarColor === color && styles.selectedColor]}
                  onPress={() => setAvatarColor(color)}
                />
              ))}
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor="#64748b"
              style={styles.input}
            />
            <TextInput
              value={course}
              onChangeText={setCourse}
              placeholder="Course or subject"
              placeholderTextColor="#64748b"
              style={styles.input}
            />
            <GroupPreferencePicker
              label="Study style"
              options={GROUP_STUDY_STYLE_OPTIONS}
              value={studyStyle}
              onChange={setStudyStyle}
            />
            <GroupPreferencePicker
              label="Preferred study time"
              options={GROUP_STUDY_TIME_OPTIONS}
              value={preferredStudyTime}
              onChange={setPreferredStudyTime}
            />
            <GroupPreferencePicker
              label="Study mode"
              options={GROUP_STUDY_MODE_OPTIONS}
              value={studyMode}
              onChange={setStudyMode}
            />
            <TextInput
              value={schedule}
              onChangeText={setSchedule}
              placeholder="Schedule (optional)"
              placeholderTextColor="#64748b"
              style={styles.input}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={() => { void handleCreateGroup(); }}><Text style={styles.primaryButtonText}>Create</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.page },
  content: {
    flex: 1,
    backgroundColor: colors.page,
  },
  contentInner: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 32 },
  title: { color: '#0d3b4f', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 16 },
  heroCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.heroSurface, borderColor: colors.heroBorder, borderWidth: 1, borderRadius: 11, padding: 16, marginBottom: 14 },
  heroIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: colors.teal, fontSize: 9, letterSpacing: 1, fontWeight: '800', marginBottom: 5 },
  heroTitle: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  heroSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: '#e9edf2', borderRadius: 9, padding: 4, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 7 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#64748b', fontWeight: '700' },
  tabTextActive: { color: colors.navy },
  requestTabLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  requestCountBadge: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  requestCountText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  searchBox: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 13, marginBottom: 14 },
  searchInput: { flex: 1, minHeight: 44, color: '#0f172a', paddingVertical: 8, fontSize: 13 },
  sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  primaryButton: { backgroundColor: '#1a5f7a', borderRadius: 14, minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: colors.surface, padding: 12, borderRadius: 9, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.border },
  buddyList: { backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  buddyRow: { minHeight: 70, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  buddyRowLast: { borderBottomWidth: 0 },
  buddyAvatarWrapper: { width: 42, height: 42, position: 'relative' },
  requestAvatarWrap: { width: 44, height: 44, position: 'relative' },
  groupRequestAvatarWrap: { width: 36, height: 36, position: 'relative' },
  buddyAvatar: { width: 42, height: 42, borderRadius: 11, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.teal, fontWeight: '800' },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.navy, fontWeight: '700', fontSize: 14 },
  buddyRowMeta: { alignItems: 'flex-end', gap: 5 },
  ratingBadge: { position: 'absolute', top: -5, right: -6, minWidth: 27, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, zIndex: 1 },
  ratingValue: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  groupAvatarWrapper: { position: 'relative', marginRight: 4 },
  cardSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  score: { color: colors.teal, fontWeight: '800', fontSize: 11 },
  role: { color: '#64748b', fontSize: 12 },
  requestCard: { backgroundColor: '#fff', borderRadius: 11, padding: 9, marginBottom: 9, borderWidth: 1, borderColor: colors.border },
  groupRequests: { backgroundColor: '#fff', borderRadius: 11, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  groupRequestRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  groupRequestUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupRequestAvatar: { width: 36, height: 36, borderRadius: 12 },
  groupRequestAvatarFallback: { backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  groupRequestActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  requestActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  acceptButton: { flex: 1, backgroundColor: '#1a5f7a', padding: 11, alignItems: 'center', borderRadius: 10 },
  declineButton: { flex: 1, backgroundColor: '#f1f5f9', padding: 11, alignItems: 'center', borderRadius: 10 },
  actionText: { color: '#fff', fontWeight: '800' },
  declineText: { color: '#475569', fontWeight: '700' },
  loading: { marginTop: 24 },
  empty: { backgroundColor: '#fff', padding: 18, borderRadius: 11, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.navy, fontWeight: '700', fontSize: 15, marginBottom: 6 },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 19 },
  link: { color: '#1a5f7a', fontWeight: '700', textAlign: 'center', padding: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalContent: { padding: 20, gap: 10 },
  modalTitle: { color: '#0d3b4f', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  avatarPreview: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  avatarOptions: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10 },
  iconOption: { width: '30%', minHeight: 58, paddingHorizontal: 3, paddingVertical: 5, borderRadius: 13, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 2, borderColor: 'transparent' },
  iconOptionLabel: { color: '#64748b', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  iconOptionLabelSelected: { color: '#0d3b4f' },
  selectedOption: { borderColor: '#1a5f7a', backgroundColor: '#eaf4f7' },
  colorOption: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#fff' },
  selectedColor: { borderColor: '#0d3b4f' },
  input: { backgroundColor: '#f8fafc', color: colors.text, borderWidth: 1, borderColor: '#dbe3eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
});
