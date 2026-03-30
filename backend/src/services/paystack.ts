import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

// Lazy-initialised so the key is read after dotenv.config() runs
let _api: ReturnType<typeof axios.create> | null = null;
function api() {
  if (!_api) {
    _api = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${config.paystack.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });
  }
  return _api;
}

export class PaystackService {
  static async initializePayment(params: {
    email: string;
    amount: number;
    reference: string;
    metadata?: Record<string, unknown>;
    callback_url?: string;
  }) {
    try {
      const response = await api().post('/transaction/initialize', {
        email: params.email,
        amount: params.amount,
        reference: params.reference,
        metadata: params.metadata,
        callback_url: params.callback_url,
      });
      logger.info(`Paystack payment initialized: ${params.reference}`);
      return {
        success: true as const,
        authorization_url: response.data.data.authorization_url as string,
        access_code: response.data.data.access_code as string,
        reference: response.data.data.reference as string,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Paystack initialization error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to initialize payment');
    }
  }

  static async verifyPayment(reference: string) {
    try {
      const response = await api().get(`/transaction/verify/${encodeURIComponent(reference)}`);
      logger.info(`Paystack payment verified: ${reference} - ${response.data.data.status}`);
      return response.data as { status: boolean; data: Record<string, unknown> };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Paystack verification error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to verify payment');
    }
  }

  static async createTransferRecipient(params: {
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }) {
    try {
      const response = await api().post('/transferrecipient', {
        type: params.type,
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency ?? 'NGN',
      });
      logger.info(`Transfer recipient created: ${params.account_number}`);
      return {
        success: true as const,
        recipient_code: response.data.data.recipient_code as string,
        details: response.data.data as Record<string, unknown>,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Paystack create recipient error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to create transfer recipient');
    }
  }

  static async initiateTransfer(params: {
    amount: number;
    recipient: string;
    reference: string;
    reason?: string;
  }) {
    try {
      const response = await api().post('/transfer', {
        source: 'balance',
        amount: params.amount,
        recipient: params.recipient,
        reason: params.reason ?? 'Withdrawal',
        reference: params.reference,
      });
      logger.info(`Transfer initiated: ${params.reference}`);
      return {
        success: true as const,
        transfer_code: response.data.data.transfer_code as string,
        status: response.data.data.status as string,
        reference: response.data.data.reference as string,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Paystack transfer error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to initiate transfer');
    }
  }

  static async listBanks() {
    try {
      const response = await api().get('/bank?currency=NGN');
      return {
        success: true as const,
        banks: response.data.data as Array<{ name: string; code: string; slug: string }>,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Paystack list banks error:', err.response?.data ?? err.message);
      throw new Error('Failed to fetch bank list');
    }
  }

  static async resolveAccountNumber(params: {
    account_number: string;
    bank_code: string;
  }) {
    try {
      const response = await api().get(
        `/bank/resolve?account_number=${encodeURIComponent(params.account_number)}&bank_code=${encodeURIComponent(params.bank_code)}`
      );
      logger.info(`Account resolved: ${params.account_number}`);
      return {
        success: true as const,
        account_name: response.data.data.account_name as string,
        account_number: response.data.data.account_number as string,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Paystack resolve account error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to resolve account');
    }
  }
}
