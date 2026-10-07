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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  LogOutIcon,
  SunIcon,
  UserIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { apiBaseUrl, getAgentProfile, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const mobile = useAuthStore((state) => state.mobile);
  const logout = useAuthStore((state) => state.logout);

  const profileQuery = useQuery({
    queryKey: ['agent-profile', userId, mobile],
    queryFn: async () => {
      if (!userId || !mobile) throw new Error('Your login session is incomplete. Sign in again.');
      return getAgentProfile(userId, mobile);
    },
    enabled: Boolean(userId && mobile),
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your agent session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout()
            .then(() => {
              queryClient.clear();
              router.replace('/login');
            })
            .catch((error: unknown) => {
              Alert.alert(
                'Could not sign out',
                error instanceof Error ? error.message : 'Please try again.',
              );
            });
        },
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AG';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

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
              <Text style={styles.eyebrow}>JB SOLAR ID</Text>
              <Heading size="lg" style={styles.heading}>
                Agent Profile
              </Heading>
            </VStack>
          </HStack>

          {profileQuery.isPending ? (
            <VStack style={styles.stateBox} space="md">
              <ActivityIndicator color={AppColors.brand} size="large" />
              <Text style={styles.stateText}>Loading your agent profile…</Text>
            </VStack>
          ) : profileQuery.isError ? (
            <Card style={styles.card}>
              <VStack space="md" alignItems="center">
                <Heading size="sm" style={styles.heading}>
                  Profile Unavailable
                </Heading>
                <Text style={styles.stateText}>{getApiErrorMessage(profileQuery.error)}</Text>
                <Button variant="outline" onPress={() => profileQuery.refetch()}>
                  <ButtonText>Try Again</ButtonText>
                </Button>
              </VStack>
            </Card>
          ) : profileQuery.data ? (
            <>
              {/* Agent Identity Card */}
              <Card style={styles.identityCard}>
                <HStack alignItems="center" space="md">
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarInitials}>
                      {getInitials(profileQuery.data.fullName)}
                    </Text>
                  </View>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <HStack alignItems="center" space="xs">
                      <View style={styles.statusDotActive} />
                      <Text style={styles.statusTextActive}>
                        {profileQuery.data.status} VENDOR AGENT
                      </Text>
                    </HStack>
                    <Heading size="lg" style={styles.identityName} numberOfLines={1}>
                      {profileQuery.data.fullName}
                    </Heading>
                    <Text style={styles.vendorSubtitle} numberOfLines={1}>
                      {profileQuery.data.vendorName}
                    </Text>
                  </VStack>
                </HStack>
              </Card>

              {/* Account Details Card */}
              <Card style={styles.card}>
                <HStack alignItems="center" space="xs" style={styles.cardHeader}>
                  <UserIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
                  <Heading size="sm" style={styles.cardHeading}>
                    Credentials & Account
                  </Heading>
                </HStack>
                <VStack space="sm" style={styles.detailGrid}>
                  <Detail label="Registered Mobile" value={profileQuery.data.mobile} />
                  <Detail label="User ID" value={profileQuery.data.userId} />
                  <Detail label="Account Status" value={profileQuery.data.status} />
                </VStack>
              </Card>

              {/* Company & Authorization Card */}
              <Card style={styles.card}>
                <HStack alignItems="center" space="xs" style={styles.cardHeader}>
                  <SunIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
                  <Heading size="sm" style={styles.cardHeading}>
                    Company Affiliation
                  </Heading>
                </HStack>
                <VStack space="sm" style={styles.detailGrid}>
                  <Detail label="Vendor Company" value={profileQuery.data.vendorName} />
                  <Detail label="Vendor ID" value={profileQuery.data.vendorId} />
                  <Detail label="Service Domain" value="Solar Pumping & Maintenance" />
                </VStack>
              </Card>

              {/* App Info Card */}
              <Card style={styles.card}>
                <VStack space="xs">
                  <HStack justifyContent="space-between">
                    <Text style={styles.detailLabel}>Connected Endpoint</Text>
                    <Text style={styles.detailValueSmall} numberOfLines={1}>
                      {apiBaseUrl}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text style={styles.detailLabel}>Client Version</Text>
                    <Text style={styles.detailValueSmall}>1.0.0 (Production Build)</Text>
                  </HStack>
                </VStack>
              </Card>

              {/* Logout Button */}
              <Button onPress={handleLogout} style={styles.logoutButton}>
                <HStack alignItems="center" space="xs">
                  <LogOutIcon size={18} color="#b42318" strokeWidth={2.2} />
                  <ButtonText style={styles.logoutButtonText}>Sign Out of Agent Session</ButtonText>
                </HStack>
              </Button>
            </>
          ) : null}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <HStack justifyContent="space-between" alignItems="center" style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not provided'}</Text>
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
  identityCard: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: AppColors.accentLight,
    borderWidth: 1.5,
    borderColor: '#d2e8b8',
    shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: AppColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: AppColors.accent,
    fontSize: 22,
    fontWeight: '900',
  },
  statusDotActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#166534',
  },
  statusTextActive: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  identityName: {
    color: AppColors.brand,
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
  },
  detailValueSmall: {
    color: AppColors.textMuted,
    fontSize: 11,
    maxWidth: 200,
  },
  logoutButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#b42318',
    fontSize: 14,
    fontWeight: '700',
  },
  stateBox: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateText: {
    color: AppColors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
