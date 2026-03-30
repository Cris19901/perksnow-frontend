import { Router } from 'express';
import { handlePaystackWebhook } from '../webhooks/paystack';
import { handleFlutterwaveWebhook } from '../webhooks/flutterwave';

const router = Router();

/** POST /webhooks/paystack */
router.post('/paystack', handlePaystackWebhook);

/** POST /webhooks/flutterwave */
router.post('/flutterwave', handleFlutterwaveWebhook);

export default router;
