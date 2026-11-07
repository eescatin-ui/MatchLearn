import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserRatingBadgeProps {
  averageRating?: number | string | null;
  ratingsCount?: number | string;
  showRatingsCount?: boolean;
  compact?: boolean;
}

export default function UserRatingBadge({
  averageRating,
  ratingsCount = 0,
  showRatingsCount = false,
  compact = false,
}: UserRatingBadgeProps) {
  const numericRating = averageRating == null ? NaN : Number(averageRating);
  const numericRatingsCount = Number(ratingsCount);
  if (!Number.isFinite(numericRating)
    || numericRating < 1
    || numericRating > 5
    || !Number.isFinite(numericRatingsCount)
    || numericRatingsCount < 1) {
    return null;
  }

  return (
    <View
      style={[styles.badge, compact && styles.compactBadge]}
      accessibilityLabel={showRatingsCount
        ? `Rated ${numericRating.toFixed(1)} out of 5 from ${numericRatingsCount} ${numericRatingsCount === 1 ? 'rating' : 'ratings'}`
        : `Rated ${numericRating.toFixed(1)} out of 5`}
    >
      <Ionicons name="star" size={compact ? 6 : 8} color="#d97706" />
      <Text style={[styles.text, compact && styles.compactText]}>
        {numericRating.toFixed(1)}{showRatingsCount ? ` · ${numericRatingsCount > 99 ? '99+' : numericRatingsCount}` : ''}
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
  compactBadge: {
    top: -3,
    right: -5,
    minHeight: 13,
    paddingHorizontal: 3,
    gap: 1,
  },
  compactText: {
    fontSize: 6,
  },
});
