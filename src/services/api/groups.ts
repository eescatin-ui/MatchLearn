import { apiClient } from './client';
import { ApiResponse } from '../../types/auth';

export const GROUP_AVATAR_OPTIONS = [
  { icon: 'construct-outline', label: 'Engineering & Architecture', shortLabel: 'Engineering' },
  { icon: 'laptop-outline', label: 'Information & Computing Sciences', shortLabel: 'Computing' },
  { icon: 'build-outline', label: 'Industrial Technology', shortLabel: 'Industrial Tech.' },
  { icon: 'school-outline', label: 'Teacher Education', shortLabel: 'Teacher Ed.' },
  { icon: 'business-outline', label: 'Business & Hospitality Management', shortLabel: 'Business & Hospitality' },
] as const;

type LegacyGroupAvatarIcon =
  | 'book-outline'
  | 'flask-outline'
  | 'calculator-outline'
  | 'code-slash-outline'
  | 'bulb-outline'
  | 'globe-outline';
export type GroupAvatarIcon = (typeof GROUP_AVATAR_OPTIONS)[number]['icon'] | LegacyGroupAvatarIcon;

export const GROUP_STUDY_STYLE_OPTIONS = [
  { value: 'Visual', label: 'Visual' },
  { value: 'Auditory', label: 'Auditory' },
  { value: 'Reading/Writing', label: 'Reading / Writing' },
  { value: 'Kinesthetic', label: 'Hands-on' },
] as const;
export type GroupStudyStyle = (typeof GROUP_STUDY_STYLE_OPTIONS)[number]['value'];

export const GROUP_STUDY_TIME_OPTIONS = [
  { value: 'Morning', label: 'Morning' },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Evening', label: 'Evening' },
  { value: 'Flexible', label: 'Flexible' },
] as const;
export type GroupStudyTime = (typeof GROUP_STUDY_TIME_OPTIONS)[number]['value'];

export const GROUP_STUDY_MODE_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In person' },
  { value: 'either', label: 'Either' },
] as const;
export type GroupStudyMode = (typeof GROUP_STUDY_MODE_OPTIONS)[number]['value'];

export const GROUP_AVATAR_COLORS = ['#1a5f7a', '#15803d', '#7c3aed', '#c2410c', '#be123c', '#1d4ed8'] as const;
export type GroupAvatarColor = (typeof GROUP_AVATAR_COLORS)[number];

export interface GroupRecord {
  id: number;
  name: string;
  course: string;
  avatar_icon?: GroupAvatarIcon;
  avatar_color?: GroupAvatarColor;
  schedule?: string;
  description?: string | null;
  study_style?: GroupStudyStyle | null;
  preferred_study_time?: GroupStudyTime | null;
  study_mode?: GroupStudyMode | null;
  compatibility_score?: number;
  members?: number;
  role?: string;
  created_by?: number;
  request_status?: 'pending' | null;
  join_requests?: GroupJoinRequest[];
  creator?: { id: number; name: string } | null;
  members_list?: GroupMember[];
  average_rating?: number | null;
  ratings_count?: number;
  my_rating?: number | null;
  reviews?: GroupReview[];
}

export interface GroupMember {
  id: number;
  name: string;
  profile_photo_url?: string | null;
  role: string;
}

export interface GroupReview {
  id: number;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string;
}

export interface GroupJoinRequest {
  id: number;
  user_id: number;
  user_name: string;
  profile_photo_url?: string | null;
}

interface GroupListResponse extends ApiResponse {
  data?: {
    groups?: GroupRecord[];
    group?: GroupRecord;
  };
}

interface GroupDetailResponse extends ApiResponse {
  data?: { group?: GroupRecord };
}

export const fetchGroups = async (): Promise<GroupRecord[]> => {
  const response = await apiClient.get<GroupListResponse>('/groups');
  return response.data?.data?.groups ?? [];
};

export const discoverGroups = async (): Promise<GroupRecord[]> => {
  const response = await apiClient.get<GroupListResponse>('/groups/discover');
  return response.data?.data?.groups ?? [];
};

export const joinGroup = async (groupId: number): Promise<void> => {
  await apiClient.post(`/groups/${groupId}/join`);
};

export const fetchGroupDetails = async (groupId: number): Promise<GroupRecord> => {
  const response = await apiClient.get<GroupDetailResponse>(`/groups/${groupId}`);
  const group = response.data?.data?.group;
  if (!group) throw new Error('The server did not return the group details.');
  return group;
};

export const rateGroup = async (
  groupId: number,
  rating: number,
  comment: string
): Promise<void> => {
  await apiClient.post(`/groups/${groupId}/reviews`, { rating, comment });
};

export const respondToGroupJoinRequest = async (
  groupId: number,
  requestId: number,
  action: 'accept' | 'decline'
): Promise<void> => {
  await apiClient.patch(`/groups/${groupId}/join-requests/${requestId}`, { action });
};

export const leaveGroup = async (groupId: number, newAdminUserId?: number): Promise<void> => {
  await apiClient.delete(`/groups/${groupId}/leave`, {
    data: newAdminUserId ? { new_admin_user_id: newAdminUserId } : undefined,
  });
};

export const createGroup = async (payload: {
  name: string;
  course: string;
  avatar_icon: GroupAvatarIcon;
  avatar_color: GroupAvatarColor;
  study_style: GroupStudyStyle;
  preferred_study_time: GroupStudyTime;
  study_mode: GroupStudyMode;
  schedule?: string;
  description?: string;
}): Promise<GroupRecord> => {
  const response = await apiClient.post<GroupListResponse>('/groups', payload);
  const group = response.data?.data?.group;
  if (!group) {
    throw new Error('The server did not return the created group.');
  }
  return group;
};

export const updateGroup = async (
  groupId: number,
  payload: {
    name: string;
    course: string;
    avatar_icon: GroupAvatarIcon;
    avatar_color: GroupAvatarColor;
    study_style: GroupStudyStyle;
    preferred_study_time: GroupStudyTime;
    study_mode: GroupStudyMode;
    schedule: string;
    description: string;
  }
): Promise<GroupRecord> => {
  const response = await apiClient.put<GroupDetailResponse>(`/groups/${groupId}`, payload);
  const group = response.data?.data?.group;
  if (!group) throw new Error('The server did not return the updated group.');
  return group;
};

export const deleteGroup = async (groupId: number): Promise<void> => {
  await apiClient.delete(`/groups/${groupId}`);
};
