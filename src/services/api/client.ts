import {
  create,
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const apiRoot = (configuredApiUrl ?? 'https://matchlearn-backend-backup-1.onrender.com').replace(/\/+$/, '');
const API_BASE_URL = `${apiRoot}/api/v1`;

const TOKEN_KEY = 'auth_token';

const normalizeProfilePhotoUrls = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(normalizeProfilePhotoUrls);
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  Object.entries(record).forEach(([key, nestedValue]) => {
    if (
      (key === 'profile_photo_url' || key.endsWith('_profile_photo_url'))
      && typeof nestedValue === 'string'
    ) {
      const absoluteUrl = nestedValue.match(/^https?:\/\/[^/]+/i);
      if (absoluteUrl) {
        record[key] = `${apiRoot}${nestedValue.slice(absoluteUrl[0].length)}`;
      } else if (nestedValue.startsWith('/')) {
        record[key] = `${apiRoot}${nestedValue}`;
      }
      return;
    }

    normalizeProfilePhotoUrls(nestedValue);
  });
};

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/google',
];

const isPublicAuthEndpoint = (url?: string) => {
  if (!url) return false;

  return PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

const getErrorMessage = (error: any): string => {
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }

    if (data.errors && typeof data.errors === 'object') {
      const flattenedErrors = Object.values(data.errors)
        .flatMap((value: any) => (Array.isArray(value) ? value : [value]))
        .filter(Boolean)
        .map(String);

      if (flattenedErrors.length > 0) {
        return flattenedErrors.join('\n');
      }
    }
  }

  if (error?.message) {
    return error.message;
  }

  return `Request failed${error?.response?.status ? ` with status code ${error.response.status}` : ''}`;
};

export class ApiClient {
  private client: AxiosInstance;
  private pendingMutations = 0;
  private mutationListeners = new Set<() => void>();

  public subscribeToMutations = (listener: () => void): (() => void) => {
    this.mutationListeners.add(listener);
    return () => this.mutationListeners.delete(listener);
  };

  public hasPendingMutations = (): boolean => this.pendingMutations > 0;

  private notifyMutationListeners(): void {
    this.mutationListeners.forEach((listener) => listener());
  }

  private async runMutation<T>(request: () => Promise<T>): Promise<T> {
    this.pendingMutations += 1;
    this.notifyMutationListeners();

    try {
      return await request();
    } finally {
      this.pendingMutations -= 1;
      this.notifyMutationListeners();
    }
  }

  constructor() {
    this.client = create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    /**
     * REQUEST INTERCEPTOR
     *
     * Automatically gets the token from SecureStore
     * and adds it to every authenticated request.
     */
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const isPublicRequest = isPublicAuthEndpoint(config.url);

          if (isPublicRequest) {
            delete config.headers.Authorization;
            return config;
          }

          const token = await SecureStore.getItemAsync(TOKEN_KEY);

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Failed to read auth token:', error);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    /**
     * RESPONSE INTERCEPTOR
     *
     * Handles authentication errors.
     */
    this.client.interceptors.response.use(
      (response) => {
        normalizeProfilePhotoUrls(response.data);
        return response;
      },
      async (error: AxiosError) => {
        const requestUrl = error.config?.url ?? '';

        if (error.response?.status === 401 && !isPublicAuthEndpoint(requestUrl)) {
          console.warn('Authentication failed: 401 Unauthorized');

          // Remove invalid/expired token
          try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          } catch (storageError) {
            console.error(
              'Failed to remove invalid auth token:',
              storageError
            );
          }
        }

        const apiError = new Error(getErrorMessage(error)) as Error & {
          status?: number;
          response?: any;
        };

        apiError.status = error.response?.status;
        apiError.response = error.response?.data;

        return Promise.reject(apiError);
      }
    );
  }

  public async get<T = any>(
    url: string,
    config?: any
  ) {
    return this.client.get<T>(url, config);
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: any
  ) {
    return this.runMutation(() => this.client.post<T>(url, data, config));
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: any
  ) {
    return this.runMutation(() => this.client.put<T>(url, data, config));
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: any
  ) {
    return this.runMutation(() => this.client.patch<T>(url, data, config));
  }

  public async delete<T = any>(
    url: string,
    config?: any
  ) {
    return this.runMutation(() => this.client.delete<T>(url, config));
  }
}

export const apiClient = new ApiClient();