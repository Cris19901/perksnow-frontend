# Deploy Paystack Edge Functions to Supabase

## Overview

This guide will help you deploy the Paystack payment functions to Supabase and configure everything for subscriptions to work.

---

## Step 1: Install Supabase CLI

```bash
# Install Supabase CLI globally
npm install -g supabase
```

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

---

## Step 3: Link to Your Project

```bash
# Navigate to your project folder
cd "c:\Users\FADIPE TIMOTHY\OneDrive\Documents\perknowv2-latest"

# Link to your Supabase project
supabase link --project-ref kswknblwjlkgxgvypkmo
```

When prompted, enter your database password.

---

## Step 4: Set Paystack Secret Key

**IMPORTANT:** Get your Paystack SECRET key from:
https://dashboard.paystack.com/#/settings/developer

It starts with `sk_live_...`

```bash
# Set the Paystack secret key
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
```

**Replace `sk_live_your_secret_key_here` with your actual secret key!**

---

## Step 5: Deploy the Edge Functions

```bash
# Deploy paystack-initialize function
supabase functions deploy paystack-initialize --no-verify-jwt

# Deploy paystack-webhook function
supabase functions deploy paystack-webhook --no-verify-jwt

# Deploy paystack-verify function
supabase functions deploy paystack-verify --no-verify-jwt
```

The `--no-verify-jwt` flag allows the webhook to be called by Paystack without authentication.

---

## Step 6: Configure Paystack Webhook URL

1. Go to: https://dashboard.paystack.com/#/settings/developer
2. Scroll to **Webhook URL** section
3. Set the webhook URL to:
   ```
   https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/paystack-webhook
   ```
4. Save

---

## Step 7: Verify Functions are Deployed

```bash
# List all deployed functions
supabase functions list
```

You should see:
- paystack-initialize
- paystack-webhook
- paystack-verify

---

## Step 8: Deploy Frontend Changes

```bash
# Commit and push the frontend changes
git add -A
git commit -m "Fix Paystack integration with Supabase Edge Functions"
git push origin main
```

---

## Step 9: Test the Complete Flow

1. Go to: https://www.lavlay.com/subscription
2. Click "Subscribe Now" on Pro plan
3. Should redirect to Paystack payment page
4. Complete payment
5. Should redirect back to callback page
6. Subscription should be activated

---

## Troubleshooting

### Check Function Logs

```bash
# View logs for a specific function
supabase functions logs paystack-initialize --follow
supabase functions logs paystack-webhook --follow
supabase functions logs paystack-verify --follow
```

### Common Issues

**Issue: Function not found**
- Make sure you deployed with `--no-verify-jwt`
- Check function name is correct

**Issue: Payment initialization fails**
- Check PAYSTACK_SECRET_KEY is set correctly
- View logs: `supabase functions logs paystack-initialize`

**Issue: Webhook not receiving events**
- Verify webhook URL in Paystack dashboard
- Check logs: `supabase functions logs paystack-webhook`

**Issue: Subscription not activating**
- Check webhook logs for errors
- Verify database tables exist (payment_transactions, subscriptions)

---

## Edge Function URLs

After deployment, your functions will be available at:

- **Initialize:** `https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/paystack-initialize`
- **Webhook:** `https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/paystack-webhook`
- **Verify:** `https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/paystack-verify`

---

## Quick Reference Commands

```bash
# Deploy all functions at once
supabase functions deploy paystack-initialize --no-verify-jwt && \
supabase functions deploy paystack-webhook --no-verify-jwt && \
supabase functions deploy paystack-verify --no-verify-jwt

# Set secrets
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx

# List secrets
supabase secrets list

# View logs
supabase functions logs paystack-initialize --follow

# Delete a function (if needed)
supabase functions delete paystack-initialize
```

---

## Required Database Tables

Make sure these tables exist in your Supabase database:

### payment_transactions
```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  provider VARCHAR(50) DEFAULT 'paystack',
  reference VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP,
  provider_response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### subscriptions
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  billing_cycle VARCHAR(20),
  amount DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'NGN',
  payment_provider VARCHAR(50),
  payment_reference VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending',
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### users (subscription fields)
```sql
-- Add these columns to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
```

---

## Callback URL Configuration

The callback URL for after payment is:
```
https://www.lavlay.com/subscription/callback
```

This is already configured in the SubscriptionPage.tsx code.

---

## Security Notes

1. **NEVER expose your secret key in frontend code**
2. Secret key is ONLY stored in Supabase secrets
3. Frontend only knows the function URLs, not the secrets
4. Webhook signature is verified in the function

---

## Summary

1. ✅ Created 3 Edge Functions:
   - `paystack-initialize` - Initializes payment with secret key
   - `paystack-webhook` - Receives and processes Paystack events
   - `paystack-verify` - Verifies payment status

2. ✅ Updated frontend:
   - `SubscriptionPage.tsx` - Uses Edge Function instead of direct API
   - `PaymentCallbackPage.tsx` - Uses Edge Function for verification

3. ⏳ You need to:
   - Deploy functions to Supabase
   - Set PAYSTACK_SECRET_KEY secret
   - Configure webhook URL in Paystack
   - Deploy frontend to Vercel

---

## Next Steps

After completing this guide:

1. Test with a real payment
2. Check Supabase logs for any errors
3. Verify subscription is activated in database
4. Check user's subscription status on profile

**Your subscriptions will work securely after completing these steps!**
