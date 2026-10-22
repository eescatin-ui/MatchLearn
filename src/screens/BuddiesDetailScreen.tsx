import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { colors } from '../theme';
import GroupAvatar from '../components/GroupAvatar';
import GroupPreferencePicker from '../components/GroupPreferencePicker';
import {
  BuddyReport,
  BuddyProfile,
  fetchBuddyReport,
  fetchBuddyProfile,
  removeBuddy,
  reportBuddy,
  updateBuddyReport,
  UserReportReason,
  withdrawBuddyReport,
} from '../services/api/buddies';
import {
  deleteGroup,
  fetchGroupDetails,
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
  GroupMember,
  GroupRecord,
  leaveGroup,
  rateGroup,
  updateGroup,
} from '../services/api/groups';
import { startDirectConversation } from '../services/api/messages';
import { fetchReviews } from '../services/api/reviews';

type DetailRoute =
  | { kind: 'buddy'; id: number; name: string }
  | { kind: 'group'; id: number; name: string };

export default function BuddiesDetailScreen({ navigation, route }: any) {
  const detailRoute = route.params as DetailRoute;
  const [buddy, setBuddy] = useState<BuddyProfile | null>(null);
  const [hasRatedBuddy, setHasRatedBuddy] = useState(false);
  const [group, setGroup] = useState<GroupRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handoffVisible, setHandoffVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<number | null>(null);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reportVisible, setReportVisible] = useState(false);
  const [buddyReport, setBuddyReport] = useState<BuddyReport | null>(null);
  const [reportReasons, setReportReasons] = useState<UserReportReason[]>([]);
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvatarIcon, setEditAvatarIcon] = useState<GroupAvatarIcon>('book-outline');
  const [editAvatarColor, setEditAvatarColor] = useState<GroupAvatarColor>('#1a5f7a');
  const [editStudyStyle, setEditStudyStyle] = useState<GroupStudyStyle>('Visual');
  const [editPreferredStudyTime, setEditPreferredStudyTime] = useState<GroupStudyTime>('Flexible');
  const [editStudyMode, setEditStudyMode] = useState<GroupStudyMode>('either');
  const isBuddy = detailRoute.kind === 'buddy';

  const loadDetails = useCallback(async (openRating = false) => {
    try {
      if (isBuddy) {
        const [nextBuddy, nextReport, buddyReviews] = await Promise.all([
          fetchBuddyProfile(detailRoute.id),
          fetchBuddyReport(detailRoute.id),
          fetchReviews(detailRoute.id),
        ]);
        setBuddy(nextBuddy);
        setBuddyReport(nextReport);
        setHasRatedBuddy(buddyReviews.myReview !== null);
      } else {
        const nextGroup = await fetchGroupDetails(detailRoute.id);
        setGroup(nextGroup);
        if (openRating) {
          setRating(nextGroup.my_rating ?? 5);
          setComment('');
          setRatingVisible(true);
        }
      }
      setLoadError(null);
    } catch (loadError) {
      setLoadError(loadError instanceof Error ? loadError.message : 'Please try again.');
      Alert.alert(
        isBuddy ? 'Could not load buddy profile' : 'Could not load group details',
        loadError instanceof Error ? loadError.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [detailRoute.id, isBuddy]);

  useFocusEffect(
    useCallback(() => {
      const openRating = route.params?.openRating === true;
      void loadDetails(openRating);
      if (openRating) navigation.setParams({ openRating: undefined });
    }, [loadDetails, navigation, route.params?.openRating])
  );

  const openMessage = async () => {
    try {
      setBusy(true);
      if (isBuddy) {
        const chat = await startDirectConversation(detailRoute.id);
        navigation.navigate('Messages', { screen: 'Chat', params: { chat } });
      } else if (group) {
        navigation.navigate('Messages', {
          screen: 'Chat',
          params: {
            chat: {
              id: group.id,
              type: 'group',
              name: group.name,
              initials: group.name.slice(0, 2).toUpperCase(),
              avatar_icon: group.avatar_icon,
              avatar_color: group.avatar_color,
              lastMessage: '',
              time: null,
              group_id: group.id,
            },
          },
        });
      }
    } catch (messageError) {
      Alert.alert('Could not open conversation', messageError instanceof Error ? messageError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const removeConnection = async (newAdminId?: number) => {
    try {
      setBusy(true);
      if (isBuddy) {
        await removeBuddy(detailRoute.id);
      } else if (group) {
        if (group.role?.toLowerCase() === 'admin' && (group.members_list?.length ?? 0) <= 1) {
          await deleteGroup(group.id);
        } else {
          await leaveGroup(group.id, newAdminId);
        }
      }
      setHandoffVisible(false);
      const deletedSoloGroup = !isBuddy
        && group?.role?.toLowerCase() === 'admin'
        && (group.members_list?.length ?? 0) <= 1;
      Alert.alert(
        'Done',
        isBuddy ? 'Study buddy removed.' : deletedSoloGroup ? 'The study group was deleted.' : 'You left the study group.'
      );
      navigation.goBack();
    } catch (removeError) {
      Alert.alert('Could not remove', removeError instanceof Error ? removeError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = () => {
    if (isBuddy) {
      Alert.alert('Remove study buddy?', `You and ${buddy?.name ?? detailRoute.name} will no longer be connected.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { void removeConnection(); } },
      ]);
      return;
    }

    if (!group) return;
    if (group.role?.toLowerCase() === 'admin') {
      const otherMembers = (group.members_list ?? []).filter((member) => member.id !== group.created_by);
      if (otherMembers.length > 0) {
        setSelectedAdmin(null);
        setHandoffVisible(true);
        return;
      }
      Alert.alert('Delete group?', 'You are the only member. Leaving will delete this group.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete group', style: 'destructive', onPress: () => { void removeConnection(); } },
      ]);
      return;
    }

    Alert.alert('Leave study group?', `You will leave ${group.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => { void removeConnection(); } },
    ]);
  };

  const submitGroupRating = async () => {
    if (!group) return;
    try {
      setBusy(true);
      await rateGroup(group.id, rating, comment.trim());
      setRatingVisible(false);
      await loadDetails();
      Alert.alert('Rating saved', 'Thank you for rating this group.');
    } catch (ratingError) {
      const message = ratingError instanceof Error ? ratingError.message : 'Please try again.';
      Alert.alert(
        message.includes('Complete at least one study session')
          ? 'Study session required'
          : 'Could not save rating',
        message
      );
    } finally {
      setBusy(false);
    }
  };

  const submitBuddyReport = async () => {
    if (!isBuddy || !reportReasons.length) {
      Alert.alert('Choose at least one issue', 'Select one or more issues before submitting your report.');
      return;
    }

    try {
      setReporting(true);
      const savedReport = buddyReport
        ? await updateBuddyReport(detailRoute.id, reportReasons, reportDetails.trim())
        : await reportBuddy(detailRoute.id, reportReasons, reportDetails.trim());
      setBuddyReport(savedReport);
      setReportVisible(false);
      Alert.alert(
        buddyReport ? 'Report updated' : 'Report submitted',
        buddyReport ? 'Your report details have been updated.' : 'Thank you. Your report has been sent for review.'
      );
    } catch (reportError) {
      Alert.alert('Could not submit report', reportError instanceof Error ? reportError.message : 'Please try again.');
    } finally {
      setReporting(false);
    }
  };

  const withdrawReport = () => {
    Alert.alert('Unreport this person?', 'Your report will be removed from the moderation queue.', [
      { text: 'Keep report', style: 'cancel' },
      {
        text: 'Unreport',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setReporting(true);
              await withdrawBuddyReport(detailRoute.id);
              setBuddyReport(null);
              setReportReasons([]);
              setReportDetails('');
              setReportVisible(false);
            } catch (reportError) {
              Alert.alert('Could not unreport', reportError instanceof Error ? reportError.message : 'Please try again.');
            } finally {
              setReporting(false);
            }
          })();
        },
      },
    ]);
  };

  const openGroupEditor = () => {
    if (!group || group.role?.toLowerCase() !== 'admin') return;
    setEditName(group.name);
    setEditCourse(group.course);
    setEditSchedule(group.schedule ?? '');
    setEditDescription(group.description ?? '');
    setEditAvatarIcon(group.avatar_icon ?? 'book-outline');
    setEditAvatarColor(group.avatar_color ?? '#1a5f7a');
    setEditStudyStyle(group.study_style ?? 'Visual');
    setEditPreferredStudyTime(group.preferred_study_time ?? 'Flexible');
    setEditStudyMode(group.study_mode ?? 'either');
    setEditVisible(true);
  };

  const saveGroupEdits = async () => {
    if (!group) return;
    if (!editName.trim() || !editCourse.trim()) {
      Alert.alert('Required fields', 'Enter a group name and course.');
      return;
    }
    try {
      setBusy(true);
      const updatedGroup = await updateGroup(group.id, {
        name: editName.trim(),
        course: editCourse.trim(),
        schedule: editSchedule.trim(),
        description: editDescription.trim(),
        avatar_icon: editAvatarIcon,
        avatar_color: editAvatarColor,
        study_style: editStudyStyle,
        preferred_study_time: editPreferredStudyTime,
        study_mode: editStudyMode,
      });
      setGroup((current) => current ? { ...current, ...updatedGroup } : updatedGroup);
      setEditVisible(false);
      Alert.alert('Group updated', 'Your changes have been saved.');
    } catch (updateError) {
      Alert.alert('Could not update group', updateError instanceof Error ? updateError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRate = () => {
    if (isBuddy) {
      navigation.navigate('Home', {
        screen: 'Reviews',
        params: {
          reviewUserId: detailRoute.id,
          reviewUserName: buddy?.name ?? detailRoute.name,
          reviewUserPhoto: buddy?.profile?.profile_photo_url ?? null,
        },
      });
    } else {
      setRating(group?.my_rating ?? 5);
      setComment('');
      setRatingVisible(true);
    }
  };

  const profile = buddy?.profile;
  const members = group?.members_list ?? [];

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color="#0d3b4f" />
          <Text style={styles.backText}>My Buddies</Text>
        </TouchableOpacity>
        <AppHeader
          title={isBuddy ? 'Buddy profile' : group?.name ?? detailRoute.name}
          subtitle={isBuddy ? 'Profile and study preferences' : 'Study group details'}
          navigation={navigation}
        />

        {loading ? <ActivityIndicator style={styles.loading} /> : isBuddy ? (
          <>
            <View style={styles.buddyHero}>
              <View style={styles.heroTopRow}>
                {profile?.profile_photo_url ? (
                  <Image
                    source={{ uri: profile.profile_photo_url }}
                    style={styles.profileImage}
                    accessibilityLabel={`${buddy?.name ?? detailRoute.name}'s profile photo`}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(buddy?.name ?? detailRoute.name).slice(0, 2).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.heroIdentity}>
                  <Text style={styles.heroName}>{buddy?.name ?? detailRoute.name}</Text>
                  <Text style={styles.heroProgram}>{profile?.program ?? 'SNSU student'}</Text>
                  <View style={styles.heroBadgeRow}>
                    {profile?.year_level ? (
                      <View style={styles.yearBadge}>
                        <Ionicons name="school-outline" size={13} color="#1a5f7a" />
                        <Text style={styles.yearBadgeText}>
                          {profile.year_level}{profile.year_level === 1 ? 'st' : profile.year_level === 2 ? 'nd' : profile.year_level === 3 ? 'rd' : 'th'} year
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.connectedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color="#15803d" />
                      <Text style={styles.connectedText}>Buddy</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View
                style={styles.ratingSummary}
                accessibilityLabel={buddy?.average_rating == null
                  ? 'No ratings yet'
                  : `Rated ${buddy.average_rating.toFixed(1)} out of 5 from ${buddy.ratings_count} ratings`}
              >
                <View style={styles.ratingStars}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Ionicons
                      key={index}
                      name={buddy?.average_rating != null && index < Math.round(buddy.average_rating) ? 'star' : 'star-outline'}
                      size={19}
                      color={buddy?.average_rating != null && index < Math.round(buddy.average_rating) ? '#d97706' : '#cbd5e1'}
                    />
                  ))}
                </View>
                <Text style={styles.ratingSummaryText}>
                  {buddy?.average_rating == null
                    ? 'No ratings yet'
                    : `${buddy.average_rating.toFixed(1)} / 5 · ${buddy.ratings_count} ${buddy.ratings_count === 1 ? 'rating' : 'ratings'}`}
                </Text>
              </View>
              {profile?.bio ? (
                <View style={styles.bioPanel}>
                  <Ionicons name="chatbox-ellipses-outline" size={17} color="#1a5f7a" />
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              ) : null}
              <View style={styles.buddyQuickActions}>
                <ActionButton
                  label={busy ? 'Working…' : 'Message'}
                  icon="chatbubble-outline"
                  onPress={() => { void openMessage(); }}
                  disabled={busy}
                  primary
                />
                <ActionButton
                  label={hasRatedBuddy ? 'Rated' : 'Rate'}
                  icon={hasRatedBuddy ? 'checkmark-circle-outline' : 'star-outline'}
                  onPress={handleRate}
                  disabled={busy}
                />
              </View>
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => {
                  setReportReasons(buddyReport?.reasons ?? []);
                  setReportDetails(buddyReport?.details ?? '');
                  setReportVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={buddyReport
                  ? `View your report for ${buddy?.name ?? detailRoute.name}`
                  : `Report ${buddy?.name ?? detailRoute.name}`}
              >
                <Ionicons
                  name={buddyReport ? 'checkmark-circle-outline' : 'flag-outline'}
                  size={14}
                  color={buddyReport ? '#15803d' : '#b42318'}
                />
                <Text style={[styles.reportButtonText, buddyReport && styles.reportedButtonText]}>
                  {buddyReport ? 'Reported' : 'Report this person'}
                </Text>
              </TouchableOpacity>
            </View>
            {profile ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Personal information</Text>
                <Detail label="Gender" value={profile.gender} />
                <Detail label="Marital status" value={profile.marital_status} />
                <Detail label="Phone number" value={profile.phone_number ?? 'Private'} />
                <Detail label="Address" value={profile.address ?? 'Private'} />
              </View>
            ) : null}
            <View style={styles.card}>
              <SectionHeading icon="school-outline" title="Academic information" />
              <Detail label="Institution" value={profile?.institution} />
              <Detail label="Department" value={profile?.department} />
              <Detail label="Program" value={profile?.program} />
              {!profile?.institution
                && !profile?.department
                && !profile?.program ? (
                <Text style={styles.body}>No academic information shared yet.</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <SectionHeading icon="sparkles-outline" title="Study preferences" />
              <Detail label="Learning style" value={profile?.learning_style} />
              <Detail label="Study mode" value={profile?.study_mode?.replace('_', ' ')} />
              {!profile?.learning_style && !profile?.study_mode ? (
                <Text style={styles.body}>No study preferences shared yet.</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <SectionHeading icon="book-outline" title="Courses" />
              {profile?.study_courses.length ? (
                <View style={styles.chipList}>
                  {profile.study_courses.map((course) => (
                    <View key={course.normalized_course_code} style={styles.courseChip}>
                      <Text style={styles.courseCode}>{course.course_code}</Text>
                      <Text style={styles.courseName} numberOfLines={2}>{course.course_name}</Text>
                    </View>
                  ))}
                </View>
              ) : <Text style={styles.body}>No courses added yet.</Text>}
            </View>

            {profile?.academic_strengths.length || profile?.academic_needs.length ? (
              <View style={styles.card}>
                <SectionHeading icon="people-outline" title="Study match" />
                {profile.academic_strengths.length ? (
                  <View style={styles.tagSection}>
                    <Text style={styles.detailLabel}>Can help with</Text>
                    <View style={styles.chipList}>
                      {profile.academic_strengths.map((item) => (
                        <View key={item} style={styles.strengthChip}>
                          <Ionicons name="checkmark-circle-outline" size={14} color="#15803d" />
                          <Text style={styles.strengthChipText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                {profile.academic_needs.length ? (
                  <View style={styles.tagSection}>
                    <Text style={styles.detailLabel}>Would like help with</Text>
                    <View style={styles.chipList}>
                      {profile.academic_needs.map((item) => (
                        <View key={item} style={styles.needChip}>
                          <Ionicons name="book-outline" size={14} color="#1a5f7a" />
                          <Text style={styles.needChipText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

          </>
        ) : group ? (
          <>
            <View style={styles.card}>
              <View style={styles.groupHeading}>
                <GroupAvatar icon={group.avatar_icon} color={group.avatar_color} size={52} />
                <View style={styles.profileCopy}>
                  <Text style={styles.cardTitle}>{group.name}</Text>
                  <Text style={styles.body}>{group.course}</Text>
                </View>
              </View>
              {group.role?.toLowerCase() === 'admin' ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={openGroupEditor}
                  accessibilityRole="button"
                  accessibilityLabel="Edit study group"
                >
                  <Ionicons name="create-outline" size={17} color="#1a5f7a" />
                  <Text style={styles.editButtonText}>Edit group</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.sectionTitle}>About this group</Text>
              <Detail label="Course" value={group.course} />
              <Detail label="Schedule" value={group.schedule} />
              <Detail label="Study style" value={group.study_style} />
              <Detail label="Preferred study time" value={group.preferred_study_time} />
              <Detail label="Study mode" value={group.study_mode?.replace('_', ' ')} />
              <Detail label="Description" value={group.description} />
              <Detail label="Created by" value={group.creator?.name} />
              <Detail label="Members" value={String(group.members ?? members.length)} />
              <Detail
                label="Rating"
                value={group.average_rating == null
                  ? 'No ratings yet'
                  : `${group.average_rating.toFixed(1)} / 5 (${group.ratings_count ?? 0})`}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Members</Text>
              {members.map((member: GroupMember) => (
                <View key={member.id} style={styles.memberRow}>
                  {member.profile_photo_url ? (
                    <Image source={{ uri: member.profile_photo_url }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
                      <Text style={styles.memberAvatarText}>{member.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.memberName}>{member.name}{member.role === 'Admin' ? ' · Admin' : ''}</Text>
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Group ratings</Text>
              {group.reviews?.length ? group.reviews.map((review) => (
                <View key={review.id} style={styles.reviewRow}>
                  <Text style={styles.reviewTitle}>{review.reviewer_name} · {'★'.repeat(review.rating)}</Text>
                  {review.comment ? <Text style={styles.body}>{review.comment}</Text> : null}
                </View>
              )) : <Text style={styles.body}>No ratings yet. Share your feedback about the group.</Text>}
            </View>
          </>
        ) : null}

        {!loading && loadError ? (
          <View style={styles.card}>
            <Text style={styles.body}>{loadError}</Text>
            <TouchableOpacity onPress={() => { setLoading(true); void loadDetails(); }}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !loadError && (isBuddy ? buddy !== null : group !== null) ? (
          isBuddy ? (
            <View style={styles.removeBuddyAction}>
              <ActionButton label="Remove study buddy" icon="person-remove-outline" onPress={confirmRemove} disabled={busy} danger />
            </View>
          ) : (
            <View style={styles.actions}>
              <ActionButton label={busy ? 'Working…' : 'Message'} icon="chatbubble-outline" onPress={() => { void openMessage(); }} disabled={busy} />
              <ActionButton label="Rate" icon="star-outline" onPress={handleRate} disabled={busy} />
              <ActionButton
                label={group?.role?.toLowerCase() === 'admin' && members.length <= 1 ? 'Delete' : 'Leave'}
                icon={group?.role?.toLowerCase() === 'admin' && members.length <= 1 ? 'trash-outline' : 'exit-outline'}
                onPress={confirmRemove}
                disabled={busy}
                danger
              />
            </View>
          )
        ) : null}
      </ScrollView>

      <Modal visible={handoffVisible} transparent animationType="slide" onRequestClose={() => setHandoffVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose the new group admin</Text>
            <ScrollView style={styles.memberOptions}>
              {members.filter((member) => member.id !== group?.created_by).map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.memberOption, selectedAdmin === member.id && styles.memberOptionSelected]}
                  onPress={() => setSelectedAdmin(member.id)}
                >
                  <Text style={styles.cardTitle}>{member.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.primaryButton, (!selectedAdmin || busy) && styles.disabled]}
              disabled={!selectedAdmin || busy}
              onPress={() => { if (selectedAdmin) void removeConnection(selectedAdmin); }}
            >
              <Text style={styles.primaryButtonText}>{busy ? 'Transferring…' : 'Transfer admin and leave'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setHandoffVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={ratingVisible} transparent animationType="slide" onRequestClose={() => setRatingVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate {group?.name}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity key={value} onPress={() => setRating(value)}>
                  <Text style={[styles.star, value <= rating && styles.starSelected]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Optional feedback about the group"
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={() => { void submitGroupRating(); }}>
              <Text style={styles.primaryButtonText}>{busy ? 'Saving…' : 'Save rating'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRatingVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <View style={styles.reportModalHeading}>
                <View style={styles.reportModalIcon}>
                  <Ionicons name="flag-outline" size={20} color="#b42318" />
                </View>
                <View style={styles.reportModalCopy}>
                  <Text style={styles.modalTitle}>{buddyReport ? 'Your report' : 'Report this person'}</Text>
                  <Text style={styles.body}>
                    {buddyReport ? 'Review or update the issues and details you reported.' : 'Your report will be sent privately for review.'}
                  </Text>
                </View>
              </View>
              <Text style={styles.reportFieldLabel}>What is the issue?</Text>
              {([
                ['harassment', 'Harassment or bullying'],
                ['inappropriate_content', 'Inappropriate content'],
                ['fake_profile', 'Fake or misleading profile'],
                ['privacy_or_safety', 'Privacy or safety concern'],
                ['other', 'Other'],
              ] as [UserReportReason, string][]).map(([reason, label]) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reportReason, reportReasons.includes(reason) && styles.reportReasonSelected]}
                  onPress={() => setReportReasons((current) => (
                    current.includes(reason)
                      ? current.filter((item) => item !== reason)
                      : [...current, reason]
                  ))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: reportReasons.includes(reason) }}
                >
                  <Text style={[styles.reportReasonText, reportReasons.includes(reason) && styles.reportReasonTextSelected]}>
                    {label}
                  </Text>
                  <Ionicons
                    name={reportReasons.includes(reason) ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={reportReasons.includes(reason) ? '#1a5f7a' : '#94a3b8'}
                  />
                </TouchableOpacity>
              ))}
              <Text style={styles.reportFieldLabel}>Additional details (optional)</Text>
              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Share any details that may help us review this report"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                multiline
                maxLength={2000}
                accessibilityLabel="Additional report details"
              />
              <Text style={styles.characterCount}>{reportDetails.length} / 2000</Text>
              <TouchableOpacity
                style={[styles.reportSubmit, (reporting || !reportReasons.length) && styles.disabled]}
                disabled={reporting || !reportReasons.length}
                onPress={() => { void submitBuddyReport(); }}
                accessibilityRole="button"
              >
                <Text style={styles.reportSubmitText}>
                  {reporting ? 'Saving…' : buddyReport ? 'Save changes' : 'Submit report'}
                </Text>
              </TouchableOpacity>
              {buddyReport ? (
                <TouchableOpacity
                  style={[styles.unreportButton, reporting && styles.disabled]}
                  onPress={withdrawReport}
                  disabled={reporting}
                  accessibilityRole="button"
                >
                  <Text style={styles.unreportButtonText}>Unreport</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => setReportVisible(false)} disabled={reporting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit study group</Text>
            <ScrollView
              style={styles.editFieldsScroll}
              contentContainerStyle={styles.editFields}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.avatarPreview}>
                <GroupAvatar icon={editAvatarIcon} color={editAvatarColor} size={54} />
                <Text style={styles.body}>Choose the icon for your SNSU department</Text>
              </View>
              <View style={styles.avatarOptions}>
                {GROUP_AVATAR_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.icon}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label} group icon`}
                    accessibilityState={{ selected: editAvatarIcon === option.icon }}
                    style={[styles.iconOption, editAvatarIcon === option.icon && styles.selectedOption]}
                    onPress={() => setEditAvatarIcon(option.icon)}
                  >
                    <Ionicons name={option.icon} size={21} color={editAvatarIcon === option.icon ? '#0d3b4f' : '#64748b'} />
                    <Text style={[styles.iconOptionLabel, editAvatarIcon === option.icon && styles.iconOptionLabelSelected]}>
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
                    accessibilityState={{ selected: editAvatarColor === color }}
                    style={[styles.colorOption, { backgroundColor: color }, editAvatarColor === color && styles.selectedColor]}
                    onPress={() => setEditAvatarColor(color)}
                  />
                ))}
              </View>
              <TextInput value={editName} onChangeText={setEditName} placeholder="Group name" style={styles.input} maxLength={255} />
              <TextInput value={editCourse} onChangeText={setEditCourse} placeholder="Course" style={styles.input} maxLength={255} />
              <GroupPreferencePicker
                label="Study style"
                options={GROUP_STUDY_STYLE_OPTIONS}
                value={editStudyStyle}
                onChange={setEditStudyStyle}
              />
              <GroupPreferencePicker
                label="Preferred study time"
                options={GROUP_STUDY_TIME_OPTIONS}
                value={editPreferredStudyTime}
                onChange={setEditPreferredStudyTime}
              />
              <GroupPreferencePicker
                label="Study mode"
                options={GROUP_STUDY_MODE_OPTIONS}
                value={editStudyMode}
                onChange={setEditStudyMode}
              />
              <TextInput value={editSchedule} onChangeText={setEditSchedule} placeholder="Schedule (optional)" style={styles.input} maxLength={255} />
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description (optional)"
                style={[styles.input, styles.descriptionInput]}
                multiline
              />
            </ScrollView>
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.disabled]}
                onPress={() => { void saveGroupEdits(); }}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>{busy ? 'Saving…' : 'Save changes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditVisible(false)} disabled={busy}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={18} color="#1a5f7a" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
  danger,
  primary,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, primary && styles.primaryActionButton, danger && styles.dangerButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={18} color={danger ? '#b42318' : primary ? '#fff' : '#1a5f7a'} />
      <Text style={[styles.actionText, primary && styles.primaryActionText, danger && styles.dangerText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.page },
  content: { flex: 1, backgroundColor: colors.page },
  contentInner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  backText: { color: '#0d3b4f', fontWeight: '700', marginLeft: 2 },
  loading: { marginTop: 32 },
  card: { backgroundColor: colors.surface, borderRadius: 13, padding: 17, marginBottom: 12, gap: 13, borderWidth: 1, borderColor: colors.border },
  buddyHero: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 11, padding: 18, marginBottom: 12, gap: 16 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 15 },
  profileImage: { width: 72, height: 72, borderRadius: 16 },
  avatar: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.teal, fontSize: 23, fontWeight: '800' },
  ratingSummary: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingSummaryText: { color: '#92400e', fontSize: 12, fontWeight: '700' },
  heroIdentity: { flex: 1, minWidth: 0, gap: 5 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  heroName: { color: colors.navy, fontSize: 21, lineHeight: 26, fontWeight: '800', flexShrink: 1 },
  heroProgram: { color: colors.muted, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  yearBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tealLight, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2 },
  yearBadgeText: { color: colors.teal, fontSize: 11, fontWeight: '700' },
  connectedBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, marginTop: 1 },
  connectedText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  bioPanel: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.page, borderRadius: 8, padding: 12 },
  bioText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 20 },
  buddyQuickActions: { flexDirection: 'row', gap: 9, marginTop: 1 },
  reportButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
  },
  reportButtonText: { color: '#b42318', fontSize: 12, fontWeight: '700' },
  reportedButtonText: { color: '#15803d' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 1 },
  sectionIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center' },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  courseChip: { minWidth: '46%', maxWidth: '100%', flexGrow: 1, backgroundColor: '#f4f8fa', borderRadius: 13, borderWidth: 1, borderColor: '#e5eef2', paddingHorizontal: 11, paddingVertical: 10, gap: 4 },
  courseCode: { color: '#1a5f7a', fontSize: 12, fontWeight: '800' },
  courseName: { color: '#64748b', fontSize: 11, lineHeight: 15 },
  tagSection: { gap: 8 },
  strengthChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  strengthChipText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  needChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  needChipText: { color: '#1e4f70', fontSize: 12, fontWeight: '700' },
  profileCopy: { flex: 1, gap: 4 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  editButton: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: '#e8f1f5', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  editButtonText: { color: '#1a5f7a', fontSize: 12, fontWeight: '800' },
  cardTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: '#0d3b4f', fontSize: 17, fontWeight: '800' },
  detailRow: { gap: 3, paddingVertical: 3 },
  detailLabel: { color: '#0d3b4f', fontWeight: '700', fontSize: 12 },
  body: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 9 },
  memberAvatar: { width: 34, height: 34, borderRadius: 12 },
  memberAvatarFallback: { backgroundColor: '#1a5f7a', alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  memberName: { color: '#334155', flex: 1 },
  reviewRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 9, gap: 4 },
  reviewTitle: { color: '#0d3b4f', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  actionButton: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#e8f1f5', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  primaryActionButton: { backgroundColor: '#1a5f7a' },
  primaryActionText: { color: '#fff' },
  dangerButton: { backgroundColor: '#fff1f0' },
  actionText: { color: '#1a5f7a', fontSize: 12, fontWeight: '800' },
  dangerText: { color: '#b42318' },
  removeBuddyAction: { marginTop: 2, marginBottom: 10 },
  disabled: { opacity: 0.55 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12, maxHeight: '90%' },
  editModalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  editFieldsScroll: { flexShrink: 1 },
  editFields: { gap: 12, paddingBottom: 2 },
  editModalActions: { gap: 4, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  avatarPreview: { alignItems: 'center', gap: 6, paddingVertical: 2 },
  avatarOptions: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10 },
  iconOption: { width: '30%', minHeight: 58, paddingHorizontal: 3, paddingVertical: 5, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 2, borderColor: 'transparent' },
  iconOptionLabel: { color: '#64748b', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  iconOptionLabelSelected: { color: '#0d3b4f' },
  selectedOption: { borderColor: '#1a5f7a', backgroundColor: '#eaf4f7' },
  colorOption: { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: '#fff' },
  selectedColor: { borderColor: '#0d3b4f' },
  modalTitle: { color: '#0d3b4f', fontSize: 20, fontWeight: '800' },
  reportModalHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportModalIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff1f0', alignItems: 'center', justifyContent: 'center' },
  reportModalCopy: { flex: 1, gap: 3 },
  reportFieldLabel: { color: '#334155', fontSize: 13, fontWeight: '800', marginTop: 2 },
  reportReason: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  reportReasonSelected: { borderColor: '#1a5f7a', backgroundColor: '#eff7fa' },
  reportReasonText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  reportReasonTextSelected: { color: '#0d3b4f', fontWeight: '800' },
  characterCount: { color: '#94a3b8', fontSize: 11, textAlign: 'right', marginTop: -8 },
  reportSubmit: { backgroundColor: '#b42318', borderRadius: 12, padding: 13, alignItems: 'center' },
  reportSubmitText: { color: '#fff', fontWeight: '800' },
  unreportButton: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, alignItems: 'center' },
  unreportButtonText: { color: '#b42318', fontWeight: '800' },
  memberOptions: { maxHeight: 280 },
  memberOption: { borderWidth: 1, borderColor: '#dbe3eb', borderRadius: 12, padding: 12 },
  memberOptionSelected: { borderColor: '#1a5f7a', backgroundColor: '#eaf4f8' },
  primaryButton: { backgroundColor: '#1a5f7a', borderRadius: 12, padding: 13, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  cancelText: { textAlign: 'center', color: '#475569', fontWeight: '700', padding: 8 },
  retryText: { color: '#1a5f7a', fontWeight: '700', paddingVertical: 8 },
  stars: { flexDirection: 'row', gap: 10 },
  star: { fontSize: 34, color: '#cbd5e1' },
  starSelected: { color: '#f59e0b' },
  input: { minHeight: 80, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe3eb', borderRadius: 10, padding: 12, textAlignVertical: 'top' },
  descriptionInput: { minHeight: 64 },
});
