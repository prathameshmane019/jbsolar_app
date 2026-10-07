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
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CameraIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  LogOutIcon,
  PlusIcon,
  PolicyIcon,
  SearchIcon,
  SunIcon,
  ZapIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getAgentProfile, getPolicies } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const mobile = useAuthStore((state) => state.mobile);
  const logout = useAuthStore((state) => state.logout);

  const profileQuery = useQuery({
    queryKey: ['agent-profile', userId, mobile],
    queryFn: async () => {
      if (!userId || !mobile) throw new Error('Session is incomplete');
      return getAgentProfile(userId, mobile);
    },
    enabled: Boolean(userId && mobile),
  });

  const policiesQuery = useQuery({
    queryKey: ['agent-policies', userId],
    queryFn: getPolicies,
    enabled: Boolean(userId),
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

  const policies = policiesQuery.data ?? [];
  const activeCount = policies.filter((p) => p.status === 'ACTIVE').length;
  const pendingCount = policies.filter((p) => p.status === 'PENDING').length;
  const recentPolicies = policies.slice(0, 3);
  const latestPendingPolicy = policies.find((p) => p.status === 'PENDING');

  const isRefreshing = policiesQuery.isRefetching || profileQuery.isRefetching;
  const onRefresh = () => {
    void Promise.all([policiesQuery.refetch(), profileQuery.refetch()]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.brand}
            colors={[AppColors.brand]}
          />
        }
      >
        <VStack style={styles.screen} space="lg">
          {/* Top Bar / Header */}
          <HStack alignItems="center" justifyContent="space-between" style={styles.topbar}>
            <HStack alignItems="center" space="sm">
              <View style={styles.avatarCircle}>
                <SunIcon size={22} color="#f59e0b" strokeWidth={2.4} />
              </View>
              <VStack space="xs">
                <Text style={styles.greetingKicker}>JB SOLAR · FIELD DESK</Text>
                <Heading size="lg" style={styles.agentName} numberOfLines={1}>
                  {profileQuery.data?.fullName ? `Hi, ${profileQuery.data.fullName}` : 'Agent Portal'}
                </Heading>
                <Text style={styles.vendorLabel} numberOfLines={1}>
                  {profileQuery.data?.vendorName ?? 'Authorized Vendor Partner'}
                </Text>
              </VStack>
            </HStack>

            <Pressable
              onPress={handleLogout}
              style={styles.logoutIconButton}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <LogOutIcon size={18} color={AppColors.brand} strokeWidth={2.2} />
            </Pressable>
          </HStack>

          {/* Quick Metrics Bar */}
          <HStack space="sm" style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.metricCardPrimary]}>
              <HStack alignItems="center" space="xs" style={styles.metricHeader}>
                <PolicyIcon size={14} color={AppColors.brand} strokeWidth={2.2} />
                <Text style={styles.metricLabel}>Total</Text>
              </HStack>
              <Text style={styles.metricValue}>
                {policiesQuery.isPending ? '…' : policies.length}
              </Text>
              <Text style={styles.metricSub}>Registrations</Text>
            </View>

            <View style={[styles.metricCard, styles.metricCardPending]}>
              <HStack alignItems="center" space="xs" style={styles.metricHeader}>
                <ClockIcon size={14} color="#854d0e" strokeWidth={2.2} />
                <Text style={[styles.metricLabel, { color: '#854d0e' }]}>Pending</Text>
              </HStack>
              <Text style={[styles.metricValue, { color: '#854d0e' }]}>
                {policiesQuery.isPending ? '…' : pendingCount}
              </Text>
              <Text style={styles.metricSub}>Needs Action</Text>
            </View>

            <View style={[styles.metricCard, styles.metricCardActive]}>
              <HStack alignItems="center" space="xs" style={styles.metricHeader}>
                <CheckCircleIcon size={14} color="#166534" strokeWidth={2.2} />
                <Text style={[styles.metricLabel, { color: '#166534' }]}>Active</Text>
              </HStack>
              <Text style={[styles.metricValue, { color: '#166534' }]}>
                {policiesQuery.isPending ? '…' : activeCount}
              </Text>
              <Text style={styles.metricSub}>Verified</Text>
            </View>
          </HStack>

          {/* Pending Policy Quick Resume Banner (if any) */}
          {latestPendingPolicy ? (
            <Card style={styles.pendingAlertCard}>
              <HStack alignItems="center" justifyContent="space-between">
                <HStack alignItems="center" space="sm" style={{ flex: 1, marginRight: 8 }}>
                  <View style={styles.alertIconPill}>
                    <ClockIcon size={18} color="#854d0e" strokeWidth={2.2} />
                  </View>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>Pending Registration Needs Finish</Text>
                    <Text style={styles.alertSub} numberOfLines={1}>
                      {latestPendingPolicy.farmerName} · {latestPendingPolicy.policyNumber}
                    </Text>
                  </VStack>
                </HStack>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/workflow',
                      params: { policyId: latestPendingPolicy.id },
                    })
                  }
                  style={styles.resumeButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.resumeButtonText}>Resume ›</Text>
                </Pressable>
              </HStack>
            </Card>
          ) : null}

          {/* Primary Action Card: Start New Policy */}
          <Card style={styles.heroCard}>
            <VStack space="md">
              <HStack alignItems="center" justifyContent="space-between">
                <View style={styles.heroTag}>
                  <ZapIcon size={12} color={AppColors.brand} strokeWidth={2.4} />
                  <Text style={styles.heroTagText}>SOLAR WATER PUMP ENROLLMENT</Text>
                </View>
                <View style={styles.heroSunAccent}>
                  <SunIcon size={24} color="#f59e0b" strokeWidth={2} />
                </View>
              </HStack>

              <VStack space="xs">
                <Heading size="lg" style={styles.heroTitle}>
                  Register & Install Pump
                </Heading>
                <Text style={styles.heroDescription}>
                  Lookup farmer by Aadhaar, select pump power specifications, snap field evidence, and
                  generate verified invoice instantly.
                </Text>
              </VStack>

              <Button
                onPress={() => router.push('/workflow')}
                style={styles.primaryActionButton}
              >
                <HStack alignItems="center" space="xs">
                  <PlusIcon size={18} color="#c5e86c" strokeWidth={2.6} />
                  <ButtonText style={styles.primaryActionText}>Start New Policy</ButtonText>
                </HStack>
              </Button>
            </VStack>
          </Card>

          {/* 4-Step Field Workflow Overview */}
          <Card style={styles.sectionCard}>
            <HStack alignItems="center" justifyContent="space-between" style={{ marginBottom: 14 }}>
              <Heading size="md" style={styles.sectionHeading}>
                Field Workflow Process
              </Heading>
              <Text style={styles.stepsBadge}>4 Steps</Text>
            </HStack>

            <VStack space="md">
              <HStack style={styles.workflowRow} alignItems="center" space="md">
                <View style={[styles.stepIconWrap, { backgroundColor: '#e0f2fe' }]}>
                  <SearchIcon size={16} color="#0369a1" strokeWidth={2.2} />
                </View>
                <VStack style={styles.workflowCopy} space="xs">
                  <Text style={styles.stepTitle}>1. Farmer KYC</Text>
                  <Text style={styles.stepDescription}>
                    Instant Aadhaar search or quick form registration for new farmers.
                  </Text>
                </VStack>
              </HStack>

              <HStack style={styles.workflowRow} alignItems="center" space="md">
                <View style={[styles.stepIconWrap, { backgroundColor: '#fef3c7' }]}>
                  <ZapIcon size={16} color="#b45309" strokeWidth={2.2} />
                </View>
                <VStack style={styles.workflowCopy} space="xs">
                  <Text style={styles.stepTitle}>2. Pump Set & Plan</Text>
                  <Text style={styles.stepDescription}>
                    Capture pump capacity (HP), head in meters, and policy plan terms.
                  </Text>
                </VStack>
              </HStack>

              <HStack style={styles.workflowRow} alignItems="center" space="md">
                <View style={[styles.stepIconWrap, { backgroundColor: '#e0e7ff' }]}>
                  <CameraIcon size={16} color="#4338ca" strokeWidth={2.2} />
                </View>
                <VStack style={styles.workflowCopy} space="xs">
                  <Text style={styles.stepTitle}>3. Signature & Evidence</Text>
                  <Text style={styles.stepDescription}>
                    Digital customer touch signature and camera photo uploaded to Cloudflare R2.
                  </Text>
                </VStack>
              </HStack>

              <HStack style={styles.workflowRow} alignItems="center" space="md">
                <View style={[styles.stepIconWrap, { backgroundColor: '#dcfce7' }]}>
                  <CheckCircleIcon size={16} color="#15803d" strokeWidth={2.2} />
                </View>
                <VStack style={styles.workflowCopy} space="xs">
                  <Text style={styles.stepTitle}>4. Payment & Invoice</Text>
                  <Text style={styles.stepDescription}>
                    Verified policy activation and downloadable PDF invoice for the farmer.
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </Card>

          {/* Recent Registrations Preview */}
          <Card style={styles.sectionCard}>
            <HStack alignItems="center" justifyContent="space-between" style={{ marginBottom: 12 }}>
              <Heading size="md" style={styles.sectionHeading}>
                Recent Registrations
              </Heading>
              <Pressable
                onPress={() => router.push('/policies')}
                accessibilityRole="button"
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>View All ›</Text>
              </Pressable>
            </HStack>

            {policiesQuery.isPending ? (
              <HStack alignItems="center" justifyContent="center" space="sm" style={{ paddingVertical: 18 }}>
                <ActivityIndicator color={AppColors.brand} size="small" />
                <Text style={styles.mutedText}>Fetching recent work…</Text>
              </HStack>
            ) : recentPolicies.length > 0 ? (
              <VStack space="sm">
                {recentPolicies.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      router.push({ pathname: '/policy/[id]', params: { id: p.id } })
                    }
                    style={styles.recentItem}
                  >
                    <HStack alignItems="center" justifyContent="space-between">
                      <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.recentFarmer}>{p.farmerName}</Text>
                        <Text style={styles.recentMeta}>
                          {p.policyNumber} · {p.pumpPowerHp} HP
                        </Text>
                      </VStack>
                      <HStack alignItems="center" space="xs">
                        <View
                          style={[
                            styles.statusBadgeSmall,
                            p.status === 'ACTIVE'
                              ? styles.statusBadgeActive
                              : p.status === 'PENDING'
                                ? styles.statusBadgePending
                                : styles.statusBadgeOther,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusTextSmall,
                              p.status === 'ACTIVE'
                                ? styles.statusTextActive
                                : p.status === 'PENDING'
                                  ? styles.statusTextPending
                                  : styles.statusTextOther,
                            ]}
                          >
                            {p.status}
                          </Text>
                        </View>
                        <ChevronRightIcon size={16} color={AppColors.textMuted} strokeWidth={2} />
                      </HStack>
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            ) : (
              <VStack alignItems="center" space="xs" style={{ paddingVertical: 18 }}>
                <Text style={styles.mutedText}>No policies registered yet.</Text>
                <Text style={styles.mutedSubText}>
                  Tap &quot;Start New Policy&quot; above to enroll your first farmer.
                </Text>
              </VStack>
            )}
          </Card>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screen: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  topbar: {
    paddingHorizontal: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingKicker: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  agentName: {
    color: AppColors.brand,
    fontSize: 18,
    fontWeight: '800',
  },
  vendorLabel: {
    color: AppColors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  metricCardPrimary: {
    backgroundColor: '#ffffff',
  },
  metricCardPending: {
    backgroundColor: '#fffdf5',
    borderColor: '#fef08a',
  },
  metricCardActive: {
    backgroundColor: '#f7fee7',
    borderColor: '#d9f99d',
  },
  metricHeader: {
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.brand,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.brand,
  },
  metricSub: {
    fontSize: 10,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  pendingAlertCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  alertIconPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854d0e',
  },
  alertSub: {
    fontSize: 11,
    color: '#a16207',
  },
  resumeButton: {
    backgroundColor: '#854d0e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resumeButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#e8f3d4',
    borderWidth: 1.5,
    borderColor: '#d2e8b8',
    shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 59, 45, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroTagText: {
    color: AppColors.brand,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroSunAccent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: AppColors.brand,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  heroDescription: {
    color: '#476345',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryActionButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: AppColors.brand,
    marginTop: 4,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  sectionHeading: {
    color: AppColors.brand,
    fontSize: 16,
    fontWeight: '800',
  },
  stepsBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textMuted,
    backgroundColor: AppColors.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  workflowRow: {
    alignItems: 'center',
  },
  stepIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowCopy: {
    flex: 1,
  },
  stepTitle: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  stepDescription: {
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  seeAllButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  seeAllText: {
    color: AppColors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  recentItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fafcfa',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  recentFarmer: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.brand,
  },
  recentMeta: {
    fontSize: 11,
    color: AppColors.textMuted,
    marginTop: 1,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  statusTextActive: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgePending: {
    backgroundColor: '#fef9c3',
  },
  statusTextPending: {
    color: '#854d0e',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeOther: {
    backgroundColor: '#f3f4f6',
  },
  statusTextOther: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '800',
  },
  mutedText: {
    color: AppColors.textMuted,
    fontSize: 13,
  },
  mutedSubText: {
    color: AppColors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
});
