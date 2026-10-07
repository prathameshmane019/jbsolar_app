export type AgentRole = 'VENDOR_AGENT';

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  mobile: string;
  role: 'ADMIN' | AgentRole;
};

export type AgentProfile = {
  id: string;
  userId: string;
  vendorId: string;
  vendorName: string;
  fullName: string;
  mobile: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type Farmer = {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  aadhaarNumber?: string;
  address: string;
  district: string;
  taluka: string;
  village: string;
  createdByAgentId: string;
  createdAt: string;
};

export type FarmerRequest = {
  fullName: string;
  mobile: string;
  aadhaarNumber?: string;
  address: string;
  district: string;
  taluka: string;
  village: string;
};

export type PolicyPlan = {
  id: string;
  name: string;
  description: string;
  durationMonths: number;
  price: number;
  gstPercentage: number;
  termsAndConditions: string;
  status: string;
};

export type Policy = {
  id: string;
  policyNumber: string;
  farmerId: string;
  farmerName: string;
  policyPlanId: string;
  planName: string;
  vendorId: string;
  startDate: string;
  endDate: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  pumpPowerHp: number;
  motorHeadMeters: number;
};

export type Payment = {
  id: string;
  paymentNumber: string;
  policyId: string;
  gateway: string;
  gatewayOrderId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  invoiceId?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  policyId: string;
  policyNumber: string;
  paymentId: string;
  invoiceDate: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  createdAt: string;
};

export type PolicyFilePurpose = 'CUSTOMER_SIGNATURE' | 'PUMP_SET_IMAGE';

export type UploadUrlResponse = {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
};

export type FileMetadata = {
  id: string;
  resourceType: 'FARMER' | 'POLICY';
  resourceId: string;
  purpose?: 'FARMER_DOCUMENT' | PolicyFilePurpose;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
};

export type ApiPage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};
