import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import { TextInput, Button, Text } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { validateInstitutionalEmail } from '../../utils/validation';
import { colors } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login } = useAuth();

  const handleLogin = async () => {
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!validateInstitutionalEmail(email)) {
      setErrors({ email: 'Only SNSU and SSCT student emails can register for MatchLearn.' });
      return;
    }

    if (!password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
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
          <View style={styles.brandLockup} accessibilityLabel="MatchLearn">
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkLetter}>M</Text>
            </View>
            <Text style={styles.brandName}>
              Match<Text style={styles.brandAccent}>Learn</Text>
            </Text>
          </View>
          <Text style={styles.eyebrow}>WELCOME TO MATCHLEARN</Text>
          <Text style={styles.title}>Learn better, together.</Text>
          <Text style={styles.subtitle}>Sign in to find your study match.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Use your student account to continue.</Text>

          <TextInput
            label="Institutional Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.teal}
            editable={!isLoading}
            error={!!errors.email}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.teal}
            editable={!isLoading}
            error={!!errors.password}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
                forceTextInputFocus={false}
              />
            }
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            buttonColor={colors.teal}
            textColor="#ffffff"
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Login
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to MatchLearn?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
              accessibilityRole="button"
            >
              <Text style={styles.signUpText}>Create an account</Text>
            </TouchableOpacity>
          </View>
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
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  brandName: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  brandAccent: {
    color: colors.teal,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '800',
    marginBottom: 7,
  },
  title: {
    color: colors.navy,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
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
  input: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 10,
    marginTop: -6,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    minHeight: 48,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 13,
  },
  signUpText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '800',
  },
});
