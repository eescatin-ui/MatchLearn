import { apiClient } from './client';

export interface ReviewRecord {
  id: number;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  reviewer_profile_photo_url: string | null;
  reviewer_average_rating: number | null;
  reviewer_ratings_count: number;
  created_at: string;
}

export interface ReviewableBuddy {
  id: number;
  name: string;
  profile_photo_url: string | null;
  average_rating: number | null;
  ratings_count: number;
  my_rating: number | null;
  my_comment: string | null;
}

export interface MyBuddyReview {
  rating: number;
  comment: string | null;
}

interface ReviewResponse {
  success: boolean;
  data?: {
    reviews?: ReviewRecord[];
    reviewable_buddies?: ReviewableBuddy[];
    my_review?: MyBuddyReview | null;
    average_rating?: number | null;
    ratings_count?: number;
  };
}

export const fetchReviews = async (reviewUserId?: number) => {
  const response = await apiClient.get<ReviewResponse>('/reviews', {
    params: reviewUserId ? { review_user_id: reviewUserId } : undefined,
  });
  return {
    reviews: response.data.data?.reviews ?? [],
    reviewableBuddies: response.data.data?.reviewable_buddies ?? [],
    myReview: response.data.data?.my_review ?? null,
    averageRating: response.data.data?.average_rating ?? null,
    ratingsCount: response.data.data?.ratings_count ?? 0,
  };
};

export const submitReview = async (
  reviewedUserId: number,
  rating: number,
  comment: string
): Promise<void> => {
  await apiClient.post('/reviews', {
    reviewed_user_id: reviewedUserId,
    rating,
    comment,
  });
};
