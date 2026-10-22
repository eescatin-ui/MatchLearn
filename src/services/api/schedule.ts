import { apiClient } from './client';
import { GroupAvatarColor, GroupAvatarIcon } from './groups';

export interface StudySessionRecord {
  id: number;
  host_user_id: number;
  participant_user_id: number | null;
  study_group_id: number | null;
  target_type: 'buddy' | 'group';
  other_user_name: string;
  other_user_profile_photo_url: string | null;
  group_avatar_icon: GroupAvatarIcon | null;
  group_avatar_color: GroupAvatarColor | null;
  topic: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  is_past: boolean;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
}

interface SessionResponse {
  success: boolean;
  data?: { sessions?: StudySessionRecord[]; session?: StudySessionRecord };
}

export const fetchStudySessions = async (): Promise<StudySessionRecord[]> => {
  const response = await apiClient.get<SessionResponse>('/sessions');
  return response.data.data?.sessions ?? [];
};

export const createStudySession = async (payload: {
  participant_user_id?: number;
  study_group_id?: number;
  topic: string;
  starts_at: string;
  ends_at: string;
  location: string;
}): Promise<StudySessionRecord> => {
  const response = await apiClient.post<SessionResponse>('/sessions', payload);
  const session = response.data.data?.session;
  if (!session) throw new Error('The server did not return the created session.');
  return session;
};

export const updateStudySessionStatus = async (
  id: number,
  status: StudySessionRecord['status']
): Promise<StudySessionRecord> => {
  const response = await apiClient.patch<SessionResponse>(`/sessions/${id}`, { status });
  const session = response.data.data?.session;
  if (!session) throw new Error('The server did not return the updated session.');
  return session;
};

export const updateStudySessionDetails = async (
  id: number,
  payload: { topic: string; starts_at: string; ends_at: string; location: string }
): Promise<StudySessionRecord> => {
  const response = await apiClient.patch<SessionResponse>(`/sessions/${id}`, payload);
  const session = response.data.data?.session;
  if (!session) throw new Error('The server did not return the updated session.');
  return session;
};

export const deleteStudySession = async (id: number): Promise<void> => {
  await apiClient.delete(`/sessions/${id}`);
};
