import { create, isAxiosError, type AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { useAuthStore } from '@/store/auth-store';
import type {
  AgentProfile,
  ApiPage,
  Farmer,
  FarmerRequest,
  FileMetadata,
  Invoice,
  LoginResponse,
  Payment,
  Policy,
  PolicyFilePurpose,
  PolicyPlan,
  UploadUrlResponse,
} from '@/types';

function getExpoHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  try {
    const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
    if (
      host === 'localhost' ||
      host.endsWith('.exp.direct') ||
      host === '10.0.2.2' ||
      !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
    ) {
      return null;
    }

    return host;
  } catch {
    return null;
  }
}

function getDefaultApiBaseUrl(): string {
  if (Platform.OS === 'web') return 'http://localhost:8080/api/v1';

  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:8080/api/v1`;

  return Platform.OS === 'android'
    ? 'http://10.0.2.2:8080/api/v1'
    : 'http://localhost:8080/api/v1';
}

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') || getDefaultApiBaseUrl();

export const api = create({
  baseURL: apiBaseUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && useAuthStore.getState().isAuthenticated) {
      try {
        await useAuthStore.getState().logout();
      } catch (storageError) {
        console.error('Could not remove the expired agent session.', storageError);
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return `Unable to connect to JB Solar service. Please check your network connection and try again.`;
    }
    if (error.code === 'ECONNABORTED') {
      return `The server request timed out. Please check your connection and try again.`;
    }

    const responseData = error.response?.data;
    if (typeof responseData === 'object' && responseData !== null) {
      const details = responseData as { message?: unknown; detail?: unknown; error?: unknown };
      const message = details.message ?? details.detail ?? details.error;
      if (typeof message === 'string' && message.length > 0) return message;
    }
    return error.message;
  }

  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export async function loginAgent(credentials: {
  mobile: string;
  password: string;
}): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/agent/login', credentials);
  return data;
}

export async function getAgentProfile(userId: string, mobile: string): Promise<AgentProfile> {
  const { data } = await api.get<ApiPage<AgentProfile>>('/agents', {
    params: { page: 0, size: 100, search: mobile },
  });

  const profile = data.content.find(
    (agent) => agent.userId === userId || agent.mobile === mobile,
  );
  if (!profile) {
    throw new Error('Your vendor-agent profile was not found. Contact your company administrator.');
  }
  return profile;
}

export async function searchFarmers(search: string): Promise<Farmer[]> {
  const { data } = await api.get<ApiPage<Farmer>>('/farmers', {
    params: { page: 0, size: 20, search },
  });
  return data.content;
}

export async function createFarmer(payload: FarmerRequest): Promise<Farmer> {
  const { data } = await api.post<Farmer>('/farmers', payload);
  return data;
}

export async function getPolicyPlans(): Promise<PolicyPlan[]> {
  const { data } = await api.get<ApiPage<PolicyPlan>>('/policy-plans', {
    params: { page: 0, size: 100, activeOnly: true },
  });
  return data.content;
}

export async function createPolicy(payload: {
  farmerId: string;
  policyPlanId: string;
  startDate: string;
  vendorId?: string;
  pumpPowerHp: number;
  motorHeadMeters: number;
}): Promise<Policy> {
  const { data } = await api.post<Policy>('/policies', payload);
  return data;
}

export async function getPolicy(policyId: string): Promise<Policy> {
  const { data } = await api.get<Policy>(`/policies/${encodeURIComponent(policyId)}`);
  return data;
}

export async function getPolicies(): Promise<Policy[]> {
  const pageSize = 50;
  const { data: firstPage } = await api.get<ApiPage<Policy>>('/policies', {
    params: { page: 0, size: pageSize },
  });
  const policies = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    const { data } = await api.get<ApiPage<Policy>>('/policies', {
      params: { page, size: pageSize },
    });
    policies.push(...data.content);
  }
  return policies;
}

export async function createPaymentOrder(policyId: string): Promise<Payment> {
  const { data } = await api.post<Payment>(
    `/policies/${encodeURIComponent(policyId)}/payments/dummy-order`,
  );
  return data;
}

export async function simulateDummyPaymentSuccess(paymentId: string): Promise<Payment> {
  const { data } = await api.post<Payment>(
    `/payments/${encodeURIComponent(paymentId)}/simulate-success`,
  );
  return data;
}

export async function getInvoice(policyId: string, invoiceId?: string): Promise<Invoice> {
  const path = invoiceId
    ? `/invoices/${encodeURIComponent(invoiceId)}`
    : `/policies/${encodeURIComponent(policyId)}/invoice`;
  const { data } = await api.get<Invoice>(path);
  return data;
}

export async function createFileUploadUrl(payload: {
  resourceType: 'FARMER' | 'POLICY';
  resourceId: string;
  purpose?: 'FARMER_DOCUMENT' | PolicyFilePurpose;
  originalFilename: string;
  contentType: string;
  fileSize: number;
}): Promise<UploadUrlResponse> {
  const { data } = await api.post<UploadUrlResponse>('/mobile/files/upload-url', payload);
  return data;
}

export async function completeFileUpload(fileId: string): Promise<FileMetadata> {
  const { data } = await api.post<FileMetadata>(
    `/mobile/files/${encodeURIComponent(fileId)}/complete`,
  );
  return data;
}
