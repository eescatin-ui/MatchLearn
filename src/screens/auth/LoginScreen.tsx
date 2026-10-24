import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import { Button, TextInput, Text } from 'react-native-paper';
import {
  GoogleOneTapSignIn,
  GoogleSignInButton,
  isErrorWithCode,
  statusCodes,
} from 'react-native-nitro-google-signin';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

export default function LoginScreen() {
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
  const googleIOSUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim() ?? '';
  const isGoogleSignInConfigured =
    !!googleWebClientId && (Platform.OS !== 'ios' || !!googleIOSUrlScheme);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    if (googleWebClientId) {
      GoogleOneTapSignIn.configure({ webClientId: googleWebClientId });
    }
  }, [googleWebClientId]);

  const handleGoogleSuccess = async (idToken: string) => {
    try {
      setIsGoogleLoading(true);
      await loginWithGoogle(idToken, isCreatingAccount ? fullName.trim() : undefined);
    } catch (error) {
      Alert.alert('Google Sign-In Failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (error: unknown) => {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return;
    Alert.alert('Google Sign-In Failed', error instanceof Error ? error.message : 'Please try again.');
  };

  const handleCreateAccountNext = () => {
    if (fullName.trim().length < 2) {
      Alert.alert('Enter your full name', 'Your name must be at least 2 characters long.');
      return;
    }

    setIsNameConfirmed(true);
  };

  const switchAccountMode = () => {
    setIsCreatingAccount((current) => !current);
    setFullName('');
    setIsNameConfirmed(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandCard}>
          <Image
            source={require('../../../assets/brand-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel="MatchLearn logo"
          />
          <Text style={styles.eyebrow}>WELCOME TO MATCHLEARN</Text>
          <Text style={styles.title}>Learn better, together.</Text>
          <Text style={styles.subtitle}>Sign in to find your study match.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isCreatingAccount ? 'Create your account' : 'Sign in with Google'}
          </Text>
          <Text style={styles.formSubtitle}>
            {isCreatingAccount
              ? 'Enter your name, then continue with your verified SSCT or SNSU Google account.'
              : 'Continue with the verified SSCT or SNSU Google account linked to your MatchLearn account.'}
          </Text>

          {isCreatingAccount ? (
            <>
              <View style={styles.nameRow}>
                <TextInput
                  label="Full name"
                  value={fullName}
                  onChangeText={(value) => {
                    setFullName(value);
                    setIsNameConfirmed(false);
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                  mode="outlined"
                  style={styles.nameInput}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.teal}
                  editable={!isGoogleLoading}
                  accessibilityLabel="Full name"
                  returnKeyType="next"
                  onSubmitEditing={handleCreateAccountNext}
                />
                <Button
                  mode="contained"
                  onPress={handleCreateAccountNext}
                  disabled={isGoogleLoading || fullName.trim().length < 2}
                  buttonColor={colors.teal}
                  style={styles.nextButton}
                  accessibilityLabel="Confirm full name and continue"
                >
                  Next
                </Button>
              </View>
              {isNameConfirmed ? (
                <Text style={styles.confirmedName}>Name confirmed: {fullName.trim()}</Text>
              ) : null}
            </>
          ) : null}

          {Platform.OS !== 'web' ? (
            <>
              <GoogleSignInButton
                size="wide"
                colorScheme="light"
                loading={isGoogleLoading}
                disabled={
                  isGoogleLoading
                  || !isGoogleSignInConfigured
                  || (isCreatingAccount && !isNameConfirmed)
                }
                style={styles.googleSignInButton}
                onSignInSuccess={({ idToken }) => { void handleGoogleSuccess(idToken); }}
                onSignInError={handleGoogleError}
              />
              <Text style={styles.googleHint}>
                {isCreatingAccount
                  ? 'Your confirmed name will be used for your new MatchLearn profile.'
                  : 'Use the Google account with the same email you used for MatchLearn.'}
              </Text>
              {!isGoogleSignInConfigured ? (
                <Text style={styles.googleConfigHint}>
                  Google sign-in is not configured for this build.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.googleConfigHint}>
              Sign in with Google using the MatchLearn Android or iOS app.
            </Text>
          )}

          <Button
            mode="text"
            onPress={switchAccountMode}
            disabled={isGoogleLoading}
            textColor={colors.teal}
            style={styles.modeButton}
          >
            {isCreatingAccount ? 'Already have an account? Sign in' : 'Create account'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
    gap: 14,
  },
  brandCard: {
    backgroundColor: colors.surface,
    borderRadius: 11,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandLogo: {
    width: '100%',
    height: 132,
    marginBottom: 10,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '800',
    marginBottom: 7,
    textAlign: 'center',
  },
  title: {
    color: colors.navy,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 11,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: '800',
  },
  formSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  nextButton: { justifyContent: 'center' },
  googleSignInButton: { width: '100%', height: 48 },
  googleHint: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8 },
  googleConfigHint: { color: '#b45309', fontSize: 11, textAlign: 'center', marginTop: 4 },
  confirmedName: { color: colors.teal, fontSize: 12, marginBottom: 8 },
  modeButton: { marginTop: 8 },
});
