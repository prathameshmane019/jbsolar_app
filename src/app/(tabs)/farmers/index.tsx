import {
  Button,
  ButtonText,
  Card,
  Heading,
  HStack,
  Input,
  InputField,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronRightIcon, MapPinIcon, SearchIcon, UserIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getAgentProfile, getApiErrorMessage, getFarmersRegisteredByAgent, getPolicies } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Farmer } from '@/types';

export default function FarmersScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.userId);
  const mobile = useAuthStore((state) => state.mobile);
  const [search, setSearch] = useState('');

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

  const farmers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const records = farmersQuery.data ?? [];
    if (!query) return records;
    return records.filter((farmer) =>
      [
        farmer.fullName,
        farmer.customerCode,
        farmer.mobile,
        farmer.village,
        farmer.taluka,
        farmer.district,
      ].some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [farmersQuery.data, search]);
  const policyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    policiesQuery.data?.forEach((policy) => {
      counts.set(policy.farmerId, (counts.get(policy.farmerId) ?? 0) + 1);
    });
    return counts;
  }, [policiesQuery.data]);

  const isRefreshing =
    profileQuery.isRefetching || farmersQuery.isRefetching || policiesQuery.isRefetching;
  const refresh = () => {
    void profileQuery.refetch();
    if (agentId) void farmersQuery.refetch();
    void policiesQuery.refetch();
  };

  const renderEmptyState = () => {
    if (profileQuery.isPending || (Boolean(agentId) && farmersQuery.isPending)) {
      return (
        <VStack style={styles.stateCard} space="sm" alignItems="center">
          <ActivityIndicator color={AppColors.brand} />
          <Text style={styles.stateDescription}>Loading your farmer records…</Text>
        </VStack>
      );
    }

    if (profileQuery.isError || farmersQuery.isError) {
      const error = profileQuery.error ?? farmersQuery.error;
      return (
        <Card style={styles.stateCard}>
          <VStack space="sm" alignItems="center">
            <Heading size="sm" style={styles.stateTitle}>Farmers unavailable</Heading>
            <Text style={styles.stateDescription}>{getApiErrorMessage(error)}</Text>
            <Button onPress={refresh} style={styles.retryButton}>
              <ButtonText style={styles.retryButtonText}>Try again</ButtonText>
            </Button>
          </VStack>
        </Card>
      );
    }

    if (search.trim()) {
      return (
        <Card style={styles.stateCard}>
          <VStack space="xs" alignItems="center">
            <Heading size="sm" style={styles.stateTitle}>No matching farmers</Heading>
            <Text style={styles.stateDescription}>Try a name, customer ID, mobile number, or village.</Text>
          </VStack>
        </Card>
      );
    }

    return (
      <Card style={styles.stateCard}>
        <VStack space="sm" alignItems="center">
          <View style={styles.emptyIcon}>
            <UserIcon size={24} color={AppColors.brand} />
          </View>
          <Heading size="sm" style={styles.stateTitle}>No farmers registered yet</Heading>
          <Text style={styles.stateDescription}>
            Farmers you register will be available here with their policy history.
          </Text>
          <Button onPress={() => router.push('/workflow')} style={styles.retryButton}>
            <ButtonText style={styles.retryButtonText}>Register a farmer</ButtonText>
          </Button>
        </VStack>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={farmers}
        keyExtractor={(farmer) => farmer.id}
        renderItem={({ item }) => (
          <FarmerRow
            farmer={item}
            policyCount={policyCounts.get(item.id)}
            onPress={() =>
              router.push({ pathname: '/farmers/[id]', params: { id: item.id } })
            }
          />
        )}
        ListHeaderComponent={
          <VStack space="md" style={styles.headerContent}>
            <View>
              <Text style={styles.eyebrow}>FIELD DIRECTORY</Text>
              <Heading size="xl" style={styles.title}>Farmers</Heading>
              <Text style={styles.subtitle}>Farmers registered by your agent account</Text>
            </View>
            {(profileQuery.isError || farmersQuery.isError) && farmersQuery.data ? (
              <Card style={styles.staleNotice}>
                <Text style={styles.noticeText}>
                  Could not refresh farmer records. Showing the last available data.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading farmer records"
                  onPress={refresh}
                >
                  <Text style={styles.retryLink}>Retry</Text>
                </Pressable>
              </Card>
            ) : null}
            <View style={styles.searchBox}>
              <SearchIcon size={18} color={AppColors.textMuted} />
              <Input variant="outline" style={styles.searchInput}>
                <InputField
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search name, ID, mobile, or village"
                  placeholderTextColor={AppColors.textSubtle}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Search registered farmers"
                  style={styles.searchText}
                />
              </Input>
            </View>
            {farmersQuery.data ? (
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.resultCount}>
                  {farmers.length} {farmers.length === 1 ? 'farmer' : 'farmers'}
                  {search.trim() ? ' found' : ' registered'}
                </Text>
                {policiesQuery.isPending ? (
                  <Text style={styles.policyCountHint}>Loading policy summaries</Text>
                ) : policiesQuery.isError ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading policy summaries"
                    onPress={() => void policiesQuery.refetch()}
                  >
                    <Text style={styles.policyErrorHint}>Policy summaries unavailable · Retry</Text>
                  </Pressable>
                ) : null}
              </HStack>
            ) : null}
          </VStack>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={AppColors.brand}
            colors={[AppColors.brand]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function FarmerRow({
  farmer,
  policyCount,
  onPress,
}: {
  farmer: Farmer;
  policyCount?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${farmer.fullName}'s farmer and policy details`}
      onPress={onPress}
      style={({ pressed }) => [styles.farmerRow, pressed && styles.rowPressed]}
    >
      <View style={styles.avatar}>
        <UserIcon size={19} color={AppColors.brand} />
      </View>
      <VStack space="xs" style={styles.farmerCopy}>
        <Text style={styles.farmerName} numberOfLines={1}>{farmer.fullName}</Text>
        <Text style={styles.farmerMeta} numberOfLines={1}>
          {farmer.customerCode} · {farmer.mobile}
        </Text>
        <HStack alignItems="center" space="xs">
          <MapPinIcon size={13} color={AppColors.textMuted} />
          <Text style={styles.location} numberOfLines={1}>
            {[farmer.village, farmer.taluka, farmer.district].filter(Boolean).join(', ') || 'Location not provided'}
          </Text>
        </HStack>
      </VStack>
      <VStack alignItems="flex-end" space="xs">
        <Text style={styles.policyCount}>
          {policyCount === undefined ? '—' : policyCount}
        </Text>
        <Text style={styles.policyLabel}>policies</Text>
      </VStack>
      <ChevronRightIcon size={18} color={AppColors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.bg },
  listContent: { paddingHorizontal: 20, paddingBottom: 28, flexGrow: 1 },
  headerContent: { paddingTop: 16, paddingBottom: 18 },
  eyebrow: { color: AppColors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: AppColors.brand, fontSize: 26, fontWeight: '800', marginTop: 4 },
  subtitle: { color: AppColors.textMuted, fontSize: 13, marginTop: 4 },
  searchBox: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  searchInput: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  searchText: { color: AppColors.brand, fontSize: 13 },
  resultCount: { color: AppColors.brand, fontSize: 13, fontWeight: '700' },
  policyCountHint: { color: AppColors.textMuted, fontSize: 11 },
  policyErrorHint: { color: AppColors.error, fontSize: 11, fontWeight: '600' },
  staleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    backgroundColor: AppColors.warningBg,
    borderWidth: 1,
    borderColor: AppColors.warningBorder,
    borderRadius: 12,
  },
  noticeText: { flex: 1, color: AppColors.warning, fontSize: 12, lineHeight: 17 },
  retryLink: { color: AppColors.brand, fontSize: 12, fontWeight: '800', padding: 4 },
  farmerRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  rowPressed: { opacity: 0.72 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accentLight,
  },
  farmerCopy: { flex: 1, minWidth: 0 },
  farmerName: { color: AppColors.brand, fontSize: 14, fontWeight: '800' },
  farmerMeta: { color: AppColors.textMuted, fontSize: 11 },
  location: { flex: 1, color: AppColors.textMuted, fontSize: 11 },
  policyCount: { color: AppColors.brand, fontSize: 15, fontWeight: '800' },
  policyLabel: { color: AppColors.textMuted, fontSize: 10 },
  separator: { height: 8 },
  stateCard: {
    minHeight: 160,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accentLight,
  },
  stateTitle: { color: AppColors.brand, fontWeight: '800', textAlign: 'center' },
  stateDescription: { color: AppColors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: AppColors.brand },
  retryButtonText: { color: AppColors.accent, fontWeight: '800' },
});
