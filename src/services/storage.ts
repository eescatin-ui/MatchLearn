
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export const storageService = {
  /**
   * Save authentication token securely
   */
  setToken: async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  /**
   * Get the stored authentication token
   */
  getToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  /**
   * Check if an authentication token exists
   */
  hasToken: async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token !== null && token.length > 0;
  },

  /**
   * Remove the stored authentication token
   */
  removeToken: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
