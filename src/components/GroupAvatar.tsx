import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupAvatarColor, GroupAvatarIcon } from '../services/api/groups';

interface GroupAvatarProps {
  icon?: GroupAvatarIcon;
  color?: GroupAvatarColor;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function GroupAvatar({
  icon = 'book-outline',
  color = '#1a5f7a',
  size = 44,
  style,
}: GroupAvatarProps) {
  return (
    <View style={[styles.avatar, style, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: color }]}>
      <Ionicons name={icon} size={size * 0.5} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
