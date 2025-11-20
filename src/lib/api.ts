import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API client for backend endpoints
 * This handles all requests to the Express backend
 */

// Helper to get auth token from Supabase
const getAuthToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
};

// Helper for API requests
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: response.statusText,
    }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
};

// ============================================================================
// MEMBERSHIP API
// ============================================================================

export interface MembershipTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getMembershipTiers = async (): Promise<{
  success: boolean;
  tiers: MembershipTier[];
}> => {
  return apiRequest('/api/memberships/tiers');
};

export const subscribeToPlan = async (tierId: string, period: 'monthly' | 'yearly') => {
  return apiRequest('/api/memberships/subscribe', {
    method: 'POST',
    body: JSON.stringify({ tierId, period }),
  });
};

export const getUserMembership = async () => {
  return apiRequest('/api/memberships/user');
};

export const cancelMembership = async () => {
  return apiRequest('/api/memberships/cancel', {
    method: 'POST',
  });
};

// ============================================================================
// POINTS API
// ============================================================================

export interface PointsReward {
  id: string;
  activity: string;
  points: number;
  description: string;
  max_per_day: number | null;
  is_active: boolean;
}

export const getPointsRewards = async (): Promise<{
  success: boolean;
  rewards: PointsReward[];
}> => {
  return apiRequest('/api/points/rewards');
};

export const getUserPoints = async () => {
  return apiRequest('/api/points/user');
};

export const redeemPoints = async (points: number) => {
  return apiRequest('/api/points/redeem', {
    method: 'POST',
    body: JSON.stringify({ points }),
  });
};

// ============================================================================
// EARNINGS API
// ============================================================================

export const getEarningsAnalytics = async () => {
  return apiRequest('/api/earnings/analytics');
};

export const getTotalEarnings = async () => {
  return apiRequest('/api/earnings/total');
};

export const getEarningsBreakdown = async () => {
  return apiRequest('/api/earnings/breakdown');
};

export const getEarningsHistory = async (params?: {
  limit?: number;
  offset?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const query = new URLSearchParams(params as any).toString();
  return apiRequest(`/api/earnings/history?${query}`);
};

export const getWalletBalance = async () => {
  return apiRequest('/api/earnings/wallet');
};

// ============================================================================
// PAYMENTS API
// ============================================================================

export const initializePayment = async (data: {
  amount: number;
  type: 'product' | 'membership';
  reference_id: string;
  provider: 'paystack' | 'flutterwave';
}) => {
  return apiRequest('/api/payments/initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const verifyPayment = async (reference: string) => {
  return apiRequest(`/api/payments/verify/${reference}`);
};

export const getPaymentHistory = async () => {
  return apiRequest('/api/payments/history');
};

// ============================================================================
// WITHDRAWALS API
// ============================================================================

export const requestWithdrawal = async (data: {
  amount: number;
  bank_account_id: string;
}) => {
  return apiRequest('/api/withdrawals/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getWithdrawals = async () => {
  return apiRequest('/api/withdrawals/history');
};

export const getBankAccounts = async () => {
  return apiRequest('/api/withdrawals/bank-accounts');
};

export const addBankAccount = async (data: {
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
}) => {
  return apiRequest('/api/withdrawals/bank-accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ============================================================================
// UPLOAD API
// ============================================================================

export const uploadFile = async (file: File) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/uploads`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: response.statusText,
    }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};

export default {
  // Memberships
  getMembershipTiers,
  subscribeToPlan,
  getUserMembership,
  cancelMembership,

  // Points
  getPointsRewards,
  getUserPoints,
  redeemPoints,

  // Earnings
  getEarningsAnalytics,
  getTotalEarnings,
  getEarningsBreakdown,
  getEarningsHistory,
  getWalletBalance,

  // Payments
  initializePayment,
  verifyPayment,
  getPaymentHistory,

  // Withdrawals
  requestWithdrawal,
  getWithdrawals,
  getBankAccounts,
  addBankAccount,

  // Uploads
  uploadFile,
};
