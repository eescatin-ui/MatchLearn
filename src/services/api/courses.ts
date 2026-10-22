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

const ACADEMIC_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedAcademicCatalog: AcademicCatalog | null = null;
let academicCatalogCachedAt = 0;
let academicCatalogRequest: Promise<AcademicCatalog> | null = null;

export const fetchAcademicCatalog = async (): Promise<AcademicCatalog> => {
  if (
    cachedAcademicCatalog
    && Date.now() - academicCatalogCachedAt < ACADEMIC_CATALOG_CACHE_TTL_MS
  ) {
    return cachedAcademicCatalog;
  }

  if (!academicCatalogRequest) {
    academicCatalogRequest = apiClient.get<{ data?: AcademicCatalog }>('/catalog')
      .then((response) => {
        if (!response.data?.data) {
          throw new Error('The server returned an invalid academic catalog.');
        }

        cachedAcademicCatalog = response.data.data;
        academicCatalogCachedAt = Date.now();
        return cachedAcademicCatalog;
      })
      .finally(() => {
        academicCatalogRequest = null;
      });
  }

  return academicCatalogRequest;
};
