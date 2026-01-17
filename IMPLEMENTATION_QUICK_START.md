# LavLay Subscription System - Quick Start Guide

## 🎯 What We're Building

1. **Pro Subscription** - Users pay to unlock withdrawals
2. **Payment Integration** - Paystack, Flutterwave, OPay
3. **7-Day Onboarding Emails** - Automated welcome sequence
4. **Welcome Bonus** - Already working!

---

## ✅ Phase 1: Database Setup (YOU DO THIS NOW - 5 minutes)

### Step 1: Run SQL Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: kswknblwjlkgxgvypkmo

2. **Open SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New query"

3. **Copy and Run Migration**
   - Open file: `CREATE_SUBSCRIPTION_SYSTEM.sql`
   - Copy ALL content (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor
   - Click **"Run"** (or Ctrl+Enter)

4. **Verify Success**
   You should see:
   ```
   ✅ Subscription system created successfully!
   Tables created: subscription_plans, subscriptions, payment_transactions
   Functions created: can_user_withdraw, activate_subscription, etc.
   ```

### Step 2: Verify Tables Created

1. **Go to Table Editor**
   - Left sidebar → Table Editor
   - You should see new tables:
     - `subscription_plans`
     - `subscriptions`
     - `payment_transactions`

2. **Check subscription_plans**
   - Click on `subscription_plans` table
   - Should have 2 rows: "Free" and "Pro"
   - Free: ₦0/month
   - Pro: ₦2,000/month or ₦20,000/year

3. **Check users table**
   - Click on `users` table
   - New columns should exist:
     - `subscription_tier` (default: 'free')
     - `subscription_status` (default: 'inactive')
     - `subscription_expires_at`

✅ **Tell me when this is done!**

---

## 🚂 Phase 2: Railway Backend (I'LL HELP YOU - 15 minutes)

### Check if Railway is Deployed

**YOU DO:**
1. Go to: https://railway.app/dashboard
2. Log in
3. Look for project named:
   - "socialhub-backend"
   - "lavlay-backend"
   - "perksnow-backend"
4. Tell me:
   - ✅ Found it? What's the URL?
   - ❌ Not found? I'll help you deploy

### If Found: Update Environment Variables

**YOU DO:**
1. Click on your backend project
2. Go to "Variables" tab
3. Add these keys (get from payment providers):

```env
# Paystack (https://dashboard.paystack.com/#/settings/developer)
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx

# Flutterwave (https://dashboard.flutterwave.com/settings/apis)
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxx

# OPay (contact OPay for API keys)
OPAY_MERCHANT_ID=xxx
OPAY_PUBLIC_KEY=xxx
OPAY_PRIVATE_KEY=xxx

# Frontend URL
FRONTEND_URL=https://lavlay.com
```

### If Not Found: Deploy Backend

**I'LL HELP YOU:**
```bash
cd backend

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

---

## 💳 Phase 3: Payment Integration (I'LL DO - 1 hour)

Once Railway is set up, I'll create:

1. **Frontend Components:**
   - Subscription page UI
   - Payment modal
   - Plan comparison

2. **Payment Flow:**
   - User clicks "Subscribe to Pro"
   - Frontend → Backend → Paystack/Flutterwave
   - User pays
   - Webhook → Activate subscription
   - User gets Pro features

3. **Withdrawal Check:**
   - Update withdrawal page
   - Check `can_user_withdraw()` function
   - Show upgrade prompt if not Pro

---

## 📧 Phase 4: 7-Day Emails (I'LL DO - 30 minutes)

I'll create:

1. **Email Templates:**
   - Day 1: Welcome to LavLay
   - Day 2: How to earn points
   - Day 3: Creating your first post
   - Day 4: Understanding reels
   - Day 5: Building your audience
   - Day 6: Unlocking withdrawals (Pro)
   - Day 7: Tips for maximizing earnings

2. **Automated Scheduling:**
   - pg_cron sends emails daily
   - Tracks which emails sent
   - No duplicates

---

## 🎁 Phase 5: Welcome Bonus (ALREADY DONE!)

You already have this working:
- ✅ New users get 100 points
- ✅ Database trigger fires on signup
- ✅ Recorded in `signup_bonus_history`

---

## 📊 What You'll Have After Implementation

### Free Users Can:
- ✅ Create posts and reels
- ✅ Earn points (limited)
- ✅ Like, comment, follow
- ❌ Cannot withdraw earnings

### Pro Users Can:
- ✅ Everything Free users can do
- ✅ **Withdraw earnings** (minimum ₦5,000)
- ✅ Verified badge
- ✅ Higher earning limits
- ✅ Priority support
- ✅ Ad-free experience

---

## 💰 Pricing

### For Users:
- **Free**: ₦0
- **Pro Monthly**: ₦2,000/month
- **Pro Yearly**: ₦20,000/year (₦1,667/month - save 16%)

### For You (Infrastructure):
- **Supabase**: ₦0-₦9,000/month
- **Railway**: ₦2,000-₦8,000/month
- **Elastic Email**: ₦100/month
- **Payment fees**: 1.5% + ₦100 per transaction
- **Total**: ~₦2,100-₦17,000/month

### Revenue Example (100 Pro subscribers):
```
Income:  100 × ₦2,000 = ₦200,000/month
Costs:   ₦10,000/month (infrastructure + payment fees)
Profit:  ₦190,000/month 🎉
```

---

## 🚀 Implementation Timeline

### Today (2-3 hours):
- [ ] You: Run SQL migration (5 min)
- [ ] You: Check Railway status (5 min)
- [ ] You: Add payment API keys (10 min)
- [ ] Me: Create subscription UI (1 hour)
- [ ] Me: Integrate payments (1 hour)
- [ ] Me: Test flow (30 min)

### Tomorrow:
- [ ] Me: Create 7-day email templates
- [ ] Me: Set up email automation
- [ ] Test everything end-to-end
- [ ] Launch! 🚀

---

## 📋 Current Status

- ✅ Database schema created (SQL file ready)
- ⏳ **WAITING FOR YOU**: Run SQL in Supabase
- ⏳ **WAITING FOR YOU**: Check Railway status
- ⏳ Payment integration (after Railway)
- ⏳ Email automation (after emails activated)

---

## 🆘 If You Get Stuck

### SQL Migration Fails?
**Tell me the error message** - I'll fix it

### Can't Find Railway Project?
**That's okay** - I'll help you deploy from scratch

### Don't Have Payment API Keys?
**We can use test mode** first:
- Paystack test: `sk_test_xxx`
- Flutterwave test: `FLWSECK_TEST-xxx`

---

## ✅ Next Action: RUN THE SQL!

1. Open Supabase: https://supabase.com/dashboard
2. Go to SQL Editor
3. Copy `CREATE_SUBSCRIPTION_SYSTEM.sql`
4. Run it
5. Tell me "SQL migration done!"

**Then I'll move to Phase 2!** 🚀
