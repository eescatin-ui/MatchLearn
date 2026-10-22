import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GroupPreferencePicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: '#475569', fontSize: 12, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { minHeight: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  optionSelected: { backgroundColor: '#eaf4f7', borderColor: '#1a5f7a' },
  optionText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  optionTextSelected: { color: '#0d3b4f' },
});
