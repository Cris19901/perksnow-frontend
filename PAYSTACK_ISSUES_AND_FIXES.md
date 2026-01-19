# Paystack Payment Issues - Complete Fix Guide

## 🔴 Issues Found

### Issue 1: Missing Public Key (IMMEDIATE FIX NEEDED)
**Location:** [SubscriptionPage.tsx:145](src/components/pages/SubscriptionPage.tsx#L145)

**Code:**
```typescript
'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_PUBLIC_KEY}`
```

**Problem:** `VITE_PAYSTACK_PUBLIC_KEY` is not set in Vercel production environment

**Impact:** Users get "invalid key" error when trying to subscribe

**Fix:** Add environment variable to Vercel (see Quick Fix below)

---

### Issue 2: SECRET Key in Frontend Code (SECURITY VULNERABILITY)
**Location:** [PaymentCallbackPage.tsx:92](src/components/pages/PaymentCallbackPage.tsx#L92)

**Code:**
```typescript
'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`
```

**Problem:** Secret key should NEVER be in frontend code - it's a security risk!

**Impact:**
- Currently this verification fails (key not set)
- If you add it, anyone can see your secret key and misuse it
- Could lead to unauthorized transactions

**Fix:** Remove this code and use webhook or backend verification instead (see Security Fix below)

---

## ✅ IMMEDIATE FIX (5 minutes)

This will fix the "invalid key" error so users can subscribe:

### Step 1: Add Public Key to Vercel

1. Go to: https://vercel.com/dashboard
2. Click your **LavLay** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   ```
   Key:   VITE_PAYSTACK_PUBLIC_KEY
   Value: pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
   ```
6. Check: **Production** environment
7. Click **Save**

### Step 2: Redeploy

**Option A:** Push a commit
```bash
git commit --allow-empty -m "Fix Paystack production config"
git push origin main
```

**Option B:** Manual redeploy in Vercel Dashboard
- Deployments → Latest → "..." → Redeploy

### Step 3: Test

After 3 minutes:
1. Visit: https://www.lavlay.com/subscription
2. Click "Subscribe Now"
3. Should redirect to Paystack payment page ✅

---

## 🔐 SECURITY FIX (Required for payment verification)

The payment callback currently tries to use a secret key in the frontend. This is insecure and won't work.

### Why This is a Problem

**Current Flow (INSECURE):**
```
User pays → Paystack redirects → Frontend tries to verify with SECRET key → ❌ Exposed
```

**Correct Flow (SECURE):**
```
User pays → Paystack sends webhook to backend → Backend verifies → Updates database → ✅ Secure
```

### Option 1: Use Paystack Webhook (Recommended)

Paystack webhooks are already configured in your code, but you need to set up the webhook URL:

1. **Go to Paystack Dashboard:**
   - https://dashboard.paystack.com
   - Settings → API Keys & Webhooks
   - Webhook URL section

2. **Add Webhook URL:**
   ```
   https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/paystack-webhook
   ```
   (Replace with your actual Supabase edge function URL)

3. **Create Supabase Edge Function:**

```typescript
// supabase/functions/paystack-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!

serve(async (req) => {
  // Verify webhook signature
  const signature = req.headers.get('x-paystack-signature')
  const body = await req.text()

  // Verify the signature matches
  const crypto = await import('https://deno.land/std@0.168.0/crypto/mod.ts')
  const hash = await crypto.crypto.subtle.digest(
    'SHA-512',
    new TextEncoder().encode(PAYSTACK_SECRET_KEY + body)
  )
  const expectedSignature = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body)

  // Handle successful payment
  if (event.event === 'charge.success') {
    const reference = event.data.reference

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Update payment transaction
    await supabase
      .from('payment_transactions')
      .update({ status: 'success', paid_at: new Date().toISOString() })
      .eq('reference', reference)

    // Get subscription and activate
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('subscription_id, user_id')
      .eq('reference', reference)
      .single()

    if (transaction) {
      // Activate subscription
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month from now

      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', transaction.subscription_id)

      // Update user subscription tier
      await supabase
        .from('users')
        .update({
          subscription_tier: 'pro',
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString()
        })
        .eq('id', transaction.user_id)
    }
  }

  return new Response('Webhook received', { status: 200 })
})
```

4. **Deploy the function:**
```bash
supabase functions deploy paystack-webhook --no-verify-jwt
```

5. **Add secret to Supabase:**
```bash
supabase secrets set PAYSTACK_SECRET_KEY=your_secret_key_here
```

### Option 2: Remove SECRET Key Verification (Quick Fix)

Remove the problematic code from PaymentCallbackPage.tsx:

**Remove lines 87-106:**
```typescript
// Try verifying with Paystack directly
const verifyResponse = await fetch(
  `https://api.paystack.co/transaction/verify/${paymentReference}`,
  {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
    },
  }
);
// ... rest of verification code ...
```

**Replace with:**
```typescript
// Payment is pending - webhook will process it
setStatus('success');
setMessage('Payment is being processed. Your subscription will be activated shortly.');
```

This makes the callback page rely entirely on the webhook for verification.

---

## 📋 Complete Fix Checklist

### Immediate (Now):
- [ ] Add `VITE_PAYSTACK_PUBLIC_KEY` to Vercel production
- [ ] Redeploy application
- [ ] Test subscription flow works

### Security Fix (This Week):
- [ ] Set up Paystack webhook endpoint (Supabase Edge Function)
- [ ] Configure webhook URL in Paystack Dashboard
- [ ] Remove SECRET key verification from frontend
- [ ] Test webhook receives events
- [ ] Test subscription activation works

### Optional (Best Practices):
- [ ] Use test keys in development
- [ ] Set up staging environment
- [ ] Add error logging/monitoring
- [ ] Add admin panel to view payment status

---

## 🧪 Testing Guide

### Test Subscription Flow

**With Test Keys (Development):**
1. Use test card: 4084084084084081
2. Use any future expiry date
3. Use any CVV (e.g., 408)
4. Transaction will succeed without charging real money

**With Live Keys (Production):**
1. Use real card
2. Real money will be charged
3. Test with small amount first

### Verify Webhook Works

1. Make a test payment
2. Check Supabase logs:
   ```bash
   supabase functions logs paystack-webhook
   ```
3. Check database:
   ```sql
   SELECT * FROM payment_transactions
   WHERE reference = 'YOUR_REFERENCE'
   ORDER BY created_at DESC;

   SELECT * FROM subscriptions
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC;
   ```

---

## 📊 Current vs Fixed Architecture

### Current (Has Issues):
```
User clicks Subscribe
  ↓
Frontend calls Paystack API (with PUBLIC key) ✅ Works locally
  ↓
Paystack redirects to callback page
  ↓
Frontend tries to verify with SECRET key ❌ SECURITY ISSUE
  ↓
Subscription may not activate properly
```

### After Fix:
```
User clicks Subscribe
  ↓
Frontend calls Paystack API (with PUBLIC key) ✅
  ↓
Paystack redirects to callback page
  ↓
Paystack sends webhook to backend ✅
  ↓
Backend verifies and activates subscription ✅
  ↓
Frontend shows success message ✅
```

---

## 🔑 Environment Variables Summary

### Frontend (Vercel):
```
# REQUIRED - Add this now
VITE_PAYSTACK_PUBLIC_KEY=pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96

# DO NOT ADD - Never expose secret key
# VITE_PAYSTACK_SECRET_KEY=sk_live_... ❌ NEVER DO THIS
```

### Backend (Supabase Edge Function):
```
# Add via: supabase secrets set PAYSTACK_SECRET_KEY=...
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📞 Support

### If subscription still doesn't work after fixes:

1. **Check Vercel Deployment Logs:**
   - Vercel Dashboard → Deployments → Latest → Logs
   - Look for environment variable errors

2. **Check Browser Console:**
   - F12 → Console tab
   - Look for Paystack errors

3. **Check Paystack Dashboard:**
   - https://dashboard.paystack.com
   - Transactions → View recent transactions
   - Check if payment reached Paystack

4. **Check Database:**
   ```sql
   -- Check if transaction was created
   SELECT * FROM payment_transactions
   ORDER BY created_at DESC LIMIT 10;

   -- Check subscription status
   SELECT * FROM subscriptions
   ORDER BY created_at DESC LIMIT 10;
   ```

---

## 🎯 Priority Summary

### Priority 1: FIX NOW (5 min)
✅ Add `VITE_PAYSTACK_PUBLIC_KEY` to Vercel
- Users can subscribe
- Payments will initialize

### Priority 2: SECURITY FIX (This week)
⚠️ Set up webhook or remove SECRET key code
- Payments will verify securely
- Subscriptions will activate properly

### Priority 3: BEST PRACTICES (Optional)
💡 Use test keys in dev, set up staging
- Catch issues before production
- Safe testing environment

---

## 📝 Quick Commands

```bash
# Redeploy to production
git commit --allow-empty -m "Add Paystack config"
git push origin main

# Check if env var is set (after deployment)
# Open browser console on www.lavlay.com
console.log(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ? 'Set' : 'Not set')

# Check Supabase function logs
supabase functions logs paystack-webhook --follow
```

---

**Status:** Ready to fix!

**Estimated Time:**
- Immediate fix: 5 minutes
- Security fix: 30-60 minutes (if setting up webhook)

---

**Related Files:**
- Quick fix guide: [QUICK_FIX_PAYSTACK.md](QUICK_FIX_PAYSTACK.md)
- Full guide: [FIX_PAYSTACK_PRODUCTION_ERROR.md](FIX_PAYSTACK_PRODUCTION_ERROR.md)
- Production deployment: [PRODUCTION_UPDATE_GUIDE.md](PRODUCTION_UPDATE_GUIDE.md)
