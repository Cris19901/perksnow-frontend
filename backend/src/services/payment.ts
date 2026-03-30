import { PaystackService } from './paystack';
import { FlutterwaveService } from './flutterwave';
import { logger } from '../utils/logger';

export type Gateway = 'paystack' | 'flutterwave';

export class PaymentService {
  static async initializePayment(params: {
    gateway: Gateway;
    email: string;
    amount: number; // kobo
    reference: string;
    metadata?: Record<string, unknown>;
    callback_url?: string;
    customer_name?: string;
  }) {
    logger.info(`Initializing payment with ${params.gateway}: ${params.reference}`);
    if (params.gateway === 'paystack') {
      return PaystackService.initializePayment({
        email: params.email,
        amount: params.amount,
        reference: params.reference,
        metadata: params.metadata,
        callback_url: params.callback_url,
      });
    }
    // Flutterwave uses naira, not kobo
    return FlutterwaveService.initializePayment({
      tx_ref: params.reference,
      amount: params.amount / 100,
      redirect_url: params.callback_url ?? `${process.env.FRONTEND_URL}/payment/callback`,
      customer: { email: params.email, name: params.customer_name },
      meta: params.metadata,
    });
  }

  static async verifyPayment(gateway: Gateway, reference: string) {
    logger.info(`Verifying payment with ${gateway}: ${reference}`);
    if (gateway === 'paystack') return PaystackService.verifyPayment(reference);
    return FlutterwaveService.verifyPayment(reference);
  }

  static async initiateTransfer(params: {
    gateway: Gateway;
    amount: number; // kobo
    account_number: string;
    bank_code: string;
    account_name: string;
    reference: string;
    narration?: string;
    recipient_code?: string;
  }) {
    logger.info(`Initiating transfer with ${params.gateway}: ${params.reference}`);
    if (params.gateway === 'paystack') {
      let recipientCode = params.recipient_code;
      if (!recipientCode) {
        const recipient = await PaystackService.createTransferRecipient({
          type: 'nuban',
          name: params.account_name,
          account_number: params.account_number,
          bank_code: params.bank_code,
        });
        recipientCode = recipient.recipient_code;
      }
      if (!recipientCode) throw new Error('Failed to create payment recipient');
      return PaystackService.initiateTransfer({
        amount: params.amount,
        recipient: recipientCode,
        reference: params.reference,
        reason: params.narration ?? 'Withdrawal',
      });
    }
    return FlutterwaveService.initiateTransfer({
      account_bank: params.bank_code,
      account_number: params.account_number,
      amount: params.amount / 100, // naira
      narration: params.narration ?? 'Withdrawal',
      reference: params.reference,
      beneficiary_name: params.account_name,
    });
  }

  static async listBanks(gateway: Gateway = 'paystack') {
    if (gateway === 'paystack') return PaystackService.listBanks();
    return FlutterwaveService.listBanks();
  }

  static async resolveAccount(params: {
    gateway: Gateway;
    account_number: string;
    bank_code: string;
  }) {
    logger.info(`Resolving account with ${params.gateway}: ${params.account_number}`);
    if (params.gateway === 'paystack') {
      return PaystackService.resolveAccountNumber({
        account_number: params.account_number,
        bank_code: params.bank_code,
      });
    }
    return FlutterwaveService.resolveAccountNumber({
      account_number: params.account_number,
      account_bank: params.bank_code,
    });
  }

  static getPreferredGateway(): Gateway {
    return 'paystack';
  }
}
