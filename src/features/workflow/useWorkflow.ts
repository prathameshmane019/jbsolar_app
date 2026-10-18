import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';

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
  updatePolicy,
} from '@/lib/api';
import { optimizeImageForUpload, uploadAttachment, type LocalAttachment } from '@/lib/files';
import { createInvoicePdf, downloadInvoicePdf, shareInvoicePdf } from '@/lib/invoice-pdf';
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

import {
  farmerToRequest,
  getResumeStep,
  initialFarmerForm,
  normalizeMobile,
  workflowSteps,
  type Evidence,
  type Step,
} from './helpers';

export function useWorkflow() {
  const router = useRouter();
  const { policyId: routePolicyId } = useLocalSearchParams<{ policyId?: string }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const agentMobile = useAuthStore((s) => s.mobile);

  // ── Local state ──────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState('');
  const [farmerForm, setFarmerForm] = useState<FarmerRequest>(initialFarmerForm);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [stepOverride, setStep] = useState<Step | null>(null);
  const [powerHpInput, setPowerHp] = useState<string | null>(null);
  const [headMetersInput, setHeadMeters] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PolicyPlan | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoiceAction, setInvoiceAction] = useState<'share' | 'download' | null>(null);
  const [evidence, setEvidence] = useState<Evidence>({
    CUSTOMER_SIGNATURE: null,
    PUMP_SET_IMAGE: null,
  });
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  // Lets the signature canvas freeze the parent ScrollView while the user draws.
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const uploadLocks = useRef(new Set<PolicyFilePurpose>());

  // ── Queries ──────────────────────────────────────────────────
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

  const currentPolicy = policy ?? resumePolicyQuery.data ?? null;

  const step: Step =
    stepOverride ?? (resumePolicyQuery.data ? getResumeStep(resumePolicyQuery.data) : 'farmer');

  const powerHp =
    powerHpInput ?? (currentPolicy?.pumpPowerHp ? String(currentPolicy.pumpPowerHp) : '');
  const headMeters =
    headMetersInput ?? (currentPolicy?.motorHeadMeters ? String(currentPolicy.motorHeadMeters) : '');

  const isFinished =
    step === 'complete' || payment?.status === 'SUCCESS' || currentPolicy?.status === 'ACTIVE';

  const policyQuery = useQuery({
    queryKey: ['policy', currentPolicy?.id],
    queryFn: async () => {
      if (!currentPolicy) throw new Error('Policy details are required.');
      return getPolicy(currentPolicy.id);
    },
    enabled: Boolean(currentPolicy?.id && isFinished),
  });

  const invoiceQuery = useQuery({
    queryKey: ['invoice', currentPolicy?.id, payment?.invoiceId],
    queryFn: async () => {
      if (!currentPolicy) throw new Error('Policy details are required to retrieve the invoice.');
      return getInvoice(currentPolicy.id, payment?.invoiceId);
    },
    enabled: Boolean(currentPolicy?.id && isFinished),
    retry: 2,
  });

  const plansQuery = useQuery({
    queryKey: ['policy-plans'],
    queryFn: getPolicyPlans,
    enabled: step === 'system',
  });

  // ── Mutations ────────────────────────────────────────────────
  const farmerSearch = useMutation({
    mutationFn: (search: string) => {
      const normalizedSearch = search.trim();
      return queryClient.fetchQuery({
        queryKey: ['farmer-search', userId, normalizedSearch],
        queryFn: () => searchFarmers(normalizedSearch),
        staleTime: 2 * 60_000,
      });
    },
    onSuccess: (records, aadhaarQuery) => {
      const exactMatch = records.find((r) => r.aadhaarNumber === aadhaarQuery);
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
      void queryClient.invalidateQueries({ queryKey: ['agent-farmers'] });
      void queryClient.invalidateQueries({ queryKey: ['farmer-search', userId] });
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

  const policyUpdate = useMutation({
    mutationFn: updatePolicy,
    onSuccess: (result) => {
      setPolicy(result);
      setStep('evidence');
      void queryClient.invalidateQueries({ queryKey: ['policy', result.id] });
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

  // ── Derived ──────────────────────────────────────────────────
  const stepIndex = workflowSteps.findIndex((s) => s.id === step);
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
  const hasValidPump =
    Number.isFinite(numericPower) && numericPower > 0 &&
    Number.isFinite(numericHead) && numericHead > 0;

  const isCompletingExisting = Boolean(currentPolicy);
  const canCreatePolicy =
    hasValidPump &&
    (isCompletingExisting || Boolean(farmer && selectedPlan && profileQuery.data));

  const haveBothImages =
    evidence.CUSTOMER_SIGNATURE?.status === 'uploaded' &&
    evidence.PUMP_SET_IMAGE?.status === 'uploaded';
  const loadingResumePolicy = Boolean(routePolicyId && resumePolicyQuery.isPending);

  const pendingFarmerPolicies =
    agentPoliciesQuery.data?.filter(
      (p) => p.farmerId === farmer?.id && p.status === 'PENDING',
    ) ?? [];

  // ── Handlers ─────────────────────────────────────────────────
  const chooseFarmer = (record: Farmer) => {
    setFarmer(record);
    setFarmerForm(farmerToRequest(record, searchValue.trim()));
    setStep('system');
  };

  const resumePendingPolicy = (pending: Policy) => {
    setPolicy(pending);
    setPayment(null);
    setPowerHp(pending.pumpPowerHp ? String(pending.pumpPowerHp) : null);
    setHeadMeters(pending.motorHeadMeters ? String(pending.motorHeadMeters) : null);
    setStep(getResumeStep(pending));
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
    if (!canCreatePolicy) return;

    if (currentPolicy) {
      if (policyUpdate.isPending) return;
      policyUpdate.mutate({
        id: currentPolicy.id,
        farmerId: currentPolicy.farmerId,
        policyPlanId: currentPolicy.planId,
        startDate: currentPolicy.startDate,
        vendorId: currentPolicy.vendorId,
        agentId: currentPolicy.agentId,
        pumpPowerHp: numericPower,
        motorHeadMeters: numericHead,
      });
      return;
    }

    if (!farmer || !selectedPlan) return;
    policyCreation.mutate({
      farmerId: farmer.id,
      agentId: profileQuery.data?.id,
      policyPlanId: selectedPlan.id,
      startDate: new Date().toISOString().slice(0, 10),
      vendorId: profileQuery.data?.vendorId,
      pumpPowerHp: numericPower,
      motorHeadMeters: numericHead,
    });
  };

  const uploadEvidenceImage = async (purpose: PolicyFilePurpose, attachment: LocalAttachment) => {
    if (!currentPolicy || uploadLocks.current.has(purpose)) return;
    uploadLocks.current.add(purpose);
    setEvidenceError(null);
    setEvidence((c) => ({ ...c, [purpose]: { ...attachment, status: 'uploading' } }));

    try {
      const optimized = await optimizeImageForUpload(attachment);
      setEvidence((c) => ({ ...c, [purpose]: { ...optimized, status: 'uploading' } }));
      await uploadAttachment('POLICY', currentPolicy.id, optimized, purpose);
      setEvidence((c) => ({ ...c, [purpose]: { ...optimized, status: 'uploaded' } }));
    } catch (error) {
      const message = getApiErrorMessage(error);
      setEvidence((c) => ({
        ...c,
        [purpose]: { ...(c[purpose] ?? attachment), status: 'failed', error: message },
      }));
      setEvidenceError(message);
    } finally {
      uploadLocks.current.delete(purpose);
    }
  };

  const capturePumpSetImage = async () => {
    const purpose: PolicyFilePurpose = 'PUMP_SET_IMAGE';
    const status = evidence[purpose]?.status;
    if (status === 'uploaded' || status === 'uploading') return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setEvidenceError('Please allow camera access in device settings to capture the pump-set image.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
      });
      if (result.canceled) return;

      const image = result.assets[0];
      await uploadEvidenceImage(purpose, {
        uri: image.uri,
        name: image.fileName ?? 'pump-set.jpg',
        contentType: image.mimeType ?? 'image/jpeg',
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

  const proceedToPayment = () => {
    setStep('payment');
    createPayment();
  };

  const confirmPayment = () => {
    if (!payment || payment.status !== 'PENDING') return;
    paymentConfirmation.mutate(payment.id);
  };

  const goBack = () => setStep(workflowSteps[Math.max(0, stepIndex - 1)].id);

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

  return {
    router, step, stepIndex, setStep, loadingResumePolicy, scrollEnabled, setScrollEnabled,
    // farmer
    searchValue, setSearchValue, farmerForm, setFarmerForm, farmer, farmerSearch,
    farmerRegistration, canRegisterFarmer, chooseFarmer, registerFarmer,
    // system
    powerHp, setPowerHp, headMeters, setHeadMeters, selectedPlan, setSelectedPlan,
    plansQuery, pendingFarmerPolicies, resumePendingPolicy, policyCreation, policyUpdate,
    canCreatePolicy, isCompletingExisting, startPolicy,
    // evidence
    currentPolicy, evidence, evidenceError, haveBothImages, uploadEvidenceImage,
    capturePumpSetImage, proceedToPayment,
    // payment
    payment, paymentOrder, paymentConfirmation, createPayment, confirmPayment,
    // complete
    policyQuery, invoiceQuery, invoiceAction, handleInvoiceAction,
    // nav
    goBack,
  };
}

export type WorkflowController = ReturnType<typeof useWorkflow>;
