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
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  PolicyIcon,
  ShareIcon,
  UserIcon,
  ZapIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getApiErrorMessage, getInvoice, getPolicy } from '@/lib/api';
import {
  createInvoicePdf,
  downloadInvoicePdf,
  shareInvoicePdf,
} from '@/lib/invoice-pdf';
import type { Invoice } from '@/types';

const formatInr = (value?: number | null) =>
  typeof value === 'number'
    ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';

export default function PolicyDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoiceAction, setInvoiceAction] = useState<'share' | 'download' | null>(null);

  const policyQuery = useQuery({
    queryKey: ['policy', id],
    queryFn: () => {
      if (!id) throw new Error('Policy ID is required.');
      return getPolicy(id);
    },
    enabled: Boolean(id),
  });

  const invoiceQuery = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => {
      if (!id) throw new Error('Policy ID is required.');
      return getInvoice(id);
    },
    enabled: Boolean(id),
    retry: 1,
  });

  const policy = policyQuery.data;
  const invoice = invoiceQuery.data;
  const isPending = policy?.status === 'PENDING';
  const isActive = policy?.status === 'ACTIVE';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/policies');
    }
  };

  const handleInvoicePdf = async (targetInvoice: Invoice, action: 'share' | 'download') => {
    if (invoiceAction) return;
    if (!policy) {
      Alert.alert('Details Unavailable', 'Policy record is still loading. Please try again.');
      return;
    }

    setInvoiceAction(action);
    try {
      const pdfFile = await createInvoicePdf(targetInvoice, policy);
      if (action === 'share') {
        await shareInvoicePdf(pdfFile, targetInvoice.invoiceNumber);
      } else {
        const saved = await downloadInvoicePdf(pdfFile, targetInvoice.invoiceNumber);
        if (saved) {
          Alert.alert('Invoice Saved', 'The official invoice PDF was saved to your device.');
        }
      }
    } catch (error) {
      Alert.alert(
        action === 'share' ? 'Could Not Share Invoice' : 'Could Not Save Invoice',
        getApiErrorMessage(error),
      );
    } finally {
      setInvoiceAction(null);
    }
  };

  const statusColors = isActive
    ? { title: '#166534', sub: '#15803d' }
    : { title: '#854d0e', sub: '#a16207' };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to policies"
          onPress={handleBack}
          hitSlop={8}
          style={styles.backButton}
        >
          <ArrowLeftIcon size={20} color={AppColors.brand} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>POLICY RECORD</Text>
          <Heading size="md" style={styles.headerTitle} numberOfLines={1}>
            {policy ? policy.policyNumber : 'Policy Details'}
          </Heading>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {policyQuery.isPending ? (
          <View style={[styles.card, styles.stateCard]}>
            <ActivityIndicator color={AppColors.brand} size="large" />
            <Text style={styles.subtitle}>Retrieving policy details from server…</Text>
          </View>
        ) : policyQuery.isError ? (
          <View style={[styles.card, styles.stateCard]}>
            <Text style={styles.errorText}>{getApiErrorMessage(policyQuery.error)}</Text>
            <Button onPress={() => void policyQuery.refetch()} style={styles.primaryButton}>
              <ButtonText>Retry</ButtonText>
            </Button>
          </View>
        ) : policy ? (
          <View style={styles.stack}>
            {/* Status Banner */}
            <View
              style={[
                styles.statusBanner,
                isActive
                  ? styles.statusBannerActive
                  : isPending
                    ? styles.statusBannerPending
                    : styles.statusBannerOther,
              ]}
            >
              <View style={styles.statusLeft}>
                {isActive ? (
                  <CheckCircleIcon size={24} color={statusColors.title} strokeWidth={2.4} />
                ) : (
                  <ClockIcon size={24} color={statusColors.title} strokeWidth={2.4} />
                )}
                <View style={styles.statusTextWrap}>
                  <Text style={[styles.statusBannerTitle, { color: statusColors.title }]}>
                    {isActive ? 'Active Coverage' : 'Pending Verification'}
                  </Text>
                  <Text style={[styles.statusBannerSub, { color: statusColors.sub }]}>
                    {isActive
                      ? 'Solar warranty & insurance active'
                      : 'Registration requires payment completion'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusPill,
                  isActive ? styles.statusPillActive : styles.statusPillPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isActive ? styles.statusPillTextActive : styles.statusPillTextPending,
                  ]}
                >
                  {policy.status}
                </Text>
              </View>
            </View>

            {/* Tax Invoice */}
            {invoice ? (
              <View style={[styles.card, styles.invoiceCard]}>
                <View style={styles.rowBetween}>
                  <View style={styles.inlineGroup}>
                    <PolicyIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
                    <Heading size="sm" style={styles.invoiceHeading}>
                      Tax Invoice
                    </Heading>
                  </View>
                  <Text style={styles.invoiceDate}>{invoice.invoiceDate}</Text>
                </View>

                <View style={styles.rowBetween}>
                  <View style={styles.invoiceCol}>
                    <Text style={styles.invoiceNumLabel}>Invoice Number</Text>
                    <Text style={styles.invoiceNum} numberOfLines={1}>
                      {invoice.invoiceNumber}
                    </Text>
                  </View>
                  <View style={[styles.invoiceCol, styles.alignEnd]}>
                    <Text style={styles.invoiceNumLabel}>Paid Amount</Text>
                    <Text style={styles.invoiceTotal}>{formatInr(invoice.totalAmount)}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.invoiceActionsRow}>
                  <Button
                    onPress={() => void handleInvoicePdf(invoice, 'download')}
                    isDisabled={invoiceAction !== null}
                    style={styles.invoiceActionBtn}
                  >
                    <View style={styles.btnInner}>
                      <DownloadIcon size={16} color="#ffffff" strokeWidth={2.4} />
                      <ButtonText style={styles.invoiceBtnText} numberOfLines={1}>
                        {invoiceAction === 'download' ? 'Saving…' : 'Download'}
                      </ButtonText>
                    </View>
                  </Button>

                  <Button
                    variant="outline"
                    onPress={() => void handleInvoicePdf(invoice, 'share')}
                    isDisabled={invoiceAction !== null}
                    style={styles.invoiceShareBtn}
                  >
                    <View style={styles.btnInner}>
                      <ShareIcon size={16} color={AppColors.brand} strokeWidth={2.4} />
                      <ButtonText style={styles.invoiceShareBtnText} numberOfLines={1}>
                        {invoiceAction === 'share' ? 'Preparing…' : 'Share PDF'}
                      </ButtonText>
                    </View>
                  </Button>
                </View>
              </View>
            ) : invoiceQuery.isPending && isActive ? (
              <View style={[styles.card, styles.invoiceLoadingCard]}>
                <ActivityIndicator color={AppColors.brand} size="small" />
                <Text style={styles.subtitle}>Loading official tax invoice…</Text>
              </View>
            ) : null}

            {/* Pending Action */}
            {isPending ? (
              <View style={styles.pendingActionCard}>
                <Text style={styles.pendingActionTitle}>Finish Policy Activation</Text>
                <Text style={styles.pendingActionSub}>
                  Complete image evidence and verify payment to issue the final active policy and
                  downloadable invoice for the farmer.
                </Text>
                <Button
                  onPress={() =>
                    router.push({
                      pathname: '/workflow',
                      params: { policyId: policy.id },
                    })
                  }
                  style={styles.primaryActionButton}
                >
                  <ButtonText style={styles.primaryActionText}>
                    Continue & Complete Policy ›
                  </ButtonText>
                </Button>
              </View>
            ) : null}

            {/* Customer Information */}
            <Section title="Customer Information" icon={<UserIcon size={16} color={AppColors.brand} strokeWidth={2.2} />}>
              <DetailItem label="Farmer Name" value={policy.farmerName} highlight />
              <DetailItem label="Customer Reference" value={policy.farmerId} />
            </Section>

            {/* Pump Specifications */}
            <Section title="Solar Pump Specifications" icon={<ZapIcon size={16} color={AppColors.brand} strokeWidth={2.2} />}>
              <DetailItem label="Pump Motor Capacity" value={`${policy.pumpPowerHp} HP`} highlight />
              <DetailItem label="Operational Head" value={`${policy.motorHeadMeters} Meters`} />
              <DetailItem label="Equipment Type" value="Solar Agricultural Water Pumping System" />
            </Section>

            {/* Plan & Coverage */}
            <Section title="Coverage & Plan Details" icon={<PolicyIcon size={16} color={AppColors.brand} strokeWidth={2.2} />}>
              <DetailItem label="Plan Name" value={policy.planName} />
              <DetailItem label="Coverage Term" value={`${policy.startDate} → ${policy.endDate}`} />
            </Section>

            {/* Financial Summary */}
            <Section title="Financial Summary">
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Base Premium</Text>
                <Text style={styles.priceVal}>{formatInr(policy.amount)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Applicable GST</Text>
                <Text style={styles.priceVal}>{formatInr(policy.gstAmount)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total Premium</Text>
                  <Text style={styles.totalSub}>Inclusive of GST</Text>
                </View>
                <Text style={styles.totalVal}>{formatInr(policy.totalAmount)}</Text>
              </View>
            </Section>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, styles.sectionCard]}>
      <View style={styles.sectionHeader}>
        {icon}
        <Heading size="sm" style={styles.sectionTitle}>
          {title}
        </Heading>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function DetailItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: AppColors.bg,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    lineHeight: 14,
  },
  headerTitle: {
    color: AppColors.brand,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },

  /* Layout */
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stack: {
    gap: 14,
  },
  card: {
    margin: 0,
    borderRadius: 18,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderSubtle,
  },

  /* States */
  stateCard: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 22,
  },
  subtitle: {
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorText: {
    color: AppColors.error,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: AppColors.brand,
  },

  /* Status banner */
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statusBannerActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusBannerPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusBannerOther: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  statusLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  statusBannerSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'center',
  },
  statusPillActive: {
    backgroundColor: '#dcfce7',
  },
  statusPillPending: {
    backgroundColor: '#fef3c7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  statusPillTextActive: {
    color: '#166534',
  },
  statusPillTextPending: {
    color: '#854d0e',
  },

  /* Invoice */
  invoiceCard: {
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceHeading: {
    color: AppColors.brand,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  invoiceDate: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceCol: {
    flexShrink: 1,
    gap: 2,
  },
  invoiceNumLabel: {
    color: AppColors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
  },
  invoiceNum: {
    color: AppColors.brand,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  invoiceTotal: {
    color: AppColors.brand,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  invoiceActionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: AppColors.brand,
  },
  invoiceBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceShareBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderColor: AppColors.border,
  },
  invoiceShareBtnText: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
  },

  /* Pending action */
  pendingActionCard: {
    gap: 8,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingActionTitle: {
    color: '#854d0e',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  pendingActionSub: {
    color: '#a16207',
    fontSize: 12,
    lineHeight: 18,
  },
  primaryActionButton: {
    minHeight: 48,
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#854d0e',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Sections */
  sectionCard: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: AppColors.brand,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  sectionBody: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailLabel: {
    flexShrink: 0,
    maxWidth: '45%',
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  detailValueHighlight: {
    color: AppColors.primaryLight,
    fontWeight: '800',
  },

  /* Financial summary */
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  priceVal: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  totalSub: {
    color: AppColors.textSubtle,
    fontSize: 10,
    lineHeight: 14,
  },
  totalVal: {
    color: AppColors.brand,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
});