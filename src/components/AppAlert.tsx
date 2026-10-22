import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

interface AlertButton {
  text?: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
}

interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertRequest {
  id: number;
  title: string;
  message: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

type AlertKind = 'info' | 'success' | 'warning' | 'error';
type AlertListener = (request: AlertRequest | null) => void;

let nextAlertId = 0;
let activeAlert: AlertRequest | null = null;
const queuedAlerts: AlertRequest[] = [];
const listeners = new Set<AlertListener>();

function publish(): void {
  listeners.forEach((listener) => listener(activeAlert));
}

function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
): void {
  const request: AlertRequest = {
    id: ++nextAlertId,
    title: title || '',
    message: message || '',
    buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    options,
  };

  if (activeAlert) {
    queuedAlerts.push(request);
    return;
  }

  activeAlert = request;
  publish();
}

function dismissAlert(request: AlertRequest, button?: AlertButton): void {
  if (activeAlert?.id !== request.id) return;

  activeAlert = null;
  publish();
  request.options?.onDismiss?.();
  button?.onPress?.();

  setTimeout(() => {
    if (activeAlert || queuedAlerts.length === 0) return;
    activeAlert = queuedAlerts.shift() ?? null;
    publish();
  }, 180);
}

export const Alert = {
  alert: showAlert,
};

function getAlertKind(title: string): AlertKind {
  const normalized = title.toLowerCase();
  if (/could not|failed|failure|error|not sent/.test(normalized)) return 'error';
  if (/saved|updated|accepted|request sent|photo updated|submitted/.test(normalized)) return 'success';
  if (/invalid|required|limit|choose|confirm|delete|remove|cancel|sign out|leave|suspend/.test(normalized)) return 'warning';
  return 'info';
}

const kindStyles: Record<AlertKind, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  label: string;
}> = {
  info: { icon: 'information-circle', color: colors.teal, background: colors.tealLight, label: 'NOTICE' },
  success: { icon: 'checkmark-circle', color: colors.success, background: '#e9f6ef', label: 'SUCCESS' },
  warning: { icon: 'alert-circle', color: colors.warning, background: '#fff3e5', label: 'PLEASE NOTE' },
  error: { icon: 'close-circle', color: colors.danger, background: '#fff0ee', label: 'SOMETHING WENT WRONG' },
};

export function AppAlertProvider(): React.JSX.Element {
  const [request, setRequest] = useState<AlertRequest | null>(activeAlert);

  useEffect(() => {
    const listener: AlertListener = (nextAlert) => setRequest(nextAlert);
    listeners.add(listener);
    listener(activeAlert);
    return () => { listeners.delete(listener); };
  }, []);

  const kind = request ? getAlertKind(request.title) : 'info';
  const appearance = kindStyles[kind];
  const buttons = request?.buttons ?? [];
  const buttonLayout = buttons.length === 2 ? styles.buttonRow : styles.buttonColumn;

  return (
    <Modal
      transparent
      visible={request !== null}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (request?.options?.cancelable) dismissAlert(request);
      }}
    >
      {request && (
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Close dialog"
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (request.options?.cancelable) dismissAlert(request);
            }}
          />
          <View
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={styles.dialog}
          >
            <View style={[styles.iconBadge, { backgroundColor: appearance.background }]}>
              <Ionicons name={appearance.icon} size={29} color={appearance.color} />
            </View>
            <Text style={[styles.eyebrow, { color: appearance.color }]}>{appearance.label}</Text>
            {!!request.title && <Text style={styles.title}>{request.title}</Text>}
            {!!request.message && <Text style={styles.message}>{request.message}</Text>}
            <View style={buttonLayout}>
              {buttons.map((button, index) => {
                const destructive = button.style === 'destructive';
                const cancel = button.style === 'cancel';
                const primary = !cancel && (
                  destructive
                  || buttons.length === 1
                  || (buttons.length === 2 && index === 1)
                );

                return (
                  <Pressable
                    key={`${button.text ?? 'button'}-${index}`}
                    accessibilityRole="button"
                    onPress={() => dismissAlert(request, button)}
                    style={({ pressed }) => [
                      styles.button,
                      primary && !destructive && styles.primaryButton,
                      destructive && styles.destructiveButton,
                      !primary && !destructive && styles.secondaryButton,
                      buttonLayout === styles.buttonRow && styles.rowButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        primary && !destructive && styles.primaryButtonText,
                        destructive && styles.destructiveButtonText,
                        !primary && !destructive && styles.secondaryButtonText,
                      ]}
                    >
                      {button.text || 'OK'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(16, 42, 67, 0.48)',
  },
  dialog: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.navy,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  iconBadge: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderRadius: 20,
  },
  eyebrow: {
    marginBottom: 7,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.15,
  },
  title: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
    textAlign: 'center',
  },
  message: {
    marginTop: 9,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  buttonColumn: {
    width: '100%',
    gap: 9,
    marginTop: 22,
  },
  button: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 11,
  },
  rowButton: {
    flex: 1,
  },
  primaryButton: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  destructiveButton: {
    borderColor: '#f0d1cc',
    backgroundColor: '#fff0ee',
  },
  secondaryButton: {
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButtonText: {
    color: '#fff',
  },
  destructiveButtonText: {
    color: colors.danger,
  },
  secondaryButtonText: {
    color: colors.text,
  },
});
