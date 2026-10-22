import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { profileApi, StudyCourseInput, StudyMode } from '../services/api/profile';
import { AcademicCatalog, fetchAcademicCatalog } from '../services/api/courses';
import AppHeader from '../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type ProfileTagField = 'academicStrengths' | 'academicNeeds';
type ProfileSection = 'personal' | 'academic' | 'preferences';
type StudyCourse = StudyCourseInput & { normalized_course_code: string };
const defaultProfile = {
  studentId: '',
  gender: '',
  maritalStatus: '',
  phoneNumber: '',
  phoneNumberPublic: false,
  address: '',
  addressPublic: false,
  program: '',
  department: '',
  yearLevel: '',
  preferredTime: '',
  studyMode: '' as StudyMode,
  studyStyle: '',
  bio: '',
};

const yearLevelOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const genderOptions = ['Female', 'Male', 'Non-binary', 'Other', 'Prefer not to say'];
const maritalStatusOptions = ['Single', 'Married', 'Separated', 'Divorced', 'Widowed', 'Prefer not to say'];
const preferredTimeOptions = ['Morning', 'Afternoon', 'Evening', 'Flexible'];
const studyModeOptions = ['online', 'in_person', 'either'];
const studyStyleOptions = [
  'Visual learning',
  'Diagrams and mind maps',
  'Flashcards',
  'Discussion and teach-back',
  'Group study',
  'Peer tutoring',
  'Reading and note-taking',
  'Independent study',
  'Practice questions',
  'Hands-on practice',
  'Project-based learning',
  'Problem-solving exercises',
];
const studyStyleDescriptions: Record<string, string> = {
  'Visual learning': 'Learn through images, charts, and visual examples.',
  'Diagrams and mind maps': 'Connect ideas using diagrams, concept maps, or sketches.',
  Flashcards: 'Review key terms and concepts with quick question-and-answer cards.',
  'Discussion and teach-back': 'Discuss topics and explain them aloud in your own words.',
  'Group study': 'Learn collaboratively by sharing ideas and reviewing together.',
  'Peer tutoring': 'Learn one-on-one by asking questions and helping explain concepts.',
  'Reading and note-taking': 'Build understanding through readings, summaries, and organized notes.',
  'Independent study': 'Study at your own pace with focused, self-guided sessions.',
  'Practice questions': 'Strengthen recall by answering quizzes and sample questions.',
  'Hands-on practice': 'Learn by doing demonstrations, labs, and practical activities.',
  'Project-based learning': 'Understand concepts by applying them to a practical project.',
  'Problem-solving exercises': 'Practice methods by working through problems step by step.',
};
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const snsUCampusDepartments = new Set([
  'College of Engineering and Architecture',
  'College of Information and Computing Sciences',
  'College of Industrial Technology',
  'College of Teacher Education',
  'College of Business and Hospitality Management',
]);
const excludedDepartments = new Set([
  'Engineering Technology',
  'Information Technology',
]);
const snsUCampusPrograms = new Set([
  'Bachelor of Science in Civil Engineering (BSCE)',
  'Bachelor of Science in Electrical Engineering (BSEE)',
  'Bachelor of Science in Computer Engineering (BSCpE)',
  'Bachelor of Science in Electronics Engineering (BSEC / ECE)',
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Computer Science (BSCS)',
  'Bachelor of Science in Information Systems (BSIS)',
  'Bachelor of Industrial Technology (BIT) - Automotive',
  'Bachelor of Industrial Technology (BIT) - Electrical',
  'Bachelor of Industrial Technology (BIT) - Electronics',
  'Bachelor of Industrial Technology (BIT) - Mechanical',
  'Bachelor of Industrial Technology (BIT) - Drafting',
  'Bachelor of Industrial Technology (BIT) - Civil',
  'Bachelor of Industrial Technology (BIT) - Foods',
  'Bachelor of Industrial Technology (BIT) - Welding and Fabrication',
  'Bachelor of Industrial Technology (BIT) - Refrigeration and Air-Conditioning',
  'Associate in Industrial Technology (AIT)',
  'Bachelor of Elementary Education (BEEd)',
  'Bachelor of Secondary Education (BSEd) - English',
  'Bachelor of Secondary Education (BSEd) - Mathematics',
  'Bachelor of Secondary Education (BSEd) - Science/Biological/Physical Science',
  'Bachelor of Secondary Education (BSEd) - Filipino',
  'Bachelor of Technical-Vocational Teacher Education (BTVTED)',
  'Bachelor of Science in Hospitality Management (BSHM) / Hotel and Restaurant Management',
]);

const fieldOptions: Record<string, string[]> = {
  yearLevel: yearLevelOptions,
  gender: genderOptions,
  maritalStatus: maritalStatusOptions,
  preferredTime: preferredTimeOptions,
  studyMode: studyModeOptions,
  studyStyle: studyStyleOptions,
};

function createProfileFormSnapshot(
  name: string,
  form: typeof defaultProfile,
  profileTags: Record<ProfileTagField, string[]>,
  courses: StudyCourse[],
  days: string[],
  drafts: Record<ProfileTagField, string>,
  courseEntry: string
): string {
  return JSON.stringify({
    displayName: name.trim(),
    profile: form,
    tags: profileTags,
    studyCourses: courses.map(({ course_code, course_name }) => ({ course_code, course_name })),
    availabilityDays: days,
    tagDrafts: drafts,
    courseDraft: courseEntry,
  });
}

export default function ProfileScreen({
  navigation,
  registerLeaveGuard,
}: {
  navigation: any;
  registerLeaveGuard: (guard: {
    hasUnsavedChanges: boolean;
    confirmLeave: (onLeave: () => void) => void;
  } | null) => void;
}) {
  const { user, logout, updateUserProfile } = useAuth();
  const currentUserId = user?.id;
  const [profile, setProfile] = useState(defaultProfile);
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const savedDisplayName = useRef(user?.name ?? '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(
    user?.profile?.profile_photo_url ?? user?.profile_photo_url ?? null
  );
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileCheckUserId, setProfileCheckUserId] = useState<number | null>(null);
  const profileLoadInFlightKey = useRef<string | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pickerField, setPickerField] = useState<keyof typeof defaultProfile | null>(null);
  const [catalog, setCatalog] = useState<AcademicCatalog>({
    departments: [],
    learning_styles: [],
    strengths: [],
    weaknesses: [],
  });
  const [tags, setTags] = useState<Record<ProfileTagField, string[]>>({
    academicStrengths: [],
    academicNeeds: [],
  });
  const [tagDrafts, setTagDrafts] = useState<Record<ProfileTagField, string>>({
    academicStrengths: '',
    academicNeeds: '',
  });
  const [studyCourses, setStudyCourses] = useState<StudyCourse[]>([]);
  const [courseDraft, setCourseDraft] = useState('');
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  const [savedFormSnapshot, setSavedFormSnapshot] = useState<string | null>(null);
  const institution = user?.email?.toLowerCase().endsWith('@ssct.edu.ph') ? 'SSCT' : 'SNSU';
  const campusDepartments = catalog.departments.filter((department) =>
    !excludedDepartments.has(department.name)
      && (institution === 'SSCT' || snsUCampusDepartments.has(department.name))
  );
  const selectedDepartmentId = campusDepartments.find(
    (department) => department.name === profile.department
  )?.id;
  const profileCheckReady = currentUserId !== undefined && profileCheckUserId === currentUserId;
  const isLoadingProfile = currentUserId !== undefined && profileCheckUserId !== currentUserId;
  const getFormSnapshot = useCallback(() => createProfileFormSnapshot(
    displayName,
    profile,
    tags,
    studyCourses,
    availabilityDays,
    tagDrafts,
    courseDraft
  ), [displayName, profile, tags, studyCourses, availabilityDays, tagDrafts, courseDraft]);
  const hasUnsavedChanges = profileCheckReady
    && savedFormSnapshot !== null
    && savedFormSnapshot !== getFormSnapshot();
  const incompleteSections: Record<ProfileSection, boolean> = {
    personal: !displayName.trim(),
    academic: !profile.department || !profile.program || !profile.yearLevel,
    preferences: !studyCourses.length
      || !profile.preferredTime
      || !profile.studyMode
      || !profile.studyStyle
      || !availabilityDays.length
      || !(tags.academicStrengths.length || tags.academicNeeds.length),
  };

  useEffect(() => {
    const loadProfile = async (userId: number, requestKey: string) => {
      setSavedFormSnapshot(null);
      try {
        const [academicCatalog, response] = await Promise.all([
          fetchAcademicCatalog(),
          profileApi.getProfile().catch((profileError: unknown) => {
            if ((profileError as { status?: number })?.status === 404) {
              return null;
            }
            throw profileError;
          }),
        ]);
        if (profileLoadInFlightKey.current !== requestKey) return;

        setCatalog(academicCatalog);
        const profileData = response?.data?.profile ?? null;

        if (!profileData) {
          const loadedAvailabilityDays = response?.data?.availabilities?.map((item) => item.day_of_week) ?? [];
          setProfileSaved(false);
          setProfilePhotoUrl(null);
          setProfile(defaultProfile);
          setTags({ academicStrengths: [], academicNeeds: [] });
          setStudyCourses([]);
          setCourseDraft('');
          setAvailabilityDays(loadedAvailabilityDays);
          setSavedFormSnapshot(createProfileFormSnapshot(
            savedDisplayName.current,
            defaultProfile,
            { academicStrengths: [], academicNeeds: [] },
            [],
            loadedAvailabilityDays,
            { academicStrengths: '', academicNeeds: '' },
            ''
          ));
          setProfileCheckUserId(userId);
          return;
        }

        setProfileSaved(true);
        setProfilePhotoUrl(profileData.profile_photo_url ?? null);
        const mappedProfile = profileApi.mapProfileToForm(profileData);
        const profileDepartment = academicCatalog.departments.find(
          (department) => department.name === mappedProfile.department
            && (institution === 'SSCT' || snsUCampusDepartments.has(department.name))
        );
        const profileProgram = profileDepartment?.programs.some(
          (program) => program.name === mappedProfile.program
        ) ? mappedProfile.program : '';
        const loadedProfile = {
          ...defaultProfile,
          ...mappedProfile,
          department: profileDepartment?.name ?? '',
          program: profileProgram,
          preferredTime: response?.data?.availabilities?.[0]?.start_time === '12:00'
            ? 'Afternoon'
            : response?.data?.availabilities?.[0]?.start_time === '17:00'
              ? 'Evening'
              : response?.data?.availabilities?.length ? 'Morning' : '',
        };
        const loadedTags = {
          academicStrengths: [...new Set([
            ...(profileData.academic_strengths ?? []),
            ...(response?.data?.strength_ids ?? []).map(
              (id) => academicCatalog.strengths.find((item) => item.id === id)?.name
            ).filter((name): name is string => Boolean(name)),
          ])],
          academicNeeds: [...new Set([
            ...(profileData.academic_needs ?? []),
            ...(response?.data?.weakness_ids ?? []).map(
              (id) => academicCatalog.weaknesses.find((item) => item.id === id)?.name
            ).filter((name): name is string => Boolean(name)),
          ])],
        };
        const loadedCourses = (profileData.study_courses ?? []).map((course) => ({
          ...course,
          normalized_course_code: course.normalized_course_code
            || course.course_code.replace(/[^a-z0-9]/gi, '').toUpperCase(),
        }));
        const loadedAvailabilityDays = [...new Set(response?.data?.availabilities?.map((item) => item.day_of_week) ?? [])];
        setProfile(loadedProfile);
        setTags(loadedTags);
        setStudyCourses(loadedCourses);
        setCourseDraft('');
        setTagDrafts({ academicStrengths: '', academicNeeds: '' });
        setAvailabilityDays(loadedAvailabilityDays);
        setSavedFormSnapshot(createProfileFormSnapshot(
          savedDisplayName.current,
          loadedProfile,
          loadedTags,
          loadedCourses,
          loadedAvailabilityDays,
          { academicStrengths: '', academicNeeds: '' },
          ''
        ));
        setProfileCheckUserId(userId);
      } catch (error) {
        if (profileLoadInFlightKey.current !== requestKey) return;

        Alert.alert(
          'Could not load profile options',
          error instanceof Error ? error.message : 'Please check your connection and try again.'
        );
        setProfileCheckUserId(userId);
      }
    };

    if (currentUserId) {
      const requestKey = `${currentUserId}:${institution}`;
      if (profileLoadInFlightKey.current === requestKey) return;

      profileLoadInFlightKey.current = requestKey;
      void loadProfile(currentUserId, requestKey).finally(() => {
        if (profileLoadInFlightKey.current === requestKey) {
          profileLoadInFlightKey.current = null;
        }
      });
    }
  }, [currentUserId, institution]);

  const handlePickProfilePhoto = async () => {
    if (!profileSaved || uploadingPhoto) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo) return;

      setUploadingPhoto(true);
      const photoUrl = await profileApi.uploadProfilePhoto(
        photo.uri,
        photo.fileName ?? null,
        photo.mimeType ?? null
      );
      setProfilePhotoUrl(photoUrl);
      updateUserProfile({ profilePhotoUrl: photoUrl });
      Alert.alert('Photo updated', 'Your profile photo has been uploaded.');
    } catch (error) {
      Alert.alert(
        'Photo upload failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  function updateField<Field extends keyof typeof defaultProfile>(
    field: Field,
    value: (typeof defaultProfile)[Field]
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const openPicker = (field: keyof typeof defaultProfile) => {
    if (getFieldOptions(field).length > 0) {
      setPickerField(field);
    }
  };

  const getFieldOptions = (field: keyof typeof defaultProfile): string[] => {
    if (field === 'department') return campusDepartments.map((department) => department.name);
    if (field === 'program') {
      const department = campusDepartments.find((item) => item.id === selectedDepartmentId);
      const programs = department?.programs.map((program) => program.name) ?? [];
      return snsUCampusDepartments.has(department?.name ?? '')
        ? programs.filter((program) => snsUCampusPrograms.has(program))
        : programs;
    }
    if (field === 'studyStyle') return studyStyleOptions;
    return fieldOptions[field] ?? [];
  };

  const getOptionLabel = (field: keyof typeof defaultProfile, option: string): string => {
    if (field === 'studyMode') {
      return { online: 'Online', in_person: 'In person', either: 'Either' }[option] ?? option;
    }
    return option;
  };

  const renderPickerField = (field: keyof typeof defaultProfile, label: string, value: string) => (
    <View style={styles.fieldGroup} key={field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selectBox}
        onPress={() => openPicker(field)}
        disabled={getFieldOptions(field).length === 0}
      >
        <Text style={styles.selectText}>{value ? getOptionLabel(field, value) : `Select ${label.toLowerCase()}`}</Text>
        <Text style={styles.selectArrow}>▾</Text>
      </TouchableOpacity>
    </View>
  );

  const addTag = (field: ProfileTagField, value = tagDrafts[field]) => {
    const tag = value.trim();
    if (!tag) return;

    if (tags[field].some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setTagDrafts((current) => ({ ...current, [field]: '' }));
      return;
    }

    if (tags[field].length >= 20) {
      Alert.alert('Limit reached', 'You can add up to 20 entries in this field.');
      return;
    }

    setTags((current) => ({ ...current, [field]: [...current[field], tag] }));
    setTagDrafts((current) => ({ ...current, [field]: '' }));
  };

  const renderTagEditor = (
    field: ProfileTagField,
    label: string,
    placeholder: string,
    suggestions: string[] = []
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.tagList}>
        {tags[field].map((tag) => (
          <TouchableOpacity
            key={tag}
            style={styles.selectedTag}
            onPress={() => setTags((current) => ({
              ...current,
              [field]: current[field].filter((item) => item !== tag),
            }))}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${tag}`}
          >
            <Text style={styles.selectedTagText}>{tag}  ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tagInputRow}>
        <TextInput
          value={tagDrafts[field]}
          onChangeText={(value) => setTagDrafts((current) => ({ ...current, [field]: value }))}
          style={[styles.input, styles.tagInput]}
          placeholder={placeholder}
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={() => addTag(field)}
        />
        <TouchableOpacity style={styles.addTagButton} onPress={() => addTag(field)}>
          <Text style={styles.addTagButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {suggestions.length ? (
        <View style={styles.suggestionList}>
          {suggestions.filter((suggestion) => !tags[field].some(
            (tag) => tag.toLowerCase() === suggestion.toLowerCase()
          )).map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              style={styles.suggestionTag}
              onPress={() => addTag(field, suggestion)}
            >
              <Text style={styles.suggestionTagText}>+ {suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );

  const addStudyCourse = () => {
    const parsed = courseDraft.trim().split(/\s+-\s+/);
    const code = parsed.length === 2 ? parsed[0].trim() : '';
    const name = parsed.length === 2 ? parsed[1].trim() : '';
    const normalizedCode = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (
      !/^[A-Za-z0-9]+(?:[ .\/-][A-Za-z0-9]+)*$/.test(code)
      || code.length > 40
      || !normalizedCode
      || name.length < 2
      || name.length > 120
    ) {
      Alert.alert(
        'Invalid course format',
        'Enter a course as COURSE CODE - Course Name. Example: IT 213 - Database Management Systems.'
      );
      return;
    }

    if (studyCourses.some((course) => course.normalized_course_code === normalizedCode)) {
      Alert.alert('Course already added', `${normalizedCode} is already in your subjects.`);
      return;
    }

    if (studyCourses.length >= 20) {
      Alert.alert('Limit reached', 'You can add up to 20 courses.');
      return;
    }

    Alert.alert('Confirm your course', `${normalizedCode}\n${name}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add course',
        onPress: () => {
          setStudyCourses((current) => [
            ...current,
            { course_code: code, normalized_course_code: normalizedCode, course_name: name },
          ]);
          setCourseDraft('');
        },
      },
    ]);
  };

  const handleSave = useCallback(async (showSuccess = true): Promise<boolean> => {
    const formSnapshot = getFormSnapshot();
    try {
      const payload = profileApi.normalizeProfilePayload({
        studentId: profile.studentId,
        gender: profile.gender,
        maritalStatus: profile.maritalStatus,
        program: profile.program,
        department: profile.department,
        yearLevel: profile.yearLevel,
        studyMode: profile.studyMode,
        preferredTime: profile.preferredTime,
        studyStyle: profile.studyStyle,
        bio: profile.bio,
        phoneNumber: profile.phoneNumber,
        phoneNumberPublic: profile.phoneNumberPublic,
        address: profile.address,
        addressPublic: profile.addressPublic,
        institution,
        studyCourses: studyCourses.map(({ course_code, course_name }) => ({ course_code, course_name })),
        academicStrengths: tags.academicStrengths,
        academicNeeds: tags.academicNeeds,
        availabilityDays,
        departments: catalog.departments,
        programs: catalog.departments.flatMap((department) => department.programs),
        learningStyles: catalog.learning_styles,
      });

      const response = await profileApi.saveProfile({
        ...payload,
        name: displayName.trim(),
      });
      const savedCourses = response.data?.profile?.study_courses;
      if (!savedCourses || savedCourses.length !== payload.study_courses.length) {
        throw new Error('Not all study courses were confirmed as saved. Please try again.');
      }

      setStudyCourses(savedCourses.map((course) => ({
        ...course,
        normalized_course_code: course.normalized_course_code
          || course.course_code.replace(/[^a-z0-9]/gi, '').toUpperCase(),
      })));
      updateUserProfile({ name: displayName.trim() });
      savedDisplayName.current = displayName.trim();
      setProfileSaved(true);
      setSavedFormSnapshot(formSnapshot);
      if (showSuccess) {
        Alert.alert('Profile saved', 'Your personal information and study match preferences have been updated.');
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Profile save failed', message);
      return false;
    }
  }, [
    profile,
    studyCourses,
    tags,
    availabilityDays,
    catalog,
    displayName,
    institution,
    getFormSnapshot,
    updateUserProfile,
  ]);

  const confirmLeave = useCallback((onLeave: () => void) => {
    Alert.alert(
      'Unsaved profile changes',
      'Save your profile changes before leaving? Changes in your profile sections will be lost if you leave without saving.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Leave without saving',
          style: 'destructive',
          onPress: onLeave,
        },
        {
          text: 'Save and leave',
          onPress: () => {
            void handleSave(false).then((saved) => {
              if (saved) onLeave();
            });
          },
        },
      ]
    );
  }, [handleSave]);

  useEffect(() => {
    registerLeaveGuard({ hasUnsavedChanges, confirmLeave });
    return () => registerLeaveGuard(null);
  }, [hasUnsavedChanges, confirmLeave, registerLeaveGuard]);

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    confirmLeave(() => navigation.dispatch(data.action));
  });

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <AppHeader
          title="Profile"
          subtitle="SNSU Main Campus · Matching information & credentials"
          navigation={navigation}
          onSettingsPress={() => setSettingsVisible(true)}
        />

        {isLoadingProfile ? (
          <View style={styles.profileLoading} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.profileLoadingText}>Loading your profile...</Text>
          </View>
        ) : null}

        <View style={styles.profileHero}>
          <View style={styles.profileHeroPhoto}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.profileHeroImage} />
            ) : (
              <Text style={styles.profileHeroInitials}>
                {(displayName || 'Student').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.profileHeroCopy}>
            <Text style={styles.profileHeroEyebrow}>YOUR LEARNING PROFILE</Text>
            <Text style={styles.profileHeroName} numberOfLines={1}>{displayName || 'Student'}</Text>
            <Text style={styles.profileHeroDetail} numberOfLines={1}>
              {profile.program || profile.department || 'Add your program to improve your matches'}
            </Text>
          </View>
          <Ionicons name="sparkles-outline" size={20} color="#b9e4f0" />
        </View>

        <View style={styles.sectionTabs}>
          {([
            { key: 'personal', label: 'Profile', icon: 'person-outline' },
            { key: 'academic', label: 'Academic', icon: 'school-outline' },
            { key: 'preferences', label: 'Study Match', icon: 'options-outline' },
          ] as const).map((section) => (
            <TouchableOpacity
              key={section.key}
              style={[styles.sectionTab, activeSection === section.key && styles.sectionTabActive]}
              onPress={() => setActiveSection(section.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: activeSection === section.key }}
              accessibilityLabel={`${section.label}${profileCheckReady && incompleteSections[section.key] ? ', missing required information' : ''}`}
            >
              <View style={styles.sectionTabIcon}>
                <Ionicons
                  name={section.icon}
                  size={17}
                  color={activeSection === section.key ? '#0d3b4f' : '#64748b'}
                />
                {profileCheckReady && incompleteSections[section.key] ? (
                  <View style={styles.missingRequiredIndicator} accessible={false} />
                ) : null}
              </View>
              <Text style={[styles.sectionTabText, activeSection === section.key && styles.sectionTabTextActive]}>
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeSection === 'personal' ? <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.personalPhotoRow}>
            <View style={styles.personalPhoto}>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.personalPhotoImage} />
              ) : (
                <Text style={styles.personalPhotoInitials}>
                  {(displayName || 'Student').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.personalPhotoActions}>
              <TouchableOpacity
                style={[styles.photoButton, (!profileSaved || uploadingPhoto) && styles.photoButtonDisabled]}
                onPress={() => { void handlePickProfilePhoto(); }}
                disabled={!profileSaved || uploadingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Upload profile photo"
              >
                {uploadingPhoto
                  ? <ActivityIndicator color="#ffffff" />
                  : <Text style={styles.photoButtonText}>{profilePhotoUrl ? 'Change photo' : 'Upload photo'}</Text>}
              </TouchableOpacity>
              <Text style={styles.fieldDescription}>
                {profileSaved ? 'Choose a square photo for your profile.' : 'Save your match profile before uploading a photo.'}
              </Text>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
              placeholder="Full name"
              maxLength={255}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.readOnlyField}>{user?.email || 'No email available'}</Text>
          </View>
          {renderPickerField('gender', 'Gender', profile.gender)}
          {renderPickerField('maritalStatus', 'Marital status', profile.maritalStatus)}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              value={profile.bio}
              onChangeText={(text) => updateField('bio', text)}
              style={[styles.input, styles.textArea]}
              placeholder="Tell other students about yourself and the study partners you are looking for"
              multiline
              maxLength={500}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              value={profile.phoneNumber}
              onChangeText={(text) => updateField('phoneNumber', text)}
              style={styles.input}
              placeholder="e.g. +63 912 345 6789"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={30}
            />
            <View style={styles.visibilityRow}>
              <Text style={[styles.fieldDescription, styles.visibilityDescription]}>
                Optional · {profile.phoneNumberPublic ? 'Visible to others' : 'Private'}
              </Text>
              <TouchableOpacity
                style={[styles.visibilityButton, profile.phoneNumberPublic && styles.visibilityButtonPublic]}
                onPress={() => updateField('phoneNumberPublic', !profile.phoneNumberPublic)}
                accessibilityRole="switch"
                accessibilityState={{ checked: profile.phoneNumberPublic }}
                accessibilityLabel="Make phone number public"
              >
                <Text style={[styles.visibilityButtonText, profile.phoneNumberPublic && styles.visibilityButtonTextPublic]}>
                  {profile.phoneNumberPublic ? 'Public' : 'Private'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              value={profile.address}
              onChangeText={(text) => updateField('address', text)}
              style={[styles.input, styles.textArea]}
              placeholder="Street, barangay, city or municipality, province"
              multiline
              maxLength={500}
              autoComplete="street-address"
            />
            <View style={styles.visibilityRow}>
              <Text style={[styles.fieldDescription, styles.visibilityDescription]}>
                Optional · {profile.addressPublic ? 'Visible to others' : 'Private'}
              </Text>
              <TouchableOpacity
                style={[styles.visibilityButton, profile.addressPublic && styles.visibilityButtonPublic]}
                onPress={() => updateField('addressPublic', !profile.addressPublic)}
                accessibilityRole="switch"
                accessibilityState={{ checked: profile.addressPublic }}
                accessibilityLabel="Make address public"
              >
                <Text style={[styles.visibilityButtonText, profile.addressPublic && styles.visibilityButtonTextPublic]}>
                  {profile.addressPublic ? 'Public' : 'Private'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View> : null}

        {activeSection === 'academic' ? <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Academic Information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Student ID</Text>
            <TextInput
              value={profile.studentId}
              onChangeText={(text) => updateField('studentId', text)}
              style={styles.input}
              placeholder="Student ID"
            />
          </View>

          {renderPickerField('department', 'Department', profile.department)}
          {renderPickerField('program', 'Program', profile.program)}

          {renderPickerField('yearLevel', 'Year Level', profile.yearLevel)}
        </View> : null}

        {activeSection === 'preferences' ? <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Study Match Preferences</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Courses you are studying</Text>
            <Text style={styles.fieldDescription}>
              Enter the course code first, then the course name. Matching uses the course code.
            </Text>
            {studyCourses.map((course) => (
              <View key={course.normalized_course_code} style={styles.courseItem}>
                <View style={styles.courseCopy}>
                  <Text style={styles.courseCode}>{course.course_code} · {course.normalized_course_code}</Text>
                  <Text style={styles.courseName}>{course.course_name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setStudyCourses((current) => current.filter(
                    (item) => item.normalized_course_code !== course.normalized_course_code
                  ))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${course.course_code} ${course.course_name}`}
                >
                  <Text style={styles.removeCourse}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.courseInputRow}>
              <TextInput
                value={courseDraft}
                onChangeText={setCourseDraft}
                style={[styles.input, styles.courseInput]}
                placeholder="IT 213 - Database Management Systems"
                maxLength={165}
                returnKeyType="done"
                onSubmitEditing={addStudyCourse}
              />
              <TouchableOpacity style={styles.addTagButton} onPress={addStudyCourse}>
                <Text style={styles.addTagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderPickerField('preferredTime', 'Preferred Study Time', profile.preferredTime)}
          {renderPickerField('studyMode', 'Study Mode', profile.studyMode)}
          {renderPickerField('studyStyle', 'Study Style', profile.studyStyle)}
          {profile.studyStyle ? (
            <Text style={styles.fieldDescription}>
              {studyStyleDescriptions[profile.studyStyle]}
            </Text>
          ) : null}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Days available to study</Text>
            <View style={styles.dayChoices}>
              {weekdays.map((day) => {
                const selected = availabilityDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChoice, selected && styles.dayChoiceSelected]}
                    onPress={() => setAvailabilityDays((current) => (
                      selected ? current.filter((item) => item !== day) : [...current, day]
                    ))}
                  >
                    <Text style={[styles.dayChoiceText, selected && styles.dayChoiceTextSelected]}>
                      {day.slice(0, 3).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {renderTagEditor('academicStrengths', 'What are you good at?', 'e.g. Programming, Mathematics', catalog.strengths.map((item) => item.name))}
          {renderTagEditor('academicNeeds', 'What do you need help with?', 'e.g. Databases, Networking', catalog.weaknesses.map((item) => item.name))}

        </View> : null}

        <TouchableOpacity style={styles.saveButton} onPress={() => { void handleSave(); }}>
          <Text style={styles.saveButtonText}>Save Profile Changes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={confirmSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        transparent
        visible={Boolean(pickerField)}
        animationType="slide"
        onRequestClose={() => setPickerField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select {pickerField ? pickerField.replace(/([A-Z])/g, ' $1').trim() : ''}</Text>

            <ScrollView
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
              showsVerticalScrollIndicator
              indicatorStyle="black"
              scrollEventThrottle={16}
            >
              {pickerField && getFieldOptions(pickerField).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.optionItem}
                  onPress={() => {
                    updateField(pickerField, option);
                    if (pickerField === 'department') {
                      updateField('program', '');
                    }
                    setPickerField(null);
                  }}
                >
                  <Text style={styles.optionText}>{getOptionLabel(pickerField, option)}</Text>
                  {pickerField === 'studyStyle' ? (
                    <Text style={styles.optionDescription}>{studyStyleDescriptions[option]}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => setPickerField(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={settingsVisible}
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsCard}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Text style={styles.settingsName}>{user?.name || 'Student'}</Text>
            {user?.email ? <Text style={styles.settingsEmail}>{user.email}</Text> : null}
            <Text style={styles.settingsDescription}>
              Update your profile and study preferences on this page.
            </Text>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={() => {
                setSettingsVisible(false);
                confirmSignOut();
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 18,
    paddingBottom: 32,
  },
  profileHero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 11, padding: 15, marginBottom: 16 },
  profileLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    backgroundColor: colors.surface,
  },
  profileLoadingText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  profileHeroPhoto: { width: 58, height: 58, borderRadius: 12, backgroundColor: colors.tealLight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  profileHeroImage: { width: '100%', height: '100%' },
  profileHeroInitials: { color: colors.teal, fontSize: 18, fontWeight: '800' },
  profileHeroCopy: { flex: 1 },
  profileHeroEyebrow: { color: colors.teal, fontSize: 9, letterSpacing: 1, fontWeight: '800', marginBottom: 5 },
  profileHeroName: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  profileHeroDetail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: colors.page,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 3,
  },
  sectionTab: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 3,
  },
  sectionTabIcon: {
    position: 'relative',
  },
  missingRequiredIndicator: {
    position: 'absolute',
    top: -3,
    right: -6,
    width: 9,
    height: 9,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  sectionTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTabText: { color: '#64748b', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  sectionTabTextActive: { color: colors.navy },
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
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 12,
  },
  personalPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  personalPhoto: {
    width: 82,
    height: 82,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  personalPhotoImage: { width: '100%', height: '100%' },
  personalPhotoInitials: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  personalPhotoActions: { flex: 1, alignItems: 'flex-start', gap: 8 },
  photoButton: {
    minHeight: 40,
    minWidth: 120,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonDisabled: { opacity: 0.55 },
  photoButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  readOnlyField: {
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#475569',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  selectedTag: {
    backgroundColor: '#e0f2fe',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectedTagText: {
    color: '#075985',
    fontSize: 12,
    fontWeight: '700',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
  },
  courseInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseInput: {
    flex: 1,
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
  },
  courseCopy: {
    flex: 1,
  },
  courseCode: {
    color: '#075985',
    fontSize: 13,
    fontWeight: '800',
  },
  courseName: {
    color: '#475569',
    fontSize: 12,
    marginTop: 3,
  },
  removeCourse: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  addTagButton: {
    backgroundColor: '#1a5f7a',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  addTagButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  suggestionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  suggestionTag: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  suggestionTagText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  dayChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChoice: { borderRadius: 12, borderWidth: 1, borderColor: '#dbe3eb', backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 9 },
  dayChoiceSelected: { borderColor: '#1a5f7a', backgroundColor: '#1a5f7a' },
  dayChoiceText: { color: '#64748b', fontWeight: '700', fontSize: 11 },
  dayChoiceTextSelected: { color: '#fff' },
  label: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6,
  },
  fieldDescription: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    marginTop: -6,
    marginBottom: 12,
  },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  visibilityDescription: { flex: 1, marginTop: 0, marginBottom: 0 },
  visibilityButton: { minWidth: 72, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 7 },
  visibilityButtonPublic: { borderColor: '#15803d', backgroundColor: '#dcfce7' },
  visibilityButtonText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  visibilityButtonTextPublic: { color: '#166534' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  selectBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBoxDisabled: {
    opacity: 0.55,
  },
  selectText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  selectArrow: {
    fontSize: 18,
    color: '#475569',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  halfField: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    maxHeight: '70%',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 30,
  },
  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0d3b4f',
    marginBottom: 12,
  },
  settingsName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  settingsEmail: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 3,
  },
  settingsDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 8,
  },
  optionList: {
    maxHeight: 320,
    backgroundColor: colors.page,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe7f2',
  },
  optionListContent: {
    paddingVertical: 4,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  optionText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  optionDescription: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#1a5f7a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: '#1a5f7a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  signOutButtonText: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 15,
  },
});
