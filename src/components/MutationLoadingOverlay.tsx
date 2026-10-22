import { useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiClient } from '../services/api/client';
import { colors } from '../theme';

export function MutationLoadingOverlay(): React.JSX.Element {
  const isVisible = useSyncExternalStore(
    apiClient.subscribeToMutations,
    apiClient.hasPendingMutations,
    apiClient.hasPendingMutations
  );

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.message}>Processing your request...</Text>
          <Text style={styles.description}>Please wait for the server to respond.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 42, 67, 0.42)',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 20,
    backgroundColor: colors.surface,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  message: {
    marginTop: 18,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
