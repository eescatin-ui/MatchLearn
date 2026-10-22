import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types/auth';
import { authApi } from '../services/api/auth';
import { storageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserProfile: (updates: { name?: string; profilePhotoUrl?: string | null }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      const storedToken = await storageService.getToken();

      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      setToken(storedToken);

      const response = await authApi.getMe();

      if (response.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        await storageService.removeToken();
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Check auth error:', error);

      await storageService.removeToken();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(checkAuth);
  }, [checkAuth]);

  const register = async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => {
    const response = await authApi.register(
      name,
      email,
      password,
      passwordConfirmation
    );

    if (!response.success) {
      throw new Error(response.message);
    }

    if (!response.data?.user || !response.data.token) {
      throw new Error('Registration succeeded but no authentication token was received.');
    }

    await storageService.setToken(response.data.token);
    setUser(response.data.user);
    setToken(response.data.token);
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    if (!response.success) {
      throw new Error(response.message);
    }

    if (response.data?.user && response.data?.token) {
      const newToken = response.data.token;

      // Save token to storage
      await storageService.setToken(newToken);

      // Update React state
      setUser(response.data.user);
      setToken(newToken);
    } else {
      throw new Error('Login successful but no authentication token was received.');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      await storageService.removeToken();
    }
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      setUser(null);
      setToken(null);
      await storageService.removeToken();
    }
  };

  const updateUserProfile = (updates: { name?: string; profilePhotoUrl?: string | null }) => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current };
      if (updates.name !== undefined) updated.name = updates.name;
      if (updates.profilePhotoUrl !== undefined) updated.profile_photo_url = updates.profilePhotoUrl;
      if (updates.profilePhotoUrl !== undefined && current.profile) {
        updated.profile = { ...current.profile, profile_photo_url: updates.profilePhotoUrl };
      }
      return updated;
    });
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isSignedIn: !!token,
    register,
    login,
    logout,
    logoutAll,
    checkAuth,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};