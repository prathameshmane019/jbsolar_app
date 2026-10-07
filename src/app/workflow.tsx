import {
  Button,
  ButtonText,
  Card,
  Heading,
  HStack,
  Image,
  ScrollView,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/form-field';
import { SignatureCanvas } from '@/components/signature-canvas';
import {
  AlertCircleIcon,
  CameraIcon,
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  MapPinIcon,
  SearchIcon,
  ShareIcon,
  SunIcon,
  UserIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import {
  createFarmer,
  createPaymentOrder,
  createPolicy,
  getAgentProfile,
  getApiErrorMessage,
  getInvoice,
  getPolicies,
  getPolicy,
  getPolicyPlans,
  searchFarmers,
  simulateDummyPaymentSuccess,
} from '@/lib/api';
import {
  optimizeImageForUpload,
  uploadAttachment,
  type LocalAttachment,
} from '@/lib/files';
import {
  createInvoicePdf,
  downloadInvoicePdf,
  shareInvoicePdf,
} from '@/lib/invoice-pdf';
import { useAuthStore } from '@/store/auth-store';
import type {
  Farmer,
  FarmerRequest,
  Invoice,
  Payment,
  Policy,
  PolicyFilePurpose,
  PolicyPlan,
} from '@/types';

type Step = 'farmer' | 'system' | 'evidence' | 'payment' | 'complete';
type EvidenceState = (LocalAttachment & {
  status: 'uploading' | 'uploaded' | 'failed';
  error?: string;
}) | null;
type Evidence = Record<PolicyFilePurpose, EvidenceState>;

const workflowSteps: { id: Step; title: string; subtitle: string }[] = [
  { id: 'farmer', title: 'Farmer', subtitle: 'Aadhaar KYC' },
  { id: 'system', title: 'Pump Set', subtitle: 'HP & Head' },
  { id: 'evidence', title: 'Evidence', subtitle: 'Photo & Sig' },
  { id: 'payment', title: 'Payment', subtitle: 'Authorization' },
  { id: 'complete', title: 'Complete', subtitle: 'Invoice PDF' },
];

const initialFarmerForm: FarmerRequest = {
  fullName: '',
  mobile: '',
  address: '',
  district: '',
  taluka: '',
  village: '',
};

const HP_PRESETS = ['3', '5', '7.5', '10'];
const HEAD_PRESETS = ['30', '50', '70', '100'];

function normalizeMobile(value: string): string {
  return value.replace(/\D/g, '');
}

function farmerToRequest(record: Farmer, aadhaarFallback: string): FarmerRequest {
  return {
    fullName: record.fullName,
    mobile: record.mobile,
    aadhaarNumber: record.aadhaarNumber ?? aadhaarFallback,
    address: record.address,
    district: record.district,
    taluka: record.taluka,
    village: record.village,
  };
}

export default function WorkflowScreen() {
  const router = useRouter();
  const { policyId: routePolicyId } = useLocalSearchParams<{ policyId?: string }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const agentMobile = useAuthStore((state) => state.mobile);
  const [step, setStep] = useState<Step>(() => (routePolicyId ? 'payment' : 'farmer'));
  const [searchValue, setSearchValue] = useState('');
  const [farmerForm, setFarmerForm] = useState<FarmerRequest>(initialFarmerForm);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [powerHp, setPowerHp] = useState('');
  const [headMeters, setHeadMeters] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PolicyPlan | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoiceAction, setInvoiceAction] = useState<'share' | 'download' | null>(null);
  const [evidence, setEvidence] = useState<Evidence>({
    CUSTOMER_SIGNATURE: null,
    PUMP_SET_IMAGE: null,
  });
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const uploadLocks = useRef(new Set<PolicyFilePurpose>());

  const profileQuery = useQuery({
    queryKey: ['agent-profile', userId, agentMobile],
    queryFn: async () => {
      if (!userId || !agentMobile) {
        throw new Error('Your login session is incomplete. Please sign in again.');
      }
      return getAgentProfile(userId, agentMobile);
    },
    enabled: Boolean(userId && agentMobile),
  });




  const agentPoliciesQuery = useQuery({
    queryKey: ['agent-policies', userId],
    queryFn: getPolicies,
    enabled: Boolean(userId && farmer?.id),
  });

  const resumePolicyQuery = useQuery({
    queryKey: ['policy', routePolicyId],
    queryFn: async () => {
      if (!routePolicyId) throw new Error('Policy ID is required.');
      return getPolicy(routePolicyId);
    },
    enabled: Boolean(routePolicyId),
  });

    // Current active policy reference (persists even if resumed policy transitions to ACTIVE)
  const currentPolicy = policy ?? resumePolicyQuery.data ?? null;

  // Active workflow step: if resumed policy is already ACTIVE, show complete step directly
  const activeStep: Step =
    resumePolicyQuery.data?.status === 'ACTIVE' ? 'complete' : step;

  const policyQuery = useQuery({
    queryKey: ['policy', currentPolicy?.id],
    queryFn: async () => {
      if (!currentPolicy) throw new Error('Policy details are required.');
      return getPolicy(currentPolicy.id);
    },
    enabled: Boolean(
      currentPolicy?.id &&
        (activeStep === 'complete' || payment?.status === 'SUCCESS' || currentPolicy?.status === 'ACTIVE'),
    ),
  });

  const invoiceQuery = useQuery({
    queryKey: ['invoice', currentPolicy?.id, payment?.invoiceId],
    queryFn: async () => {
      if (!currentPolicy) throw new Error('Policy details are required to retrieve the invoice.');
      return getInvoice(currentPolicy.id, payment?.invoiceId);
    },
    enabled: Boolean(
      currentPolicy?.id &&
        (activeStep === 'complete' || payment?.status === 'SUCCESS' || currentPolicy?.status === 'ACTIVE'),
    ),
    retry: 2,
  });

    const plansQuery = useQuery({
    queryKey: ['policy-plans'],
    queryFn: getPolicyPlans,
    enabled: activeStep === 'system',
  });
  const farmerSearch = useMutation({
    mutationFn: searchFarmers,
    onSuccess: (records, aadhaarQuery) => {
      const exactMatch = records.find((record) => record.aadhaarNumber === aadhaarQuery);
      const match = exactMatch ?? (records.length === 1 ? records[0] : null);
      if (match) {
        setFarmer(match);
        setFarmerForm(farmerToRequest(match, aadhaarQuery));
        setStep('system');
      } else if (!records.length) {
        setFarmerForm((current) => ({ ...current, aadhaarNumber: aadhaarQuery }));
      }
    },
  });

  const farmerRegistration = useMutation({
    mutationFn: createFarmer,
    onSuccess: (result) => {
      setFarmer(result);
      setStep('system');
    },
  });

  const policyCreation = useMutation({
    mutationFn: createPolicy,
    onSuccess: (result) => {
      setPolicy(result);
      setStep('evidence');
      void queryClient.invalidateQueries({ queryKey: ['agent-policies', userId] });
    },
  });

  const paymentOrder = useMutation({
    mutationFn: createPaymentOrder,
    onSuccess: (result) => {
      setPayment(result);
      void queryClient.invalidateQueries({ queryKey: ['agent-policies', userId] });
    },
  });

  const paymentConfirmation = useMutation({
    mutationFn: simulateDummyPaymentSuccess,
    onSuccess: (result) => {
      setPayment(result);
      void queryClient.invalidateQueries({ queryKey: ['agent-policies', userId] });
      setStep('complete');
      if (currentPolicy) {
        void queryClient.invalidateQueries({ queryKey: ['policy', currentPolicy.id] });
        void queryClient.invalidateQueries({ queryKey: ['invoice', currentPolicy.id] });
      }
    },
  });

  const stepIndex = workflowSteps.findIndex((item) => item.id === step);
  const effectiveMobile = farmerForm.mobile.trim();
  const canRegisterFarmer =
    farmerForm.fullName.trim().length > 1 &&
    normalizeMobile(effectiveMobile).length >= 10 &&
    /^\d{12}$/.test(farmerForm.aadhaarNumber ?? '') &&
    farmerForm.address.trim().length > 0 &&
    farmerForm.district.trim().length > 0 &&
    farmerForm.taluka.trim().length > 0 &&
    farmerForm.village.trim().length > 0;

  const numericPower = Number(powerHp);
  const numericHead = Number(headMeters);
  const canCreatePolicy =
    Boolean(farmer && selectedPlan && profileQuery.data) &&
    Number.isFinite(numericPower) &&
    numericPower > 0 &&
    Number.isFinite(numericHead) &&
    numericHead > 0;

  const haveBothImages =
    evidence.CUSTOMER_SIGNATURE?.status === 'uploaded' &&
    evidence.PUMP_SET_IMAGE?.status === 'uploaded';
  const loadingResumePolicy = Boolean(routePolicyId && resumePolicyQuery.isPending);

  const pendingFarmerPolicies =
    agentPoliciesQuery.data?.filter(
      (existingPolicy) =>
        existingPolicy.farmerId === farmer?.id && existingPolicy.status === 'PENDING',
    ) ?? [];

  const chooseFarmer = (record: Farmer) => {
    setFarmer(record);
    setFarmerForm(farmerToRequest(record, searchValue.trim()));
    setStep('system');
  };

  const resumePendingPolicy = (pendingPolicy: Policy) => {
    setPolicy(pendingPolicy);
    setPayment(null);
    setStep('payment');
  };

  const registerFarmer = () => {
    farmerRegistration.mutate({
      ...farmerForm,
      fullName: farmerForm.fullName.trim(),
      mobile: effectiveMobile,
      aadhaarNumber: farmerForm.aadhaarNumber?.trim() || undefined,
      address: farmerForm.address.trim(),
      district: farmerForm.district.trim(),
      taluka: farmerForm.taluka.trim(),
      village: farmerForm.village.trim(),
    });
  };

  const startPolicy = () => {
    if (!farmer || !selectedPlan || !canCreatePolicy) return;
    policyCreation.mutate({
      farmerId: farmer.id,
      policyPlanId: selectedPlan.id,
      startDate: new Date().toISOString().slice(0, 10),
      vendorId: profileQuery.data?.vendorId,
      pumpPowerHp: numericPower,
      motorHeadMeters: numericHead,
    });
  };

  const uploadEvidenceImage = async (
    purpose: PolicyFilePurpose,
    attachment: LocalAttachment,
  ) => {
    if (!currentPolicy || uploadLocks.current.has(purpose)) return;
    uploadLocks.current.add(purpose);
    setEvidenceError(null);
    setEvidence((current) => ({ ...current, [purpose]: { ...attachment, status: 'uploading' } }));

    try {
      const optimizedAttachment = await optimizeImageForUpload(attachment);
      setEvidence((current) => ({
        ...current,
        [purpose]: { ...optimizedAttachment, status: 'uploading' },
      }));
      await uploadAttachment('POLICY', currentPolicy.id, optimizedAttachment, purpose);
      setEvidence((current) => ({
        ...current,
        [purpose]: { ...optimizedAttachment, status: 'uploaded' },
      }));
    } catch (error) {
      const message = getApiErrorMessage(error);
      setEvidence((current) => ({
        ...current,
        [purpose]: {
          ...(current[purpose] ?? attachment),
          status: 'failed',
          error: message,
        },
      }));
      setEvidenceError(message);
    } finally {
      uploadLocks.current.delete(purpose);
    }
  };

  const capturePumpSetImage = async () => {
    const purpose: PolicyFilePurpose = 'PUMP_SET_IMAGE';
    if (evidence[purpose]?.status === 'uploaded' || evidence[purpose]?.status === 'uploading') {
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setEvidenceError('Please allow camera access in device settings to capture the pump-set image.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (result.canceled) return;
      const image = result.assets[0];
      const contentType = image.mimeType ?? 'image/jpeg';
      await uploadEvidenceImage(purpose, {
        uri: image.uri,
        name: image.fileName ?? 'pump-set.jpg',
        contentType,
        size: image.fileSize ?? 0,
        width: image.width,
        height: image.height,
      });
    } catch (error) {
      setEvidenceError(getApiErrorMessage(error));
    }
  };

  const createPayment = () => {
    if (!currentPolicy) return;
    paymentOrder.mutate(currentPolicy.id);
  };

  const confirmPayment = () => {
    if (!payment || payment.status !== 'PENDING') return;
    paymentConfirmation.mutate(payment.id);
  };

  const handleInvoiceAction = async (invoice: Invoice, action: 'share' | 'download') => {
    if (invoiceAction) return;
    const targetPolicy = policyQuery.data ?? currentPolicy;
    if (!targetPolicy) {
      Alert.alert('Policy Record Loading', 'Please wait a moment for policy data to load.');
      return;
    }

    setInvoiceAction(action);
    try {
      const pdfFile = await createInvoicePdf(invoice, targetPolicy);
      if (action === 'share') {
        await shareInvoicePdf(pdfFile, invoice.invoiceNumber);
      } else {
        const downloaded = await downloadInvoicePdf(pdfFile, invoice.invoiceNumber);
        if (downloaded) {
          Alert.alert('Invoice Saved', 'The official invoice PDF has been saved successfully.');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <VStack style={styles.screen} space="md">
        {/* Top Header */}
        <HStack style={styles.topbar} alignItems="center" justifyContent="space-between">
          <HStack alignItems="center" space="sm">
            <View style={styles.topLogo}>
              <SunIcon size={20} color="#f59e0b" strokeWidth={2.4} />
            </View>
            <VStack space="xs">
              <Text style={styles.eyebrow}>FIELD REGISTRATION</Text>
              <Heading size="md" style={styles.heading}>
                Solar Pump Policy
              </Heading>
            </VStack>
          </HStack>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close workflow"
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <CloseIcon size={18} color={AppColors.brand} strokeWidth={2.4} />
          </Pressable>
        </HStack>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <VStack space="md">
            {/* Stepper Card */}
            <Card style={styles.progressCard}>
              <HStack style={styles.progressTrack} alignItems="center" justifyContent="space-between">
                {workflowSteps.map((item, index) => {
                  const isDone = index < stepIndex;
                  const isCurrent = index === stepIndex;
                  return (
                    <View key={item.id} style={styles.progressStepWrap}>
                      <View
                        style={[
                          styles.progressCircle,
                          isDone && styles.progressCircleDone,
                          isCurrent && styles.progressCircleCurrent,
                        ]}
                      >
                        {isDone ? (
                          <CheckIcon size={12} color="#ffffff" strokeWidth={3} />
                        ) : (
                          <Text
                            style={[
                              styles.progressNum,
                              isCurrent && styles.progressNumCurrent,
                            ]}
                          >
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.progressTitle,
                          isCurrent && styles.progressTitleCurrent,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </View>
                  );
                })}
              </HStack>
            </Card>

            {loadingResumePolicy ? (
              <Card style={styles.resultCard}>
                <HStack alignItems="center" space="sm" justifyContent="center">
                  <ActivityIndicator color={AppColors.brand} size="small" />
                  <Text style={styles.mutedText}>Loading policy details…</Text>
                </HStack>
              </Card>
            ) : null}

            {/* STEP 1: FARMER */}
            {!loadingResumePolicy && step === 'farmer' ? (
              <Section
                title="1. Locate or Register Farmer"
                subtitle="Search by 12-digit Aadhaar number to link the existing record or register a new farmer."
              >
                <VStack space="md">
                  <VStack space="xs">
                    <Field
                      label="Farmer Aadhaar Number"
                      placeholder="Enter 12 digits (e.g. 123456789012)"
                      value={searchValue}
                      onChangeText={(value) =>
                        setSearchValue(value.replace(/\D/g, '').slice(0, 12))
                      }
                      keyboardType="numeric"
                      helperText={
                        searchValue.length > 0 && searchValue.length < 12
                          ? `${12 - searchValue.length} more digits needed`
                          : searchValue.length === 12
                            ? '12 digits entered'
                            : undefined
                      }
                    />
                    <Button
                      variant="outline"
                      isDisabled={!/^\d{12}$/.test(searchValue) || farmerSearch.isPending}
                      onPress={() => farmerSearch.mutate(searchValue.trim())}
                      style={styles.searchButton}
                    >
                      <HStack alignItems="center" space="xs">
                        <SearchIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
                        <ButtonText style={styles.searchButtonText}>
                          {farmerSearch.isPending ? 'Searching Records…' : 'Search Aadhaar Records'}
                        </ButtonText>
                      </HStack>
                    </Button>
                  </VStack>

                  {farmerSearch.isError ? (
                    <ErrorMessage message={getApiErrorMessage(farmerSearch.error)} />
                  ) : null}

                  {/* Found Farmers */}
                  {farmerSearch.isSuccess && farmerSearch.data.length > 0 ? (
                    <VStack space="sm">
                      <Text style={styles.resultKicker}>MATCHING FARMER RECORD FOUND</Text>
                      {farmerSearch.data.map((record) => (
                        <Card key={record.id} style={styles.farmerMatchCard}>
                          <HStack alignItems="center" space="sm" style={{ marginBottom: 8 }}>
                            <View style={styles.farmerAvatar}>
                              <UserIcon size={18} color={AppColors.brand} strokeWidth={2.2} />
                            </View>
                            <VStack space="xs" style={{ flex: 1 }}>
                              <Heading size="sm" style={styles.farmerNameHeading}>
                                {record.fullName}
                              </Heading>
                              <Text style={styles.farmerMeta}>
                                {record.customerCode} · {record.mobile}
                              </Text>
                            </VStack>
                          </HStack>
                          <HStack alignItems="center" space="xs" style={{ marginBottom: 12 }}>
                            <MapPinIcon size={14} color={AppColors.textMuted} strokeWidth={2} />
                            <Text style={styles.farmerAddress}>
                              {record.village}, {record.taluka}, {record.district}
                            </Text>
                          </HStack>
                          <Button onPress={() => chooseFarmer(record)} style={styles.primaryButton}>
                            <ButtonText>Continue with this Farmer ›</ButtonText>
                          </Button>
                        </Card>
                      ))}
                    </VStack>
                  ) : null}

                  {/* Not Found -> Registration Form */}
                  {farmerSearch.isSuccess && farmerSearch.data.length === 0 ? (
                    <VStack space="md" style={styles.newFarmerFormBox}>
                      <View style={styles.newFarmerNotice}>
                        <Text style={styles.newFarmerNoticeTitle}>
                          Farmer not found with this Aadhaar
                        </Text>
                        <Text style={styles.newFarmerNoticeSub}>
                          Complete the registration details below to create a new farmer profile in JB Solar.
                        </Text>
                      </View>

                      <Text style={styles.formSectionHeader}>PERSONAL INFORMATION</Text>
                      <Field
                        label="Full Name"
                        placeholder="Farmer full legal name"
                        value={farmerForm.fullName}
                        onChangeText={(value) =>
                          setFarmerForm((form) => ({ ...form, fullName: value }))
                        }
                      />
                      <Field
                        label="Mobile Number"
                        placeholder="10-digit mobile number"
                        prefix="+91 "
                        value={farmerForm.mobile}
                        onChangeText={(value) =>
                          setFarmerForm((form) => ({
                            ...form,
                            mobile: value.replace(/\D/g, '').slice(0, 10),
                          }))
                        }
                        keyboardType="numeric"
                      />
                      <Field
                        label="Aadhaar Number"
                        placeholder="12 digits"
                        value={farmerForm.aadhaarNumber ?? ''}
                        onChangeText={(value) =>
                          setFarmerForm((form) => ({
                            ...form,
                            aadhaarNumber: value.replace(/\D/g, '').slice(0, 12),
                          }))
                        }
                        keyboardType="numeric"
                      />

                      <Text style={[styles.formSectionHeader, { marginTop: 8 }]}>
                        FARM / RESIDENCE LOCATION
                      </Text>
                      <Field
                        label="Village"
                        placeholder="Village name"
                        value={farmerForm.village}
                        onChangeText={(value) =>
                          setFarmerForm((form) => ({ ...form, village: value }))
                        }
                      />
                      <Field
                        label="Taluka"
                        placeholder="Taluka / Tehsil"
                        value={farmerForm.taluka}
                        onChangeText={(value) =>
                          setFarmerForm((form) => ({ ...form, taluka: value }))
                        }
                      />
                      <Field
                        label="District"
                        placeholder="District"
                        value={farmerForm.district}
                        onChangeText={(value) =>
                          setFarmerForm((form) => ({ ...form, district: value }))
                        }
                      />
                      <Field
                        label="Address / Street"
                        placeholder="Plot / Survey number / Address"
                        value={farmerForm.address}
                        onChangeText={(value) =>
                          setFarmerForm((form) => ({ ...form, address: value }))
                        }
                      />

                      <MutationError error={farmerRegistration.error} />

                      <Button
                        isDisabled={!canRegisterFarmer || farmerRegistration.isPending}
                        onPress={registerFarmer}
                        style={styles.primaryButton}
                      >
                        <ButtonText>
                          {farmerRegistration.isPending
                            ? 'Registering Farmer…'
                            : 'Register Farmer & Proceed ›'}
                        </ButtonText>
                      </Button>
                    </VStack>
                  ) : null}
                </VStack>
              </Section>
            ) : null}

            {/* STEP 2: SYSTEM / PUMP SET */}
            {!loadingResumePolicy && step === 'system' ? (
              <Section
                title="2. Pump Set & Policy Plan"
                subtitle={`Assign solar pump specifications and select a coverage plan for ${farmer?.fullName ?? 'farmer'}.`}
              >
                <VStack space="md">
                  {/* Selected Farmer Banner */}
                  {farmer ? (
                    <Card style={styles.selectedFarmerBadge}>
                      <HStack alignItems="center" space="sm">
                        <UserIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
                        <VStack space="xs" style={{ flex: 1 }}>
                          <Text style={styles.selectedFarmerName}>{farmer.fullName}</Text>
                          <Text style={styles.selectedFarmerSub}>
                            {farmer.village}, {farmer.district} · {farmer.mobile}
                          </Text>
                        </VStack>
                      </HStack>
                    </Card>
                  ) : null}

                  {/* Pending Policies alert */}
                  {pendingFarmerPolicies.length ? (
                    <Card style={styles.pendingPoliciesCard}>
                      <VStack space="xs">
                        <Heading size="sm" style={styles.pendingCardHeading}>
                          Existing Pending Policy Found
                        </Heading>
                        <Text style={styles.pendingCardSub}>
                          This farmer already has a pending policy. You can resume it instead of creating a duplicate.
                        </Text>
                        {pendingFarmerPolicies.map((pendingPolicy) => (
                          <Button
                            key={pendingPolicy.id}
                            onPress={() => resumePendingPolicy(pendingPolicy)}
                            style={styles.resumePendingBtn}
                          >
                            <ButtonText style={styles.resumePendingBtnText}>
                              Resume {pendingPolicy.policyNumber} (₹
                              {pendingPolicy.totalAmount.toLocaleString('en-IN')})
                            </ButtonText>
                          </Button>
                        ))}
                      </VStack>
                    </Card>
                  ) : null}

                  {/* Pump Power HP with Presets */}
                  <VStack space="xs">
                    <Field
                      label="Pump Motor Power (HP)"
                      placeholder="Enter HP (e.g. 5)"
                      value={powerHp}
                      onChangeText={setPowerHp}
                      keyboardType="numeric"
                      suffix="HP"
                    />
                    <HStack space="xs" style={styles.presetRow}>
                      <Text style={styles.presetLabel}>Quick Select:</Text>
                      {HP_PRESETS.map((preset) => (
                        <Pressable
                          key={preset}
                          onPress={() => setPowerHp(preset)}
                          style={[
                            styles.presetChip,
                            powerHp === preset && styles.presetChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              powerHp === preset && styles.presetChipTextActive,
                            ]}
                          >
                            {preset} HP
                          </Text>
                        </Pressable>
                      ))}
                    </HStack>
                  </VStack>

                  {/* Motor Head with Presets */}
                  <VStack space="xs">
                    <Field
                      label="Operational Head (Meters)"
                      placeholder="Enter meters (e.g. 50)"
                      value={headMeters}
                      onChangeText={setHeadMeters}
                      keyboardType="numeric"
                      suffix="meters"
                    />
                    <HStack space="xs" style={styles.presetRow}>
                      <Text style={styles.presetLabel}>Quick Select:</Text>
                      {HEAD_PRESETS.map((preset) => (
                        <Pressable
                          key={preset}
                          onPress={() => setHeadMeters(preset)}
                          style={[
                            styles.presetChip,
                            headMeters === preset && styles.presetChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              headMeters === preset && styles.presetChipTextActive,
                            ]}
                          >
                            {preset} m
                          </Text>
                        </Pressable>
                      ))}
                    </HStack>
                  </VStack>

                  {/* Policy Plan Selection */}
                  <VStack space="xs" style={{ marginTop: 6 }}>
                    <Text style={styles.formSectionHeader}>SELECT POLICY COVERAGE PLAN</Text>
                    {plansQuery.isPending ? (
                      <HStack alignItems="center" space="sm" style={{ paddingVertical: 12 }}>
                        <ActivityIndicator color={AppColors.brand} size="small" />
                        <Text style={styles.mutedText}>Loading plans…</Text>
                      </HStack>
                    ) : plansQuery.isError ? (
                      <VStack space="sm">
                        <ErrorMessage message={getApiErrorMessage(plansQuery.error)} />
                        <Button variant="outline" onPress={() => plansQuery.refetch()}>
                          <ButtonText>Retry Plans</ButtonText>
                        </Button>
                      </VStack>
                    ) : plansQuery.data?.length ? (
                      plansQuery.data.map((plan) => {
                        const isSelected = selectedPlan?.id === plan.id;
                        const total = plan.price * (1 + plan.gstPercentage / 100);
                        return (
                          <Pressable
                            key={plan.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: isSelected }}
                            onPress={() => setSelectedPlan(plan)}
                            style={styles.planCardWrapper}
                          >
                            <Card
                              style={[
                                styles.planCard,
                                isSelected && styles.planCardSelected,
                              ]}
                            >
                              <HStack alignItems="flex-start" justifyContent="space-between">
                                <VStack space="xs" style={{ flex: 1, marginRight: 10 }}>
                                  <HStack alignItems="center" space="xs">
                                    <Heading size="sm" style={styles.planName}>
                                      {plan.name}
                                    </Heading>
                                    <View style={styles.durationPill}>
                                      <Text style={styles.durationPillText}>
                                        {plan.durationMonths} Mos
                                      </Text>
                                    </View>
                                  </HStack>
                                  <Text style={styles.planDesc}>{plan.description}</Text>
                                </VStack>
                                <View
                                  style={[
                                    styles.radioCircle,
                                    isSelected && styles.radioCircleSelected,
                                  ]}
                                >
                                  {isSelected ? (
                                    <CheckIcon size={12} color="#ffffff" strokeWidth={3} />
                                  ) : null}
                                </View>
                              </HStack>

                              <View style={styles.planDivider} />

                              <HStack alignItems="center" justifyContent="space-between">
                                <VStack>
                                  <Text style={styles.planPriceLabel}>Total Amount</Text>
                                  <Text style={styles.planPrice}>
                                    ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </Text>
                                </VStack>
                                <Text style={styles.gstTag}>Includes {plan.gstPercentage}% GST</Text>
                              </HStack>
                            </Card>
                          </Pressable>
                        );
                      })
                    ) : (
                      <Text style={styles.mutedText}>No active policy plans found.</Text>
                    )}
                  </VStack>

                  <MutationError error={policyCreation.error} />

                  <Button
                    isDisabled={!canCreatePolicy || policyCreation.isPending}
                    onPress={startPolicy}
                    style={styles.primaryButton}
                  >
                    <ButtonText>
                      {policyCreation.isPending
                        ? 'Creating Policy Agreement…'
                        : 'Generate Policy & Continue ›'}
                    </ButtonText>
                  </Button>
                </VStack>
              </Section>
            ) : null}

            {/* STEP 3: EVIDENCE (SIGNATURE & CAMERA) */}
            {!loadingResumePolicy && step === 'evidence' ? (
              <Section
                title="3. Field Evidence & Customer Consent"
                subtitle="Capture customer signature and take photo of the solar pump set."
              >
                <VStack space="md">
                  {policy ? (
                    <Card style={styles.policyBriefCard}>
                      <HStack alignItems="center" justifyContent="space-between">
                        <VStack space="xs">
                          <Text style={styles.resultKicker}>POLICY IN DRAFT</Text>
                          <Heading size="sm" style={styles.policyBriefNum}>
                            {policy.policyNumber}
                          </Heading>
                          <Text style={styles.mutedText}>
                            {policy.pumpPowerHp} HP · {policy.motorHeadMeters}m head
                          </Text>
                        </VStack>
                        <View style={styles.briefPill}>
                          <Text style={styles.briefPillText}>READY FOR EVIDENCE</Text>
                        </View>
                      </HStack>
                    </Card>
                  ) : null}

                  {/* Evidence 1: Customer Signature */}
                  <Card style={styles.evidenceSectionCard}>
                    <VStack space="xs">
                      <HStack alignItems="center" space="xs">
                        <Text style={styles.resultKicker}>REQUIRED EVIDENCE 1</Text>
                        {evidence.CUSTOMER_SIGNATURE?.status === 'uploaded' ? (
                          <View style={styles.verifiedTag}>
                            <CheckIcon size={12} color="#166534" strokeWidth={3} />
                            <Text style={styles.verifiedTagText}>UPLOADED</Text>
                          </View>
                        ) : null}
                      </HStack>
                      <Heading size="sm" style={styles.evidenceTitle}>
                        Customer Touch Signature
                      </Heading>
                      <Text style={styles.mutedText}>
                        Have the farmer sign with their finger inside the canvas to consent to the policy terms.
                      </Text>
                    </VStack>

                    <SignatureCanvas
                      disabled={
                        evidence.CUSTOMER_SIGNATURE?.status === 'uploaded' ||
                        evidence.CUSTOMER_SIGNATURE?.status === 'uploading'
                      }
                      onSave={(att) => void uploadEvidenceImage('CUSTOMER_SIGNATURE', att)}
                    />

                    {evidence.CUSTOMER_SIGNATURE ? (
                      <AttachmentStatusRow
                        item={evidence.CUSTOMER_SIGNATURE}
                        onRetry={() => {
                          const item = evidence.CUSTOMER_SIGNATURE;
                          if (item) void uploadEvidenceImage('CUSTOMER_SIGNATURE', item);
                        }}
                      />
                    ) : null}
                  </Card>

                  {/* Evidence 2: Pump Set Photo */}
                  <Card style={styles.evidenceSectionCard}>
                    <VStack space="xs">
                      <HStack alignItems="center" space="xs">
                        <Text style={styles.resultKicker}>REQUIRED EVIDENCE 2</Text>
                        {evidence.PUMP_SET_IMAGE?.status === 'uploaded' ? (
                          <View style={styles.verifiedTag}>
                            <CheckIcon size={12} color="#166534" strokeWidth={3} />
                            <Text style={styles.verifiedTagText}>UPLOADED</Text>
                          </View>
                        ) : null}
                      </HStack>
                      <Heading size="sm" style={styles.evidenceTitle}>
                        Installed Solar Pump Set Photo
                      </Heading>
                      <Text style={styles.mutedText}>
                        Capture clear photo of the pump set, panels, and motor installed at the farmer site.
                      </Text>
                    </VStack>

                    {evidence.PUMP_SET_IMAGE?.uri ? (
                      <View style={styles.imagePreviewWrap}>
                        <Image
                          source={{ uri: evidence.PUMP_SET_IMAGE.uri }}
                          alt="Pump set"
                          style={styles.imagePreview}
                        />
                      </View>
                    ) : null}

                    {evidence.PUMP_SET_IMAGE ? (
                      <AttachmentStatusRow
                        item={evidence.PUMP_SET_IMAGE}
                        onRetry={() => {
                          const item = evidence.PUMP_SET_IMAGE;
                          if (item) void uploadEvidenceImage('PUMP_SET_IMAGE', item);
                        }}
                      />
                    ) : null}

                    <Button
                      variant="outline"
                      isDisabled={
                        evidence.PUMP_SET_IMAGE?.status === 'uploaded' ||
                        evidence.PUMP_SET_IMAGE?.status === 'uploading'
                      }
                      onPress={() => void capturePumpSetImage()}
                      style={styles.cameraBtn}
                    >
                      <HStack alignItems="center" space="xs">
                        <CameraIcon size={18} color={AppColors.brand} strokeWidth={2.2} />
                        <ButtonText style={styles.cameraBtnText}>
                          {evidence.PUMP_SET_IMAGE ? 'Retake Photo' : 'Open Camera to Capture'}
                        </ButtonText>
                      </HStack>
                    </Button>
                  </Card>

                  {evidenceError ? <ErrorMessage message={evidenceError} /> : null}

                  <Button
                    isDisabled={!haveBothImages || paymentOrder.isPending}
                    onPress={() => {
                      setStep('payment');
                      createPayment();
                    }}
                    style={styles.primaryButton}
                  >
                    <ButtonText>
                      {paymentOrder.isPending
                        ? 'Preparing Payment Authorization…'
                        : 'Proceed to Payment Authorization ›'}
                    </ButtonText>
                  </Button>
                </VStack>
              </Section>
            ) : null}

            {/* STEP 4: PAYMENT */}
            {!loadingResumePolicy && step === 'payment' ? (
              <Section
                title="4. Policy Payment & Verification"
                subtitle="Complete payment authorization to activate full policy coverage."
              >
                <VStack space="md">
                  {currentPolicy ? (
                    <Card style={styles.orderSummaryCard}>
                      <HStack alignItems="center" justifyContent="space-between" style={{ marginBottom: 6 }}>
                        <Text style={styles.resultKicker}>POLICY DETAILS</Text>
                        <View style={styles.briefPill}>
                          <Text style={styles.briefPillText}>{currentPolicy.status}</Text>
                        </View>
                      </HStack>
                      <Heading size="md" style={styles.orderPolicyNum}>
                        {currentPolicy.policyNumber}
                      </Heading>
                      <Text style={styles.orderFarmer}>
                        {currentPolicy.farmerName} · {currentPolicy.planName}
                      </Text>
                      <Text style={styles.mutedText}>
                        Pump Capacity: {currentPolicy.pumpPowerHp} HP ({currentPolicy.motorHeadMeters}m head)
                      </Text>
                      <View style={styles.planDivider} />
                      <HStack alignItems="center" justifyContent="space-between">
                        <Text style={styles.totalLabel}>Total Payable</Text>
                        <Text style={styles.orderTotal}>
                          ₹{currentPolicy.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </Text>
                      </HStack>
                    </Card>
                  ) : null}

                  {!payment ? (
                    <VStack space="md">
                      <MutationError error={paymentOrder.error} />
                      <Button
                        isDisabled={paymentOrder.isPending}
                        onPress={createPayment}
                        style={styles.primaryButton}
                      >
                        <ButtonText>
                          {paymentOrder.isPending ? 'Generating Order…' : 'Generate Payment Order'}
                        </ButtonText>
                      </Button>
                    </VStack>
                  ) : (
                    <Card style={styles.paymentCard}>
                      <VStack space="sm">
                        <HStack alignItems="center" justifyContent="space-between">
                          <Text style={styles.resultKicker}>GATEWAY STATUS</Text>
                          <View
                            style={[
                              styles.briefPill,
                              payment.status === 'SUCCESS' ? styles.briefPillSuccess : styles.briefPillPending,
                            ]}
                          >
                            <Text style={styles.briefPillText}>{payment.status}</Text>
                          </View>
                        </HStack>
                        <Heading size="sm" style={styles.paymentOrderNum}>
                          Order Reference: {payment.paymentNumber}
                        </Heading>
                        <Text style={styles.mutedText}>Payment Channel: {payment.gateway || 'Digital Gateway'}</Text>

                        {payment.status === 'SUCCESS' ? (
                          <Button onPress={() => setStep('complete')} style={styles.primaryButton}>
                            <ButtonText>View Active Policy & Invoice ›</ButtonText>
                          </Button>
                        ) : payment.status === 'PENDING' ? (
                          <VStack space="sm" style={{ marginTop: 8 }}>
                            <MutationError error={paymentConfirmation.error} />
                            <Button
                              isDisabled={paymentConfirmation.isPending}
                              onPress={confirmPayment}
                              style={styles.primaryButton}
                            >
                              <HStack alignItems="center" space="xs">
                                <CheckCircleIcon size={18} color="#c5e86c" strokeWidth={2.4} />
                                <ButtonText style={styles.primaryButtonText}>
                                  {paymentConfirmation.isPending
                                    ? 'Verifying Authorization…'
                                    : 'Authorize & Complete Payment'}
                                </ButtonText>
                              </HStack>
                            </Button>
                          </VStack>
                        ) : null}
                      </VStack>
                    </Card>
                  )}
                </VStack>
              </Section>
            ) : null}

            {/* STEP 5: COMPLETE & INVOICE */}
            {!loadingResumePolicy && step === 'complete' ? (
              <Section
                title="5. Enrollment Complete"
                subtitle="The policy has been verified and activated. You can download or share the official tax invoice PDF."
              >
                <VStack space="md">
                  {/* Celebration Success Banner */}
                  <Card style={styles.successBannerCard}>
                    <VStack alignItems="center" space="xs">
                      <View style={styles.successCheckCircle}>
                        <CheckIcon size={28} color="#166534" strokeWidth={3} />
                      </View>
                      <Heading size="md" style={styles.successTitle}>
                        Policy Activated Successfully!
                      </Heading>
                      <Text style={styles.successSub}>
                        {policyQuery.data?.policyNumber ?? currentPolicy?.policyNumber}
                      </Text>
                      <Text style={styles.successFarmer}>
                        Coverage active for {policyQuery.data?.farmerName ?? currentPolicy?.farmerName}
                      </Text>
                    </VStack>
                  </Card>

                  {/* Invoice Retrieval Card */}
                  {invoiceQuery.isPending ? (
                    <Card style={styles.resultCard}>
                      <HStack alignItems="center" space="sm" justifyContent="center">
                        <ActivityIndicator color={AppColors.brand} size="small" />
                        <Text style={styles.mutedText}>Retrieving official tax invoice…</Text>
                      </HStack>
                    </Card>
                  ) : null}

                  {invoiceQuery.isError ? (
                    <VStack space="sm">
                      <ErrorMessage message={getApiErrorMessage(invoiceQuery.error)} />
                      <Button variant="outline" onPress={() => void invoiceQuery.refetch()}>
                        <ButtonText>Retry Invoice Retrieval</ButtonText>
                      </Button>
                    </VStack>
                  ) : null}

                  {invoiceQuery.data ? (
                    <Card style={styles.invoiceCard}>
                      <VStack space="md">
                        <HStack alignItems="center" justifyContent="space-between">
                          <VStack space="xs">
                            <Text style={styles.resultKicker}>OFFICIAL TAX INVOICE</Text>
                            <Heading size="sm" style={styles.invoiceNum}>
                              {invoiceQuery.data.invoiceNumber}
                            </Heading>
                          </VStack>
                          <Text style={styles.invoiceDate}>{invoiceQuery.data.invoiceDate}</Text>
                        </HStack>

                        <HStack alignItems="center" justifyContent="space-between">
                          <Text style={styles.priceLabel}>Paid in Full</Text>
                          <Text style={styles.invoiceAmount}>
                            ₹{invoiceQuery.data.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </Text>
                        </HStack>

                        <View style={styles.planDivider} />

                        <HStack space="sm">
                          <Button
                            isDisabled={invoiceAction !== null}
                            onPress={() => {
                              if (invoiceQuery.data) void handleInvoiceAction(invoiceQuery.data, 'download');
                            }}
                            style={styles.downloadBtn}
                          >
                            <HStack alignItems="center" space="xs">
                              <DownloadIcon size={16} color="#ffffff" strokeWidth={2.4} />
                              <ButtonText style={styles.btnTextWhite}>
                                {invoiceAction === 'download' ? 'Saving…' : 'Download Invoice'}
                              </ButtonText>
                            </HStack>
                          </Button>

                          <Button
                            variant="outline"
                            isDisabled={invoiceAction !== null}
                            onPress={() => {
                              if (invoiceQuery.data) void handleInvoiceAction(invoiceQuery.data, 'share');
                            }}
                            style={styles.shareBtn}
                          >
                            <HStack alignItems="center" space="xs">
                              <ShareIcon size={16} color={AppColors.brand} strokeWidth={2.4} />
                              <ButtonText style={styles.btnTextDark}>
                                {invoiceAction === 'share' ? 'Preparing…' : 'Share PDF'}
                              </ButtonText>
                            </HStack>
                          </Button>
                        </HStack>
                      </VStack>
                    </Card>
                  ) : null}

                  <Button
                    onPress={() => router.replace('/dashboard')}
                    style={styles.primaryButton}
                  >
                    <ButtonText>Return to Dashboard</ButtonText>
                  </Button>
                </VStack>
              </Section>
            ) : null}

            {/* Back Button Navigation between earlier steps */}
            {!loadingResumePolicy &&
            step !== 'payment' &&
            step !== 'complete' ? (
              <HStack style={styles.navRow} alignItems="center" justifyContent="space-between">
                <Button
                  variant="outline"
                  isDisabled={stepIndex === 0 || policyCreation.isPending}
                  onPress={() => setStep(workflowSteps[Math.max(0, stepIndex - 1)].id)}
                  style={styles.navButton}
                >
                  <ButtonText style={{ color: AppColors.textMuted }}>‹ Previous Step</ButtonText>
                </Button>
                <Text style={styles.navHint}>
                  {step === 'farmer'
                    ? 'Step 1 of 5'
                    : step === 'system'
                      ? 'Step 2 of 5'
                      : 'Step 3 of 5'}
                </Text>
              </HStack>
            ) : null}
          </VStack>
        </ScrollView>
      </VStack>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <Card style={styles.sectionCard}>
      <VStack space="md">
        <VStack space="xs">
          <Heading size="md" style={styles.sectionHeading}>
            {title}
          </Heading>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </VStack>
        {children}
      </VStack>
    </Card>
  );
}

function AttachmentStatusRow({
  item,
  onRetry,
}: {
  item: NonNullable<EvidenceState>;
  onRetry: () => void;
}) {
  const isUploaded = item.status === 'uploaded';
  const isFailed = item.status === 'failed';

  return (
    <HStack style={styles.attachmentRow} alignItems="center" space="sm">
      <View
        style={[
          styles.statusMiniCircle,
          isUploaded ? styles.statusMiniCircleSuccess : isFailed ? styles.statusMiniCircleError : {},
        ]}
      >
        {isUploaded ? (
          <CheckIcon size={12} color="#166534" strokeWidth={3} />
        ) : isFailed ? (
          <CloseIcon size={12} color="#b42318" strokeWidth={3} />
        ) : (
          <ActivityIndicator color={AppColors.brand} size="small" />
        )}
      </View>
      <VStack style={styles.attachmentCopy} space="xs">
        <Text numberOfLines={1} style={styles.attachmentName}>
          {item.name}
        </Text>
        <Text style={[styles.attachmentStatus, isFailed && styles.errorText]}>
          {isUploaded
            ? 'Uploaded securely'
            : item.status === 'uploading'
              ? 'Uploading to cloud…'
              : item.error ?? 'Upload failed'}
        </Text>
      </VStack>
      {isFailed ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryPill}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </HStack>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <HStack alignItems="flex-start" space="xs">
        <AlertCircleIcon size={16} color={AppColors.error} strokeWidth={2} />
        <Text accessibilityRole="alert" style={styles.errorText}>
          {message}
        </Text>
      </HStack>
    </View>
  );
}

function MutationError({ error }: { error: unknown }) {
  return error ? <ErrorMessage message={getApiErrorMessage(error)} /> : null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  topbar: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  topLogo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heading: {
    color: AppColors.brand,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    height: 38,
    width: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  progressCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  progressTrack: {
    paddingHorizontal: 6,
  },
  progressStepWrap: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleDone: {
    backgroundColor: '#166534',
  },
  progressCircleCurrent: {
    backgroundColor: AppColors.brand,
    borderWidth: 2,
    borderColor: AppColors.accent,
  },
  progressNum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
  },
  progressNumCurrent: {
    color: '#ffffff',
  },
  progressTitle: {
    fontSize: 10,
    color: AppColors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  progressTitleCurrent: {
    color: AppColors.brand,
    fontWeight: '800',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeading: {
    color: AppColors.brand,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  searchButton: {
    minHeight: 46,
    borderRadius: 12,
    borderColor: AppColors.brand,
    marginTop: 2,
  },
  searchButtonText: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  farmerMatchCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f7fee7',
    borderWidth: 1,
    borderColor: '#d9f99d',
  },
  farmerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: AppColors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerNameHeading: {
    color: AppColors.brand,
    fontSize: 15,
    fontWeight: '800',
  },
  farmerMeta: {
    color: AppColors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  farmerAddress: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
  newFarmerFormBox: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
  },
  newFarmerNotice: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  newFarmerNoticeTitle: {
    color: '#854d0e',
    fontSize: 12,
    fontWeight: '700',
  },
  newFarmerNoticeSub: {
    color: '#a16207',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  formSectionHeader: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  selectedFarmerBadge: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: AppColors.accentLight,
    borderWidth: 1,
    borderColor: '#d2e8b8',
  },
  selectedFarmerName: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedFarmerSub: {
    color: AppColors.textMuted,
    fontSize: 11,
  },
  pendingPoliciesCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingCardHeading: {
    color: '#854d0e',
    fontSize: 13,
    fontWeight: '800',
  },
  pendingCardSub: {
    color: '#a16207',
    fontSize: 11,
    lineHeight: 16,
  },
  resumePendingBtn: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#854d0e',
    marginTop: 6,
  },
  resumePendingBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  presetRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  presetLabel: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontWeight: '600',
    marginRight: 2,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: AppColors.bg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  presetChipActive: {
    backgroundColor: AppColors.brand,
    borderColor: AppColors.brand,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.brand,
  },
  presetChipTextActive: {
    color: '#c5e86c',
  },
  planCardWrapper: {
    marginVertical: 4,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
  },
  planCardSelected: {
    borderColor: AppColors.brand,
    backgroundColor: '#f7fee7',
  },
  planName: {
    color: AppColors.brand,
    fontSize: 15,
    fontWeight: '800',
  },
  durationPill: {
    backgroundColor: AppColors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationPillText: {
    color: AppColors.brand,
    fontSize: 10,
    fontWeight: '700',
  },
  planDesc: {
    color: AppColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: AppColors.brand,
    backgroundColor: AppColors.brand,
  },
  planDivider: {
    height: 1,
    backgroundColor: AppColors.borderSubtle,
    marginVertical: 10,
  },
  planPriceLabel: {
    color: AppColors.textMuted,
    fontSize: 10,
  },
  planPrice: {
    color: AppColors.brand,
    fontSize: 16,
    fontWeight: '900',
  },
  gstTag: {
    color: AppColors.textSubtle,
    fontSize: 11,
  },
  policyBriefCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: AppColors.bg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  policyBriefNum: {
    color: AppColors.brand,
    fontSize: 14,
  },
  briefPill: {
    backgroundColor: AppColors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  briefPillSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  briefPillPending: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
  },
  briefPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: AppColors.brand,
  },
  evidenceSectionCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  evidenceTitle: {
    color: AppColors.brand,
    fontSize: 14,
    fontWeight: '800',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '800',
  },
  cameraBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderColor: AppColors.border,
    marginTop: 8,
  },
  cameraBtnText: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  imagePreviewWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  imagePreview: {
    width: '100%',
    height: 180,
  },
  attachmentRow: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: AppColors.bg,
    marginTop: 8,
  },
  statusMiniCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMiniCircleSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusMiniCircleError: {
    backgroundColor: '#fee2e2',
  },
  attachmentCopy: {
    flex: 1,
  },
  attachmentName: {
    color: AppColors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentStatus: {
    color: '#166534',
    fontSize: 11,
  },
  retryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  retryText: {
    color: '#b42318',
    fontSize: 11,
    fontWeight: '700',
  },
  orderSummaryCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fafcfa',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  orderPolicyNum: {
    color: AppColors.brand,
    fontSize: 16,
  },
  orderFarmer: {
    color: AppColors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  orderTotal: {
    color: AppColors.brand,
    fontSize: 20,
    fontWeight: '900',
  },
  paymentCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  paymentOrderNum: {
    color: AppColors.brand,
    fontSize: 14,
  },
  successBannerCard: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  successCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    color: '#166534',
    fontSize: 18,
    fontWeight: '800',
  },
  successSub: {
    color: AppColors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  successFarmer: {
    color: AppColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  invoiceCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
  },
  invoiceNum: {
    color: AppColors.brand,
    fontSize: 15,
  },
  invoiceDate: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
  priceLabel: {
    color: AppColors.textMuted,
    fontSize: 13,
  },
  invoiceAmount: {
    color: AppColors.brand,
    fontSize: 18,
    fontWeight: '900',
  },
  downloadBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: AppColors.brand,
  },
  shareBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderColor: AppColors.border,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnTextDark: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: AppColors.brand,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: AppColors.bg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  resultKicker: {
    color: AppColors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mutedText: {
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  totalLabel: {
    color: AppColors.brand,
    fontSize: 13,
    fontWeight: '800',
  },
  navRow: {
    minHeight: 44,
    marginTop: 8,
  },
  navButton: {
    minHeight: 40,
    borderRadius: 12,
    borderColor: AppColors.border,
    paddingHorizontal: 12,
  },
  navHint: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: AppColors.errorBg,
    borderColor: AppColors.errorBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: AppColors.error,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
