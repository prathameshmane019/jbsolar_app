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
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  PolicyIcon,
  ShieldCheckIcon,
  UserIcon,
  ZapIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getAgentProfile, getApiErrorMessage, getFarmersRegisteredByAgent, getPolicies } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Policy } from '@/types';

export default function FarmerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((state) => state.userId);
  const mobile = useAuthStore((state) => state.mobile);

  const profileQuery = useQuery({
    queryKey: ['agent-profile', userId, mobile],
    queryFn: async () => {
      if (!userId || !mobile) throw new Error('Your login session is incomplete. Sign in again.');
      return getAgentProfile(userId, mobile);
    },
    enabled: Boolean(userId && mobile),
  });
  const agentId = profileQuery.data?.id;
  const farmersQuery = useQuery({
    queryKey: ['agent-farmers', agentId],
    queryFn: async () => {
      if (!agentId) throw new Error('Your agent profile is unavailable.');
      return getFarmersRegisteredByAgent(agentId);
    },
    enabled: Boolean(agentId),
  });
  const policiesQuery = useQuery({
    queryKey: ['agent-policies', userId],
    queryFn: getPolicies,
    enabled: Boolean(userId),
  });

  const farmer = farmersQuery.data?.find((record) => record.id === id);
  const farmerPolicies = policiesQuery.data?.filter((policy) => policy.farmerId === id) ?? [];
  const isLoading = profileQuery.isPending || (Boolean(agentId) && farmersQuery.isPending);
  const loadError = profileQuery.error ?? farmersQuery.error;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HStack alignItems="center" space="md" style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to farmers"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeftIcon size={20} color={AppColors.brand} />
          </Pressable>
          <VStack space="xs">
            <Text style={styles.eyebrow}>FARMER RECORD</Text>
            <Heading size="lg" style={styles.title}>Details</Heading>
          </VStack>
        </HStack>

        {isLoading ? (
          <VStack style={styles.stateCard} space="sm" alignItems="center">
            <ActivityIndicator color={AppColors.brand} />
            <Text style={styles.mutedText}>Loading farmer details…</Text>
          </VStack>
        ) : loadError ? (
          <Card style={styles.stateCard}>
            <VStack space="md" alignItems="center">
              <Heading size="sm" style={styles.sectionTitle}>Farmer details unavailable</Heading>
              <Text style={styles.mutedText}>{getApiErrorMessage(loadError)}</Text>
              <Button
                onPress={() => {
                  void profileQuery.refetch();
                  if (agentId) void farmersQuery.refetch();
                }}
                style={styles.primaryButton}
              >
                <ButtonText style={styles.primaryButtonText}>Try again</ButtonText>
              </Button>
            </VStack>
          </Card>
        ) : farmer ? (
          <>
            <Card style={styles.identityCard}>
              <HStack alignItems="center" space="md">
                <View style={styles.avatar}>
                  <UserIcon size={24} color={AppColors.brand} />
                </View>
                <VStack space="xs" style={styles.identity}>
                  <Heading size="md" style={styles.farmerName}>{farmer.fullName}</Heading>
                  <Text style={styles.customerCode}>{farmer.customerCode}</Text>
                </VStack>
              </HStack>
              <View style={styles.divider} />
              <DetailRow icon={<PhoneIcon size={16} color={AppColors.primaryLight} />} label="Mobile" value={farmer.mobile} />
              <DetailRow
                icon={<MapPinIcon size={16} color={AppColors.primaryLight} />}
                label="Village / Taluka / District"
                value={[farmer.village, farmer.taluka, farmer.district].filter(Boolean).join(', ') || 'Not provided'}
              />
              <DetailRow label="Address" value={farmer.address || 'Not provided'} />
              <DetailRow
                label="Aadhaar"
                value={farmer.aadhaarNumber ? `•••• •••• ${farmer.aadhaarNumber.slice(-4)}` : 'Not provided'}
              />
              <DetailRow label="Registered" value={formatDate(farmer.createdAt)} />
            </Card>

            <HStack alignItems="center" justifyContent="space-between" style={styles.sectionHeader}>
              <VStack space="xs">
                <Text style={styles.eyebrow}>COVERAGE & HISTORY</Text>
                <Heading size="md" style={styles.sectionTitle}>Policies</Heading>
              </VStack>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{farmerPolicies.length}</Text>
              </View>
            </HStack>

            {policiesQuery.isPending ? (
              <VStack style={styles.stateCard} space="sm" alignItems="center">
                <ActivityIndicator color={AppColors.brand} />
                <Text style={styles.mutedText}>Loading policy history…</Text>
              </VStack>
            ) : policiesQuery.isError ? (
              <Card style={styles.stateCard}>
                <VStack space="sm" alignItems="center">
                  <Text style={styles.mutedText}>{getApiErrorMessage(policiesQuery.error)}</Text>
                  <Button variant="outline" onPress={() => void policiesQuery.refetch()}>
                    <ButtonText>Retry policy history</ButtonText>
                  </Button>
                </VStack>
              </Card>
            ) : farmerPolicies.length ? (
              <VStack space="sm">
                {farmerPolicies.map((policy) => (
                  <PolicySummary
                    key={policy.id}
                    policy={policy}
                    onPress={() => router.push({ pathname: '/policy/[id]', params: { id: policy.id } })}
                  />
                ))}
              </VStack>
            ) : (
              <Card style={styles.stateCard}>
                <VStack space="xs" alignItems="center">
                  <ShieldCheckIcon size={22} color={AppColors.textMuted} />
                  <Heading size="sm" style={styles.sectionTitle}>No policies yet</Heading>
                  <Text style={styles.mutedText}>Policies for this farmer will appear here.</Text>
                </VStack>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.stateCard}>
            <VStack space="sm" alignItems="center">
              <Heading size="sm" style={styles.sectionTitle}>Farmer not found</Heading>
              <Text style={styles.mutedText}>This record may have been removed or is not assigned to your agent account.</Text>
              <Button variant="outline" onPress={() => router.replace('/farmers/index')}>
                <ButtonText>Back to farmers</ButtonText>
              </Button>
            </VStack>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <HStack alignItems="flex-start" space="sm" style={styles.detailRow}>
      {icon ? <View style={styles.detailIcon}>{icon}</View> : null}
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </HStack>
  );
}

function PolicySummary({ policy, onPress }: { policy: Policy; onPress: () => void }) {
  const statusStyle =
    policy.status === 'ACTIVE'
      ? styles.statusActive
      : policy.status === 'PENDING'
        ? styles.statusPending
        : styles.statusOther;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${policy.status.toLowerCase()} policy ${policy.policyNumber}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.policyCard}>
        <HStack alignItems="center" justifyContent="space-between">
          <HStack alignItems="center" space="xs" style={styles.policyNumberRow}>
            <PolicyIcon size={15} color={AppColors.primaryLight} />
            <Text style={styles.policyNumber} numberOfLines={1}>{policy.policyNumber}</Text>
          </HStack>
          <View style={[styles.statusPill, statusStyle]}>
            <Text style={styles.statusText}>{policy.status}</Text>
          </View>
        </HStack>
        <Text style={styles.planName}>{policy.planName}</Text>
        <HStack style={styles.policyStats}>
          <PolicyValue label="Premium" value={formatCurrency(policy.totalAmount)} />
          <PolicyValue label="Pump" value={`${policy.pumpPowerHp} HP · ${policy.motorHeadMeters} m`} />
        </HStack>
        <Text style={styles.taxBreakdown}>
          {formatCurrency(policy.amount)} base · {formatCurrency(policy.gstAmount)} GST included
        </Text>
        <HStack alignItems="center" justifyContent="space-between" style={styles.policyFooter}>
          <Text style={styles.policyDates}>
            {formatDate(policy.startDate)} — {formatDate(policy.endDate)}
          </Text>
          <ChevronRightIcon size={17} color={AppColors.textSubtle} />
        </HStack>
      </Card>
    </Pressable>
  );
}

function PolicyValue({ label, value }: { label: string; value: string }) {
  return (
    <VStack space="xs" style={styles.policyValue}>
      <Text style={styles.policyValueLabel}>{label}</Text>
      <HStack alignItems="center" space="xs">
        {label === 'Pump' ? <ZapIcon size={13} color={AppColors.solar} /> : null}
        <Text style={styles.policyValueText}>{value}</Text>
      </HStack>
    </VStack>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not provided'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 16 },
  header: { marginBottom: 2 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  eyebrow: { color: AppColors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: AppColors.brand, fontSize: 21, fontWeight: '800' },
  identityCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accentLight,
  },
  identity: { flex: 1 },
  farmerName: { color: AppColors.brand, fontWeight: '800' },
  customerCode: { color: AppColors.textMuted, fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: AppColors.borderSubtle, marginVertical: 16 },
  detailRow: { marginTop: 11 },
  detailIcon: { width: 18, alignItems: 'center' },
  detailLabel: { flex: 1, color: AppColors.textMuted, fontSize: 12 },
  detailValue: { flex: 1.3, color: AppColors.brand, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  sectionHeader: { marginTop: 2 },
  sectionTitle: { color: AppColors.brand, fontWeight: '800' },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: AppColors.accentLight,
  },
  countText: { color: AppColors.brand, fontSize: 13, fontWeight: '800' },
  policyCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  policyNumberRow: { flex: 1, marginRight: 8 },
  policyNumber: { color: AppColors.brand, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  statusActive: { backgroundColor: AppColors.successBg },
  statusPending: { backgroundColor: AppColors.warningBg },
  statusOther: { backgroundColor: AppColors.surfaceSubtle },
  statusText: { color: AppColors.brand, fontSize: 9, fontWeight: '800' },
  planName: { color: AppColors.primaryLight, fontSize: 13, fontWeight: '700', marginTop: 12 },
  policyStats: { marginTop: 16, gap: 24 },
  policyValue: { flex: 1 },
  policyValueLabel: { color: AppColors.textMuted, fontSize: 10 },
  policyValueText: { color: AppColors.brand, fontSize: 12, fontWeight: '800' },
  taxBreakdown: { color: AppColors.textMuted, fontSize: 10, marginTop: 8 },
  policyFooter: { borderTopWidth: 1, borderTopColor: AppColors.borderSubtle, marginTop: 14, paddingTop: 12 },
  policyDates: { color: AppColors.textMuted, fontSize: 11 },
  pressed: { opacity: 0.72 },
  stateCard: {
    minHeight: 150,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  mutedText: { color: AppColors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  primaryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: AppColors.brand },
  primaryButtonText: { color: AppColors.accent, fontWeight: '800' },
});
