import React from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/brand-logo.png')}
        style={styles.logo}
        resizeMode="contain"
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
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});
