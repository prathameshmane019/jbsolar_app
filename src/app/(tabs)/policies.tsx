import {
  Button,
  ButtonText,
  Card,
  Heading,
  HStack,
  Input,
  InputField,
  ScrollView,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
  PolicyIcon,
  SearchIcon,
  ZapIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getApiErrorMessage, getPolicies } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Policy } from '@/types';

type FilterTab = 'ALL' | 'ACTIVE' | 'PENDING';

export default function PoliciesScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.userId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const policiesQuery = useQuery({
    queryKey: ['agent-policies', userId],
    queryFn: getPolicies,
    enabled: Boolean(userId),
  });

  const allPolicies = useMemo(() => policiesQuery.data ?? [], [policiesQuery.data]);

  const filteredPolicies = useMemo(() => {
    return allPolicies.filter((p) => {
      // Status filter
      if (filter === 'ACTIVE' && p.status !== 'ACTIVE') return false;
      if (filter === 'PENDING' && p.status !== 'PENDING') return false;

      // Text search
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesFarmer = p.farmerName.toLowerCase().includes(query);
        const matchesNumber = p.policyNumber.toLowerCase().includes(query);
        const matchesPlan = p.planName.toLowerCase().includes(query);
        return matchesFarmer || matchesNumber || matchesPlan;
      }

      return true;
    });
  }, [allPolicies, filter, search]);

  const counts = useMemo(() => {
    return {
      all: allPolicies.length,
      active: allPolicies.filter((p) => p.status === 'ACTIVE').length,
      pending: allPolicies.filter((p) => p.status === 'PENDING').length,
    };
  }, [allPolicies]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <VStack style={styles.container} space="md">
        {/* Header */}
        <HStack alignItems="center" justifyContent="space-between" style={styles.header}>
          <VStack space="xs">
            <Text style={styles.eyebrow}>JB SOLAR ARCHIVE</Text>
            <Heading size="xl" style={styles.title}>
              Policies
            </Heading>
          </VStack>
          <Button
            onPress={() => router.push('/workflow')}
            style={styles.newPolicyButton}
            accessibilityRole="button"
          >
            <HStack alignItems="center" space="xs">
              <PlusIcon size={16} color="#c5e86c" strokeWidth={2.4} />
              <ButtonText style={styles.newPolicyText}>New</ButtonText>
            </HStack>
          </Button>
        </HStack>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchIcon}>
            <SearchIcon size={18} color={AppColors.textMuted} strokeWidth={2} />
          </View>
          <Input variant="outline" style={styles.searchInputInner}>
            <InputField
              value={search}
              onChangeText={setSearch}
              placeholder="Search by farmer, policy number or plan…"
              placeholderTextColor={AppColors.textSubtle}
              style={styles.searchInputText}
            />
          </Input>
          {search ? (
            <Pressable onPress={() => setSearch('')} style={styles.clearSearchButton}>
              <CloseIcon size={16} color={AppColors.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <HStack space="xs" style={styles.filterRow}>
          <Pressable
            onPress={() => setFilter('ALL')}
            style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'ALL' && styles.filterChipTextActive]}>
              All ({counts.all})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('ACTIVE')}
            style={[styles.filterChip, filter === 'ACTIVE' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'ACTIVE' && styles.filterChipTextActive]}>
              Active ({counts.active})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('PENDING')}
            style={[styles.filterChip, filter === 'PENDING' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'PENDING' && styles.filterChipTextActive]}>
              Pending ({counts.pending})
            </Text>
          </Pressable>
        </HStack>

        {/* Policy List Scroll */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={policiesQuery.isRefetching}
              onRefresh={() => void policiesQuery.refetch()}
              tintColor={AppColors.brand}
              colors={[AppColors.brand]}
            />
          }
        >
          {policiesQuery.isPending ? (
            <VStack style={styles.stateCard} space="sm" alignItems="center">
              <ActivityIndicator color={AppColors.brand} size="large" />
              <Text style={styles.subtitle}>Loading policies from JB Solar…</Text>
            </VStack>
          ) : policiesQuery.isError ? (
            <Card style={styles.stateCard}>
              <VStack space="md" alignItems="center">
                <Text style={styles.errorText}>{getApiErrorMessage(policiesQuery.error)}</Text>
                <Button onPress={() => void policiesQuery.refetch()} style={styles.primaryButton}>
                  <ButtonText>Retry Connection</ButtonText>
                </Button>
              </VStack>
            </Card>
          ) : filteredPolicies.length > 0 ? (
            <VStack space="sm">
              {filteredPolicies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  onPress={() =>
                    router.push({ pathname: '/policy/[id]', params: { id: policy.id } })
                  }
                />
              ))}
            </VStack>
          ) : (
            <Card style={styles.emptyCard}>
              <VStack space="sm" alignItems="center">
                <View style={styles.emptyIconPill}>
                  <PolicyIcon size={28} color={AppColors.brand} strokeWidth={1.8} />
                </View>
                <Heading size="sm" style={styles.emptyTitle}>
                  {search || filter !== 'ALL' ? 'No matching policies' : 'No policies yet'}
                </Heading>
                <Text style={styles.emptySub}>
                  {search || filter !== 'ALL'
                    ? 'Try adjusting your search query or switching the status filter tab.'
                    : 'Start a new field registration to issue policies for local farmers.'}
                </Text>
                {search || filter !== 'ALL' ? (
                  <Button
                    variant="outline"
                    onPress={() => {
                      setSearch('');
                      setFilter('ALL');
                    }}
                    style={styles.clearFilterButton}
                  >
                    <ButtonText style={styles.clearFilterText}>Reset Filters</ButtonText>
                  </Button>
                ) : (
                  <Button onPress={() => router.push('/workflow')} style={styles.primaryButton}>
                    <ButtonText>Start First Policy</ButtonText>
                  </Button>
                )}
              </VStack>
            </Card>
          )}
        </ScrollView>
      </VStack>
    </SafeAreaView>
  );
}

export function PolicyCard({ policy, onPress }: { policy: Policy; onPress: () => void }) {
  const isPending = policy.status === 'PENDING';
  const isActive = policy.status === 'ACTIVE';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View policy ${policy.policyNumber}, ${policy.farmerName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.policyCardPressable, pressed && styles.cardPressed]}
    >
      <Card style={styles.policyCard}>
        {/* Top Header: Policy # and Status Badge */}
        <HStack alignItems="center" justifyContent="space-between" style={styles.policyTopRow}>
          <HStack alignItems="center" space="xs">
            <PolicyIcon size={14} color={AppColors.primaryLight} strokeWidth={2} />
            <Text style={styles.policyNumber}>{policy.policyNumber}</Text>
          </HStack>

          <View
            style={[
              styles.statusPill,
              isActive
                ? styles.statusPillActive
                : isPending
                  ? styles.statusPillPending
                  : styles.statusPillOther,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isActive
                  ? styles.statusDotActive
                  : isPending
                    ? styles.statusDotPending
                    : styles.statusDotOther,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isActive
                  ? styles.statusTextActive
                  : isPending
                    ? styles.statusTextPending
                    : styles.statusTextOther,
              ]}
            >
              {policy.status}
            </Text>
          </View>
        </HStack>

        {/* Main Body: Farmer & Plan */}
        <VStack space="xs" style={styles.policyBody}>
          <Text style={styles.farmerName}>{policy.farmerName}</Text>
          <Text style={styles.planName}>{policy.planName}</Text>
        </VStack>

        {/* Specifications & Financial Divider */}
        <View style={styles.divider} />

        <HStack alignItems="center" justifyContent="space-between" style={styles.policyFooter}>
          <HStack alignItems="center" space="xs" style={styles.specsRow}>
            <View style={styles.specBadge}>
              <ZapIcon size={12} color={AppColors.brand} strokeWidth={2.4} />
              <Text style={styles.specText}>{policy.pumpPowerHp} HP</Text>
            </View>
            <View style={styles.specBadge}>
              <Text style={styles.specText}>{policy.motorHeadMeters}m head</Text>
            </View>
          </HStack>

          <HStack alignItems="center" space="xs">
            <VStack alignItems="flex-end">
              <Text style={styles.amount}>
                ₹{policy.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.amountSub}>Incl. GST</Text>
            </VStack>
            <ChevronRightIcon size={18} color={AppColors.textMuted} strokeWidth={2} />
          </HStack>
        </HStack>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 2,
  },
  eyebrow: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: AppColors.brand,
    fontSize: 24,
    fontWeight: '800',
  },
  newPolicyButton: {
    backgroundColor: AppColors.brand,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  newPolicyText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInputInner: {
    flex: 1,
    borderWidth: 0,
    minHeight: 46,
    backgroundColor: 'transparent',
  },
  searchInputText: {
    fontSize: 13,
    color: AppColors.brand,
  },
  clearSearchButton: {
    padding: 6,
  },
  filterRow: {
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  filterChipActive: {
    backgroundColor: AppColors.brand,
    borderColor: AppColors.brand,
  },
  filterChipText: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#c5e86c',
  },
  listContent: {
    paddingBottom: 28,
  },
  stateCard: {
    minHeight: 140,
    justifyContent: 'center',
    borderRadius: 18,
    padding: 22,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  subtitle: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: AppColors.error,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: AppColors.brand,
    marginTop: 8,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
  },
  emptyIconPill: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: AppColors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    color: AppColors.brand,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: AppColors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  clearFilterButton: {
    marginTop: 10,
    borderColor: AppColors.border,
    borderRadius: 12,
  },
  clearFilterText: {
    color: AppColors.brand,
    fontSize: 12,
  },
  policyCardPressable: {
    borderRadius: 16,
    marginBottom: 4,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  policyCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  policyTopRow: {
    marginBottom: 8,
  },
  policyNumber: {
    color: AppColors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillActive: {
    backgroundColor: '#dcfce7',
  },
  statusPillPending: {
    backgroundColor: '#fef9c3',
  },
  statusPillOther: {
    backgroundColor: '#f3f4f6',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#166534',
  },
  statusDotPending: {
    backgroundColor: '#854d0e',
  },
  statusDotOther: {
    backgroundColor: '#4b5563',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#166534',
  },
  statusTextPending: {
    color: '#854d0e',
  },
  statusTextOther: {
    color: '#374151',
  },
  policyBody: {
    marginBottom: 10,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.brand,
  },
  planName: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderSubtle,
    marginVertical: 6,
  },
  policyFooter: {
    alignItems: 'center',
  },
  specsRow: {
    flexWrap: 'wrap',
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  specText: {
    fontSize: 11,
    color: AppColors.brand,
    fontWeight: '700',
  },
  amount: {
    color: AppColors.brand,
    fontSize: 15,
    fontWeight: '900',
  },
  amountSub: {
    color: AppColors.textSubtle,
    fontSize: 9,
    fontWeight: '600',
  },
});
