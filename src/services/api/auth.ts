import { apiClient } from './client';
import { AuthResponse } from '../../types/auth';
import * as SecureStore from 'expo-secure-store';

export class AuthApi {
  async register(name: string, email: string, password: string, passwordConfirmation: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      password_confirmation: passwordConfirmation,
    });

    if (response.data.data?.token) {
      await SecureStore.setItemAsync('auth_token', response.data.data.token);
    }

    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    // Store token securely
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
}

export const authApi = new AuthApi();
