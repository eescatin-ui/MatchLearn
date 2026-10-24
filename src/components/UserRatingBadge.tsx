import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserRatingBadgeProps {
  averageRating?: number | null;
  ratingsCount?: number;
  showRatingsCount?: boolean;
}

export default function UserRatingBadge({
  averageRating,
  ratingsCount = 0,
  showRatingsCount = true,
}: UserRatingBadgeProps) {
  if (averageRating == null || ratingsCount < 1) return null;

  return (
    <View
      style={styles.badge}
      accessibilityLabel={showRatingsCount
        ? `Rated ${averageRating.toFixed(1)} out of 5 from ${ratingsCount} ${ratingsCount === 1 ? 'rating' : 'ratings'}`
        : `Rated ${averageRating.toFixed(1)} out of 5`}
    >
      <Ionicons name="star" size={8} color="#d97706" />
      <Text style={styles.text}>
        {averageRating.toFixed(1)}{showRatingsCount ? ` · ${ratingsCount > 99 ? '99+' : ratingsCount}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minHeight: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  text: {
    color: '#92400e',
    fontSize: 8,
    fontWeight: '800',
  },
});
