import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord } from '../../types/match';
import { startDirectConversation } from '../../services/api/messages';
import {
  fetchBuddyConnections,
  respondToBuddyRequest,
  sendBuddyRequest,
} from '../../services/api/buddies';
import { getMatchScoreColors } from '../../utils/matchScoreColors';
import { colors } from '../../theme';
import UserRatingBadge from '../../components/UserRatingBadge';

export default function MatchDetailScreen({ route, navigation }: any) {
  const [startingChat, setStartingChat] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'loading' | 'none' | 'pending_sent' | 'pending_received' | 'accepted'
  >('loading');
  const [requestId, setRequestId] = useState<number | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const match: MatchRecord | undefined = route?.params?.match;
  const user = match?.matched_user;

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    fetchBuddyConnections().then((connections) => {
      if (connections.buddies.some((buddy) => buddy.id === userId)) {
        setConnectionStatus('accepted');
        setRequestId(null);
        return;
      }
      const incoming = connections.incoming_requests.find((item) => item.user.id === userId);
      if (incoming) {
        setConnectionStatus('pending_received');
        setRequestId(incoming.id);
        return;
      }
      if (connections.outgoing_requests.some((item) => item.user.id === userId)) {
        setConnectionStatus('pending_sent');
        setRequestId(null);
        return;
      }
      setConnectionStatus('none');
      setRequestId(null);
    }).catch((error) => {
      Alert.alert('Could not load buddy status', error instanceof Error ? error.message : 'Please try again.');
      setConnectionStatus('none');
    });
  }, [userId]);

  const handleBuddyRequest = async () => {
    if (!user) return;
    try {
      setRequestBusy(true);
      await sendBuddyRequest(user.id);
      setConnectionStatus('pending_sent');
      Alert.alert('Request sent', `${user.name} can accept your study buddy request from My Buddies.`);
    } catch (error) {
      Alert.alert('Could not send request', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setRequestBusy(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!requestId || !user) return;
    try {
      setRequestBusy(true);
      await respondToBuddyRequest(requestId, 'accept');
      setConnectionStatus('accepted');
      setRequestId(null);
      Alert.alert('Request accepted', `You and ${user.name} are now study buddies.`);
    } catch (error) {
      Alert.alert('Could not accept request', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setRequestBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!user) return;
    try {
      setStartingChat(true);
      const chat = await startDirectConversation(user.id);
      navigation.navigate('Messages', { screen: 'Chat', params: { chat } });
    } catch (error) {
      Alert.alert('Could not start conversation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  if (!match || !user) {
    return (
      <View style={styles.emptyState}>
        <Text>No match selected.</Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to discover"
        >
          <Ionicons name="arrow-back" size={19} color="#0d3b4f" />
          <Text style={styles.backText}>Discover</Text>
        </TouchableOpacity>

        <View style={styles.profileHero}>
          <View style={styles.heroTopRow}>
            <View style={styles.profileImageWrap}>
              {user.profile?.profile_photo_url ? (
                <Image source={{ uri: user.profile.profile_photo_url }} style={styles.profileImage} accessibilityLabel={`${user.name}'s profile photo`} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{user.name.slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
              <UserRatingBadge averageRating={user.average_rating} ratingsCount={user.ratings_count} />
            </View>
            <View style={styles.heroIdentity}>
              <Text style={styles.title}>{user.name}</Text>
              <Text style={styles.program}>{user.profile?.program ?? 'SNSU student'}</Text>
              {user.profile?.year_level ? (
                <View style={styles.yearBadge}>
                  <Ionicons name="school-outline" size={13} color="#d6edf3" />
                  <Text style={styles.yearBadgeText}>
                    {user.profile.year_level}{user.profile.year_level === 1 ? 'st' : user.profile.year_level === 2 ? 'nd' : user.profile.year_level === 3 ? 'rd' : 'th'} year
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View
            style={styles.ratingSummary}
            accessibilityLabel={user.average_rating == null
              ? 'No ratings yet'
              : `Rated ${user.average_rating.toFixed(1)} out of 5 from ${user.ratings_count} ratings`}
          >
            <View style={styles.ratingStars}>
              {Array.from({ length: 5 }, (_, index) => (
                <Ionicons
                  key={index}
                  name={user.average_rating != null && index < Math.round(user.average_rating) ? 'star' : 'star-outline'}
                  size={19}
                  color={user.average_rating != null && index < Math.round(user.average_rating) ? '#d97706' : '#cbd5e1'}
                />
              ))}
            </View>
            <Text style={styles.ratingSummaryText}>
              {user.average_rating == null
                ? 'No ratings yet'
                : `${user.average_rating.toFixed(1)} / 5 · ${user.ratings_count} ${user.ratings_count === 1 ? 'rating' : 'ratings'}`}
            </Text>
          </View>
          <View style={styles.matchSummary}>
            <View style={styles.matchSummaryIcon}>
              <Ionicons name="sparkles" size={16} color="#fbbf24" />
            </View>
            <View style={styles.matchCopy}>
              <Text style={styles.matchEyebrow}>YOUR COMPATIBILITY</Text>
              <Text style={styles.matchCaption}>Based on your study profiles</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: getMatchScoreColors(match.compatibility_score).backgroundColor }]}>
              <Text style={[styles.score, { color: getMatchScoreColors(match.compatibility_score).color }]}>
                {match.compatibility_score}%
              </Text>
            </View>
          </View>
        </View>

        {connectionStatus === 'loading' ? (
          <View style={styles.statusCard}><ActivityIndicator color="#1a5f7a" /><Text style={styles.statusInfo}>Checking buddy connection…</Text></View>
        ) : connectionStatus === 'accepted' ? (
          <TouchableOpacity style={styles.primaryButton} disabled={startingChat} onPress={() => { void handleMessage(); }} accessibilityRole="button">
            <Ionicons name="chatbubble-ellipses-outline" size={19} color="#fff" />
            <Text style={styles.primaryButtonText}>{startingChat ? 'Opening conversation…' : 'Message study buddy'}</Text>
          </TouchableOpacity>
        ) : connectionStatus === 'pending_sent' ? (
          <View style={styles.statusCard}>
            <Ionicons name="time-outline" size={20} color="#1a5f7a" />
            <Text style={styles.statusInfo}>Request sent · Waiting for response</Text>
          </View>
        ) : connectionStatus === 'pending_received' ? (
          <TouchableOpacity style={styles.primaryButton} disabled={requestBusy} onPress={() => { void handleAcceptRequest(); }} accessibilityRole="button">
            <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
            <Text style={styles.primaryButtonText}>{requestBusy ? 'Accepting…' : 'Accept buddy request'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} disabled={requestBusy} onPress={() => { void handleBuddyRequest(); }} accessibilityRole="button">
            <Ionicons name="person-add-outline" size={19} color="#fff" />
            <Text style={styles.primaryButtonText}>{requestBusy ? 'Sending…' : 'Request to be study buddies'}</Text>
          </TouchableOpacity>
        )}

        {user.profile?.bio ? (
          <View style={styles.bioCard}>
            <View style={styles.bioIcon}><Ionicons name="chatbox-ellipses-outline" size={18} color="#1a5f7a" /></View>
            <View style={styles.bioCopy}>
              <Text style={styles.bioLabel}>ABOUT</Text>
              <Text style={styles.bioText}>{user.profile.bio}</Text>
            </View>
          </View>
        ) : null}

        {user.profile ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal information</Text>
            <Detail label="Gender" value={user.profile.gender} />
            <Detail label="Marital status" value={user.profile.marital_status} />
            <Detail label="Phone number" value={user.profile.phone_number ?? 'Private'} />
            <Detail label="Address" value={user.profile.address ?? 'Private'} />
          </View>
        ) : null}

        <View style={styles.card}>
          <SectionHeading icon="school-outline" title="Academic information" />
          <Detail label="Institution" value={user.profile?.institution} />
          <Detail label="Program" value={user.profile?.program} />
          {!user.profile?.institution && !user.profile?.program ? (
            <Text style={styles.emptyText}>No academic information shared yet.</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <SectionHeading icon="sparkles-outline" title="Study preferences" />
          <Detail label="Learning style" value={user.profile?.learning_style} />
          <Detail
            label="Study mode"
            value={user.profile?.study_mode === 'in_person'
              ? 'In person'
              : user.profile?.study_mode === 'online'
                ? 'Online'
                : user.profile?.study_mode === 'either' ? 'Either' : null}
          />
          {!user.profile?.learning_style && !user.profile?.study_mode ? (
            <Text style={styles.emptyText}>No study preferences shared yet.</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <SectionHeading icon="book-outline" title="Courses" />
          <View style={styles.tagList}>
            {user.profile?.study_courses?.length ? user.profile.study_courses.map((course) => (
              <View key={course.normalized_course_code} style={styles.courseTag}>
                <Text style={styles.courseCode}>{course.course_code}</Text>
                <Text style={styles.tagDescription} numberOfLines={2}>{course.course_name}</Text>
              </View>
            )) : <Text style={styles.emptyText}>No courses added yet.</Text>}
          </View>
        </View>

        {user.profile?.academic_strengths?.length || user.profile?.academic_needs?.length ? (
          <View style={styles.card}>
            <SectionHeading icon="people-outline" title="Study match" />
            {user.profile?.academic_strengths?.length ? (
              <View style={styles.tagSection}>
                <Text style={styles.detailLabel}>Can help with</Text>
                <View style={styles.tagList}>
                  {user.profile.academic_strengths.map((strength) => (
                    <View key={strength} style={styles.strengthTag}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#15803d" />
                      <Text style={styles.strengthTagText}>{strength}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {user.profile?.academic_needs?.length ? (
              <View style={styles.tagSection}>
                <Text style={styles.detailLabel}>Would like help with</Text>
                <View style={styles.tagList}>
                  {user.profile.academic_needs.map((need) => (
                    <View key={need} style={styles.needTag}>
                      <Ionicons name="book-outline" size={14} color="#1a5f7a" />
                      <Text style={styles.needTagText}>{need}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <SectionHeading icon="sparkles-outline" title="Why you match" />
          {match.reasons.length ? match.reasons.map((reason, index) => (
            <View key={`${match.id}-${index}`} style={styles.reasonRow}>
              <Ionicons name="checkmark-circle" size={17} color="#15803d" />
              <Text style={styles.reason}>{reason}</Text>
            </View>
          )) : <Text style={styles.emptyText}>Your study profiles have several things in common.</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeading({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}><Ionicons name={icon} size={18} color="#1a5f7a" /></View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.page,
  },
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 13,
  },
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#e8f1f5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: '#0d3b4f', fontSize: 13, fontWeight: '800' },
  profileHero: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 11, padding: 18, gap: 18 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroIdentity: { flex: 1, gap: 4 },
  profileImage: { width: 72, height: 72, borderRadius: 16 },
  profileImageWrap: { width: 72, height: 72, position: 'relative' },
  profileAvatar: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: colors.teal, fontSize: 23, fontWeight: '800' },
  ratingSummary: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingSummaryText: { color: '#92400e', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 21, lineHeight: 26, fontWeight: '800', color: colors.navy },
  program: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  yearBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tealLight, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2 },
  yearBadgeText: { color: colors.teal, fontSize: 11, fontWeight: '700' },
  matchSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.page, borderRadius: 9, padding: 11 },
  matchSummaryIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  matchCopy: { flex: 1, gap: 2 },
  matchEyebrow: { color: colors.navy, fontSize: 10, letterSpacing: 0.7, fontWeight: '800' },
  matchCaption: { color: colors.muted, fontSize: 11 },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
  score: { fontSize: 16, fontWeight: '800' },
  primaryButton: { minHeight: 50, backgroundColor: '#1a5f7a', borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 14 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  statusCard: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#e8f1f5', borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12 },
  statusInfo: { color: '#1a5f7a', fontSize: 13, fontWeight: '700' },
  bioCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15 },
  bioIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center' },
  bioCopy: { flex: 1, gap: 4 },
  bioLabel: { color: '#64748b', fontSize: 10, letterSpacing: 0.7, fontWeight: '800' },
  bioText: { color: '#334155', fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 13, padding: 17, gap: 13, borderWidth: 1, borderColor: colors.border },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#0d3b4f', fontSize: 16, fontWeight: '800' },
  detailRow: { gap: 3, paddingVertical: 2 },
  detailLabel: { color: '#0d3b4f', fontSize: 12, fontWeight: '700' },
  detailValue: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  emptyText: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  courseTag: { minWidth: '46%', maxWidth: '100%', flexGrow: 1, backgroundColor: '#f4f8fa', borderRadius: 13, borderWidth: 1, borderColor: '#e5eef2', paddingHorizontal: 11, paddingVertical: 10, gap: 4 },
  courseCode: { color: '#1a5f7a', fontSize: 12, fontWeight: '800' },
  tagDescription: { color: '#64748b', fontSize: 11, lineHeight: 15 },
  tagSection: { gap: 8 },
  strengthTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  strengthTagText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  needTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  needTagText: { color: '#1e4f70', fontSize: 12, fontWeight: '700' },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reason: { flex: 1, color: '#475569', fontSize: 13, lineHeight: 20 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.page,
    padding: 24,
  },
});
