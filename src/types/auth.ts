export interface User {
  id: number;
  name: string;
  email: string;
  is_suspended: boolean;
  profile?: Profile;
  profile_photo_url?: string | null;
  created_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  institution: string;
  department_id: number | null;
  program_id: number | null;
  year_level: number | null;
  learning_style_id: number | null;
  bio: string | null;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token?: string;
  };
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}
