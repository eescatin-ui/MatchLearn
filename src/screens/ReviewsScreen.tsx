import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import UserRatingBadge from '../components/UserRatingBadge';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { colors } from '../theme';
import {
  fetchReviews,
  ReviewableBuddy,
  ReviewRecord,
  submitReview,
} from '../services/api/reviews';

const ratingLabels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function ReviewsScreen({ navigation, route }: any) {
  const routeReviewUserId = route?.params?.reviewUserId as number | undefined;
  const routeReviewUserName = route?.params?.reviewUserName as string | undefined;
  const routeReviewUserPhoto = route?.params?.reviewUserPhoto as string | null | undefined;
  const [chosenBuddyId, setChosenBuddyId] = useState<number | null>(null);
  const [chosenBuddyName, setChosenBuddyName] = useState<string | null>(null);
  const [chosenBuddyPhoto, setChosenBuddyPhoto] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewableBuddies, setReviewableBuddies] = useState<ReviewableBuddy[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBuddyId = chosenBuddyId ?? routeReviewUserId ?? null;
  const selectedBuddyName = chosenBuddyId ? chosenBuddyName : routeReviewUserName;

  const load = useCallback(async () => {
    try {
      const result = await fetchReviews(selectedBuddyId ?? undefined);
      setReviews(result.reviews);
      setReviewableBuddies(result.reviewableBuddies);
      setAverageRating(result.averageRating);
      setRatingsCount(result.ratingsCount);
      setRating(result.myReview?.rating ?? 0);
      setComment(result.myReview?.comment ?? '');
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [selectedBuddyId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const handleSubmit = async () => {
    if (!selectedBuddyId) {
      Alert.alert('Choose a study buddy', 'Select the buddy you want to rate.');
      return;
    }
    if (!rating) {
      Alert.alert('Choose a rating', 'Select an overall star rating before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      await submitReview(selectedBuddyId, rating, comment.trim());
      await load();
      Alert.alert('Rating saved', `Your overall rating for ${selectedBuddyName ?? 'your buddy'} has been saved.`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Please try again.';
      Alert.alert(
        message.includes('Complete at least one study session')
          ? 'Study session required'
          : 'Could not save rating',
        message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectBuddy = (buddy: ReviewableBuddy) => {
    setChosenBuddyId(buddy.id);
    setChosenBuddyName(buddy.name);
    setChosenBuddyPhoto(buddy.profile_photo_url);
  };

  const handleBack = () => {
    if (chosenBuddyId) {
      setChosenBuddyId(null);
      setChosenBuddyName(null);
      setChosenBuddyPhoto(null);
      return;
    }
    navigation.goBack();
  };

  const selectedBuddy = reviewableBuddies.find((buddy) => buddy.id === selectedBuddyId);
  const buddyName = selectedBuddyName ?? selectedBuddy?.name ?? 'your study buddy';
  const buddyPhoto = chosenBuddyId ? chosenBuddyPhoto : selectedBuddy?.profile_photo_url ?? routeReviewUserPhoto;

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={chosenBuddyId ? 'Back to buddy reviews' : 'Go back'}
        >
          <Ionicons name="arrow-back" size={19} color={colors.teal} />
          <Text style={styles.backButtonText}>{chosenBuddyId ? 'All reviews' : 'Back'}</Text>
        </TouchableOpacity>
        <AppHeader
          title={selectedBuddyId ? 'Rate your buddy' : 'Buddy reviews'}
          subtitle={selectedBuddyId ? buddyName : 'Ratings and feedback'}
          navigation={navigation}
        />
        {loading ? <ActivityIndicator style={styles.loading} color="#1a5f7a" /> : error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}><Ionicons name="cloud-offline-outline" size={24} color="#b91c1c" /></View>
            <Text style={styles.sectionTitle}>Couldn’t load reviews</Text>
            <Text style={styles.body}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); void load(); }} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : selectedBuddyId ? (
          <>
            <View style={styles.buddyProfile}>
              <View style={styles.buddyProfileAvatarWrap}>
                <View style={styles.buddyProfileAvatar}>
                  {buddyPhoto ? (
                    <Image source={{ uri: buddyPhoto }} style={styles.buddyProfilePhoto} accessibilityLabel={`${buddyName}'s profile photo`} />
                  ) : (
                    <Text style={styles.buddyProfileInitials}>{buddyName.slice(0, 2).toUpperCase()}</Text>
                  )}
                </View>
                <UserRatingBadge averageRating={averageRating} ratingsCount={ratingsCount} />
              </View>
              <View style={styles.buddyProfileCopy}>
                <Text style={styles.buddyProfileName}>{buddyName}</Text>
                <Text style={styles.body}>Study buddy profile</Text>
              </View>
            </View>
            <View style={styles.summary}>
              <View style={styles.summaryScore}>
                <Text style={styles.rating}>{averageRating === null ? '—' : averageRating.toFixed(1)}</Text>
                <Text style={styles.summaryCaption}>BUDDY RATING</Text>
              </View>
              <View style={styles.summaryDetails}>
                <View style={styles.averageStars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Text
                      key={value}
                      style={[styles.averageStar, averageRating !== null && value <= Math.round(averageRating) && styles.starActive]}
                    >
                      {averageRating !== null && value <= Math.round(averageRating) ? '★' : '☆'}
                    </Text>
                  ))}
                </View>
                <Text style={styles.body}>
                  {ratingsCount ? `${ratingsCount} overall rating${ratingsCount === 1 ? '' : 's'}` : 'No ratings yet'}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.formHeading}>
                <View style={styles.formIcon}><Ionicons name="star" size={20} color="#d97706" /></View>
                <View style={styles.formHeadingCopy}>
                  <Text style={styles.sectionTitle}>{rating > 0 ? 'Update your rating' : 'Your overall rating'}</Text>
                  <Text style={styles.body}>How was your experience with {buddyName}?</Text>
                </View>
              </View>

              <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Overall rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.starButton, value <= rating && styles.starButtonActive]}
                    onPress={() => setRating(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: rating === value }}
                    accessibilityLabel={`${value} out of 5, ${ratingLabels[value - 1]}`}
                  >
                    <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={28} color={value <= rating ? '#d97706' : '#cbd5e1'} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.ratingHintRow}>
                <Text style={styles.ratingHint}>Tap a star to rate</Text>
                {rating > 0 ? <Text style={styles.ratingLabel}>{ratingLabels[rating - 1]}</Text> : null}
              </View>
              <Text style={styles.fieldLabel}>Optional comment</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Share a few words about your overall experience"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                multiline
                maxLength={2000}
                textAlignVertical="top"
                accessibilityLabel="Optional review comment"
              />
              <Text style={styles.characterCount}>{comment.length} / 2000</Text>
              <TouchableOpacity
                style={[styles.submit, (submitting || rating === 0) && styles.disabled]}
                disabled={submitting || rating === 0}
                onPress={() => { void handleSubmit(); }}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                <Text style={styles.submitText}>{submitting ? 'Saving…' : 'Save rating'}</Text>
              </TouchableOpacity>
              <Text style={styles.privacyHint}>Your feedback helps build a supportive study community.</Text>
            </View>

            <View style={styles.reviewList}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>What people say</Text>
                  <Text style={styles.sectionSubtitle}>Feedback from this buddy’s study partners</Text>
                </View>
                <View style={styles.countPill}><Text style={styles.countText}>{reviews.length}</Text></View>
              </View>
              {reviews.length ? reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeading}>
                    <View style={styles.reviewIdentity}>
                      <View style={styles.reviewerAvatarWrap}>
                        <View style={styles.reviewerAvatar}>
                        {review.reviewer_profile_photo_url ? (
                          <Image
                            source={{ uri: review.reviewer_profile_photo_url }}
                            style={styles.personPhoto}
                            accessibilityLabel={`${review.reviewer_name}'s profile photo`}
                          />
                        ) : (
                          <Text style={styles.reviewerInitial}>{review.reviewer_name.slice(0, 1).toUpperCase()}</Text>
                        )}
                        </View>
                        <UserRatingBadge
                          averageRating={review.reviewer_average_rating}
                          ratingsCount={review.reviewer_ratings_count}
                        />
                      </View>
                      <View>
                        <Text style={styles.cardTitle}>{review.reviewer_name}</Text>
                        <Text style={styles.date}>{new Date(review.created_at).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewScorePill}>
                      <Ionicons name="star" size={13} color="#d97706" />
                      <Text style={styles.reviewScore}>{review.rating}.0</Text>
                    </View>
                  </View>
                  {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : (
                    <Text style={styles.body}>Star rating only</Text>
                  )}
                </View>
              )) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={23} color="#1a5f7a" /></View>
                  <Text style={styles.emptyTitle}>No feedback yet</Text>
                  <Text style={styles.body}>Ratings and comments from study buddies will show up here.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryScore}>
                <Text style={styles.summaryLabel}>YOUR RATING</Text>
                <Text style={styles.rating}>{averageRating === null ? '—' : averageRating.toFixed(1)}</Text>
              </View>
              <View style={styles.summaryDetails}>
                <View style={styles.averageStars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Text
                      key={value}
                      style={[styles.averageStar, averageRating !== null && value <= Math.round(averageRating) && styles.starActive]}
                    >
                      {averageRating !== null && value <= Math.round(averageRating) ? '★' : '☆'}
                    </Text>
                  ))}
                </View>
                <Text style={styles.body}>
                  {ratingsCount ? `${ratingsCount} rating${ratingsCount === 1 ? '' : 's'} from your buddies` : 'Your buddies’ ratings will appear here'}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>Rate a study buddy</Text>
                  <Text style={styles.sectionSubtitle}>Choose someone you’re connected with</Text>
                </View>
                <View style={styles.sectionIcon}><Ionicons name="people-outline" size={19} color="#1a5f7a" /></View>
              </View>
              {reviewableBuddies.length ? reviewableBuddies.map((buddy) => (
                <TouchableOpacity
                  key={buddy.id}
                  style={styles.buddyOption}
                  onPress={() => selectBuddy(buddy)}
                  accessibilityRole="button"
                  accessibilityLabel={`${buddy.my_rating ? 'Edit rating for' : 'Rate'} ${buddy.name}`}
                >
                  <View style={styles.buddyAvatarWrap}>
                    <View style={styles.buddyAvatar}>
                      {buddy.profile_photo_url ? (
                        <Image
                          source={{ uri: buddy.profile_photo_url }}
                          style={styles.personPhoto}
                          accessibilityLabel={`${buddy.name}'s profile photo`}
                        />
                      ) : (
                        <Text style={styles.buddyInitial}>{buddy.name.slice(0, 1).toUpperCase()}</Text>
                      )}
                    </View>
                    <UserRatingBadge averageRating={buddy.average_rating} ratingsCount={buddy.ratings_count} />
                  </View>
                  <View style={styles.buddyCopy}>
                    <Text style={styles.cardTitle}>{buddy.name}</Text>
                    <Text style={styles.body}>
                      {buddy.my_rating ? `Your rating · ${buddy.my_rating}/5` : 'You haven’t rated them yet'}
                    </Text>
                  </View>
                  <View style={styles.rateAction}>
                    <Text style={styles.rateActionText}>{buddy.my_rating ? 'Edit' : 'Rate'}</Text>
                    <Ionicons name="chevron-forward" size={15} color="#1a5f7a" />
                  </View>
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyInline}>
                  <Ionicons name="people-outline" size={23} color="#94a3b8" />
                  <Text style={styles.body}>Connect with a study buddy to leave an overall rating.</Text>
                </View>
              )}
            </View>

            <View style={styles.reviewList}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>Ratings about you</Text>
                  <Text style={styles.sectionSubtitle}>Kind words from your buddies</Text>
                </View>
                <View style={styles.countPill}><Text style={styles.countText}>{reviews.length}</Text></View>
              </View>
              {reviews.length ? reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeading}>
                    <View style={styles.reviewIdentity}>
                      <View style={styles.reviewerAvatarWrap}>
                        <View style={styles.reviewerAvatar}>
                        {review.reviewer_profile_photo_url ? (
                          <Image
                            source={{ uri: review.reviewer_profile_photo_url }}
                            style={styles.personPhoto}
                            accessibilityLabel={`${review.reviewer_name}'s profile photo`}
                          />
                        ) : (
                          <Text style={styles.reviewerInitial}>{review.reviewer_name.slice(0, 1).toUpperCase()}</Text>
                        )}
                        </View>
                        <UserRatingBadge
                          averageRating={review.reviewer_average_rating}
                          ratingsCount={review.reviewer_ratings_count}
                        />
                      </View>
                      <View>
                        <Text style={styles.cardTitle}>{review.reviewer_name}</Text>
                        <Text style={styles.date}>{new Date(review.created_at).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewScorePill}>
                      <Ionicons name="star" size={13} color="#d97706" />
                      <Text style={styles.reviewScore}>{review.rating}.0</Text>
                    </View>
                  </View>
                  {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : (
                    <Text style={styles.body}>Star rating only</Text>
                  )}
                </View>
              )) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={23} color="#1a5f7a" /></View>
                  <Text style={styles.emptyTitle}>Nothing here yet</Text>
                  <Text style={styles.body}>Ratings shared by your study buddies will appear here.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.page },
  content: {
    flex: 1,
    backgroundColor: colors.page,
  },
  contentInner: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 36, gap: 14 },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#e8f1f5',
  },
  backButtonText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  loading: { marginTop: 32 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buddyProfile: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  buddyProfileAvatarWrap: { width: 54, height: 54, position: 'relative' },
  buddyProfileAvatar: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buddyProfilePhoto: { width: '100%', height: '100%' },
  buddyProfileInitials: { color: colors.teal, fontSize: 17, fontWeight: '800' },
  buddyProfileCopy: { flex: 1, gap: 3 },
  buddyProfileName: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  summaryScore: {
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#e8edf2',
  },
  summaryLabel: { color: '#64748b', fontSize: 10, letterSpacing: 0.8, fontWeight: '800' },
  summaryCaption: { color: '#64748b', fontSize: 9, letterSpacing: 0.7, fontWeight: '800' },
  summaryDetails: { flex: 1, gap: 5 },
  rating: { color: colors.navy, fontSize: 34, lineHeight: 40, fontWeight: '800' },
  averageStars: { flexDirection: 'row', gap: 2 },
  averageStar: { color: '#cbd5e1', fontSize: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    gap: 10,
  },
  errorIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  retryButton: { marginTop: 4, backgroundColor: '#1a5f7a', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  retryText: { color: '#fff', fontWeight: '800' },
  sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: '#64748b', fontSize: 12, lineHeight: 17, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center' },
  countPill: { minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#1a5f7a', fontSize: 12, fontWeight: '800' },
  cardTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  body: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  formHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formHeadingCopy: { flex: 1, gap: 3 },
  formIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 2 },
  starButton: { flex: 1, height: 52, borderRadius: 15, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eef2f6' },
  starButtonActive: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  starActive: { color: '#f59e0b' },
  ratingHintRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 },
  ratingHint: { color: '#94a3b8', fontSize: 11 },
  ratingLabel: { color: '#9a6200', fontSize: 12, fontWeight: '800' },
  fieldLabel: { color: '#334155', fontSize: 13, fontWeight: '800', marginTop: 2 },
  input: {
    minHeight: 100,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3eb',
    borderRadius: 14,
    padding: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  characterCount: { color: '#94a3b8', fontSize: 11, textAlign: 'right', marginTop: -7 },
  submit: { backgroundColor: '#1a5f7a', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.55 },
  privacyHint: { color: '#94a3b8', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  reviewList: { gap: 10, marginTop: 2 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, gap: 12, borderWidth: 1, borderColor: colors.border },
  reviewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reviewIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  reviewerAvatarWrap: { width: 38, height: 38, position: 'relative' },
  reviewerAvatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  personPhoto: { width: '100%', height: '100%', borderRadius: 13 },
  reviewerInitial: { color: '#1a5f7a', fontSize: 15, fontWeight: '800' },
  reviewScorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  reviewScore: { color: '#9a6200', fontSize: 12, fontWeight: '800' },
  comment: { color: '#334155', fontSize: 14, lineHeight: 21 },
  date: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 22, gap: 8, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { color: '#0d3b4f', fontSize: 15, fontWeight: '800' },
  emptyInline: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', padding: 14, borderRadius: 14 },
  buddyOption: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eef2f6' },
  buddyAvatarWrap: { width: 42, height: 42, position: 'relative' },
  buddyAvatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#e8f1f5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buddyInitial: { color: '#1a5f7a', fontSize: 16, fontWeight: '800' },
  buddyCopy: { flex: 1, gap: 3 },
  rateAction: { flexDirection: 'row', alignItems: 'center', gap: 1, backgroundColor: '#e8f1f5', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  rateActionText: { color: '#1a5f7a', fontSize: 12, fontWeight: '800' },
});
