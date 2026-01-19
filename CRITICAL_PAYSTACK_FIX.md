# CRITICAL: Paystack Key Still Invalid - The Real Issue

## 🔴 The Problem

You've added the environment variable to Vercel, but it's still showing "Invalid key" because:

**Vite environment variables must be available at BUILD TIME, not just deployment time.**

When you add an environment variable to Vercel AFTER the project is already set up, you need to trigger a REBUILD, not just a redeploy.

---

## ✅ THE FIX (Do This Now)

### Step 1: Force a Clean Rebuild

Go to Vercel Dashboard and do this:

1. **Go to Settings → General**
2. Scroll down to **"Build & Development Settings"**
3. Look for **"Build Command"**
4. Click **"Override"**
5. Change from `npm run build` to `npm run build`  (just to trigger save)
6. Click **Save**

### Step 2: Manually Trigger Rebuild

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. **IMPORTANT:** Check the box **"Use existing Build Cache"** and make sure it's UNCHECKED
5. Click **"Redeploy"**

This forces Vercel to do a fresh build with the new environment variable.

---

## 🔗 Webhook URL Setup

For the webhook URL, use your Supabase Edge Function endpoint:

```
https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/paystack-webhook
```

But FIRST, you need to create this function. Here's how:

### Create Paystack Webhook Function

1. **Create the function file:**

Create: `supabase/functions/paystack-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.text()
    const event = JSON.parse(body)

    console.log('Webhook received:', event.event)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Handle successful charge
    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const amount = event.data.amount / 100 // Convert from kobo

      console.log('Payment successful:', reference)

      // Update transaction
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          paid_at: new Date().toISOString()
        })
        .eq('reference', reference)
        .select('subscription_id, user_id')
        .single()

      if (transaction) {
        console.log('Activating subscription:', transaction.subscription_id)

        // Calculate expiry date
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)

        // Activate subscription
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString()
          })
          .eq('id', transaction.subscription_id)

        // Update user
        await supabase
          .from('users')
          .update({
            subscription_tier: 'pro',
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString()
          })
          .eq('id', transaction.user_id)

        console.log('Subscription activated for user:', transaction.user_id)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
```

2. **Deploy the function:**

```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Deploy the function
supabase functions deploy paystack-webhook --no-verify-jwt

# Set the environment variables for the function
supabase secrets set SUPABASE_URL=https://kswknblwjlkgxgvypkmo.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

3. **Configure in Paystack:**

Go to: https://dashboard.paystack.com/#/settings/developer

Add webhook URL:
```
https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/paystack-webhook
```

---

## 🧪 Alternative: Test Without Webhook First

You can test payments WITHOUT the webhook by using the simpler approach:

### Option A: Test with Test Keys First

To isolate if the issue is with live keys:

1. **In Vercel, temporarily use TEST key:**
   ```
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key_from_paystack
   ```

2. **Force rebuild** (steps above)

3. **Test with test card:**
   - Card: 4084084084084081
   - CVV: 408
   - Expiry: any future date
   - PIN: 0000

If this works, the issue is specifically with your live key or Paystack live mode activation.

---

## 🔍 Double-Check Vercel Settings

Make sure the variable is set correctly:

### Verify in Vercel:

1. Go to: https://vercel.com/dashboard
2. Your project → **Settings** → **Environment Variables**
3. You should see:

```
Name                          Value                      Environments
────────────────────────────────────────────────────────────────────
VITE_PAYSTACK_PUBLIC_KEY     pk_live_b2634df9f...      ☑ Production
```

**Make sure:**
- ✅ Name is EXACTLY: `VITE_PAYSTACK_PUBLIC_KEY` (no typos)
- ✅ Value is EXACTLY: `pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96` (no extra spaces)
- ✅ "Production" is CHECKED ☑

### Take a Screenshot

Can you take a screenshot of your Environment Variables page in Vercel and share what you see? This will help me identify if there's a configuration issue.

---

## 🎯 Most Likely Issues

Based on "Invalid key" error even after adding the variable:

### Issue 1: Build Cache (Most Common)
**Solution:** Force clean rebuild (Step 1 & 2 above)

### Issue 2: Paystack Live Mode Not Activated
**Check:**
1. Go to https://dashboard.paystack.com
2. Top right corner - are you in "Live Mode" or "Test Mode"?
3. If you see a toggle, is it switched to "Live"?

**If live mode is not activated:**
- You need to complete business verification
- Submit documents to Paystack
- Wait for approval

**Temporary fix:** Use test key until live mode is activated

### Issue 3: Wrong Key Type
**Verify your key:**
```
pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
```

- ✅ Starts with `pk_live_` - Correct for live mode
- Length: 48 characters - Correct

This looks correct!

---

## 📋 Action Plan

Do these in order:

### Priority 1: Force Clean Rebuild (Do Now)
1. Vercel → Deployments
2. Latest deployment → "..." → Redeploy
3. **Uncheck "Use existing Build Cache"**
4. Click Redeploy
5. Wait 3 minutes
6. Test again

### Priority 2: Verify Paystack Account
1. Check if live mode is active
2. Check if business is verified
3. If not, use test key temporarily

### Priority 3: Browser Test
After rebuild, do this:
1. Visit https://www.lavlay.com/subscription
2. **Open incognito window** (bypasses all cache)
3. Try to subscribe
4. Check console: `console.log(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY)`

---

## 🆘 If Still Not Working

Please tell me:

1. **After forcing clean rebuild:**
   - Does it still say "Invalid key"?

2. **In browser console:**
   ```javascript
   console.log(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY)
   ```
   - What does this show? (undefined, or the key?)

3. **Paystack Dashboard:**
   - Are you in Live Mode or Test Mode?
   - Is your business verified for live transactions?

4. **Network Tab:**
   - F12 → Network tab
   - Try to subscribe
   - Find request to `api.paystack.co`
   - What's the exact response from Paystack?

---

## 💡 Quick Workaround for Now

If you need payments to work immediately while we debug:

1. **Use Test Mode:**
   - Change to test key in Vercel
   - Force rebuild
   - Users can "test" subscribe (won't charge real money)

2. **Manual Activation:**
   - When users pay, manually activate their subscription in database
   - Not ideal, but works temporarily

---

**Most important: Try the "Force Clean Rebuild" first - this fixes 90% of environment variable issues with Vite!**
