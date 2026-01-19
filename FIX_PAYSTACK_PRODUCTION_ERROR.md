# Fix: Paystack "Invalid Key" Error on Production

## 🔴 Problem

You're getting an "invalid key" error when trying to make subscription payments on your production site (www.lavlay.com).

**Root Cause:** The `VITE_PAYSTACK_PUBLIC_KEY` environment variable is **not set in your Vercel production environment**.

---

## ✅ Solution: Add Environment Variable to Vercel

### Step 1: Get Your Paystack Key

From your `.env.local` file, you have:
```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
```

⚠️ **Security Note:** This is your **LIVE** key! Make sure to:
- Never commit this to git
- Only use it in production
- Consider using test key (`pk_test_...`) for development/staging

---

### Step 2: Add to Vercel Production Environment

#### Option 1: Via Vercel Dashboard (Recommended - 2 minutes)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Find your LavLay project

2. **Navigate to Settings:**
   - Click on your project
   - Click "Settings" in the top menu
   - Click "Environment Variables" in the left sidebar

3. **Add the Variable:**
   - Click "Add New" button
   - Fill in:
     ```
     Key:   VITE_PAYSTACK_PUBLIC_KEY
     Value: pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
     ```
   - Select environment: **Production** (check the box)
   - Click "Save"

4. **Redeploy:**
   - Go back to "Deployments" tab
   - Click "..." on the latest deployment
   - Click "Redeploy"
   - OR simply push a new commit to trigger deployment

#### Option 2: Via Vercel CLI (Advanced - 1 minute)

```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Login
vercel login

# Add environment variable
vercel env add VITE_PAYSTACK_PUBLIC_KEY production
# When prompted, paste: pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96

# Redeploy
vercel --prod
```

---

### Step 3: Trigger Redeployment

After adding the environment variable, you need to redeploy:

**Method 1: Push a commit**
```bash
# Make a small change (like adding a comment)
git commit --allow-empty -m "Trigger redeploy for Paystack key"
git push origin main
```

**Method 2: Redeploy from Vercel Dashboard**
1. Go to Deployments
2. Click "..." on latest deployment
3. Click "Redeploy"

---

### Step 4: Verify the Fix

**After redeployment completes (2-3 minutes):**

1. Visit: https://www.lavlay.com/subscription
2. Click "Subscribe Now" on a Pro plan
3. You should now see the Paystack payment page (no "invalid key" error)

---

## 🧪 Testing Checklist

After fixing:

- [ ] Visit www.lavlay.com/subscription
- [ ] Click "Subscribe Now" on Pro plan
- [ ] Should redirect to Paystack payment page
- [ ] Should see correct plan details
- [ ] Should be able to enter payment details
- [ ] (Optional) Complete a test payment

---

## 🔐 Security Best Practices

### Environment Variables Setup

You should have **different keys** for different environments:

**Development (`.env.local`):**
```
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key_here
```

**Production (Vercel):**
```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
```

### How to Get Test Keys

1. Go to Paystack Dashboard: https://dashboard.paystack.com
2. Click "Settings" → "API Keys & Webhooks"
3. You'll see:
   - **Test Public Key** (`pk_test_...`) - Use for development
   - **Live Public Key** (`pk_live_...`) - Use for production

### Update Your `.env.local` for Development

```bash
# Use TEST key locally
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key_here
```

This way, you can test payments locally without charging real money!

---

## 📋 All Required Environment Variables

Here's what should be in **Vercel Production Environment:**

```
VITE_SUPABASE_URL=https://kswknblwjlkgxgvypkmo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_PAYSTACK_PUBLIC_KEY=pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
VITE_R2_PUBLIC_URL=https://pub-1d0841e73f5440d5b451286753184fb0.r2.dev
VITE_R2_ACCOUNT_ID=7fc60b39d74e624471954b8c1b1ea3cd
VITE_R2_BUCKET_NAME=perksnow-media-dev
```

⚠️ **Note:** Don't add `VITE_R2_SECRET_ACCESS_KEY` or `VITE_R2_ACCESS_KEY_ID` to Vercel - these should only be used in backend/server environments, not exposed to frontend.

---

## 🐛 Troubleshooting

### Issue: Still getting "invalid key" after adding variable

**Solution 1: Clear browser cache**
```
Ctrl + Shift + R (hard refresh)
Or open in incognito mode
```

**Solution 2: Check Vercel deployment logs**
1. Vercel Dashboard → Deployments
2. Click on latest deployment
3. Check "Build Logs" for errors
4. Check "Runtime Logs" for errors

**Solution 3: Verify variable is set**
```bash
# In Vercel dashboard
# Settings → Environment Variables
# You should see: VITE_PAYSTACK_PUBLIC_KEY [Production]
```

### Issue: Wrong key format

Your Paystack public key should start with:
- `pk_test_...` (for test mode)
- `pk_live_...` (for live mode)

If it doesn't, get the correct key from Paystack Dashboard.

### Issue: Payment fails after Paystack page loads

This is a different issue (not invalid key). Check:
- Paystack account is activated
- Payment methods are enabled
- Webhook is configured (if needed)

---

## 🎯 Quick Fix Summary

1. ✅ Go to Vercel Dashboard
2. ✅ Settings → Environment Variables
3. ✅ Add: `VITE_PAYSTACK_PUBLIC_KEY` = `pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96`
4. ✅ Select: Production
5. ✅ Save
6. ✅ Redeploy (push commit or manual redeploy)
7. ✅ Wait 2-3 minutes
8. ✅ Test on www.lavlay.com/subscription

---

## 📸 Visual Guide

### Where to Add Environment Variable:

```
Vercel Dashboard
  └── Your Project (LavLay)
      └── Settings (top menu)
          └── Environment Variables (left sidebar)
              └── Add New
                  ├── Key: VITE_PAYSTACK_PUBLIC_KEY
                  ├── Value: pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
                  ├── Environment: ☑ Production
                  └── [Save]
```

### What You'll See After Adding:

```
Environment Variables

Name                          Value                 Environments
───────────────────────────────────────────────────────────────
VITE_SUPABASE_URL            https://kswknb...     Production
VITE_SUPABASE_ANON_KEY       eyJhbGciOiJ...       Production
VITE_PAYSTACK_PUBLIC_KEY     pk_live_b2634...     Production ← NEW!
```

---

## 🔄 After Fixing

Once the environment variable is added and deployed:

1. ✅ Subscription payments will work
2. ✅ No more "invalid key" errors
3. ✅ Users can subscribe to Pro plan
4. ✅ Paystack payment page loads correctly

---

## 📝 Prevention for Future

**Always remember:**
1. Local development uses `.env.local`
2. Production uses Vercel Environment Variables
3. Different keys for different environments
4. Never commit API keys to git

**When adding new features that use API keys:**
1. Add to `.env.local` for local testing
2. Add to Vercel Environment Variables for production
3. Document in this file or README

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Env Vars Docs:** https://vercel.com/docs/projects/environment-variables
- **Paystack Dashboard:** https://dashboard.paystack.com
- **Paystack API Keys:** https://dashboard.paystack.com/#/settings/developer

---

## ✅ Completion Checklist

Once you've completed the fix:

- [ ] Environment variable added to Vercel
- [ ] Redeployment triggered
- [ ] Deployment completed successfully
- [ ] Tested on www.lavlay.com/subscription
- [ ] Payment page loads without errors
- [ ] Test payment works (optional)

---

**Status:** Ready to fix! Follow Step 1-4 above to resolve the issue.

**Estimated Time:** 5 minutes total (2 min to add variable + 3 min for deployment)

---

## 💡 Pro Tip

Set up a **staging environment** to catch these issues before production:

1. Create staging branch in git
2. Connect to Vercel as separate project
3. Use test Paystack keys in staging
4. Test all features in staging first
5. Deploy to production only after staging tests pass

This would have caught the missing environment variable before it reached production!

---

**Need help? Check the error in browser console (F12) for more details.**
