import { StyleSheet } from 'react-native';
import { AppColors } from '@/constants/theme';

/**
 * All workflow styles in one place. Keys are grouped by the component that uses them.
 * If you want one file per component later, just cut the matching block out.
 */
export const styles = StyleSheet.create({
  // ── Screen / header ────────────────────────────────────────────
  safeArea: { flex: 1, backgroundColor: AppColors.bg },
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },
  topbar: { alignItems: 'center', paddingVertical: 6 },
  topLogo: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: '#fffbeb',
    borderWidth: 1, borderColor: '#fde68a', alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: AppColors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  heading: { color: AppColors.brand, fontSize: 18, fontWeight: '800' },
  closeButton: {
    height: 38, width: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
  },
  scrollContent: { paddingBottom: 32 },

  // ── Step progress ──────────────────────────────────────────────
  progressCard: {
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border,
  },
  progressTrack: { paddingHorizontal: 6 },
  progressStepWrap: { alignItems: 'center', flex: 1 },
  progressCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  progressCircleDone: { backgroundColor: '#166534' },
  progressCircleCurrent: {
    backgroundColor: AppColors.brand, borderWidth: 2, borderColor: AppColors.accent,
  },
  progressNum: { fontSize: 10, fontWeight: '700', color: '#6b7280' },
  progressNumCurrent: { color: '#ffffff' },
  progressTitle: { fontSize: 10, color: AppColors.textMuted, marginTop: 4, fontWeight: '600' },
  progressTitleCurrent: { color: AppColors.brand, fontWeight: '800' },

  // ── Section ────────────────────────────────────────────────────
  sectionCard: {
    borderRadius: 20, padding: 18, backgroundColor: AppColors.surface,
    borderWidth: 1, borderColor: AppColors.border, shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionHeading: { color: AppColors.brand, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18 },

  // ── Farmer step ────────────────────────────────────────────────
  searchButton: { minHeight: 46, borderRadius: 12, borderColor: AppColors.brand, marginTop: 2 },
  searchButtonText: { color: AppColors.brand, fontSize: 13, fontWeight: '700' },
  farmerMatchCard: {
    borderRadius: 16, padding: 16, backgroundColor: '#f7fee7',
    borderWidth: 1, borderColor: '#d9f99d',
  },
  farmerAvatar: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: AppColors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  farmerNameHeading: { color: AppColors.brand, fontSize: 15, fontWeight: '800' },
  farmerMeta: { color: AppColors.primaryLight, fontSize: 12, fontWeight: '600' },
  farmerAddress: { color: AppColors.textMuted, fontSize: 12 },
  newFarmerFormBox: {
    marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: AppColors.borderSubtle,
  },
  newFarmerNotice: {
    backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1,
    borderRadius: 12, padding: 12,
  },
  newFarmerNoticeTitle: { color: '#854d0e', fontSize: 12, fontWeight: '700' },
  newFarmerNoticeSub: { color: '#a16207', fontSize: 11, marginTop: 2, lineHeight: 16 },
  formSectionHeader: {
    color: AppColors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2,
  },

  // ── System step ────────────────────────────────────────────────
  selectedFarmerBadge: {
    borderRadius: 12, padding: 12, backgroundColor: AppColors.accentLight,
    borderWidth: 1, borderColor: '#d2e8b8',
  },
  selectedFarmerName: { color: AppColors.brand, fontSize: 13, fontWeight: '800' },
  selectedFarmerSub: { color: AppColors.textMuted, fontSize: 11 },
  pendingPoliciesCard: {
    borderRadius: 14, padding: 12, backgroundColor: '#fffbeb',
    borderWidth: 1, borderColor: '#fde68a',
  },
  pendingCardHeading: { color: '#854d0e', fontSize: 13, fontWeight: '800' },
  pendingCardSub: { color: '#a16207', fontSize: 11, lineHeight: 16 },
  resumePendingBtn: { minHeight: 38, borderRadius: 10, backgroundColor: '#854d0e', marginTop: 6 },
  resumePendingBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  presetRow: { alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  presetLabel: { fontSize: 11, color: AppColors.textMuted, fontWeight: '600', marginRight: 2 },
  presetChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: AppColors.bg, borderWidth: 1, borderColor: AppColors.border,
  },
  presetChipActive: { backgroundColor: AppColors.brand, borderColor: AppColors.brand },
  presetChipText: { fontSize: 11, fontWeight: '700', color: AppColors.brand },
  presetChipTextActive: { color: '#c5e86c' },
  planCardWrapper: { marginVertical: 4 },
  planCard: {
    borderRadius: 16, padding: 16, backgroundColor: AppColors.surface,
    borderWidth: 1.5, borderColor: AppColors.border,
  },
  planCardSelected: { borderColor: AppColors.brand, backgroundColor: '#f7fee7' },
  planName: { color: AppColors.brand, fontSize: 15, fontWeight: '800' },
  durationPill: {
    backgroundColor: AppColors.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  durationPillText: { color: AppColors.brand, fontSize: 10, fontWeight: '700' },
  planDesc: { color: AppColors.textMuted, fontSize: 12, marginTop: 2 },
  radioCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: AppColors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: AppColors.brand, backgroundColor: AppColors.brand },
  planDivider: { height: 1, backgroundColor: AppColors.borderSubtle, marginVertical: 10 },
  planPriceLabel: { color: AppColors.textMuted, fontSize: 10 },
  planPrice: { color: AppColors.brand, fontSize: 16, fontWeight: '900' },
  gstTag: { color: AppColors.textSubtle, fontSize: 11 },

  // ── Evidence step ──────────────────────────────────────────────
  policyBriefCard: {
    borderRadius: 14, padding: 14, backgroundColor: AppColors.bg,
    borderWidth: 1, borderColor: AppColors.border,
  },
  policyBriefNum: { color: AppColors.brand, fontSize: 14 },
  briefPill: {
    backgroundColor: AppColors.surface, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: AppColors.border,
  },
  briefPillSuccess: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  briefPillPending: { backgroundColor: '#fef9c3', borderColor: '#fde047' },
  briefPillText: { fontSize: 10, fontWeight: '800', color: AppColors.brand },
  evidenceSectionCard: {
    borderRadius: 16, padding: 16, backgroundColor: AppColors.surface,
    borderWidth: 1, borderColor: AppColors.border,
  },
  evidenceTitle: { color: AppColors.brand, fontSize: 14, fontWeight: '800' },
  verifiedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  verifiedTagText: { color: '#166534', fontSize: 9, fontWeight: '800' },
  cameraBtn: { minHeight: 46, borderRadius: 12, borderColor: AppColors.border, marginTop: 8 },
  cameraBtnText: { color: AppColors.brand, fontSize: 13, fontWeight: '700' },
  imagePreviewWrap: {
    borderRadius: 12, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: AppColors.border,
  },
  imagePreview: { width: '100%', height: 180 },
  attachmentRow: { borderRadius: 12, padding: 10, backgroundColor: AppColors.bg, marginTop: 8 },
  statusMiniCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  statusMiniCircleSuccess: { backgroundColor: '#dcfce7' },
  statusMiniCircleError: { backgroundColor: '#fee2e2' },
  attachmentCopy: { flex: 1 },
  attachmentName: { color: AppColors.brand, fontSize: 12, fontWeight: '700' },
  attachmentStatus: { color: '#166534', fontSize: 11 },
  retryPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#fee2e2' },
  retryText: { color: '#b42318', fontSize: 11, fontWeight: '700' },

  // ── Payment step ───────────────────────────────────────────────
  orderSummaryCard: {
    borderRadius: 16, padding: 16, backgroundColor: '#fafcfa',
    borderWidth: 1, borderColor: AppColors.border,
  },
  orderPolicyNum: { color: AppColors.brand, fontSize: 16 },
  orderFarmer: { color: AppColors.primaryLight, fontSize: 13, fontWeight: '600' },
  orderTotal: { color: AppColors.brand, fontSize: 20, fontWeight: '900' },
  paymentCard: {
    borderRadius: 16, padding: 16, backgroundColor: AppColors.surface,
    borderWidth: 1, borderColor: AppColors.border,
  },
  paymentOrderNum: { color: AppColors.brand, fontSize: 14 },
  totalLabel: { color: AppColors.brand, fontSize: 13, fontWeight: '800' },

  // ── Complete step ──────────────────────────────────────────────
  successBannerCard: {
    borderRadius: 20, padding: 24, backgroundColor: '#f0fdf4',
    borderWidth: 1.5, borderColor: '#86efac',
  },
  successCheckCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successTitle: { color: '#166534', fontSize: 18, fontWeight: '800' },
  successSub: { color: AppColors.brand, fontSize: 14, fontWeight: '700' },
  successFarmer: { color: AppColors.textMuted, fontSize: 12, marginTop: 2 },
  invoiceCard: {
    borderRadius: 18, padding: 18, backgroundColor: AppColors.surface,
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  invoiceNum: { color: AppColors.brand, fontSize: 15 },
  invoiceDate: { color: AppColors.textMuted, fontSize: 12 },
  priceLabel: { color: AppColors.textMuted, fontSize: 13 },
  invoiceAmount: { color: AppColors.brand, fontSize: 18, fontWeight: '900' },
  downloadBtn: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: AppColors.brand },
  shareBtn: { flex: 1, minHeight: 46, borderRadius: 12, borderColor: AppColors.border },
  btnTextWhite: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  btnTextDark: { color: AppColors.brand, fontSize: 13, fontWeight: '700' },

  // ── Shared ─────────────────────────────────────────────────────
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: AppColors.brand, marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  resultCard: {
    borderRadius: 14, padding: 14, backgroundColor: AppColors.bg,
    borderWidth: 1, borderColor: AppColors.border,
  },
  resultKicker: { color: AppColors.primaryLight, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  mutedText: { color: AppColors.textMuted, fontSize: 12, lineHeight: 17 },
  navRow: { minHeight: 44, marginTop: 8 },
  navButton: { minHeight: 40, borderRadius: 12, borderColor: AppColors.border, paddingHorizontal: 12 },
  navHint: { color: AppColors.textMuted, fontSize: 12, fontWeight: '600' },
  errorBox: {
    backgroundColor: AppColors.errorBg, borderColor: AppColors.errorBorder,
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  errorText: { color: AppColors.error, fontSize: 12, lineHeight: 18, flex: 1 },
});
