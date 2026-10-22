import { apiClient } from './client';
import { StudyCourseSubject } from '../../types/match';

export type StudyMode = 'online' | 'in_person' | 'either' | '';
export type StudyCourseInput = Pick<StudyCourseSubject, 'course_code' | 'course_name'>;

export interface ProfileRecord {
  student_id?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  phone_number?: string | null;
  phone_number_public?: boolean;
  address?: string | null;
  address_public?: boolean;
  profile_photo_url?: string | null;
  year_level?: number | null;
  bio?: string | null;
  study_courses?: StudyCourseSubject[] | null;
  academic_strengths?: string[] | null;
  academic_needs?: string[] | null;
  study_mode?: Exclude<StudyMode, ''> | null;
  department?: { name?: string } | null;
  program?: { name?: string } | null;
  learning_style?: { name?: string } | null;
}

export interface ProfileResponse {
  success: boolean;
  data?: {
    profile?: ProfileRecord;
    course_ids?: number[];
    strength_ids?: number[];
    weakness_ids?: number[];
    availabilities?: { day_of_week: string; start_time: string; end_time: string }[];
  };
}

export interface ProfilePayload {
  name?: string;
  student_id?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  phone_number?: string | null;
  phone_number_public: boolean;
  address?: string | null;
  address_public: boolean;
  institution: 'SNSU' | 'SSCT';
  department_id?: number | null;
  program_id?: number | null;
  year_level?: number | null;
  learning_style_id?: number | null;
  study_courses: StudyCourseInput[];
  academic_strengths: string[];
  academic_needs: string[];
  study_mode: 'online' | 'in_person' | 'either' | null;
  bio?: string | null;
  availabilities?: { day_of_week: string; start_time: string; end_time: string }[];
}

const availabilityTimeRange: Record<string, { start_time: string; end_time: string }> = {
  Morning: { start_time: '08:00', end_time: '12:00' },
  Afternoon: { start_time: '12:00', end_time: '17:00' },
  Evening: { start_time: '17:00', end_time: '21:00' },
  Flexible: { start_time: '08:00', end_time: '21:00' },
};

const normalizeLearningStyleName = (value?: string): string => {
  const map: Record<string, string> = {
    'Project-based': 'Kinesthetic',
    'Project-based learning': 'Kinesthetic',
    'Reading-based': 'Reading/Writing',
    'Reading and note-taking': 'Reading/Writing',
    'Independent study': 'Reading/Writing',
    'Practice questions': 'Reading/Writing',
    'Group study': 'Auditory',
    'Discussion and teach-back': 'Auditory',
    'Peer tutoring': 'Auditory',
    'Visual learning': 'Visual',
    'Diagrams and mind maps': 'Visual',
    Flashcards: 'Visual',
    'Quick review': 'Visual',
    'Hands-on practice': 'Kinesthetic',
    'Problem-solving exercises': 'Kinesthetic',
  };

  return map[value ?? ''] ?? value ?? '';
};

const normalizeStudyStyle = (value?: string): string => {
  const map: Record<string, string> = {
    Visual: 'Visual learning',
    Auditory: 'Discussion and teach-back',
    'Reading/Writing': 'Reading and note-taking',
    Kinesthetic: 'Hands-on practice',
    'Quick review': 'Visual learning',
    'Reading-based': 'Reading and note-taking',
    'Project-based': 'Project-based learning',
  };

  return map[value ?? ''] ?? value ?? '';
};

const normalizeYearLevel = (value?: string): number | null => {
  const map: Record<string, number> = {
    '1st Year': 1,
    '2nd Year': 2,
    '3rd Year': 3,
    '4th Year': 4,
    '5th Year': 5,
  };

  return map[value ?? ''] ?? null;
};

export const profileApi = {
  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponse>('/profiles');
    return response.data;
  },

  async saveProfile(payload: ProfilePayload): Promise<ProfileResponse> {
    try {
      const response = await apiClient.post<ProfileResponse>('/profiles', payload);
      return response.data;
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status ?? null;
      const responseData = error?.response;
      const responseMessage = String(responseData?.message ?? error?.message ?? '');
      const studentIdErrors = responseData?.errors?.student_id;
      const studentIdAlreadyTaken = Array.isArray(studentIdErrors)
        && studentIdErrors.some((message: unknown) => (
          typeof message === 'string' && message.toLowerCase().includes('already been taken')
        ));
      const profileAlreadyExists = responseMessage.toLowerCase().includes('profile already exists');

      if (status === 422 && profileAlreadyExists) {
        const updateResponse = await apiClient.put<ProfileResponse>('/profiles', payload);
        return updateResponse.data;
      }

      if (status === 422 && studentIdAlreadyTaken) {
        try {
          await profileApi.getProfile();
        } catch (lookupError: any) {
          const lookupStatus = lookupError?.status ?? lookupError?.response?.status;
          if (lookupStatus === 404) {
            throw error;
          }

          throw lookupError;
        }

        const updateResponse = await apiClient.put<ProfileResponse>('/profiles', payload);
        return updateResponse.data;
      }

      throw error;
    }
  },

  async uploadProfilePhoto(uri: string, fileName: string | null, mimeType: string | null): Promise<string> {
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: fileName ?? 'profile-photo.jpg',
      type: mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const response = await apiClient.post<{
      success: boolean;
      data?: { profile_photo_url?: string };
    }>('/profiles/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const photoUrl = response.data.data?.profile_photo_url;
    if (!photoUrl) throw new Error('The server did not return the uploaded profile photo.');
    return photoUrl;
  },

  normalizeProfilePayload(profile: {
    studentId?: string;
    gender?: string;
    maritalStatus?: string;
    phoneNumber?: string;
    phoneNumberPublic?: boolean;
    address?: string;
    addressPublic?: boolean;
    program: string;
    department: string;
    yearLevel: string;
    studyMode: StudyMode;
    preferredTime: string;
    studyStyle: string;
    bio?: string;
    institution: 'SNSU' | 'SSCT';
    studyCourses: StudyCourseInput[];
    academicStrengths: string[];
    academicNeeds: string[];
    availabilityDays: string[];
    departments: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    learningStyles: { id: number; name: string }[];
  }): ProfilePayload {
    const sanitizedBio = profile.bio?.trim();

    const payload: ProfilePayload = {
      student_id: profile.studentId?.trim() ? profile.studentId.trim() : null,
      gender: profile.gender || null,
      marital_status: profile.maritalStatus || null,
      phone_number: profile.phoneNumber?.trim() ? profile.phoneNumber.trim() : null,
      phone_number_public: profile.phoneNumberPublic ?? false,
      address: profile.address?.trim() ? profile.address.trim() : null,
      address_public: profile.addressPublic ?? false,
      institution: profile.institution,
      department_id: profile.departments.find((item) => item.name === profile.department)?.id ?? null,
      program_id: profile.programs.find((item) => item.name === profile.program)?.id ?? null,
      year_level: normalizeYearLevel(profile.yearLevel),
      study_courses: profile.studyCourses,
      academic_strengths: profile.academicStrengths,
      academic_needs: profile.academicNeeds,
      study_mode: profile.studyMode || null,
      learning_style_id: profile.learningStyles.find(
        (item) => item.name === normalizeLearningStyleName(profile.studyStyle)
      )?.id ?? null,
      bio: sanitizedBio || null,
      availabilities: profile.availabilityDays.map((day) => ({
        day_of_week: day,
        ...(availabilityTimeRange[profile.preferredTime] ?? availabilityTimeRange.Flexible),
      })),
    };

    return payload;
  },

  mapProfileToForm(profile: ProfileRecord): {
    studentId: string;
    gender: string;
    maritalStatus: string;
    phoneNumber: string;
    phoneNumberPublic: boolean;
    address: string;
    addressPublic: boolean;
    program: string;
    department: string;
    yearLevel: string;
    studyMode: StudyMode;
    studyStyle: string;
    bio: string;
  } {
    const yearLevelMap: Record<number, string> = {
      1: '1st Year',
      2: '2nd Year',
      3: '3rd Year',
      4: '4th Year',
      5: '5th Year',
    };

    return {
      studentId: profile.student_id ?? '',
      gender: profile.gender ?? '',
      maritalStatus: profile.marital_status ?? '',
      phoneNumber: profile.phone_number ?? '',
      phoneNumberPublic: profile.phone_number_public ?? false,
      address: profile.address ?? '',
      addressPublic: profile.address_public ?? false,
      program: profile.program?.name ?? '',
      department: profile.department?.name ?? '',
      yearLevel: profile.year_level ? yearLevelMap[profile.year_level] ?? '' : '',
      studyMode: profile.study_mode ?? '',
      studyStyle: normalizeStudyStyle(profile.learning_style?.name ?? ''),
      bio: profile.bio ?? '',
    };
  },
};
