import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppAlertProvider } from './src/components/AppAlert';
import { MutationLoadingOverlay } from './src/components/MutationLoadingOverlay';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.teal,
    background: colors.page,
    surface: colors.surface,
    onSurface: colors.text,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <AuthProvider>
          <RootNavigator />
          <AppAlertProvider />
          <MutationLoadingOverlay />
          <StatusBar style="auto" />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
