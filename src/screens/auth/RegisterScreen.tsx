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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { validateInstitutionalEmail, validatePassword } from '../../utils/validation';
import { colors } from '../../theme';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register } = useAuth();

  const handleRegister = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateInstitutionalEmail(email)) {
      newErrors.email = 'Only SNSU and SSCT student emails can register for MatchLearn.';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);
      await register(name, email, password, confirmPassword);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred');
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
          <View style={styles.brandIcon}>
            <Ionicons name="school-outline" size={27} color={colors.teal} />
          </View>
          <Text style={styles.eyebrow}>JOIN THE MATCHLEARN COMMUNITY</Text>
          <Text style={styles.title}>Find your study circle.</Text>
          <Text style={styles.subtitle}>Create an account and learn better, together.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create your account</Text>
          <Text style={styles.formSubtitle}>Use your student information to get started.</Text>

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.teal}
            editable={!isLoading}
            error={!!errors.name}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

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
            autoComplete="new-password"
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

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.teal}
            editable={!isLoading}
            error={!!errors.confirmPassword}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                forceTextInputFocus={false}
              />
            }
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            buttonColor={colors.teal}
            textColor="#ffffff"
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Create Account
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
              accessibilityRole="button"
            >
              <Text style={styles.loginText}>Sign in</Text>
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
    paddingVertical: 24,
    gap: 14,
  },
  brandCard: {
    backgroundColor: colors.surface,
    borderRadius: 11,
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 10,
    letterSpacing: 1.1,
    fontWeight: '800',
    marginBottom: 6,
  },
  title: {
    color: colors.navy,
    fontSize: 24,
    lineHeight: 31,
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
    marginBottom: 16,
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
    marginTop: 18,
  },
  footerText: {
    color: '#64748b',
    fontSize: 13,
  },
  loginText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '800',
  },
});
