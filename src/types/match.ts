export interface Course {
  id: number;
  code: string;
  name: string;
  department?: {
    id: number;
    name: string;
  } | null;
}

export interface MatchProfile {
  id: number;
  profile_photo_url: string | null;
  institution: string;
  gender: string | null;
  marital_status: string | null;
  year_level: number | null;
  learning_style: string | null;
  program: string | null;
  study_courses: StudyCourseSubject[];
  academic_strengths: string[];
  academic_needs: string[];
  study_mode: 'online' | 'in_person' | 'either' | null;
  bio: string | null;
  phone_number?: string | null;
  address?: string | null;
}

export interface StudyCourseSubject {
  course_code: string;
  normalized_course_code: string;
  course_name: string;
}

export interface MatchUser {
  id: number;
  name: string;
  average_rating: number | null;
  ratings_count: number;
  profile: MatchProfile | null;
  courses: Course[];
}

export interface MatchRecord {
  id: number;
  user_id: number;
  matched_user_id: number;
  compatibility_score: number;
  shared_course_count: number;
  reasons: string[];
  matched_user: MatchUser;
}
