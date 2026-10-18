import {
  Button,
  ButtonText,
  Card,
  Heading,
  HStack,
  ScrollView,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeftIcon, SunIcon, UserIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';

type Tone = 'muted' | 'info' | 'success' | 'error';

const TONES: Record<Tone, { fg: string; bg: string; border: string }> = {
  muted: { fg: AppColors.textMuted, bg: AppColors.surface, border: AppColors.border },
  info: { fg: AppColors.brand, bg: AppColors.accentLight, border: '#d2e8b8' },
  success: { fg: '#166534', bg: '#dcfce7', border: '#86efac' },
  error: { fg: '#b42318', bg: '#fee2e2', border: '#fca5a5' },
};

export default function UpdateScreen() {
  const router = useRouter();
  const {
    isUpdateAvailable,
    isUpdatePending,
    isChecking,
    isDownloading,
  } = Updates.useUpdates();

  const [error, setError] = useState<string | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const busy = isChecking || isDownloading || restarting;

  const handleCheck = async () => {
    setError(null);
    setCheckedOnce(false);

    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    try {
      await Updates.checkForUpdateAsync();
      setCheckedOnce(true);
    } catch {
      setError(
        'The update service could not be reached. Check your internet connection and try again. If the problem continues, ask your administrator to verify this build’s update channel and that an update is published for its app version.',
      );
    }
  };

  const handleDownload = async () => {
    setError(null);
    try {
      await Updates.fetchUpdateAsync();
      setRestarting(true);
      await Updates.reloadAsync();
    } catch {
      setRestarting(false);
      setError('We could not download the update. Please try again when you have a stable connection.');
    }
  };

  const handleRestart = async () => {
    setError(null);
    try {
      setRestarting(true);
      await Updates.reloadAsync();
    } catch {
      setRestarting(false);
      setError('The app could not restart to apply the update. Please close and reopen the app.');
    }
  };

  // Status + button behaviour
  let statusText = 'Not checked yet';
  let statusTone: Tone = 'muted';
  let buttonLabel = 'Check for Updates';
  let onPress: () => void = handleCheck;

  if (isChecking) {
    statusText = 'Checking…';
    buttonLabel = 'Checking…';
  } else if (isDownloading) {
    statusText = 'Downloading update…';
    statusTone = 'info';
    buttonLabel = 'Downloading…';
  } else if (restarting) {
    statusText = 'Restarting…';
    statusTone = 'info';
    buttonLabel = 'Restarting…';
  } else if (!Updates.isEnabled) {
    statusText = 'Updates are unavailable';
    buttonLabel = 'Updates unavailable';
  } else if (__DEV__) {
    statusText = 'Check in an installed app build';
    buttonLabel = 'Not available in development';
  } else if (error) {
    statusText = 'Could not check for updates';
    statusTone = 'error';
  } else if (isUpdatePending) {
    statusText = 'Update ready to install';
    statusTone = 'success';
    buttonLabel = 'Restart to Apply';
    onPress = handleRestart;
  } else if (isUpdateAvailable) {
    statusText = 'Update available';
    statusTone = 'info';
    buttonLabel = 'Download & Install';
    onPress = handleDownload;
  } else if (checkedOnce) {
    statusText = "You're up to date";
    statusTone = 'success';
  }

  const tone = TONES[statusTone];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack style={styles.screen} space="lg">
          {/* Header */}
          <HStack style={styles.header} alignItems="center" space="md">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeftIcon size={20} color={AppColors.brand} strokeWidth={2.4} />
            </Pressable>
            <VStack space="xs">
              <Text style={styles.eyebrow}>JB SOLAR APP</Text>
              <Heading size="lg" style={styles.heading}>
                App Updates
              </Heading>
            </VStack>
          </HStack>

          {/* Status Card */}
          <Card style={[styles.statusCard, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <HStack alignItems="center" space="md">
              <View style={styles.statusIcon}>
                {busy ? (
                  <ActivityIndicator color={AppColors.accent} />
                ) : (
                  <SunIcon size={24} color={AppColors.accent} strokeWidth={2.2} />
                )}
              </View>
              <VStack space="xs" style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>UPDATE STATUS</Text>
                <Heading size="md" style={[styles.statusTitle, { color: tone.fg }]}>
                  {statusText}
                </Heading>
              </VStack>
            </HStack>
          </Card>

          {/* App Info Card */}
          <Card style={styles.card}>
            <HStack alignItems="center" space="xs" style={styles.cardHeader}>
              <UserIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
              <Heading size="sm" style={styles.cardHeading}>
                App Information
              </Heading>
            </HStack>
            <VStack space="sm" style={styles.detailGrid}>
              <Detail label="App Version" value={Application.nativeApplicationVersion ?? '-'} />
              <Detail label="Build Number" value={Application.nativeBuildVersion ?? '-'} />
            </VStack>
          </Card>

          {/* Messages */}
          {error ? (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : null}
          {__DEV__ ? (
            <Text style={styles.availabilityHint}>
              Update checks are available in installed preview or production builds.
            </Text>
          ) : null}

          {/* Action Button */}
          <Button
            onPress={onPress}
            isDisabled={busy || !Updates.isEnabled || __DEV__}
            style={[styles.actionButton, (busy || !Updates.isEnabled || __DEV__) && { opacity: 0.6 }]}
          >
            <HStack alignItems="center" space="sm">
              {busy ? <ActivityIndicator color={AppColors.accent} size="small" /> : null}
              <ButtonText style={styles.actionButtonText}>{buttonLabel}</ButtonText>
            </HStack>
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <HStack justifyContent="space-between" alignItems="center" style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value || 'Not provided'}
      </Text>
    </HStack>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  screen: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accentLight,
    borderWidth: 1,
    borderColor: '#d2e8b8',
  },
  eyebrow: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heading: {
    color: AppColors.brand,
    fontSize: 20,
    fontWeight: '800',
  },
  statusCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: AppColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  vendorSubtitle: {
    color: AppColors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardHeading: {
    color: AppColors.brand,
    fontSize: 14,
    fontWeight: '800',
  },
  detailGrid: {
    gap: 8,
  },
  detailRow: {
    paddingVertical: 2,
  },
  detailLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
  detailValue: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '60%',
  },
  errorCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#b42318',
    fontSize: 13,
    fontWeight: '600',
  },
  availabilityHint: {
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  actionButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: AppColors.brand,
    marginTop: 8,
  },
  actionButtonText: {
    color: AppColors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
});