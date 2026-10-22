import { apiClient } from './client';
import { Course } from '../../types/match';

export interface CourseListResponse {
  success: boolean;
  message: string;
  data?: {
    courses?: {
      id: number;
      code: string;
      name: string;
      department?: {
        id: number;
        name: string;
      } | null;
    }[];
  };
}

export const fetchCourses = async (): Promise<Course[]> => {
  const response = await apiClient.get<CourseListResponse>('/courses');
  return response.data?.data?.courses ?? [];
};

export interface AcademicCatalog {
  departments: {
    id: number;
    name: string;
    programs: { id: number; name: string; department_id: number }[];
  }[];
  learning_styles: { id: number; name: string }[];
  strengths: { id: number; name: string }[];
  weaknesses: { id: number; name: string }[];
}

export const fetchAcademicCatalog = async (): Promise<AcademicCatalog> => {
  const response = await apiClient.get<{ data?: AcademicCatalog }>('/catalog');
  if (!response.data?.data) {
    throw new Error('The server returned an invalid academic catalog.');
  }
  return response.data.data;
};
