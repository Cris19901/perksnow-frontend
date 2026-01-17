# LavLay Subscription System - Complete Implementation Guide

## Overview

This system allows users to subscribe to a Pro plan to unlock withdrawal features, using Paystack, Flutterwave, or OPay.

---

## Architecture Decision

**Use: Supabase + Railway**

- **Supabase**: Database, auth, email scheduling
- **Railway**: Payment webhooks (Paystack/Flutterwave/OPay)

**Why both:**
- Payment webhooks need reliable, always-on server
- Railway provides stable endpoint for payment providers
- Supabase handles everything else efficiently

---

## Phase 1: Database Schema (Supabase)

### Step 1: Create Subscription Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add subscription fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'free', 'pro'
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits) VALUES
('free', 'Free', 'Basic access to LavLay', 0, 0,
  '{"can_post": true, "can_comment": true, "can_like": true, "can_follow": true}',
  '{"max_posts_per_day": 10, "max_reels_per_day": 3, "can_withdraw": false}'
),
('pro', 'Pro', 'Full access with withdrawals', 2000, 20000,
  '{"can_post": true, "can_comment": true, "can_like": true, "can_follow": true, "can_withdraw": true, "priority_support": true, "verified_badge": true}',
  '{"max_posts_per_day": 100, "max_reels_per_day": 50, "can_withdraw": true, "min_withdrawal": 5000}'
);

-- Create subscriptions table (transaction history)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired, failed
  billing_cycle TEXT NOT NULL, -- 'monthly', 'yearly'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',

  -- Payment details
  payment_provider TEXT, -- 'paystack', 'flutterwave', 'opay'
  payment_reference TEXT UNIQUE,
  payment_status TEXT, -- 'pending', 'success', 'failed'

  -- Dates
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_payment_reference ON subscriptions(payment_reference);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),

  provider TEXT NOT NULL, -- 'paystack', 'flutterwave', 'opay'
  reference TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL, -- 'pending', 'success', 'failed'

  -- Provider response
  provider_response JSONB,

  -- Webhook data
  webhook_received_at TIMESTAMP,
  webhook_data JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
```

---

### Step 2: Create Helper Functions

```sql
-- Function: Check if user can withdraw
CREATE OR REPLACE FUNCTION can_user_withdraw(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_withdraw BOOLEAN;
BEGIN
  SELECT
    subscription_tier = 'pro'
    AND subscription_status = 'active'
    AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
  INTO v_can_withdraw
  FROM users
  WHERE id = p_user_id;

  RETURN COALESCE(v_can_withdraw, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get subscription plan limits
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_limits JSONB;
BEGIN
  SELECT sp.limits
  INTO v_limits
  FROM users u
  JOIN subscription_plans sp ON sp.name = u.subscription_tier
  WHERE u.id = p_user_id;

  RETURN COALESCE(v_limits, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Activate subscription
CREATE OR REPLACE FUNCTION activate_subscription(
  p_subscription_id UUID,
  p_payment_reference TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_plan_name TEXT;
  v_billing_cycle TEXT;
  v_expires_at TIMESTAMP;
BEGIN
  -- Get subscription details
  SELECT user_id, plan_name, billing_cycle
  INTO v_user_id, v_plan_name, v_billing_cycle
  FROM subscriptions
  WHERE id = p_subscription_id;

  -- Calculate expiry date
  IF v_billing_cycle = 'monthly' THEN
    v_expires_at := NOW() + INTERVAL '1 month';
  ELSIF v_billing_cycle = 'yearly' THEN
    v_expires_at := NOW() + INTERVAL '1 year';
  END IF;

  -- Update subscription
  UPDATE subscriptions
  SET
    status = 'active',
    payment_status = 'success',
    started_at = NOW(),
    expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  -- Update user
  UPDATE users
  SET
    subscription_tier = v_plan_name,
    subscription_status = 'active',
    subscription_started_at = NOW(),
    subscription_expires_at = v_expires_at
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Step 3: RLS Policies

```sql
-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Subscription plans: Public read
CREATE POLICY "Anyone can view active plans"
ON subscription_plans FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Subscriptions: Users can view their own
CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Subscriptions: Service role can manage
CREATE POLICY "Service role can manage subscriptions"
ON subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Payment transactions: Users can view their own
CREATE POLICY "Users can view own transactions"
ON payment_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Payment transactions: Service role can manage
CREATE POLICY "Service role can manage transactions"
ON payment_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## Phase 2: Railway Backend (Payment Webhooks)

### Step 1: Update Backend Environment Variables

Add to `backend/.env`:
```env
# Payment Providers
PAYSTACK_SECRET_KEY=sk_live_your_key_here
PAYSTACK_PUBLIC_KEY=pk_live_your_key_here

FLUTTERWAVE_SECRET_KEY=FLWSECK-your_key_here
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-your_key_here

OPAY_MERCHANT_ID=your_merchant_id
OPAY_PUBLIC_KEY=your_public_key
OPAY_PRIVATE_KEY=your_private_key

# Frontend URL (for redirects)
FRONTEND_URL=https://lavlay.com
```

### Step 2: Deploy to Railway

```bash
cd backend

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link project or create new
railway link

# Add environment variables
railway variables set PAYSTACK_SECRET_KEY=sk_live_xxx
railway variables set FLUTTERWAVE_SECRET_KEY=FLWSECK_xxx
railway variables set OPAY_MERCHANT_ID=xxx

# Deploy
railway up
```

---

## Phase 3: Payment Integration

### Frontend: Initialize Payment

```typescript
// src/lib/payments.ts
import { supabase } from './supabase';

export async function initializeSubscription(
  planId: string,
  billingCycle: 'monthly' | 'yearly',
  provider: 'paystack' | 'flutterwave' | 'opay'
) {
  // 1. Create subscription record
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      plan_id: planId,
      billing_cycle: billingCycle,
      status: 'pending',
      payment_provider: provider
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Call backend to initialize payment
  const response = await fetch(`${BACKEND_URL}/api/payments/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription_id: subscription.id,
      provider
    })
  });

  const { payment_url } = await response.json();

  // 3. Redirect to payment page
  window.location.href = payment_url;
}
```

### Backend: Webhook Handlers

Already exists in your `backend/src/api/webhooks.ts`!

Just need to update with subscription logic:

```typescript
// Paystack webhook
app.post('/api/webhooks/paystack', async (req, res) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const { reference, status } = req.body.data;

  if (status === 'success') {
    // Activate subscription
    await supabase.rpc('activate_subscription', {
      p_payment_reference: reference
    });
  }

  res.status(200).send('OK');
});
```

---

## Phase 4: 7-Day Onboarding Emails

### Step 1: Enable pg_cron

```sql
-- Enable pg_cron extension (Supabase dashboard → Database → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create onboarding tracking table
CREATE TABLE IF NOT EXISTS onboarding_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  email_type TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  email_provider TEXT DEFAULT 'elastic',
  email_id TEXT,
  status TEXT DEFAULT 'sent', -- sent, failed, bounced

  UNIQUE(user_id, day_number)
);

CREATE INDEX idx_onboarding_user_id ON onboarding_emails(user_id);
```

### Step 2: Create Email Sending Function

```sql
CREATE OR REPLACE FUNCTION send_onboarding_email(
  p_user_id UUID,
  p_day_number INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_already_sent BOOLEAN;
BEGIN
  -- Check if already sent
  SELECT EXISTS(
    SELECT 1 FROM onboarding_emails
    WHERE user_id = p_user_id AND day_number = p_day_number
  ) INTO v_already_sent;

  IF v_already_sent THEN
    RETURN FALSE;
  END IF;

  -- Get user details
  SELECT email, full_name
  INTO v_user_email, v_user_name
  FROM users
  WHERE id = p_user_id;

  -- Call Edge Function to send email
  PERFORM net.http_post(
    url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email-multi',
    headers := '{"Content-Type": "application/json"}'::JSONB,
    body := jsonb_build_object(
      'to', v_user_email,
      'subject', 'Day ' || p_day_number || ': LavLay Tips',
      'template', 'onboarding_day_' || p_day_number,
      'data', jsonb_build_object('name', v_user_name, 'day', p_day_number)
    )
  );

  -- Record email sent
  INSERT INTO onboarding_emails (user_id, day_number, email_type)
  VALUES (p_user_id, p_day_number, 'onboarding');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Schedule Daily Job

```sql
-- Schedule to run every day at 9 AM
SELECT cron.schedule(
  'send-daily-onboarding-emails',
  '0 9 * * *',
  $$
  -- Day 1: Users who signed up yesterday
  SELECT send_onboarding_email(id, 1)
  FROM users
  WHERE created_at::DATE = CURRENT_DATE - INTERVAL '1 day';

  -- Day 2-7: Check each day
  SELECT send_onboarding_email(id, day_num)
  FROM users u
  CROSS JOIN generate_series(2, 7) AS day_num
  WHERE u.created_at::DATE = CURRENT_DATE - (day_num || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM onboarding_emails oe
      WHERE oe.user_id = u.id AND oe.day_number = day_num
    );
  $$
);
```

---

## Summary: What Goes Where

### Supabase Handles:
- ✅ Database (subscriptions, plans, transactions)
- ✅ RLS policies (security)
- ✅ Helper functions (can_withdraw, activate_subscription)
- ✅ pg_cron (email scheduling)
- ✅ Edge Functions (email sending)
- ✅ Welcome bonus (existing triggers)

### Railway Handles:
- ✅ Payment webhooks (Paystack, Flutterwave, OPay)
- ✅ Payment initialization
- ✅ Webhook signature verification
- ✅ Subscription activation callbacks

---

## Costs

### Development/Testing:
```
Railway: $5/month (Starter)
Elastic Email: $5 (one-time, lasts years)
Supabase: Free tier
────────────────────────
TOTAL: ~$10 to start
```

### Production (100 subscribers):
```
Railway: $5-10/month
Elastic Email: $0.27/month
Supabase: $0-25/month (depends on usage)
Payment processing: 1.5% + ₦100 per transaction
────────────────────────
TOTAL: ~$5-35/month + transaction fees
```

---

## Next Steps

1. Run database migrations (Phase 1)
2. Deploy Railway backend (Phase 2)
3. Test payment flow
4. Set up onboarding emails (Phase 4)
5. Launch!

**Ready to start implementing?** 🚀
