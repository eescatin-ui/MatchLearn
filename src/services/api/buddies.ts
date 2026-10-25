import { apiClient } from './client';

export interface BuddyUserSummary {
  id: number;
  name: string;
  program: string | null;
  profile_photo_url: string | null;
  average_rating: number | null;
  ratings_count: number;
}

export interface BuddyProfile extends BuddyUserSummary {
  compatibility_score?: number | null;
  profile: {
    institution: string | null;
    gender: string | null;
    marital_status: string | null;
    department: string | null;
    program: string | null;
    year_level: number | null;
    learning_style: string | null;
    bio: string | null;
    phone_number?: string | null;
    address?: string | null;
    profile_photo_url: string | null;
    study_courses: { course_code: string; normalized_course_code: string; course_name: string }[];
    academic_strengths: string[];
    academic_needs: string[];
    study_mode: 'online' | 'in_person' | 'either' | null;
  } | null;
}

export interface BuddyRequestSummary {
  id: number;
  user: BuddyUserSummary;
}

export interface BuddyConnections {
  buddies: BuddyUserSummary[];
  incoming_requests: BuddyRequestSummary[];
  outgoing_requests: BuddyRequestSummary[];
}

export interface BlockedUserSummary {
  user_id: number;
  name: string;
}

interface BuddyConnectionsResponse {
  success: boolean;
  data?: BuddyConnections;
}

interface BuddyProfileResponse {
  success: boolean;
  data?: { buddy?: BuddyProfile };
}

interface BlockedUsersResponse {
  success: boolean;
  data?: { blocked_users?: BlockedUserSummary[] };
}

export const fetchBuddyConnections = async (): Promise<BuddyConnections> => {
  const response = await apiClient.get<BuddyConnectionsResponse>('/buddies');
  return response.data?.data ?? { buddies: [], incoming_requests: [], outgoing_requests: [] };
};

export const fetchBuddyProfile = async (userId: number): Promise<BuddyProfile> => {
  const response = await apiClient.get<BuddyProfileResponse>(`/buddies/${userId}`);
  const buddy = response.data?.data?.buddy;
  if (!buddy) throw new Error('The server did not return the buddy profile.');
  return buddy;
};

export const removeBuddy = async (userId: number): Promise<void> => {
  await apiClient.delete(`/buddies/${userId}`);
};

export const fetchBlockedUsers = async (): Promise<BlockedUserSummary[]> => {
  const response = await apiClient.get<BlockedUsersResponse>('/blocks');
  const users = response.data?.data?.blocked_users;
  if (!users) throw new Error('The server did not return your blocked users.');
  return users;
};

export const blockUser = async (userId: number): Promise<void> => {
  await apiClient.post('/blocks', { user_id: userId });
};

export const unblockUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/blocks/${userId}`);
};

export type UserReportReason =
  | 'harassment'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'privacy_or_safety'
  | 'other';

export interface BuddyReport {
  id: number;
  reasons: UserReportReason[];
  details: string | null;
}

interface BuddyReportResponse {
  success: boolean;
  data?: { report?: BuddyReport | null };
}

export const fetchBuddyReport = async (userId: number): Promise<BuddyReport | null> => {
  const response = await apiClient.get<BuddyReportResponse>(`/reports/users/${userId}`);
  return response.data?.data?.report ?? null;
};

export const reportBuddy = async (
  userId: number,
  reasons: UserReportReason[],
  details: string
): Promise<BuddyReport> => {
  const response = await apiClient.post<BuddyReportResponse>('/reports/users', {
    reported_user_id: userId,
    reasons,
    details,
  });
  const report = response.data?.data?.report;
  if (!report) throw new Error('The server did not return your report.');
  return report;
};

export const updateBuddyReport = async (
  userId: number,
  reasons: UserReportReason[],
  details: string
): Promise<BuddyReport> => {
  const response = await apiClient.put<BuddyReportResponse>(`/reports/users/${userId}`, {
    reasons,
    details,
  });
  const report = response.data?.data?.report;
  if (!report) throw new Error('The server did not return your updated report.');
  return report;
};

export const withdrawBuddyReport = async (userId: number): Promise<void> => {
  await apiClient.delete(`/reports/users/${userId}`);
};

export const sendBuddyRequest = async (userId: number): Promise<void> => {
  await apiClient.post('/buddies/requests', { user_id: userId });
};

export const respondToBuddyRequest = async (
  requestId: number,
  action: 'accept' | 'decline'
): Promise<void> => {
  await apiClient.patch(`/buddies/requests/${requestId}`, { action });
};
