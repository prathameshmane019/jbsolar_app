import type { LocalAttachment } from '@/lib/files';
import type { Farmer, FarmerRequest, Policy, PolicyFilePurpose } from '@/types';

// ── Types ──────────────────────────────────────────────────────────
export type Step = 'farmer' | 'system' | 'evidence' | 'payment' | 'complete';

export type EvidenceState =
  | (LocalAttachment & {
      status: 'uploading' | 'uploaded' | 'failed';
      error?: string;
    })
  | null;

export type Evidence = Record<PolicyFilePurpose, EvidenceState>;

// ── Constants ──────────────────────────────────────────────────────
export const workflowSteps: { id: Step; title: string; subtitle: string }[] = [
  { id: 'farmer', title: 'Farmer', subtitle: 'Aadhaar KYC' },
  { id: 'system', title: 'Pump Set', subtitle: 'HP & Head' },
  { id: 'evidence', title: 'Evidence', subtitle: 'Photo & Sig' },
  { id: 'payment', title: 'Payment', subtitle: 'Authorization' },
  { id: 'complete', title: 'Complete', subtitle: 'Invoice PDF' },
];

export const initialFarmerForm: FarmerRequest = {
  fullName: '',
  mobile: '',
  address: '',
  district: '',
  taluka: '',
  village: '',
};

export const HP_PRESETS = ['3', '5', '7.5', '10'];
export const HEAD_PRESETS = ['30', '50', '70', '100'];

// ── Utils ──────────────────────────────────────────────────────────
export function normalizeMobile(value: string): string {
  return value.replace(/\D/g, '');
}

export function farmerToRequest(record: Farmer, aadhaarFallback: string): FarmerRequest {
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

export function getResumeStep(p: Policy): Step {
  if (p.status === 'ACTIVE') return 'complete';

  const hasPumpDetails = Number(p.pumpPowerHp) > 0 && Number(p.motorHeadMeters) > 0;
  if (!hasPumpDetails) return 'system';

  // If your Policy type exposes uploaded files, check them here:
  // const hasEvidence = p.files?.some(f => f.purpose === 'CUSTOMER_SIGNATURE') &&
  //                     p.files?.some(f => f.purpose === 'PUMP_SET_IMAGE');
  // return hasEvidence ? 'payment' : 'evidence';
  return 'evidence';
}
