import React from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/icon.png')}
        style={styles.logo}
      />
      <ActivityIndicator size="large" color={colors.teal} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.page,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});
