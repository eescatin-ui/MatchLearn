import { apiClient } from './client';
import { AuthResponse } from '../../types/auth';
import * as SecureStore from 'expo-secure-store';

export class AuthApi {
  async loginWithGoogle(idToken: string, name?: string): Promise<AuthResponse> {
    const payload: { id_token: string; name?: string } = { id_token: idToken };
    if (name !== undefined) payload.name = name.trim();

    const response = await apiClient.post<AuthResponse>('/auth/google', {
      ...payload,
    });

    if (response.data.data?.token) {
      await SecureStore.setItemAsync('auth_token', response.data.data.token);
    }

    return response.data;
  }

  async getMe(): Promise<AuthResponse> {
    const response = await apiClient.get<AuthResponse>('/auth/me');
    return response.data;
  }

  async logout(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/logout');
    await SecureStore.deleteItemAsync('auth_token');
    return response.data;
  }

  async logoutAll(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/logout-all');
    await SecureStore.deleteItemAsync('auth_token');
    return response.data;
  }

  async deleteAccount(): Promise<void> {
    const response = await apiClient.delete<AuthResponse>('/auth/account');
    if (!response.data.success) {
      throw new Error(response.data.message || 'The account could not be deleted.');
    }
  }
}

export const authApi = new AuthApi();
