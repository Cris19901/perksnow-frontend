import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

let _api: ReturnType<typeof axios.create> | null = null;
function api() {
  if (!_api) {
    _api = axios.create({
      baseURL: 'https://api.flutterwave.com/v3',
      headers: {
        Authorization: `Bearer ${config.flutterwave.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });
  }
  return _api;
}

export class FlutterwaveService {
  static async initializePayment(params: {
    tx_ref: string;
    amount: number;
    redirect_url: string;
    customer: { email: string; name?: string };
    customizations?: { title: string; description: string };
    meta?: Record<string, unknown>;
  }) {
    try {
      const response = await api().post('/payments', {
        tx_ref: params.tx_ref,
        amount: params.amount,
        currency: 'NGN',
        redirect_url: params.redirect_url,
        customer: params.customer,
        customizations: params.customizations ?? {
          title: 'LavLay',
          description: 'Payment for LavLay services',
        },
        meta: params.meta,
      });
      logger.info(`Flutterwave payment initialized: ${params.tx_ref}`);
      return {
        success: true as const,
        payment_link: response.data.data.link as string,
        tx_ref: params.tx_ref,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Flutterwave initialization error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to initialize payment');
    }
  }

  static async verifyPayment(tx_ref: string) {
    try {
      const response = await api().get(
        `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`
      );
      logger.info(`Flutterwave payment verified: ${tx_ref} - ${response.data.data.status}`);
      return response.data as { status: string; data: Record<string, unknown> };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Flutterwave verification error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to verify payment');
    }
  }

  static async initiateTransfer(params: {
    account_bank: string;
    account_number: string;
    amount: number;
    narration: string;
    reference: string;
    beneficiary_name: string;
  }) {
    try {
      const response = await api().post('/transfers', {
        account_bank: params.account_bank,
        account_number: params.account_number,
        amount: params.amount,
        narration: params.narration,
        currency: 'NGN',
        reference: params.reference,
        callback_url: `${process.env.BACKEND_URL}/webhooks/flutterwave`,
        debit_currency: 'NGN',
        beneficiary_name: params.beneficiary_name,
      });
      logger.info(`Flutterwave transfer initiated: ${params.reference}`);
      return {
        success: true as const,
        transfer_id: response.data.data.id as number,
        status: response.data.data.status as string,
        reference: response.data.data.reference as string,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Flutterwave transfer error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to initiate transfer');
    }
  }

  static async listBanks() {
    try {
      const response = await api().get('/banks/NG');
      return {
        success: true as const,
        banks: response.data.data as Array<{ name: string; code: string }>,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Flutterwave list banks error:', err.response?.data ?? err.message);
      throw new Error('Failed to fetch bank list');
    }
  }

  static async resolveAccountNumber(params: {
    account_number: string;
    account_bank: string;
  }) {
    try {
      const response = await api().post('/accounts/resolve', {
        account_number: params.account_number,
        account_bank: params.account_bank,
      });
      logger.info(`Flutterwave account resolved: ${params.account_number}`);
      return {
        success: true as const,
        account_name: response.data.data.account_name as string,
        account_number: response.data.data.account_number as string,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('Flutterwave resolve account error:', err.response?.data ?? err.message);
      throw new Error(err.response?.data?.message ?? 'Failed to resolve account');
    }
  }
}
