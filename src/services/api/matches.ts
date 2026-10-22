import { apiClient } from './client';
import { MatchRecord } from '../../types/match';

interface MatchListResponse {
  success: boolean;
  message: string;
  data?: {
    matches?: MatchRecord[];
  };
}

export const fetchMatches = async (): Promise<MatchRecord[]> => {
  const response = await apiClient.get<MatchListResponse>('/matches');
  return response.data?.data?.matches ?? [];
};

export const refreshMatches = async (): Promise<MatchRecord[]> => {
  const response = await apiClient.post<MatchListResponse>('/matches/refresh');
  return response.data?.data?.matches ?? [];
};
