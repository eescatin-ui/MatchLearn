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
import { BuddyUserSummary, fetchBuddyConnections } from '../services/api/buddies';
import { fetchGroups, GroupRecord } from '../services/api/groups';
import {
  createStudySession,
  deleteStudySession,
  fetchStudySessions,
  StudySessionRecord,
  updateStudySessionDetails,
  updateStudySessionStatus,
} from '../services/api/schedule';
import AppHeader from '../components/AppHeader';
import GroupAvatar from '../components/GroupAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

type DateTimePickerTarget = 'startDate' | 'startTime' | 'endDate' | 'endTime';
type SessionViewMode = 'list' | 'calendar';

function SessionTargetAvatar({ session, size = 36 }: { session: StudySessionRecord; size?: number }) {
  if (session.target_type === 'group') {
    return (
      <GroupAvatar
        icon={session.group_avatar_icon ?? undefined}
        color={session.group_avatar_color ?? undefined}
        size={size}
      />
    );
  }

  if (session.other_user_profile_photo_url) {
    return (
      <Image
        source={{ uri: session.other_user_profile_photo_url }}
        style={[styles.sessionTargetAvatar, { width: size, height: size, borderRadius: size * 0.32 }]}
        accessibilityLabel={`${session.other_user_name}'s profile photo`}
      />
    );
  }

  return (
    <View style={[styles.sessionTargetAvatar, styles.sessionTargetFallback, { width: size, height: size, borderRadius: size * 0.32 }]}>
      <Text style={styles.sessionTargetInitials}>{session.other_user_name.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

const getLocalDateKey = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const getDefaultStartTime = () => {
  const date = new Date();
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 30) * 30, 0, 0);
  return date;
};

const formatDate = (date: Date) => date.toLocaleDateString(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const formatTime = (date: Date) => date.toLocaleTimeString(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const setDatePart = (current: Date, selected: Date) => {
  const next = new Date(current);
  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return next;
};

const setTimePart = (current: Date, selected: Date) => {
  const next = new Date(current);
  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
};

const sessionStatusOrder: Record<StudySessionRecord['status'], number> = {
  confirmed: 0,
  pending: 1,
  completed: 2,
  cancelled: 4,
  declined: 5,
};

const sortSessions = (sessions: StudySessionRecord[]) => [...sessions].sort((a, b) => (
  (a.is_past ? 3 : sessionStatusOrder[a.status]) - (b.is_past ? 3 : sessionStatusOrder[b.status])
  || a.starts_at.localeCompare(b.starts_at)
  || a.id - b.id
));

export default function ScheduleScreen({ navigation }: any) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySessionRecord[]>([]);
  const [buddies, setBuddies] = useState<BuddyUserSummary[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SessionViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySessionRecord | null>(null);
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [openPicker, setOpenPicker] = useState<'buddy' | 'group' | null>(null);
  const [topic, setTopic] = useState('');
  const [startsAt, setStartsAt] = useState(getDefaultStartTime);
  const [endsAt, setEndsAt] = useState(() => {
    const end = getDefaultStartTime();
    end.setHours(end.getHours() + 1);
    return end;
  });
  const [dateTimePickerTarget, setDateTimePickerTarget] = useState<DateTimePickerTarget | null>(null);
  const [dateTimeDraft, setDateTimeDraft] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextSessions, connections, nextGroups] = await Promise.all([
        fetchStudySessions(),
        fetchBuddyConnections(),
        fetchGroups(),
      ]);
      setSessions(sortSessions(nextSessions));
      setBuddies(connections.buddies);
      setGroups(nextGroups);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load study sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const openDateTimePicker = (target: DateTimePickerTarget) => {
    const current = target.startsWith('start') ? startsAt : endsAt;
    setDateTimeDraft(new Date(current));
    setDateTimePickerTarget(target);
  };

  const commitDateTimePicker = () => {
    if (!dateTimeDraft || !dateTimePickerTarget) return;
    if (dateTimePickerTarget === 'startDate') {
      setStartsAt((current) => setDatePart(current, dateTimeDraft));
      setEndsAt((current) => setDatePart(current, dateTimeDraft));
    }
    if (dateTimePickerTarget === 'startTime') setStartsAt((current) => setTimePart(current, dateTimeDraft));
    if (dateTimePickerTarget === 'endDate') setEndsAt((current) => setDatePart(current, dateTimeDraft));
    if (dateTimePickerTarget === 'endTime') setEndsAt((current) => setTimePart(current, dateTimeDraft));
    setDateTimePickerTarget(null);
    setDateTimeDraft(null);
  };

  const openCreateForm = () => {
    setEditingSession(null);
    setParticipantId(null);
    setGroupId(null);
    setTopic('');
    const nextStart = getDefaultStartTime();
    setStartsAt(nextStart);
    const nextEnd = new Date(nextStart);
    nextEnd.setHours(nextEnd.getHours() + 1);
    setEndsAt(nextEnd);
    setLocation('');
    setShowCreate(true);
  };

  const openEditForm = (session: StudySessionRecord) => {
    setEditingSession(session);
    setTopic(session.topic);
    setStartsAt(new Date(session.starts_at));
    setEndsAt(session.ends_at ? new Date(session.ends_at) : new Date(new Date(session.starts_at).getTime() + 60 * 60 * 1000));
    setLocation(session.location);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if ((!editingSession && (!participantId && !groupId || participantId && groupId)) || !topic.trim() || !location.trim()) {
      Alert.alert('Required fields', 'Choose one paired buddy or one joined group, then enter the topic and location.');
      return;
    }
    if (startsAt.getTime() <= Date.now()) {
      Alert.alert('Invalid start time', 'Choose a start date and time in the future.');
      return;
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      Alert.alert('Invalid end time', 'The end date and time must be after the start.');
      return;
    }
    try {
      setSaving(true);
      const session = editingSession
        ? await updateStudySessionDetails(editingSession.id, {
            topic: topic.trim(),
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            location: location.trim(),
          })
        : await createStudySession({
            ...(participantId !== null
              ? { participant_user_id: participantId }
              : groupId !== null ? { study_group_id: groupId } : {}),
            topic: topic.trim(),
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            location: location.trim(),
          });
      setSessions((current) => sortSessions([
        ...current.filter((item) => item.id !== session.id),
        session,
      ]));
      setShowCreate(false);
      setEditingSession(null);
      setTopic('');
      setStartsAt(getDefaultStartTime());
      const nextEnd = getDefaultStartTime();
      nextEnd.setHours(nextEnd.getHours() + 1);
      setEndsAt(nextEnd);
      setLocation('');
      setParticipantId(null);
      setGroupId(null);
      setOpenPicker(null);
      setDateTimePickerTarget(null);
      setDateTimeDraft(null);
      Alert.alert(
        editingSession ? (editingSession.status === 'completed' ? 'Session rescheduled' : 'Session updated') : 'Invitation sent',
        editingSession
          ? editingSession.status === 'completed'
            ? 'Your completed session has been rescheduled and is on going again.'
            : 'Your study session details have been updated.'
          : groupId ? 'Members of your joined group can confirm or decline the session.' : 'Your study buddy can confirm or decline the session.'
      );
    } catch (createError) {
      Alert.alert(
        editingSession ? 'Could not edit session' : 'Could not schedule session',
        createError instanceof Error ? createError.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (session: StudySessionRecord, status: StudySessionRecord['status']) => {
    try {
      const updated = await updateStudySessionStatus(session.id, status);
      setSessions((current) => sortSessions(
        current.map((item) => item.id === updated.id ? updated : item)
      ));
    } catch (updateError) {
      Alert.alert('Could not update session', updateError instanceof Error ? updateError.message : 'Please try again.');
    }
  };

  const cancelSession = (session: StudySessionRecord) => {
    Alert.alert('Cancel study session?', `Cancel "${session.topic}"?`, [
      { text: 'Keep session', style: 'cancel' },
      { text: 'Cancel session', style: 'destructive', onPress: () => { void updateStatus(session, 'cancelled'); } },
    ]);
  };

  const removeCompletedSession = (session: StudySessionRecord) => {
    Alert.alert('Delete completed session?', `Permanently delete "${session.topic}" and its reviews?`, [
      { text: 'Keep session', style: 'cancel' },
      {
        text: 'Delete session',
        style: 'destructive',
        onPress: () => {
          void deleteStudySession(session.id)
            .then(() => setSessions((current) => current.filter((item) => item.id !== session.id)))
            .catch((deleteError: unknown) => {
              Alert.alert('Could not delete session', deleteError instanceof Error ? deleteError.message : 'Please try again.');
            });
        },
      },
    ]);
  };

  const ongoingCount = sessions.filter((session) => session.status === 'confirmed' && !session.is_past).length;
  const pendingCount = sessions.filter((session) => session.status === 'pending' && !session.is_past).length;
  const completedCount = sessions.filter((session) => session.status === 'completed').length;
  const selectedDateKey = getLocalDateKey(selectedCalendarDate);
  const sessionsForSelectedDate = sessions.filter(
    (session) => getLocalDateKey(new Date(session.starts_at)) === selectedDateKey
  );

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <AppHeader title="Study Sessions" subtitle="Plan and track sessions with matched buddies" navigation={navigation} />
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>LEARN TOGETHER</Text>
            <Text style={styles.heroTitle}>Make your next study session count.</Text>
            <Text style={styles.heroSubtitle}>Plan a focused session with a buddy or group.</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={openCreateForm}
            accessibilityRole="button"
            accessibilityLabel="Create study session"
          >
            <Ionicons name="add" size={21} color="#0d3b4f" />
            <Text style={styles.createButtonText}>Create session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard icon="flash-outline" label="On going" value={ongoingCount} tint="green" />
          <SummaryCard icon="time-outline" label="Pending" value={pendingCount} tint="amber" />
          <SummaryCard icon="checkmark-done-outline" label="Completed" value={completedCount} tint="purple" />
        </View>

        <View style={styles.listHeading}>
          <View>
            <Text style={styles.listTitle}>{viewMode === 'calendar' ? 'Schedule calendar' : 'Your sessions'}</Text>
            <Text style={styles.listCount}>
              {viewMode === 'calendar' ? 'Choose a date to see its sessions' : `${sessions.length} total`}
            </Text>
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('list')}
              accessibilityRole="button"
              accessibilityLabel="List view"
            >
              <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? '#fff' : '#64748b'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'calendar' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('calendar')}
              accessibilityRole="button"
              accessibilityLabel="Calendar view"
            >
              <Ionicons name="calendar-outline" size={18} color={viewMode === 'calendar' ? '#fff' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? <ActivityIndicator style={styles.loading} /> : error ? (
          <View style={styles.empty}><Text style={styles.body}>{error}</Text><TouchableOpacity onPress={() => { setLoading(true); void load(); }}><Text style={styles.link}>Try again</Text></TouchableOpacity></View>
        ) : viewMode === 'calendar' ? (
          <>
            <ScheduleCalendar
              month={calendarMonth}
              selectedDate={selectedCalendarDate}
              sessions={sessions}
              onChangeMonth={setCalendarMonth}
              onSelectDate={setSelectedCalendarDate}
            />
            <View style={styles.agendaHeading}>
              <View>
                <Text style={styles.listTitle}>
                  {selectedCalendarDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.listCount}>
                  {sessionsForSelectedDate.length === 0
                    ? 'No sessions scheduled'
                    : `${sessionsForSelectedDate.length} session${sessionsForSelectedDate.length === 1 ? '' : 's'}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const today = new Date();
                  setSelectedCalendarDate(today);
                  setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </View>
            {sessionsForSelectedDate.length ? (
              <View style={styles.agendaList}>
                {sessionsForSelectedDate.map((session, index) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.agendaCard, index === sessionsForSelectedDate.length - 1 && styles.agendaCardLast]}
                    onPress={() => setViewMode('list')}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${session.topic} in the session list`}
                  >
                    <View style={[styles.agendaAccent, session.status === 'confirmed' ? styles.agendaAccentGreen : session.status === 'pending' ? styles.agendaAccentAmber : styles.agendaAccentPurple]} />
                    <View style={styles.agendaCardContent}>
                      <View style={styles.agendaTimeRow}>
                        <Text style={styles.agendaTime}>
                          {new Date(session.starts_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </Text>
                        <Text style={styles.agendaStatus}>
                          {session.is_past ? 'Past' : session.status === 'confirmed' ? 'On going' : session.status}
                        </Text>
                      </View>
                      <Text style={styles.cardTitle}>{session.topic}</Text>
                      <View style={styles.detailLine}>
                        <SessionTargetAvatar session={session} size={30} />
                        <Text style={styles.detailText} numberOfLines={1}>
                        {session.target_type === 'group' ? session.other_user_name : `With ${session.other_user_name}`}
                        </Text>
                      </View>
                      <View style={styles.detailLine}>
                        <Ionicons name="location-outline" size={14} color="#64748b" />
                        <Text style={styles.detailText} numberOfLines={1}>{session.location}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyAgenda}>
                <Ionicons name="calendar-clear-outline" size={22} color="#94a3b8" />
                <Text style={styles.body}>Nothing scheduled for this date.</Text>
              </View>
            )}
          </>
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-clear-outline" size={25} color="#1a5f7a" /></View>
            <Text style={styles.cardTitle}>No study sessions yet</Text>
            <Text style={styles.body}>Create a session with a study buddy or group to get started.</Text>
          </View>
        ) : (
          <View style={styles.sessionList}>
            {sessions.map((session, index) => {
          const isCreator = session.host_user_id === user?.id;
          const startDate = new Date(session.starts_at);
          return (
            <View key={session.id} style={[styles.card, index === sessions.length - 1 && styles.cardLast]}>
              <View style={styles.sessionMain}>
                <View style={styles.dateTile}>
                  <Text style={styles.dateMonth}>{startDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
                  <Text style={styles.dateDay}>{startDate.getDate()}</Text>
                  <Text style={styles.dateWeekday}>{startDate.toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{session.topic}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        session.status === 'confirmed' && styles.confirmedStatusBadge,
                        session.status === 'pending' && styles.pendingStatusBadge,
                        session.status === 'declined' && styles.declinedStatusBadge,
                        session.status === 'completed' && styles.completedStatusBadge,
                        session.status === 'cancelled' && styles.cancelledStatusBadge,
                        session.is_past && styles.pastStatusBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          session.status === 'confirmed' && styles.confirmedStatusText,
                          session.status === 'pending' && styles.pendingStatusText,
                          session.status === 'declined' && styles.declinedStatusText,
                          session.status === 'completed' && styles.completedStatusText,
                          session.status === 'cancelled' && styles.cancelledStatusText,
                          session.is_past && styles.pastStatusText,
                        ]}
                      >
                        {session.is_past ? 'Past' : session.status === 'confirmed' ? 'On going' : session.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailLine}>
                    <SessionTargetAvatar session={session} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {session.target_type === 'group' ? session.other_user_name : `With ${session.other_user_name}`}
                    </Text>
                  </View>
                  <View style={styles.detailLine}>
                    <Ionicons name="time-outline" size={15} color="#64748b" />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {session.ends_at ? ` – ${new Date(session.ends_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.locationLine}>
                <Ionicons name="location-outline" size={15} color="#64748b" />
                <Text style={styles.detailText} numberOfLines={2}>{session.location}</Text>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.actions}>
                {session.status === 'pending' && !session.is_past && !isCreator && (
                  <>
                    <SessionAction icon="checkmark" label="Confirm" kind="primary" onPress={() => { void updateStatus(session, 'confirmed'); }} />
                    <SessionAction icon="close" label="Decline" kind="danger" onPress={() => { void updateStatus(session, 'declined'); }} />
                  </>
                )}
                {isCreator && !session.is_past && ['pending', 'confirmed'].includes(session.status) && (
                  <>
                    <SessionAction icon="create-outline" label="Edit" kind="neutral" onPress={() => openEditForm(session)} />
                    <SessionAction icon="close-circle-outline" label="Cancel" kind="danger" onPress={() => cancelSession(session)} />
                  </>
                )}
                {session.status === 'completed' && isCreator && (
                  <>
                    <SessionAction icon="calendar-outline" label="Reschedule" kind="primary" onPress={() => openEditForm(session)} />
                    <SessionAction icon="trash-outline" label="Delete" kind="danger" onPress={() => removeCompletedSession(session)} />
                  </>
                )}
                {session.status === 'completed' && session.target_type === 'buddy' && session.participant_user_id !== null && (
                  <SessionAction
                    icon="star-outline"
                    label="Rate buddy"
                    kind="neutral"
                    onPress={() => navigation.navigate('Home', {
                      screen: 'Reviews',
                      params: {
                        reviewUserId: isCreator ? session.participant_user_id : session.host_user_id,
                        reviewUserName: session.other_user_name,
                        reviewUserPhoto: session.other_user_profile_photo_url,
                      },
                    })}
                  />
                )}
                {session.status === 'completed' && session.target_type === 'group' && session.study_group_id !== null && (
                  <SessionAction
                    icon="star-outline"
                    label="Rate group"
                    kind="neutral"
                    onPress={() => navigation.navigate('Buddies', {
                      screen: 'BuddyGroupDetail',
                      params: {
                        kind: 'group',
                        id: session.study_group_id,
                        name: session.other_user_name,
                        openRating: true,
                      },
                    })}
                  />
                )}
                {session.status === 'confirmed' && session.is_past && isCreator && (
                  <SessionAction icon="checkmark-done-outline" label="Mark completed" kind="primary" onPress={() => { void updateStatus(session, 'completed'); }} />
                )}
                {!isCreator && session.status !== 'pending' && session.status !== 'completed' ? (
                  <Text style={styles.noActionsText}>Session {session.status}</Text>
                ) : null}
              </View>
            </View>
          );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalCard}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>
              {editingSession?.status === 'completed' ? 'Reschedule study session' : editingSession ? 'Edit study session' : 'Create study session'}
            </Text>
            {!editingSession ? (
            <>
            <Text style={styles.label}>Paired study buddy</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setOpenPicker(openPicker === 'buddy' ? null : 'buddy')}
            >
              <Text style={participantId ? styles.selectText : styles.selectPlaceholder}>
                {buddies.find((buddy) => buddy.id === participantId)?.name ?? 'Select a paired buddy'}
              </Text>
              <Text style={styles.selectArrow}>▾</Text>
            </TouchableOpacity>
            {openPicker === 'buddy' ? (
              <ScrollView style={styles.optionsList} nestedScrollEnabled>
                {buddies.map((buddy) => (
                  <TouchableOpacity
                    key={buddy.id}
                    style={[styles.option, participantId === buddy.id && styles.selectedOption]}
                    onPress={() => {
                      setParticipantId(buddy.id);
                      setGroupId(null);
                      setOpenPicker(null);
                    }}
                  >
                    <Text style={styles.cardTitle}>{buddy.name}</Text>
                  </TouchableOpacity>
                ))}
                {buddies.length === 0 ? <Text style={styles.body}>You do not have paired buddies yet.</Text> : null}
              </ScrollView>
            ) : null}
            <Text style={styles.label}>Or invite a joined group</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setOpenPicker(openPicker === 'group' ? null : 'group')}
            >
              <Text style={groupId ? styles.selectText : styles.selectPlaceholder}>
                {groups.find((group) => group.id === groupId)?.name ?? 'Select a joined group'}
              </Text>
              <Text style={styles.selectArrow}>▾</Text>
            </TouchableOpacity>
            {openPicker === 'group' ? (
              <ScrollView style={styles.optionsList} nestedScrollEnabled>
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.option, groupId === group.id && styles.selectedOption]}
                    onPress={() => {
                      setGroupId(group.id);
                      setParticipantId(null);
                      setOpenPicker(null);
                    }}
                  >
                    <Text style={styles.cardTitle}>{group.name}</Text>
                    <Text style={styles.body}>{group.course} · {group.members ?? 0} members</Text>
                  </TouchableOpacity>
                ))}
                {groups.length === 0 ? <Text style={styles.body}>You have not joined any groups yet.</Text> : null}
              </ScrollView>
            ) : null}
            </>
            ) : null}

            <TextInput value={topic} onChangeText={setTopic} placeholder="Session topic" style={styles.input} />
            <Text style={styles.label}>Starts</Text>
            <View style={styles.dateTimeRow}>
              <DateTimeButton icon="calendar-outline" label={formatDate(startsAt)} onPress={() => openDateTimePicker('startDate')} />
              <DateTimeButton icon="time-outline" label={formatTime(startsAt)} onPress={() => openDateTimePicker('startTime')} />
            </View>
            <Text style={styles.label}>Ends</Text>
            <View style={styles.dateTimeRow}>
              <DateTimeButton icon="calendar-outline" label={formatDate(endsAt)} onPress={() => openDateTimePicker('endDate')} />
              <DateTimeButton icon="time-outline" label={formatTime(endsAt)} onPress={() => openDateTimePicker('endTime')} />
            </View>
            {dateTimePickerTarget && dateTimeDraft ? (
              <View style={styles.dateTimePicker}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.cardTitle}>
                    {dateTimePickerTarget.endsWith('Date') ? 'Choose date' : 'Choose time'}
                  </Text>
                  <TouchableOpacity onPress={() => { setDateTimePickerTarget(null); setDateTimeDraft(null); }}>
                    <Text style={styles.link}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                {dateTimePickerTarget.endsWith('Date') ? (
                  <CalendarPicker date={dateTimeDraft} onChange={setDateTimeDraft} />
                ) : (
                  <ClockPicker date={dateTimeDraft} onChange={setDateTimeDraft} />
                )}
                <TouchableOpacity style={styles.primaryButton} onPress={commitDateTimePicker}>
                  <Text style={styles.primaryText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TextInput value={location} onChangeText={setLocation} placeholder="Location" style={styles.input} />
            <TouchableOpacity style={[styles.primaryButton, saving && styles.disabled]} disabled={saving} onPress={() => { void handleCreate(); }}>
              <Text style={styles.primaryText}>{saving ? editingSession ? 'Saving…' : 'Sending…' : editingSession ? 'Save changes' : 'Send invitation'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowCreate(false); setEditingSession(null); }}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
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
  contentInner: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#0d3b4f' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 16 },
  primaryButton: { backgroundColor: '#1a5f7a', borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 14 },
  primaryText: { color: '#fff', fontWeight: '700' },
  heroCard: {
    borderRadius: 11,
    backgroundColor: colors.heroSurface,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.heroBorder,
  },
  heroCopy: { marginBottom: 16 },
  heroEyebrow: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 7 },
  heroTitle: { color: colors.navy, fontSize: 20, lineHeight: 26, fontWeight: '800', maxWidth: 280 },
  heroSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  createButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  summaryCard: {
    flex: 1,
    minHeight: 82,
    padding: 11,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  summaryIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  summaryGreen: { backgroundColor: '#dcfce7' },
  summaryAmber: { backgroundColor: '#fef3c7' },
  summaryPurple: { backgroundColor: '#f3e8ff' },
  summaryValue: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  summaryLabel: { color: '#64748b', fontSize: 10, fontWeight: '600', marginTop: 2 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  listTitle: { color: '#0d3b4f', fontSize: 18, fontWeight: '800' },
  listCount: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  viewToggle: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: '#e8edf2', gap: 3 },
  viewToggleButton: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  viewToggleButtonActive: { backgroundColor: '#1a5f7a' },
  calendarCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: colors.border },
  scheduleCalendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calendarMonthTitle: { color: '#0d3b4f', fontSize: 16, fontWeight: '800' },
  monthArrow: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f6f8' },
  scheduleCalendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  scheduleCalendarWeekday: { width: '14.2857%', textAlign: 'center', color: '#94a3b8', fontSize: 10, fontWeight: '800', paddingVertical: 8 },
  scheduleCalendarCell: { width: '14.2857%', height: 76, alignItems: 'stretch', justifyContent: 'center', padding: 2 },
  scheduleCalendarDayButton: { width: '100%', flex: 1, borderRadius: 11, alignItems: 'stretch', padding: 3, gap: 2 },
  scheduleCalendarDaySelected: { backgroundColor: '#1a5f7a' },
  scheduleCalendarDayToday: { borderWidth: 1, borderColor: '#1a5f7a' },
  scheduleCalendarDayText: { color: '#334155', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  scheduleCalendarDayTextSelected: { color: '#fff', fontWeight: '800' },
  calendarEventBox: { flex: 1, minHeight: 0, borderRadius: 6, paddingHorizontal: 3, paddingVertical: 2, justifyContent: 'center' },
  calendarEventBoxSelected: { backgroundColor: '#ffffff' },
  calendarEventBoxGreen: { backgroundColor: '#dcfce7' },
  calendarEventBoxAmber: { backgroundColor: '#fef3c7' },
  calendarEventBoxPurple: { backgroundColor: '#f3e8ff' },
  calendarEventText: { color: '#334155', fontSize: 8, lineHeight: 10, fontWeight: '700', textAlign: 'center' },
  calendarEventTextSelected: { color: '#0d3b4f' },
  agendaHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  todayButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#e8f1f5' },
  todayButtonText: { color: '#1a5f7a', fontSize: 12, fontWeight: '800' },
  agendaList: { backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 },
  agendaCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  agendaCardLast: { borderBottomWidth: 0 },
  agendaAccent: { width: 4, alignSelf: 'stretch', borderRadius: 3 },
  agendaAccentGreen: { backgroundColor: '#16a34a' },
  agendaAccentAmber: { backgroundColor: '#d97706' },
  agendaAccentPurple: { backgroundColor: '#9333ea' },
  agendaCardContent: { flex: 1, gap: 4 },
  agendaTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agendaTime: { color: '#1a5f7a', fontSize: 11, fontWeight: '800' },
  agendaStatus: { color: '#64748b', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  emptyAgenda: { minHeight: 88, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  loading: { marginTop: 24 },
  empty: { backgroundColor: '#fff', padding: 24, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sessionList: { backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 },
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  cardLast: { borderBottomWidth: 0 },
  sessionMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateTile: { width: 54, minHeight: 68, borderRadius: 9, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', paddingVertical: 7 },
  dateMonth: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  dateDay: { color: colors.navy, fontSize: 24, lineHeight: 28, fontWeight: '800' },
  dateWeekday: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  sessionInfo: { flex: 1, gap: 4 },
  sessionTargetAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.tealLight },
  sessionTargetFallback: { alignItems: 'center', justifyContent: 'center' },
  sessionTargetInitials: { color: colors.teal, fontSize: 11, fontWeight: '800' },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  body: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  detailLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { flex: 1, color: '#64748b', fontSize: 12, lineHeight: 17 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  cardDivider: { height: 1, backgroundColor: '#eef2f6', marginTop: 9 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  confirmedStatusBadge: { backgroundColor: '#dcfce7' },
  pendingStatusBadge: { backgroundColor: '#fef3c7' },
  declinedStatusBadge: { backgroundColor: '#fee2e2' },
  pastStatusBadge: { backgroundColor: '#f3e8ff' },
  completedStatusBadge: { backgroundColor: '#e8f1f5' },
  cancelledStatusBadge: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  confirmedStatusText: { color: '#166534' },
  pendingStatusText: { color: '#92400e' },
  declinedStatusText: { color: '#b91c1c' },
  pastStatusText: { color: '#7e22ce' },
  completedStatusText: { color: '#1a5f7a' },
  cancelledStatusText: { color: '#64748b' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  sessionAction: { minHeight: 36, paddingHorizontal: 11, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionPrimary: { backgroundColor: '#1a5f7a' },
  actionNeutral: { backgroundColor: '#e8f1f5' },
  actionDanger: { backgroundColor: '#fff1f0' },
  actionPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionNeutralText: { color: '#1a5f7a', fontSize: 12, fontWeight: '700' },
  actionDangerText: { color: '#b42318', fontSize: 12, fontWeight: '700' },
  noActionsText: { color: '#94a3b8', fontSize: 11, fontWeight: '600', paddingVertical: 8 },
  link: { color: '#1a5f7a', fontWeight: '700', paddingVertical: 8 },
  cancel: { color: '#b42318', fontWeight: '700', paddingVertical: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalContent: { padding: 20, gap: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0d3b4f' },
  label: { color: '#475569', fontWeight: '700' },
  selectButton: {
    minHeight: 46,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { color: '#0f172a', fontWeight: '600' },
  selectPlaceholder: { color: '#94a3b8' },
  selectArrow: { color: '#64748b', fontSize: 18 },
  optionsList: { maxHeight: 130 },
  option: { padding: 10, borderWidth: 1, borderColor: '#dbe3eb', borderRadius: 10, marginBottom: 6 },
  selectedOption: { borderColor: '#1a5f7a', backgroundColor: '#eaf4f8' },
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  dateTimeButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dateTimeButtonText: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  dateTimePicker: { backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#dbe3eb', padding: 12, gap: 10 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { color: '#0d3b4f', fontWeight: '800', fontSize: 15 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: 11, paddingVertical: 8 },
  calendarDay: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  calendarDaySelected: { backgroundColor: '#1a5f7a' },
  calendarDayDisabled: { opacity: 0.3 },
  calendarDayText: { color: '#334155', fontWeight: '600' },
  calendarDayTextSelected: { color: '#fff' },
  clockColumns: { flexDirection: 'row', justifyContent: 'space-evenly', gap: 8 },
  clockColumn: { flex: 1, maxHeight: 150 },
  clockOption: { alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  clockOptionSelected: { backgroundColor: '#1a5f7a' },
  clockOptionText: { color: '#334155', fontSize: 16, fontWeight: '600' },
  clockOptionTextSelected: { color: '#fff' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe3eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  disabled: { opacity: 0.6 },
});

function SummaryCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tint: 'green' | 'amber' | 'purple';
}) {
  const tintStyle = tint === 'green'
    ? styles.summaryGreen
    : tint === 'amber' ? styles.summaryAmber : styles.summaryPurple;
  const color = tint === 'green' ? '#15803d' : tint === 'amber' ? '#b45309' : '#7e22ce';

  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, tintStyle]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SessionAction({
  icon,
  label,
  kind,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  kind: 'primary' | 'neutral' | 'danger';
  onPress: () => void;
}) {
  const buttonStyle = kind === 'primary'
    ? styles.actionPrimary
    : kind === 'danger' ? styles.actionDanger : styles.actionNeutral;
  const textStyle = kind === 'primary'
    ? styles.actionPrimaryText
    : kind === 'danger' ? styles.actionDangerText : styles.actionNeutralText;
  const color = kind === 'primary' ? '#fff' : kind === 'danger' ? '#b42318' : '#1a5f7a';

  return (
    <TouchableOpacity
      style={[styles.sessionAction, buttonStyle]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

function ScheduleCalendar({
  month,
  selectedDate,
  sessions,
  onChangeMonth,
  onSelectDate,
}: {
  month: Date;
  selectedDate: Date;
  sessions: StudySessionRecord[];
  onChangeMonth: (month: Date) => void;
  onSelectDate: (date: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const todayKey = getLocalDateKey(new Date());

  const moveMonth = (amount: number) => {
    const nextMonth = new Date(year, monthIndex + amount, 1);
    const nextDaysInMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const nextSelectedDate = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      Math.min(selectedDate.getDate(), nextDaysInMonth)
    );
    onChangeMonth(nextMonth);
    onSelectDate(nextSelectedDate);
  };

  const getSessionEventStyle = (session: StudySessionRecord) => {
    if (session.is_past) return styles.calendarEventBoxPurple;
    if (session.status === 'confirmed') return styles.calendarEventBoxGreen;
    if (session.status === 'pending') return styles.calendarEventBoxAmber;
    return styles.calendarEventBoxGreen;
  };

  return (
    <View style={styles.calendarCard}>
      <View style={styles.scheduleCalendarHeader}>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => moveMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={19} color="#1a5f7a" />
        </TouchableOpacity>
        <Text style={styles.calendarMonthTitle}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => moveMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={19} color="#1a5f7a" />
        </TouchableOpacity>
      </View>
      <View style={styles.scheduleCalendarGrid}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.scheduleCalendarWeekday}>{weekday}</Text>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <View key={`empty-${index}`} style={styles.scheduleCalendarCell} />;
          const date = new Date(year, monthIndex, day);
          const dateKey = getLocalDateKey(date);
          const dateSessions = sessions.filter(
            (session) => getLocalDateKey(new Date(session.starts_at)) === dateKey
          );
          const isSelected = dateKey === getLocalDateKey(selectedDate);
          const isToday = dateKey === todayKey;

          return (
            <View key={dateKey} style={styles.scheduleCalendarCell}>
              <TouchableOpacity
                style={[
                  styles.scheduleCalendarDayButton,
                  isToday && styles.scheduleCalendarDayToday,
                  isSelected && styles.scheduleCalendarDaySelected,
                ]}
                onPress={() => onSelectDate(date)}
                accessibilityRole="button"
                accessibilityLabel={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}, ${dateSessions.length} sessions`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.scheduleCalendarDayText, isSelected && styles.scheduleCalendarDayTextSelected]}>{day}</Text>
                {dateSessions.length > 0 ? (
                  <View style={[
                    styles.calendarEventBox,
                    isSelected ? styles.calendarEventBoxSelected : getSessionEventStyle(dateSessions[0]),
                  ]}>
                    <Text
                      style={[styles.calendarEventText, isSelected && styles.calendarEventTextSelected]}
                      numberOfLines={2}
                    >
                      {dateSessions[0].topic}
                      {dateSessions.length > 1 ? ` +${dateSessions.length - 1}` : ''}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DateTimeButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.dateTimeButton} onPress={onPress}>
      <Ionicons name={icon} size={17} color="#1a5f7a" />
      <Text style={styles.dateTimeButtonText} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function CalendarPicker({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const [month, setMonth] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1));
  const startWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const changeMonth = (amount: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <View>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => changeMonth(-1)} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={20} color="#1a5f7a" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={20} color="#1a5f7a" />
        </TouchableOpacity>
      </View>
      <View style={styles.calendarGrid}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.weekday}>{weekday}</Text>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <View key={`blank-${index}`} style={styles.calendarDay} />;
          const selected = date.getFullYear() === month.getFullYear()
            && date.getMonth() === month.getMonth()
            && date.getDate() === day;
          const selectedDate = new Date(month.getFullYear(), month.getMonth(), day);
          const disabled = selectedDate < today;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.calendarDay, selected && styles.calendarDaySelected, disabled && styles.calendarDayDisabled]}
              disabled={disabled}
              onPress={() => onChange(setDatePart(date, selectedDate))}
            >
              <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ClockPicker({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const hour12 = date.getHours() % 12 || 12;
  const period = date.getHours() >= 12 ? 'PM' : 'AM';
  const hours = Array.from({ length: 12 }, (_, index) => index + 1);
  const minutes = Array.from({ length: 12 }, (_, index) => index * 5);
  const periods = ['AM', 'PM'];

  const updateTime = (hour: number, minute: number, selectedPeriod: string) => {
    const next = new Date(date);
    next.setHours(hour % 12 + (selectedPeriod === 'PM' ? 12 : 0), minute, 0, 0);
    onChange(next);
  };

  return (
    <View style={styles.clockColumns}>
      <ScrollView style={styles.clockColumn} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {hours.map((hour) => (
          <TouchableOpacity
            key={hour}
            style={[styles.clockOption, hour12 === hour && styles.clockOptionSelected]}
            onPress={() => updateTime(hour, date.getMinutes(), period)}
          >
            <Text style={[styles.clockOptionText, hour12 === hour && styles.clockOptionTextSelected]}>{hour}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.clockColumn} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {minutes.map((minute) => (
          <TouchableOpacity
            key={minute}
            style={[styles.clockOption, date.getMinutes() === minute && styles.clockOptionSelected]}
            onPress={() => updateTime(hour12, minute, period)}
          >
            <Text style={[styles.clockOptionText, date.getMinutes() === minute && styles.clockOptionTextSelected]}>
              {String(minute).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.clockColumn}>
        {periods.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.clockOption, period === item && styles.clockOptionSelected]}
            onPress={() => updateTime(hour12, date.getMinutes(), item)}
          >
            <Text style={[styles.clockOptionText, period === item && styles.clockOptionTextSelected]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
